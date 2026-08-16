/**
 * Utilitários de leitura de SQL usados apenas para ANÁLISE.
 *
 * A execução nunca fatia o arquivo: o conteúdo completo vai para o driver
 * (ver `PostgreSqlAdapter.execute`). Estas funções existem para inspecionar o
 * script antes de executá-lo — detectar comandos destrutivos, `CREATE DATABASE`
 * e comandos que não podem rodar dentro de uma transação.
 */

/** Remove comentários de linha e de bloco preservando o tamanho das linhas. */
export function stripSqlComments(sql) {
  return String(sql ?? '')
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/--[^\n]*/g, (match) => ' '.repeat(match.length));
}

/** Substitui literais entre aspas simples, mantendo as posições originais. */
export function stripStringLiterals(sql) {
  const text = String(sql ?? '');
  let result = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "'") {
      quoted = !quoted;
      result += "'";
      continue;
    }
    result += quoted && char !== '\n' ? ' ' : char;
  }
  return result;
}

/** Texto pronto para varredura: sem comentários e sem conteúdo de strings. */
export function scannableSql(sql) {
  return stripStringLiterals(stripSqlComments(sql));
}

/**
 * Separa comandos respeitando corpos `$$ ... $$` e `$tag$ ... $tag$`.
 * Cada item mantém o índice inicial no texto original.
 */
export function splitStatements(sql) {
  const text = String(sql ?? '');
  const scannable = scannableSql(text);
  const statements = [];
  let start = 0;
  let index = 0;
  let dollarTag = null;

  while (index < scannable.length) {
    if (dollarTag) {
      if (scannable.startsWith(dollarTag, index)) {
        index += dollarTag.length;
        dollarTag = null;
        continue;
      }
      index += 1;
      continue;
    }
    const dollar = scannable.slice(index).match(/^\$[A-Za-z_]*\$/);
    if (dollar) {
      dollarTag = dollar[0];
      index += dollarTag.length;
      continue;
    }
    if (scannable[index] === ';') {
      const raw = text.slice(start, index);
      if (raw.trim()) statements.push({ sql: raw, index: start });
      index += 1;
      start = index;
      continue;
    }
    index += 1;
  }

  const rest = text.slice(start);
  if (rest.trim()) statements.push({ sql: rest, index: start });
  return statements;
}

/** Linha (1-based) correspondente a um índice de caractere. */
export function lineAt(sql, index) {
  return String(sql ?? '').slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

/** Primeira linha significativa de um comando, para exibição na interface. */
export function summarizeStatement(statement, limit = 120) {
  const clean = stripSqlComments(statement).replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
}

const nonTransactional = [
  /\bCREATE\s+DATABASE\b/i,
  /\bDROP\s+DATABASE\b/i,
  /\bCREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i,
  /\bDROP\s+INDEX\s+CONCURRENTLY\b/i,
  /\bVACUUM\b/i,
  /\bREINDEX\s+(DATABASE|SYSTEM)\b/i,
  /\bALTER\s+SYSTEM\b/i,
  /\bCREATE\s+TABLESPACE\b/i
];

/** Comandos que o PostgreSQL recusa executar dentro de um bloco de transação. */
export function findNonTransactionalStatements(sql) {
  const scannable = scannableSql(sql);
  return nonTransactional
    .filter((expression) => expression.test(scannable))
    .map((expression) => scannable.match(expression)[0].replace(/\s+/g, ' ').toUpperCase());
}

/** `CREATE DATABASE` exige execução administrativa fora do banco alvo. */
export function requiresAdministrativeExecution(sql) {
  const scannable = scannableSql(sql);
  return /\bCREATE\s+DATABASE\b/i.test(scannable) || /\bDROP\s+DATABASE\b/i.test(scannable) || /\bALTER\s+SYSTEM\b/i.test(scannable);
}
