import { readJson, sendJson } from '../http.js';
import { readSqlFile } from '../services/file-service.js';
import { supportedDatabases } from '../database/adapters/index.js';
import { loadExecutionConfig } from '../database/execution-config.js';
import { buildExecutionPlan } from '../database/execution-plan.js';
import { validateMigration } from '../database/validation-service.js';
import { createRun, executeRun, getRun, serializeRun } from '../database/migration-service.js';
import { sanitizeMessage } from '../database/log-sanitizer.js';
import {
  closeSession,
  describeSession,
  findSession,
  getSession,
  openSession,
  safeMessage
} from '../database/connection-service.js';

/**
 * Endpoints da execução/migração. Disponíveis apenas no Local Mode: o build
 * estático publicado no GitHub Pages não possui backend, então a interface
 * entra automaticamente no aviso de "somente no Local Mode".
 *
 * O frontend nunca envia SQL: envia no máximo decisões por caminho de arquivo,
 * e o servidor relê o conteúdo pelo filesystem seguro já existente.
 */
async function requireEnabled() {
  const config = await loadExecutionConfig();
  if (!config.enabled) throw new Error('A execução de banco está desabilitada em database-workspace.config.json.');
  return config;
}

function normalizeDecisions(decisions) {
  if (!decisions || typeof decisions !== 'object') return {};
  return Object.fromEntries(Object.entries(decisions)
    .filter(([path, decision]) => typeof path === 'string' && ['skip', 'rerun'].includes(decision)));
}

async function planFor(session, database, config, decisions) {
  const history = session ? await session.history.list().catch(() => []) : [];
  return buildExecutionPlan(database, { config, history, decisions });
}

/** @returns {Promise<boolean>} true quando a rota foi tratada aqui. */
export async function databaseApi(request, response, url, context) {
  return await handleDatabaseRoute(request, response, url, context) !== false;
}

async function handleDatabaseRoute(request, response, url, { getDatabase }) {
  const route = url.pathname.replace(/^\/api\/database\/?/, '');
  const method = request.method;

  if (method === 'GET' && route === 'config') {
    const config = await loadExecutionConfig();
    return sendJson(response, 200, {
      enabled: config.enabled,
      stopOnError: config.stopOnError,
      recreateExistingObjects: config.recreateExistingObjects,
      transactionMode: config.transactionMode,
      connectionTimeout: config.connectionTimeout,
      queryTimeout: config.queryTimeout,
      historyTable: config.historyTable,
      databases: supportedDatabases(),
      dialect: getDatabase().dialect
    });
  }

  if (method === 'POST' && route === 'test-connection') {
    const config = await requireEnabled();
    const body = await readJson(request);
    try {
      const result = await openSession(body, config);
      return sendJson(response, 200, { success: true, ...result });
    } catch (error) {
      return sendJson(response, 200, {
        success: false,
        message: sanitizeMessage(error?.message || 'Não foi possível conectar ao banco.', [body?.password].filter(Boolean)),
        detail: error?.detail ?? null
      });
    }
  }

  if (method === 'GET' && route === 'session') {
    const session = findSession(url.searchParams.get('sessionId'));
    return sendJson(response, 200, { connected: Boolean(session), session: describeSession(session) });
  }

  if (method === 'POST' && route === 'disconnect') {
    const body = await readJson(request);
    const closed = await closeSession(body.sessionId);
    return sendJson(response, 200, { disconnected: closed });
  }

  if (method === 'POST' && route === 'plan') {
    const config = await requireEnabled();
    const body = await readJson(request);
    const session = body.sessionId ? getSession(body.sessionId) : null;
    const plan = await planFor(session, getDatabase(), config, normalizeDecisions(body.decisions));
    return sendJson(response, 200, { plan, connection: describeSession(session) });
  }

  if (method === 'POST' && route === 'validate') {
    const config = await requireEnabled();
    const body = await readJson(request);
    const session = body.sessionId ? getSession(body.sessionId) : null;
    const database = getDatabase();
    const plan = await planFor(session, database, config, normalizeDecisions(body.decisions));
    const validation = validateMigration({ plan, database, connection: describeSession(session) });
    return sendJson(response, 200, { plan, validation, connection: describeSession(session) });
  }

  if (method === 'POST' && route === 'execute') {
    const config = await requireEnabled();
    const body = await readJson(request);
    const session = getSession(body.sessionId);
    const database = getDatabase();
    const plan = await planFor(session, database, config, normalizeDecisions(body.decisions));
    const validation = validateMigration({ plan, database, connection: describeSession(session) });

    if (!validation.canExecute) {
      return sendJson(response, 400, { error: validation.reason ?? 'A validação impede a execução.', validation });
    }
    if (validation.requiresConfirmation && String(body.confirmation ?? '') !== 'EXECUTAR') {
      return sendJson(response, 400, { error: 'Existem operações destrutivas. Digite EXECUTAR para confirmar.', validation });
    }

    const run = createRun(plan, {
      sessionId: session.id,
      transactionMode: plan.transactionMode,
      stopOnError: config.stopOnError
    });
    executeRun(run, { plan, session, readFile: readSqlFile }).catch((error) => {
      run.state = 'failed';
      run.finishedAt = new Date().toISOString();
      run.error = safeMessage(session, error, 'Falha inesperada durante a execução.');
    });
    return sendJson(response, 202, serializeRun(run));
  }

  if (method === 'GET' && route === 'execution') {
    const run = getRun(url.searchParams.get('runId'));
    if (!run) return sendJson(response, 404, { error: 'Execução não encontrada.' });
    return sendJson(response, 200, serializeRun(run));
  }

  if (method === 'GET' && route === 'migrations') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return sendJson(response, 200, { migrations: [], connected: false });
    const session = getSession(sessionId);
    try {
      return sendJson(response, 200, { migrations: await session.history.list(), connected: true });
    } catch (error) {
      return sendJson(response, 400, { error: safeMessage(session, error, 'Não foi possível ler o histórico de migrations.') });
    }
  }

  return false;
}
