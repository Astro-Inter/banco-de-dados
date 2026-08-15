/**
 * Normalização central da busca global.
 *
 * O modelo normalizado do analyzer é deliberadamente tolerante: um arquivo
 * parcialmente interpretado pode gerar objetos sem `name`, sem `file` ou sem
 * `columns`. Além disso, `columns` possui duas formas legítimas:
 *
 *   table  → [{ name, dataType, ... }]   (colunas descritas)
 *   index  → ['email', 'created_at']      (apenas os nomes das colunas indexadas)
 *
 * Por isso nenhum consumidor deve chamar `.toLowerCase()` diretamente sobre um
 * valor vindo do modelo. Toda a busca passa por estas funções.
 */

/** Converte qualquer valor em um texto comparável, sem acentos e em minúsculas. */
export function normalizeSearchValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(normalizeSearchValue).filter(Boolean).join(' ');
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

/** Nome de uma coluna, aceitando tanto a forma objeto quanto a forma string. */
export function columnName(column) {
  if (typeof column === 'string') return column;
  return column?.name ?? '';
}

/** Nomes das colunas de um objeto, independentemente da forma usada pelo parser. */
export function columnNames(object) {
  return (object?.columns ?? []).map(columnName).filter((name) => normalizeSearchValue(name) !== '');
}

/** Colunas descritas (apenas as que possuem metadados próprios, como tipo). */
export function describedColumns(object) {
  return (object?.columns ?? [])
    .filter((column) => column && typeof column === 'object' && !Array.isArray(column))
    .filter((column) => normalizeSearchValue(column.name) !== '');
}

/** Comparação de identificadores tolerante a schema, acentos e caixa. */
export function sameIdentifier(left, right) {
  const normalize = (value) => normalizeSearchValue(value).replace(/^(dbo|public)\./, '');
  const a = normalize(left);
  const b = normalize(right);
  return a !== '' && a === b;
}

/** Todos os textos pesquisáveis de um objeto do modelo normalizado. */
export function searchableValues(object) {
  if (!object || typeof object !== 'object') return [];
  return [
    object.name,
    object.type,
    object.databaseType,
    object.file,
    object.category,
    object.table,
    object.function,
    object.language,
    object.returnType,
    // Descrições vêm dos COMMENT ON do SQL e também são pesquisáveis.
    object.description,
    ...describedColumns(object).map((column) => column.description),
    ...columnNames(object),
    ...(object.dependencies ?? []),
    ...(object.usedBy ?? []),
    ...(object.operations ?? []),
    ...(object.parameters ?? []).map((parameter) => columnName(parameter)),
    ...String(object.file ?? '').split('/')
  ];
}

/** Texto único e normalizado usado para casar a consulta. */
export function searchableText(object) {
  return searchableValues(object)
    .map((value) => normalizeSearchValue(value))
    .filter(Boolean)
    .join(' ');
}

/** Consulta normalizada; retorna '' quando não há termo utilizável. */
export function normalizeQuery(query) {
  return normalizeSearchValue(query);
}

export function matchesQuery(object, query) {
  const term = normalizeQuery(query);
  if (!term) return false;
  return searchableText(object).includes(term);
}

/** Objetos que casam com a consulta (nome, arquivo, colunas, dependências…). */
export function searchObjects(objects, query) {
  const term = normalizeQuery(query);
  if (!term) return [];
  return (objects ?? []).filter((object) => searchableText(object).includes(term));
}

/** Colunas descritas que casam com a consulta, junto do objeto que as declara. */
export function searchColumns(objects, query) {
  const term = normalizeQuery(query);
  if (!term) return [];
  return (objects ?? []).flatMap((object) => describedColumns(object)
    .filter((column) => normalizeSearchValue(column.name).includes(term))
    .map((column) => ({ object, column })));
}

/** Arquivos SQL cujo caminho casa com a consulta. */
export function searchFiles(files, query) {
  const term = normalizeQuery(query);
  if (!term) return [];
  return (files ?? []).filter((file) => normalizeSearchValue(file?.path).includes(term)
    || normalizeSearchValue(file?.category).includes(term));
}

/** Busca global completa sobre o snapshot do analyzer. */
export function searchDatabase(database, query) {
  const term = normalizeQuery(query);
  const objects = searchObjects(database?.objects, term);
  const columns = searchColumns(database?.objects, term);
  const files = searchFiles(database?.files, term);
  return { query: term, objects, columns, files, total: objects.length + columns.length + files.length };
}
