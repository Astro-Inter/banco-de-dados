import { destructiveSummary } from './destructive-analyzer.js';

/**
 * Validação da migração. É uma função pura sobre o plano e o snapshot do
 * analyzer: não abre conexões e não toca no filesystem, o que a torna
 * testável sem um PostgreSQL real.
 */
function check(id, label, status, detail = null) {
  return { id, label, status, detail };
}

const dialectAliases = { postgres: 'postgresql', postgresql: 'postgresql' };

export function validateMigration({ plan, database = {}, connection = null } = {}) {
  const checks = [];
  const items = plan?.items ?? [];

  checks.push(connection
    ? check('connection', 'Conexão válida', 'ok', `${connection.type} · ${connection.host}:${connection.port} · ${connection.database}`)
    : check('connection', 'Conexão não estabelecida', 'error', 'Teste a conexão antes de validar a migração.'));

  const projectDialect = dialectAliases[String(database.dialect ?? '').toLowerCase()] ?? String(database.dialect ?? '');
  const targetDialect = dialectAliases[String(connection?.type ?? '').toLowerCase()] ?? String(connection?.type ?? '');
  if (!connection) {
    checks.push(check('dialect', 'Dialeto não verificado', 'warning', 'Conecte-se para comparar o dialeto do projeto com o do banco alvo.'));
  } else if (projectDialect && targetDialect && projectDialect !== targetDialect) {
    checks.push(check('dialect', 'Dialeto incompatível', 'error', `Os scripts são ${projectDialect} e o banco alvo é ${targetDialect}. Esta versão não converte dialetos.`));
  } else {
    checks.push(check('dialect', 'PostgreSQL compatível', 'ok', `Scripts e banco alvo usam ${projectDialect || targetDialect}.`));
  }

  checks.push(items.length
    ? check('files', `${items.length} scripts encontrados`, 'ok')
    : check('files', 'Nenhum script encontrado', 'error', 'Adicione arquivos .sql às pastas configuradas e execute o analyzer.'));

  const empties = items.filter((item) => item.empty);
  if (empties.length) checks.push(check('empty-files', `${empties.length} arquivo(s) vazio(s)`, 'warning', empties.map((item) => item.path).join(', ')));

  const parserIssues = (database.issues ?? []).filter((issue) => issue.severity === 'error');
  const parserWarnings = (database.issues ?? []).filter((issue) => issue.severity !== 'error');
  if (parserIssues.length) checks.push(check('parser', `${parserIssues.length} erro(s) de parser`, 'error', parserIssues.map((issue) => `${issue.file}: ${issue.message}`).join(' · ')));
  else if (parserWarnings.length) checks.push(check('parser', `${parserWarnings.length} aviso(s) do analyzer`, 'warning', parserWarnings.map((issue) => `${issue.file}: ${issue.message}`).join(' · ')));
  else checks.push(check('parser', 'Nenhum erro de interpretação', 'ok'));

  const missing = plan?.missingDependencies ?? [];
  checks.push(missing.length
    ? check('missing-dependencies', `${missing.length} dependência(s) não encontrada(s)`, 'warning',
      missing.map((entry) => `${entry.object} depende de ${entry.missing.join(', ')}, que não foi encontrado nos arquivos SQL.`).join(' · '))
    : check('dependencies', 'Dependências válidas', 'ok'));

  const cycles = plan?.cycles ?? [];
  if (cycles.length) {
    checks.push(check('cycles', 'Dependência circular detectada', 'error',
      cycles.map((cycle) => (cycle.objects.length ? cycle.objects.join(' → ') : cycle.files.join(' → '))).join(' · ')));
  } else {
    checks.push(check('cycles', 'Nenhuma dependência circular', 'ok'));
  }

  checks.push(cycles.length
    ? check('order', 'Ordem de execução não pôde ser calculada', 'error', 'Resolva as dependências circulares para gerar uma ordem segura.')
    : check('order', 'Ordem de execução calculada', 'ok', `${plan?.summary?.willExecute ?? 0} script(s) serão executados.`));

  const destructive = items.flatMap((item) => item.destructive ?? []);
  const destructiveInExecution = items.filter((item) => item.willExecute).flatMap((item) => item.destructive ?? []);
  if (destructive.length) {
    const summary = destructiveSummary(destructive);
    checks.push(check('destructive', `${summary.total} operação(ões) destrutiva(s) detectada(s)`, 'warning',
      `${summary.critical} crítica(s) · ${destructive.slice(0, 5).map((finding) => `${finding.operation} em ${finding.file}`).join(' · ')}`));
  } else {
    checks.push(check('destructive', 'Nenhuma operação destrutiva detectada', 'ok'));
  }

  const already = items.filter((item) => item.status === 'already-executed');
  if (already.length) checks.push(check('already-executed', `${already.length} script(s) já executado(s)`, 'ok', 'Serão ignorados porque o checksum não mudou.'));

  const modified = items.filter((item) => item.status === 'modified');
  if (modified.length) {
    checks.push(check('modified', `${modified.length} script(s) alterado(s) após a execução`, 'warning',
      `${modified.map((item) => item.name).join(', ')} — escolha entre ignorar ou executar novamente.`));
  }

  const admin = items.filter((item) => item.status === 'admin-required');
  if (admin.length) {
    checks.push(check('admin', `${admin.length} script(s) exigem execução administrativa`, 'warning',
      `${admin.map((item) => item.name).join(', ')} contém CREATE/DROP DATABASE e não é executado automaticamente.`));
  }

  const errors = checks.filter((entry) => entry.status === 'error');
  const warnings = checks.filter((entry) => entry.status === 'warning');
  const willExecute = plan?.summary?.willExecute ?? 0;

  return {
    checks,
    errors,
    warnings,
    destructive: destructiveInExecution,
    destructiveSummary: destructiveSummary(destructiveInExecution),
    requiresConfirmation: destructiveInExecution.length > 0,
    canExecute: errors.length === 0 && willExecute > 0,
    reason: errors.length
      ? 'Corrija os erros da validação antes de executar.'
      : willExecute === 0 ? 'Nenhum script pendente para executar.' : null
  };
}
