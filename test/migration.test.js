import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExecutionPlan } from '../server/database/execution-plan.js';
import { createRun, executeRun, serializeRun } from '../server/database/migration-service.js';
import { validateMigration } from '../server/database/validation-service.js';
import { sanitizeConnection, sanitizeMessage, sanitizePayload } from '../server/database/log-sanitizer.js';
import { MigrationHistory } from '../server/database/migration-history.js';
import { createAdapter, supportedDatabases } from '../server/database/adapters/index.js';
import { normalizeConnectionInput } from '../server/database/connection-service.js';
import { approximateLine } from '../server/database/adapters/base-adapter.js';
import { readSqlFile, writeSqlFile } from '../server/services/file-service.js';

/** Adapter falso: os testes do runner não precisam de um PostgreSQL real. */
function fakeAdapter({ failOn = null } = {}) {
  const calls = [];
  return {
    calls,
    async beginTransaction() { calls.push('BEGIN'); },
    async commit() { calls.push('COMMIT'); },
    async rollback() { calls.push('ROLLBACK'); },
    async execute(sql) {
      calls.push(`EXECUTE:${sql.trim().slice(0, 20)}`);
      if (failOn && sql.includes(failOn)) {
        const error = new Error('column "cliente_nome" does not exist');
        error.execution = { message: 'column "cliente_nome" does not exist', code: '42703', position: 15, line: 1 };
        throw error;
      }
      return { rowCount: 1 };
    }
  };
}

const contents = {
  'database/scripts/02_create_tables.sql': 'CREATE TABLE clientes (id INT);',
  'database/functions/fn_total_cliente.sql': 'CREATE FUNCTION fn_total_cliente() ...;',
  'database/views/vw_pedidos_cliente.sql': 'CREATE VIEW vw_pedidos_cliente AS SELECT cliente_nome FROM clientes;',
  'database/procedures/sp_relatorio_cliente.sql': 'CREATE PROCEDURE sp_relatorio_cliente() ...;'
};

function fakeDatabase() {
  return {
    dialect: 'postgresql',
    issues: [],
    files: Object.entries(contents).map(([path, content]) => ({
      path, content, category: path.split('/')[1]
    })),
    objects: [
      { id: 'table:clientes', name: 'clientes', type: 'table', file: 'database/scripts/02_create_tables.sql', dependencies: [], usedBy: [] },
      { id: 'function:fn_total_cliente', name: 'fn_total_cliente', type: 'function', file: 'database/functions/fn_total_cliente.sql', dependencies: ['clientes'], usedBy: [] },
      { id: 'view:vw_pedidos_cliente', name: 'vw_pedidos_cliente', type: 'view', file: 'database/views/vw_pedidos_cliente.sql', dependencies: ['clientes', 'fn_total_cliente'], usedBy: [] },
      { id: 'procedure:sp_relatorio_cliente', name: 'sp_relatorio_cliente', type: 'procedure', file: 'database/procedures/sp_relatorio_cliente.sql', dependencies: ['vw_pedidos_cliente'], usedBy: [] }
    ]
  };
}

function fakeSession(adapter) {
  return {
    adapter,
    connection: { password: 'senha-super-secreta', host: 'localhost', user: 'postgres' },
    info: { version: 'PostgreSQL 16.2' },
    history: { recorded: [], async record(entry) { this.recorded.push(entry); } }
  };
}

const readFile = async (path) => {
  if (!(path in contents)) throw new Error('Caminho fora das pastas autorizadas.');
  return contents[path];
};

test('executa os scripts na ordem do plano e envia o arquivo inteiro ao driver', async () => {
  const plan = buildExecutionPlan(fakeDatabase());
  const adapter = fakeAdapter();
  const session = fakeSession(adapter);
  const run = createRun(plan, { sessionId: 'x', transactionMode: 'per-script', stopOnError: true });
  await executeRun(run, { plan, session, readFile });

  const executed = run.items.filter((item) => item.status === 'success').map((item) => item.name);
  assert.deepEqual(executed, ['02_create_tables.sql', 'fn_total_cliente.sql', 'vw_pedidos_cliente.sql', 'sp_relatorio_cliente.sql']);
  assert.equal(run.state, 'finished');
  assert.equal(adapter.calls.filter((call) => call === 'BEGIN').length, 4, 'uma transação por script');
  assert.equal(adapter.calls.filter((call) => call === 'COMMIT').length, 4);
  assert.equal(session.history.recorded.length, 4);
  assert.equal(session.history.recorded[0].status, 'success');
});

test('stopOnError interrompe a execução e marca os seguintes como não executado', async () => {
  const plan = buildExecutionPlan(fakeDatabase());
  const adapter = fakeAdapter({ failOn: 'cliente_nome' });
  const session = fakeSession(adapter);
  const run = createRun(plan, { sessionId: 'x', transactionMode: 'per-script', stopOnError: true });
  await executeRun(run, { plan, session, readFile });

  const byName = Object.fromEntries(run.items.map((item) => [item.name, item]));
  assert.equal(byName['02_create_tables.sql'].status, 'success');
  assert.equal(byName['fn_total_cliente.sql'].status, 'success');
  assert.equal(byName['vw_pedidos_cliente.sql'].status, 'error');
  assert.equal(byName['sp_relatorio_cliente.sql'].status, 'not-executed');
  assert.equal(byName['sp_relatorio_cliente.sql'].statusLabel, 'Não executado');
  assert.equal(run.state, 'failed');
  assert.equal(byName['vw_pedidos_cliente.sql'].error.code, '42703');
  assert.match(byName['vw_pedidos_cliente.sql'].error.message, /cliente_nome/);
  assert.ok(adapter.calls.includes('ROLLBACK'), 'o script que falhou sofre rollback');

  const summary = serializeRun(run).summary;
  assert.deepEqual([summary.executed, summary.errors, summary.notExecuted], [2, 1, 1]);
});

test('stopOnError desligado continua executando os scripts seguintes', async () => {
  const plan = buildExecutionPlan(fakeDatabase());
  const session = fakeSession(fakeAdapter({ failOn: 'cliente_nome' }));
  const run = createRun(plan, { sessionId: 'x', transactionMode: 'per-script', stopOnError: false });
  await executeRun(run, { plan, session, readFile });
  assert.equal(run.items.find((item) => item.name === 'sp_relatorio_cliente.sql').status, 'success');
});

test('script alterado depois do plano não é executado', async () => {
  const plan = buildExecutionPlan(fakeDatabase());
  const session = fakeSession(fakeAdapter());
  const run = createRun(plan, { sessionId: 'x', transactionMode: 'per-script', stopOnError: true });
  await executeRun(run, {
    plan,
    session,
    readFile: async (path) => `${contents[path]}\n-- editado depois do plano`
  });
  const first = run.items[0];
  assert.equal(first.status, 'error');
  assert.match(first.error.message, /plano foi gerado/);
});

test('validação aprova o cenário completo e explica cada verificação', () => {
  const database = fakeDatabase();
  const plan = buildExecutionPlan(database);
  const validation = validateMigration({
    plan,
    database,
    connection: { type: 'postgresql', host: 'localhost', port: 5432, database: 'astro', user: 'postgres' }
  });
  assert.equal(validation.canExecute, true);
  assert.equal(validation.errors.length, 0);
  assert.ok(validation.checks.some((check) => check.id === 'connection' && check.status === 'ok'));
  assert.ok(validation.checks.some((check) => check.id === 'dialect' && check.status === 'ok'));
  assert.ok(validation.checks.some((check) => check.id === 'order' && check.status === 'ok'));
});

test('validação bloqueia sem conexão, com ciclo e com dialeto incompatível', () => {
  const database = fakeDatabase();
  const plan = buildExecutionPlan(database);
  assert.equal(validateMigration({ plan, database, connection: null }).canExecute, false);

  const incompatible = validateMigration({ plan, database, connection: { type: 'mysql', host: 'h', port: 1, database: 'd', user: 'u' } });
  assert.equal(incompatible.canExecute, false);
  assert.ok(incompatible.errors.some((check) => check.id === 'dialect'));

  const circular = {
    dialect: 'postgresql', issues: [],
    files: [{ path: 'database/views/a.sql', category: 'views', content: 'x' }, { path: 'database/functions/b.sql', category: 'functions', content: 'y' }],
    objects: [
      { id: 'view:a', name: 'a', type: 'view', file: 'database/views/a.sql', dependencies: ['b'], usedBy: [] },
      { id: 'function:b', name: 'b', type: 'function', file: 'database/functions/b.sql', dependencies: ['a'], usedBy: [] }
    ]
  };
  const cyclic = validateMigration({ plan: buildExecutionPlan(circular), database: circular, connection: { type: 'postgresql', host: 'h', port: 1, database: 'd', user: 'u' } });
  assert.equal(cyclic.canExecute, false);
  assert.ok(cyclic.errors.some((check) => check.id === 'cycles'));
});

test('operação destrutiva exige confirmação explícita na validação', () => {
  const database = {
    dialect: 'postgresql', issues: [],
    files: [{ path: 'database/scripts/remove_clientes.sql', category: 'scripts', content: 'DROP TABLE clientes;' }],
    objects: []
  };
  const validation = validateMigration({
    plan: buildExecutionPlan(database),
    database,
    connection: { type: 'postgresql', host: 'h', port: 1, database: 'd', user: 'u' }
  });
  assert.equal(validation.requiresConfirmation, true);
  assert.equal(validation.destructive[0].operation, 'DROP TABLE');
});

test('sanitização impede que a senha apareça em mensagens, payloads ou logs', () => {
  const password = 'senha-super-secreta';
  assert.equal(sanitizeMessage(`falha ao conectar com ${password}`, [password]), 'falha ao conectar com ***');
  assert.equal(sanitizeMessage('postgres://postgres:minhasenha@localhost:5432/astro'), 'postgres://postgres:***@localhost:5432/astro');
  assert.equal(sanitizeMessage('password=minhasenha host=localhost'), 'password=*** host=localhost');
  assert.equal('password' in sanitizeConnection({ host: 'localhost', password }), false);
  const payload = sanitizePayload({ connection: { user: 'postgres', password }, message: `erro com ${password}` }, [password]);
  assert.equal(payload.connection.password, undefined);
  assert.equal(payload.connection.user, 'postgres');
  assert.match(payload.message, /\*\*\*/);
});

test('bloqueia caminhos e extensões inválidas antes de qualquer execução', async () => {
  await assert.rejects(() => readSqlFile('../../segredo.sql'), /pastas autorizadas/);
  await assert.rejects(() => readSqlFile('C:/Windows/System32/config.sql'), /pastas autorizadas/);
  await assert.rejects(() => readSqlFile('database/scripts/../../../etc/passwd.sql'), /pastas autorizadas/);
  await assert.rejects(() => readSqlFile('database/scripts/02_create_tables.txt'), /Apenas arquivos \.sql/);
  await assert.rejects(() => readSqlFile(null), /Apenas arquivos \.sql/);
  await assert.rejects(() => writeSqlFile('../fora.sql', 'SELECT 1;'), /pastas autorizadas/);
});

test('conexão é normalizada e recusa dados incompletos', () => {
  const connection = normalizeConnectionInput({ type: 'postgresql', host: ' localhost ', port: '5432', database: 'astro', user: 'postgres', password: 'x', ssl: 'sim' });
  assert.deepEqual(connection, { type: 'postgresql', host: 'localhost', port: 5432, database: 'astro', user: 'postgres', password: 'x', ssl: true });
  assert.throws(() => normalizeConnectionInput({ type: 'postgresql', host: 'localhost', port: 99999, database: 'a', user: 'b' }), /Porta inválida/);
  assert.throws(() => normalizeConnectionInput({ type: 'postgresql', host: 'localhost', port: 5432, database: '', user: 'b' }), /Informe o database/);
});

test('adapters: PostgreSQL disponível, SQL Server e MySQL previstos', () => {
  const adapter = createAdapter({ type: 'postgresql', host: 'localhost', port: 5432, database: 'astro', user: 'postgres', password: 'x' });
  assert.equal(adapter.describe().type, 'postgresql');
  assert.equal('password' in adapter.describe(), false);
  assert.throws(() => createAdapter({ type: 'sqlserver' }), /SQL Server ainda não é suportado/);
  assert.throws(() => createAdapter({ type: 'mysql' }), /MySQL ainda não é suportado/);
  assert.throws(() => createAdapter({ type: 'oracle' }), /não suportado/);
  assert.deepEqual(supportedDatabases().filter((item) => item.available).map((item) => item.type), ['postgresql']);
});

test('histórico usa a tabela interna e recusa nomes inválidos', () => {
  const adapter = createAdapter({ type: 'postgresql', host: 'h', port: 1, database: 'd', user: 'u', password: '' });
  const history = new MigrationHistory(adapter, '_astroworkspace_migrations');
  const statements = adapter.migrationHistoryStatements('_astroworkspace_migrations');
  assert.match(statements.create, /CREATE TABLE IF NOT EXISTS _astroworkspace_migrations/);
  for (const column of ['file_path', 'file_name', 'checksum', 'executed_at', 'duration_ms', 'status', 'error_message', 'database_version']) {
    assert.match(statements.create, new RegExp(column));
  }
  assert.equal(history.table, '_astroworkspace_migrations');
  assert.throws(() => new MigrationHistory(adapter, 'tabela; DROP TABLE clientes'), /Nome inválido/);
});

test('linha aproximada é calculada a partir da posição informada pelo driver', () => {
  const sql = 'SELECT 1;\nSELECT 2;\nSELECT cliente_nome;';
  assert.equal(approximateLine(sql, 1), 1);
  assert.equal(approximateLine(sql, 12), 2);
  assert.equal(approximateLine(sql, 25), 3);
  assert.equal(approximateLine(sql, null), null);
});
