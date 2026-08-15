import { generateGitHistory } from '../analyzer/git/history.js';

/**
 * Gera `generated/git-history.json` (e os detalhes por commit) a partir do
 * histórico Git. Roda junto do `npm run build` e pode ser executado sozinho
 * com `npm run git-history`.
 */
const history = await generateGitHistory();

if (!history.available) {
  console.log(`Histórico Git indisponível: ${history.message}`);
  console.log('O restante da documentação continua sendo gerado normalmente.');
} else if (!history.commits.length) {
  console.log('Histórico do Banco: nenhuma alteração SQL encontrada no histórico.');
} else {
  const version = history.documentVersion ?? history.currentShortCommit;
  console.log(`Histórico do Banco: ${history.commits.length} commit(s) com alterações SQL (${version}).`);
}
