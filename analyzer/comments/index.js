import { extractComments as extractPostgreSqlComments } from './postgresql.js';

/**
 * Registro de estratégias de comentário por dialeto e aplicação ao modelo
 * normalizado.
 *
 * A associação acontece DEPOIS que todos os arquivos foram interpretados: o
 * `COMMENT ON` pode estar no mesmo arquivo da tabela, em outro arquivo ou em um
 * script dedicado de documentação.
 */
const extractors = {
  postgresql: extractPostgreSqlComments,
  postgres: extractPostgreSqlComments
};

export function commentExtractor(dialect) {
  return extractors[String(dialect ?? '').toLowerCase()] ?? null;
}

export function extractFileComments(file, dialect) {
  const extractor = commentExtractor(dialect);
  if (!extractor) return [];
  return extractor(file.content).map((comment) => ({ ...comment, file: file.path }));
}

function key(value) {
  return String(value ?? '').trim().toLowerCase();
}

const kindTypes = {
  TABLE: ['table', 'log-table'],
  'MATERIALIZED VIEW': ['view'],
  VIEW: ['view'],
  FUNCTION: ['function'],
  PROCEDURE: ['procedure'],
  INDEX: ['index'],
  TRIGGER: ['trigger']
};

function line(content, index) {
  return String(content ?? '').slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

/**
 * Aplica as descrições aos objetos e colunas já interpretados.
 *
 * - o schema (`public.`) não atrapalha a associação;
 * - a última definição vence, como no banco, e avisa que sobrescreveu;
 * - alvo inexistente vira aviso e não interrompe o processamento.
 *
 * @returns {Array} issues geradas
 */
export function applyComments(objects, comments, filesByPath = new Map()) {
  const issues = [];
  const byName = new Map();
  for (const object of objects ?? []) {
    if (!key(object?.name)) continue;
    const bucket = byName.get(key(object.name)) ?? [];
    bucket.push(object);
    byName.set(key(object.name), bucket);
  }

  for (const comment of comments ?? []) {
    const candidates = byName.get(key(comment.object)) ?? [];
    const allowed = comment.kind === 'COLUMN' ? ['table', 'log-table'] : (kindTypes[comment.kind] ?? []);
    const target = candidates.find((object) => allowed.includes(object.type))
      ?? (comment.kind === 'COLUMN' ? candidates.find((object) => object.databaseType === 'table') : candidates[0]);

    const where = { file: comment.file, line: line(filesByPath.get(comment.file)?.content, comment.index) };

    if (!target) {
      issues.push({
        ...where,
        severity: 'warning',
        message: comment.kind === 'COLUMN'
          ? `Comentário encontrado para coluna não localizada: ${comment.object}.${comment.column}`
          : `Comentário encontrado para objeto não localizado: ${comment.object}`
      });
      continue;
    }

    if (comment.kind === 'COLUMN') {
      const column = (target.columns ?? []).find((item) => key(item?.name) === key(comment.column));
      if (!column) {
        issues.push({ ...where, severity: 'warning', message: `Comentário encontrado para coluna não localizada: ${target.name}.${comment.column}` });
        continue;
      }
      if (column.description != null && column.description !== comment.description) {
        issues.push({ ...where, severity: 'warning', message: `Descrição de ${target.name}.${column.name} foi sobrescrita por uma definição posterior.` });
      }
      column.description = comment.description;
      continue;
    }

    if (target.description != null && target.description !== comment.description) {
      issues.push({ ...where, severity: 'warning', message: `Descrição de ${target.name} foi sobrescrita por uma definição posterior.` });
    }
    target.description = comment.description;
  }

  return issues;
}
