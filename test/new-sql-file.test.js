import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, workspaceRoot } from '../analyzer/config.js';
import { analyzeWorkspace } from '../analyzer/index.js';
import { createSqlFile, deleteSqlFile } from '../server/services/file-service.js';
import { newFileCategories, newLogTableTemplate } from '../site/views.js';
import { tableTypeFor } from '../analyzer/parser/sqlserver.js';

test('Novo SQL oferece Log Table entre as categorias', () => {
  const logs = newFileCategories.find((category) => category.value === 'logs');
  assert.ok(logs, 'a categoria Log Table precisa estar disponível no Novo SQL');
  assert.equal(logs.label, 'Log Table');
  // O ícone é o mesmo já usado pelas Log Tables no restante da aplicação.
  assert.equal(logs.icon, 'logTable');
});

test('toda categoria do Novo SQL corresponde a uma pasta configurada', async () => {
  const config = await loadConfig();
  for (const category of newFileCategories) {
    assert.ok(config.database.paths[category.value], `categoria sem pasta configurada: ${category.value}`);
  }
  assert.equal(config.database.paths.logs, 'database/logs');
});

test('o snapshot leva as pastas configuradas para a interface', async () => {
  const database = await analyzeWorkspace({ write: false });
  const config = await loadConfig();
  // É daqui que o Novo SQL monta `database/logs/log_pedidos.sql`, em vez de
  // repetir o caminho no frontend.
  assert.deepEqual(database.paths, config.database.paths);
});

test('criar uma Log Table grava em database/logs e o analyzer a reconhece', async () => {
  const filename = 'log_teste_novo_sql.sql';
  const relative = await createSqlFile('logs', filename, newLogTableTemplate('log_teste_novo_sql'));
  try {
    assert.equal(relative, 'database/logs/log_teste_novo_sql.sql');
    await fs.access(path.join(workspaceRoot, relative));

    const database = await analyzeWorkspace({ write: false });
    const created = database.objects.find((object) => object.name === 'log_teste_novo_sql');
    assert.ok(created, 'a Log Table criada precisa aparecer no snapshot');
    assert.equal(created.type, 'log-table');
    assert.equal(created.databaseType, 'table');
    assert.equal(created.file, relative);
    assert.ok(database.files.some((file) => file.path === relative && file.category === 'logs'));
    // A classificação continua vindo da pasta, sem parser novo.
    assert.equal(tableTypeFor({ category: 'logs' }), 'log-table');
  } finally {
    await deleteSqlFile(relative);
  }
  await assert.rejects(() => fs.access(path.join(workspaceRoot, relative)));
});

test('as validações de arquivo continuam valendo para Log Tables', async () => {
  await assert.rejects(() => createSqlFile('logs', 'log_sem_extensao'), /Nome de arquivo inválido/);
  await assert.rejects(() => createSqlFile('logs', '../fora.sql'), /Nome de arquivo inválido/);
  await assert.rejects(() => createSqlFile('inexistente', 'x.sql'), /Categoria inválida/);
});

test('criar outras categorias continua funcionando', async () => {
  const relative = await createSqlFile('views', 'vw_teste_novo_sql.sql', 'CREATE VIEW vw_teste_novo_sql AS SELECT 1;\n');
  try {
    assert.equal(relative, 'database/views/vw_teste_novo_sql.sql');
    const database = await analyzeWorkspace({ write: false });
    assert.equal(database.objects.find((object) => object.name === 'vw_teste_novo_sql')?.type, 'view');
  } finally {
    await deleteSqlFile(relative);
  }
});

test('o modelo inicial da Log Table é mínimo e documentado', () => {
  const template = newLogTableTemplate('log_pedidos');
  assert.match(template, /CREATE TABLE public\.log_pedidos/);
  assert.match(template, /id BIGSERIAL PRIMARY KEY/);
  assert.match(template, /criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP/);
  assert.match(template, /COMMENT ON TABLE public\.log_pedidos/);
  // Sem colunas de negócio inventadas: elas dependem do que será auditado.
  assert.equal(template.split('\n').filter((line) => /^\s{4}\w/.test(line)).length, 2);
});
