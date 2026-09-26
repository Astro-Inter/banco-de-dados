import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyzeMongo } from '../analyzer/mongo/index.js';
import { mongoMatches, mongoView } from '../site/components/mongo/mongo-view.js';

test('catálogo documenta as propostas e preserva decisões em aberto', async () => {
  const data = await analyzeMongo({ write: false });
  assert.equal(data.collections.length, 5);
  assert.deepEqual(data.issues, []);
  assert.ok(data.collections.every((collection) => collection.file.startsWith('mongo/collections/')));
  assert.ok(data.collections.find((collection) => collection.name === 'forms').notes.some((note) => note.includes('cada formulário')));
  assert.ok(data.collections.find((collection) => collection.name === 'notificacoes').notes.some((note) => note.includes('Redis')));
  assert.ok(mongoMatches(data.collections.find((collection) => collection.name === 'chatbot_sessoes'), 'mensagens'));
  assert.ok(mongoMatches(data.collections.find((collection) => collection.name === 'notificacoes'), 'notificações'));
});

test('definição inválida não impede o restante do catálogo nem é executada como código', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-mongo-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'mongo/collections'), { recursive: true });
  await fs.writeFile(path.join(root, 'mongo/collections/invalid.json'), 'not json');
  await fs.writeFile(path.join(root, 'mongo/collections/valid.json'), JSON.stringify({ name: 'valid', title: 'Valid', description: 'Exemplo', status: 'Proposta', pattern: 'Documento', fields: [], example: {}, notes: [], indexes: [] }));
  const data = await analyzeMongo({ root, generated: 'generated' });
  assert.equal(data.collections.length, 1);
  assert.equal(data.issues.length, 1);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'generated/mongo.json'))).collections[0].name, 'valid');
});

test('renderização escapa documentos e oferece estado vazio de busca', () => {
  const data = { collections: [{ name: '<unsafe>', fields: [], example: { message: '<script>alert(1)</script>' }, notes: [] }] };
  const markup = mongoView(data);
  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /&lt;script&gt;/);
  assert.match(mongoView(data, { query: 'inexistente' }), /Nenhuma collection encontrada/);
  assert.match(mongoView(null, { error: 'indisponível' }), /Tentar novamente/);
});
