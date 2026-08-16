/**
 * Escopo SQL do Histórico do Banco.
 *
 * O Histórico não é um histórico do repositório: só entram arquivos `.sql`
 * dentro das pastas declaradas em `database.paths`. Este módulo é a única fonte
 * dessa decisão e não conhece nenhum caminho fixo — tudo vem da configuração.
 */

/** `./database\\logs/` → `database/logs`. */
export function normalizeRepositoryPath(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^"|"$/g, '')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '')
    .trim();
}

export function createSqlScope(configuredPaths = {}) {
  // A ordem da configuração é preservada: ela vira a ordem dos filtros na
  // interface.
  const entries = Object.entries(configuredPaths)
    .map(([category, directory]) => [category, normalizeRepositoryPath(directory)])
    .filter(([, directory]) => directory !== '');

  // Para casar um caminho, porém, a pasta mais específica vence:
  // `database/logs` antes de `database`.
  const bySpecificity = [...entries].sort((a, b) => b[1].length - a[1].length);
  const directories = entries.map(([, directory]) => directory);

  function categoryOf(filePath) {
    const normalized = normalizeRepositoryPath(filePath);
    if (!normalized) return null;
    const match = bySpecificity.find(([, directory]) => normalized.startsWith(`${directory}/`));
    return match?.[0] ?? null;
  }

  function isSqlPath(filePath) {
    const normalized = normalizeRepositoryPath(filePath);
    return normalized.toLowerCase().endsWith('.sql') && categoryOf(normalized) !== null;
  }

  return { directories, categories: Object.fromEntries(entries), categoryOf, isSqlPath };
}
