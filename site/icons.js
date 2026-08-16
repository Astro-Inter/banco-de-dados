import { iconLibrary } from './icons-library.js';

/**
 * Sistema de ícones do Astro Database Workspace.
 *
 * REGRA: a aplicação usa exclusivamente os ícones da identidade visual do
 * projeto, versionados em `site/images/*.svg`. Nada de bibliotecas externas,
 * emojis ou caracteres Unicode simulando ícones. Para adicionar um ícone,
 * coloque o SVG em `site/images/` e rode `npm run icons`.
 *
 * Este módulo mapeia NOMES SEMÂNTICOS (o que o ícone significa na aplicação)
 * para ASSETS (o arquivo que o desenha), para que trocar o desenho de um
 * conceito seja uma alteração de uma linha.
 */
const semanticIcons = {
  // Tipos de objeto
  table: 'grid',
  logTable: 'clock',
  view: 'eye',
  procedure: 'code-2',
  function: 'code-1',
  index: 'sort-ascending',
  trigger: 'zap',
  dataload: 'bulk-upload',
  script: 'document-1',
  document: 'document-1',
  documentAdd: 'document-add',
  documentMissing: 'document-missing',

  // Estrutura de tabelas
  primaryKey: 'key',
  key: 'key',
  foreignKey: 'link',
  link: 'link',
  column: 'add-column',
  columns: 'add-column',
  addColumn: 'add-column',

  // Navegação e páginas
  dashboard: 'dashboard',
  modeling: 'picture',
  physicalModel: 'inventory',
  dependencies: 'link',
  impact: 'error-warning-circle',
  changes: 'new',
  execution: 'play-circle',
  // Histórico do Banco. `clock_2` (relógio com a seta de retorno) é o desenho
  // de "voltar no tempo"; o relógio simples fica com as tabelas de log.
  history: 'clock_2',
  // O marcador de commit ainda usa um stand-in do próprio projeto (ver
  // `pendingIcons`): a etiqueta representa o ponto rotulado da linha do tempo.
  commit: 'tag',
  fileAdded: 'document-add',
  fileModified: 'edit-1',
  fileRemoved: 'document-missing',
  fileRenamed: 'right',
  hamburger: 'hamburguer',
  chevronRight: 'chevron-right',
  right: 'right',
  newTab: 'new-tab',

  // Ações
  search: 'search',
  filter: 'filter-1',
  sort: 'sort-ascending',
  listView: 'list-view',
  list: 'list_3',
  steps: 'list_4',
  grid: 'grid',
  copy: 'copy',
  edit: 'edit-1',
  trash: 'trash',
  plus: 'plus',
  refresh: 'refresh',
  reset: 'reset',
  zoomIn: 'zoom-in',
  minus: 'minus',
  expand: 'expand',
  play: 'play-circle',
  playCircle: 'play-circle',
  transaction: 'upload_1',
  setting: 'customise',
  zap: 'zap',

  // Estados e feedback
  check: 'check-circle',
  checkCircle: 'check-circle',
  alreadyExecuted: 'double_check',
  error: 'error-warning-circle',
  info: 'info-circle',
  infoCircle: 'info-circle',
  lock: 'lock',
  eyeOff: 'eye-off',
  hourglass: 'hourglass-waiting',
  tag: 'tag',
  picture: 'picture'
};

/**
 * Conceitos que ainda não possuem o asset definitivo da biblioteca do Astro.
 * Enquanto o SVG oficial não chega, usamos outro ícone DO PRÓPRIO PROJETO como
 * stand-in — nunca um ícone genérico ou de biblioteca externa. Ao receber o
 * asset, basta salvá-lo em `site/images/`, rodar `npm run icons` e apontar o
 * nome semântico acima para ele.
 */
export const pendingIcons = {
  filter: { requested: 'Filter 2', meaning: 'Filtros', standIn: 'filter-1' },
  transaction: { requested: 'Transaction', meaning: 'Migração', standIn: 'upload_1' },
  commit: { requested: 'Commit', meaning: 'Commit Git', standIn: 'tag' },
  fileRenamed: { requested: 'Rename', meaning: 'Arquivo renomeado', standIn: 'right' },
  cursorHand: { requested: 'Cursor Hand', meaning: 'Mover visualização', standIn: null },
  drag: { requested: 'Drag', meaning: 'Arrastar objeto', standIn: null }
};

export function iconAsset(name) {
  return semanticIcons[name] ?? (iconLibrary[name] ? name : null);
}

export function hasIcon(name) {
  const asset = iconAsset(name);
  return Boolean(asset && iconLibrary[asset]);
}

/**
 * @param {string} name   nome semântico (ou o próprio asset)
 * @param {number} size   lado do quadrado em pixels
 * @param {object|string} options `{ className, title, label }` — `title` gera
 *        tooltip nativo e `label` transforma o ícone em conteúdo acessível.
 *        Sem `label`, o ícone é decorativo (`aria-hidden`) e o texto ao lado
 *        precisa comunicar a ação.
 */
export function icon(name, size = 20, options = {}) {
  const settings = typeof options === 'string' ? { className: options } : options;
  const asset = iconAsset(name);
  const entry = asset ? iconLibrary[asset] : null;
  if (!entry) return '';
  const accessibility = settings.label
    ? `role="img" aria-label="${escapeAttribute(settings.label)}"`
    : 'aria-hidden="true"';
  const title = settings.title ? `<title>${escapeAttribute(settings.title)}</title>` : '';
  return `<svg class="icon ${settings.className ?? ''}" width="${size}" height="${size}" viewBox="${entry.viewBox}" fill="none" stroke-width="2" ${accessibility} focusable="false">${title}${entry.body}</svg>`;
}

function escapeAttribute(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

/**
 * Ícone posicionado dentro de um `<svg>` maior (usado pela modelagem).
 * SVG aninhado mantém o desenho original do asset em qualquer viewBox.
 */
export function svgIcon(name, { x = 0, y = 0, size = 14, className = '' } = {}) {
  const asset = iconAsset(name);
  const entry = asset ? iconLibrary[asset] : null;
  if (!entry) return '';
  return `<svg class="icon ${className}" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${entry.viewBox}" fill="none" stroke-width="2" aria-hidden="true">${entry.body}</svg>`;
}

/** Botão composto apenas por ícone: exige rótulo acessível e tooltip. */
export function iconButton(name, { label, className = 'button ghost', size = 16, dataset = '' } = {}) {
  return `<button class="${className}" ${dataset} aria-label="${escapeAttribute(label)}" title="${escapeAttribute(label)}">${icon(name, size)}</button>`;
}

export { iconLibrary };
