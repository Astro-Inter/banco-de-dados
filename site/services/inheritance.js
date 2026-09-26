import { sameIdentifier } from './search.js';
import { escapeHtml, isTableLike } from '../utils.js';

/** Herança declarada no SQL; referências por FK não tornam uma tabela base. */
export function inheritanceOf(table, objects = []) {
  if (!isTableLike(table)) return { parents: [], children: [] };
  return {
    parents: table.inherits ?? [],
    children: objects.filter((object) => isTableLike(object) && (object.inherits ?? []).some((name) => sameIdentifier(name, table.name)))
  };
}

export function inheritanceMarkup(table, objects = []) {
  const { parents, children } = inheritanceOf(table, objects);
  if (!parents.length && !children.length) return '';
  return `<div class="inheritance-note">${children.length ? `<span title="${escapeHtml(`Herdada por: ${children.map((child) => child.name).join(', ')}`)}">Tabela base de herança</span>` : ''}${parents.length ? `<span>Herda de ${parents.map(escapeHtml).join(', ')}</span>` : ''}</div>`;
}
