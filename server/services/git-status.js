import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** O separador NUL preserva espaços, acentos e quebras de linha nos caminhos. */
export function parseGitStatus(stdout) {
  const entries = stdout.split('\0');
  const changes = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    const status = entry.slice(0, 2);
    const file = entry.slice(3);
    // No formato -z, renomeações e cópias trazem destino e origem separados.
    const originalFile = /[RC]/.test(status) ? entries[++index] : null;
    if (!file.startsWith('database/')) continue;
    changes.push({ status, file: originalFile ? `${originalFile} → ${file}` : file });
  }
  return changes;
}

export async function gitStatus(cwd) {
  try {
    const { stdout } = await run('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ':(top)database/'], { cwd, windowsHide: true });
    return parseGitStatus(stdout);
  } catch { return []; }
}
