import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, toPosix, workspaceRoot } from '../../analyzer/config.js';

const filenamePattern = /^[a-zA-Z0-9_.-]+\.sql$/;

async function allowedRoots() {
  const config = await loadConfig();
  return Object.fromEntries(Object.entries(config.database.paths).map(([category, relative]) => [category, path.resolve(workspaceRoot, relative)]));
}

async function resolveSafe(relativePath, category) {
  if (typeof relativePath !== 'string' || !relativePath.toLowerCase().endsWith('.sql')) throw new Error('Apenas arquivos .sql são permitidos.');
  const roots = await allowedRoots();
  const candidates = category ? [roots[category]].filter(Boolean) : Object.values(roots);
  const absolute = path.resolve(workspaceRoot, relativePath);
  if (!candidates.some((root) => absolute === root || absolute.startsWith(`${root}${path.sep}`))) throw new Error('Caminho fora das pastas autorizadas.');
  return absolute;
}

export async function readSqlFile(relativePath) {
  return fs.readFile(await resolveSafe(relativePath), 'utf8');
}

export async function writeSqlFile(relativePath, content) {
  if (typeof content !== 'string') throw new Error('Conteúdo inválido.');
  const absolute = await resolveSafe(relativePath);
  await fs.writeFile(absolute, content, 'utf8');
}

export async function createSqlFile(category, filename, content = '') {
  if (!filenamePattern.test(filename) || filename.includes('..')) throw new Error('Nome de arquivo inválido. Use letras, números, ponto, hífen ou underscore e a extensão .sql.');
  const roots = await allowedRoots();
  const root = roots[category];
  if (!root) throw new Error('Categoria inválida.');
  await fs.mkdir(root, { recursive: true });
  const absolute = path.join(root, filename);
  await fs.writeFile(absolute, content, { encoding: 'utf8', flag: 'wx' });
  return toPosix(path.relative(workspaceRoot, absolute));
}

export async function renameSqlFile(relativePath, filename) {
  if (!filenamePattern.test(filename) || filename.includes('..')) throw new Error('Novo nome inválido.');
  const current = await resolveSafe(relativePath);
  const target = path.join(path.dirname(current), filename);
  await fs.access(current);
  try {
    await fs.access(target);
    throw new Error('Já existe um arquivo com esse nome.');
  } catch (error) {
    if (error.message.startsWith('Já existe')) throw error;
    if (error.code !== 'ENOENT') throw error;
  }
  await fs.rename(current, target);
  return toPosix(path.relative(workspaceRoot, target));
}

export async function deleteSqlFile(relativePath) {
  await fs.unlink(await resolveSafe(relativePath));
}
