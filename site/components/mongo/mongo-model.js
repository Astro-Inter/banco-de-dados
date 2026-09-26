import { escapeHtml, icon } from '../../utils.js';

export function createMongoModelState() {
  return { zoom: 1, query: '', selected: null, positions: {}, expanded: false, scroll: { left: 0, top: 0 } };
}

/** Embedding vem dos caminhos dos campos; referências exigem declaração explícita. */
export function mongoGraph(collections) {
  const nodes = [];
  const edges = [];
  for (const collection of collections) {
    const children = collection.fields.filter((field) => /object/.test(field.type) && collection.fields.some((item) => item.name.startsWith(`${field.name.replace(/\[\]$/, '')}[].`) || item.name.startsWith(`${field.name}.`)));
    nodes.push({ id: collection.name, name: collection.name, collection, fields: collection.fields.filter((field) => !field.name.includes('.')), type: 'collection' });
    for (const field of children) {
      const prefix = field.name.replace(/\[\]$/, '');
      const id = `${collection.name}::${field.name}`;
      nodes.push({ id, name: field.name, collection, fields: collection.fields.filter((item) => item.name.startsWith(`${prefix}[].`) || item.name.startsWith(`${prefix}.`)), type: 'embedded' });
      edges.push({ from: collection.name, to: id, label: field.name, type: 'embedded' });
    }
    for (const field of collection.fields) {
      if (field.references && collections.some((item) => item.name === field.references)) edges.push({ from: collection.name, to: field.references, label: field.name, type: 'reference' });
    }
  }
  return { nodes, edges };
}

export function mongoModelLayout(graph) {
  const positions = {};
  let heights = [40, 40];
  let index = 0;
  for (const node of graph.nodes.filter((item) => item.type === 'collection')) {
    const column = index++ % 2;
    const x = 40 + column * 650;
    const y = heights[column];
    const height = 62 + node.fields.length * 25;
    positions[node.id] = { x, y, width: 280, height };
    let childY = y;
    for (const child of graph.nodes.filter((item) => item.type === 'embedded' && item.collection.name === node.id)) {
      const childHeight = 62 + child.fields.length * 25;
      positions[child.id] = { x: x + 340, y: childY, width: 240, height: childHeight };
      childY += childHeight + 24;
    }
    heights[column] = Math.max(y + height, childY) + 55;
  }
  return { positions, width: 1300, height: Math.max(...heights) };
}

function diagram(graph, state) {
  const layout = mongoModelLayout(graph);
  const positions = Object.fromEntries(Object.entries(layout.positions).map(([id, position]) => [id, { ...position, ...state.positions[id] }]));
  const width = Math.max(layout.width, ...Object.values(positions).map((position) => position.x + position.width + 40));
  const height = Math.max(layout.height, ...Object.values(positions).map((position) => position.y + position.height + 40));
  const edges = graph.edges.map((edge) => {
    const from = positions[edge.from]; const to = positions[edge.to];
    const x1 = from.x + from.width; const y1 = from.y + 30; const x2 = to.x; const y2 = to.y + 30;
    return `<g class="mongo-model-edge ${edge.type}"><title>${escapeHtml(`${edge.label}: ${edge.from} → ${edge.to}`)}</title><path d="M${x1} ${y1} C${x1 + 35} ${y1} ${x2 - 35} ${y2} ${x2} ${y2}" marker-end="url(#mongo-model-arrow)"/></g>`;
  }).join('');
  const nodes = graph.nodes.map((node) => {
    const p = positions[node.id];
    const matches = !state.query || `${node.name} ${node.fields.map((field) => field.name).join(' ')}`.toLowerCase().includes(state.query.toLowerCase());
    return `<g class="mongo-model-node ${node.type} ${state.selected === node.id ? 'selected' : ''} ${matches ? '' : 'dimmed'}" data-mongo-node="${escapeHtml(node.id)}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${escapeHtml(`${node.type === 'collection' ? 'Collection' : 'Documento embutido'} ${node.name}`)}"><title>${escapeHtml(`${node.collection.name}: ${node.name}`)}</title><rect width="${p.width}" height="${p.height}" rx="10"/><text class="mongo-model-kind" x="14" y="20">${node.type === 'collection' ? 'COLLECTION' : 'DOCUMENTO EMBUTIDO'}</text><text class="mongo-model-name" x="14" y="42">${escapeHtml(node.name.length > 29 ? `${node.name.slice(0, 28)}…` : node.name)}</text>${node.fields.map((field, index) => {
      const name = node.type === 'embedded' ? field.name.split('.').slice(1).join('.') : field.name;
      return `<g><title>${escapeHtml(`${field.name}: ${field.type}${field.references ? ` → ${field.references}` : ''}`)}</title><text class="mongo-model-field" x="14" y="${76 + index * 25}">${escapeHtml(name.length > 22 ? `${name.slice(0, 21)}…` : name)}</text><text class="mongo-model-type" x="${p.width - 14}" y="${76 + index * 25}" text-anchor="end">${escapeHtml(field.type)}</text></g>`;
    }).join('')}</g>`;
  }).join('');
  return `<svg class="mongo-model-svg" viewBox="0 0 ${width} ${height}" style="width:${width * state.zoom}px;height:${height * state.zoom}px" aria-label="Modelagem documental MongoDB"><defs><marker id="mongo-model-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z"/></marker></defs>${edges}${nodes}</svg>`;
}

export function mongoModelView(data, state) {
  const graph = mongoGraph(data.collections);
  const selected = graph.nodes.find((node) => node.id === state.selected);
  return `<section class="card mongo-model-card ${state.expanded ? 'expanded' : ''}"><div class="card-head"><div><h2>Modelagem das collections</h2><p class="muted">${data.collections.length} collections · ${graph.nodes.filter((node) => node.type === 'embedded').length} documentos embutidos</p></div><button class="button ghost" data-mongo-model-action="expand">${icon('expand', 16)} ${state.expanded ? 'Reduzir' : 'Expandir'}</button></div><div class="mongo-model-toolbar"><label class="search-box" for="mongo-model-search">${icon('search', 16)}<input id="mongo-model-search" placeholder="Localizar collection ou campo…" value="${escapeHtml(state.query)}"/></label><div class="mongo-model-controls"><button class="icon-button" data-mongo-model-action="out" aria-label="Reduzir zoom">${icon('minus', 16)}</button><output>${Math.round(state.zoom * 100)}%</output><button class="icon-button" data-mongo-model-action="in" aria-label="Aumentar zoom">${icon('plus', 16)}</button><button class="button ghost" data-mongo-model-action="fit">Ajustar à tela</button><button class="button ghost" data-mongo-model-action="reset">Restaurar</button></div></div><div class="mongo-model-canvas" tabindex="0" aria-label="Área navegável da modelagem MongoDB">${graph.nodes.length ? diagram(graph, state) : '<div class="empty"><strong>Nenhuma collection documentada.</strong></div>'}</div>${selected ? `<div class="mongo-model-selection"><div><strong>${escapeHtml(selected.collection.name)}${selected.type === 'embedded' ? ` · ${escapeHtml(selected.name)}` : ''}</strong><p>${escapeHtml(selected.collection.description)}</p></div><button class="button ghost" data-mongo-model-open="${escapeHtml(selected.collection.name)}">Abrir documentação</button></div>` : ''}<div class="mongo-model-legend"><span><i></i>Documento embutido</span><span><i class="reference"></i>Referência declarada</span><span>Arraste os cards ou o fundo · duplo clique abre a documentação</span></div><p class="mongo-model-note">As ligações vêm da estrutura dos campos. Referências entre collections só aparecem quando o campo declara <code>references</code> com o nome da collection.</p></section>`;
}

export function mountMongoModel(root, data, state, rerender, onOpen) {
  const canvas = root.querySelector('.mongo-model-canvas');
  if (!canvas) return;
  canvas.scrollTo(state.scroll.left, state.scroll.top);
  canvas.addEventListener('scroll', () => { state.scroll = { left: canvas.scrollLeft, top: canvas.scrollTop }; });
  const graph = mongoGraph(data.collections);
  const layout = mongoModelLayout(graph);
  let drag = null;
  let moved = false;
  const renderDiagram = () => { canvas.innerHTML = diagram(graph, state); };
  const zoom = (value) => {
    state.zoom = Math.max(0.35, Math.min(2, value));
    renderDiagram();
    root.querySelector('.mongo-model-controls output').textContent = `${Math.round(state.zoom * 100)}%`;
  };
  root.querySelectorAll('[data-mongo-model-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.mongoModelAction;
    if (action === 'in' || action === 'out') zoom(state.zoom + (action === 'in' ? 0.15 : -0.15));
    if (action === 'fit') { const svg = canvas.querySelector('svg'); if (svg) zoom(Math.min((canvas.clientWidth - 24) / svg.viewBox.baseVal.width, (canvas.clientHeight - 24) / svg.viewBox.baseVal.height)); canvas.scrollTo(0, 0); }
    if (action === 'reset') { state.positions = {}; state.selected = null; state.query = ''; state.zoom = 1; state.scroll = { left: 0, top: 0 }; rerender(); }
    if (action === 'expand') { state.expanded = !state.expanded; rerender(); }
  }));
  root.querySelector('#mongo-model-search').addEventListener('input', (event) => {
    state.query = event.target.value; renderDiagram();
    const match = graph.nodes.find((node) => state.query && `${node.name} ${node.fields.map((field) => field.name).join(' ')}`.toLowerCase().includes(state.query.toLowerCase()));
    if (match) { const p = { ...layout.positions[match.id], ...state.positions[match.id] }; canvas.scrollTo({ left: Math.max(0, p.x * state.zoom - 30), top: Math.max(0, p.y * state.zoom - 30) }); }
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const node = event.target.closest('[data-mongo-node]');
    const id = node?.dataset.mongoNode;
    drag = { id, x: event.clientX, y: event.clientY, scrollX: canvas.scrollLeft, scrollY: canvas.scrollTop, position: id ? { ...layout.positions[id], ...state.positions[id] } : null };
    moved = false; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    moved = true;
    if (drag.id) { state.positions[drag.id] = { x: Math.max(10, drag.position.x + dx / state.zoom), y: Math.max(10, drag.position.y + dy / state.zoom) }; renderDiagram(); }
    else canvas.scrollTo(drag.scrollX - dx, drag.scrollY - dy);
  });
  canvas.addEventListener('pointerup', () => {
    const id = drag?.id;
    drag = null;
    if (!id || moved) return;
    const now = Date.now();
    if (state.lastClick?.id === id && now - state.lastClick.time < 350) {
      state.lastClick = null;
      onOpen(graph.nodes.find((node) => node.id === id).collection.name);
      return;
    }
    state.lastClick = { id, time: now };
    state.selected = id;
    state.scroll = { left: canvas.scrollLeft, top: canvas.scrollTop };
    rerender();
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('keydown', (event) => { const id = event.target.closest('[data-mongo-node]')?.dataset.mongoNode; if (id && ['Enter', ' '].includes(event.key)) { event.preventDefault(); state.selected = id; rerender(); } });
  root.querySelector('[data-mongo-model-open]')?.addEventListener('click', (event) => onOpen(event.currentTarget.dataset.mongoModelOpen));
}
