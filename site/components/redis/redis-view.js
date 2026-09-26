import { escapeHtml, icon } from '../../utils.js';
import { jsonPreview } from '../mongo/json-preview.js';

const editButton = (file, mode) => `<button class="button ghost" data-redis-edit="${escapeHtml(file)}" ${mode.editable ? '' : 'disabled title="Edição disponível no modo local"'}>${icon(mode.editable ? 'edit' : 'lock', 16)} Editar documentação</button>`;
const statusBadge = (status) => `<span class="redis-status ${status === 'Implementado' ? 'implemented' : 'proposal'}">${escapeHtml(status)}</span>`;

export function redisMatches(key, query) {
  const normalize = (value) => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return normalize([key.title, key.key, key.category, key.description, key.status, ...key.commands, ...key.fields.map((field) => `${field.name} ${field.description}`)].join(' ')).includes(normalize(query));
}

function keyDetail(key, mode) {
  return `<article class="card redis-detail"><div class="card-head"><div><p class="eyebrow">${escapeHtml(key.category)} · ${escapeHtml(key.type)}</p><h2>${escapeHtml(key.title)}</h2></div><div class="mongo-detail-actions">${statusBadge(key.status)}${editButton(key.file, mode)}</div></div>
    <code class="redis-key-pattern">${escapeHtml(key.key)}</code><p>${escapeHtml(key.description)}</p>
    <dl class="redis-contract"><div><dt>Expiração</dt><dd>${escapeHtml(key.ttl)}</dd></div><div><dt>Quem grava</dt><dd>${escapeHtml(key.producer)}</dd></div><div><dt>Quem consome</dt><dd>${escapeHtml(key.consumer)}</dd></div></dl>
    <section><h3>Estrutura do valor</h3><div class="table-wrap"><table><thead><tr><th>Parte</th><th>Tipo</th><th>Descrição</th></tr></thead><tbody>${key.fields.map((field) => `<tr><td><code>${escapeHtml(field.name)}</code></td><td>${escapeHtml(field.type)}</td><td>${escapeHtml(field.description)}</td></tr>`).join('')}</tbody></table></div></section>
    <section><h3>Comandos documentados</h3><p class="muted">Referência de uso; os comandos não são executados pelo site.</p><pre class="code redis-commands" tabindex="0" aria-label="Comandos Redis"><code>${key.commands.map(escapeHtml).join('\n')}</code></pre></section>
    <section><div class="card-head"><h3>Exemplo de valor</h3><button class="button ghost" data-redis-copy="${escapeHtml(key.id)}">${icon('copy', 16)} Copiar exemplo</button></div><p class="muted">Dados ilustrativos. Listas mostram os itens da fila; códigos são strings.</p>${jsonPreview(key.example)}</section>
    <section><h3>Comportamento e observações</h3><ul>${key.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></section>
    <section><h3>Uso no código</h3>${key.evidence.length ? `<div class="redis-evidence">${key.evidence.map((entry) => `<div><strong>${escapeHtml(entry.repo)}</strong><code>${escapeHtml(entry.file)}</code><span>${escapeHtml(entry.symbol)}</span></div>`).join('')}</div>` : '<p class="muted">Nenhuma implementação localizada para esta proposta.</p>'}</section>
    <div class="mongo-detail-footer"><code>${escapeHtml(key.file)}</code></div></article>`;
}

function flowsView(data) {
  return `<p class="muted">Os fluxos mostram o comportamento encontrado nas workers. As etapas da aplicação principal ainda precisam de confirmação.</p><div class="redis-flows">${data.modeling.flows.map((flow) => `<section class="card"><div class="card-head"><h2>${escapeHtml(flow.title)}</h2>${statusBadge(flow.status)}</div><ol class="redis-flow">${flow.steps.map((step) => `<li><div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.description)}</p>${step.keyId && data.keys.some((key) => key.id === step.keyId) ? `<button class="redis-flow-key" data-redis-open="${escapeHtml(step.keyId)}">${icon('table', 14)} Ver chave</button>` : ''}</div></li>`).join('')}</ol></section>`).join('')}</div>`;
}

export function redisView(data, { query = '', selected = null, tab = 'keys', error = null, mode = { editable: false } } = {}) {
  const keys = data?.keys ?? [];
  const filtered = keys.filter((key) => redisMatches(key, query));
  const active = filtered.find((key) => key.id === selected) ?? filtered[0];
  const modeling = data?.modeling ?? {};
  return `<header class="page-head redis-page-head"><div><p class="eyebrow">Filas, códigos de acesso e cache</p><h1><img src="images/redis.png" alt=""/> Redis</h1><p>Chaves, expiração e fluxos de processamento do Astro.</p></div>${tab !== 'keys' ? editButton('redis/docs/modeling.json', mode) : ''}</header>
    <div class="tabs"><a href="#/redis" class="tab ${tab === 'keys' ? 'active' : ''}">Chaves <span class="mongo-count">${keys.length}</span></a><a href="#/redis-flows" class="tab ${tab === 'flows' ? 'active' : ''}">Fluxos</a><a href="#/redis-decisions" class="tab ${tab === 'decisions' ? 'active' : ''}">Decisões de uso</a></div>
    ${error ? `<div class="empty"><strong>Não foi possível carregar o catálogo Redis.</strong><p>${escapeHtml(error)}</p><button class="button ghost" data-redis-retry>Tentar novamente</button></div>` : !data ? '<p class="muted">Carregando chaves…</p>' : tab === 'flows' ? flowsView(data) : tab === 'decisions' ? `<div class="grid-2"><section class="card"><h2>Organização e responsabilidades</h2>${(modeling.principles ?? []).map((entry) => `<div class="mongo-decision"><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.description)}</p></div>`).join('')}</section><section class="card"><h2>Decisões em aberto</h2>${(modeling.decisions ?? []).map((entry) => `<div class="mongo-decision"><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.description)}</p></div>`).join('')}</section></div>` : `<div class="mongo-layout"><aside class="card mongo-catalog"><div class="mongo-catalog-head"><label class="search-box" for="redis-search">${icon('search', 16)}<input id="redis-search" type="search" aria-label="Buscar chave ou finalidade" placeholder="Buscar chave ou finalidade…" value="${escapeHtml(query)}"/></label><p class="mongo-catalog-count">${filtered.length} de ${keys.length} chaves · ${keys.filter((key) => key.status === 'Implementado').length} implementadas</p></div><div class="mongo-collection-list">${filtered.map((key) => `<button class="mongo-collection redis-key ${active?.id === key.id ? 'active' : ''}" data-redis-select="${escapeHtml(key.id)}" aria-pressed="${active?.id === key.id}"><strong>${escapeHtml(key.title)}</strong><span>${escapeHtml(key.key)}</span><small>${escapeHtml(key.type)} · ${escapeHtml(key.status)}</small></button>`).join('')}</div></aside>${active ? keyDetail(active, mode) : '<div class="empty"><strong>Nenhuma chave encontrada.</strong><p>Ajuste a busca ou adicione uma definição em redis/keys/.</p></div>'}</div>`}
    ${data?.issues?.length ? `<section class="card"><h2>Avisos do catálogo</h2><ul>${data.issues.map((issue) => `<li>${escapeHtml(issue.file)}: ${escapeHtml(issue.message)}</li>`).join('')}</ul></section>` : ''}`;
}
