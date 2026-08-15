import assert from 'node:assert/strict';
import test from 'node:test';
import { basePriority, buildExecutionPlan, topologicalSort } from '../server/database/execution-plan.js';
import { defaultExecutionConfig, mergeExecutionConfig } from '../server/database/execution-config.js';
import { checksumOf, checksumStatus } from '../server/database/checksum.js';

function file(path, category, content = '-- sql') {
  return { path, category, content };
}

function object(name, type, filePath, dependencies = []) {
  return { id: `${type}:${name}`, name, type, file: filePath, dependencies, usedBy: [], code: '' };
}

const database = {
  dialect: 'postgresql',
  files: [
    file('database/indexes/idx_cliente_email.sql', 'indexes', 'CREATE INDEX idx_cliente_email ON clientes (email);'),
    file('database/scripts/02_create_tables.sql', 'scripts', 'CREATE TABLE clientes (id INT);'),
    file('database/views/vw_pedidos_cliente.sql', 'views', 'CREATE VIEW vw_pedidos_cliente AS SELECT * FROM clientes;'),
    file('database/procedures/sp_relatorio_cliente.sql', 'procedures', 'CREATE PROCEDURE sp_relatorio_cliente() ...'),
    file('database/functions/fn_total_cliente.sql', 'functions', 'CREATE FUNCTION fn_total_cliente() ...'),
    file('database/dataload/01_clientes.sql', 'dataload', 'INSERT INTO clientes VALUES (1);')
  ],
  objects: [
    object('clientes', 'table', 'database/scripts/02_create_tables.sql'),
    object('idx_cliente_email', 'index', 'database/indexes/idx_cliente_email.sql', ['clientes']),
    object('fn_total_cliente', 'function', 'database/functions/fn_total_cliente.sql', ['clientes']),
    object('vw_pedidos_cliente', 'view', 'database/views/vw_pedidos_cliente.sql', ['clientes', 'fn_total_cliente']),
    object('sp_relatorio_cliente', 'procedure', 'database/procedures/sp_relatorio_cliente.sql', ['vw_pedidos_cliente']),
    object('01_clientes', 'dataload', 'database/dataload/01_clientes.sql', ['clientes'])
  ],
  issues: []
};

test('ordena a execução por dependência, não pela ordem das pastas', () => {
  const plan = buildExecutionPlan(database);
  const order = plan.items.map((item) => item.name);
  const position = (name) => order.indexOf(name);

  assert.ok(position('02_create_tables.sql') < position('fn_total_cliente.sql'));
  assert.ok(position('fn_total_cliente.sql') < position('vw_pedidos_cliente.sql'));
  assert.ok(position('vw_pedidos_cliente.sql') < position('sp_relatorio_cliente.sql'));
  assert.ok(position('02_create_tables.sql') < position('idx_cliente_email.sql'));
  assert.equal(plan.hasCycles, false);
  assert.equal(plan.summary.total, 6);
  assert.equal(plan.summary.willExecute, 6);
});

test('usa a ordem base configurada quando não há dependência entre os arquivos', () => {
  const independent = {
    dialect: 'postgresql',
    files: [
      file('database/triggers/trg_a.sql', 'triggers'),
      file('database/scripts/01_estrutura.sql', 'scripts'),
      file('database/dataload/carga.sql', 'dataload'),
      file('database/views/vw_a.sql', 'views')
    ],
    objects: [
      object('trg_a', 'trigger', 'database/triggers/trg_a.sql'),
      object('carga', 'dataload', 'database/dataload/carga.sql'),
      object('vw_a', 'view', 'database/views/vw_a.sql')
    ],
    issues: []
  };
  const plan = buildExecutionPlan(independent);
  assert.deepEqual(plan.items.map((item) => item.name), ['01_estrutura.sql', 'carga.sql', 'vw_a.sql', 'trg_a.sql']);
});

test('prioridade base vem da configuração central', () => {
  const { baseOrder } = defaultExecutionConfig;
  assert.equal(basePriority({ category: 'scripts' }, [], baseOrder), baseOrder.structural);
  assert.equal(basePriority({ category: 'scripts' }, [{ type: 'table' }], baseOrder), baseOrder.types.table);
  assert.equal(basePriority({ category: 'triggers' }, [{ type: 'trigger' }], baseOrder), baseOrder.types.trigger);
  assert.ok(baseOrder.types.function < baseOrder.types.view);
  assert.ok(baseOrder.types.view < baseOrder.types.procedure);
});

test('detecta dependência circular e não gera ordem silenciosamente', () => {
  const circular = {
    dialect: 'postgresql',
    files: [file('database/views/view_a.sql', 'views'), file('database/functions/function_b.sql', 'functions')],
    objects: [
      object('view_a', 'view', 'database/views/view_a.sql', ['function_b']),
      object('function_b', 'function', 'database/functions/function_b.sql', ['view_a'])
    ],
    issues: []
  };
  const plan = buildExecutionPlan(circular);
  assert.equal(plan.hasCycles, true);
  assert.equal(plan.cycles.length, 1);
  assert.deepEqual(plan.cycles[0].objects.sort(), ['function_b', 'view_a']);
  assert.ok(plan.items.every((item) => item.blockedByCycle));
});

test('aponta dependências que não existem nos arquivos SQL', () => {
  const incomplete = {
    dialect: 'postgresql',
    files: [file('database/views/vw_relatorio.sql', 'views')],
    objects: [object('vw_relatorio', 'view', 'database/views/vw_relatorio.sql', ['fn_calcular_total'])],
    issues: []
  };
  const plan = buildExecutionPlan(incomplete);
  assert.equal(plan.missingDependencies.length, 1);
  assert.deepEqual(plan.missingDependencies[0].missing, ['fn_calcular_total']);
  assert.equal(plan.missingDependencies[0].object, 'vw_relatorio');
});

test('classifica scripts já executados, modificados e nunca executados', () => {
  const content = database.files[1].content;
  const history = [{ file_path: 'database/scripts/02_create_tables.sql', checksum: checksumOf(content), status: 'success', executed_at: '2026-08-13T11:20:00.000Z' }];
  const plan = buildExecutionPlan(database, { config: defaultExecutionConfig, history });
  const item = plan.items.find((entry) => entry.path === 'database/scripts/02_create_tables.sql');
  assert.equal(item.status, 'already-executed');
  assert.equal(item.willExecute, false);

  const changed = [{ ...history[0], checksum: 'outro-checksum' }];
  const modifiedPlan = buildExecutionPlan(database, { config: defaultExecutionConfig, history: changed });
  const modified = modifiedPlan.items.find((entry) => entry.path === 'database/scripts/02_create_tables.sql');
  assert.equal(modified.status, 'modified');
  assert.equal(modified.willExecute, false, 'um script modificado nunca é reexecutado silenciosamente');

  const rerun = buildExecutionPlan(database, {
    config: defaultExecutionConfig,
    history: changed,
    decisions: { 'database/scripts/02_create_tables.sql': 'rerun' }
  });
  assert.equal(rerun.items.find((entry) => entry.path === 'database/scripts/02_create_tables.sql').willExecute, true);

  const skipped = buildExecutionPlan(database, {
    config: defaultExecutionConfig,
    history: changed,
    decisions: { 'database/scripts/02_create_tables.sql': 'skip' }
  });
  assert.equal(skipped.items.find((entry) => entry.path === 'database/scripts/02_create_tables.sql').status, 'skipped');
});

test('data load com o mesmo checksum não é executado novamente', () => {
  const dataload = database.files.find((entry) => entry.category === 'dataload');
  const history = [{ file_path: dataload.path, checksum: checksumOf(dataload.content), status: 'success', executed_at: '2026-08-13T11:20:00.000Z' }];
  const plan = buildExecutionPlan(database, { config: defaultExecutionConfig, history });
  const item = plan.items.find((entry) => entry.path === dataload.path);
  assert.equal(item.status, 'already-executed');
  assert.equal(item.willExecute, false);
});

test('CREATE DATABASE é marcado como execução administrativa e não é executado', () => {
  const withCreateDatabase = {
    dialect: 'postgresql',
    files: [file('database/scripts/01_create_database.sql', 'scripts', 'CREATE DATABASE astro;')],
    objects: [],
    issues: []
  };
  const plan = buildExecutionPlan(withCreateDatabase);
  assert.equal(plan.items[0].status, 'admin-required');
  assert.equal(plan.items[0].willExecute, false);
  assert.equal(plan.summary.adminRequired, 1);
});

test('arquivo vazio é ignorado sem quebrar o plano', () => {
  const plan = buildExecutionPlan({ dialect: 'postgresql', files: [file('database/scripts/vazio.sql', 'scripts', '   ')], objects: [], issues: [] });
  assert.equal(plan.items[0].status, 'empty');
  assert.equal(plan.items[0].willExecute, false);
});

test('ordenação topológica é determinística e reporta bloqueios', () => {
  const items = [
    { path: 'b.sql', basePriority: 5 },
    { path: 'a.sql', basePriority: 5 },
    { path: 'c.sql', basePriority: 1 }
  ];
  // c depende de a; assim que a sai, c ganha a vez por ter a menor prioridade base.
  const { ordered, blocked } = topologicalSort(items, new Map([['c.sql', ['a.sql']]]));
  assert.deepEqual(ordered.map((item) => item.path), ['a.sql', 'c.sql', 'b.sql']);
  assert.equal(blocked.length, 0);

  const cyclic = topologicalSort(
    [{ path: 'x.sql', basePriority: 1 }, { path: 'y.sql', basePriority: 1 }],
    new Map([['x.sql', ['y.sql']], ['y.sql', ['x.sql']]])
  );
  assert.equal(cyclic.ordered.length, 0);
  assert.equal(cyclic.blocked.length, 2);
  assert.equal(cyclic.cycles.length, 1);
});

test('checksum é estável entre CRLF e LF e detecta alteração real', () => {
  assert.equal(checksumOf('SELECT 1;\r\nSELECT 2;'), checksumOf('SELECT 1;\nSELECT 2;'));
  assert.notEqual(checksumOf('SELECT 1;'), checksumOf('SELECT 2;'));
  assert.equal(checksumOf('SELECT 1;').length, 64);
  assert.equal(checksumStatus('abc', null), 'never-executed');
  assert.equal(checksumStatus('abc', { checksum: 'abc' }), 'already-executed');
  assert.equal(checksumStatus('abc', { checksum: 'xyz' }), 'modified');
});

test('a configuração de execução ignora credenciais e valores inválidos', () => {
  const config = mergeExecutionConfig({
    password: 'segredo', user: 'postgres', host: 'localhost',
    transactionMode: 'inexistente', connectionTimeout: -5, historyTable: 'tabela; DROP TABLE x'
  });
  assert.equal(config.transactionMode, 'per-script');
  assert.equal(config.connectionTimeout, defaultExecutionConfig.connectionTimeout);
  assert.equal(config.historyTable, '_astroworkspace_migrations');
  assert.deepEqual(config.ignoredKeys.sort(), ['host', 'password', 'user']);
  assert.equal('password' in config, false);
});
