/**
 * Gerador do Histórico do Banco.
 *
 * Lê o histórico Git do repositório e produz uma documentação ESTÁTICA da
 * evolução dos arquivos SQL. O visitante do GitHub Pages não precisa de Git,
 * API, token nem backend: ele lê apenas os JSON gerados aqui.
 *
 *   Git → filtro SQL → generated/git-history.json → dist/ → GitHub Pages
 *
 * A ausência de Git (projeto baixado como ZIP) não é erro: o gerador devolve
 * `available: false` e o restante do Astro continua funcionando.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, workspaceRoot } from '../config.js';
import { detectBranch, git, hasCommits, headCommit, isGitRepository } from './git-commands.js';
import { gitHistorySettings } from './history-config.js';
import { LOG_FORMAT, parseCommitLog, parseUnifiedDiff, summarizeFiles } from './log-parser.js';
import { createSqlScope } from './sql-scope.js';

export const historyReasons = {
  noGit: 'Este projeto não possui um repositório Git local.',
  noCommits: 'O repositório ainda não possui commits.',
  disabled: 'O Histórico do Banco está desativado na configuração do workspace.'
};

function unavailable(reason, message, settings, extra = {}) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    available: false,
    reason,
    message,
    branch: null,
    currentCommit: null,
    currentShortCommit: null,
    documentVersion: null,
    totalCommits: 0,
    truncated: false,
    commits: [],
    config: publicSettings(settings),
    ...extra
  };
}

function publicSettings(settings) {
  return {
    maxCommits: settings.maxCommits,
    includeDiff: settings.includeDiff,
    maxDiffLinesPerFile: settings.maxDiffLinesPerFile,
    detailDirectory: settings.detailDirectory
  };
}

/** Diffs de um commit, restritos aos arquivos SQL — nunca ao commit inteiro. */
async function commitDiff(root, commit, settings) {
  const targets = [...new Set(commit.files.flatMap((file) => [file.path, file.oldPath]).filter(Boolean))];
  if (!targets.length) return [];
  try {
    const patch = await git(['show', commit.hash, '--format=', '-M', '--unified=3', '--', ...targets], root);
    return parseUnifiedDiff(patch, { maxLines: settings.maxDiffLinesPerFile });
  } catch {
    // Um commit sem diff legível (merge, por exemplo) não invalida o histórico.
    return [];
  }
}

/**
 * @param {object} options
 * @param {string} options.root  raiz do repositório (o workspace, por padrão)
 * @param {boolean} options.write grava os artefatos em `generated/`
 */
export async function generateGitHistory({ root = workspaceRoot, config, write = true, environment = process.env } = {}) {
  const resolvedConfig = config ?? await loadConfig();
  const settings = gitHistorySettings(resolvedConfig);
  const generatedDirectory = path.resolve(root, resolvedConfig.generated ?? 'generated');

  const finish = async (result) => {
    if (write) await writeHistory(generatedDirectory, settings, result);
    return result.index ?? result;
  };

  if (!settings.enabled) return finish({ index: unavailable('disabled', historyReasons.disabled, settings), details: [] });
  if (!await isGitRepository(root)) return finish({ index: unavailable('no-git', historyReasons.noGit, settings), details: [] });
  if (!await hasCommits(root)) return finish({ index: unavailable('no-commits', historyReasons.noCommits, settings), details: [] });

  const scope = createSqlScope(resolvedConfig.database?.paths);
  const [branch, head] = await Promise.all([detectBranch(root, environment), headCommit(root)]);

  const stdout = await git([
    'log',
    `-n${settings.maxCommits}`,
    '-M',
    '--name-status',
    '--no-color',
    `--format=${LOG_FORMAT}`,
    '--',
    ...scope.directories
  ], root);

  const commits = parseCommitLog(stdout, scope);
  const details = [];

  for (const commit of commits) {
    const diffs = settings.includeDiff ? await commitDiff(root, commit, settings) : [];
    const byPath = new Map(diffs.map((diff) => [diff.path, diff]));

    commit.files = commit.files.map((file) => {
      const diff = byPath.get(file.path) ?? (file.oldPath ? byPath.get(file.oldPath) : null);
      return {
        ...file,
        insertions: diff?.insertions ?? 0,
        deletions: diff?.deletions ?? 0,
        hasDiff: Boolean(diff && diff.rows.length)
      };
    });

    if (settings.includeDiff) {
      details.push({
        hash: commit.hash,
        shortHash: commit.shortHash,
        files: commit.files.map((file) => {
          const diff = byPath.get(file.path) ?? (file.oldPath ? byPath.get(file.oldPath) : null);
          return {
            path: file.path,
            oldPath: file.oldPath,
            status: file.status,
            category: file.category,
            rows: diff?.rows ?? [],
            totalRows: diff?.totalRows ?? 0,
            truncated: diff?.truncated ?? false,
            binary: diff?.binary ?? false
          };
        })
      });
    }
  }

  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    available: true,
    reason: null,
    message: null,
    branch,
    currentCommit: head.hash,
    currentShortCommit: head.shortHash,
    documentVersion: head.shortHash ? `${branch ?? 'detached'}@${head.shortHash}` : null,
    // As pastas ficam no artefato para que o frontend nunca escreva um caminho fixo.
    paths: scope.categories,
    totalCommits: commits.length,
    truncated: commits.length >= settings.maxCommits,
    config: publicSettings(settings),
    commits: commits.map((commit) => ({
      hash: commit.hash,
      shortHash: commit.shortHash,
      subject: commit.subject,
      message: commit.message,
      // O e-mail do autor nunca entra no artefato publicado.
      author: commit.author,
      date: commit.date,
      stats: summarizeFiles(commit.files),
      files: commit.files
    }))
  };

  return finish({ index, details });
}

async function writeHistory(generatedDirectory, settings, { index, details = [] }) {
  const detailDirectory = path.join(generatedDirectory, settings.detailDirectory);
  await fs.mkdir(generatedDirectory, { recursive: true });
  // Os detalhes são reescritos do zero: um commit removido do limite não pode
  // continuar publicado.
  await fs.rm(detailDirectory, { recursive: true, force: true });
  await fs.writeFile(path.join(generatedDirectory, settings.indexFile), JSON.stringify(index, null, 2));
  if (!details.length) return;
  await fs.mkdir(detailDirectory, { recursive: true });
  await Promise.all(details.map((detail) => fs.writeFile(
    path.join(detailDirectory, `${detail.shortHash}.json`),
    JSON.stringify(detail, null, 2)
  )));
}
