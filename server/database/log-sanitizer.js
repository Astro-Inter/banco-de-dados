/**
 * Sanitização de mensagens e objetos antes de chegarem ao frontend, ao console
 * ou a qualquer log. A senha nunca sai do processo do servidor.
 */
const mask = '***';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove segredos conhecidos e credenciais embutidas em URLs. */
export function sanitizeMessage(message, secrets = []) {
  let text = typeof message === 'string' ? message : String(message?.message ?? message ?? '');
  for (const secret of secrets) {
    if (typeof secret !== 'string' || secret.length < 1) continue;
    text = text.replace(new RegExp(escapeRegExp(secret), 'g'), mask);
  }
  return text
    .replace(/(\b[a-z]+:\/\/[^\s:@/]+):[^\s@]+@/gi, `$1:${mask}@`)
    .replace(/(\b(?:password|senha|pwd)\b\s*[:=]\s*)("[^"]*"|'[^']*'|\S+)/gi, `$1${mask}`);
}

/** Cópia de uma conexão sem a senha, pronta para exibição ou log. */
export function sanitizeConnection(connection = {}) {
  const { password, ...safe } = connection;
  return { ...safe, ssl: Boolean(connection.ssl) };
}

/** Garante que nenhum objeto enviado ao frontend carregue uma senha. */
export function sanitizePayload(value, secrets = []) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeMessage(value, secrets);
  if (Array.isArray(value)) return value.map((item) => sanitizePayload(item, secrets));
  if (typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['password', 'senha', 'pwd'].includes(key.toLowerCase()))
    .map(([key, item]) => [key, sanitizePayload(item, secrets)]));
}
