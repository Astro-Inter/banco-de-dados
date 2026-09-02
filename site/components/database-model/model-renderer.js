import { escapeHtml, formatColumnType, isLogTable } from '../../utils.js';
import { svgIcon } from '../../icons.js';
import { layoutMetrics } from './model-layout.js';

/**
 * Renderização do diagrama. Recebe layout + estado e devolve markup SVG:
 * nenhuma consulta ao Analyzer e nenhuma manipulação de eventos acontece aqui.
 */
function truncate(value, limit) {
  const text = String(value ?? '');
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function formatType(column) {
  return formatColumnType(column).replace(/\s+/g, '');
}

/** Tooltip nativo com o detalhamento completo da coluna. */
function columnTitle(table, column) {
  const lines = [
    `${table.name}.${column.name}`,
    `Tipo: ${formatType(column) || 'não identificado'}`,
    `Nullable: ${column.notNull || column.primaryKey || column.nullable === false ? 'Não' : 'Sim'}`,
    `Primary Key: ${column.primaryKey ? 'Sim' : 'Não'}`,
    `Foreign Key: ${column.references ? `Sim → ${column.references}.${column.referencesColumn ?? 'id'}` : 'Não'}`,
    `Unique: ${column.unique ? 'Sim' : 'Não'}`,
    `Default: ${column.default ?? 'Nenhum'}`,
    `Check: ${column.check ?? 'Nenhum'}`
  ];
  if (column.description) lines.push(`Descrição: ${column.description}`);
  return escapeHtml(lines.join('\n'));
}

/** Índice da linha de uma coluna dentro do card, respeitando o limite exibido. */
export function columnRowIndex(table, columnName, metrics = layoutMetrics) {
  const index = (table.columns ?? []).findIndex((column) => String(column?.name ?? '').toLowerCase() === String(columnName ?? '').toLowerCase());
  if (index < 0) return 0;
  return Math.min(index, metrics.maxRows - 1);
}

export function columnAnchorY(table, columnName, position, metrics = layoutMetrics) {
  return position.y + metrics.headerHeight + columnRowIndex(table, columnName, metrics) * metrics.rowHeight + metrics.rowHeight / 2;
}

export function renderNode(table, position, state, metrics = layoutMetrics) {
  const log = isLogTable(table);
  const columns = (table.columns ?? []).slice(0, metrics.maxRows);
  const hidden = (table.columns ?? []).length - columns.length;
  const selected = state.selectedId === table.id;
  const focused = state.focusedId === table.id;
  const dimmed = state.selectedId && !selected && !state.relatedIds?.has(table.id);

  const rows = columns.map((column, index) => {
    const y = metrics.headerHeight + index * metrics.rowHeight;
    const key = column.primaryKey ? 'primaryKey' : column.references ? 'foreignKey' : null;
    return `<g class="model-col ${column.primaryKey ? 'is-pk' : ''} ${column.references ? 'is-fk' : ''}" data-model-column="${escapeHtml(table.id)}:${escapeHtml(column.name)}" transform="translate(0 ${y})">
      <rect class="model-col-hit" x="1" y="0" width="${metrics.nodeWidth - 2}" height="${metrics.rowHeight}"/>
      <title>${columnTitle(table, column)}</title>
      ${key ? svgIcon(key, { x: 11, y: (metrics.rowHeight - 13) / 2, size: 13, className: `model-col-icon ${column.primaryKey ? 'pk' : 'fk'}` }) : ''}
      <text class="model-col-name" x="31" y="${metrics.rowHeight / 2 + 4}">${escapeHtml(truncate(column.name, 20))}</text>
      <text class="model-col-type" x="${metrics.nodeWidth - 12}" y="${metrics.rowHeight / 2 + 4}" text-anchor="end">${escapeHtml(truncate(formatType(column), 14))}</text>
    </g>`;
  }).join('');

  const footer = hidden > 0
    ? `<text class="model-node-footer" x="${metrics.nodeWidth / 2}" y="${metrics.headerHeight + columns.length * metrics.rowHeight + 15}" text-anchor="middle">+${hidden} coluna(s)</text>`
    : '';

  return `<g class="model-node ${log ? 'is-log' : ''} ${selected ? 'is-selected' : ''} ${focused ? 'is-focused' : ''} ${dimmed ? 'is-dimmed' : ''}"
      data-model-table="${escapeHtml(table.id)}" transform="translate(${position.x} ${position.y})"
      tabindex="0" role="button" aria-label="${escapeHtml(`${log ? 'Log Table' : 'Tabela'} ${table.name}`)}">
    <title>${escapeHtml(table.description ? `${table.name}\n${table.description}` : table.name)}</title>
    <rect class="model-node-bg" width="${metrics.nodeWidth}" height="${position.height}" rx="10"/>
    <path class="model-node-head" d="M0 10a10 10 0 0 1 10-10h${metrics.nodeWidth - 20}a10 10 0 0 1 10 10v${metrics.headerHeight - 10}H0Z"/>
    ${svgIcon(log ? 'logTable' : 'table', { x: 12, y: metrics.headerHeight / 2 - 8, size: 16, className: 'model-node-icon' })}
    <text class="model-node-name" x="36" y="${metrics.headerHeight / 2 + 5}">${escapeHtml(truncate(table.name, log ? 17 : 21))}</text>
    ${log ? `<g class="model-log-tag" transform="translate(${metrics.nodeWidth - 44} ${metrics.headerHeight / 2 - 9})"><rect width="34" height="18" rx="9"/><text x="17" y="13" text-anchor="middle">LOG</text></g>` : ''}
    ${rows}${footer}
  </g>`;
}

export function renderRelationship(relationship, tables, positions, state, metrics = layoutMetrics) {
  const from = positions.get(relationship.from);
  const to = positions.get(relationship.to);
  if (!from || !to) return '';
  const fromTable = tables.get(relationship.from);
  const toTable = tables.get(relationship.to);
  const inheritance = relationship.type === 'inheritance';
  const y1 = inheritance ? from.y + metrics.headerHeight / 2 : columnAnchorY(fromTable, relationship.fromColumn, from, metrics);
  const y2 = inheritance ? to.y + metrics.headerHeight / 2 : columnAnchorY(toTable, relationship.toColumn, to, metrics);
  const leftToRight = from.x + metrics.nodeWidth / 2 <= to.x + metrics.nodeWidth / 2;
  const x1 = leftToRight ? from.x + metrics.nodeWidth : from.x;
  const x2 = leftToRight ? to.x : to.x + metrics.nodeWidth;
  const bend = Math.max(36, Math.abs(x2 - x1) / 2);
  const direction = leftToRight ? 1 : -1;
  const active = state.selectedId && (state.selectedId === relationship.from || state.selectedId === relationship.to);
  const dimmed = state.selectedId && !active;

  const description = inheritance
    ? `Herança ${fromTable.name} para ${toTable.name}`
    : `Relacionamento ${fromTable.name}.${relationship.fromColumn} para ${toTable.name}.${relationship.toColumn}`;

  return `<g class="model-edge ${inheritance ? 'is-inheritance' : 'is-foreign-key'} ${active ? 'is-active' : ''} ${dimmed ? 'is-dimmed' : ''}" data-model-edge="${escapeHtml(relationship.id)}"
      data-from="${escapeHtml(relationship.from)}" data-to="${escapeHtml(relationship.to)}"
      data-from-column="${escapeHtml(relationship.fromColumn ?? '')}" data-to-column="${escapeHtml(relationship.toColumn ?? '')}"
      data-relationship-type="${escapeHtml(relationship.type)}"
      tabindex="0" role="button" aria-label="${escapeHtml(description)}">
    <title>${escapeHtml(inheritance ? `${fromTable.name} herda de ${toTable.name}` : `${fromTable.name}.${relationship.fromColumn} → ${toTable.name}.${relationship.toColumn}`)}</title>
    <path class="model-edge-hit" d="M ${x1} ${y1} C ${x1 + bend * direction} ${y1}, ${x2 - bend * direction} ${y2}, ${x2} ${y2}"/>
    <path class="model-edge-line" d="M ${x1} ${y1} C ${x1 + bend * direction} ${y1}, ${x2 - bend * direction} ${y2}, ${x2} ${y2}" marker-end="url(#${inheritance ? 'model-inheritance-arrow' : 'model-arrow'})"/>
    <circle class="model-edge-dot" cx="${x1}" cy="${y1}" r="3.5"/>
  </g>`;
}

export function renderDiagram(tables, layout, positions, state, metrics = layoutMetrics) {
  const byId = new Map(tables.map((table) => [table.id, table]));
  const visible = new Set(tables.map((table) => table.id));
  const relationships = layout.relationships.filter((item) => visible.has(item.from) && visible.has(item.to));
  const edges = relationships.map((relationship) => renderRelationship(relationship, byId, positions, state, metrics)).join('');
  const nodes = tables.map((table) => renderNode(table, positions.get(table.id), state, metrics)).join('');
  return `<svg class="model-svg" id="model-svg" viewBox="0 0 ${layout.bounds.width} ${layout.bounds.height}"
      style="width:${Math.round(layout.bounds.width * state.zoom)}px;height:${Math.round(layout.bounds.height * state.zoom)}px"
      role="img" aria-label="Diagrama da modelagem física do banco">
    <defs>
      <marker id="model-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"/></marker>
      <marker id="model-inheritance-arrow" viewBox="0 0 12 10" refX="11" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 1 1 L 11 5 L 1 9 z"/></marker>
    </defs>
    <g class="model-edges">${edges}</g>
    <g class="model-nodes">${nodes}</g>
  </svg>`;
}
