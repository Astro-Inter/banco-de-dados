/**
 * Acesso somente leitura ao Git.
 *
 * O Astro não é um cliente Git: aqui existem apenas `rev-parse`, `log` e
 * `show`. Nenhum comando escreve no repositório, os argumentos são sempre
 * fixos (nunca uma string de shell) e a ausência do Git nunca é um erro fatal.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Diffs de 100 commits cabem folgados; o padrão de 1 MB do Node não. */
const maxBuffer = 64 * 1024 * 1024;

export async function git(args, cwd) {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer, windowsHide: true });
  return stdout;
}

export async function isGitRepository(cwd) {
  try {
    return (await git(['rev-parse', '--is-inside-work-tree'], cwd)).trim() === 'true';
  } catch { return false; }
}

/** Um repositório recém-criado é válido, mas ainda não tem HEAD. */
export async function hasCommits(cwd) {
  try {
    await git(['rev-parse', '--verify', 'HEAD'], cwd);
    return true;
  } catch { return false; }
}

/**
 * Branch publicada.
 *
 * No GitHub Actions o checkout costuma ficar em detached HEAD, então o contexto
 * do workflow (`GITHUB_HEAD_REF` para pull requests, `GITHUB_REF_NAME` para
 * push) vale mais do que o `rev-parse` local.
 */
export async function detectBranch(cwd, environment = process.env) {
  const fromWorkflow = String(environment.GITHUB_HEAD_REF || environment.GITHUB_REF_NAME || '').trim();
  if (fromWorkflow) return fromWorkflow;
  try {
    const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)).trim();
    return branch && branch !== 'HEAD' ? branch : null;
  } catch { return null; }
}

/** Commit que originou a documentação. `%h` é o mesmo abreviador usado no log. */
export async function headCommit(cwd) {
  try {
    const [hash, shortHash] = (await git(['log', '-1', '--format=%H\x1f%h'], cwd)).trim().split('\x1f');
    return { hash: hash || null, shortHash: shortHash || null };
  } catch { return { hash: null, shortHash: null }; }
}
