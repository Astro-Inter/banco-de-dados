import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyzeRedis } from '../analyzer/redis/index.js';
import { readRedisFile, writeRedisFile } from '../server/services/redis-file-service.js';
import { redisMatches, redisView } from '../site/components/redis/redis-view.js';

test('catálogo separa contratos implementados e propostas e preserva TTL e payload reais', async () => {
  const data = await analyzeRedis({ write: false });
  assert.equal(data.keys.length, 6);
  assert.equal(data.keys.filter((key) => key.status === 'Implementado').length, 4);
  assert.equal(data.issues.length, 0);
  assert.equal(data.modeling.flows.length, 2);
  const employee = data.keys.find((key) => key.id === 'employee-queue');
  assert.ok(Array.isArray(employee.example) && employee.example.every((value) => typeof value === 'string'));
  assert.match(employee.commands.join(' '), /LPOP/);
  assert.match(data.keys.find((key) => key.id === 'employee-token').ttl, /ACCESS_TOKEN_TTL_SECONDS/);
  assert.match(data.keys.find((key) => key.id === 'workspace-token').ttl, /Sem expiração/);
  assert.equal(data.keys.find((key) => key.id === 'chat-session').status, 'Proposta');
  assert.ok(redisMatches(employee, 'FILA'));
  assert.doesNotMatch(JSON.stringify(data), /atlassian|confluence/i);
});

test('edição Redis valida contrato, confere versão e restringe escrita ao módulo', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-redis-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'redis/keys'), { recursive: true });
  await fs.mkdir(path.join(root, 'redis/docs'));
  const data = await analyzeRedis({ write: false });
  const definition = { ...data.keys[0] };
  delete definition.file;
  const file = 'redis/keys/example.json';
  const original = JSON.stringify(definition);
  await fs.writeFile(path.join(root, file), original);
  await assert.rejects(writeRedisFile(file, '{', original, root), /JSON inválido/);
  await assert.rejects(writeRedisFile(file, '{}', original, root), /Informe/);
  await writeRedisFile(file, JSON.stringify({ ...definition, title: 'Atualizada' }), original, root);
  assert.equal((await analyzeRedis({ root, write: false })).keys[0].title, 'Atualizada');
  await assert.rejects(writeRedisFile(file, original, original, root), /arquivo mudou/);
  for (const invalid of ['mongo/collections/example.json', 'redis/keys/../../secret.json', '../redis/keys/example.json']) await assert.rejects(readRedisFile(invalid, root), /fora/);
  await fs.writeFile(path.join(root, 'redis/keys/duplicate.json'), original);
  const current = await readRedisFile(file, root);
  await assert.rejects(writeRedisFile(file, original, current, root), /Já existe/);
  await fs.writeFile(path.join(root, 'redis/keys/invalid.json'), '{}');
  const analyzed = await analyzeRedis({ root, write: false });
  assert.equal(analyzed.keys.length, 1);
  assert.equal(analyzed.issues.length, 2);
  const modelingFile = 'redis/docs/modeling.json';
  const modeling = JSON.stringify({ principles: [], decisions: [], flows: [] });
  await fs.writeFile(path.join(root, modelingFile), modeling);
  await writeRedisFile(modelingFile, JSON.stringify({ ...JSON.parse(modeling), decisions: [{ title: 'TTL', description: 'Definir' }] }), modeling, root);
  assert.equal((await analyzeRedis({ root, write: false })).modeling.decisions[0].title, 'TTL');
});

test('interface escapa exemplos e evidências; modo estático não oferece escrita e fluxo abre chaves', async () => {
  const data = await analyzeRedis({ write: false });
  const key = data.keys[0];
  const unsafe = { ...key, title: '<script>alert(1)</script>', example: '<img src=x onerror=alert(1)>', evidence: [{ repo: '<svg>', file: '<img>', symbol: '<script>' }] };
  const html = redisView({ ...data, keys: [unsafe] });
  assert.doesNotMatch(html, /<script>|<img src=x|<svg>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /data-redis-edit="[^"]+" disabled/);
  assert.doesNotMatch(redisView(data, { mode: { editable: true } }), /data-redis-edit="[^"]+" disabled/);
  assert.match(redisView(data, { tab: 'flows' }), /data-redis-open="employee-token"/);
  assert.match(redisView(data, { query: 'não existe' }), /Nenhuma chave encontrada/);
});
