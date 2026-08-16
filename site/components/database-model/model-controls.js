import { escapeHtml, icon, isLogTable } from '../../utils.js';
import { modelFilters, searchTables, zoomLabel } from './model-state.js';

/**
 * Toolbar, legenda e painel de contexto da modelagem.
 *
 * Todos os controles usam os ícones da identidade visual do Astro e possuem
 * rótulo acessível + tooltip: nenhuma ação é comunicada apenas pelo desenho.
 */
function control(action, iconName, label, extra = '') {
  return `<button class="icon-button model-control" data-model-action="${action}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${extra}>${icon(iconName, 18)}</button>`;
}

export function modelToolbar(state, tables) {
  const results = searchTables(tables, state.query);
  const suggestions = state.query && results.length
    ? `<ul class="model-search-results" role="listbox">${results.slice(0, 8).map((table) => `<li><button data-model-focus="${escapeHtml(table.id)}" role="option">${icon(isLogTable(table) ? 'logTable' : 'table', 15)}<span>${escapeHtml(table.name)}</span><small>${escapeHtml((table.columns ?? []).length)} colunas</small></button></li>`).join('')}</ul>`
    : state.query
      ? '<ul class="model-search-results"><li class="model-search-empty">Nenhuma tabela corresponde à busca.</li></ul>'
      : '';

  return `<div class="model-toolbar">
    <div class="model-search">
      <label class="search-box model-search-box" for="model-search">
        ${icon('search', 18)}
        <input id="model-search" type="search" autocomplete="off" placeholder="Buscar tabela…" value="${escapeHtml(state.query)}">
      </label>
      ${suggestions}
    </div>
    <div class="model-filters" role="group" aria-label="Filtrar objetos da modelagem">
      ${icon('filter', 16, { className: 'model-filter-icon' })}
      ${modelFilters.map((filter) => `<button class="filter-button ${state.filter === filter.id ? 'active' : ''}" data-model-filter="${filter.id}" aria-pressed="${state.filter === filter.id}">${icon(filter.icon, 15)} ${escapeHtml(filter.label)}</button>`).join('')}
    </div>
    <div class="model-zoom" role="group" aria-label="Controles de zoom">
      ${control('zoom-out', 'minus', 'Reduzir zoom')}
      <output class="model-zoom-value" id="model-zoom-value" aria-live="polite">${zoomLabel(state.zoom)}</output>
      ${control('zoom-in', 'zoomIn', 'Aumentar zoom')}
      <span class="model-zoom-divider" aria-hidden="true"></span>
      ${control('fit', 'expand', 'Ajustar à tela')}
      ${control('reset', 'reset', 'Restaurar visualização')}
    </div>
  </div>`;
}

/** Alterna a área ampliada da modelagem; fica no cabeçalho, longe do zoom. */
export function expandControl(state) {
  const label = state.expanded ? 'Reduzir área da modelagem' : 'Expandir área da modelagem';
  return `<button class="button ghost" data-model-action="toggle-expanded" aria-pressed="${Boolean(state.expanded)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon(state.expanded ? 'minus' : 'expand', 16)} ${state.expanded ? 'Reduzir' : 'Expandir'}</button>`;
}

export function modelLegend() {
  const entries = [
    ['table', 'Table'],
    ['logTable', 'Log Table'],
    ['primaryKey', 'Primary Key'],
    ['foreignKey', 'Foreign Key']
  ];
  return `<div class="model-legend" aria-label="Legenda da modelagem">${entries.map(([name, label]) => `<span>${icon(name, 14)}${escapeHtml(label)}</span>`).join('')}<span class="model-legend-hint">Arraste para navegar · role para aplicar zoom · duplo clique abre os detalhes</span></div>`;
}

function summaryRow(label, value) {
  return `<div><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
}

export function tableContextPanel(table, database) {
  if (!table) return '';
  const columns = table.columns ?? [];
  const usedBy = table.usedBy ?? [];
  return `<aside class="model-panel" id="model-panel" aria-label="Detalhes da tabela selecionada">
    <div class="model-panel-head">
      <div><p class="eyebrow">${isLogTable(table) ? 'Log Table' : 'Tabela'}</p><h3>${icon(isLogTable(table) ? 'logTable' : 'table', 16)} ${escapeHtml(table.name)}</h3></div>
      <button class="icon-button" data-model-action="close-panel" aria-label="Fechar painel" title="Fechar painel">${icon('minus', 16)}</button>
    </div>
    ${table.description
      ? `<p class="model-panel-description">${icon('info', 14)} ${escapeHtml(table.description)}</p>`
      : '<p class="model-panel-description muted">Sem descrição cadastrada.</p>'}
    <div class="model-panel-stats">
      ${summaryRow('colunas', columns.length)}
      ${summaryRow('PK', columns.filter((column) => column.primaryKey).length)}
      ${summaryRow('FK', columns.filter((column) => column.references).length)}
    </div>
    ${usedBy.length ? `<div class="model-panel-block"><h4>Usado por</h4><ul>${usedBy.map((name) => {
      const related = (database?.objects ?? []).find((object) => String(object.name).toLowerCase() === String(name).toLowerCase());
      return `<li><button data-object-id="${escapeHtml(related?.id ?? '')}" ${related ? '' : 'disabled'}>${escapeHtml(name)}</button></li>`;
    }).join('')}</ul></div>` : '<div class="model-panel-block"><h4>Usado por</h4><p class="muted">Nenhum objeto depende desta tabela.</p></div>'}
    <div class="model-panel-actions">
      <button class="button primary" data-model-open="${escapeHtml(table.id)}">${icon('newTab', 16)} Abrir detalhes</button>
    </div>
  </aside>`;
}

export function relationshipPanel(relationship, tables) {
  if (!relationship) return '';
  const from = tables.get(relationship.from);
  const to = tables.get(relationship.to);
  return `<aside class="model-panel" id="model-panel" aria-label="Detalhes do relacionamento">
    <div class="model-panel-head">
      <div><p class="eyebrow">Foreign Key</p><h3>${icon('foreignKey', 16)} Relacionamento</h3></div>
      <button class="icon-button" data-model-action="close-panel" aria-label="Fechar painel" title="Fechar painel">${icon('minus', 16)}</button>
    </div>
    <div class="model-relationship">
      <button class="model-relationship-side" data-model-focus="${escapeHtml(relationship.from)}">${escapeHtml(from?.name ?? '')}<small>${escapeHtml(relationship.fromColumn)}</small></button>
      <span class="model-relationship-arrow">${icon('right', 18)}</span>
      <button class="model-relationship-side" data-model-focus="${escapeHtml(relationship.to)}">${escapeHtml(to?.name ?? '')}<small>${escapeHtml(relationship.toColumn)}</small></button>
    </div>
    ${relationship.constraint ? `<p class="model-panel-description">Constraint: <code>${escapeHtml(relationship.constraint)}</code></p>` : '<p class="model-panel-description muted">Constraint sem nome declarado no SQL.</p>'}
  </aside>`;
}
