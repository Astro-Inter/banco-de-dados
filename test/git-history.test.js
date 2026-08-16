import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { generateGitHistory } from '../analyzer/git/history.js';
import { gitHistoryDefaults, gitHistorySettings } from '../analyzer/git/history-config.js';
import { parseCommitLog, parseNameStatusLine, parseUnifiedDiff, statusFor, summarizeFiles } from '../analyzer/git/log-parser.js';
import { createSqlScope, normalizeRepositoryPath } from '../analyzer/git/sql-scope.js';
import { loadConfig } from '../analyzer/config.js';
import {
  availableCategories,
  availableStatuses,
  categoryLabel,
  filterCommits,
  matchesCommit,
  statusLetters,
  visibleFiles
} from '../site/services/git-history.js';

const run = promisify(execFile);

const paths = {
  scripts: 'database/scripts',
  dataload: 'database/dataload',
  functions: 'database/functions',
  views: 'database/views',
  procedures: 'database/procedures',
  indexes: 'database/indexes',
  triggers: 'database/triggers',
  logs: 'database/logs'
};

const config = { database: { paths }, generated: 'generated', git: { history: { enabled: true, maxCommits: 100, includeDiff: true } } };
const scope = createSqlScope(paths);

/** Repositório Git temporário e descartável, com identidade fixa. */
async function createRepository() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-history-'));
  await run('git', ['init', '--initial-branch=main'], { cwd: root });
  await run('git', ['config', 'user.name', 'Lucas Lima'], { cwd: root });
  await run('git', ['config', 'user.email', 'lucas@example.test'], { cwd: root });
  await run('git', ['config', 'commit.gpgsign', 'false'], { cwd: root });
  return root;
}

async function write(root, relative, content) {
  const absolute = path.join(root, relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, 'utf8');
}

async function commit(root, message) {
  await run('git', ['add', '-A'], { cwd: root });
  await run('git', ['commit', '-m', message], { cwd: root });
}

async function history(root, overrides = {}) {
  return generateGitHistory({
    root,
    config: { ...config, ...overrides },
    write: false,
    environment: {}
  });
}

/** Repositório usado pela maioria dos casos: SQL, frontend e as duas coisas. */
async function repositoryWithMixedCommits() {
  const root = await createRepository();
  await write(root, 'database/scripts/02_create_tables.sql', 'CREATE TABLE clientes (\n    id BIGSERIAL PRIMARY KEY,\n    nome VARCHAR(100)\n);\n');
  await write(root, 'site/app.js', 'console.log(1);\n');
  await commit(root, 'Criar tabela de clientes');

  await write(root, 'site/styles.css', '.a { color: red; }\n');
  await write(root, 'README.md', '# Projeto\n');
  await commit(root, 'Ajustar identidade visual');

  await write(root, 'database/views/vw_clientes.sql', 'CREATE VIEW vw_clientes AS SELECT id FROM clientes;\n');
  await write(root, 'database/scripts/02_create_tables.sql', 'CREATE TABLE clientes (\n    id BIGSERIAL PRIMARY KEY,\n    nome VARCHAR(150),\n    telefone VARCHAR(20)\n);\n');
  await write(root, 'site/app.js', 'console.log(2);\n');
  await commit(root, 'Adicionar telefone do cliente');
  return root;
}

test('commit apenas de frontend é ignorado e commit com SQL é incluído', async () => {
  const root = await repositoryWithMixedCommits();
  const result = await history(root);

  assert.equal(result.available, true);
  assert.deepEqual(result.commits.map((item) => item.subject), ['Adicionar telefone do cliente', 'Criar tabela de clientes']);
  assert.ok(!result.commits.some((item) => item.subject === 'Ajustar identidade visual'));
});

test('commit misto mostra somente os arquivos SQL', async () => {
  const root = await repositoryWithMixedCommits();
  const [recent] = (await history(root)).commits;
  const files = recent.files.map((file) => file.path);

  assert.deepEqual(files.sort(), ['database/scripts/02_create_tables.sql', 'database/views/vw_clientes.sql']);
  assert.ok(!files.some((file) => file.startsWith('site/')));
  assert.equal(recent.stats.files, 2);
  assert.equal(recent.stats.added, 1);
  assert.equal(recent.stats.modified, 1);
});

test('arquivo SQL adicionado, modificado, removido e renomeado', async () => {
  const root = await createRepository();
  await write(root, 'database/views/vw_antiga.sql', 'CREATE VIEW vw_antiga AS SELECT 1;\n');
  await write(root, 'database/views/vw_cliente.sql', 'CREATE VIEW vw_cliente AS SELECT id, nome FROM clientes;\n');
  await commit(root, 'Criar views');

  await fs.rm(path.join(root, 'database/views/vw_antiga.sql'));
  await run('git', ['mv', 'database/views/vw_cliente.sql', 'database/views/vw_clientes.sql'], { cwd: root });
  await write(root, 'database/functions/fn_calcular_total.sql', 'CREATE FUNCTION fn_calcular_total() RETURNS INT AS $$ SELECT 1 $$ LANGUAGE SQL;\n');
  await commit(root, 'Reorganizar objetos');

  const [recent, first] = (await history(root)).commits;
  const byPath = Object.fromEntries(recent.files.map((file) => [file.path, file]));

  assert.equal(first.files.every((file) => file.status === 'added'), true);
  assert.equal(byPath['database/functions/fn_calcular_total.sql'].status, 'added');
  assert.equal(byPath['database/views/vw_antiga.sql'].status, 'deleted');
  assert.equal(byPath['database/views/vw_clientes.sql'].status, 'renamed');
  assert.equal(byPath['database/views/vw_clientes.sql'].oldPath, 'database/views/vw_cliente.sql');
  assert.equal(recent.stats.renamed, 1);
});

test('autor, data e hash curto ficam disponíveis, sem e-mail', async () => {
  const root = await repositoryWithMixedCommits();
  const result = await history(root);
  const [recent] = result.commits;

  assert.equal(recent.author, 'Lucas Lima');
  assert.match(recent.shortHash, /^[0-9a-f]{7,}$/);
  assert.equal(recent.hash.startsWith(recent.shortHash), true);
  assert.ok(!Number.isNaN(new Date(recent.date).getTime()));
  assert.equal(result.branch, 'main');
  assert.equal(result.currentShortCommit, recent.shortHash);
  assert.equal(result.documentVersion, `main@${recent.shortHash}`);

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /lucas@example\.test/);
  assert.doesNotMatch(serialized, /"email"/);
});

test('o diff traz conteúdo adicionado, removido e o arquivo criado inteiro', async () => {
  const root = await createRepository();
  await write(root, 'database/scripts/02_create_tables.sql', 'CREATE TABLE clientes (\n    id BIGSERIAL PRIMARY KEY,\n    nome VARCHAR(150),\n    email VARCHAR(150)\n);\n');
  await commit(root, 'Criar clientes');
  await write(root, 'database/scripts/02_create_tables.sql', 'CREATE TABLE clientes (\n    id BIGSERIAL PRIMARY KEY,\n    nome VARCHAR(150),\n    telefone VARCHAR(20),\n    email VARCHAR(150)\n);\n');
  await commit(root, 'Adicionar telefone');

  const detailed = await generateGitHistory({ root, config, write: false, environment: {} });
  assert.equal(detailed.commits[0].files[0].insertions, 1);
  assert.equal(detailed.commits[0].files[0].hasDiff, true);
});

test('o limite de commits vem da configuração central', async () => {
  const root = await createRepository();
  for (let index = 1; index <= 5; index += 1) {
    await write(root, `database/scripts/0${index}.sql`, `-- versão ${index}\nCREATE TABLE t${index} (id INT);\n`);
    await commit(root, `Commit ${index}`);
  }

  const limited = await history(root, { git: { history: { maxCommits: 2 } } });
  assert.equal(limited.commits.length, 2);
  assert.equal(limited.truncated, true);
  assert.equal(limited.config.maxCommits, 2);

  const full = await history(root);
  assert.equal(full.commits.length, 5);
  assert.equal(full.truncated, false);

  assert.equal(gitHistoryDefaults.maxCommits, 100);
  assert.equal(gitHistorySettings({}).maxCommits, 100);
  assert.equal(gitHistorySettings({ git: { history: { maxCommits: 0 } } }).maxCommits, 100);
});

test('projeto sem .git não quebra: o histórico apenas fica indisponível', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-zip-'));
  await write(root, 'database/scripts/02_create_tables.sql', 'CREATE TABLE clientes (id INT);\n');

  const result = await history(root);
  assert.equal(result.available, false);
  assert.equal(result.reason, 'no-git');
  assert.match(result.message, /não possui um repositório Git local/);
  assert.deepEqual(result.commits, []);
});

test('repositório sem commits SQL não é erro: apenas histórico vazio', async () => {
  const root = await createRepository();
  await write(root, 'site/app.js', 'console.log(1);\n');
  await write(root, 'README.md', '# Somente frontend\n');
  await commit(root, 'Somente frontend');

  const result = await history(root);
  assert.equal(result.available, true);
  assert.equal(result.reason, null);
  assert.deepEqual(result.commits, []);
});

test('as pastas do banco são configuráveis, inclusive database/logs', async () => {
  const root = await createRepository();
  await write(root, 'database/logs/log_pedidos.sql', 'CREATE TABLE log_pedidos (id BIGSERIAL PRIMARY KEY);\n');
  await write(root, 'sql/custom/extra.sql', 'CREATE TABLE extra (id INT);\n');
  await commit(root, 'Criar log de pedidos');

  const padrao = await history(root);
  assert.deepEqual(padrao.commits[0].files.map((file) => file.path), ['database/logs/log_pedidos.sql']);
  assert.equal(padrao.commits[0].files[0].category, 'logs');
  assert.equal(padrao.paths.logs, 'database/logs');

  const alternativo = await history(root, { database: { paths: { custom: 'sql/custom' } } });
  assert.deepEqual(alternativo.commits[0].files.map((file) => file.path), ['sql/custom/extra.sql']);
  assert.equal(alternativo.commits[0].files[0].category, 'custom');
});

test('geração estática grava o índice e os detalhes por commit', async () => {
  const root = await repositoryWithMixedCommits();
  const result = await generateGitHistory({ root, config, write: true, environment: {} });
  const generated = path.join(root, 'generated');

  const index = JSON.parse(await fs.readFile(path.join(generated, 'git-history.json'), 'utf8'));
  assert.equal(index.commits.length, result.commits.length);
  assert.equal(index.available, true);
  // O índice não carrega diff: ele é buscado por commit, sob demanda.
  assert.doesNotMatch(JSON.stringify(index), /"rows"/);

  const detail = JSON.parse(await fs.readFile(path.join(generated, 'git-history', `${index.commits[0].shortHash}.json`), 'utf8'));
  assert.equal(detail.shortHash, index.commits[0].shortHash);
  assert.ok(detail.files.every((file) => Array.isArray(file.rows)));
  assert.ok(detail.files.every((file) => file.path.endsWith('.sql')));
  const diff = detail.files.find((file) => file.path === 'database/scripts/02_create_tables.sql');
  assert.ok(diff.rows.some(([type, line]) => type === 'add' && line.includes('telefone')));
});

test('o escopo SQL aceita apenas .sql dentro das pastas configuradas', () => {
  assert.equal(scope.isSqlPath('database/views/vw_clientes.sql'), true);
  assert.equal(scope.isSqlPath('database/logs/log_pedidos.sql'), true);
  assert.equal(scope.isSqlPath('site/app.js'), false);
  assert.equal(scope.isSqlPath('README.md'), false);
  assert.equal(scope.isSqlPath('package.json'), false);
  assert.equal(scope.isSqlPath('database/scripts/notas.txt'), false);
  assert.equal(scope.isSqlPath('outro/lugar/tabela.sql'), false);
  assert.equal(scope.categoryOf('database/logs/log_pedidos.sql'), 'logs');
  assert.equal(normalizeRepositoryPath('./database\\logs/'), 'database/logs');
  // A ordem da configuração é preservada: ela vira a ordem dos filtros.
  assert.deepEqual(Object.keys(scope.categories), Object.keys(paths));
  // Mas o casamento usa a pasta mais específica.
  const aninhado = createSqlScope({ banco: 'database', logs: 'database/logs' });
  assert.equal(aninhado.categoryOf('database/logs/log_pedidos.sql'), 'logs');
  assert.equal(aninhado.categoryOf('database/scripts/02.sql'), 'banco');
});

test('parsing do git log descarta commits sem SQL e lê renomeações', () => {
  const record = (fields) => `\x1e${fields.join('\x1f')}\x1f`;
  const stdout = [
    record(['a'.repeat(40), 'aaaaaaa', 'Lucas Lima', '2026-08-13T21:42:00-03:00', 'Somente frontend', '']) + 'M\tsite/app.js\nM\tREADME.md\n',
    record(['b'.repeat(40), 'bbbbbbb', 'Lucas Lima', '2026-08-13T22:10:00-03:00', 'Renomear view', 'Corpo da mensagem'])
      + 'R096\tdatabase/views/vw_cliente.sql\tdatabase/views/vw_clientes.sql\nM\tsite/styles.css\n'
  ].join('');

  const commits = parseCommitLog(stdout, scope);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].subject, 'Renomear view');
  assert.equal(commits[0].message, 'Renomear view\n\nCorpo da mensagem');
  assert.deepEqual(commits[0].files, [{
    path: 'database/views/vw_clientes.sql',
    oldPath: 'database/views/vw_cliente.sql',
    name: 'vw_clientes.sql',
    status: 'renamed',
    category: 'views'
  }]);

  assert.equal(parseNameStatusLine('M\tsite/app.js', scope), null);
  assert.equal(parseNameStatusLine('', scope), null);
  assert.equal(statusFor('A'), 'added');
  assert.equal(statusFor('T'), 'modified');
  assert.equal(statusFor('?'), 'modified');
});

test('o diff é convertido no mesmo formato do editor local', () => {
  const patch = [
    'diff --git a/database/scripts/02.sql b/database/scripts/02.sql',
    'index 111..222 100644',
    '--- a/database/scripts/02.sql',
    '+++ b/database/scripts/02.sql',
    '@@ -1,3 +1,4 @@',
    ' CREATE TABLE clientes (',
    '+    telefone VARCHAR(20),',
    '--- comentário antigo',
    ' );',
    ''
  ].join('\n');

  const [block] = parseUnifiedDiff(patch);
  assert.equal(block.path, 'database/scripts/02.sql');
  assert.equal(block.insertions, 1);
  assert.equal(block.deletions, 1);
  // Uma linha removida `-- comentário` não pode ser confundida com cabeçalho.
  assert.deepEqual(block.rows[3], ['remove', '- -- comentário antigo']);
  assert.deepEqual(block.rows[0], ['meta', '@@ -1,3 +1,4 @@']);
  assert.deepEqual(block.rows[1], ['same', '  CREATE TABLE clientes (']);

  const [limited] = parseUnifiedDiff(patch, { maxLines: 2 });
  assert.equal(limited.rows.length, 2);
  assert.equal(limited.truncated, true);
  assert.equal(limited.totalRows, 5);
  assert.equal(limited.insertions, 1);
});

test('arquivo criado e arquivo removido aparecem inteiros no diff', () => {
  const created = parseUnifiedDiff([
    'diff --git a/database/functions/fn.sql b/database/functions/fn.sql',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/database/functions/fn.sql',
    '@@ -0,0 +1,2 @@',
    '+CREATE FUNCTION fn() RETURNS INT AS $$',
    '+SELECT 1 $$ LANGUAGE SQL;',
    ''
  ].join('\n'))[0];
  assert.equal(created.path, 'database/functions/fn.sql');
  assert.equal(created.insertions, 2);

  const removed = parseUnifiedDiff([
    'diff --git a/database/views/vw_antiga.sql b/database/views/vw_antiga.sql',
    'deleted file mode 100644',
    '--- a/database/views/vw_antiga.sql',
    '+++ /dev/null',
    '@@ -1,1 +0,0 @@',
    '-CREATE VIEW vw_antiga AS SELECT 1;',
    ''
  ].join('\n'))[0];
  assert.equal(removed.path, 'database/views/vw_antiga.sql');
  assert.deepEqual(removed.rows.at(-1), ['remove', '- CREATE VIEW vw_antiga AS SELECT 1;']);
});

test('a configuração do workspace declara o histórico do banco', async () => {
  const workspaceConfig = await loadConfig();
  const settings = gitHistorySettings(workspaceConfig);
  assert.equal(settings.enabled, true);
  assert.equal(settings.maxCommits, 100);
  assert.equal(settings.includeDiff, true);
});

test('histórico desativado na configuração não gera commits', async () => {
  const root = await repositoryWithMixedCommits();
  const result = await history(root, { git: { history: { enabled: false } } });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'disabled');
});

const sampleHistory = {
  available: true,
  paths,
  commits: [
    {
      shortHash: 'a84cf21', hash: 'a84cf21bbb', subject: 'Adicionar tabela de endereços', message: 'Adicionar tabela de endereços',
      author: 'Lucas Lima', date: '2026-08-13T21:42:00-03:00',
      stats: { files: 2, added: 1, modified: 1, deleted: 0, renamed: 0 },
      files: [
        { path: 'database/scripts/03_create_enderecos.sql', name: '03_create_enderecos.sql', status: 'added', category: 'scripts' },
        { path: 'database/views/vw_clientes.sql', name: 'vw_clientes.sql', status: 'modified', category: 'views' }
      ]
    },
    {
      shortHash: '27bd192', hash: '27bd192ccc', subject: 'Criar log de pedidos', message: 'Criar log de pedidos',
      author: 'Maria Souza', date: '2026-08-12T10:00:00-03:00',
      stats: { files: 1, added: 1, modified: 0, deleted: 0, renamed: 0 },
      files: [{ path: 'database/logs/log_pedidos.sql', name: 'log_pedidos.sql', status: 'added', category: 'logs' }]
    }
  ]
};

test('busca do histórico encontra mensagem, hash, autor e arquivo SQL', () => {
  assert.equal(matchesCommit(sampleHistory.commits[0], 'endereços'), true);
  assert.equal(matchesCommit(sampleHistory.commits[0], 'a84cf21'), true);
  assert.equal(matchesCommit(sampleHistory.commits[1], 'maria'), true);
  assert.equal(matchesCommit(sampleHistory.commits[1], 'log_pedidos'), true);
  assert.equal(matchesCommit(sampleHistory.commits[1], 'clientes'), false);
  // "clientes" alcança tanto o arquivo quanto o objeto SQL do caminho.
  assert.deepEqual(filterCommits(sampleHistory, { query: 'clientes' }).map((item) => item.shortHash), ['a84cf21']);
  assert.equal(filterCommits(sampleHistory, {}).length, 2);
});

test('filtros por categoria e por operação usam as pastas configuradas', () => {
  assert.deepEqual(filterCommits(sampleHistory, { category: 'logs' }).map((item) => item.shortHash), ['27bd192']);
  assert.deepEqual(filterCommits(sampleHistory, { category: 'views' }).map((item) => item.shortHash), ['a84cf21']);
  assert.equal(filterCommits(sampleHistory, { status: 'deleted' }).length, 0);
  assert.equal(filterCommits(sampleHistory, { status: 'added' }).length, 2);
  assert.deepEqual(visibleFiles(sampleHistory.commits[0], { status: 'added' }).map((file) => file.name), ['03_create_enderecos.sql']);

  assert.deepEqual(availableCategories(sampleHistory), ['scripts', 'views', 'logs']);
  assert.deepEqual(availableStatuses(sampleHistory), ['added', 'modified']);
  assert.equal(categoryLabel('logs'), 'Log Tables');
  assert.equal(statusLetters.deleted, 'D');
});

test('resumo por operação conta arquivos, não linhas', () => {
  const stats = summarizeFiles([
    { status: 'added', insertions: 10, deletions: 0 },
    { status: 'modified', insertions: 2, deletions: 3 },
    { status: 'renamed', insertions: 0, deletions: 0 },
    { status: 'deleted', insertions: 0, deletions: 8 }
  ]);
  assert.deepEqual(stats, { files: 4, added: 1, modified: 1, deleted: 1, renamed: 1, insertions: 12, deletions: 11 });
});
