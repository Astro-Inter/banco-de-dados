import { escapeHtml, icon } from '../../utils.js';
import { expandControl, modelLegend, modelToolbar, relationshipPanel, tableContextPanel } from './model-controls.js';
import { computeLayout } from './model-layout.js';
import { createModelState, effectivePositions, modelTables, visibleTables } from './model-state.js';
import { renderDiagram } from './model-renderer.js';

/**
 * Explorador visual da arquitetura do banco.
 *
 * Substitui a listagem estática de cards por um diagrama navegável: busca,
 * filtros, seleção, relacionamentos explicados e Log Tables identificadas.
 * Funciona apenas com o snapshot do Analyzer, portanto continua completo no
 * GitHub Pages (Read Only) — nada aqui depende do backend local.
 */
export function modelEmptyState(state, total) {
  if (!total) return `<div class="empty">${icon('table', 22)}<strong>Nenhuma tabela encontrada.</strong><p>Adicione arquivos de esquema em <code>database/scripts</code> ou <code>database/logs</code> e execute o analyzer.</p></div>`;
  return `<div class="empty">${icon('filter', 22)}<strong>Nenhuma tabela corresponde aos filtros selecionados.</strong><p>Ajuste o filtro ou limpe a busca para ver as demais tabelas.</p></div>`;
}

/**
 * @param {object} database snapshot do Analyzer
 * @param {object} state    estado da modelagem (zoom, filtros, seleção)
 * @param {Array}  issues   ocorrências do Analyzer, exibidas sem esconder o diagrama
 */
export function modelingView(database, state = createModelState()) {
  const all = modelTables(database);
  const tables = visibleTables(database, state);
  const layout = computeLayout(tables);
  const positions = effectivePositions(layout, state);
  const byId = new Map(tables.map((table) => [table.id, table]));

  state.relatedIds = relatedIds(layout.relationships, state.selectedId);
  const selected = state.selectedId ? byId.get(state.selectedId) : null;
  const relationship = state.selectedEdgeId ? layout.relationships.find((item) => item.id === state.selectedEdgeId) : null;
  const panel = relationship ? relationshipPanel(relationship, byId) : selected ? tableContextPanel(selected, database) : '';

  const issues = (database?.issues ?? []).filter((issue) => issue.severity === 'error');
  const alert = issues.length
    ? `<div class="model-alert">${icon('error', 16)}<div><strong>${issues.length} arquivo(s) com erro de interpretação.</strong><span>Os objetos válidos continuam sendo exibidos normalmente.</span></div></div>`
    : '';

  return `<section class="card model-card ${state.expanded ? 'is-expanded' : ''}" id="model-card">
    <div class="card-head">
      <div><h2>${icon('physicalModel', 18)} Modelagem do banco</h2><p class="muted">${tables.length} de ${all.length} tabela(s) · ${layout.relationships.length} relacionamento(s)</p></div>
      ${expandControl(state)}
    </div>
    ${modelToolbar(state, all)}
    ${alert}
    <div class="model-stage">
      <div class="model-canvas" id="model-canvas" tabindex="0" aria-label="Área navegável do diagrama">
        ${tables.length ? renderDiagram(tables, layout, positions, state) : modelEmptyState(state, all.length)}
      </div>
      ${panel}
    </div>
    ${modelLegend()}
  </section>`;
}

/** Tabelas ligadas à selecionada — as demais ficam menos proeminentes. */
export function relatedIds(relationships, selectedId) {
  const related = new Set();
  if (!selectedId) return related;
  related.add(selectedId);
  for (const relationship of relationships) {
    if (relationship.from === selectedId) related.add(relationship.to);
    if (relationship.to === selectedId) related.add(relationship.from);
  }
  return related;
}

export { escapeHtml };
