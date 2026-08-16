import { randomUUID } from 'node:crypto';
import { createAdapter } from './adapters/index.js';
import { MigrationHistory } from './migration-history.js';
import { sanitizeMessage } from './log-sanitizer.js';

/**
 * Sessões de conexão.
 *
 * As credenciais existem apenas neste Map, em memória, enquanto a sessão estiver
 * aberta. Nada é gravado em disco, em configuração ou em log, e a senha nunca é
 * devolvida ao frontend — ele recebe apenas um `sessionId` opaco.
 */
const sessions = new Map();

function requireText(value, field) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`Informe ${field}.`);
  return text;
}

/** Extrai a causa real de erros de driver, inclusive AggregateError sem mensagem. */
export function describeConnectionError(error) {
  const direct = String(error?.message ?? '').trim();
  if (direct) return direct;
  const nested = (error?.errors ?? []).map((item) => String(item?.message ?? '').trim()).filter(Boolean);
  return nested[0] ?? '';
}

export function normalizeConnectionInput(input = {}) {
  const port = Number(input.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
  return {
    type: requireText(input.type, 'o tipo do banco'),
    host: requireText(input.host, 'o host'),
    port,
    database: requireText(input.database, 'o database'),
    user: requireText(input.user, 'o usuário'),
    password: typeof input.password === 'string' ? input.password : '',
    ssl: Boolean(input.ssl)
  };
}

/** Abre a conexão, valida-a e devolve apenas informações seguras. */
export async function openSession(input, options = {}) {
  const connection = normalizeConnectionInput(input);
  const adapter = createAdapter(connection, options);
  let info;
  try {
    info = await adapter.testConnection();
  } catch (error) {
    await adapter.disconnect().catch(() => {});
    // Drivers costumam devolver AggregateError sem mensagem própria; o detalhe
    // técnico vai em um campo separado, já sanitizado.
    const failure = new Error('Não foi possível conectar ao banco.');
    failure.detail = sanitizeMessage(describeConnectionError(error), [connection.password]) || null;
    throw failure;
  }
  const sessionId = randomUUID();
  sessions.set(sessionId, {
    id: sessionId,
    adapter,
    connection,
    info,
    history: new MigrationHistory(adapter, options.historyTable),
    options,
    openedAt: new Date().toISOString()
  });
  return { sessionId, ...info };
}

export function getSession(sessionId) {
  const session = sessions.get(String(sessionId ?? ''));
  if (!session) throw new Error('Sessão de banco não encontrada. Teste a conexão novamente.');
  return session;
}

export function findSession(sessionId) {
  return sessions.get(String(sessionId ?? '')) ?? null;
}

/** Resumo seguro exibido no estado "Conectado". */
export function describeSession(session) {
  if (!session) return null;
  return {
    sessionId: session.id,
    type: session.connection.type,
    host: session.connection.host,
    port: session.connection.port,
    database: session.connection.database,
    user: session.connection.user,
    ssl: session.connection.ssl,
    version: session.info?.version ?? null,
    openedAt: session.openedAt
  };
}

/** Mensagem de erro já sanitizada com os segredos desta sessão. */
export function safeMessage(session, error, fallback = 'Erro inesperado.') {
  const secrets = session ? [session.connection.password] : [];
  return sanitizeMessage(error?.message || fallback, secrets.filter(Boolean));
}

export async function closeSession(sessionId) {
  const session = sessions.get(String(sessionId ?? ''));
  if (!session) return false;
  sessions.delete(session.id);
  await session.adapter.disconnect().catch(() => {});
  // Apaga as credenciais da memória depois de encerrar a conexão.
  session.connection.password = '';
  session.connection = null;
  return true;
}

export async function closeAllSessions() {
  await Promise.all([...sessions.keys()].map((sessionId) => closeSession(sessionId)));
}

export function activeSessions() {
  return [...sessions.values()].map(describeSession);
}
