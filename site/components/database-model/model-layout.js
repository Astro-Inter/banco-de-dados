import { sameIdentifier } from '../../services/search.js';
import { isLogTable } from '../../utils.js';

/**
 * Cálculo do layout da modelagem física.
 *
 * Módulo puro: recebe tabelas e devolve posições. Não conhece DOM, não faz
 * fetch e não reprocessa SQL — mover o canvas ou aplicar zoom nunca passa por
 * aqui. As relações vêm das chaves estrangeiras que o Analyzer já extraiu;
 * não existe um segundo sistema de dependências.
 */
export const layoutMetrics = Object.freeze({
  nodeWidth: 232,
  headerHeight: 46,
  rowHeight: 26,
  maxRows: 14,
  footerHeight: 22,
  columnGap: 118,
  rowGap: 46,
  padding: 60
});

export const zoomLimits = Object.freeze({ min: 0.4, max: 2, step: 0.15 });

/** Altura do card conforme o número de colunas exibidas. */
export function nodeHeight(table, metrics = layoutMetrics) {
  const total = (table.columns ?? []).length;
  const visible = Math.min(total, metrics.maxRows);
  return metrics.headerHeight + visible * metrics.rowHeight + (total > visible ? metrics.footerHeight : 0) + 10;
}

/** Arestas de chave estrangeira entre as tabelas informadas. */
export function relationshipsOf(tables) {
  const relationships = [];
  for (const table of tables) {
    for (const column of table.columns ?? []) {
      if (!column?.references) continue;
      const target = tables.find((item) => sameIdentifier(item.name, column.references));
      if (!target || target.id === table.id) continue;
      relationships.push({
        id: `${table.id}::${column.name}::${target.id}`,
        from: table.id,
        to: target.id,
        fromColumn: column.name,
        toColumn: column.referencesColumn ?? 'id',
        constraint: constraintFor(table, column)
      });
    }
  }
  return relationships;
}

function constraintFor(table, column) {
  const pattern = new RegExp(`CONSTRAINT\\s+(\\S+)\\s+FOREIGN\\s+KEY\\s*\\(\\s*${column.name}\\s*\\)`, 'i');
  for (const constraint of table.constraints ?? []) {
    const match = String(constraint).match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Nível de cada tabela: uma tabela referenciada fica sempre à esquerda de quem
 * a referencia, de modo que `clientes → pedidos → log_pedidos` vira uma leitura
 * da esquerda para a direita. Ciclos não travam o cálculo.
 */
export function computeRanks(tables, relationships) {
  const parents = new Map(tables.map((table) => [table.id, []]));
  for (const relationship of relationships) {
    if (parents.has(relationship.from)) parents.get(relationship.from).push(relationship.to);
  }
  const ranks = new Map(tables.map((table) => [table.id, 0]));
  const visiting = new Set();
  const resolved = new Set();

  const resolve = (id) => {
    if (resolved.has(id)) return ranks.get(id);
    if (visiting.has(id)) return 0; // ciclo: interrompe sem travar o layout
    visiting.add(id);
    const rank = (parents.get(id) ?? []).reduce((highest, parent) => Math.max(highest, resolve(parent) + 1), 0);
    visiting.delete(id);
    resolved.add(id);
    ranks.set(id, rank);
    return rank;
  };

  for (const table of tables) resolve(table.id);

  // Log Tables isoladas ficam ao final, junto das tabelas secundárias.
  const highestRegular = Math.max(0, ...tables.filter((table) => !isLogTable(table)).map((table) => ranks.get(table.id)));
  for (const table of tables) {
    if (isLogTable(table) && ranks.get(table.id) === 0 && !(parents.get(table.id) ?? []).length) {
      ranks.set(table.id, highestRegular + 1);
    }
  }
  return ranks;
}

/** Ordena cada coluna pelo baricentro dos vizinhos, reduzindo cruzamentos. */
function orderWithinRanks(groups, relationships, order) {
  const neighbours = new Map();
  for (const relationship of relationships) {
    if (!neighbours.has(relationship.from)) neighbours.set(relationship.from, []);
    if (!neighbours.has(relationship.to)) neighbours.set(relationship.to, []);
    neighbours.get(relationship.from).push(relationship.to);
    neighbours.get(relationship.to).push(relationship.from);
  }
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [, group] of groups) {
      group.sort((a, b) => {
        const score = (table) => {
          const positions = (neighbours.get(table.id) ?? []).map((id) => order.get(id)).filter(Number.isFinite);
          return positions.length ? positions.reduce((sum, value) => sum + value, 0) / positions.length : Number.POSITIVE_INFINITY;
        };
        const difference = score(a) - score(b);
        if (Number.isFinite(difference) && difference !== 0) return difference;
        return Number(isLogTable(a)) - Number(isLogTable(b)) || String(a.name).localeCompare(String(b.name));
      });
      group.forEach((table, index) => order.set(table.id, index));
    }
  }
}

/**
 * @returns {{positions: Map, bounds: {width, height}, ranks: Map, relationships: Array}}
 */
export function computeLayout(tables, { metrics = layoutMetrics, relationships } = {}) {
  const list = tables ?? [];
  const edges = relationships ?? relationshipsOf(list);
  if (!list.length) return { positions: new Map(), bounds: { width: 640, height: 420 }, ranks: new Map(), relationships: [] };

  const ranks = computeRanks(list, edges);
  const groups = new Map();
  for (const table of list) {
    const rank = ranks.get(table.id) ?? 0;
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank).push(table);
  }
  const sortedGroups = new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
  const order = new Map(list.map((table, index) => [table.id, index]));
  orderWithinRanks(sortedGroups, edges, order);

  const heights = new Map(list.map((table) => [table.id, nodeHeight(table, metrics)]));
  const columnHeights = [...sortedGroups.values()].map((group) => group.reduce((total, table) => total + heights.get(table.id) + metrics.rowGap, -metrics.rowGap));
  const tallest = Math.max(...columnHeights, 0);

  const positions = new Map();
  let index = 0;
  for (const [rank, group] of sortedGroups) {
    const columnHeight = columnHeights[index];
    let y = metrics.padding + (tallest - columnHeight) / 2;
    for (const table of group) {
      positions.set(table.id, { x: metrics.padding + rank * (metrics.nodeWidth + metrics.columnGap), y, height: heights.get(table.id) });
      y += heights.get(table.id) + metrics.rowGap;
    }
    index += 1;
  }

  const bounds = {
    width: Math.max(...[...positions.values()].map((position) => position.x + metrics.nodeWidth)) + metrics.padding,
    height: Math.max(...[...positions.values()].map((position) => position.y + position.height)) + metrics.padding
  };
  return { positions, bounds, ranks, relationships: edges };
}

/** Zoom que faz todo o conteúdo caber no viewport informado. */
export function fitZoom(bounds, viewport, limits = zoomLimits) {
  if (!bounds?.width || !bounds?.height || !viewport?.width || !viewport?.height) return 1;
  const zoom = Math.min(viewport.width / bounds.width, viewport.height / bounds.height);
  return clampZoom(zoom, limits);
}

export function clampZoom(zoom, limits = zoomLimits) {
  return Math.min(limits.max, Math.max(limits.min, Number(zoom.toFixed(3))));
}
