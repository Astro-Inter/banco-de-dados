import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDependencyGraph, findPath, traversal } from '../analyzer/dependencies/graph.js';
import { analyzeImpact } from '../analyzer/impact/analyze-impact.js';
import {
  applyAlterTableColumnChanges,
  applyAlterTableConstraints,
  materializeTableInheritance,
  parseSqlServerFile
} from '../analyzer/parser/sqlserver.js';
import { parsePostgreSqlFile } from '../analyzer/parser/postgresql.js';
import { readSqlFile } from '../server/services/file-service.js';
import { relationshipsOf } from '../site/components/database-model/model-layout.js';
import { dependencyGraphLayout } from '../site/views.js';

test('interpreta tabela SQL Server com chaves e colunas', () => {
  const file = { path: 'database/scripts/tables.sql', category: 'scripts', content: `CREATE TABLE dbo.clientes (id INT NOT NULL PRIMARY KEY, nome VARCHAR(100) NOT NULL, grupo_id INT NULL REFERENCES dbo.grupos(id));` };
  const { objects, issues } = parseSqlServerFile(file);
  assert.equal(issues.length, 0);
  assert.equal(objects[0].name, 'clientes');
  assert.equal(objects[0].columns.length, 3);
  assert.equal(objects[0].columns[0].primaryKey, true);
  assert.equal(objects[0].columns[2].references, 'grupos');
});

test('interpreta objetos e sintaxe PostgreSQL', () => {
  const table = parsePostgreSqlFile({ path: 'database/scripts/tables.sql', category: 'scripts', content: `CREATE TABLE IF NOT EXISTS public.clientes (id BIGSERIAL PRIMARY KEY, nome CHARACTER VARYING(100) NOT NULL, criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);` });
  assert.equal(table.objects[0].name, 'clientes');
  assert.equal(table.objects[0].columns[1].dataType, 'CHARACTERVARYING(100)');
  const fn = parsePostgreSqlFile({ path: 'database/functions/fn.sql', category: 'functions', content: `CREATE OR REPLACE FUNCTION public.fn_cliente(p_id BIGINT) RETURNS NUMERIC(12, 2) LANGUAGE sql AS $$ SELECT valor FROM public.pedidos WHERE cliente_id = p_id; $$;` });
  assert.equal(fn.objects[0].parameters[0].name, 'p_id');
  assert.equal(fn.objects[0].returnType, 'NUMERIC(12, 2)');
  assert.deepEqual(fn.objects[0].dependencies, ['pedidos']);
});

test('aplica relacionamentos declarados em arquivo separado de constraints', () => {
  const tablesFile = parsePostgreSqlFile({
    path: 'database/scripts/1_create_tables.sql',
    category: 'scripts',
    content: `
      CREATE TABLE clientes (id BIGINT, nome TEXT);
      CREATE TABLE produtos (id BIGINT, nome TEXT);
      CREATE TABLE pedidos (id BIGINT, cliente_id BIGINT, produto_id BIGINT);
    `
  });
  const constraintsFile = parsePostgreSqlFile({
    path: 'database/scripts/2_constraints.sql',
    category: 'scripts',
    content: `
      ALTER TABLE pedidos
        ADD CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
        ADD CONSTRAINT fk_pedidos_produto FOREIGN KEY (produto_id) REFERENCES produtos (id);
    `
  });
  const objects = [...tablesFile.objects, ...constraintsFile.objects];
  const issues = applyAlterTableConstraints(objects, constraintsFile.constraints);
  const pedidos = objects.find((object) => object.name === 'pedidos');

  assert.equal(issues.length, 0);
  assert.equal(constraintsFile.constraints.length, 2);
  assert.deepEqual(pedidos.columns.filter((column) => column.references).map((column) => [
    column.name,
    column.references,
    column.referencesColumn
  ]), [
    ['cliente_id', 'clientes', 'id'],
    ['produto_id', 'produtos', 'id']
  ]);
  assert.deepEqual(pedidos.dependencies, ['clientes', 'produtos']);
  assert.equal(buildDependencyGraph(objects).edges.filter((edge) => edge.resolved).length, 2);
  assert.equal(relationshipsOf(objects).length, 2);
});

test('aplica nulabilidade, default e check declarados em arquivo separado', () => {
  const tablesFile = parsePostgreSqlFile({
    path: 'database/scripts/1_create_tables.sql',
    category: 'scripts',
    content: 'CREATE TABLE eventos (id BIGINT, titulo TEXT, status TEXT);'
  });
  const constraintsFile = parsePostgreSqlFile({
    path: 'database/scripts/2_constraints.sql',
    category: 'scripts',
    content: `
      ALTER TABLE eventos
        ALTER COLUMN titulo SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'ATIVO';
      ALTER TABLE eventos
        ADD CONSTRAINT chk_eventos_status CHECK (status IN ('ATIVO', 'CANCELADO'));
    `
  });
  const objects = [...tablesFile.objects, ...constraintsFile.objects];
  const changeIssues = applyAlterTableColumnChanges(objects, constraintsFile.columnChanges);
  const constraintIssues = applyAlterTableConstraints(objects, constraintsFile.constraints);
  const eventos = objects.find((object) => object.name === 'eventos');
  const titulo = eventos.columns.find((column) => column.name === 'titulo');
  const status = eventos.columns.find((column) => column.name === 'status');

  assert.equal(changeIssues.length, 0);
  assert.equal(constraintIssues.length, 0);
  assert.equal(titulo.nullable, false);
  assert.equal(titulo.notNull, true);
  assert.equal(status.default, "'ATIVO'");
  assert.equal(status.check, "status IN ('ATIVO', 'CANCELADO')");
  assert.equal(eventos.constraints.length, 1);
});

test('interpreta herança de tabelas PostgreSQL como dependência', () => {
  const result = parsePostgreSqlFile({
    path: 'database/scripts/tables.sql',
    category: 'scripts',
    content: `
      CREATE TABLE conta (email TEXT);
      CREATE TABLE usuarios (id BIGINT) INHERITS (conta);
      CREATE TABLE admin (id BIGINT) INHERITS (conta);
    `
  });
  const usuarios = result.objects.find((object) => object.name === 'usuarios');
  const admin = result.objects.find((object) => object.name === 'admin');
  const graph = buildDependencyGraph(result.objects);

  assert.deepEqual(usuarios.inherits, ['conta']);
  assert.deepEqual(admin.inherits, ['conta']);
  assert.ok(usuarios.dependencies.includes('conta'));
  assert.equal(graph.edges.filter((edge) => edge.from === 'table:conta' && edge.resolved).length, 2);
});

test('materializa colunas herdadas e aplica alterações e constraints na tabela filha', () => {
  const tablesFile = parsePostgreSqlFile({
    path: 'database/scripts/1_create_tables.sql',
    category: 'scripts',
    content: `
      CREATE TABLE conta (nome TEXT, email TEXT, firebase_uid TEXT);
      CREATE TABLE usuarios (id BIGINT) INHERITS (conta);
      CREATE TABLE admin (id BIGINT) INHERITS (conta);
    `
  });
  const constraintsFile = parsePostgreSqlFile({
    path: 'database/scripts/2_constraints.sql',
    category: 'scripts',
    content: `
      ALTER TABLE conta ALTER COLUMN email SET NOT NULL;
      ALTER TABLE usuarios ALTER COLUMN nome SET NOT NULL;
      ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_email UNIQUE (email);
      ALTER TABLE admin ADD CONSTRAINT uk_admin_firebase UNIQUE (firebase_uid);
    `
  });
  const objects = [...tablesFile.objects, ...constraintsFile.objects];
  assert.equal(applyAlterTableColumnChanges(objects, constraintsFile.columnChanges).length, 0);
  materializeTableInheritance(objects);
  assert.equal(applyAlterTableConstraints(objects, constraintsFile.constraints).length, 0);

  const usuarios = objects.find((object) => object.name === 'usuarios');
  const admin = objects.find((object) => object.name === 'admin');
  assert.equal(usuarios.columns.find((column) => column.name === 'nome').nullable, false);
  assert.equal(usuarios.columns.find((column) => column.name === 'email').nullable, false);
  assert.equal(usuarios.columns.find((column) => column.name === 'email').unique, true);
  assert.equal(usuarios.columns.find((column) => column.name === 'email').inheritedFrom, 'conta');
  assert.equal(admin.columns.find((column) => column.name === 'firebase_uid').unique, true);
});

test('interpreta trigger PostgreSQL e suas dependências', () => {
  const sql = `CREATE TRIGGER trg_clientes_email BEFORE INSERT OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.fn_normalizar_email();`;
  const result = parsePostgreSqlFile({ path: 'database/triggers/trg.sql', category: 'triggers', content: sql });
  const trigger = result.objects[0];
  assert.equal(trigger.type, 'trigger');
  assert.equal(trigger.table, 'clientes');
  assert.equal(trigger.function, 'fn_normalizar_email');
  assert.deepEqual(trigger.events, ['INSERT', 'UPDATE']);
  assert.deepEqual(trigger.dependencies, ['clientes', 'fn_normalizar_email']);
});

test('constrói dependências, usados por e caminho', () => {
  const objects = [
    { id: 'table:clientes', name: 'clientes', type: 'table', file: 'a.sql', dependencies: [], usedBy: [] },
    { id: 'view:vw_clientes', name: 'vw_clientes', type: 'view', file: 'b.sql', dependencies: ['clientes'], usedBy: [] },
    { id: 'procedure:sp_relatorio', name: 'sp_relatorio', type: 'procedure', file: 'c.sql', dependencies: ['vw_clientes'], usedBy: [] }
  ];
  const graph = buildDependencyGraph(objects);
  assert.equal(graph.edges.length, 2);
  assert.deepEqual(objects[0].usedBy, ['vw_clientes']);
  assert.equal(traversal(objects, 'clientes').length, 2);
  assert.deepEqual(findPath(objects, 'clientes', 'sp_relatorio').map((item) => item.name), ['clientes', 'vw_clientes', 'sp_relatorio']);
});

test('explica e classifica análise de impacto', () => {
  const objects = [
    { id: 'table:clientes', name: 'clientes', type: 'table', file: 'a.sql', dependencies: [], usedBy: ['vw_clientes'], columns: [{ name: 'id', primaryKey: true }] },
    { id: 'view:vw_clientes', name: 'vw_clientes', type: 'view', file: 'b.sql', dependencies: ['clientes'], usedBy: ['sp_relatorio'] },
    { id: 'procedure:sp_relatorio', name: 'sp_relatorio', type: 'procedure', file: 'c.sql', dependencies: ['vw_clientes'], usedBy: [] }
  ];
  const result = analyzeImpact({ objects }, { object: 'clientes', element: 'id', changeType: 'alter-type' });
  assert.equal(result.directDependencies, 1);
  assert.equal(result.indirectDependencies, 1);
  assert.ok(result.reasons.length >= 3);
  assert.equal(result.level, 'ALTA');
});

test('bloqueia path traversal no serviço de arquivos', async () => {
  await assert.rejects(() => readSqlFile('../../segredo.sql'), /pastas autorizadas/);
});

test('organiza o grafo da dependência para o objeto dependente', () => {
  const objects = [
    { id: 'table:clientes', name: 'clientes', type: 'table' },
    { id: 'view:vw_clientes', name: 'vw_clientes', type: 'view' },
    { id: 'procedure:sp_clientes', name: 'sp_clientes', type: 'procedure' }
  ];
  const edges = [
    { from: 'table:clientes', to: 'view:vw_clientes', resolved: true },
    { from: 'view:vw_clientes', to: 'procedure:sp_clientes', resolved: true }
  ];
  const layout = dependencyGraphLayout(objects, edges);
  assert.ok(layout.positions.get('table:clientes').x < layout.positions.get('view:vw_clientes').x);
  assert.ok(layout.positions.get('view:vw_clientes').x < layout.positions.get('procedure:sp_clientes').x);
  assert.equal(layout.maxLevel, 2);
});
