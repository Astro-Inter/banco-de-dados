import { PostgreSqlAdapter } from './postgresql-adapter.js';

/** Adapters implementados nesta versão. */
const adapters = new Map([
  ['postgresql', PostgreSqlAdapter],
  ['postgres', PostgreSqlAdapter]
]);

/** Dialetos previstos para as próximas versões, ainda sem implementação. */
const planned = new Map([
  ['sqlserver', 'SQL Server'],
  ['mssql', 'SQL Server'],
  ['mysql', 'MySQL'],
  ['mariadb', 'MySQL']
]);

export function normalizeDatabaseType(type) {
  return String(type ?? '').trim().toLowerCase();
}

export function supportedDatabases() {
  return [{
    type: PostgreSqlAdapter.type,
    label: PostgreSqlAdapter.label,
    defaultPort: PostgreSqlAdapter.defaultPort,
    available: true
  }, {
    type: 'sqlserver', label: 'SQL Server', defaultPort: 1433, available: false
  }, {
    type: 'mysql', label: 'MySQL', defaultPort: 3306, available: false
  }];
}

export function createAdapter(connection, options = {}) {
  const type = normalizeDatabaseType(connection?.type);
  const Adapter = adapters.get(type);
  if (Adapter) return new Adapter({ ...connection, type }, options);
  const upcoming = planned.get(type);
  if (upcoming) throw new Error(`${upcoming} ainda não é suportado. Esta versão executa scripts apenas em PostgreSQL.`);
  throw new Error('Tipo de banco não suportado. Selecione PostgreSQL.');
}
