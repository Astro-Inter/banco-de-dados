import { escapeHtml, icon } from '../../utils.js';
import { normalizeSearchValue } from '../../services/search.js';

export const nodeColors = { Unidade: '#156b91', Colaborador: '#167563', GrupoTreinamento: '#8050ac', Evento: '#b76027', Treinamento: '#245ec2', Certificado: '#9d4070' };
const initials = { Unidade: 'U', Colaborador: 'C', GrupoTreinamento: 'G', Evento: 'E', Treinamento: 'T', Certificado: 'CT' };
const columns = ['Unidade', 'Colaborador', 'GrupoTreinamento', 'Evento', 'Treinamento', 'Certificado'];

export function createNeo4jModelState() {
  return { view: 'schema', unit: '', label: '', query: '', selected: null, positions: {}, zoom: 1, fit: true, scroll: { left: 0, top: 0 }, traversal: false };
}

export function schemaGraph(data) {
  return {
    nodes: data.labels.map((label) => ({ id: label.name, label: label.name, properties: {}, schema: true })),
    edges: data.relationships.map((edge) => ({ id: edge.type, from: edge.from, to: edge.to, type: edge.type }))
  };
}

/** Percorre somente as relações declaradas; IDs iguais não criam vínculos. */
export function traverseTraining(graph, training = 'NR-10 Básico') {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoing = (id, type) => graph.edges.filter((edge) => edge.from === id && edge.type === type);
  const paths = [];
  for (const collaborator of graph.nodes.filter((node) => node.label === 'Colaborador')) {
    for (const participation of outgoing(collaborator.id, 'PARTICIPA')) {
      for (const eventEdge of outgoing(participation.to, 'POSSUI')) {
        for (const trainingEdge of outgoing(eventEdge.to, 'REALIZA')) {
          if (nodes.get(trainingEdge.to)?.properties.nome !== training) continue;
          paths.push({ nodes: [collaborator.id, participation.to, eventEdge.to, trainingEdge.to], edges: [participation.id, eventEdge.id, trainingEdge.id], row: {
            colaborador: collaborator.properties.nome, cargo: collaborator.properties.cargo,
            grupo: nodes.get(participation.to).properties.titulo, data_treinamento: nodes.get(eventEdge.to).properties.data_evento
          } });
        }
      }
    }
  }
  return paths;
}

export function visibleGraph(data, state) {
  const graph = state.view === 'schema' ? schemaGraph(data) : data.graph;
  let allowed = new Set(graph.nodes.map((node) => node.id));
  if (state.view === 'sample' && state.traversal) allowed = new Set(traverseTraining(graph).flatMap((entry) => entry.nodes));
  else if (state.view === 'sample' && state.unit) {
    allowed = new Set([state.unit]);
    graph.edges.filter((edge) => edge.type === 'PERTENCE' && edge.to === state.unit).forEach((edge) => allowed.add(edge.from));
    for (const type of ['PARTICIPA', 'POSSUI', 'REALIZA', 'RECEBE']) {
      graph.edges.filter((edge) => edge.type === type && allowed.has(edge.from)).forEach((edge) => allowed.add(edge.to));
    }
  }
  const nodes = graph.nodes.filter((node) => allowed.has(node.id) && (!state.label || node.label === state.label));
  const ids = new Set(nodes.map((node) => node.id));
  return { nodes, edges: graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)) };
}

export function graphLayout(graph, view) {
  const positions = {};
  if (view === 'schema') {
    const points = { Unidade: [130, 90], Colaborador: [130, 320], GrupoTreinamento: [385, 320], Evento: [640, 320], Treinamento: [895, 320], Certificado: [895, 90] };
    graph.nodes.forEach((node) => { const [x, y] = points[node.label]; positions[node.id] = { x, y }; });
    return { positions, width: 1040, height: 450 };
  }
  let maxY = 360;
  const visibleColumns = columns.filter((label) => graph.nodes.some((node) => node.label === label));
  for (const [column, label] of visibleColumns.entries()) {
    const nodes = graph.nodes.filter((node) => node.label === label);
    for (const [index, node] of nodes.entries()) {
      const y = 100 + index * 145;
      positions[node.id] = { x: 120 + column * 255, y };
      maxY = Math.max(maxY, y + 110);
    }
  }
  // Centraliza os nós de uma coluna quando há menos instâncias que na anterior.
  for (const label of visibleColumns.slice(1)) {
    for (const node of graph.nodes.filter((entry) => entry.label === label)) {
      const previous = graph.edges.filter((edge) => edge.to === node.id && positions[edge.from]?.x < positions[node.id].x).map((edge) => positions[edge.from].y);
      if (previous.length) positions[node.id].y = previous.reduce((sum, y) => sum + y, 0) / previous.length;
    }
  }
  return { positions, width: Math.max(420, visibleColumns.length * 255 + 10), height: maxY };
}

function nodeCaption(node) { return node.schema ? node.label : node.properties.nome ?? node.properties.titulo ?? node.properties.data_evento ?? node.label; }
function nodeIdCaption(node, data) { return node.schema ? initials[node.label] : node.properties[data.labels.find((entry) => entry.name === node.label).identity]; }
const shorten = (value, length = 24) => String(value).length > length ? `${String(value).slice(0, length - 1)}…` : String(value);

function diagram(data, state, graph) {
  const layout = graphLayout(graph, state.view);
  const positions = Object.fromEntries(Object.entries(layout.positions).map(([id, point]) => [id, { ...point, ...state.positions[`${state.view}:${id}`] }]));
  const width = Math.max(layout.width, ...Object.values(positions).map((point) => point.x + 130));
  const height = Math.max(layout.height, ...Object.values(positions).map((point) => point.y + 100));
  const radius = state.view === 'schema' ? 42 : 32;
  const neighbors = new Set([state.selected]);
  graph.edges.filter((edge) => edge.from === state.selected || edge.to === state.selected).forEach((edge) => { neighbors.add(edge.from); neighbors.add(edge.to); });
  const query = normalizeSearchValue(state.query);
  const matches = (node) => !query || normalizeSearchValue([node.label, ...Object.values(node.properties)].join(' ')).includes(query);
  const active = (node) => matches(node) && (!state.selected || neighbors.has(node.id));
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edges = graph.edges.map((edge) => {
    const from = positions[edge.from]; const to = positions[edge.to];
    const dx = to.x - from.x; const dy = to.y - from.y; const length = Math.max(1, Math.hypot(dx, dy));
    const x1 = from.x + dx / length * (radius + 3); const y1 = from.y + dy / length * (radius + 3);
    const x2 = to.x - dx / length * (radius + 9); const y2 = to.y - dy / length * (radius + 9);
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle > 90 || angle < -90) angle += 180;
    const dimmed = !active(nodesById.get(edge.from)) || !active(nodesById.get(edge.to));
    return `<g class="neo-edge ${dimmed ? 'dimmed' : ''}"><title>${escapeHtml(`${edge.from} — ${edge.type} → ${edge.to}`)}</title><path d="M ${x1} ${y1} L ${x2} ${y2}" marker-end="url(#neo-arrow)"/><g transform="translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) rotate(${angle})"><rect x="-${edge.type.length * 3.8 + 5}" y="-10" width="${edge.type.length * 7.6 + 10}" height="20" rx="4"/><text text-anchor="middle" dominant-baseline="central">${escapeHtml(edge.type)}</text></g></g>`;
  }).join('');
  const nodes = graph.nodes.map((node) => `<g class="neo-node ${state.selected === node.id ? 'selected' : ''} ${active(node) ? '' : 'dimmed'}" data-neo-node="${escapeHtml(node.id)}" transform="translate(${positions[node.id].x} ${positions[node.id].y})" tabindex="0" role="button" aria-pressed="${state.selected === node.id}" aria-label="${escapeHtml(`${node.label}: ${nodeCaption(node)}`)}" style="--node-color:${nodeColors[node.label]}"><title>${escapeHtml(`${node.label}\n${Object.entries(node.properties).map(([key, value]) => `${key}: ${value}`).join('\n')}`)}</title><circle r="${radius}"/><text class="neo-node-id" text-anchor="middle" dominant-baseline="central">${escapeHtml(shorten(nodeIdCaption(node, data), 10))}</text><text class="neo-node-caption" text-anchor="middle" y="${radius + 22}">${escapeHtml(shorten(nodeCaption(node)))}</text>${node.schema ? '' : `<text class="neo-node-label" text-anchor="middle" y="${radius + 39}">${escapeHtml(node.label)}</text>`}</g>`).join('');
  return `<svg class="neo-graph-svg" viewBox="0 0 ${width} ${height}" width="${width * state.zoom}" height="${height * state.zoom}" aria-label="${state.view === 'schema' ? 'Esquema dos tipos de nó Neo4j' : 'Grafo dos dados de exemplo Neo4j'}"><defs><marker id="neo-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z"/></marker></defs>${edges}${nodes}</svg>`;
}

function inspector(data, state, graph) {
  const node = graph.nodes.find((entry) => entry.id === state.selected);
  if (!node) return `<aside class="neo-inspector"><p class="eyebrow">Explorar o grafo</p><h3>Selecione um nó</h3><p>Clique em um círculo para ver ${state.view === 'schema' ? 'suas propriedades e relações' : 'os valores e as conexões dessa instância'}.</p><p>Arraste os nós para reorganizar e o fundo para navegar. Os filtros preservam apenas as ligações presentes na carga.</p></aside>`;
  const definition = data.labels.find((entry) => entry.name === node.label);
  const allGraph = state.view === 'schema' ? schemaGraph(data) : data.graph;
  const edges = allGraph.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
  return `<aside class="neo-inspector"><div class="card-head"><span class="neo-label-pill" style="--node-color:${nodeColors[node.label]}">${escapeHtml(node.label)}</span><button class="icon-button" data-neo-action="deselect" aria-label="Limpar seleção">${icon('reset', 16)}</button></div><h3>${escapeHtml(nodeCaption(node))}</h3><p>${escapeHtml(definition.description)}</p><dl class="neo-properties">${(node.schema ? definition.properties.map((property) => [property.name, property.type]) : Object.entries(node.properties)).map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><h4>Conexões (${edges.length})</h4><div class="neo-connections">${edges.map((edge) => { const otherId = edge.from === node.id ? edge.to : edge.from; const other = allGraph.nodes.find((entry) => entry.id === otherId); return `<button data-neo-related="${escapeHtml(otherId)}"><code>${escapeHtml(edge.type)}</code><span>${edge.from === node.id ? 'Saída para' : 'Entrada de'} ${escapeHtml(nodeCaption(other))}</span></button>`; }).join('') || '<p>Sem conexões declaradas.</p>'}</div><button class="button ghost" data-neo-document="${escapeHtml(node.label)}">Abrir documentação</button></aside>`;
}

export function neo4jModelView(data, state) {
  const graph = visibleGraph(data, state);
  const units = data.graph.nodes.filter((node) => node.label === 'Unidade');
  const paths = state.traversal ? traverseTraining(data.graph) : [];
  return `<section class="card neo-model"><div class="card-head"><div><h2>Modelagem de grafos</h2><p class="muted">${graph.nodes.length} ${state.view === 'schema' ? 'tipos de nó' : 'nós'} · ${graph.edges.length} ${state.view === 'schema' ? 'tipos de relacionamento' : 'relacionamentos'}${state.traversal ? ' · percurso NR-10' : ''}</p></div><div class="neo-segmented" aria-label="Visualização do grafo"><button data-neo-view="schema" aria-pressed="${state.view === 'schema'}">Esquema</button><button data-neo-view="sample" aria-pressed="${state.view === 'sample'}">Dados de exemplo</button></div></div><div class="neo-model-toolbar"><label class="search-box" for="neo-model-search">${icon('search', 16)}<input id="neo-model-search" type="search" placeholder="Localizar nó ou propriedade…" value="${escapeHtml(state.query)}"/></label><label class="neo-filter">Tipo de nó<select id="neo-label-filter"><option value="">Todos os tipos</option>${data.labels.map((label) => `<option ${state.label === label.name ? 'selected' : ''}>${escapeHtml(label.name)}</option>`).join('')}</select></label>${state.view === 'sample' ? `<label class="neo-filter">Unidade<select id="neo-unit-filter"><option value="">Todas as unidades</option>${units.map((unit) => `<option value="${escapeHtml(unit.id)}" ${state.unit === unit.id ? 'selected' : ''}>${escapeHtml(unit.properties.nome)}</option>`).join('')}</select></label>` : ''}</div><div class="neo-model-controls"><span>Arraste os nós ou o fundo</span><button class="icon-button" data-neo-action="out" aria-label="Reduzir zoom">${icon('minus', 16)}</button><output aria-label="Nível de zoom">${Math.round(state.zoom * 100)}%</output><button class="icon-button" data-neo-action="in" aria-label="Aumentar zoom">${icon('plus', 16)}</button><button class="button ghost" data-neo-action="fit">Ajustar à tela</button><button class="button ghost" data-neo-action="reset">Restaurar</button></div><div class="neo-model-layout"><div class="neo-graph-canvas" tabindex="0" aria-label="Área navegável do grafo">${graph.nodes.length ? diagram(data, state, graph) : '<div class="empty"><strong>Nenhum nó neste filtro.</strong><p>Escolha todos os tipos ou restaure a visualização.</p></div>'}</div>${inspector(data, state, graph)}</div><div class="neo-legend">${data.labels.map((label) => `<span><i style="background:${nodeColors[label.name]}"></i>${escapeHtml(label.name)}</span>`).join('')}</div></section>
    <section class="card neo-traversal"><div class="card-head"><div><p class="eyebrow">Consulta do documento</p><h2>Quem participa do NR-10 Básico?</h2><p class="muted">PARTICIPA → POSSUI → REALIZA</p></div><button class="button primary" data-neo-action="traverse">${icon('play', 16)} Simular consulta NR-10</button></div><p>A simulação percorre os relacionamentos da carga de exemplo e mostra os mesmos campos da consulta Cypher da etapa 12.</p>${state.traversal ? `<div role="status"><strong>${paths.length} participações encontradas no exemplo</strong></div>${paths.length ? `<div class="table-wrap"><table><thead><tr><th>Colaborador</th><th>Cargo</th><th>Grupo</th><th>Data do treinamento</th></tr></thead><tbody>${paths.map(({ row }) => `<tr><td>${escapeHtml(row.colaborador)}</td><td>${escapeHtml(row.cargo)}</td><td>${escapeHtml(row.grupo)}</td><td>${escapeHtml(row.data_treinamento)}</td></tr>`).join('')}</tbody></table></div>` : '<p>Nenhum caminho de participação encontrado.</p>'}<button class="button ghost" data-neo-action="clear-traversal">Voltar ao grafo completo</button>` : ''}</section>`;
}

export function mountNeo4jModel(root, data, state, rerender, onDocument) {
  const canvas = root.querySelector('.neo-graph-canvas');
  if (!canvas) return;
  let graph = visibleGraph(data, state);
  let drag = null;
  const redraw = () => { canvas.innerHTML = graph.nodes.length ? diagram(data, state, graph) : '<div class="empty"><strong>Nenhum nó neste filtro.</strong></div>'; };
  const zoom = (value) => {
    state.zoom = Math.max(0.12, Math.min(2.5, value));
    const svg = canvas.querySelector('svg');
    if (svg) { svg.setAttribute('width', svg.viewBox.baseVal.width * state.zoom); svg.setAttribute('height', svg.viewBox.baseVal.height * state.zoom); }
    root.querySelector('.neo-model-controls output').textContent = `${Math.round(state.zoom * 100)}%`;
  };
  const fit = (widthOnly = false) => { const svg = canvas.querySelector('svg'); if (svg) zoom(widthOnly ? (canvas.clientWidth - 24) / svg.viewBox.baseVal.width : Math.min((canvas.clientWidth - 24) / svg.viewBox.baseVal.width, (canvas.clientHeight - 24) / svg.viewBox.baseVal.height)); canvas.scrollTo(0, 0); };
  if (state.fit) { fit(state.fit === 'width'); state.fit = false; } else canvas.scrollTo(state.scroll.left, state.scroll.top);
  canvas.addEventListener('scroll', () => { state.scroll = { left: canvas.scrollLeft, top: canvas.scrollTop }; });
  const select = (id) => { state.selected = state.selected === id ? null : id; rerender(); };
  root.querySelectorAll('[data-neo-view]').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.neoView; state.selected = null; state.label = ''; state.unit = ''; state.traversal = false; state.fit = state.view === 'sample' ? 'width' : true; rerender(); }));
  root.querySelectorAll('[data-neo-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.neoAction;
    if (action === 'in' || action === 'out') zoom(state.zoom * (action === 'in' ? 1.25 : 0.8));
    if (action === 'fit') fit();
    if (action === 'deselect') { state.selected = null; rerender(); }
    if (action === 'reset') { Object.assign(state, createNeo4jModelState()); rerender(); }
    if (action === 'traverse' || action === 'clear-traversal') { Object.assign(state, { view: 'sample', traversal: action === 'traverse', unit: '', label: '', query: '', selected: null, fit: action === 'traverse' ? true : 'width' }); rerender(); }
  }));
  root.querySelector('#neo-model-search').addEventListener('input', (event) => { state.query = event.target.value; redraw(); });
  root.querySelectorAll('#neo-label-filter, #neo-unit-filter').forEach((select) => select.addEventListener('change', () => { state[select.id === 'neo-label-filter' ? 'label' : 'unit'] = select.value; state.traversal = false; state.selected = null; state.fit = true; rerender(); }));
  root.querySelectorAll('[data-neo-related]').forEach((button) => button.addEventListener('click', () => {
    state.selected = button.dataset.neoRelated;
    // Um vizinho fora do filtro passa a ser visível ao abrir sua conexão.
    if (!graph.nodes.some((node) => node.id === state.selected)) { state.unit = ''; state.label = ''; state.traversal = false; state.fit = true; }
    rerender();
  }));
  root.querySelector('[data-neo-document]')?.addEventListener('click', (event) => onDocument(event.currentTarget.dataset.neoDocument));
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const id = event.target.closest('[data-neo-node]')?.dataset.neoNode;
    const base = graphLayout(graph, state.view).positions[id];
    drag = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollX: canvas.scrollLeft, scrollY: canvas.scrollTop, position: id ? { ...base, ...state.positions[`${state.view}:${id}`] } : null, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true;
    if (drag.id) { state.positions[`${state.view}:${drag.id}`] = { x: Math.max(60, drag.position.x + dx / state.zoom), y: Math.max(60, drag.position.y + dy / state.zoom) }; redraw(); }
    else canvas.scrollTo(drag.scrollX - dx, drag.scrollY - dy);
  });
  canvas.addEventListener('pointerup', (event) => { const current = drag; drag = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); if (current?.id && !current.moved) select(current.id); });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('keydown', (event) => { const id = event.target.closest('[data-neo-node]')?.dataset.neoNode; if (id && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select(id); root.querySelectorAll('[data-neo-node]').forEach((node) => { if (node.dataset.neoNode === id) node.focus({ preventScroll: true }); }); } });
  canvas.addEventListener('wheel', (event) => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); zoom(state.zoom * (event.deltaY < 0 ? 1.12 : 0.88)); }, { passive: false });
}
