import fs from 'node:fs/promises';
import path from 'node:path';
import { workspaceRoot, loadConfig } from '../config.js';
import { validateRedisDocument } from './validation.js';

export async function analyzeRedis({ root = workspaceRoot, write = true, generated } = {}) {
  const keys = [];
  const issues = [];
  const directory = path.join(root, 'redis/keys');
  let files = [];
  try { files = await fs.readdir(directory); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const filename of files.filter((name) => name.endsWith('.json')).sort()) {
    const file = `redis/keys/${filename}`;
    try {
      const definition = JSON.parse(await fs.readFile(path.join(directory, filename), 'utf8'));
      validateRedisDocument(definition);
      if (keys.some((item) => item.id === definition.id)) throw new Error('ID de chave duplicado.');
      keys.push({ ...definition, file });
    } catch (error) { issues.push({ file, message: error.message }); }
  }
  let modeling = { principles: [], decisions: [], flows: [] };
  try {
    const document = JSON.parse(await fs.readFile(path.join(root, 'redis/docs/modeling.json'), 'utf8'));
    validateRedisDocument(document, true);
    modeling = document;
    for (const flow of modeling.flows) for (const step of flow.steps) {
      if (step.keyId && !keys.some((item) => item.id === step.keyId)) issues.push({ file: 'redis/docs/modeling.json', message: `Chave ${step.keyId} não encontrada no fluxo ${flow.title}.` });
    }
  } catch (error) { if (error.code !== 'ENOENT') issues.push({ file: 'redis/docs/modeling.json', message: error.message }); }
  keys.sort((a, b) => Number(b.status === 'Implementado') - Number(a.status === 'Implementado'));
  const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), keys, modeling, issues };
  if (write) {
    const output = path.resolve(root, generated ?? (await loadConfig()).generated);
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'redis.json'), JSON.stringify(result, null, 2));
  }
  return result;
}
