/**
 * Página **Histórico do Banco**.
 *
 * Mostra a evolução dos arquivos SQL commit a commit. Não é um histórico do
 * repositório e não é um cliente Git: commits que não tocaram em SQL não
 * aparecem, arquivos de frontend não aparecem dentro dos commits e nenhuma
 * operação de escrita do Git existe aqui.
 *
 * Diferença para **Alterações Locais**: aquela página é `git status` (o que
 * ainda está solto no workspace); esta é `git log` (o que já foi registrado).
 */
import { diffMarkup, empty, pageHead } from './views.js';
import { escapeHtml, icon } from './utils.js';
import {
  availableCategories,
  availableStatuses,
  categoryLabel,
  filterCommits,
  statusIcons,
  statusLabels,
  statusLetters,
  visibleFiles
} from './services/git-history.js';

/** Acima disso o diff só é desenhado depois de um clique explícito. */
export const largeDiffRows = 400;

function formatCommitDate(value, { withTime = true } = {}) {
  if (!value) return 'data não disponível';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'data não disponível';
  const day = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
  if (!withTime) return day;
  return `${day} às ${new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(date)}`;
}

function plural(count, singular, many) {
  return `${count} ${count === 1 ? singular : many}`;
}

/** Estado de um arquivo: letra Git + rótulo textual, nunca apenas cor. */
export function statusTag(status) {
  const letter = statusLetters[status] ?? 'M';
  const label = statusLabels[status] ?? 'Modified';
  return `<span class="history-status is-${escapeHtml(status)}" title="${escapeHtml(label)}">${icon(statusIcons[status] ?? 'fileModified', 14)}<b>${escapeHtml(letter)}</b>${escapeHtml(label)}</span>`;
}

function statsRow(stats) {
  return `<div class="history-stats" aria-label="Arquivos SQL por operação">
    <span class="history-stat is-added"><b>+</b> ${stats.added} adicionado(s)</span>
    <span class="history-stat is-modified"><b>~</b> ${stats.modified} modificado(s)</span>
    <span class="history-stat is-deleted"><b>-</b> ${stats.deleted} removido(s)</span>
    ${stats.renamed ? `<span class="history-stat is-renamed"><b>R</b> ${stats.renamed} renomeado(s)</span>` : ''}
  </div>`;
}

function summary(history, total) {
  const branch = history.branch ?? 'não identificada';
  const commit = history.currentShortCommit ?? 'não identificado';
  return `<section class="history-summary" aria-label="Versão da documentação">
    <div><span>Branch</span><strong>${escapeHtml(branch)}</strong></div>
    <div><span>Commit atual</span><strong><code>${escapeHtml(commit)}</code></strong></div>
    <div><span>Última atualização</span><strong>${escapeHtml(formatCommitDate(history.generatedAt))}</strong></div>
    <div><span>Versão da documentação</span><strong><code>${escapeHtml(history.documentVersion ?? '—')}</code></strong></div>
    <div class="history-summary-total"><span>Histórico</span><strong>${escapeHtml(plural(total, 'commit relacionado ao banco', 'commits relacionados ao banco'))}</strong></div>
  </section>`;
}

function filters(history, state, categories, statuses) {
  const categoryButtons = ['all', ...categories].map((value) => `<button class="filter-button ${state.category === value ? 'active' : ''}" data-history-category="${escapeHtml(value)}">${value === 'all' ? `${icon('grid', 15)} Todos` : escapeHtml(categoryLabel(value))}</button>`).join('');
  const statusButtons = ['all', ...statuses].map((value) => `<button class="filter-button ${state.status === value ? 'active' : ''}" data-history-status="${escapeHtml(value)}">${value === 'all' ? `${icon('filter', 15)} Todas as operações` : `${icon(statusIcons[value], 15)} ${escapeHtml({ added: 'Adicionados', modified: 'Modificados', deleted: 'Removidos', renamed: 'Renomeados' }[value] ?? value)}`}</button>`).join('');
  return `<label class="search-box history-search" for="history-search"><span class="search-box-icon">${icon('search', 18)}</span><input id="history-search" type="search" autocomplete="off" placeholder="Buscar por mensagem, hash, autor ou arquivo SQL…" value="${escapeHtml(state.query)}"></label>
    <div class="toolbar">${categoryButtons}</div>
    <div class="toolbar">${statusButtons}</div>`;
}

function fileLine(commit, file, state, database) {
  const key = `${commit.shortHash}:${file.path}`;
  const open = state.openFiles.includes(key);
  const rename = file.oldPath
    ? `<small class="history-rename">${escapeHtml(file.oldPath)} <span class="history-arrow">${icon('fileRenamed', 13)}</span> ${escapeHtml(file.path)}</small>`
    : '';
  return `<li class="history-file ${open ? 'is-open' : ''}">
    <div class="history-file-head">
      ${statusTag(file.status)}
      <button class="history-file-toggle" data-history-file="${escapeHtml(key)}" aria-expanded="${open}">
        <strong>${escapeHtml(file.path)}</strong>
        <small>${escapeHtml(categoryLabel(file.category))}${file.hasDiff ? ` · +${file.insertions} / -${file.deletions}` : ''}</small>
        ${rename}
      </button>
      ${openObjectButton(file, database)}
    </div>
    ${open ? `<div class="history-diff" id="diff-${escapeHtml(key)}">${diffPanel(commit, file, state)}</div>` : ''}
  </li>`;
}

/** Reaproveita a navegação existente: objeto, ou o arquivo na página Scripts. */
function openObjectButton(file, database) {
  const object = (database?.objects ?? []).find((item) => item.file === file.path);
  if (object) return `<button class="button ghost small" data-object-id="${escapeHtml(object.id)}">${icon('newTab', 14)} Abrir objeto</button>`;
  const exists = (database?.files ?? []).some((item) => item.path === file.path);
  if (exists) return `<button class="button ghost small" data-file-path="${escapeHtml(file.path)}">${icon('script', 14)} Ver script atual</button>`;
  return '<span class="pill" title="O arquivo não existe na versão atual do projeto">fora da versão atual</span>';
}

function diffPanel(commit, file, state) {
  const detail = state.details[commit.shortHash];
  if (!detail) return '<p class="muted">Carregando diff…</p>';
  const entry = detail.files.find((item) => item.path === file.path)
    ?? detail.files.find((item) => item.oldPath && item.oldPath === file.oldPath);
  if (!entry) return '<div class="readonly-note">O diff deste arquivo não foi gerado.</div>';
  if (entry.binary) return '<div class="readonly-note">Arquivo binário: não há diff textual.</div>';
  if (!entry.rows.length) return '<div class="readonly-note">Nenhuma diferença textual registrada neste commit.</div>';

  const key = `${commit.shortHash}:${file.path}`;
  const heavy = entry.rows.length > largeDiffRows;
  if (heavy && !state.revealedDiffs.includes(key)) {
    return `<div class="history-heavy-diff"><strong>Diff muito grande.</strong><p>${escapeHtml(plural(entry.totalRows, 'linha alterada', 'linhas alteradas'))}.</p><button class="button ghost" data-history-reveal="${escapeHtml(key)}">${icon('expand', 15)} Visualizar</button></div>`;
  }
  const truncated = entry.truncated
    ? `<div class="readonly-note">Exibindo as primeiras ${entry.rows.length} linhas de ${entry.totalRows}. Abra o arquivo no repositório para ver o diff completo.</div>`
    : '';
  return `${truncated}${diffMarkup(entry.rows)}`;
}

function commitCard(commit, state, database) {
  const open = state.openCommit === commit.shortHash;
  const files = visibleFiles(commit, state);
  const hidden = commit.files.length - files.length;
  return `<article class="card history-commit ${open ? 'is-open' : ''}">
    <button class="history-commit-head" data-history-commit="${escapeHtml(commit.shortHash)}" aria-expanded="${open}">
      <span class="history-commit-mark">${icon('commit', 16)}</span>
      <span class="history-commit-body">
        <strong>${escapeHtml(commit.subject || 'Commit sem mensagem')}</strong>
        <small><code>${escapeHtml(commit.shortHash)}</code> · ${escapeHtml(commit.author || 'autor não identificado')} · ${escapeHtml(formatCommitDate(commit.date))}</small>
        <small>${escapeHtml(plural(commit.stats.files, 'arquivo SQL alterado', 'arquivos SQL alterados'))}</small>
      </span>
      ${statsRow(commit.stats)}
      <span class="history-commit-chevron">${icon('chevronRight', 16)}</span>
    </button>
    ${open ? `<div class="history-commit-detail">
      ${commit.message && commit.message !== commit.subject ? `<p class="history-message">${escapeHtml(commit.message)}</p>` : ''}
      <div class="detail-meta"><span>Commit: ${escapeHtml(commit.shortHash)}</span><span>Autor: ${escapeHtml(commit.author || 'não identificado')}</span><span>Data: ${escapeHtml(formatCommitDate(commit.date))}</span></div>
      <h3>${icon('list', 15)} Arquivos SQL alterados</h3>
      ${state.detailError ? `<div class="readonly-note">${escapeHtml(state.detailError)}</div>` : ''}
      <ul class="history-files">${files.map((file) => fileLine(commit, file, state, database)).join('')}</ul>
      ${hidden ? `<p class="muted">${escapeHtml(plural(hidden, 'arquivo oculto pelos filtros', 'arquivos ocultos pelos filtros'))}.</p>` : ''}
    </div>` : ''}
  </article>`;
}

/**
 * @param {object} state estado da página (`state.history` da aplicação)
 * @param {object} database snapshot atual, usado apenas para os atalhos de
 *        navegação — o histórico em si não depende dele.
 */
export function historyView(state, database) {
  const head = pageHead('Histórico', 'Acompanhe a evolução dos scripts SQL do projeto.', 'Histórico do Banco');

  if (state.loading) return `${head}<section class="card"><p class="muted">Carregando o histórico gerado…</p></section>`;
  if (state.error) return `${head}<div class="empty"><strong>Não foi possível carregar o histórico.</strong><p>${escapeHtml(state.error)}</p><p>Execute <code>npm run git-history</code> e recarregue a página.</p></div>`;

  const history = state.data;
  if (!history) return `${head}<section class="card"><p class="muted">Carregando o histórico gerado…</p></section>`;

  if (!history.available) {
    return `${head}<div class="empty"><strong>Histórico Git indisponível.</strong><p>${escapeHtml(history.message ?? 'Este projeto não possui um repositório Git local.')}</p><p>Clone o repositório em vez de baixá-lo como ZIP para acompanhar a evolução dos scripts. O restante da documentação continua disponível.</p></div>`;
  }

  const categories = availableCategories(history);
  const statuses = availableStatuses(history);
  const commits = filterCommits(history, state);
  const noneAtAll = (history.commits ?? []).length === 0;

  const list = noneAtAll
    ? '<div class="empty"><strong>Nenhuma alteração SQL encontrada no histórico.</strong><p>Os commits deste repositório ainda não tocaram nos arquivos SQL das pastas configuradas do banco.</p></div>'
    : commits.length
      ? `<div class="history-timeline">${commits.map((commit) => commitCard(commit, state, database)).join('')}</div>`
      : empty('Nenhum commit corresponde à busca e aos filtros selecionados.');

  const limitNote = history.truncated
    ? `<p class="muted history-limit">Exibindo os ${history.config.maxCommits} commits mais recentes com alterações SQL, conforme <code>git.history.maxCommits</code>.</p>`
    : '';

  return `${head}
    ${summary(history, (history.commits ?? []).length)}
    ${noneAtAll ? '' : filters(history, state, categories, statuses)}
    ${noneAtAll ? '' : `<p class="muted history-count">${escapeHtml(plural(commits.length, 'commit exibido', 'commits exibidos'))}.</p>`}
    ${list}
    ${limitNote}`;
}

export { formatCommitDate };
