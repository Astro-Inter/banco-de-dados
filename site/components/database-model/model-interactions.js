import { escapeHtml, icon, isLogTable } from '../../utils.js';
import { computeLayout, clampZoom, fitZoom, layoutMetrics, zoomLimits } from './model-layout.js';
import { effectivePositions, modelTables, resetModel, searchTables, visibleTables, zoomLabel } from './model-state.js';
import { relationshipPanel, tableContextPanel } from './model-controls.js';
import { renderDiagram } from './model-renderer.js';
import { relatedIds } from './model-view.js';

/**
 * Interações do canvas: pan, zoom, arraste de tabelas, seleção, busca e foco.
 *
 * Trabalha por atualização pontual do DOM — zoom, seleção e arraste NUNCA
 * disparam nova análise nem recalculam o layout inteiro. Só filtro e arraste
 * concluído pedem uma nova renderização do diagrama.
 */
export function mountModel(root, context) {
  const canvas = root.querySelector('#model-canvas');
  if (!canvas) return;

  /**
   * Cada renderização recria o markup, mas `root` e `document` continuam os
   * mesmos: sem desfazer os listeners anteriores, um clique passaria a ser
   * processado uma vez por render — o que fazia o botão Expandir alternar duas
   * vezes e parecer travado.
   */
  root.modelListeners?.forEach(([target, type, handler, options]) => target.removeEventListener(type, handler, options));
  const listeners = [];
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push([target, type, handler, options]);
  };
  root.modelListeners = listeners;

  const { database, state } = context;
  const layoutOf = () => {
    const tables = visibleTables(database, state);
    return { tables, layout: computeLayout(tables) };
  };

  const svg = () => canvas.querySelector('#model-svg');

  const applyZoom = () => {
    const element = svg();
    if (!element) return;
    const box = element.viewBox.baseVal;
    element.style.width = `${Math.round(box.width * state.zoom)}px`;
    element.style.height = `${Math.round(box.height * state.zoom)}px`;
    const output = root.querySelector('#model-zoom-value');
    if (output) output.textContent = zoomLabel(state.zoom);
  };

  const redraw = () => {
    const { tables, layout } = layoutOf();
    state.relatedIds = relatedIds(layout.relationships, state.selectedId);
    const element = svg();
    if (!element || !tables.length) return context.rerender();
    element.outerHTML = renderDiagram(tables, layout, effectivePositions(layout, state), state);
    applyZoom();
  };

  const updatePanel = () => {
    const { tables, layout } = layoutOf();
    const byId = new Map(tables.map((table) => [table.id, table]));
    const relationship = state.selectedEdgeId ? layout.relationships.find((item) => item.id === state.selectedEdgeId) : null;
    const markup = relationship
      ? relationshipPanel(relationship, byId)
      : state.selectedId ? tableContextPanel(byId.get(state.selectedId), database) : '';
    const existing = root.querySelector('#model-panel');
    if (existing) existing.remove();
    if (markup) root.querySelector('.model-stage')?.insertAdjacentHTML('beforeend', markup);
  };

  const select = (id, { edge = null } = {}) => {
    state.selectedId = id;
    state.selectedEdgeId = edge;
    if (state.focusedId && state.focusedId !== id) {
      canvas.querySelector('.model-node.is-focused')?.classList.remove('is-focused');
      state.focusedId = null;
    }
    state.relatedIds = relatedIds(layoutOf().layout.relationships, id);
    for (const node of canvas.querySelectorAll('.model-node')) {
      const nodeId = node.dataset.modelTable;
      node.classList.toggle('is-selected', nodeId === id);
      node.classList.toggle('is-dimmed', Boolean(id) && !state.relatedIds.has(nodeId));
    }
    for (const item of canvas.querySelectorAll('.model-edge')) {
      const active = Boolean(id) && (item.dataset.from === id || item.dataset.to === id);
      item.classList.toggle('is-active', active || item.dataset.modelEdge === edge);
      item.classList.toggle('is-dimmed', Boolean(id) && !active);
    }
    updatePanel();
  };

  const nodePosition = (node) => {
    const [, x = 0, y = 0] = node.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/) ?? [];
    return { x: Number(x), y: Number(y) };
  };

  /** Centraliza a tabela no canvas e destaca temporariamente o card. */
  const focusTable = (id) => {
    const node = canvas.querySelector(`.model-node[data-model-table="${CSS.escape(id)}"]`);
    if (!node) return;
    const { x, y } = nodePosition(node);
    const height = Number(node.querySelector('.model-node-bg')?.getAttribute('height') ?? 120);
    canvas.scrollTo({
      left: Math.max(0, x * state.zoom - (canvas.clientWidth - layoutMetrics.nodeWidth * state.zoom) / 2),
      top: Math.max(0, y * state.zoom - (canvas.clientHeight - height * state.zoom) / 2),
      behavior: 'smooth'
    });
    for (const other of canvas.querySelectorAll('.model-node.is-focused')) other.classList.remove('is-focused');
    node.classList.add('is-focused');
    state.focusedId = id;
    select(id);
  };

  /** Ajusta o zoom ao conteúdo real e centraliza o diagrama no canvas. */
  const fit = () => {
    const { layout } = layoutOf();
    state.zoom = fitZoom(layout.bounds, { width: canvas.clientWidth - 32, height: canvas.clientHeight - 32 });
    applyZoom();
    canvas.scrollTo({
      left: Math.max(0, (layout.bounds.width * state.zoom - canvas.clientWidth) / 2),
      top: Math.max(0, (layout.bounds.height * state.zoom - canvas.clientHeight) / 2),
      behavior: 'smooth'
    });
  };

  const zoomBy = (direction, anchor = null) => {
    const previous = state.zoom;
    state.zoom = clampZoom(state.zoom + direction * zoomLimits.step);
    if (state.zoom === previous) return;
    const ratio = state.zoom / previous;
    applyZoom();
    if (anchor) {
      canvas.scrollLeft = (canvas.scrollLeft + anchor.x) * ratio - anchor.x;
      canvas.scrollTop = (canvas.scrollTop + anchor.y) * ratio - anchor.y;
    }
  };

  /**
   * Área ampliada: o card ocupa a tela e o canvas recebe todo o espaço que
   * sobra. Sair da modelagem ou pressionar Esc sempre devolve o modo normal.
   */
  const setExpanded = (expanded) => {
    state.expanded = expanded;
    context.rerender();
  };

  on(document, 'keydown', (event) => {
    if (event.key !== 'Escape' || !state.expanded) return;
    if (document.querySelector('#modal')?.open) return; // o modal fecha primeiro
    setExpanded(false);
  });

  // ----- pan do canvas e arraste das tabelas -----------------------------
  let panning = null;
  let dragging = null;
  let suppressClick = false;

  on(canvas, 'pointerdown', (event) => {
    const node = event.target.closest?.('.model-node');
    if (node) {
      const origin = nodePosition(node);
      dragging = { node, id: node.dataset.modelTable, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, moved: false };
      return;
    }
    if (event.target.closest?.('.model-edge')) return;
    panning = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, left: canvas.scrollLeft, top: canvas.scrollTop };
  });

  /**
   * A captura de ponteiro só começa quando o arraste realmente acontece: capturar
   * já no pointerdown redirecionaria o `click` para o canvas e a tabela nunca
   * seria selecionada.
   */
  const startCapture = (pointerId) => canvas.setPointerCapture?.(pointerId);

  on(canvas, 'pointermove', (event) => {
    if (dragging) {
      const dx = (event.clientX - dragging.startX) / state.zoom;
      const dy = (event.clientY - dragging.startY) / state.zoom;
      if (!dragging.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        dragging.moved = true;
        dragging.node.classList.add('is-dragging');
        startCapture(dragging.pointerId);
      }
      if (!dragging.moved) return;
      dragging.node.setAttribute('transform', `translate(${dragging.originX + dx} ${dragging.originY + dy})`);
      return;
    }
    if (!panning) return;
    if (!panning.moved && (Math.abs(event.clientX - panning.x) > 2 || Math.abs(event.clientY - panning.y) > 2)) {
      panning.moved = true;
      canvas.classList.add('is-panning');
      startCapture(panning.pointerId);
    }
    if (!panning.moved) return;
    canvas.scrollLeft = panning.left - (event.clientX - panning.x);
    canvas.scrollTop = panning.top - (event.clientY - panning.y);
  });

  const endPointer = () => {
    if (dragging) {
      dragging.node.classList.remove('is-dragging');
      if (dragging.moved) {
        const position = nodePosition(dragging.node);
        state.manualPositions.set(dragging.id, position);
        suppressClick = true;
        redraw();
      }
      dragging = null;
    }
    // Arrastar o fundo não pode ser interpretado como clique de desseleção.
    if (panning?.moved) suppressClick = true;
    panning = null;
    canvas.classList.remove('is-panning');
  };
  on(canvas, 'pointerup', endPointer);
  on(canvas, 'pointercancel', endPointer);

  on(canvas, 'wheel', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomBy(event.deltaY < 0 ? 1 : -1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, { passive: false });

  // ----- seleção e abertura ---------------------------------------------
  on(canvas, 'click', (event) => {
    if (suppressClick) { suppressClick = false; return; }
    const edge = event.target.closest?.('.model-edge');
    if (edge) return select(edge.dataset.from, { edge: edge.dataset.modelEdge });
    const node = event.target.closest?.('.model-node');
    if (node) {
      // Clicar de novo na tabela selecionada desfaz a seleção.
      return select(state.selectedId === node.dataset.modelTable && !state.selectedEdgeId ? null : node.dataset.modelTable);
    }
    select(null);
  });

  on(canvas, 'keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const node = event.target.closest?.('.model-node');
    if (!node) return;
    event.preventDefault();
    select(node.dataset.modelTable);
  });

  // ----- toolbar ---------------------------------------------------------
  on(root, 'click', (event) => {
    const action = event.target.closest?.('[data-model-action]')?.dataset.modelAction;
    if (action === 'zoom-in') zoomBy(1);
    if (action === 'zoom-out') zoomBy(-1);
    if (action === 'fit') fit();
    if (action === 'reset') { resetModel(state); context.rerender(); }
    if (action === 'toggle-expanded') setExpanded(!state.expanded);
    if (action === 'close-panel') select(null);

    const filter = event.target.closest?.('[data-model-filter]')?.dataset.modelFilter;
    if (filter) { state.filter = filter; state.selectedId = null; state.selectedEdgeId = null; context.rerender(); }

    const focus = event.target.closest?.('[data-model-focus]')?.dataset.modelFocus;
    if (focus) focusTable(focus);

    const open = event.target.closest?.('[data-model-open]')?.dataset.modelOpen;
    if (open) context.onOpenTable?.(open);
  });

  on(root, 'input', (event) => {
    if (event.target.id !== 'model-search') return;
    state.query = event.target.value;
    const container = root.querySelector('.model-search-results');
    const tables = modelTables(database);
    const results = searchTables(tables, state.query);
    if (container) container.remove();
    if (!state.query) return;
    const markup = results.length
      ? `<ul class="model-search-results" role="listbox">${results.slice(0, 8).map((table) => `<li><button data-model-focus="${escapeHtml(table.id)}" role="option">${icon(isLogTable(table) ? 'logTable' : 'table', 15)}<span>${escapeHtml(table.name)}</span><small>${(table.columns ?? []).length} colunas</small></button></li>`).join('')}</ul>`
      : '<ul class="model-search-results"><li class="model-search-empty">Nenhuma tabela corresponde à busca.</li></ul>';
    root.querySelector('.model-search')?.insertAdjacentHTML('beforeend', markup);
  });

  // A lista de sugestões também é um popup: clicar fora ou Esc fecha.
  const closeSearchResults = () => root.querySelector('.model-search-results')?.remove();
  on(document, 'mousedown', (event) => {
    if (!event.target.closest?.('.model-search')) closeSearchResults();
  });

  on(root, 'keydown', (event) => {
    if (event.target.id !== 'model-search') return;
    if (event.key === 'Escape') return closeSearchResults();
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const first = searchTables(modelTables(database), state.query)[0];
    if (first) focusTable(first.id);
  });

  applyZoom();
}
