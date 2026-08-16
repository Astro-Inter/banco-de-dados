/**
 * Configuração central do Histórico do Banco.
 *
 * Nenhum outro módulo deve repetir estes valores: o limite de commits, o
 * tamanho máximo de diff e os nomes dos artefatos vivem apenas aqui e em
 * `database-workspace.config.json`.
 */
export const gitHistoryDefaults = {
  enabled: true,
  maxCommits: 100,
  includeDiff: true,
  maxDiffLinesPerFile: 4000,
  /** Índice leve, carregado ao abrir a página. */
  indexFile: 'git-history.json',
  /** Diretório dos detalhes por commit, carregados sob demanda. */
  detailDirectory: 'git-history'
};

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

/** Lê `git.history` do config do workspace aplicando os padrões acima. */
export function gitHistorySettings(config = {}) {
  const raw = config?.git?.history ?? {};
  return {
    ...gitHistoryDefaults,
    enabled: raw.enabled !== false,
    maxCommits: positiveInteger(raw.maxCommits, gitHistoryDefaults.maxCommits),
    includeDiff: raw.includeDiff !== false,
    maxDiffLinesPerFile: positiveInteger(raw.maxDiffLinesPerFile, gitHistoryDefaults.maxDiffLinesPerFile)
  };
}
