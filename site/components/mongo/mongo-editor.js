import { escapeHtml, diffLines } from '../../utils.js';
import { diffMarkup } from '../../views.js';
import { api } from '../../services/api.js';

export async function openMongoEditor(modal, file, onSaved) {
  const { content: originalContent } = await api(`mongo/content?path=${encodeURIComponent(file)}`);
  let draft = originalContent;
  modal.classList.add('modal-tall');
  modal.style.width = 'min(1100px, calc(100vw - 32px))';

  function editor() {
    modal.innerHTML = `<form class="modal-body mongo-editor-form" id="mongo-editor-form"><p class="eyebrow">Editor local · MongoDB</p><h2>Editar documentação</h2><p class="muted">${escapeHtml(file)}</p><p>Altere os campos, exemplos e observações do documento JSON.</p><label for="mongo-editor-content">Documento JSON</label><textarea id="mongo-editor-content" class="code-editor modal-scroll" spellcheck="false">${escapeHtml(draft)}</textarea><p id="mongo-editor-error" class="mongo-editor-error" role="alert"></p><div class="modal-actions"><button type="button" class="button ghost" data-close-modal>Cancelar</button><button class="button primary" type="submit">Revisar e salvar</button></div></form>`;
    modal.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      draft = modal.querySelector('textarea').value;
      try { JSON.parse(draft); }
      catch { modal.querySelector('#mongo-editor-error').textContent = 'JSON inválido. Revise a sintaxe antes de continuar.'; return; }
      review();
    });
  }

  function review() {
    modal.innerHTML = `<form class="modal-body mongo-editor-form"><p class="eyebrow">Revisão · MongoDB</p><h2>Revisar alterações</h2><p class="muted">${escapeHtml(file)}</p><div class="modal-scroll">${diffMarkup(diffLines(originalContent, draft))}</div><p id="mongo-editor-error" class="mongo-editor-error" role="alert"></p><div class="modal-actions"><button type="button" class="button ghost" id="mongo-back">Voltar ao editor</button><button type="button" class="button ghost" data-close-modal>Cancelar</button><button type="submit" class="button primary">Salvar documento</button></div></form>`;
    modal.querySelector('#mongo-back').addEventListener('click', editor);
    modal.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = modal.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const result = await api('mongo/content', { method: 'PUT', body: JSON.stringify({ path: file, content: draft, originalContent }) });
        modal.close();
        onSaved(result.data);
      } catch (error) {
        modal.querySelector('#mongo-editor-error').textContent = error.message;
        button.disabled = false;
      }
    });
  }
  editor();
  modal.showModal();
}
