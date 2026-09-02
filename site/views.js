import { escapeHtml, formatColumnType as columnType, formatDate, highlightSql, icon, isLogTable, isTableLike, labels, typeIcons } from './utils.js';
import { columnName, sameIdentifier, searchDatabase } from './services/search.js';
import { modelingView } from './components/database-model/model-view.js';

export function pageHead(title, description, eyebrow = 'Astro Workspace', action = '') {
  return `<header class="page-head"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${action}</header>`;
}

export function empty(message) {
  return `<div class="empty"><strong>Nada por aqui ainda.</strong><p>${escapeHtml(message)}</p></div>`;
}

/**
 * Renderizador único de diff do Astro.
 *
 * Usado pela revisão antes de salvar (com as linhas de `diffLines`) e pelo
 * Histórico do Banco (com as linhas geradas a partir do `git show`). Os dois
 * casos compartilham o mesmo formato `['same' | 'add' | 'remove' | 'meta',
 * texto]` e o mesmo visual. O conteúdo do SQL é sempre escapado: nada vindo de
 * um arquivo ou do Git é interpretado como HTML.
 */
export function diffMarkup(rows = []) {
  if (!rows.length) return '<div class="readonly-note">Nenhuma diferença de conteúdo para exibir.</div>';
  return `<pre class="diff">${rows.map(([type, line]) => `<span class="diff-line ${escapeHtml(type)}">${escapeHtml(line)}</span>`).join('')}</pre>`;
}

export function overview(database, mode) {
  // Log Tables têm contador próprio e não são somadas em Tables: cada categoria
  // é exclusiva na documentação.
  const cards = ['table', 'log-table', 'view', 'procedure', 'function', 'index', 'trigger', 'dataload']
    .map((type) => `<div class="stat"><span class="stat-icon">${icon(typeIcons[type], 16)}</span><strong>${database.counts[type] ?? 0}</strong><span>${labels[type]}</span></div>`).join('');
  const recent = database.objects.slice(0, 6);
  return `${pageHead('Visão Geral', 'A cartografia viva dos seus arquivos SQL.')}
    <section class="hero"><p class="eyebrow">Conformidade em órbita</p><h2>${escapeHtml(database.project.name)}</h2><p>${escapeHtml(database.project.description ?? 'Documentação, dependências e impacto em um único workspace.')}</p><span class="mode-badge ${mode.editable ? 'local' : ''}"><i></i>${mode.editable ? 'Local Mode · edição habilitada' : 'Read Only · documentação estática'}</span></section>
    <section class="stats" aria-label="Resumo do projeto">${cards}</section>
    <div class="grid-2">
      <section class="card"><div class="card-head"><h2>Objetos recentes</h2><button class="button ghost" data-route-link="database">Explorar</button></div>${recent.length ? `<ul class="list">${recent.map(objectRow).join('')}</ul>` : empty('Adicione arquivos SQL às pastas configuradas e execute o analyzer.')}</section>
      <section class="card"><div class="card-head"><h2>Saúde da análise</h2><span class="pill ${database.issues.length ? 'warning' : 'success'}">${database.issues.length} ocorrências</span></div><p class="muted">${database.counts.files} arquivos processados em ${formatDate(database.generatedAt)}.</p>${database.issues.length ? `<ul class="list">${database.issues.slice(0, 5).map((issue) => `<li class="list-item"><span class="type-icon">!</span><div><strong>${escapeHtml(issue.message)}</strong><small>${escapeHtml(issue.file)}</small></div></li>`).join('')}</ul>` : '<p>Todos os arquivos foram processados sem avisos.</p>'}</section>
    </div>`;
}

/** Rótulo seguro para objetos que o parser interpretou apenas parcialmente. */
export function objectLabel(object) {
  return object?.name || String(object?.file ?? '').split('/').at(-1) || 'Objeto sem nome';
}

export function objectRow(object) {
  const description = object?.description ? `<small>${escapeHtml(summarize(object.description, 90))}</small>` : '';
  return `<li class="list-item" data-object-id="${escapeHtml(object.id)}" tabindex="0"><span class="type-icon">${icon(typeIcons[object.type] ?? 'document', 18)}</span><div><strong>${escapeHtml(objectLabel(object))}</strong><small>${escapeHtml(object.file ?? 'arquivo não identificado')}</small>${description}</div><span class="pill">${escapeHtml(labels[object.type] ?? object.type ?? 'objeto')}</span></li>`;
}

/** Pill com o nome do arquivo; o caminho completo fica no tooltip. */
export function filePill(path, className = '') {
  const value = String(path ?? '');
  return `<span class="pill ${escapeHtml(className)}" title="${escapeHtml(value)}">${escapeHtml(value.split('/').at(-1) || value)}</span>`;
}

/** Resumo curto de uma descrição para cards e listas. */
export function summarize(value, limit = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/** Bloco de descrição derivado exclusivamente dos COMMENT ON do SQL. */
export function descriptionBlock(object) {
  if (!object?.description) return '<p class="object-description muted">Sem descrição cadastrada.</p>';
  return `<p class="object-description">${icon('info', 15)} ${escapeHtml(object.description)}</p>`;
}

function columnsTable(object) {
  if (!object.columns?.length) return empty('Nenhuma coluna foi identificada.');
  return `<div class="table-wrap"><table><thead><tr><th>Coluna</th><th>Tipo</th><th>Chave</th><th>Null</th><th>Default</th></tr></thead><tbody>${object.columns.map((column) => `<tr><td><strong>${escapeHtml(column.name)}</strong></td><td>${escapeHtml(column.dataType)}</td><td>${column.primaryKey ? '<span class="pill">PK</span>' : ''} ${column.references ? `<span class="pill">FK</span>` : ''} ${column.unique ? '<span class="pill">UNIQUE</span>' : ''}</td><td>${column.nullable ? 'Sim' : 'Não'}</td><td>${escapeHtml(column.default ?? '—')}</td></tr>`).join('')}</tbody></table></div>`;
}

function relationshipList(title, names, database) {
  const objects = (names ?? []).map((name) => database.objects.find((object) => sameIdentifier(object.name, name))).filter(Boolean);
  return `<section><h3>${title}</h3>${objects.length ? `<ul class="list">${objects.map(objectRow).join('')}</ul>` : '<p class="muted">Nenhum relacionamento identificado.</p>'}</section>`;
}

export function objectDetail(object, database, mode) {
  const specifics = isTableLike(object) ? `<h3>Colunas</h3>${columnsTable(object)}` : object.type === 'index' ? `<div class="detail-meta"><span>Tabela: ${escapeHtml(object.table)}</span><span>Colunas: ${escapeHtml(object.columns?.join(', '))}</span><span>${object.unique ? 'UNIQUE' : 'Não único'}</span></div>` : object.type === 'trigger' ? `<div class="detail-meta"><span>Tabela: ${escapeHtml(object.table)}</span><span>Função: ${escapeHtml(object.function)}</span><span>Momento: ${escapeHtml(object.timing)}</span><span>Eventos: ${escapeHtml(object.events.join(', '))}</span><span>Nível: ${escapeHtml(object.level)}</span></div>` : `<div class="detail-meta">${object.parameters?.length ? `<span>${object.parameters.length} parâmetros</span>` : ''}${object.returnType ? `<span>Retorno: ${escapeHtml(object.returnType)}</span>` : ''}${object.operations?.length ? `<span>Operações: ${escapeHtml(object.operations.join(', '))}</span>` : ''}</div>`;
  return `<article class="card object-detail"><div class="card-head"><div><p class="eyebrow">${icon(typeIcons[object.type] ?? 'document', 14)} ${escapeHtml(labels[object.type] ?? object.type)}</p><h2>${escapeHtml(object.name)}</h2></div><div><button class="button ghost" data-copy-code="${escapeHtml(object.id)}">${icon('copy', 16)} Copiar</button> <button class="button primary" data-edit-object="${escapeHtml(object.id)}">${icon(mode.editable ? 'edit' : 'lock', 16)} Editar SQL</button></div></div>
    ${descriptionBlock(object)}
    <div class="detail-meta"><span>Arquivo: ${escapeHtml(object.file)}</span><span>${object.dependencies.length} dependências</span><span>${object.usedBy.length} dependentes</span></div>
    ${specifics}
    <div class="tabs"><button class="tab active">Código SQL</button><button class="tab" data-scroll-relations>Relacionamentos</button></div>
    <div class="code-shell"><div class="code-head"><span>${escapeHtml(object.file)}</span><span>${database.dialect === 'postgresql' ? 'PostgreSQL' : escapeHtml(database.dialect)} · somente visualização</span></div><pre class="code code-lines"><code>${object.code.split('\n').map((line) => `<span class="code-line">${highlightSql(line) || ' '}</span>`).join('')}</code></pre></div>
    <div id="relations" class="grid-2" style="margin-top:22px">${relationshipList('Depende de', object.dependencies, database)}${relationshipList('Usado por', object.usedBy, database)}</div>
  </article>`;
}

function columnBadges(column) {
  const badges = [];
  if (column.primaryKey) badges.push('<span class="pill pk" title="Primary Key">PK</span>');
  if (column.references) badges.push(`<span class="pill fk" title="Foreign Key → ${escapeHtml(column.references)}${column.referencesColumn ? `.${escapeHtml(column.referencesColumn)}` : ''}">FK</span>`);
  if (column.unique) badges.push('<span class="pill unique" title="UNIQUE">UNIQUE</span>');
  if (column.check) badges.push('<span class="pill check" title="CHECK">CHECK</span>');
  if (!column.nullable) badges.push('<span class="pill notnull" title="NOT NULL">NOT NULL</span>');
  return badges.join(' ');
}

function formatColumnType(column) {
  return escapeHtml(columnType(column));
}

function columnTooltip(column) {
  const ref = column.references ? `Sim → ${escapeHtml(column.references)}${column.referencesColumn ? `.${escapeHtml(column.referencesColumn)}` : ''}` : 'Não';
  return [
    `<div class="column-tooltip-name">${escapeHtml(column.name)}</div>`,
    `<div class="column-tooltip-type">${formatColumnType(column)}</div>`,
    `<dl class="column-tooltip-props"><dt>PK</dt><dd>${column.primaryKey ? 'Sim' : 'Não'}</dd><dt>FK</dt><dd>${ref}</dd><dt>NOT NULL</dt><dd>${column.notNull || !column.nullable ? 'Sim' : 'Não'}</dd><dt>UNIQUE</dt><dd>${column.unique ? 'Sim' : 'Não'}</dd><dt>DEFAULT</dt><dd>${escapeHtml(column.default ?? 'Nenhum')}</dd><dt>CHECK</dt><dd>${escapeHtml(column.check ?? 'Nenhum')}</dd>`,
    column.description ? `<dt>Descrição</dt><dd>${escapeHtml(column.description)}</dd>` : '',
    '</dl>'
  ].join('');
}

/** Ícone da coluna: Key para PK, Link para FK — nunca emoji. */
function columnKeyIcon(column) {
  if (column.primaryKey && column.references) return `${icon('primaryKey', 13, { title: 'Primary Key e Foreign Key' })}${icon('foreignKey', 13)}`;
  if (column.primaryKey) return icon('primaryKey', 13, { title: 'Primary Key' });
  if (column.references) return icon('foreignKey', 13, { title: `Foreign Key → ${column.references}` });
  return '';
}

function tableCard(object) {
  const columns = (object.columns ?? []);
  const fkCount = columns.filter((c) => c.references).length;
  const log = isLogTable(object);
  return `<article class="table-card ${log ? 'is-log' : ''}" data-model-table="${escapeHtml(object.id)}" tabindex="0" role="button" aria-label="Abrir ${log ? 'log table' : 'tabela'} ${escapeHtml(object.name)}" title="Duplo clique para detalhes">
    <header class="table-card-head"><div class="table-card-title">${icon(log ? 'logTable' : 'table', 16)}<div><strong>${escapeHtml(object.name)}</strong><small>${escapeHtml((object.schema ?? 'public'))} · ${columns.length} colunas</small></div></div><div class="table-card-meta">${log ? '<span class="pill log">LOG</span>' : ''}${fkCount ? `<span class="pill fk" title="${fkCount} chaves estrangeiras">${fkCount} FK</span>` : ''}</div></header>
    ${object.description ? `<p class="table-card-description">${escapeHtml(summarize(object.description, 110))}</p>` : ''}
    <ul class="table-card-cols">${columns.map((column) => `<li class="model-column ${column.primaryKey ? 'is-pk' : ''} ${column.references ? 'is-fk' : ''}" data-model-column="${escapeHtml(object.id)}:${escapeHtml(column.name)}" tabindex="0" aria-label="Coluna ${escapeHtml(column.name)}">
      <span class="column-key-icon">${columnKeyIcon(column)}</span>
      <span class="column-name">${escapeHtml(column.name)}</span>
      <span class="column-type">${formatColumnType(column)}</span>
      <span class="column-badges">${columnBadges(column)}</span>
      <div class="column-tooltip">${columnTooltip(column)}</div>
    </li>`).join('')}</ul>
  </article>`;
}

export function tableDetail(object, database, mode = { editable: false }) {
  const columnCount = object.columns?.length ?? 0;
  const log = isLogTable(object);
  const columns = (object.columns ?? []).map((column) => `<tr>
    <td><span class="column-cell">${columnKeyIcon(column)}<strong>${escapeHtml(column.name)}</strong></span></td>
    <td>${formatColumnType(column)}</td>
    <td><span class="table-constraint-badges">${column.primaryKey ? '<span class="pill pk">PK</span>' : ''}${column.references ? `<span class="pill fk">FK → ${escapeHtml(column.references)}${column.referencesColumn ? `.${escapeHtml(column.referencesColumn)}` : ''}</span>` : ''}${column.unique ? '<span class="pill unique">UNIQUE</span>' : ''}</span></td>
    <td>${column.notNull || !column.nullable || column.primaryKey ? 'Não' : 'Sim'}</td>
    <td><code>${escapeHtml(column.default ?? '—')}</code></td>
    <td>${column.check ? `<code title="${escapeHtml(column.check)}">${escapeHtml(column.check.length > 40 ? column.check.slice(0, 40) + '…' : column.check)}</code>` : '—'}</td>
    <td>${column.description ? escapeHtml(column.description) : '<span class="muted">—</span>'}</td>
  </tr>`).join('');
  const constraints = (object.constraints ?? []).map((constraint) => `<li><code>${escapeHtml(constraint)}</code></li>`).join('');
  const indexes = database.objects.filter((item) => item.type === 'index' && sameIdentifier(item.table, object.name));
  return `<div class="table-detail-header">
    <div><p class="eyebrow">${icon(log ? 'logTable' : 'table', 14)} ${log ? 'Log Table' : 'Tabela'} · ${escapeHtml(object.schema ?? 'public')}</p><h2>${escapeHtml(object.name)}</h2></div>
    <div class="table-detail-actions"><button class="button ghost" data-copy-code="${escapeHtml(object.id)}">${icon('copy', 16)} Copiar SQL</button><button class="button primary" data-edit-object="${escapeHtml(object.id)}">${icon(mode.editable ? 'edit' : 'lock', 16)} Editar SQL</button></div>
  </div>
  ${descriptionBlock(object)}
  <div class="detail-meta"><span>Arquivo: ${escapeHtml(object.file)}</span><span>${columnCount} colunas</span><span>${object.usedBy?.length ?? 0} dependentes</span><span>${indexes.length} índices</span></div>
  <section class="card inner-card"><div class="card-head"><h3>Colunas</h3></div><div class="table-wrap"><table><thead><tr><th>Coluna</th><th>Tipo</th><th>Chave</th><th>Nullable</th><th>Default</th><th>Check</th><th>Descrição</th></tr></thead><tbody>${columns || '<tr><td colspan="7" class="muted">Nenhuma coluna identificada.</td></tr>'}</tbody></table></div></section>
  ${constraints ? `<section class="card inner-card is-half"><div class="card-head"><h3>Constraints</h3></div><ul class="constraint-list">${constraints}</ul></section>` : ''}
  ${indexes.length ? `<section class="card inner-card is-half"><div class="card-head"><h3>Índices</h3></div><ul class="list">${indexes.map(objectRow).join('')}</ul></section>` : ''}
  <section class="card inner-card"><div class="grid-2">${relationshipList('Depende de', object.dependencies, database)}${relationshipList('Usado por', object.usedBy, database)}</div></section>
  <details class="card inner-card detail-source"><summary><span class="detail-source-mark">${icon('chevronRight', 14)}</span><h3>Código-fonte</h3><small>${escapeHtml(count(object.code.split('\n').length, 'linha', 'linhas'))}</small></summary><div class="code-shell"><div class="code-head"><span>${escapeHtml(object.file)}</span></div><pre class="code code-lines"><code>${object.code.split('\n').map((line) => `<span class="code-line">${highlightSql(line) || ' '}</span>`).join('')}</code></pre></div></details>`;
}

/**
 * Arquivo onde as tabelas do banco principal são declaradas. Novas tabelas e
 * seus COMMENT ON entram nesse mesmo script: criação e documentação andam
 * juntas, sem arquivo separado.
 */
export function mainTablesFile(database) {
  const counts = new Map();
  for (const object of database?.objects ?? []) {
    if (object.type !== 'table') continue;
    counts.set(object.file, (counts.get(object.file) ?? 0) + 1);
  }
  const busiest = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  const files = database?.files ?? [];
  return files.find((file) => file.path === busiest)
    ?? files.filter((file) => file.category === 'scripts').sort((a, b) => a.path.localeCompare(b.path))[0]
    ?? null;
}

/** Modelo de CREATE TABLE + COMMENT ON acrescentado ao script principal. */
export function newTableTemplate(name = 'nova_tabela') {
  return `CREATE TABLE public.${name} (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.${name} IS
'Descreva aqui a responsabilidade desta tabela.';

COMMENT ON COLUMN public.${name}.id IS
'Identificador único do registro.';
`;
}

/**
 * Categorias oferecidas pelo **Novo SQL**.
 *
 * Cada `value` é uma chave de `database.paths` na configuração do workspace —
 * é o backend que traduz a categoria em pasta, então a interface nunca escreve
 * `database/logs/` (nem qualquer outro caminho) por conta própria.
 */
export const newFileCategories = [
  { value: 'scripts', label: 'Script', icon: 'script' },
  { value: 'dataload', label: 'Data Load', icon: 'dataload' },
  { value: 'functions', label: 'Function', icon: 'function' },
  { value: 'views', label: 'View', icon: 'view' },
  { value: 'procedures', label: 'Procedure', icon: 'procedure' },
  { value: 'indexes', label: 'Index', icon: 'index' },
  { value: 'triggers', label: 'Trigger', icon: 'trigger' },
  { value: 'logs', label: 'Log Table', icon: 'logTable' }
];

/**
 * Modelo mínimo de uma Log Table. Deliberadamente enxuto: chave e carimbo de
 * tempo. As colunas de negócio dependem do que está sendo auditado.
 */
export function newLogTableTemplate(name = 'log_exemplo') {
  return `CREATE TABLE public.${name} (
    id BIGSERIAL PRIMARY KEY,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.${name} IS
'Descreva aqui o que esta tabela de log registra.';
`;
}

export function databaseView(database, tab = 'list', modelState, mode = { editable: false }) {
  // Tables e Log Tables aparecem juntas: as duas são tabelas físicas.
  const tables = database.objects.filter((object) => isTableLike(object));
  const tabs = `<div class="tabs" role="tablist"><button class="tab ${tab === 'list' ? 'active' : ''}" data-db-tab="list" role="tab">${icon('listView', 15)} Lista</button><button class="tab ${tab === 'model' ? 'active' : ''}" data-db-tab="model" role="tab">${icon('physicalModel', 15)} Modelagem</button></div>`;
  // A grade fica em uma caixa com rolagem própria: tabelas com muitas colunas
  // não esticam a página nem empurram os cards vizinhos.
  const listView = `<div class="table-grid-scroll"><div id="db-table-list" class="table-grid">${tables.map(tableCard).join('') || empty('Nenhuma tabela foi encontrada. Adicione arquivos de esquema e execute o analyzer.')}</div></div>`;
  const script = mainTablesFile(database);
  // Uma única ação: tabelas novas são escritas no MESMO script de criação, então
  // "Nova tabela" abria exatamente o mesmo editor que "Ver script SQL".
  const action = `<div class="page-head-actions">
    <button class="button primary" data-edit-tables-script ${script ? '' : 'disabled'} title="${escapeHtml(script?.path ?? 'Nenhum script de tabelas encontrado')}">${icon(mode.editable ? 'script' : 'lock', 16)} Ver script SQL</button>
  </div>`;
  return `${pageHead('Banco de Dados', 'Tabelas, Log Tables, relacionamentos e estrutura física do banco.', 'Explorador', action)}${tabs}${tab === 'model' ? modelingView(database, modelState) : listView}`;
}

/** Página dedicada às tabelas de log documentadas em database/logs. */
export function logsView(database) {
  const logs = database.objects.filter((object) => isLogTable(object));
  const cards = logs.map((object) => {
    const columns = (object.columns ?? []).length;
    const relations = (object.dependencies?.length ?? 0) + (object.usedBy?.length ?? 0);
    return `<article class="card object-category-card is-log" data-object-id="${escapeHtml(object.id)}" tabindex="0" role="button" aria-label="Abrir ${escapeHtml(object.name)}">
      <div class="card-head"><div><p class="eyebrow">${icon('logTable', 14)} Tabela de Log</p><h2>${escapeHtml(object.name)}</h2></div><span class="pill log">LOG</span></div>
      ${object.description ? `<p class="table-card-description">${escapeHtml(summarize(object.description, 130))}</p>` : ''}
      <div class="detail-meta"><span>${columns} colunas</span><span>${relations} relacionamentos</span></div>
      <div class="category-card-footer"><span>${escapeHtml(object.file)}</span></div>
    </article>`;
  }).join('');
  return `${pageHead('Logs', `${logs.length} tabela(s) de log documentadas em database/logs.`, 'Objetos')}<div class="object-category-grid">${cards || empty('Nenhuma tabela de log foi encontrada. Crie arquivos .sql em database/logs.')}</div>`;
}

export function dataLoadView(database) {
  const loads = database.objects.filter((object) => object.type === 'dataload');
  const cards = loads.map((object) => `<article class="card dataload-card"><div class="card-head"><div><p class="eyebrow">Data Load</p><h2>${escapeHtml(object.name)}</h2></div>${filePill(object.file)}</div>
    <div class="detail-meta"><span>${object.statementCount ?? 0} comando(s)</span><span>Operações: ${(object.operations ?? []).map((op) => `<span class="pill op-${op.toLowerCase()}">${escapeHtml(op)}</span>`).join(' ')}</span></div>
    ${object.dependencies?.length ? `<h3>Tabelas afetadas</h3><ul>${object.dependencies.map((dependency) => `<li>${escapeHtml(dependency)}</li>`).join('')}</ul>` : ''}
    <div class="code-shell"><div class="code-head"><span>${escapeHtml(object.file)}</span></div><pre class="code"><code>${object.code.split('\n').map((line) => `${highlightSql(line) || ''}\n`).join('')}</code></pre></div></article>`).join('');
  return `${pageHead('Data Load', 'Scripts de carga inicial e inserção de dados.', 'Explorador')}${cards || empty('Nenhum script de Data Load foi encontrado.')}`;
}

function count(total, singular, many) {
  return `${total} ${total === 1 ? singular : many}`;
}

/**
 * Um dado do objeto: rótulo pequeno em cima, valor em destaque embaixo.
 *
 * Substitui as antigas chips cinzas em que rótulo e valor tinham o mesmo peso
 * ("Tabela: clientes"), o que transformava o cartão em um bloco de texto. Com
 * `code`, o valor é um identificador SQL e ganha a fonte monoespaçada usada no
 * resto do workspace. Valores ausentes somem em vez de virar chip vazia.
 */
function objectFact(label, value, { icon: iconName, code = false } = {}) {
  const text = Array.isArray(value) ? value.join(', ') : value;
  if (text === undefined || text === null || String(text).trim() === '') return '';
  return `<div class="fact${code ? ' is-code' : ''}">${iconName ? `<span class="fact-icon">${icon(iconName, 15)}</span>` : ''}<span class="fact-body"><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(text))}</strong></span></div>`;
}

/** Os dados que descrevem cada tipo de objeto, na ordem em que importam. */
function objectFacts(object, type) {
  if (type === 'index') {
    return [
      objectFact('Tabela', object.table, { icon: 'table', code: true }),
      objectFact('Colunas', object.columns, { icon: 'columns', code: true }),
      objectFact('Condição', object.condition, { icon: 'filter', code: true })
    ];
  }
  if (type === 'trigger') {
    return [
      objectFact('Tabela', object.table, { icon: 'table', code: true }),
      objectFact('Função', object.function, { icon: 'function', code: true }),
      objectFact('Momento', object.timing, { icon: 'logTable' }),
      objectFact('Eventos', object.events, { icon: 'zap' }),
      objectFact('Nível', object.level, { icon: 'list' })
    ];
  }
  return [
    objectFact('Parâmetros', (object.parameters ?? []).length || '', { icon: 'columns' }),
    objectFact('Retorno', object.returnType, { icon: 'right', code: true }),
    objectFact('Linguagem', object.language, { icon: 'tag' }),
    objectFact('Operações', object.operations, { icon: 'steps' })
  ];
}

/** Selos do cabeçalho: a característica que distingue o objeto, e o arquivo. */
function objectBadges(object, type) {
  const unique = type !== 'index'
    ? ''
    : object.unique
      ? '<span class="pill unique">Unique</span>'
      : '<span class="pill">Não único</span>';
  // O nome do arquivo é um identificador: monoespaçado e sem caixa alta.
  return `<div class="card-badges">${unique}${filePill(object.file, 'is-file')}</div>`;
}

export function objectCategoryView(database, type) {
  const label = labels[type] ?? type;
  const objects = database.objects.filter((object) => object.type === type);
  const cards = objects.map((object) => {
    const facts = objectFacts(object, type).filter(Boolean).join('');
    const dependencies = object.dependencies?.length ?? 0;
    const dependents = object.usedBy?.length ?? 0;
    return `<article class="card object-category-card" data-object-id="${escapeHtml(object.id)}" tabindex="0" role="button" aria-label="Abrir ${escapeHtml(object.name)}">
      <div class="card-head"><div><p class="eyebrow">${escapeHtml(label)}</p><h2>${escapeHtml(object.name)}</h2></div>${objectBadges(object, type)}</div>
      ${facts ? `<div class="object-facts">${facts}</div>` : ''}
      <div class="category-card-footer">
        <span>${icon('dependencies', 13)} ${dependencies ? escapeHtml(count(dependencies, 'dependência', 'dependências')) : 'Sem dependências'}</span>
        ${dependents ? `<span>${icon('impact', 13)} ${escapeHtml(count(dependents, 'dependente', 'dependentes'))}</span>` : ''}
      </div>
    </article>`;
  }).join('');
  return `${pageHead(label, `Objetos do tipo ${label.toLowerCase()} encontrados nos arquivos SQL.`, 'Objetos')}<div class="object-category-grid">${cards || empty(`Nenhum objeto do tipo ${label.toLowerCase()} foi encontrado.`)}</div>`;
}

export function explorer(database, selectedId, filter = 'all', scriptsOnly = false) {
  const title = scriptsOnly ? 'Scripts' : 'Banco de Dados';
  const description = scriptsOnly ? 'Navegue pelo código-fonte organizado por categoria.' : 'Explore os objetos interpretados a partir dos arquivos SQL.';
  const available = database.objects.filter((object) => filter === 'all' || object.type === filter);
  const selected = database.objects.find((object) => object.id === selectedId) ?? available[0];
  return `${pageHead(title, description)}
    <div class="toolbar"><button class="filter-button ${filter === 'all' ? 'active' : ''}" data-filter="all">${icon('grid', 15)} Todos</button>${Object.entries(labels).map(([type, label]) => `<button class="filter-button ${filter === type ? 'active' : ''}" data-filter="${type}">${icon(typeIcons[type] ?? 'document', 15)} ${label}</button>`).join('')}</div>
    <div class="object-layout"><section class="card object-list"><div class="card-head"><h2>${available.length} objetos</h2></div>${available.length ? `<ul class="list">${available.map(objectRow).join('')}</ul>` : empty('Nenhum objeto deste tipo foi encontrado.')}</section><div>${selected ? objectDetail(selected, database, window.appState.mode) : empty('Selecione ou adicione um objeto SQL.')}</div></div>`;
}

const fileCategoryLabels = {
  scripts: 'Criação',
  dataload: 'Data Load',
  functions: 'Functions',
  views: 'Views',
  procedures: 'Procedures',
  indexes: 'Índices',
  triggers: 'Triggers',
  logs: 'Log Tables'
};

function fileRow(file) {
  const name = file.path.split('/').at(-1);
  return `<li class="list-item" data-file-path="${escapeHtml(file.path)}" tabindex="0"><span class="type-icon">${icon('document', 18)}</span><div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(file.path)} · ${file.size ?? 0} bytes</small></div><span class="pill">${escapeHtml(fileCategoryLabels[file.category] ?? file.category)}</span></li>`;
}

export function scriptsView(database, selectedPath = null, category = 'all', mode = { editable: false }) {
  const files = (database.files ?? []).filter((file) => category === 'all' || file.category === category);
  const selected = (database.files ?? []).find((file) => file.path === selectedPath) ?? files[0] ?? null;
  const relatedObjects = selected ? database.objects.filter((object) => object.file === selected.path) : [];
  const toolbar = `<div class="toolbar"><button class="filter-button ${category === 'all' ? 'active' : ''}" data-file-category="all">${icon('grid', 15)} Todos</button>${Object.entries(fileCategoryLabels).map(([key, label]) => `<button class="filter-button ${category === key ? 'active' : ''}" data-file-category="${key}">${icon('document', 15)} ${label}</button>`).join('')}</div>`;
  const detail = selected ? `<article class="card object-detail"><div class="card-head"><div><p class="eyebrow">${escapeHtml(fileCategoryLabels[selected.category] ?? selected.category)}</p><h2>${escapeHtml(selected.path.split('/').at(-1))}</h2></div><div><button class="button ghost" data-copy-file="${escapeHtml(selected.path)}">${icon('copy', 16)} Copiar</button> <button class="button primary" data-edit-file="${escapeHtml(selected.path)}">${icon(mode.editable ? 'edit' : 'lock', 16)} Editar SQL</button></div></div>
    <div class="detail-meta"><span>${escapeHtml(selected.path)}</span><span>${selected.size ?? 0} bytes</span><span>${relatedObjects.length} objeto(s) interpretado(s)</span></div>
    ${relatedObjects.length ? `<h3>Objetos encontrados neste arquivo</h3><ul class="list related-file-objects">${relatedObjects.map(objectRow).join('')}</ul>` : '<div class="readonly-note"><strong>Arquivo não convertido em objeto estrutural.</strong><br>Ele continua disponível para leitura e edição mesmo assim.</div>'}
    <div class="code-shell"><div class="code-head"><span>${escapeHtml(selected.path)}</span><span>${escapeHtml(database.dialect)}</span></div><pre class="code code-lines"><code>${String(selected.content ?? '').split('\n').map((line) => `<span class="code-line">${highlightSql(line) || ' '}</span>`).join('')}</code></pre></div>
  </article>` : empty('Nenhum arquivo SQL foi encontrado nesta categoria.');
  return `${pageHead('Scripts', 'Navegue pelos arquivos SQL reais do repositório, inclusive arquivos ainda não interpretados pelo analyzer.')}${toolbar}<div class="object-layout"><section class="card object-list"><div class="card-head"><h2>${files.length} arquivos</h2></div>${files.length ? `<ul class="list">${files.map(fileRow).join('')}</ul>` : empty('Nenhum arquivo desta categoria foi encontrado.')}</section><div>${detail}</div></div>`;
}

const graphColors = {
  table: '#5548c8', view: '#2878c8', procedure: '#d06c28', function: '#8f00c4',
  index: '#148a78', trigger: '#c32d76', dataload: '#4c8b3e'
};

function graphComponent(edges, focusId) {
  if (!focusId || focusId === 'all') return null;
  const selected = new Set([focusId]);
  const ancestors = [focusId];
  const descendants = [focusId];
  while (ancestors.length) {
    const current = ancestors.shift();
    for (const edge of edges.filter((item) => item.to === current)) {
      if (!selected.has(edge.from)) { selected.add(edge.from); ancestors.push(edge.from); }
    }
  }
  while (descendants.length) {
    const current = descendants.shift();
    for (const edge of edges.filter((item) => item.from === current)) {
      if (!selected.has(edge.to)) { selected.add(edge.to); descendants.push(edge.to); }
    }
  }
  return selected;
}

export function dependencyGraphLayout(objects, dependencyEdges, focusId = 'all') {
  const availableIds = new Set(objects.map((object) => object.id));
  let edges = dependencyEdges.filter((edge) => edge.resolved && availableIds.has(edge.from) && availableIds.has(edge.to));
  const component = graphComponent(edges, focusId);
  const nodes = objects.filter((object) => !component || component.has(object.id)).slice(0, 80);
  const nodeIds = new Set(nodes.map((object) => object.id));
  edges = edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));

  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const incoming = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    outgoing.get(edge.from).push(edge.to);
    incoming.get(edge.to).push(edge.from);
  }
  const indegree = new Map(nodes.map((node) => [node.id, incoming.get(node.id).length]));
  const rank = new Map(nodes.map((node) => [node.id, 0]));
  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const processed = new Set();
  while (queue.length) {
    const current = queue.shift();
    processed.add(current);
    for (const next of outgoing.get(current)) {
      rank.set(next, Math.max(rank.get(next), rank.get(current) + 1));
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  // Ciclos permanecem juntos em uma coluna própria, sem provocar um loop no layout.
  const cycleRank = Math.max(0, ...rank.values()) + 1;
  for (const node of nodes) if (!processed.has(node.id)) rank.set(node.id, cycleRank);

  const groups = new Map();
  for (const node of nodes) {
    const level = rank.get(node.id);
    if (!groups.has(level)) groups.set(level, []);
    groups.get(level).push(node);
  }
  const levels = [...groups.keys()].sort((a, b) => a - b);
  const order = new Map();
  for (const level of levels) {
    groups.get(level).sort((a, b) => {
      const parentsA = incoming.get(a.id).map((id) => order.get(id)).filter(Number.isFinite);
      const parentsB = incoming.get(b.id).map((id) => order.get(id)).filter(Number.isFinite);
      const scoreA = parentsA.length ? parentsA.reduce((sum, value) => sum + value, 0) / parentsA.length : Infinity;
      const scoreB = parentsB.length ? parentsB.reduce((sum, value) => sum + value, 0) / parentsB.length : Infinity;
      return scoreA - scoreB || a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
    });
    groups.get(level).forEach((node, index) => order.set(node.id, index));
  }

  const nodeWidth = 218; const nodeHeight = 64; const columnGap = 112; const rowGap = 34; const padding = 52;
  const maxRows = Math.max(1, ...[...groups.values()].map((group) => group.length));
  const maxLevel = Math.max(0, ...levels);
  const width = Math.max(960, padding * 2 + (maxLevel + 1) * nodeWidth + maxLevel * columnGap);
  const height = Math.max(430, padding * 2 + maxRows * nodeHeight + (maxRows - 1) * rowGap);
  const positions = new Map();
  for (const level of levels) {
    const group = groups.get(level);
    const groupHeight = group.length * nodeHeight + (group.length - 1) * rowGap;
    const startY = (height - groupHeight) / 2;
    group.forEach((node, index) => positions.set(node.id, {
      x: padding + level * (nodeWidth + columnGap), y: startY + index * (nodeHeight + rowGap)
    }));
  }
  return { nodes, edges, positions, width, height, nodeWidth, nodeHeight, maxLevel };
}

export function dependencyView(database, focusId = 'all') {
  const allObjects = database.objects;
  const layout = dependencyGraphLayout(allObjects, database.dependencies.edges, focusId);
  const options = allObjects.map((object) => `<option value="${escapeHtml(object.id)}" ${focusId === object.id ? 'selected' : ''}>${escapeHtml(object.name)} · ${escapeHtml(labels[object.type] ?? object.type)}</option>`).join('');
  const presentTypes = [...new Set(layout.nodes.map((node) => node.type))];
  const unresolved = database.dependencies.edges.filter((edge) => !edge.resolved).length;
  const paths = layout.edges.map((edge) => {
    const from = layout.positions.get(edge.from); const to = layout.positions.get(edge.to);
    const x1 = from.x + layout.nodeWidth; const y1 = from.y + layout.nodeHeight / 2;
    const x2 = to.x; const y2 = to.y + layout.nodeHeight / 2; const bend = Math.max(40, (x2 - x1) / 2);
    return `<path class="graph-edge" d="M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}"/>`;
  }).join('');
  const nodeMarkup = layout.nodes.map((object) => {
    const position = layout.positions.get(object.id); const color = graphColors[object.type] ?? '#77738b';
    const shortName = object.name.length > 27 ? `${object.name.slice(0, 26)}…` : object.name;
    return `<g class="node" data-object-id="${escapeHtml(object.id)}" transform="translate(${position.x} ${position.y})" tabindex="0" role="link" aria-label="Abrir ${escapeHtml(object.name)}"><title>${escapeHtml(object.name)} · clique para abrir os detalhes</title><rect class="node-card" width="${layout.nodeWidth}" height="${layout.nodeHeight}"/><rect class="node-accent" width="5" height="${layout.nodeHeight}" fill="${color}"/><circle cx="22" cy="21" r="6" fill="${color}" opacity=".16"/><circle cx="22" cy="21" r="3" fill="${color}"/><text class="node-name" x="37" y="25">${escapeHtml(shortName)}</text><text class="node-type" x="17" y="48" fill="${color}">${escapeHtml(labels[object.type] ?? object.type).toUpperCase()}</text></g>`;
  }).join('');
  return `${pageHead('Dependências', 'Entenda como cada objeto alimenta os próximos níveis do banco de dados.')}
    <section class="dependency-summary" aria-label="Resumo do grafo"><div><strong>${layout.nodes.length}</strong><span>objetos exibidos</span></div><div><strong>${layout.edges.length}</strong><span>relações resolvidas</span></div><div><strong>${layout.maxLevel + 1}</strong><span>níveis de dependência</span></div><div><strong>${unresolved}</strong><span>referências externas</span></div></section>
    <section class="card dependency-card"><div class="dependency-toolbar"><div><h2>Mapa de dependências</h2><p>A seta parte do objeto base e aponta para quem o utiliza.</p></div><div class="field dependency-focus"><label for="dependency-focus">Focar em uma cadeia</label><select id="dependency-focus"><option value="all">Todos os objetos</option>${options}</select></div></div>
      <div class="graph-legend">${presentTypes.map((type) => `<span><i style="background:${graphColors[type] ?? '#77738b'}"></i>${escapeHtml(labels[type] ?? type)}</span>`).join('')}</div>
      ${layout.nodes.length ? `<div class="graph-scroll" tabindex="0" aria-label="Área rolável do grafo"><svg class="graph" viewBox="0 0 ${layout.width} ${layout.height}" style="width:${layout.width}px" role="img" aria-label="Grafo hierárquico de dependências"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8e879d"/></marker></defs>${paths}${nodeMarkup}</svg></div>` : empty('O grafo será exibido quando houver objetos analisados.')}
    </section>
    <section class="card path-card"><div class="card-head"><div><h2>Caminho entre dois objetos</h2><p class="muted">Encontre a sequência completa que conecta uma origem a um destino.</p></div></div><form id="path-form" class="path-form"><div class="field"><label for="path-from">Origem</label><select id="path-from">${allObjects.map((object) => `<option value="${escapeHtml(object.name)}">${escapeHtml(object.name)}</option>`).join('')}</select></div><span class="path-arrow" aria-hidden="true">${icon('right', 22)}</span><div class="field"><label for="path-to">Destino</label><select id="path-to">${allObjects.map((object) => `<option value="${escapeHtml(object.name)}">${escapeHtml(object.name)}</option>`).join('')}</select></div><button class="button primary" type="submit">${icon('right', 16)} Descobrir caminho</button></form><div id="path-result"></div></section>`;
}

export function impactView(database) {
  const options = database.objects.map((object) => `<option value="${escapeHtml(object.name)}">${escapeHtml(object.name)} · ${escapeHtml(object.type)}</option>`).join('');
  return `${pageHead('Análise de Impacto', 'Simule mudanças antes de tocar no código e entenda o raio de efeito.')}
    <div class="grid-2"><section class="card"><div class="card-head"><h2>Simular alteração</h2></div>${database.objects.length ? `<form id="impact-form" class="form-grid"><div class="field full"><label for="impact-object">Objeto</label><select id="impact-object" name="object">${options}</select></div><div class="field"><label for="impact-element">Elemento (opcional)</label><input id="impact-element" name="element" placeholder="Ex.: nome"></div><div class="field"><label for="impact-type">Tipo de alteração</label><select id="impact-type" name="changeType"><option value="rename-column">Renomear coluna</option><option value="alter-type">Alterar tipo</option><option value="remove-column">Remover coluna</option><option value="remove-object">Remover objeto</option></select></div><div class="field full"><label for="impact-value">Novo valor (opcional)</label><input id="impact-value" name="newValue" placeholder="Ex.: nome_completo"></div><div class="field full"><button class="button primary" type="submit">${icon('zap', 16)} Analisar impacto</button></div></form>` : empty('Adicione objetos SQL antes de executar uma análise.')}</section><section class="card" id="impact-result">${empty('O resultado detalhado aparecerá aqui.')}</section></div>`;
}

export function impactResult(result) {
  const severity = result.level === 'CRÍTICA' ? 'danger' : result.level === 'ALTA' ? 'warning' : 'success';
  return `<div class="card-head"><h2>Resultado</h2><span class="pill ${severity}">${result.level}</span></div><div class="impact-score"><div class="score-orb">${result.score}</div><div><strong>Complexidade ${result.level}</strong><p class="muted">${result.directDependencies} diretas · ${result.indirectDependencies} indiretas · ${result.files.length} arquivos</p></div></div><h3>Por que essa complexidade?</h3><ul>${result.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul><h3>Arquivos para revisar</h3>${result.files.length ? `<ul>${result.files.map((file) => `<li>${escapeHtml(file)}</li>`).join('')}</ul>` : '<p class="muted">Nenhum arquivo adicional identificado.</p>'}<h3>Sugestões</h3>${result.suggestions.length ? `<ol>${result.suggestions.map((suggestion) => `<li>${escapeHtml(suggestion.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>` : '<p class="muted">Revise e teste o objeto alterado.</p>'}`;
}

export function modeling(config = {}) {
  const source = `./${config.conceptual ?? 'models/conceitual.png'}`;
  return `${pageHead('Modelagem', 'Consulte os modelos conceitual e lógico do projeto.')}
    <section class="card"><div class="card-head"><h2>Diagramas</h2><div><button class="button ghost" data-model-zoom="out" aria-label="Reduzir">${icon('minus', 16)}</button> <button class="button ghost" data-model-zoom="reset">${icon('reset', 16)} Ajustar</button> <button class="button ghost" data-model-zoom="in" aria-label="Ampliar">${icon('zoomIn', 16)}</button></div></div><div class="tabs"><button class="tab active" data-model-tab="conceptual">Modelo Conceitual</button><button class="tab" data-model-tab="logical">Modelo Lógico</button></div><div class="model-frame" id="model-frame"><img src="${escapeHtml(source)}" alt="Modelo conceitual do banco de dados" data-model-image></div></section>`;
}

export function changes(mode) {
  if (!mode.editable) return `${pageHead('Alterações Locais', 'Acompanhe arquivos modificados no workspace.')}<div class="readonly-note"><strong>Esta versão está em modo somente leitura.</strong><br>Para editar scripts e consultar o status Git local, clone o repositório e execute <code>npm run dev</code>.</div>`;
  return `${pageHead('Alterações Locais', 'Arquivos identificados pelo status Git local.')}<section class="card" id="changes-list"><p class="muted">Consultando alterações…</p></section>`;
}

export function searchResults(database, query) {
  const { objects, columns, files, total } = searchDatabase(database, query);
  const term = String(query ?? '').trim();
  const description = term ? `${total} correspondências encontradas.` : 'Digite ao menos dois caracteres para pesquisar.';
  const columnRows = columns.map(({ object, column }) => `<li class="list-item" data-object-id="${escapeHtml(object.id)}" tabindex="0"><span class="type-icon">${icon('columns', 18)}</span><div><strong>${escapeHtml(objectLabel(object))}.${escapeHtml(columnName(column))}</strong><small>Coluna · ${escapeHtml(column.dataType ?? 'tipo não identificado')}</small></div></li>`).join('');
  return `${pageHead(`Resultados para “${term}”`, description, 'Busca global')}<section class="card"><ul class="list">${files.map(fileRow).join('')}${objects.map(objectRow).join('')}${columnRows}</ul>${total ? '' : empty('Tente buscar por outro nome de objeto, coluna ou arquivo.')}</section>`;
}
