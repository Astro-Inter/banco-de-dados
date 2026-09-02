import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampZoom,
  computeLayout,
  computeRanks,
  fitZoom,
  layoutMetrics,
  nodeHeight,
  relationshipsOf,
  zoomLimits
} from '../site/components/database-model/model-layout.js';
import {
  createModelState,
  effectivePositions,
  modelTables,
  resetModel,
  searchTables,
  visibleTables,
  zoomIn,
  zoomLabel,
  zoomOut
} from '../site/components/database-model/model-state.js';
import { columnAnchorY, columnRowIndex, renderDiagram } from '../site/components/database-model/model-renderer.js';
import { modelingView, relatedIds } from '../site/components/database-model/model-view.js';
import { relationshipPanel } from '../site/components/database-model/model-controls.js';
import { mainTablesFile, newTableTemplate } from '../site/views.js';
import { formatColumnType } from '../site/utils.js';
import { iconLibrary } from '../site/icons-library.js';
import { icon, pendingIcons } from '../site/icons.js';

function table(name, columns = [], type = 'table') {
  return { id: `${type}:${name}`, name, type, databaseType: 'table', file: `database/${type === 'log-table' ? 'logs' : 'scripts'}/${name}.sql`, columns, usedBy: [], dependencies: [] };
}

const clientes = table('clientes', [{ name: 'id', dataType: 'BIGSERIAL', primaryKey: true }, { name: 'email', dataType: 'VARCHAR(150)' }]);
const pedidos = table('pedidos', [{ name: 'id', dataType: 'BIGSERIAL', primaryKey: true }, { name: 'cliente_id', dataType: 'BIGINT', references: 'clientes', referencesColumn: 'id' }]);
const logPedidos = table('log_pedidos', [{ name: 'id', dataType: 'BIGSERIAL', primaryKey: true }, { name: 'pedido_id', dataType: 'BIGINT', references: 'pedidos', referencesColumn: 'id' }], 'log-table');
const database = { objects: [logPedidos, pedidos, clientes, { id: 'view:vw', name: 'vw', type: 'view' }], issues: [] };

test('relacionamentos saem das chaves estrangeiras já extraídas pelo Analyzer', () => {
  const relationships = relationshipsOf([clientes, pedidos, logPedidos]);
  assert.equal(relationships.length, 2);
  const [first] = relationships;
  assert.deepEqual([first.from, first.to, first.fromColumn, first.toColumn], ['table:pedidos', 'table:clientes', 'cliente_id', 'id']);
  assert.equal(relationshipsOf([clientes]).length, 0);
});

test('herança entre tabelas aparece como relacionamento distinto', () => {
  const conta = table('conta', [{ name: 'email', dataType: 'TEXT' }]);
  const usuarios = { ...table('usuarios', [{ name: 'id', dataType: 'BIGINT' }]), inherits: ['conta'] };
  const tables = [usuarios, conta];
  const [inheritance] = relationshipsOf(tables);
  const layout = computeLayout(tables);
  const state = { ...createModelState(), relatedIds: new Set() };
  const svg = renderDiagram(tables, layout, layout.positions, state);
  const panel = relationshipPanel(inheritance, new Map(tables.map((item) => [item.id, item])));

  assert.equal(inheritance.type, 'inheritance');
  assert.deepEqual([inheritance.from, inheritance.to], ['table:usuarios', 'table:conta']);
  assert.ok(layout.positions.get('table:conta').x < layout.positions.get('table:usuarios').x);
  assert.match(svg, /model-edge is-inheritance/);
  assert.match(svg, /model-inheritance-arrow/);
  assert.match(svg, /usuarios herda de conta/);
  assert.match(panel, /Relação de herança/);
  assert.match(panel, /tabela filha/);
  assert.match(panel, /tabela pai/);
});

test('layout organiza clientes → pedidos → log_pedidos da esquerda para a direita', () => {
  const tables = [logPedidos, pedidos, clientes];
  const { positions, bounds } = computeLayout(tables);
  const x = (id) => positions.get(id).x;
  assert.ok(x('table:clientes') < x('table:pedidos'));
  assert.ok(x('table:pedidos') < x('log-table:log_pedidos'));
  assert.ok(bounds.width > 0 && bounds.height > 0);
});

test('tabelas sem relação nenhuma não empilham na mesma posição', () => {
  const tables = [table('a'), table('b'), table('c')];
  const { positions } = computeLayout(tables);
  const coordinates = [...positions.values()].map((position) => `${position.x}:${position.y}`);
  assert.equal(new Set(coordinates).size, 3);
});

test('Log Table isolada vai para o final do diagrama', () => {
  const solta = table('log_auditoria', [{ name: 'id' }], 'log-table');
  const ranks = computeRanks([clientes, pedidos, solta], relationshipsOf([clientes, pedidos, solta]));
  assert.ok(ranks.get('log-table:log_auditoria') > ranks.get('table:pedidos'));
});

test('ciclo entre tabelas não trava o cálculo do layout', () => {
  const a = table('a', [{ name: 'b_id', references: 'b' }]);
  const b = table('b', [{ name: 'a_id', references: 'a' }]);
  assert.doesNotThrow(() => computeLayout([a, b]));
  assert.equal(computeLayout([a, b]).positions.size, 2);
});

test('altura do card acompanha o número de colunas, com limite', () => {
  assert.ok(nodeHeight(table('x', [{ name: 'a' }])) < nodeHeight(table('x', [{ name: 'a' }, { name: 'b' }])));
  const muitas = table('grande', Array.from({ length: 40 }, (unused, index) => ({ name: `c${index}` })));
  assert.ok(nodeHeight(muitas) <= layoutMetrics.headerHeight + layoutMetrics.maxRows * layoutMetrics.rowHeight + layoutMetrics.footerHeight + 10);
});

test('zoom respeita os limites de 40% a 200%', () => {
  const state = createModelState();
  assert.equal(zoomLabel(state.zoom), '100%');
  for (let i = 0; i < 30; i += 1) zoomIn(state);
  assert.equal(state.zoom, zoomLimits.max);
  for (let i = 0; i < 60; i += 1) zoomOut(state);
  assert.equal(state.zoom, zoomLimits.min);
  assert.equal(clampZoom(9), 2);
  assert.equal(clampZoom(0.01), 0.4);
  assert.equal(zoomLabel(0.4), '40%');
});

test('ajustar à tela calcula o zoom a partir do conteúdo, sem valor fixo', () => {
  const bounds = { width: 2000, height: 1000 };
  assert.equal(fitZoom(bounds, { width: 1000, height: 800 }), 0.5);
  assert.equal(fitZoom(bounds, { width: 400, height: 400 }), 0.4, 'nunca abaixo do limite mínimo');
  assert.equal(fitZoom({ width: 200, height: 100 }, { width: 1000, height: 800 }), 2, 'nunca acima do limite máximo');
  assert.equal(fitZoom(null, null), 1);
});

test('reset restaura zoom, seleção e o layout automático das tabelas', () => {
  const state = createModelState();
  const layout = computeLayout([clientes, pedidos]);
  state.zoom = 1.9;
  state.selectedId = 'table:clientes';
  state.manualPositions.set('table:clientes', { x: 999, y: 999 });
  assert.equal(effectivePositions(layout, state).get('table:clientes').x, 999);

  resetModel(state);
  assert.equal(state.zoom, 1);
  assert.equal(state.selectedId, null);
  assert.equal(state.manualPositions.size, 0);
  assert.equal(effectivePositions(layout, state).get('table:clientes').x, layout.positions.get('table:clientes').x);
});

test('filtro separa Tables de Log Tables e a busca localiza a tabela', () => {
  const state = createModelState();
  assert.equal(modelTables(database).length, 3, 'a view não entra na modelagem física');
  assert.equal(visibleTables(database, { ...state, filter: 'table' }).length, 2);
  assert.equal(visibleTables(database, { ...state, filter: 'log-table' }).length, 1);

  const tables = modelTables(database);
  assert.equal(searchTables(tables, 'CLIENTES')[0].name, 'clientes');
  assert.equal(searchTables(tables, 'cliente_id')[0].name, 'pedidos', 'busca também por coluna');
  assert.deepEqual(searchTables(tables, ''), []);
  assert.deepEqual(searchTables(tables, '   '), []);
  assert.deepEqual(searchTables(tables, 'inexistente'), []);
  assert.doesNotThrow(() => searchTables([{ id: 'x' }], 'a'));
});

test('busca da modelagem também considera a descrição da tabela', () => {
  const documentada = { ...table('clientes'), description: 'Armazena pessoas que compram produtos.' };
  assert.equal(searchTables([documentada], 'compram produtos').length, 1);
});

test('seleção destaca a tabela e as diretamente relacionadas', () => {
  const relationships = relationshipsOf([clientes, pedidos, logPedidos]);
  const related = relatedIds(relationships, 'table:pedidos');
  assert.deepEqual([...related].sort(), ['log-table:log_pedidos', 'table:clientes', 'table:pedidos']);
  assert.equal(relatedIds(relationships, null).size, 0);
});

test('âncora do relacionamento aponta para a linha da coluna', () => {
  assert.equal(columnRowIndex(pedidos, 'cliente_id'), 1);
  assert.equal(columnRowIndex(pedidos, 'inexistente'), 0);
  const position = { x: 0, y: 100, height: 120 };
  assert.ok(columnAnchorY(pedidos, 'cliente_id', position) > columnAnchorY(pedidos, 'id', position));
});

test('diagrama renderiza tabelas, tag LOG e relacionamentos sem emoji', () => {
  const tables = [clientes, pedidos, logPedidos];
  const layout = computeLayout(tables);
  const state = { ...createModelState(), relatedIds: new Set() };
  const svg = renderDiagram(tables, layout, layout.positions, state);
  assert.match(svg, /data-model-table="table:clientes"/);
  assert.match(svg, /data-model-edge/);
  assert.match(svg, />LOG</);
  assert.doesNotMatch(svg, /🔑|🔗/, 'ícones de PK e FK vêm dos assets do projeto');
  assert.match(svg, /Primary Key: Sim/, 'tooltip completo da coluna');
  assert.equal((svg.match(/class="model-node /g) ?? []).length, 3);
});

test('estados vazios cobrem ausência de tabelas e filtro sem resultado', () => {
  assert.match(modelingView({ objects: [], issues: [] }, createModelState()), /Nenhuma tabela encontrada/);
  const state = { ...createModelState(), filter: 'log-table' };
  assert.match(modelingView({ objects: [clientes], issues: [] }, state), /Nenhuma tabela corresponde aos filtros/);
});

test('erro de parser não esconde o diagrama', () => {
  const withIssues = { objects: [clientes, pedidos], issues: [{ severity: 'error', file: 'x.sql', message: 'falhou' }] };
  const markup = modelingView(withIssues, createModelState());
  assert.match(markup, /erro de interpretação/);
  assert.match(markup, /data-model-table="table:clientes"/);
});

test('a modelagem só depende do snapshot, nunca da API local', () => {
  const markup = modelingView(database, createModelState());
  assert.doesNotMatch(markup, /\/api\//);
  assert.match(markup, /model-toolbar/);
  assert.match(markup, /data-model-filter="log-table"/);
});

test('todos os ícones usados vêm da biblioteca do Astro', () => {
  for (const name of ['table', 'logTable', 'primaryKey', 'foreignKey', 'search', 'filter', 'minus', 'zoomIn', 'expand', 'reset', 'info', 'newTab', 'check', 'copy', 'edit', 'trash', 'play', 'refresh', 'setting']) {
    assert.notEqual(icon(name, 16), '', `ícone ausente: ${name}`);
  }
  assert.equal(icon('inexistente'), '');
  assert.ok(Object.keys(iconLibrary).length >= 40);
  // Os assets pendentes usam stand-ins do próprio projeto, nunca de terceiros.
  for (const [name, entry] of Object.entries(pendingIcons)) {
    assert.ok(entry.requested && entry.meaning, `pendência incompleta: ${name}`);
    if (entry.standIn) assert.ok(iconLibrary[entry.standIn], `stand-in fora da biblioteca: ${entry.standIn}`);
  }
});

test('tipo da coluna não duplica o tamanho já declarado no SQL', () => {
  // O parser guarda `VARCHAR(30)` em dataType E `30` em size; exibir os dois
  // produzia "VARCHAR(30)(30)" nos cards e na modelagem.
  assert.equal(formatColumnType({ dataType: 'VARCHAR(30)', size: '30' }), 'VARCHAR(30)');
  assert.equal(formatColumnType({ dataType: 'NUMERIC(12,2)', precision: '12', scale: '2' }), 'NUMERIC(12,2)');
  assert.equal(formatColumnType({ dataType: 'VARCHAR', size: '30' }), 'VARCHAR(30)');
  assert.equal(formatColumnType({ dataType: 'NUMERIC', precision: '12', scale: '2' }), 'NUMERIC(12, 2)');
  assert.equal(formatColumnType({ dataType: 'BIGSERIAL' }), 'BIGSERIAL');
  assert.equal(formatColumnType({}), '—');
  assert.equal(formatColumnType(null), '—');

  const svg = renderDiagram([pedidosComTipos], computeLayout([pedidosComTipos]), computeLayout([pedidosComTipos]).positions, { ...createModelState(), relatedIds: new Set() });
  assert.doesNotMatch(svg, /\(30\)\(30\)/);
});

const pedidosComTipos = table('pedidos_tipos', [
  { name: 'status', dataType: 'VARCHAR(30)', size: '30' },
  { name: 'valor', dataType: 'NUMERIC(12,2)', precision: '12', scale: '2' }
]);

test('novas tabelas entram no mesmo script de criação, junto dos comentários', () => {
  const database = {
    files: [
      { path: 'database/scripts/01_create_database.sql', category: 'scripts', content: 'CREATE DATABASE astro;' },
      { path: 'database/scripts/02_create_tables.sql', category: 'scripts', content: 'CREATE TABLE clientes ();' },
      { path: 'database/logs/log_clientes.sql', category: 'logs', content: 'CREATE TABLE log_clientes ();' }
    ],
    objects: [
      { id: 'table:clientes', name: 'clientes', type: 'table', file: 'database/scripts/02_create_tables.sql' },
      { id: 'table:pedidos', name: 'pedidos', type: 'table', file: 'database/scripts/02_create_tables.sql' },
      { id: 'log-table:log_clientes', name: 'log_clientes', type: 'log-table', file: 'database/logs/log_clientes.sql' }
    ]
  };
  assert.equal(mainTablesFile(database).path, 'database/scripts/02_create_tables.sql');
  assert.equal(mainTablesFile({ files: database.files, objects: [] }).path, 'database/scripts/01_create_database.sql');
  assert.equal(mainTablesFile({ files: [], objects: [] }), null);

  const template = newTableTemplate('faturas');
  assert.match(template, /CREATE TABLE public\.faturas/);
  assert.match(template, /COMMENT ON TABLE public\.faturas/);
  assert.match(template, /COMMENT ON COLUMN public\.faturas\.id/);
});

test('nenhuma biblioteca externa de ícones nem emoji no frontend', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../site/', import.meta.url));

  const walk = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === 'images' ? [] : walk(full);
      return /\.(js|html|css)$/.test(entry.name) ? [full] : [];
    }));
    return files.flat();
  };

  const forbidden = [/lucide/i, /font-?awesome/i, /material-icons/i, /bootstrap-icons/i, /heroicons/i, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u];
  for (const file of await walk(root)) {
    if (file.endsWith('icons-library.js')) continue;
    const contents = await readFile(file, 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(contents, pattern, `${file} usa ícone externo ou emoji`);
    }
  }
});

test('ícones decorativos são escondidos de leitores de tela e ações têm tooltip', () => {
  assert.match(icon('table', 16), /aria-hidden="true"/);
  assert.match(icon('table', 16, { label: 'Tabela' }), /role="img" aria-label="Tabela"/);
  assert.match(icon('zoomIn', 16, { title: 'Aumentar zoom' }), /<title>Aumentar zoom<\/title>/);
  const markup = modelingView(database, createModelState());
  for (const label of ['Aumentar zoom', 'Reduzir zoom', 'Ajustar à tela', 'Restaurar visualização']) {
    assert.match(markup, new RegExp(`aria-label="${label}"`), `sem rótulo acessível: ${label}`);
    assert.match(markup, new RegExp(`title="${label}"`), `sem tooltip: ${label}`);
  }
});
