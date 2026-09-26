import { mongoModelView, createMongoModelState } from './mongo-model.js';
import { escapeHtml, icon } from '../../utils.js';
import { jsonPreview } from './json-preview.js';

function editButton(file, mode) {
  return `<button class="button ghost" data-mongo-edit="${escapeHtml(file)}" ${mode.editable ? '' : 'disabled title="Edição disponível no modo local"'}>${icon(mode.editable ? 'edit' : 'lock', 16)} Editar documentação</button>`;
}

export function mongoMatches(collection, query) {
  const normalize = (value) => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return normalize([collection.name, collection.title, collection.description, ...(collection.fields ?? []).map((field) => `${field.name} ${field.description}`)].join(' ')).includes(normalize(query));
}

function collectionDetail(collection, mode) {
  return `<article class="card mongo-detail">
    <div class="card-head"><div><p class="eyebrow">Collection · ${escapeHtml(collection.pattern)}</p><h2>${escapeHtml(collection.name)}</h2></div><div class="mongo-detail-actions"><span class="pill">${escapeHtml(collection.status)}</span>${editButton(collection.file, mode)}</div></div>
    <p>${escapeHtml(collection.description)}</p>
    <div class="tabs" aria-label="Seções da collection"><button class="tab" data-mongo-section="mongo-fields">Campos</button><button class="tab" data-mongo-section="mongo-example">Documento</button><button class="tab" data-mongo-section="mongo-indexes">Índices</button></div>
    <section id="mongo-fields"><h3>Campos do documento</h3><div class="table-wrap"><table><thead><tr><th>Campo</th><th>Tipo proposto</th><th>Obrigatório</th><th>Descrição</th></tr></thead><tbody>${collection.fields.map((field) => `<tr><td><code>${escapeHtml(field.name)}</code></td><td>${escapeHtml(field.type)}</td><td>${escapeHtml(field.required ?? 'A definir')}</td><td>${escapeHtml(field.description)}</td></tr>`).join('')}</tbody></table></div></section>
    <section id="mongo-example"><div class="card-head"><h3>Exemplo de documento</h3><button class="button ghost" data-mongo-copy="${escapeHtml(collection.name)}">${icon('copy', 16)} Copiar JSON</button></div><p class="muted">Exemplo ilustrativo em JSON. Datas são representadas com <code>$date</code>.</p>${jsonPreview(collection.example)}</section>
    <section id="mongo-indexes"><h3>Índices</h3>${collection.indexes?.length ? `<ul>${collection.indexes.map((index) => `<li>${escapeHtml(index)}</li>`).join('')}</ul>` : '<p class="muted">Nenhum índice documentado.</p>'}</section>
    <section><h3>Observações de modelagem</h3><ul class="mongo-notes">${(collection.notes ?? []).map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></section>
    <div class="mongo-detail-footer"><code>${escapeHtml(collection.file)}</code></div>
  </article>`;
}

export function mongoView(data, { query = '', selected = null, tab = 'collections', error = null, mode = { editable: false }, model = createMongoModelState() } = {}) {
  const collections = data?.collections ?? [];
  const filtered = collections.filter((collection) => mongoMatches(collection, query));
  const active = filtered.find((collection) => collection.name === selected) ?? filtered[0];
  const modeling = data?.modeling ?? {};
  return `<header class="page-head mongo-page-head"><div><p class="eyebrow">Banco de documentos</p><h1><img src="images/mongo.png" alt=""/> MongoDB</h1><p>Collections, documentos e decisões de modelagem do Astro.</p></div>${tab === 'decisions' ? editButton('mongo/docs/modeling.json', mode) : ''}</header>
    <div class="tabs"><a href="#/mongo" class="tab ${tab === 'collections' ? 'active' : ''}">Collections <span class="mongo-count">${collections.length}</span></a><a href="#/mongo-model" class="tab ${tab === 'model' ? 'active' : ''}">Modelagem</a><a href="#/mongo-decisions" class="tab ${tab === 'decisions' ? 'active' : ''}">Decisões de modelagem</a></div>
    ${error ? `<div class="empty"><strong>Não foi possível carregar o catálogo MongoDB.</strong><p>${escapeHtml(error)}</p><button class="button ghost" data-mongo-retry>Tentar novamente</button></div>` : !data ? '<p class="muted">Carregando collections…</p>' : tab === 'model' ? mongoModelView(data, model) : tab === 'decisions' ? `<div class="grid-2"><section class="card"><h2>Organização dos documentos</h2>${(modeling.principles ?? []).map((entry) => `<div class="mongo-decision"><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.description)}</p></div>`).join('')}</section><section class="card"><h2>Decisões em aberto</h2>${(modeling.decisions ?? []).map((entry) => `<div class="mongo-decision"><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.description)}</p></div>`).join('')}</section></div>` : `<div class="mongo-layout"><aside class="card mongo-catalog"><div class="mongo-catalog-head"><label class="search-box" for="mongo-search">${icon('search', 16)}<input id="mongo-search" type="search" aria-label="Buscar collection ou campo" placeholder="Buscar collection ou campo…" value="${escapeHtml(query)}"/></label><p class="mongo-catalog-count">${filtered.length} de ${collections.length} collections</p></div><div class="mongo-collection-list">${filtered.map((collection) => `<button class="mongo-collection ${active?.name === collection.name ? 'active' : ''}" data-mongo-select="${escapeHtml(collection.name)}" aria-pressed="${active?.name === collection.name}"><strong>${escapeHtml(collection.name)}</strong><span>${escapeHtml(collection.title)}</span><small>${collection.fields.length} campos · ${escapeHtml(collection.status)}</small></button>`).join('')}</div></aside>${active ? collectionDetail(active, mode) : '<div class="empty"><strong>Nenhuma collection encontrada.</strong><p>Ajuste a busca ou adicione uma definição em mongo/collections/.</p></div>'}</div>`}
    ${data?.issues?.length ? `<section class="card"><h2>Avisos do catálogo</h2><ul>${data.issues.map((issue) => `<li>${escapeHtml(issue.file)}: ${escapeHtml(issue.message)}</li>`).join('')}</ul></section>` : ''}`;
}
