import { loadConfig } from '../../analyzer/config.js';

/**
 * Configuração central da execução/migração.
 *
 * A ordem base de execução vive só aqui: nenhum outro módulo deve decidir
 * "functions antes de views". Credenciais NUNCA fazem parte desta configuração
 * — host, usuário e senha chegam apenas pelo formulário, em memória.
 */
export const defaultExecutionConfig = Object.freeze({
  enabled: true,
  stopOnError: true,
  transactionMode: 'per-script',
  connectionTimeout: 10_000,
  queryTimeout: 60_000,
  historyTable: '_astroworkspace_migrations',
  /** Prioridade quando dois arquivos não dependem um do outro. */
  baseOrder: Object.freeze({
    structural: 1,
    // Log Tables são criadas logo depois das tabelas de origem e antes das
    // cargas, mas o grafo de dependências continua tendo a palavra final.
    types: Object.freeze({ table: 2, 'log-table': 3, dataload: 4, function: 5, view: 6, procedure: 7, index: 8, trigger: 9 }),
    categories: Object.freeze({ scripts: 1, logs: 3, dataload: 4, functions: 5, views: 6, procedures: 7, indexes: 8, triggers: 9 })
  })
});

export const transactionModes = Object.freeze(['per-script', 'single', 'none']);

/** Chaves sensíveis que são descartadas mesmo se alguém as escrever no arquivo. */
const forbiddenKeys = ['password', 'senha', 'user', 'usuario', 'host', 'database'];

function sanitizeFileConfig(execution = {}) {
  const clean = {};
  const rejected = [];
  for (const [key, value] of Object.entries(execution)) {
    if (forbiddenKeys.includes(key.toLowerCase())) { rejected.push(key); continue; }
    clean[key] = value;
  }
  return { clean, rejected };
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export function mergeExecutionConfig(execution = {}) {
  const { clean, rejected } = sanitizeFileConfig(execution ?? {});
  const baseOrder = clean.baseOrder ?? {};
  return {
    enabled: clean.enabled !== false,
    stopOnError: clean.stopOnError !== false,
    transactionMode: transactionModes.includes(clean.transactionMode) ? clean.transactionMode : defaultExecutionConfig.transactionMode,
    connectionTimeout: positiveNumber(clean.connectionTimeout, defaultExecutionConfig.connectionTimeout),
    queryTimeout: positiveNumber(clean.queryTimeout, defaultExecutionConfig.queryTimeout),
    historyTable: /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(clean.historyTable ?? '')) ? clean.historyTable : defaultExecutionConfig.historyTable,
    baseOrder: {
      structural: positiveNumber(baseOrder.structural, defaultExecutionConfig.baseOrder.structural),
      types: { ...defaultExecutionConfig.baseOrder.types, ...(baseOrder.types ?? {}) },
      categories: { ...defaultExecutionConfig.baseOrder.categories, ...(baseOrder.categories ?? {}) }
    },
    ignoredKeys: rejected
  };
}

export async function loadExecutionConfig() {
  const config = await loadConfig();
  return mergeExecutionConfig(config.execution);
}
