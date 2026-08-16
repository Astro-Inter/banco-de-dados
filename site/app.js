import { api, detectMode, loadDatabase } from './services/api.js';
import { analyzeImpactClient, findObjectPath } from './services/analysis.js';
import {
  changes,
  databaseView,
  dataLoadView,
  dependencyView,
  diffMarkup,
  explorer,
  filePill,
  impactResult,
  impactView,
  logsView,
  mainTablesFile,
  modeling,
  newFileCategories,
  newLogTableTemplate,
  objectCategoryView,
  overview,
  scriptsView,
  searchResults,
  tableDetail
} from './views.js';
import { historyView } from './views-history.js';
import { loadCommitDetail, loadGitHistory } from './services/git-history.js';
import { diffLines, escapeHtml, icon, isTableLike } from './utils.js';
import { createModelState } from './components/database-model/model-state.js';
import { mountModel } from './components/database-model/model-interactions.js';
import { executionApi } from './services/execution-api.js';
import {
  connectionSection,
  executionView,
  historySection,
  planSection,
  runSection,
  validationSection
} from './views-execution.js';

const state = {
  mode: { mode: 'readonly', editable: false },
  database: null,
  filter: 'all',
  databaseTab: 'list',
  selectedId: null,
  selectedFilePath: null,
  fileCategory: 'all',
  dependencyFocus: 'all',
  query: '',
  zoom: 1,
  editingItem: null,
  // Estado da modelagem física (zoom, filtros, seleção e posições arrastadas).
  model: createModelState(),
  /**
   * Histórico do Banco. Somente leitura, alimentado pelos artefatos estáticos:
   * o índice vem inteiro e o diff de cada commit é buscado ao abrir o commit.
   */
  history: {
    data: null,
    loading: false,
    error: null,
    detailError: null,
    query: '',
    category: 'all',
    status: 'all',
    openCommit: null,
    details: {},
    openFiles: [],
    revealedDiffs: []
  },
  // A senha nunca entra neste estado: ela existe apenas no envio do formulário.
  execution: {
    status: 'disconnected',
    config: null,
    form: { type: 'postgresql', host: 'localhost', port: 5432, database: '', user: '', ssl: false },
    connection: null,
    connectionError: null,
    connectionDetail: null,
    plan: null,
    planning: false,
    validation: null,
    validating: false,
    decisions: {},
    confirmation: '',
    run: null,
    running: false,
    migrations: null
  }
};

window.appState = state;

const content = document.querySelector('#content');
const modal = document.querySelector('#modal');

function closeModal() {
  if (modal.open) modal.close();
  resetModalSize();
  state.editingItem = null;
}

/**
 * Clicar fora do conteúdo fecha o modal. O `<dialog>` ocupa a tela inteira com
 * o backdrop, então um clique no backdrop tem o próprio dialog como alvo.
 */
modal.addEventListener('mousedown', (event) => {
  if (event.target !== modal) return;
  const box = modal.getBoundingClientRect();
  const inside = event.clientX >= box.left && event.clientX <= box.right
    && event.clientY >= box.top && event.clientY <= box.bottom;
  if (!inside) closeModal();
});

function toast(message) {
  const element = document.createElement('div');
  element.className = 'toast';
  element.textContent = message;
  document.querySelector('#toast-region').append(element);
  // Sai desaparecendo, em vez de sumir de um quadro para o outro.
  setTimeout(() => {
    element.classList.add('is-leaving');
    setTimeout(() => element.remove(), 220);
  }, 3300);
}

function currentRoute() {
  const [, route = 'overview'] = location.hash.match(/^#\/([^/?]+)/) ?? [];
  return route;
}

function setActiveNavigation(route) {
  document.querySelectorAll('[data-route]').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === route);
  });
}

function fileAsEditableItem(file) {
  const related = state.database.objects.filter((object) => object.file === file.path);
  return {
    kind: 'file',
    id: `file:${file.path}`,
    name: file.path.split('/').at(-1),
    type: 'file',
    file: file.path,
    code: file.content ?? '',
    usedBy: [...new Set(related.flatMap((object) => object.usedBy ?? []))],
    relatedObjects: related.map((object) => object.name)
  };
}

async function refreshDatabase() {
  state.database = await loadDatabase(state.mode);
  const generationLabel = document.querySelector('#generation-label');
  if (generationLabel) {
    const when = state.database.generatedAt
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(state.database.generatedAt))
      : 'não disponível';
    generationLabel.textContent = `Documentação gerada em ${when}`;
  }
}

async function loadChanges() {
  const container = document.querySelector('#changes-list');
  if (!container) return;
  try {
    const values = await api('changes');
    container.innerHTML = values.length
      ? `<ul class="list">${values.map((change) => `<li class="list-item"><span class="type-icon">${icon('refresh', 16)}</span><div><strong>${escapeHtml(change.file)}</strong><small>${escapeHtml(change.status.trim() || 'M')} · alteração detectada pelo Git</small></div></li>`).join('')}</ul>`
      : '<div class="empty"><strong>Workspace limpo.</strong><p>Nenhuma alteração foi identificada pelo Git.</p></div>';
  } catch (error) {
    container.innerHTML = `<div class="empty"><strong>Não foi possível consultar o Git.</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

/**
 * Índice do Histórico do Banco.
 *
 * O mesmo caminho de código serve Local Mode e Read Only: os dois leem o JSON
 * gerado no build. A página nunca executa Git no navegador.
 */
async function loadHistory() {
  state.history.loading = true;
  state.history.error = null;
  render();
  try {
    state.history.data = await loadGitHistory();
  } catch (error) {
    state.history.error = error.message;
  } finally {
    state.history.loading = false;
    render();
  }
}

/** Diff de um commit: buscado apenas quando o commit é aberto. */
async function ensureCommitDetail(shortHash) {
  if (state.history.details[shortHash]) return;
  try {
    state.history.details[shortHash] = await loadCommitDetail(state.history.data, shortHash);
    state.history.detailError = null;
  } catch (error) {
    state.history.detailError = error.message;
  }
  if (currentRoute() === 'history') render();
}

const executionSections = {
  connection: connectionSection,
  plan: planSection,
  validation: validationSection,
  run: runSection,
  history: historySection
};

function renderExecutionSection(...names) {
  for (const name of names) {
    const container = document.querySelector(`#execution-${name}`);
    if (container) container.innerHTML = executionSections[name](state.execution);
  }
}

function executionSessionId() {
  return state.execution.connection?.sessionId ?? null;
}

async function loadExecutionConfig() {
  try {
    state.execution.config = await executionApi.config();
    if (state.execution.config.enabled === false && currentRoute() === 'execution') render();
  } catch { /* o formulário continua com os padrões PostgreSQL */ }
}

/** Lê o formulário. A senha fica apenas nesta variável local, nunca no estado. */
function readConnectionForm(form) {
  const data = Object.fromEntries(new FormData(form));
  return {
    type: data.type || 'postgresql',
    host: String(data.host ?? '').trim(),
    port: Number(data.port),
    database: String(data.database ?? '').trim(),
    user: String(data.user ?? '').trim(),
    password: String(data.password ?? ''),
    ssl: data.ssl === 'true'
  };
}

function resetExecutionResults() {
  state.execution.plan = null;
  state.execution.validation = null;
  state.execution.run = null;
  state.execution.migrations = null;
  state.execution.confirmation = '';
  state.execution.decisions = {};
}

async function testConnection(form) {
  const connection = readConnectionForm(form);
  const { password, ...withoutPassword } = connection;
  state.execution.form = withoutPassword;
  state.execution.status = 'connecting';
  state.execution.connectionError = null;
  state.execution.connectionDetail = null;
  renderExecutionSection('connection');

  try {
    const result = await executionApi.testConnection(connection);
    if (result.success) {
      state.execution.status = 'connected';
      state.execution.connection = result;
      resetExecutionResults();
      toast(`Conectado a ${result.database}.`);
    } else {
      state.execution.status = 'error';
      state.execution.connectionError = result.message;
      state.execution.connectionDetail = result.detail;
    }
  } catch (error) {
    state.execution.status = 'error';
    state.execution.connectionError = error.message;
    state.execution.connectionDetail = error.details?.detail ?? null;
  }
  renderExecutionSection('connection', 'plan', 'validation', 'run', 'history');
}

async function disconnectDatabase() {
  const sessionId = executionSessionId();
  if (sessionId) await executionApi.disconnect(sessionId).catch(() => {});
  state.execution.status = 'disconnected';
  state.execution.connection = null;
  state.execution.connectionError = null;
  state.execution.connectionDetail = null;
  resetExecutionResults();
  renderExecutionSection('connection', 'plan', 'validation', 'run', 'history');
  toast('Conexão encerrada e credenciais descartadas.');
}

async function generatePlan({ silent = false } = {}) {
  state.execution.planning = true;
  if (!silent) renderExecutionSection('plan');
  try {
    const result = await executionApi.plan(executionSessionId(), state.execution.decisions);
    state.execution.plan = result.plan;
    state.execution.validation = null;
  } catch (error) {
    toast(error.message);
  } finally {
    state.execution.planning = false;
    renderExecutionSection('plan', 'validation', 'run');
  }
}

async function validateMigration() {
  state.execution.validating = true;
  renderExecutionSection('validation');
  try {
    const result = await executionApi.validate(executionSessionId(), state.execution.decisions);
    state.execution.plan = result.plan;
    state.execution.validation = result.validation;
  } catch (error) {
    toast(error.message);
  } finally {
    state.execution.validating = false;
    renderExecutionSection('plan', 'validation', 'run');
  }
}

async function pollExecution(runId) {
  while (true) {
    const run = await executionApi.run(runId);
    state.execution.run = run;
    renderExecutionSection('run');
    if (run.state !== 'running') return run;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function executeMigration() {
  const validation = state.execution.validation;
  if (!validation?.canExecute) return toast('Valide a migração antes de executar.');
  if (validation.requiresConfirmation && state.execution.confirmation !== 'EXECUTAR') {
    return toast('Digite EXECUTAR para confirmar as operações destrutivas.');
  }

  state.execution.running = true;
  renderExecutionSection('run');
  try {
    const started = await executionApi.execute(executionSessionId(), state.execution.decisions, state.execution.confirmation);
    state.execution.run = started;
    renderExecutionSection('run');
    const finished = await pollExecution(started.runId);
    toast(finished.state === 'failed' ? 'Migração interrompida por um erro.' : 'Migração concluída.');
  } catch (error) {
    if (error.details?.validation) state.execution.validation = error.details.validation;
    toast(error.message);
  } finally {
    state.execution.running = false;
    state.execution.confirmation = '';
    renderExecutionSection('run', 'validation');
    await generatePlan({ silent: true });
    await loadMigrations({ silent: true });
  }
}

async function loadMigrations({ silent = false } = {}) {
  if (state.execution.status !== 'connected') return;
  try {
    const result = await executionApi.migrations(executionSessionId());
    state.execution.migrations = result.migrations;
  } catch (error) {
    if (!silent) toast(error.message);
  }
  renderExecutionSection('history');
}

/**
 * Última rota desenhada, usada só pela animação de entrada da página.
 *
 * `render()` roda a cada tecla da busca global e a cada mudança de estado da
 * página atual — animar em todas as chamadas faria o conteúdo piscar enquanto
 * a pessoa digita. A animação entra quando a rota realmente muda.
 */
let animatedRoute = null;

function render() {
  if (!state.database) return;

  const route = currentRoute();
  setActiveNavigation(route);

  // A classe sai antes de trocar o conteúdo e só volta quando a rota mudou:
  // enquanto ela estiver aplicada, todo elemento inserido em #content anima, e
  // a busca global (que redesenha a cada tecla) piscaria a cada letra.
  const routeChanged = route !== animatedRoute;
  animatedRoute = route;
  content.classList.remove('page-enter');
  if (routeChanged) void content.offsetWidth; // Força o reflow: sem isso o navegador não reinicia a animação.

  if (route === 'overview') content.innerHTML = overview(state.database, state.mode);
  else if (route === 'database') content.innerHTML = databaseView(state.database, state.databaseTab, state.model, state.mode);
  else if (route === 'logs') content.innerHTML = logsView(state.database);
  else if (route === 'dataload') content.innerHTML = dataLoadView(state.database);
  else if (route === 'views') content.innerHTML = objectCategoryView(state.database, 'view');
  else if (route === 'procedures') content.innerHTML = objectCategoryView(state.database, 'procedure');
  else if (route === 'functions') content.innerHTML = objectCategoryView(state.database, 'function');
  else if (route === 'indexes') content.innerHTML = objectCategoryView(state.database, 'index');
  else if (route === 'triggers') content.innerHTML = objectCategoryView(state.database, 'trigger');
  else if (route === 'scripts') content.innerHTML = scriptsView(state.database, state.selectedFilePath, state.fileCategory, state.mode);
  else if (route === 'object') content.innerHTML = explorer(state.database, state.selectedId, state.filter, false);
  else if (route === 'dependencies') content.innerHTML = dependencyView(state.database, state.dependencyFocus);
  else if (route === 'impact') content.innerHTML = impactView(state.database);
  else if (route === 'modeling') content.innerHTML = modeling(state.database.models);
  else if (route === 'changes') {
    content.innerHTML = changes(state.mode);
    if (state.mode.editable) loadChanges();
  } else if (route === 'history') {
    content.innerHTML = historyView(state.history, state.database);
    if (!state.history.data && !state.history.loading && !state.history.error) loadHistory();
  } else if (route === 'execution') {
    content.innerHTML = executionView(state.execution, state.mode);
    if (state.mode.editable && !state.execution.config) loadExecutionConfig();
  } else if (route === 'search') content.innerHTML = searchResults(state.database, state.query);
  else {
    location.hash = '#/overview';
    return;
  }

  if (routeChanged) content.classList.add('page-enter');

  // A área ampliada da modelagem trava a rolagem do fundo — e só existe nela.
  const expandedModel = route === 'database' && state.databaseTab === 'model' && state.model.expanded;
  document.body.classList.toggle('model-expanded', expandedModel);

  if (route === 'database' && state.databaseTab === 'model') {
    mountModel(content, {
      database: state.database,
      state: state.model,
      rerender: render,
      onOpenTable: (id) => {
        const object = state.database.objects.find((item) => item.id === id);
        if (object) tableDetailDialog(object);
      }
    });
  }

  // Nunca roubar o foco de um campo em uso: a busca global redesenha a página a
  // cada tecla e mover o foco para o conteúdo inviabilizaria continuar digitando.
  const editing = document.activeElement?.closest?.('input, textarea, select');
  if (!editing) content.focus({ preventScroll: true });
}

function readonlyNotice() {
  modal.innerHTML = `<div class="modal-body"><p class="eyebrow">Read Only</p><h2>Edição disponível no modo local</h2><p>Esta versão não possui acesso aos arquivos locais do projeto. Para editar os scripts, clone o repositório e execute a aplicação localmente.</p><pre>npm install\nnpm run dev</pre><div class="modal-actions"><button class="button primary" data-close-modal>${icon('lock', 16)} Entendi</button></div></div>`;
  resetModalSize();
  modal.showModal();
}

/**
 * Devolve o `<dialog>` ao tamanho padrão.
 *
 * O editor cresce em largura e altura; nem todo caminho de fechamento passa
 * pelo `closeModal()`, então cada popup pequeno se declara pequeno na abertura
 * em vez de herdar o tamanho do popup anterior.
 */
function resetModalSize() {
  modal.style.width = '';
  modal.classList.remove('modal-tall');
}

/**
 * Abre o script de criação de tabelas inteiro para edição.
 *
 * Tabelas novas e seus COMMENT ON entram no MESMO arquivo: a pessoa vê todo o
 * SQL existente — criação e documentação — e altera direto no código.
 */
async function editTablesScript() {
  if (!state.mode.editable) return readonlyNotice();
  const file = mainTablesFile(state.database);
  if (!file) return toast('Nenhum script de tabelas foi encontrado.');
  editorDialog(fileAsEditableItem(file));
}

/**
 * Pasta de destino da categoria escolhida no Novo SQL.
 *
 * O caminho vem de `database.paths` (config do workspace, embarcado no
 * snapshot pelo analyzer): a interface nunca escreve `database/logs/` — ou
 * qualquer outro caminho — literalmente.
 */
function newFileDestination(category, filename) {
  const directory = state.database?.paths?.[category];
  const name = String(filename ?? '').trim() || 'nome_do_arquivo.sql';
  return directory ? `${directory}/${name}` : name;
}

function updateNewFileDestination() {
  const category = document.querySelector('#new-category')?.value;
  const filename = document.querySelector('#new-filename')?.value;
  const target = document.querySelector('#new-file-destination');
  if (!target || !category) return;
  const option = newFileCategories.find((entry) => entry.value === category);
  target.innerHTML = `${icon(option?.icon ?? 'document', 15)} <code>${escapeHtml(newFileDestination(category, filename))}</code>`;
}

/**
 * O sistema cria arquivos vazios por padrão. A Log Table é a única categoria
 * com modelo inicial, e mesmo assim ele só é aplicado enquanto o campo estiver
 * intocado: qualquer digitação do usuário desliga o preenchimento automático.
 */
function updateNewFileTemplate() {
  const category = document.querySelector('#new-category')?.value;
  const content = document.querySelector('#new-content');
  const filename = document.querySelector('#new-filename')?.value ?? '';
  if (!content) return;
  if (category === 'logs' && (content.value.trim() === '' || content.dataset.autofilled === 'true')) {
    const name = filename.trim().replace(/\.sql$/i, '') || 'log_exemplo';
    content.value = newLogTableTemplate(name);
    content.dataset.autofilled = 'true';
  } else if (category !== 'logs' && content.dataset.autofilled === 'true') {
    content.value = '';
    delete content.dataset.autofilled;
  }
}

function newFileDialog() {
  if (!state.mode.editable) return readonlyNotice();
  const options = newFileCategories.map((entry) => `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`).join('');
  modal.innerHTML = `<form class="modal-body" id="new-file-form"><p class="eyebrow">Novo arquivo</p><h2>Criar SQL</h2><div class="form-grid"><div class="field"><label for="new-category">Categoria</label><select id="new-category" name="category">${options}</select></div><div class="field"><label for="new-filename">Nome do arquivo</label><input id="new-filename" name="filename" required pattern="[a-zA-Z0-9_.-]+\\.sql" placeholder="03_constraints.sql"></div><div class="field full"><span class="field-hint" id="new-file-destination"></span></div><div class="field full"><label for="new-content">Conteúdo inicial (opcional)</label><textarea id="new-content" class="new-file-content" name="content" spellcheck="false" placeholder="-- Você também poderá editar o arquivo depois de criá-lo"></textarea></div></div><div class="modal-actions"><button type="button" class="button ghost" data-close-modal>Cancelar</button><button class="button primary" type="submit">${icon('documentAdd', 16)} Criar arquivo</button></div></form>`;
  resetModalSize();
  modal.showModal();
  updateNewFileDestination();
}

function editorDialog(item) {
  if (!item) return;
  if (!state.mode.editable) return readonlyNotice();

  state.editingItem = item;
  modal.innerHTML = `<div class="modal-body" style="padding-bottom:12px"><div class="card-head"><div><p class="eyebrow">Editor local</p><h2>${escapeHtml(item.name)}</h2></div>${filePill(item.file)}</div><div class="readonly-note">O arquivo real será modificado somente após a confirmação. Revise o diff antes de salvar.</div></div><textarea class="code-editor modal-scroll" id="editor-content" spellcheck="false" aria-label="Código SQL">${escapeHtml(item.code)}</textarea><div class="modal-body"><div class="modal-actions split-actions"><div><button class="button ghost" data-rename-current>${icon('edit', 16)} Renomear</button> <button class="button danger" data-delete-current>${icon('trash', 16)} Excluir</button></div><div><button class="button ghost" data-close-modal>Cancelar</button> <button class="button primary" data-review-current>${icon('check', 16)} Revisar e salvar</button></div></div></div>`;
  resetModalSize();
  modal.style.width = 'min(1000px, calc(100% - 32px))';
  modal.classList.add('modal-tall');
  modal.showModal();
}

function tableDetailDialog(object) {
  if (!object) return;
  // Só o corpo rola: o botão Fechar fica sempre visível no rodapé.
  modal.innerHTML = `<div class="modal-body table-detail-modal modal-scroll">${tableDetail(object, state.database, state.mode)}</div><div class="modal-body modal-footer"><button class="button ghost" data-close-modal>Fechar</button></div>`;
  resetModalSize();
  modal.style.width = 'min(1180px, calc(100% - 32px))';
  modal.showModal();
}

function reviewDialog(changed) {
  const item = state.editingItem;
  if (!item) return;
  // Mesmo renderizador de diff usado pelo Histórico do Banco.
  const diff = diffMarkup(diffLines(item.code, changed));
  modal.innerHTML = `<div class="modal-body"><p class="eyebrow">Revisão antes de salvar</p><h2>Diff · ${escapeHtml(item.file)}</h2><p class="muted">Linhas adicionadas e removidas aparecem destacadas. A documentação será reprocessada depois do salvamento.</p></div><div class="modal-scroll">${diff}</div><div class="modal-body"><div id="review-impact"></div><div class="modal-actions split-actions"><button class="button ghost" data-review-impact-current>${icon('zap', 16)} Analisar impacto</button><div><button class="button ghost" data-cancel-review-current>Voltar</button> <button class="button primary" data-confirm-save-current>${icon('check', 16)} Confirmar salvamento</button></div></div></div>`;
  modal.dataset.pendingContent = changed;
}

function analyzeFileImpact(item) {
  const related = state.database.objects.filter((object) => object.file === item.file);
  if (!related.length) {
    return {
      level: 'BAIXA', score: 0, directDependencies: 0, indirectDependencies: 0,
      files: [item.file],
      reasons: ['O arquivo ainda não possui objetos estruturais reconhecidos; não há dependências calculáveis pelo analyzer.'],
      suggestions: [`Revisar manualmente ${item.file} após a alteração.`]
    };
  }

  const results = related.map((object) => analyzeImpactClient(state.database, { object: object.name, changeType: 'alter' }));
  const rank = { BAIXA: 0, 'MÉDIA': 1, ALTA: 2, 'CRÍTICA': 3 };
  const strongest = results.reduce((best, current) => rank[current.level] > rank[best.level] ? current : best, results[0]);
  return {
    level: strongest.level,
    score: Math.max(...results.map((result) => result.score)),
    directDependencies: Math.max(...results.map((result) => result.directDependencies)),
    indirectDependencies: Math.max(...results.map((result) => result.indirectDependencies)),
    files: [...new Set(results.flatMap((result) => result.files))],
    reasons: [...new Set([`O arquivo contém ${related.length} objeto(s): ${related.map((object) => object.name).join(', ')}.`, ...results.flatMap((result) => result.reasons)])],
    suggestions: [...new Set(results.flatMap((result) => result.suggestions))]
  };
}

async function saveCurrent() {
  const item = state.editingItem;
  if (!item) return;
  const changed = modal.dataset.pendingContent;
  await api('files/content', { method: 'PUT', body: JSON.stringify({ path: item.file, content: changed }) });
  modal.close();
  modal.style.width = '';
  await refreshDatabase();
  state.selectedFilePath = item.file;
  state.selectedId = state.database.objects.find((object) => object.file === item.file)?.id ?? state.selectedId;
  state.editingItem = null;
  render();
  toast('Arquivo salvo e documentação atualizada.');
}

async function renameCurrent() {
  const item = state.editingItem;
  if (!item) return;
  const filename = prompt('Novo nome do arquivo (.sql):', item.file.split('/').at(-1));
  if (!filename) return;
  if (!confirm(`Renomear ${item.file} para ${filename}? As dependências serão reanalisadas.`)) return;
  const result = await api('files', { method: 'PATCH', body: JSON.stringify({ path: item.file, filename }) });
  modal.close();
  await refreshDatabase();
  state.selectedFilePath = result.file;
  state.selectedId = state.database.objects.find((object) => object.file === result.file)?.id ?? null;
  state.editingItem = null;
  location.hash = '#/scripts';
  render();
  toast('Arquivo renomeado.');
}

async function deleteCurrent() {
  const item = state.editingItem;
  if (!item) return;
  const dependents = item.usedBy?.length ? `\nDependentes: ${item.usedBy.join(', ')}` : '\nNenhum dependente identificado.';
  if (!confirm(`Excluir permanentemente ${item.file}?${dependents}\n\nEssa operação poderá ser recuperada pelo Git se o projeto estiver versionado.`)) return;
  await api('files', { method: 'DELETE', body: JSON.stringify({ path: item.file }) });
  modal.close();
  await refreshDatabase();
  state.selectedFilePath = null;
  state.selectedId = null;
  state.editingItem = null;
  location.hash = '#/scripts';
  render();
  toast('Arquivo excluído e documentação atualizada.');
}

async function handleSubmit(event) {
  if (event.target.id === 'impact-form') {
    event.preventDefault();
    const request = Object.fromEntries(new FormData(event.target));
    try {
      document.querySelector('#impact-result').innerHTML = impactResult(analyzeImpactClient(state.database, request));
    } catch (error) {
      toast(error.message);
    }
  }

  if (event.target.id === 'path-form') {
    event.preventDefault();
    const from = document.querySelector('#path-from').value;
    const to = document.querySelector('#path-to').value;
    try {
      const path = findObjectPath(state.database.objects, from, to);
      document.querySelector('#path-result').innerHTML = path.length
        ? `<div class="toolbar path-result">${path.map((item, index) => `${index ? `<span class="path-arrow-inline">${icon('right', 16)}</span>` : ''}<button class="filter-button" data-object-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`).join('')}</div>`
        : '<p class="readonly-note path-result">Não foi encontrado um caminho entre esses objetos.</p>';
    } catch (error) {
      toast(error.message);
    }
  }

  if (event.target.id === 'connection-form') {
    event.preventDefault();
    await testConnection(event.target);
  }

  if (event.target.id === 'new-file-form') {
    event.preventDefault();
    try {
      const body = Object.fromEntries(new FormData(event.target));
      const result = await api('files', { method: 'POST', body: JSON.stringify(body) });
      modal.close();
      await refreshDatabase();
      state.selectedFilePath = result.file;
      state.fileCategory = 'all';
      location.hash = '#/scripts';
      render();
      toast('Arquivo SQL criado.');
    } catch (error) {
      toast(error.message);
    }
  }
}

document.addEventListener('submit', handleSubmit);

document.addEventListener('click', async (event) => {
  const target = event.target.closest('button, [data-object-id], [data-file-path]');
  if (!target) return;

  try {
    if (target.dataset.routeLink) location.hash = `#/${target.dataset.routeLink}`;

    if (target.dataset.dbTab) {
      state.databaseTab = target.dataset.dbTab;
      state.zoom = 1;
      render();
    }

    if (target.dataset.filter) {
      state.filter = target.dataset.filter;
      render();
    }

    if (target.dataset.fileCategory) {
      state.fileCategory = target.dataset.fileCategory;
      state.selectedFilePath = null;
      render();
    }

    if (target.dataset.filePath) {
      state.selectedFilePath = target.dataset.filePath;
      location.hash = '#/scripts';
      render();
    }

    if (target.dataset.objectId) {
      state.selectedId = target.dataset.objectId;
      location.hash = '#/object';
      if (modal.open) {
        modal.close();
        modal.style.width = '';
      }
      render();
    }

    if (target.dataset.closeModal !== undefined) closeModal();

    if (target.dataset.editTablesScript !== undefined) await editTablesScript();

    if (target.dataset.editObject) {
      const object = state.database.objects.find((entry) => entry.id === target.dataset.editObject);
      editorDialog({ ...object, kind: 'object' });
    }

    if (target.dataset.editFile) {
      const file = state.database.files.find((entry) => entry.path === target.dataset.editFile);
      editorDialog(fileAsEditableItem(file));
    }

    if (target.dataset.copyCode) {
      const object = state.database.objects.find((entry) => entry.id === target.dataset.copyCode);
      await navigator.clipboard.writeText(object?.code ?? '');
      toast('Código copiado.');
    }

    if (target.dataset.copyFile) {
      const file = state.database.files.find((entry) => entry.path === target.dataset.copyFile);
      await navigator.clipboard.writeText(file?.content ?? '');
      toast('Código copiado.');
    }

    if (target.dataset.reviewCurrent !== undefined) {
      reviewDialog(document.querySelector('#editor-content').value);
    }

    if (target.dataset.cancelReviewCurrent !== undefined) {
      editorDialog(state.editingItem);
    }

    if (target.dataset.confirmSaveCurrent !== undefined) {
      await saveCurrent();
    }

    if (target.dataset.reviewImpactCurrent !== undefined) {
      const item = state.editingItem;
      const result = item.kind === 'file'
        ? analyzeFileImpact(item)
        : analyzeImpactClient(state.database, { object: item.name, changeType: 'alter' });
      document.querySelector('#review-impact').innerHTML = impactResult(result);
    }

    if (target.dataset.executionAction) {
      const actions = {
        plan: generatePlan,
        validate: validateMigration,
        execute: executeMigration,
        disconnect: disconnectDatabase,
        history: loadMigrations
      };
      await actions[target.dataset.executionAction]?.();
    }

    if (target.dataset.executionDecision) {
      const path = target.dataset.path;
      const decision = target.dataset.executionDecision;
      if (state.execution.decisions[path] === decision) delete state.execution.decisions[path];
      else state.execution.decisions[path] = decision;
      await generatePlan();
    }

    // Histórico do Banco: navegação puramente local sobre os dados gerados.
    if (target.dataset.historyCategory) {
      state.history.category = target.dataset.historyCategory;
      render();
    }

    if (target.dataset.historyStatus) {
      state.history.status = target.dataset.historyStatus;
      render();
    }

    if (target.dataset.historyCommit) {
      const shortHash = target.dataset.historyCommit;
      const opening = state.history.openCommit !== shortHash;
      state.history.openCommit = opening ? shortHash : null;
      state.history.detailError = null;
      render();
      // O diff só é buscado quando o commit é aberto.
      if (opening) await ensureCommitDetail(shortHash);
    }

    if (target.dataset.historyFile) {
      const key = target.dataset.historyFile;
      state.history.openFiles = state.history.openFiles.includes(key)
        ? state.history.openFiles.filter((item) => item !== key)
        : [...state.history.openFiles, key];
      render();
    }

    if (target.dataset.historyReveal) {
      state.history.revealedDiffs = [...state.history.revealedDiffs, target.dataset.historyReveal];
      render();
    }

    if (target.dataset.renameCurrent !== undefined) await renameCurrent();
    if (target.dataset.deleteCurrent !== undefined) await deleteCurrent();

    if (target.dataset.scrollRelations !== undefined) {
      document.querySelector('#relations')?.scrollIntoView({ behavior: 'smooth' });
    }

    if (target.dataset.modelZoom) {
      // Zoom das imagens conceitual/lógica da página Modelagem.
      state.zoom = target.dataset.modelZoom === 'in'
        ? Math.min(3, state.zoom + 0.25)
        : target.dataset.modelZoom === 'out'
          ? Math.max(0.5, state.zoom - 0.25)
          : 1;
      const image = document.querySelector('#model-frame img');
      if (image) image.style.transform = `scale(${state.zoom})`;
    }

    if (target.dataset.modelTab) {
      state.zoom = 1;
      document.querySelectorAll('[data-model-tab]').forEach((tab) => tab.classList.toggle('active', tab === target));
      const image = document.querySelector('[data-model-image]');
      if (image) {
        const modelPath = state.database.models?.[target.dataset.modelTab]
          ?? `models/${target.dataset.modelTab === 'conceptual' ? 'conceitual' : 'logico'}.png`;
        image.src = `./${modelPath}`;
        image.style.transform = 'scale(1)';
        image.alt = `Modelo ${target.dataset.modelTab === 'conceptual' ? 'conceitual' : 'lógico'} do banco de dados`;
      }
    }
  } catch (error) {
    toast(error.message);
  }
});

/**
 * Camada única do tooltip de coluna, presa ao body.
 *
 * O conteúdo continua sendo gerado junto da coluna; aqui ele só é exibido em
 * uma camada livre de recortes (as listas rolam) e de `transform` (o card se
 * eleva no hover, o que tornaria o card o container de um elemento fixo).
 */
const columnTooltip = document.createElement('div');
columnTooltip.id = 'column-tooltip';
columnTooltip.setAttribute('role', 'tooltip');
document.body.append(columnTooltip);

function showColumnTooltip(column) {
  const source = column.querySelector('.column-tooltip');
  if (!source) return hideColumnTooltip();
  columnTooltip.innerHTML = source.innerHTML;
  columnTooltip.classList.add('is-visible');

  const box = column.getBoundingClientRect();
  const height = columnTooltip.offsetHeight;
  const width = columnTooltip.offsetWidth;
  const belowFits = box.bottom + height + 12 <= window.innerHeight;
  columnTooltip.style.left = `${Math.max(12, Math.min(box.left + 24, window.innerWidth - width - 12))}px`;
  columnTooltip.style.top = `${belowFits ? box.bottom - 2 : Math.max(12, box.top - height + 2)}px`;
}

function hideColumnTooltip() {
  columnTooltip.classList.remove('is-visible');
}

document.addEventListener('mouseover', (event) => {
  const column = event.target.closest?.('.model-column');
  if (column) showColumnTooltip(column);
  else if (!event.target.closest?.('#column-tooltip')) hideColumnTooltip();
});

document.addEventListener('focusin', (event) => {
  const column = event.target.closest?.('.model-column');
  if (column) showColumnTooltip(column);
  else hideColumnTooltip();
});

// Rolar a lista moveria a coluna sem mover o tooltip.
document.addEventListener('scroll', hideColumnTooltip, true);

document.addEventListener('dblclick', (event) => {
  const table = event.target.closest('[data-model-table]');
  if (!table) return;
  const object = state.database.objects.find((item) => item.id === table.dataset.modelTable);
  if (isTableLike(object)) tableDetailDialog(object);
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    document.querySelector('#global-search').focus();
    return;
  }

  if (event.key === 'Escape' && modal.open) {
    closeModal();
    return;
  }

  if (event.key !== 'Enter') return;

  const objectTarget = event.target.closest?.('[data-object-id]');
  if (objectTarget) {
    state.selectedId = objectTarget.dataset.objectId;
    location.hash = '#/object';
    render();
    return;
  }

  const fileTarget = event.target.closest?.('[data-file-path]');
  if (fileTarget) {
    state.selectedFilePath = fileTarget.dataset.filePath;
    location.hash = '#/scripts';
    render();
    return;
  }

  const tableTarget = event.target.closest?.('[data-model-table]');
  if (tableTarget) {
    const object = state.database.objects.find((item) => item.id === tableTarget.dataset.modelTable);
    if (isTableLike(object)) tableDetailDialog(object);
  }
});

// A confirmação destrutiva atualiza apenas o botão: recriar a seção a cada
// tecla faria o campo perder o foco.
document.addEventListener('input', (event) => {
  if (event.target.id === 'execution-confirmation') {
    state.execution.confirmation = event.target.value;
    const button = document.querySelector('[data-execution-action="execute"]');
    if (button) button.disabled = !(state.execution.validation?.canExecute && state.execution.confirmation === 'EXECUTAR');
    return;
  }

  // A busca do histórico redesenha a página; o cursor volta para onde estava.
  if (event.target.id === 'history-search') {
    const position = event.target.selectionStart;
    state.history.query = event.target.value;
    render();
    const field = document.querySelector('#history-search');
    if (field) {
      field.focus();
      field.setSelectionRange(position, position);
    }
    return;
  }

  if (event.target.id === 'new-filename') {
    updateNewFileTemplate();
    updateNewFileDestination();
    return;
  }

  // Digitou no conteúdo: o modelo automático sai de cena.
  if (event.target.id === 'new-content') delete event.target.dataset.autofilled;
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'dependency-focus') {
    state.dependencyFocus = event.target.value;
    render();
  }

  if (event.target.id === 'new-category') {
    updateNewFileTemplate();
    updateNewFileDestination();
  }
});

document.addEventListener('error', (event) => {
  if (!event.target.matches?.('[data-model-image]')) return;
  event.target.closest('#model-frame').innerHTML = '<div class="empty"><strong>Modelo ainda não adicionado.</strong><p>Adicione a imagem indicada em <code>database-workspace.config.json</code>.</p></div>';
}, true);

document.querySelector('#new-file-button').addEventListener('click', newFileDialog);

document.querySelector('#menu-button').addEventListener('click', (event) => {
  const sidebar = document.querySelector('#sidebar');
  sidebar.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', sidebar.classList.contains('open'));
});

document.querySelector('#main-nav').addEventListener('click', () => {
  const sidebar = document.querySelector('#sidebar');
  if (window.matchMedia('(max-width: 850px)').matches) sidebar.classList.remove('open');
});

document.querySelector('#global-search').addEventListener('input', (event) => {
  state.query = event.target.value.trim();
  if (state.query.length >= 2) {
    location.hash = '#/search';
    render();
  } else if (currentRoute() === 'search') {
    location.hash = '#/overview';
  }
});

window.addEventListener('hashchange', render);

/**
 * Injeta os ícones da identidade visual nos elementos estáticos do HTML.
 * O markup declara apenas `data-icon`, então o registro de ícones continua
 * sendo a única fonte da verdade.
 */
function hydrateIcons(root = document) {
  for (const element of root.querySelectorAll('[data-icon]')) {
    const label = element.getAttribute('aria-label');
    element.insertAdjacentHTML('afterbegin', icon(element.dataset.icon, Number(element.dataset.iconSize ?? 20), label ? { title: label } : {}));
  }
}

async function initialize() {
  try {
    hydrateIcons();
    state.mode = await detectMode();
    const badge = document.querySelector('#mode-badge');
    badge.className = `mode-badge ${state.mode.editable ? 'local' : ''}`;
    badge.innerHTML = `<i></i>${state.mode.editable ? 'Local Mode' : 'Read Only'}`;
    document.querySelector('#new-file-button').innerHTML = state.mode.editable
      ? `${icon('plus', 18)} Novo SQL`
      : `${icon('lock', 18)} Read Only`;

    await refreshDatabase();
    render();
  } catch (error) {
    content.innerHTML = `<div class="empty"><strong>Não foi possível iniciar o workspace.</strong><p>${escapeHtml(error.message)}</p><p>Execute <code>npm run analyze</code> e tente novamente.</p></div>`;
  }
}

initialize();
