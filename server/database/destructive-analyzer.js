import { lineAt, scannableSql, splitStatements, summarizeStatement } from './sql-text.js';

/**
 * Detecção de operações destrutivas.
 *
 * A varredura ignora comentários e literais, mas mantém corpos `$$ ... $$`:
 * um `DELETE` sem `WHERE` dentro de uma function continua sendo sinalizado,
 * porque a intenção aqui é avisar, não liberar silenciosamente.
 */
const rules = [
  { operation: 'DROP DATABASE', severity: 'critical', pattern: /\bDROP\s+DATABASE\b(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'DROP SCHEMA', severity: 'critical', pattern: /\bDROP\s+SCHEMA\b(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'DROP TABLE', severity: 'critical', pattern: /\bDROP\s+TABLE\b(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'TRUNCATE', severity: 'critical', pattern: /\bTRUNCATE\s+(?:TABLE\s+)?([\w."]+)?/i },
  { operation: 'DROP VIEW', severity: 'warning', pattern: /\bDROP\s+(?:MATERIALIZED\s+)?VIEW\b(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'DROP FUNCTION', severity: 'warning', pattern: /\bDROP\s+FUNCTION\b(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'DROP PROCEDURE', severity: 'warning', pattern: /\bDROP\s+PROCEDURE\b(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'DROP INDEX', severity: 'warning', pattern: /\bDROP\s+INDEX\b(?:\s+CONCURRENTLY)?(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'DROP TRIGGER', severity: 'warning', pattern: /\bDROP\s+TRIGGER\b(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'DROP SEQUENCE', severity: 'warning', pattern: /\bDROP\s+SEQUENCE\b(?:\s+IF\s+EXISTS)?\s*([\w."]+)?/i },
  { operation: 'DROP COLUMN', severity: 'critical', pattern: /\bALTER\s+TABLE\s+([\w."]+)[\s\S]*?\bDROP\s+COLUMN\b/i },
  { operation: 'DROP CONSTRAINT', severity: 'warning', pattern: /\bALTER\s+TABLE\s+([\w."]+)[\s\S]*?\bDROP\s+CONSTRAINT\b/i }
];

function target(match) {
  return (match?.[1] ?? '').replace(/["']/g, '').replace(/;$/, '') || null;
}

function hasWhere(statement) {
  return /\bWHERE\b/i.test(scannableSql(statement));
}

function deleteWithoutWhere(statement) {
  const scannable = scannableSql(statement);
  const match = scannable.match(/\bDELETE\s+FROM\s+([\w."]+)/i);
  if (!match) return null;
  if (hasWhere(statement)) return null;
  return { operation: 'DELETE sem WHERE', severity: 'critical', target: target(match), offset: match.index };
}

function updateWithoutWhere(statement) {
  const scannable = scannableSql(statement);
  const match = scannable.match(/\bUPDATE\s+([\w."]+)\s+SET\b/i);
  if (!match) return null;
  if (hasWhere(statement)) return null;
  return { operation: 'UPDATE sem WHERE', severity: 'warning', target: target(match), offset: match.index };
}

const messages = {
  critical: 'Esta operação pode causar perda permanente de dados.',
  warning: 'Esta operação substitui ou remove um objeto existente.'
};

/**
 * @returns {Array<{operation, severity, target, statement, line, message}>}
 */
export function analyzeDestructiveOperations(sql, filePath = null) {
  const findings = [];
  for (const statement of splitStatements(sql)) {
    const scannable = scannableSql(statement.sql);
    const collected = [];

    for (const rule of rules) {
      const match = scannable.match(rule.pattern);
      if (match) collected.push({ operation: rule.operation, severity: rule.severity, target: target(match), offset: match.index });
    }
    const withoutWhere = deleteWithoutWhere(statement.sql) ?? updateWithoutWhere(statement.sql);
    if (withoutWhere) collected.push(withoutWhere);

    for (const { offset, ...item } of collected) {
      findings.push({
        ...item,
        file: filePath,
        statement: summarizeStatement(statement.sql),
        // A linha aponta para o comando destrutivo, não para o início do statement.
        line: lineAt(sql, statement.index + (offset ?? 0)),
        message: messages[item.severity]
      });
    }
  }
  return findings;
}

/** Um único arquivo destrutivo já exige a confirmação textual "EXECUTAR". */
export function requiresDestructiveConfirmation(findings) {
  return (findings ?? []).length > 0;
}

export function destructiveSummary(findings) {
  const list = findings ?? [];
  return {
    total: list.length,
    critical: list.filter((finding) => finding.severity === 'critical').length,
    warning: list.filter((finding) => finding.severity === 'warning').length
  };
}
