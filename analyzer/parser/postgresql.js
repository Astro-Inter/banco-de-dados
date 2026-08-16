import { parseSqlDialectFile } from './sqlserver.js';

/**
 * Estratégia PostgreSQL da V1. Reconhece construções como OR REPLACE,
 * IF NOT EXISTS, parâmetros sem @, tipos compostos e índices USING.
 */
export function parsePostgreSqlFile(file) {
  return parseSqlDialectFile(file, 'postgresql');
}
