import { openDocumentationEditor } from '../documentation/documentation-editor.js';

export function openMongoEditor(modal, file, onSaved) {
  return openDocumentationEditor(modal, file, onSaved);
}
