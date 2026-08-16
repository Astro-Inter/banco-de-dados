import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function loadConfig() {
  const filename = path.join(workspaceRoot, 'database-workspace.config.json');
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

export function toPosix(value) {
  return value.split(path.sep).join('/');
}
