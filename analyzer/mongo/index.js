import fs from 'node:fs/promises';
import path from 'node:path';
import { workspaceRoot, loadConfig } from '../config.js';
import { validateMongoDocument } from './validation.js';

/** Catálogo documental independente do parser e das métricas SQL. */
export async function analyzeMongo({ root = workspaceRoot, write = true, generated } = {}) {
  const collections = [];
  const issues = [];
  const directory = path.join(root, 'mongo', 'collections');
  let files = [];
  try { files = await fs.readdir(directory); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const filename of files.filter((name) => name.endsWith('.json')).sort()) {
    const file = `mongo/collections/${filename}`;
    try {
      const collection = JSON.parse(await fs.readFile(path.join(directory, filename), 'utf8'));
      validateMongoDocument(collection);
      if (collections.some((item) => item.name === collection.name)) throw new Error('Nome de collection duplicado.');
      collections.push({ ...collection, file });
    } catch (error) { issues.push({ file, message: error.message }); }
  }
  let modeling = { principles: [], decisions: [] };
  try {
    const document = JSON.parse(await fs.readFile(path.join(root, 'mongo/docs/modeling.json'), 'utf8'));
    validateMongoDocument(document, true);
    modeling = document;
  }
  catch (error) { if (error.code !== 'ENOENT') issues.push({ file: 'mongo/docs/modeling.json', message: error.message }); }
  const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), collections, modeling, issues };
  if (write) {
    const output = path.resolve(root, generated ?? (await loadConfig()).generated);
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'mongo.json'), JSON.stringify(result, null, 2));
  }
  return result;
}
