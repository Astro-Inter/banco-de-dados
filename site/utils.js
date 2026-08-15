export { icon, iconButton, hasIcon, pendingIcons } from './icons.js';

export const labels = {
  table: 'Tabelas',
  'log-table': 'Log Tables',
  view: 'Views',
  procedure: 'Procedures',
  function: 'Functions',
  index: 'Índices',
  trigger: 'Triggers',
  dataload: 'Data Loads'
};

/** Nome semântico do ícone de cada tipo de objeto do modelo normalizado. */
export const typeIcons = {
  table: 'table',
  'log-table': 'logTable',
  view: 'view',
  procedure: 'procedure',
  function: 'function',
  index: 'index',
  trigger: 'trigger',
  dataload: 'dataload'
};

/** Tipos que são fisicamente tabelas no banco (Tables e Log Tables). */
export const tableTypes = ['table', 'log-table'];

/**
 * Log Tables são documentadas como um tipo próprio, mas continuam sendo
 * tabelas físicas: tudo que vale para uma tabela (colunas, PK, FK, modelagem,
 * grafo, migração) vale para elas.
 */
export function isTableLike(object) {
  return object?.databaseType === 'table' || tableTypes.includes(object?.type);
}

export function isLogTable(object) {
  return object?.type === 'log-table';
}

/**
 * Tipo da coluna pronto para exibição.
 *
 * O parser guarda o tipo como escrito no SQL (`VARCHAR(30)`) e, além disso,
 * separa `size`/`precision`. Concatenar os dois produziria `VARCHAR(30)(30)`,
 * então o tamanho só é acrescentado quando o tipo ainda não o traz.
 */
export function formatColumnType(column) {
  const type = String(column?.dataType ?? '').trim();
  if (!type) return '—';
  if (/\([^)]*\)\s*$/.test(type)) return type;
  if (column.size != null) return `${type}(${column.size})`;
  if (column.precision != null) return `${type}(${column.precision}${column.scale != null ? `, ${column.scale}` : ''})`;
  return type;
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

export function highlightSql(sql = '') {
  let safe = escapeHtml(sql);
  safe = safe.replace(/('[^']*')/g, '<span class="string">$1</span>');
  safe = safe.replace(/\b(CREATE|REPLACE|ALTER|DROP|TABLE|VIEW|PROCEDURE|FUNCTION|TRIGGER|BEFORE|AFTER|INSTEAD|EACH|ROW|EXECUTE|INDEX|UNIQUE|SELECT|FROM|JOIN|ON|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|PRIMARY|FOREIGN|KEY|REFERENCES|NOT|NULL|DEFAULT|CONSTRAINT|AS|BEGIN|END|RETURNS|RETURN|NEW|OLD|LANGUAGE|PLPGSQL|STABLE|IMMUTABLE|VOLATILE|CONFLICT|DO|NOTHING|AND|OR|GROUP|BY|ORDER|HAVING|USING)\b/gi, '<span class="keyword">$1</span>');
  return safe.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
}

export function formatDate(value) {
  if (!value) return 'Não disponível';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function diffLines(original, changed) {
  const before = original.split('\n');
  const after = changed.split('\n');
  const rows = [];
  const matrix = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i--) for (let j = after.length - 1; j >= 0; j--) matrix[i][j] = before[i] === after[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
  let i = 0; let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) { rows.push(['same', `  ${before[i]}`]); i++; j++; }
    else if (j < after.length && (i === before.length || matrix[i][j + 1] >= matrix[i + 1][j])) { rows.push(['add', `+ ${after[j++]}`]); }
    else { rows.push(['remove', `- ${before[i++]}`]); }
  }
  return rows;
}
