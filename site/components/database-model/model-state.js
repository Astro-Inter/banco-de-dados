import { isLogTable, isTableLike } from '../../utils.js';
import { normalizeSearchValue } from '../../services/search.js';
import { clampZoom, zoomLimits } from './model-layout.js';

/**
 * Estado da modelagem: zoom, filtros, busca, seleção e posições movidas à mão.
 *
 * Fica separado dos dados (snapshot do Analyzer) e da renderização, para que
 * interagir com o canvas nunca dispare uma reanálise.
 */
export const modelFilters = Object.freeze([
  { id: 'all', label: 'Todas', icon: 'grid' },
  { id: 'table', label: 'Tabelas', icon: 'table' },
  { id: 'log-table', label: 'Log Tables', icon: 'logTable' }
]);

export function createModelState() {
  return {
    zoom: 1,
    filter: 'all',
    query: '',
    selectedId: null,
    focusedId: null,
    expanded: false,
    /** Posições arrastadas manualmente; o Reset devolve o layout calculado. */
    manualPositions: new Map()
  };
}

/** Tabelas e Log Tables do snapshot, na ordem em que o Analyzer as produziu. */
export function modelTables(database) {
  return (database?.objects ?? []).filter((object) => isTableLike(object));
}

export function visibleTables(database, state) {
  const tables = modelTables(database);
  if (state.filter === 'table') return tables.filter((table) => !isLogTable(table));
  if (state.filter === 'log-table') return tables.filter((table) => isLogTable(table));
  return tables;
}

/** Resultados da busca interna da modelagem (nome, descrição e colunas). */
export function searchTables(tables, query) {
  const term = normalizeSearchValue(query);
  if (!term) return [];
  return tables.filter((table) => normalizeSearchValue(table.name).includes(term)
    || normalizeSearchValue(table.description).includes(term)
    || (table.columns ?? []).some((column) => normalizeSearchValue(column?.name).includes(term)));
}

export function zoomIn(state) {
  state.zoom = clampZoom(state.zoom + zoomLimits.step);
  return state.zoom;
}

export function zoomOut(state) {
  state.zoom = clampZoom(state.zoom - zoomLimits.step);
  return state.zoom;
}

/** Reset devolve zoom, pan e o layout automático das tabelas. */
export function resetModel(state) {
  state.zoom = 1;
  state.manualPositions.clear();
  state.selectedId = null;
  state.focusedId = null;
  return state;
}

export function zoomLabel(zoom) {
  return `${Math.round(zoom * 100)}%`;
}

/** Posições calculadas, sobrescritas pelas que o usuário arrastou. */
export function effectivePositions(layout, state) {
  const positions = new Map(layout.positions);
  for (const [id, manual] of state.manualPositions) {
    const base = positions.get(id);
    if (base) positions.set(id, { ...base, x: manual.x, y: manual.y });
  }
  return positions;
}
