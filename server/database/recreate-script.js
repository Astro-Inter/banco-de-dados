const dropKeywords = Object.freeze({
  table: 'TABLE',
  'log-table': 'TABLE',
  view: 'VIEW',
  function: 'FUNCTION',
  procedure: 'PROCEDURE',
  index: 'INDEX'
});

function quoteIdentifier(name) {
  const parts = String(name ?? '').split('.').map((part) => part.trim()).filter(Boolean);
  if (!parts.length || parts.some((part) => !/^[\p{L}_][\p{L}\p{N}_$]*$/u.test(part))) return null;
  return parts.map((part) => `"${part.replace(/"/g, '""')}"`).join('.');
}

function routineArguments(parameters = []) {
  const types = parameters
    .filter((parameter) => String(parameter?.mode ?? 'IN').toUpperCase() !== 'OUT')
    .map((parameter) => String(parameter?.dataType ?? '').trim())
    .filter((dataType) => dataType && /^[\p{L}\p{N}_$.,\s"()[\]]+$/u.test(dataType));
  return `(${types.join(', ')})`;
}

/** SQL PostgreSQL seguro para remover um objeto que será recriado pelo plano. */
export function dropStatementForObject(object) {
  const name = quoteIdentifier(object?.name);
  if (!name) return null;

  if (object.type === 'trigger') {
    const table = quoteIdentifier(object.table);
    return table
      ? `DO $astro$ BEGIN IF to_regclass('${table}') IS NOT NULL THEN EXECUTE 'DROP TRIGGER IF EXISTS ${name} ON ${table}'; END IF; END $astro$;`
      : null;
  }

  const keyword = dropKeywords[object.type];
  if (!keyword) return null;
  const signature = ['function', 'procedure'].includes(object.type) ? routineArguments(object.parameters) : '';
  return `DROP ${keyword} IF EXISTS ${name}${signature};`;
}

export function recreateFinding(object, file, sql) {
  const keyword = object.type === 'log-table' ? 'TABLE' : String(object.type ?? 'OBJECT').toUpperCase();
  return {
    operation: `DROP ${keyword}`,
    severity: 'critical',
    target: object.name,
    file,
    line: null,
    generated: true,
    message: 'O objeto existente será removido antes da recriação, dentro da mesma transação.'
  };
}

/** Tabelas relacionadas são removidas juntas para que FKs internas não bloqueiem o DROP. */
export function combineTableDrops(statements = []) {
  const tablePrefix = 'DROP TABLE IF EXISTS ';
  const tables = statements
    .filter((statement) => statement.startsWith(tablePrefix))
    .map((statement) => statement.slice(tablePrefix.length, -1));
  const others = statements.filter((statement) => !statement.startsWith(tablePrefix));
  return tables.length ? [...others, `${tablePrefix}${tables.join(', ')};`] : others;
}
