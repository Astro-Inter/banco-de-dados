import { api } from './api.js';

/**
 * Cliente da API de execução. Todas as chamadas passam pelo backend local:
 * o navegador nunca abre uma conexão com o PostgreSQL.
 *
 * A senha é enviada apenas na chamada de teste de conexão e nunca volta:
 * a partir daí o frontend trabalha somente com o `sessionId`.
 */
export const executionApi = {
  config: () => api('database/config'),

  testConnection: (connection) => api('database/test-connection', {
    method: 'POST',
    body: JSON.stringify(connection)
  }),

  session: (sessionId) => api(`database/session?sessionId=${encodeURIComponent(sessionId)}`),

  disconnect: (sessionId) => api('database/disconnect', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  }),

  plan: (sessionId, decisions = {}) => api('database/plan', {
    method: 'POST',
    body: JSON.stringify({ sessionId, decisions })
  }),

  validate: (sessionId, decisions = {}) => api('database/validate', {
    method: 'POST',
    body: JSON.stringify({ sessionId, decisions })
  }),

  execute: (sessionId, decisions = {}, confirmation = '') => api('database/execute', {
    method: 'POST',
    body: JSON.stringify({ sessionId, decisions, confirmation })
  }),

  run: (runId) => api(`database/execution?runId=${encodeURIComponent(runId)}`),

  migrations: (sessionId) => api(`database/migrations?sessionId=${encodeURIComponent(sessionId)}`)
};
