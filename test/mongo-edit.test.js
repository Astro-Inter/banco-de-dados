import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readMongoFile, writeMongoFile } from '../server/services/mongo-file-service.js';
import { analyzeMongo } from '../analyzer/mongo/index.js';
import { mongoView } from '../site/components/mongo/mongo-view.js';

const collection = { name: 'example', title: 'Exemplo', description: 'Original', status: 'Proposta', pattern: 'Documento', fields: [], example: {}, notes: [], indexes: [] };

test('edição persiste e atualiza o catálogo; rejeita JSON inválido, conflito e caminhos externos', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-mongo-edit-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'mongo/collections'), { recursive: true });
  const file = 'mongo/collections/example.json';
  const original = JSON.stringify(collection);
  await fs.writeFile(path.join(root, file), original);
  await assert.rejects(writeMongoFile(file, '{', original, root), /JSON inválido/);
  await assert.rejects(writeMongoFile(file, '{}', original, root), /name/);
  assert.equal(await readMongoFile(file, root), original);
  const changed = JSON.stringify({ ...collection, description: 'Atualizada' });
  await writeMongoFile(file, changed, original, root);
  assert.equal((await analyzeMongo({ root, write: false })).collections[0].description, 'Atualizada');
  await assert.rejects(writeMongoFile(file, original, original, root), /arquivo mudou/);
  for (const invalid of ['database/scripts/main.sql', 'mongo/collections/../../secret.json', '../mongo/collections/example.json']) {
    await assert.rejects(readMongoFile(invalid, root), /fora/);
  }
  await fs.writeFile(path.join(root, 'mongo/collections/other.json'), JSON.stringify({ ...collection, name: 'other' }));
  await assert.rejects(writeMongoFile(file, JSON.stringify({ ...collection, name: 'other' }), await readMongoFile(file, root), root), /Já existe/);
  await fs.mkdir(path.join(root, 'mongo/docs'));
  const modelingFile = 'mongo/docs/modeling.json';
  const modeling = JSON.stringify({ principles: [], decisions: [] });
  await fs.writeFile(path.join(root, modelingFile), modeling);
  await writeMongoFile(modelingFile, JSON.stringify({ principles: [], decisions: [{ title: 'Índices', description: 'Validar' }] }), modeling, root);
  assert.equal((await analyzeMongo({ root, write: false })).modeling.decisions[0].title, 'Índices');
});

test('edição fica disponível somente no modo local e não há referência externa no catálogo', async () => {
  const data = await analyzeMongo({ write: false });
  const local = mongoView(data, { mode: { editable: true } });
  assert.match(local, /Editar documentação/);
  assert.doesNotMatch(local, /data-mongo-edit="[^"]+" disabled/);
  assert.match(mongoView(data), /data-mongo-edit="[^"]+" disabled/);
  assert.match(mongoView(data, { tab: 'decisions', mode: { editable: true } }), /data-mongo-edit="mongo\/docs\/modeling.json"/);
  assert.doesNotMatch(JSON.stringify(data) + local, /confluence|atlassian/i);
});
