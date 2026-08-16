/**
 * Leitura do `git log` e do `git show` como funções puras.
 *
 * Separar o parsing da execução permite testar o Histórico do Banco sem
 * depender do estado de um repositório real.
 */
import { normalizeRepositoryPath } from './sql-scope.js';

/** Separadores ASCII de registro/unidade: não aparecem em mensagens de commit. */
export const RECORD_SEPARATOR = '\x1e';
export const UNIT_SEPARATOR = '\x1f';

/** `%b` fica por último e é fechado por um separador, para não engolir os arquivos. */
export const LOG_FORMAT = [
  `${RECORD_SEPARATOR}%H`, '%h', '%an', '%aI', '%s', `%b${UNIT_SEPARATOR}`
].join(UNIT_SEPARATOR);

const statusByLetter = {
  A: 'added',
  M: 'modified',
  D: 'deleted',
  R: 'renamed',
  C: 'copied',
  T: 'modified'
};

export function statusFor(letter) {
  return statusByLetter[String(letter ?? '').toUpperCase()] ?? 'modified';
}

/**
 * Uma linha de `--name-status`:
 *   `M\tdatabase/views/vw_clientes.sql`
 *   `R096\tdatabase/views/vw_cliente.sql\tdatabase/views/vw_clientes.sql`
 *
 * Retorna `null` para linhas vazias e para arquivos fora do escopo SQL — é aqui
 * que `site/`, `README` e `package.json` desaparecem do Histórico do Banco.
 */
export function parseNameStatusLine(line, scope) {
  const segments = String(line ?? '').split('\t');
  if (segments.length < 2) return null;
  const letter = segments[0].trim().charAt(0).toUpperCase();
  if (!letter) return null;

  const moved = (letter === 'R' || letter === 'C') && segments.length > 2;
  const filePath = normalizeRepositoryPath(moved ? segments[2] : segments[1]);
  const oldPath = moved ? normalizeRepositoryPath(segments[1]) : null;
  if (!filePath) return null;
  if (!scope.isSqlPath(filePath) && !(oldPath && scope.isSqlPath(oldPath))) return null;

  return {
    path: filePath,
    oldPath: oldPath && oldPath !== filePath ? oldPath : null,
    name: filePath.split('/').at(-1),
    status: statusFor(letter),
    category: scope.categoryOf(filePath) ?? (oldPath ? scope.categoryOf(oldPath) : null)
  };
}

/**
 * Saída de `git log --name-status` com `LOG_FORMAT`.
 *
 * Commits sem nenhum arquivo SQL restante são descartados: um commit que mexeu
 * apenas em `site/styles.css` não pertence ao Histórico do Banco.
 */
export function parseCommitLog(stdout, scope) {
  return String(stdout ?? '')
    .split(RECORD_SEPARATOR)
    .slice(1)
    .map((record) => {
      const parts = record.split(UNIT_SEPARATOR);
      const [hash = '', shortHash = '', author = '', date = '', subject = ''] = parts;
      const body = (parts[5] ?? '').trim();
      const files = parts.slice(6).join(UNIT_SEPARATOR)
        .split('\n')
        .map((line) => parseNameStatusLine(line, scope))
        .filter(Boolean);
      return {
        hash: hash.trim(),
        shortHash: shortHash.trim(),
        author: author.trim(),
        date: date.trim(),
        subject: subject.trim(),
        body,
        message: [subject.trim(), body].filter(Boolean).join('\n\n'),
        files
      };
    })
    .filter((commit) => commit.hash && commit.files.length > 0);
}

/** Contagem de arquivos por operação, exibida no card do commit. */
export function summarizeFiles(files = []) {
  const stats = { files: files.length, added: 0, modified: 0, deleted: 0, renamed: 0, insertions: 0, deletions: 0 };
  for (const file of files) {
    if (file.status === 'added') stats.added += 1;
    else if (file.status === 'deleted') stats.deleted += 1;
    else if (file.status === 'renamed' || file.status === 'copied') stats.renamed += 1;
    else stats.modified += 1;
    stats.insertions += file.insertions ?? 0;
    stats.deletions += file.deletions ?? 0;
  }
  return stats;
}

function pathFromHeader(line) {
  const value = line.slice(4).trim();
  if (value === '/dev/null') return null;
  return normalizeRepositoryPath(value.replace(/^[ab]\//, ''));
}

/**
 * Diff unificado em linhas prontas para o mesmo renderizador do editor local:
 * `['same' | 'add' | 'remove' | 'meta', texto]`, exatamente o formato que
 * `site/utils.js#diffLines` produz.
 */
export function parseUnifiedDiff(patch, { maxLines = Infinity } = {}) {
  const blocks = [];
  let current = null;
  let inHunk = false;

  for (const rawLine of String(patch ?? '').split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('diff --git ')) {
      current = { path: null, oldPath: null, rows: [], totalRows: 0, insertions: 0, deletions: 0, truncated: false, binary: false };
      blocks.push(current);
      inHunk = false;
      continue;
    }
    if (!current) continue;

    // `--- `/`+++ ` só são cabeçalhos antes do primeiro `@@`: dentro do hunk,
    // `--- foo` é a remoção de um comentário SQL `-- foo`.
    if (!inHunk && line.startsWith('--- ')) { current.oldPath = pathFromHeader(line); continue; }
    if (!inHunk && line.startsWith('+++ ')) { current.path = pathFromHeader(line); continue; }
    if (!inHunk && (line.startsWith('Binary files') || line.startsWith('GIT binary patch'))) { current.binary = true; continue; }
    if (line.startsWith('@@')) { inHunk = true; push(current, ['meta', line], maxLines); continue; }
    if (!inHunk) continue;
    if (line.startsWith('\\')) continue;

    if (line.startsWith('+')) push(current, ['add', `+ ${line.slice(1)}`], maxLines);
    else if (line.startsWith('-')) push(current, ['remove', `- ${line.slice(1)}`], maxLines);
    else if (line.startsWith(' ')) push(current, ['same', `  ${line.slice(1)}`], maxLines);
  }

  for (const block of blocks) if (!block.path) block.path = block.oldPath;
  return blocks.filter((block) => block.path);
}

/** As contagens somam o diff inteiro, mesmo quando as linhas são truncadas. */
function push(block, row, maxLines) {
  block.totalRows += 1;
  if (row[0] === 'add') block.insertions += 1;
  if (row[0] === 'remove') block.deletions += 1;
  if (block.rows.length >= maxLines) { block.truncated = true; return; }
  block.rows.push(row);
}
