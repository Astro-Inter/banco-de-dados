import fs from 'node:fs/promises';
import path from 'node:path';
import { workspaceRoot } from '../../analyzer/config.js';
import { validateRedisDocument } from '../../analyzer/redis/validation.js';

async function resolveRedisFile(file, root) {
  if (typeof file !== 'string' || !/^(redis\/keys\/[a-zA-Z0-9_-]+\.json|redis\/docs\/modeling\.json)$/.test(file)) throw new Error('Arquivo fora da documentação Redis.');
  const directory = await fs.realpath(path.join(root, 'redis'));
  const target = await fs.realpath(path.join(root, file));
  if (!target.startsWith(`${directory}${path.sep}`)) throw new Error('Caminho fora da pasta redis.');
  return target;
}

export async function readRedisFile(file, root = workspaceRoot) {
  return fs.readFile(await resolveRedisFile(file, root), 'utf8');
}

export async function writeRedisFile(file, content, originalContent, root = workspaceRoot) {
  if (typeof content !== 'string' || typeof originalContent !== 'string') throw new Error('Informe o conteúdo atual e o conteúdo original.');
  let document;
  try { document = JSON.parse(content); } catch { throw new Error('JSON inválido. Corrija o documento antes de salvar.'); }
  validateRedisDocument(document, file === 'redis/docs/modeling.json');
  const target = await resolveRedisFile(file, root);
  if (file.startsWith('redis/keys/')) {
    for (const filename of await fs.readdir(path.join(root, 'redis/keys'))) {
      if (!filename.endsWith('.json')) continue;
      const other = await fs.realpath(path.join(root, 'redis/keys', filename));
      if (other === target) continue;
      let existing;
      try { existing = JSON.parse(await fs.readFile(other, 'utf8')); } catch { continue; }
      if (existing.id === document.id) throw new Error('Já existe uma chave com esse ID.');
    }
  }
  if (await fs.readFile(target, 'utf8') !== originalContent) throw new Error('O arquivo mudou desde que o editor foi aberto. Reabra para carregar a versão atual.');
  await fs.writeFile(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
}
