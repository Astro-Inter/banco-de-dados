import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gitStatus, parseGitStatus } from '../server/services/git-status.js';

const run = promisify(execFile);

test('status preserva caminhos especiais, status e renomeações sem listar arquivos externos', () => {
  const output = ' M site/app.js\0 M database/scripts/ação com espaço.sql\0R  database/scripts/novo.sql\0database/scripts/antigo.sql\0 D database/logs/removido.sql\0?? database/docs/nota.md\0?? database-extra/test.sql\0';
  assert.deepEqual(parseGitStatus(output), [
    { status: ' M', file: 'database/scripts/ação com espaço.sql' },
    { status: 'R ', file: 'database/scripts/antigo.sql → database/scripts/novo.sql' },
    { status: ' D', file: 'database/logs/removido.sql' },
    { status: '??', file: 'database/docs/nota.md' }
  ]);
});

test('Git lista somente database, incluindo arquivos novos, modificados e excluídos', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-local-changes-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = (args) => run('git', args, { cwd: root, windowsHide: true });
  const write = async (file, content) => {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), content);
  };
  await git(['init']);
  await write('database/scripts/base.sql', 'SELECT 1;');
  await write('database/scripts/excluir.sql', 'SELECT 2;');
  await write('site/app.js', 'original');
  await git(['add', '.']);
  await git(['-c', 'user.name=Test', '-c', 'user.email=test@example.test', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture']);
  await write('site/app.js', 'modificado');
  await write('generated/example.json', '{}');
  await write('database-extra/test.sql', 'SELECT 3;');
  assert.deepEqual(await gitStatus(root), []);
  await write('database/scripts/base.sql', 'SELECT 4;');
  await fs.unlink(path.join(root, 'database/scripts/excluir.sql'));
  await write('database/nova pasta/ação.sql', 'SELECT 5;');
  await write('database/nova pasta/README.md', 'Documentação');
  const changes = await gitStatus(root);
  assert.deepEqual(changes.map((change) => change.file).sort(), [
    'database/nova pasta/README.md', 'database/nova pasta/ação.sql',
    'database/scripts/base.sql', 'database/scripts/excluir.sql'
  ].sort());
  assert.equal(changes.find((change) => change.file.endsWith('base.sql')).status, ' M');
  assert.equal(changes.find((change) => change.file.endsWith('excluir.sql')).status, ' D');
  assert.equal(changes.find((change) => change.file.endsWith('ação.sql')).status, '??');
});
