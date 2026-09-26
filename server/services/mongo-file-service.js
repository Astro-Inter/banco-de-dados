import fs from 'node:fs/promises';
import path from 'node:path';
import { workspaceRoot } from '../../analyzer/config.js';
import { validateMongoDocument } from '../../analyzer/mongo/validation.js';

async function resolveMongoFile(file, root) {
  if (typeof file !== 'string' || !/^(mongo\/collections\/[a-zA-Z0-9_-]+\.json|mongo\/docs\/modeling\.json)$/.test(file)) throw new Error('Arquivo fora da documentação MongoDB.');
  const directory = await fs.realpath(path.join(root, 'mongo'));
  const target = await fs.realpath(path.join(root, file));
  if (!target.startsWith(`${directory}${path.sep}`)) throw new Error('Caminho fora da pasta mongo.');
  return target;
}

export async function readMongoFile(file, root = workspaceRoot) {
  return fs.readFile(await resolveMongoFile(file, root), 'utf8');
}

export async function writeMongoFile(file, content, originalContent, root = workspaceRoot) {
  if (typeof content !== 'string' || typeof originalContent !== 'string') throw new Error('Informe o conteúdo atual e o conteúdo original.');
  let document;
  try { document = JSON.parse(content); }
  catch { throw new Error('JSON inválido. Corrija o documento antes de salvar.'); }
  validateMongoDocument(document, file === 'mongo/docs/modeling.json');
  const target = await resolveMongoFile(file, root);
  if (file.startsWith('mongo/collections/')) {
    const directory = path.join(root, 'mongo/collections');
    for (const filename of await fs.readdir(directory)) {
      if (!filename.endsWith('.json') || await fs.realpath(path.join(directory, filename)) === target) continue;
      let existing;
      try { existing = JSON.parse(await fs.readFile(path.join(directory, filename), 'utf8')); } catch { continue; }
      if (existing.name === document.name) throw new Error('Já existe uma collection com esse nome.');
    }
  }
  if (await fs.readFile(target, 'utf8') !== originalContent) throw new Error('O arquivo mudou desde que o editor foi aberto. Reabra para carregar a versão atual.');
  await fs.writeFile(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
}
