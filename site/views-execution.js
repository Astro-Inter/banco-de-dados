import { escapeHtml, formatDate, icon, labels } from './utils.js';
import { empty, pageHead } from './views.js';

/**
 * Página "Executar Banco".
 *
 * Reutiliza integralmente a identidade visual da V1 (cards, botões, campos,
 * pills, tabelas e estados vazios). Cada estado é representado por um glifo,
 * um rótulo textual e só então por cor — nunca apenas por cor.
 */
const statusPresentation = {
  pending: { icon: 'minus', label: 'Pendente', tone: 'neutral' },
  running: { icon: 'hourglass', label: 'Executando', tone: 'info' },
  success: { icon: 'checkCircle', label: 'Sucesso', tone: 'success' },
  error: { icon: 'error', label: 'Erro', tone: 'danger' },
  skipped: { icon: 'eyeOff', label: 'Ignorado', tone: 'neutral' },
  'already-executed': { icon: 'alreadyExecuted', label: 'Já executado', tone: 'muted' },
  modified: { icon: 'edit', label: 'Modificado', tone: 'warning' },
  'admin-required': { icon: 'lock', label: 'Requer execução administrativa', tone: 'warning' },
  'not-executed': { icon: 'minus', label: 'Não executado', tone: 'neutral' },
  empty: { icon: 'documentMissing', label: 'Arquivo vazio', tone: 'muted' }
};

function statusTag(status) {
  const presentation = statusPresentation[status] ?? { icon: 'info', label: status ?? 'Desconhecido', tone: 'neutral' };
  return `<span class="status-tag tone-${presentation.tone}"><span class="status-glyph">${icon(presentation.icon, 13)}</span>${escapeHtml(presentation.label)}</span>`;
}

function duration(ms) {
  if (ms === null || ms === undefined) return '';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

export function readOnlyExecutionNotice() {
  return `${pageHead('Executar Banco', 'Execução de scripts disponível apenas no Local Mode.', 'Migration Runner')}
    <section class="card execution-locked">
      <div class="card-head"><div><p class="eyebrow">Somente leitura</p><h2>Execução de banco disponível apenas no Local Mode.</h2></div><span class="pill warning">${escapeHtml('Bloqueado')}</span></div>
      <p class="muted">Por segurança, conexões com banco de dados e execução de scripts não estão disponíveis na versão publicada.</p>
      <p class="muted">Clone o repositório e execute o Astro Database Workspace localmente para utilizar essa funcionalidade.</p>
      <pre>git clone &lt;repositório&gt;\nnpm install\nnpm run dev</pre>
      <div class="modal-actions"><button class="button ghost" data-route-link="scripts">${icon('document', 16)} Ver Scripts</button></div>
    </section>`;
}

function connectionForm(execution) {
  const form = execution.form ?? {};
  const options = (execution.config?.databases ?? [{ type: 'postgresql', label: 'PostgreSQL', available: true }])
    .map((database) => `<option value="${escapeHtml(database.type)}" ${database.available ? '' : 'disabled'} ${form.type === database.type ? 'selected' : ''}>${escapeHtml(database.label)}${database.available ? '' : ' · em breve'}</option>`)
    .join('');
  const busy = execution.status === 'connecting';
  return `<form id="connection-form" class="form-grid">
    <div class="field"><label for="connection-type">Tipo do banco</label><select id="connection-type" name="type">${options}</select></div>
    <div class="field"><label for="connection-host">Host</label><input id="connection-host" name="host" value="${escapeHtml(form.host ?? 'localhost')}" required autocomplete="off"></div>
    <div class="field"><label for="connection-port">Porta</label><input id="connection-port" name="port" type="number" min="1" max="65535" value="${escapeHtml(String(form.port ?? 5432))}" required></div>
    <div class="field"><label for="connection-database">Database</label><input id="connection-database" name="database" value="${escapeHtml(form.database ?? '')}" required autocomplete="off" placeholder="nome do banco"></div>
    <div class="field"><label for="connection-user">Usuário</label><input id="connection-user" name="user" value="${escapeHtml(form.user ?? '')}" required autocomplete="off" placeholder="usuário do banco"></div>
    <div class="field"><label for="connection-password">Senha</label><input id="connection-password" name="password" type="password" autocomplete="new-password" placeholder="••••••••"></div>
    <div class="field"><label for="connection-ssl">SSL</label><select id="connection-ssl" name="ssl"><option value="false" ${form.ssl ? '' : 'selected'}>Desativado</option><option value="true" ${form.ssl ? 'selected' : ''}>Ativado</option></select></div>
    <div class="field full execution-form-actions">
      <button class="button primary" type="submit" ${busy ? 'disabled' : ''}>${icon(busy ? 'hourglass' : 'zap', 16)} ${busy ? 'Conectando…' : 'Testar conexão'}</button>
      <span class="muted">A senha é usada apenas nesta chamada e nunca é gravada em disco, em configuração ou em log.</span>
    </div>
  </form>`;
}

export function connectionSection(execution) {
  const connected = execution.status === 'connected' && execution.connection;
  const state = connected
    ? `<div class="execution-state tone-success"><span class="status-glyph">${icon('checkCircle', 16)}</span><div><strong>Conectado</strong><small>${escapeHtml(execution.connection.version ?? 'PostgreSQL')}</small></div></div>`
    : execution.status === 'connecting'
      ? `<div class="execution-state tone-info"><span class="status-glyph">${icon('hourglass', 16)}</span><div><strong>Conectando…</strong><small>Validando as credenciais no backend local.</small></div></div>`
      : execution.status === 'error'
        ? `<div class="execution-state tone-danger"><span class="status-glyph">${icon('error', 16)}</span><div><strong>${escapeHtml(execution.connectionError ?? 'Não foi possível conectar ao banco.')}</strong><small>${escapeHtml(execution.connectionDetail ?? 'Confira host, porta, database, usuário e senha e tente novamente.')}</small></div></div>`
        : `<div class="execution-state tone-neutral"><span class="status-glyph">${icon('minus', 16)}</span><div><strong>Não conectado</strong><small>Informe os dados do banco e teste a conexão.</small></div></div>`;

  const body = connected
    ? `<div class="detail-meta connection-summary">
        <span>${escapeHtml(execution.connection.type === 'postgresql' ? 'PostgreSQL' : execution.connection.type)}</span>
        <span>${escapeHtml(execution.connection.host)}:${escapeHtml(String(execution.connection.port))}</span>
        <span>Database: ${escapeHtml(execution.connection.database)}</span>
        <span>Usuário: ${escapeHtml(execution.connection.user)}</span>
        <span>SSL: ${execution.connection.ssl ? 'Ativado' : 'Desativado'}</span>
      </div>
      <div class="modal-actions"><button class="button ghost" data-execution-action="disconnect">${icon('lock', 16)} Desconectar</button></div>`
    : connectionForm(execution);

  return `<div class="card-head"><div><p class="eyebrow">Conexão</p><h2>Banco de destino</h2></div>${connected ? '<span class="pill success">Conectado</span>' : '<span class="pill">Local Mode</span>'}</div>
    ${state}
    ${body}`;
}

function planItemRow(item) {
  const types = item.types.length ? item.types.map((type) => `<span class="pill">${escapeHtml(labels[type] ?? type)}</span>`).join(' ') : '<span class="pill">Script</span>';
  const decision = item.status === 'modified'
    ? `<div class="plan-decision"><span class="muted">Este arquivo já foi executado antes, mas seu conteúdo mudou.</span><button class="filter-button ${item.decision === 'skip' ? 'active' : ''}" data-execution-decision="skip" data-path="${escapeHtml(item.path)}">Ignorar</button><button class="filter-button ${item.decision === 'rerun' ? 'active' : ''}" data-execution-decision="rerun" data-path="${escapeHtml(item.path)}">Executar novamente</button></div>`
    : '';
  const admin = item.status === 'admin-required'
    ? '<div class="readonly-note">Contém CREATE/DROP DATABASE. Execute esse arquivo manualmente em uma sessão administrativa; o runner não o executa automaticamente.</div>'
    : '';
  const destructive = (item.destructive ?? []).length
    ? `<ul class="destructive-list">${item.destructive.map((finding) => `<li><strong>${escapeHtml(finding.operation)}</strong>${finding.target ? ` ${escapeHtml(finding.target)}` : ''} <small>linha ${finding.line} · ${escapeHtml(finding.message)}</small></li>`).join('')}</ul>`
    : '';
  return `<li class="plan-item">
    <span class="plan-order">${String(item.order).padStart(2, '0')}</span>
    <div class="plan-body">
      <strong>${escapeHtml(item.name)}</strong>
      <small>${escapeHtml(item.path)}${item.dependsOn.length ? ` · depende de ${escapeHtml(item.dependsOn.map((path) => path.split('/').at(-1)).join(', '))}` : ''}</small>
      ${admin}${decision}${destructive}
    </div>
    <div class="plan-meta">${types} ${statusTag(item.status)}</div>
  </li>`;
}

export function planSection(execution) {
  const plan = execution.plan;
  const head = `<div class="card-head"><div><p class="eyebrow">${icon('steps', 14)}Plano de execução</p><h2>Ordem calculada por dependência</h2></div><button class="button ${plan ? 'ghost' : 'primary'}" data-execution-action="plan" ${execution.planning ? 'disabled' : ''}>${icon(execution.planning ? 'hourglass' : 'refresh', 16)} ${execution.planning ? 'Gerando…' : plan ? 'Regerar plano' : 'Gerar plano'}</button></div>`;
  if (!plan) return `${head}${empty('Gere o plano para ver em que ordem os arquivos SQL serão executados.')}`;

  const summary = Object.entries(plan.summary.byType)
    .map(([type, count]) => `<div class="stat"><strong>${count}</strong><span>${escapeHtml(labels[type] ?? type)}</span></div>`)
    .join('');

  const cycles = plan.hasCycles
    ? `<div class="execution-alert tone-danger"><strong>Dependência circular detectada.</strong><p>Não foi possível gerar uma ordem segura de execução.</p><p>Objetos envolvidos:</p><ul>${plan.cycles.flatMap((cycle) => (cycle.objects.length ? cycle.objects : cycle.files)).map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul></div>`
    : '';

  const missing = plan.missingDependencies.length
    ? `<div class="execution-alert tone-warning"><strong>Dependências não encontradas nos arquivos SQL.</strong><ul>${plan.missingDependencies.map((entry) => `<li><strong>${escapeHtml(entry.object)}</strong> depende de <strong>${escapeHtml(entry.missing.join(', '))}</strong>, mas esse objeto não foi encontrado nos arquivos SQL.</li>`).join('')}</ul></div>`
    : '';

  return `${head}
    <div class="detail-meta"><span>${plan.summary.total} scripts</span><span>${plan.summary.willExecute} serão executados</span><span>${plan.summary.alreadyExecuted} já executados</span><span>${plan.summary.modified} modificados</span><span>Transação: ${escapeHtml(plan.transactionMode)}</span></div>
    <section class="stats">${summary}</section>
    ${cycles}${missing}
    <ul class="plan-list">${plan.items.map(planItemRow).join('')}</ul>`;
}

export function validationSection(execution) {
  const validation = execution.validation;
  const head = `<div class="card-head"><div><p class="eyebrow">Validação</p><h2>Verificação antes de executar</h2></div><button class="button ${validation ? 'ghost' : 'primary'}" data-execution-action="validate" ${execution.validating || !execution.plan ? 'disabled' : ''}>${icon(execution.validating ? 'hourglass' : 'check', 16)} ${execution.validating ? 'Validando…' : 'Validar migração'}</button></div>`;
  if (!validation) return `${head}${empty(execution.plan ? 'Valide a migração para conferir conexão, dialeto, dependências, ciclos e riscos.' : 'Gere o plano antes de validar a migração.')}`;

  const tone = { ok: 'success', warning: 'warning', error: 'danger' };
  const glyph = { ok: 'checkCircle', warning: 'info', error: 'error' };
  const rows = validation.checks.map((check) => `<li class="check-row tone-${tone[check.status]}">
    <span class="status-glyph">${icon(glyph[check.status], 15)}</span>
    <div><strong>${escapeHtml(check.label)}</strong>${check.detail ? `<small>${escapeHtml(check.detail)}</small>` : ''}</div>
    <span class="pill ${check.status === 'ok' ? 'success' : check.status === 'warning' ? 'warning' : 'danger'}">${check.status === 'ok' ? 'OK' : check.status === 'warning' ? 'Aviso' : 'Erro'}</span>
  </li>`).join('');

  return `${head}
    <div class="detail-meta"><span>${validation.errors.length} erro(s)</span><span>${validation.warnings.length} aviso(s)</span><span>${validation.destructive.length} operação(ões) destrutiva(s) no que será executado</span></div>
    <ul class="check-list">${rows}</ul>`;
}

function destructiveConfirmation(execution) {
  const validation = execution.validation;
  if (!validation?.requiresConfirmation) return '';
  return `<div class="execution-alert tone-danger">
    <strong>Operação destrutiva detectada</strong>
    <ul>${validation.destructive.slice(0, 8).map((finding) => `<li><strong>${escapeHtml(finding.operation)}</strong>${finding.target ? ` ${escapeHtml(finding.target)}` : ''} · <span class="muted">${escapeHtml(finding.file ?? '')} (linha ${finding.line})</span><br><small>${escapeHtml(finding.message)}</small></li>`).join('')}</ul>
    <div class="field"><label for="execution-confirmation">Digite EXECUTAR para confirmar:</label><input id="execution-confirmation" autocomplete="off" placeholder="EXECUTAR" value="${escapeHtml(execution.confirmation ?? '')}"></div>
  </div>`;
}

function runItemRow(item) {
  const time = item.durationMs !== null ? `<small>${duration(item.durationMs)}</small>` : item.status === 'running' ? '<small>Executando…</small>' : '';
  const error = item.error
    ? `<div class="execution-alert tone-danger run-error">
        <strong>Erro PostgreSQL</strong>
        <p>${escapeHtml(item.error.message)}</p>
        <div class="detail-meta">${item.error.code ? `<span>SQLSTATE ${escapeHtml(item.error.code)}</span>` : ''}${item.error.position ? `<span>Posição ${escapeHtml(String(item.error.position))}</span>` : ''}${item.error.line ? `<span>Linha aproximada ${escapeHtml(String(item.error.line))}</span>` : ''}</div>
        <p class="muted">Arquivo: ${escapeHtml(item.path)}</p>
        ${item.error.detail ? `<p class="muted">${escapeHtml(item.error.detail)}</p>` : ''}
        ${item.error.hint ? `<p class="muted">Dica: ${escapeHtml(item.error.hint)}</p>` : ''}
        <button class="button ghost" data-file-path="${escapeHtml(item.path)}">${icon('document', 16)} Ver Script</button>
      </div>`
    : '';
  return `<li class="run-item"><div class="run-line">${statusTag(item.status)}<div class="run-body"><strong>${escapeHtml(item.name)}</strong>${time}</div></div>${error}</li>`;
}

function runReport(run) {
  if (!run || run.state === 'running') return '';
  const summary = run.summary;
  const rows = run.items
    .filter((item) => ['success', 'error'].includes(item.status))
    .map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${statusTag(item.status)}</td><td>${duration(item.durationMs)}</td></tr>`)
    .join('');
  return `<div class="execution-alert ${run.state === 'failed' ? 'tone-danger' : 'tone-success'}">
      <strong>${run.state === 'failed' ? 'Migração interrompida' : 'Migração concluída'}</strong>
      <div class="detail-meta"><span>Executados: ${summary.executed}</span><span>Já executados: ${summary.alreadyExecuted}</span><span>Ignorados: ${summary.skipped}</span><span>Não executados: ${summary.notExecuted}</span><span>Erros: ${summary.errors}</span><span>Tempo total: ${duration(summary.totalMs)}</span></div>
    </div>
    ${rows ? `<div class="table-wrap"><table><thead><tr><th>Arquivo</th><th>Status</th><th>Tempo</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}`;
}

export function runSection(execution) {
  const validation = execution.validation;
  const confirmed = !validation?.requiresConfirmation || execution.confirmation === 'EXECUTAR';
  const enabled = Boolean(validation?.canExecute) && confirmed && !execution.running;
  const head = `<div class="card-head"><div><p class="eyebrow">Execução</p><h2>Aplicar os scripts no banco</h2></div><button class="button primary" data-execution-action="execute" ${enabled ? '' : 'disabled'}>${icon(execution.running ? 'hourglass' : 'zap', 16)} ${execution.running ? 'Executando…' : 'Executar Banco'}</button></div>`;

  const blocked = !validation
    ? 'Valide a migração para habilitar a execução.'
    : !validation.canExecute
      ? (validation.reason ?? 'A validação impede a execução.')
      : !confirmed ? 'Digite EXECUTAR no campo de confirmação para habilitar o botão.' : null;

  return `${head}
    ${destructiveConfirmation(execution)}
    ${blocked ? `<div class="readonly-note">${escapeHtml(blocked)}</div>` : ''}
    ${execution.run ? `<ul class="run-list">${execution.run.items.map(runItemRow).join('')}</ul>${runReport(execution.run)}` : empty('O progresso de cada script aparecerá aqui durante a execução.')}`;
}

export function historySection(execution) {
  const head = `<div class="card-head"><div><p class="eyebrow">${icon('history', 14)}Histórico</p><h2>Histórico de Execuções</h2></div><button class="button ghost" data-execution-action="history" ${execution.status === 'connected' ? '' : 'disabled'}>${icon('refresh', 16)} Atualizar</button></div>`;
  if (execution.status !== 'connected') return `${head}${empty('Conecte-se a um banco para consultar o histórico registrado em _astroworkspace_migrations.')}`;
  const migrations = execution.migrations;
  if (!migrations) return `${head}${empty('Clique em Atualizar para carregar o histórico gravado no banco.')}`;
  if (!migrations.length) return `${head}${empty('Nenhuma migração foi registrada neste banco ainda.')}`;

  const planByPath = new Map((execution.plan?.items ?? []).map((item) => [item.path, item]));
  const rows = migrations.map((entry) => {
    const planned = planByPath.get(entry.file_path);
    const status = entry.status === 'error' ? 'error' : planned?.status === 'modified' ? 'modified' : 'already-executed';
    return `<tr><td><strong>${escapeHtml(entry.file_name)}</strong><small class="column-comment">${escapeHtml(entry.file_path)}</small></td><td>${statusTag(status)}</td><td>${escapeHtml(formatDate(entry.executed_at))}</td><td>${duration(entry.duration_ms)}</td></tr>`;
  }).join('');
  return `${head}<div class="table-wrap"><table><thead><tr><th>Arquivo</th><th>Status</th><th>Executado em</th><th>Tempo</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function executionView(execution, mode) {
  if (!mode.editable) return readOnlyExecutionNotice();
  if (execution.config && execution.config.enabled === false) {
    return `${pageHead('Executar Banco', 'Execução desabilitada na configuração do projeto.', 'Migration Runner')}
      <section class="card"><div class="readonly-note"><strong>Execução desabilitada.</strong><br>Defina <code>"execution": { "enabled": true }</code> em <code>database-workspace.config.json</code> para liberar esta página.</div></section>`;
  }
  return `${pageHead('Executar Banco', 'Conecte um banco PostgreSQL e execute os scripts do projeto na ordem calculada pelo grafo de dependências.', 'Migration Runner')}
    <section class="card" id="execution-connection">${connectionSection(execution)}</section>
    <section class="card execution-card" id="execution-plan">${planSection(execution)}</section>
    <section class="card execution-card" id="execution-validation">${validationSection(execution)}</section>
    <section class="card execution-card" id="execution-run">${runSection(execution)}</section>
    <section class="card execution-card" id="execution-history">${historySection(execution)}</section>`;
}
