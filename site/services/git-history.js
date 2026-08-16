/**
 * Leitura do Histórico do Banco pelo frontend.
 *
 * A página consome SEMPRE os artefatos estáticos gerados no build, nos dois
 * modos. Ela não chama `/api/`, não executa Git e não depende de token: por
 * isso funciona igual no GitHub Pages e no Local Mode.
 *
 *   generated/git-history.json          índice (lista de commits)
 *   generated/git-history/<hash>.json   detalhes com diff, sob demanda
 */
import { normalizeSearchValue } from './search.js';

const indexUrl = './generated/git-history.json';
const detailCache = new Map();

export async function loadGitHistory() {
  const response = await fetch(indexUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível carregar o histórico gerado. Execute npm run git-history.');
  return response.json();
}

/** Detalhe de um commit; o diff só é buscado quando o commit é aberto. */
export async function loadCommitDetail(history, shortHash) {
  if (detailCache.has(shortHash)) return detailCache.get(shortHash);
  const directory = history?.config?.detailDirectory ?? 'git-history';
  const response = await fetch(`./generated/${directory}/${encodeURIComponent(shortHash)}.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Os detalhes deste commit não foram gerados.');
  const detail = await response.json();
  detailCache.set(shortHash, detail);
  return detail;
}

export const statusLabels = {
  added: 'Added',
  modified: 'Modified',
  deleted: 'Deleted',
  renamed: 'Renamed',
  copied: 'Copied'
};

export const statusLetters = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  copied: 'C'
};

/** Nome semântico do ícone de cada operação — todos da biblioteca do Astro. */
export const statusIcons = {
  added: 'fileAdded',
  modified: 'fileModified',
  deleted: 'fileRemoved',
  renamed: 'fileRenamed',
  copied: 'fileRenamed'
};

/**
 * Rótulo de cada categoria configurada. A classificação do Histórico vem das
 * pastas de `database.paths`, e não do snapshot atual: assim um arquivo já
 * removido continua classificado corretamente.
 */
export const categoryLabels = {
  scripts: 'Scripts',
  dataload: 'Data Loads',
  functions: 'Functions',
  views: 'Views',
  procedures: 'Procedures',
  indexes: 'Índices',
  triggers: 'Triggers',
  logs: 'Log Tables'
};

export function categoryLabel(category) {
  return categoryLabels[category] ?? category ?? 'Outros';
}

/** Categorias realmente presentes no histórico, na ordem da configuração. */
export function availableCategories(history) {
  const present = new Set((history?.commits ?? []).flatMap((commit) => commit.files.map((file) => file.category)));
  const configured = Object.keys(history?.paths ?? categoryLabels);
  return configured.filter((category) => present.has(category));
}

export function availableStatuses(history) {
  const present = new Set((history?.commits ?? []).flatMap((commit) => commit.files.map((file) => file.status)));
  return ['added', 'modified', 'deleted', 'renamed'].filter((status) => present.has(status));
}

/**
 * Texto pesquisável de um commit: mensagem, hash, autor, caminho do arquivo e
 * o nome do objeto SQL (o arquivo sem extensão, como `vw_clientes`).
 */
export function commitSearchText(commit) {
  return [
    commit.message,
    commit.subject,
    commit.shortHash,
    commit.hash,
    commit.author,
    ...commit.files.flatMap((file) => [
      file.path,
      file.oldPath,
      file.name,
      String(file.name ?? '').replace(/\.sql$/i, ''),
      categoryLabel(file.category)
    ])
  ].map((value) => normalizeSearchValue(value)).filter(Boolean).join(' ');
}

export function matchesCommit(commit, query) {
  const term = normalizeSearchValue(query);
  if (!term) return true;
  return commitSearchText(commit).includes(term);
}

/**
 * Busca e filtros combinados. Os filtros valem por ARQUIVO: um commit aparece
 * se ao menos um dos seus arquivos SQL satisfaz categoria e operação.
 */
export function filterCommits(history, { query = '', category = 'all', status = 'all' } = {}) {
  return (history?.commits ?? []).filter((commit) => {
    if (!matchesCommit(commit, query)) return false;
    return commit.files.some((file) => (category === 'all' || file.category === category)
      && (status === 'all' || file.status === status));
  });
}

/** Arquivos de um commit que continuam visíveis com os filtros aplicados. */
export function visibleFiles(commit, { category = 'all', status = 'all' } = {}) {
  return (commit?.files ?? []).filter((file) => (category === 'all' || file.category === category)
    && (status === 'all' || file.status === status));
}
