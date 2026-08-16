/**
 * Extração de comentários SQL do PostgreSQL.
 *
 * Reconhece a sintaxe real do dialeto (`COMMENT ON ... IS ...`), e não a palavra
 * "comments" solta no texto. Cada dialeto tem seu próprio módulo: SQL Server
 * (`sp_addextendedproperty`), MySQL (`COMMENT` inline) e Oracle
 * (`COMMENT ON COLUMN`) entram como estratégias irmãs, sem misturar regras aqui.
 */
const expression = /COMMENT\s+ON\s+(TABLE|COLUMN|VIEW|MATERIALIZED\s+VIEW|FUNCTION|PROCEDURE|INDEX|TRIGGER|SEQUENCE)\s+([\w."]+)(?:\s*\([^)]*\))?(?:\s+ON\s+[\w."]+)?\s+IS\s+(NULL|'(?:[^']|'')*')/gi;

/** Remove aspas externas e desfaz o escape SQL de aspas simples ('' → '). */
export function unquoteSqlString(value) {
  const text = String(value ?? '').trim();
  if (/^NULL$/i.test(text)) return null;
  if (!text.startsWith("'")) return text;
  return text.slice(1, -1).replace(/''/g, "'");
}

/** Separa `schema.tabela.coluna` preservando identificadores entre aspas. */
export function splitQualifiedName(value) {
  return String(value ?? '')
    .split('.')
    .map((part) => part.replace(/"/g, '').trim())
    .filter(Boolean);
}

/**
 * @returns {Array<{kind, schema, object, column, description, index}>}
 *   `description` é `null` quando o script usa `IS NULL` (remove o comentário).
 */
export function extractComments(sql) {
  const comments = [];
  const text = String(sql ?? '');
  let match;
  expression.lastIndex = 0;
  while ((match = expression.exec(text))) {
    const kind = match[1].replace(/\s+/g, ' ').toUpperCase();
    const parts = splitQualifiedName(match[2]);
    const description = unquoteSqlString(match[3]);
    if (!parts.length) continue;

    if (kind === 'COLUMN') {
      if (parts.length < 2) continue;
      const column = parts.at(-1);
      const object = parts.at(-2);
      const schema = parts.length > 2 ? parts.at(-3) : null;
      comments.push({ kind, schema, object, column, description, index: match.index });
      continue;
    }
    comments.push({
      kind,
      schema: parts.length > 1 ? parts.at(-2) : null,
      object: parts.at(-1),
      column: null,
      description,
      index: match.index
    });
  }
  return comments;
}
