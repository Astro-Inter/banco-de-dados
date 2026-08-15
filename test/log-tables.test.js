import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePostgreSqlFile } from '../analyzer/parser/postgresql.js';
import { tableTypeFor } from '../analyzer/parser/sqlserver.js';
import { buildDependencyGraph } from '../analyzer/dependencies/graph.js';
import { analyzeImpact } from '../analyzer/impact/analyze-impact.js';
import { impactWeights } from '../analyzer/impact/weights.js';
import { loadConfig } from '../analyzer/config.js';
import { analyzeWorkspace } from '../analyzer/index.js';
import { buildExecutionPlan } from '../server/database/execution-plan.js';
import { isLogTable, isTableLike, labels, typeIcons } from '../site/utils.js';
import { searchDatabase } from '../site/services/search.js';
import { visibleTables, createModelState } from '../site/components/database-model/model-state.js';

const logFile = {
  path: 'database/logs/log_pedidos.sql',
  category: 'logs',
  content: `CREATE TABLE public.log_pedidos (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES public.pedidos(id),
    status_anterior VARCHAR(30),
    status_novo VARCHAR(30) NOT NULL UNIQUE,
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.log_pedidos IS 'Registra todas as alterações de status realizadas nos pedidos.';`
};

test('arquivo em database/logs vira uma Log Table', () => {
  assert.equal(tableTypeFor({ category: 'logs' }), 'log-table');
  assert.equal(tableTypeFor({ category: 'scripts' }), 'table');
  const { objects } = parsePostgreSqlFile(logFile);
  assert.equal(objects[0].type, 'log-table');
  assert.equal(objects[0].id, 'log-table:log_pedidos');
});

test('Log Table continua sendo uma tabela física (databaseType = table)', () => {
  const [object] = parsePostgreSqlFile(logFile).objects;
  assert.equal(object.databaseType, 'table');
  assert.equal(isTableLike(object), true);
  assert.equal(isLogTable(object), true);
  assert.equal(isTableLike({ type: 'view' }), false);
});

test('Log Table traz colunas, PK, FK, UNIQUE, NOT NULL e DEFAULT como qualquer tabela', () => {
  const [object] = parsePostgreSqlFile(logFile).objects;
  const byName = Object.fromEntries(object.columns.map((column) => [column.name, column]));
  assert.equal(object.columns.length, 5);
  assert.equal(byName.id.primaryKey, true);
  assert.equal(byName.pedido_id.references, 'pedidos');
  assert.equal(byName.pedido_id.referencesColumn, 'id');
  assert.equal(byName.status_novo.unique, true);
  assert.equal(byName.status_novo.notNull, true);
  assert.match(byName.registrado_em.default, /CURRENT_TIMESTAMP/);
  assert.deepEqual(object.dependencies, ['pedidos']);
});

test('nome com log_ fora de database/logs NÃO vira Log Table', () => {
  const file = { path: 'database/scripts/log_importacao.sql', category: 'scripts', content: 'CREATE TABLE public.log_importacao (id INT PRIMARY KEY);' };
  const [object] = parsePostgreSqlFile(file).objects;
  assert.equal(object.type, 'table');
  assert.equal(isLogTable(object), false);

  for (const name of ['audit_clientes', 'history_pedidos', 'historico_status']) {
    const [item] = parsePostgreSqlFile({ path: `database/scripts/${name}.sql`, category: 'scripts', content: `CREATE TABLE ${name} (id INT);` }).objects;
    assert.equal(item.type, 'table', `${name} não deveria ser classificada como log`);
  }
});

test('Log Table participa do grafo de dependências e do usedBy', () => {
  const objects = [
    { id: 'table:pedidos', name: 'pedidos', type: 'table', databaseType: 'table', file: 'a.sql', dependencies: [], usedBy: [] },
    { id: 'function:fn_log', name: 'fn_registrar_log_pedido', type: 'function', file: 'b.sql', dependencies: ['pedidos', 'log_pedidos'], usedBy: [] },
    { id: 'log-table:log_pedidos', name: 'log_pedidos', type: 'log-table', databaseType: 'table', file: 'c.sql', dependencies: ['pedidos'], usedBy: [] }
  ];
  buildDependencyGraph(objects);
  assert.deepEqual(objects[0].usedBy.sort(), ['fn_registrar_log_pedido', 'log_pedidos']);
  assert.deepEqual(objects[2].usedBy, ['fn_registrar_log_pedido']);
});

test('Log Table aparece na análise de impacto de uma tabela de origem', () => {
  const objects = [
    { id: 'table:pedidos', name: 'pedidos', type: 'table', databaseType: 'table', file: 'a.sql', dependencies: [], usedBy: ['log_pedidos'], columns: [{ name: 'id', primaryKey: true }] },
    { id: 'log-table:log_pedidos', name: 'log_pedidos', type: 'log-table', databaseType: 'table', file: 'c.sql', dependencies: ['pedidos'], usedBy: [], columns: [{ name: 'pedido_id', references: 'pedidos', referencesColumn: 'id' }] }
  ];
  const result = analyzeImpact({ objects }, { object: 'pedidos', element: 'id', changeType: 'alter-type' });
  assert.equal(result.directDependencies, 1);
  assert.ok(result.affected.some((item) => item.name === 'log_pedidos'));
  assert.ok(result.files.includes('c.sql'));
  assert.equal(impactWeights['log-table'], 2);
});

test('rótulo, ícone e filtro próprios para Log Tables', () => {
  assert.equal(labels['log-table'], 'Log Tables');
  assert.equal(typeIcons['log-table'], 'logTable');
  assert.notEqual(typeIcons['log-table'], typeIcons.table);

  const database = {
    objects: [
      { id: 'table:clientes', name: 'clientes', type: 'table', databaseType: 'table', columns: [] },
      { id: 'log-table:log_clientes', name: 'log_clientes', type: 'log-table', databaseType: 'table', columns: [] }
    ]
  };
  const state = createModelState();
  assert.equal(visibleTables(database, state).length, 2);
  assert.equal(visibleTables(database, { ...state, filter: 'table' }).length, 1);
  assert.equal(visibleTables(database, { ...state, filter: 'log-table' })[0].name, 'log_clientes');
});

test('busca global encontra Log Tables junto das tabelas e views', () => {
  const database = {
    files: [],
    objects: [
      { id: 'table:pedidos', name: 'pedidos', type: 'table', databaseType: 'table', file: 'database/scripts/02.sql' },
      { id: 'log-table:log_pedidos', name: 'log_pedidos', type: 'log-table', databaseType: 'table', file: 'database/logs/log_pedidos.sql' },
      { id: 'view:vw_pedidos', name: 'vw_pedidos', type: 'view', file: 'database/views/vw.sql' }
    ]
  };
  const result = searchDatabase(database, 'pedido');
  assert.deepEqual(result.objects.map((object) => object.name).sort(), ['log_pedidos', 'pedidos', 'vw_pedidos']);
  assert.equal(searchDatabase(database, 'log-table').objects.length, 1);
});

test('Log Table entra no plano de execução depois da tabela de origem', () => {
  const database = {
    dialect: 'postgresql',
    issues: [],
    files: [
      { path: 'database/logs/log_pedidos.sql', category: 'logs', content: 'CREATE TABLE log_pedidos ();' },
      { path: 'database/scripts/02_create_tables.sql', category: 'scripts', content: 'CREATE TABLE pedidos ();' }
    ],
    objects: [
      { id: 'log-table:log_pedidos', name: 'log_pedidos', type: 'log-table', databaseType: 'table', file: 'database/logs/log_pedidos.sql', dependencies: ['pedidos'], usedBy: [] },
      { id: 'table:pedidos', name: 'pedidos', type: 'table', databaseType: 'table', file: 'database/scripts/02_create_tables.sql', dependencies: [], usedBy: ['log_pedidos'] }
    ]
  };
  const plan = buildExecutionPlan(database);
  assert.deepEqual(plan.items.map((item) => item.name), ['02_create_tables.sql', 'log_pedidos.sql']);
  assert.equal(plan.summary.byType['log-table'], 1);
});

test('snapshot do workspace registra Log Tables e a pasta configurada', async () => {
  const config = await loadConfig();
  assert.equal(config.database.paths.logs, 'database/logs');

  const database = await analyzeWorkspace({ write: false });
  const logs = database.objects.filter((object) => object.type === 'log-table');
  assert.ok(logs.length >= 2, 'esperava Log Tables no snapshot');
  assert.ok(logs.every((object) => object.databaseType === 'table'));
  assert.equal(database.counts['log-table'], logs.length);
  assert.ok(database.counts.table >= 2);
  assert.ok(logs.every((object) => object.file.startsWith('database/logs/')));
});
