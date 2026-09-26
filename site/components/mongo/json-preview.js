import { escapeHtml } from '../../utils.js';

/** Destaca tokens antes de escapar o texto, preservando o JSON original. */
function highlightLine(line) {
  const tokens = /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let result = '';
  let offset = 0;
  for (const match of line.matchAll(tokens)) {
    result += escapeHtml(line.slice(offset, match.index));
    const token = match[0];
    const kind = token.startsWith('"')
      ? /^\s*:/.test(line.slice(match.index + token.length)) ? 'key' : 'string'
      : token === 'null' ? 'null' : /^(true|false)$/.test(token) ? 'boolean' : 'number';
    result += `<span class="json-${kind}">${escapeHtml(token)}</span>`;
    offset = match.index + token.length;
  }
  return result + escapeHtml(line.slice(offset));
}

export function jsonPreview(value) {
  return `<div class="code-shell mongo-json-shell"><div class="code-head"><span>Documento de exemplo</span><span>JSON</span></div><pre class="code code-lines mongo-json" tabindex="0" aria-label="Documento JSON de exemplo"><code>${JSON.stringify(value, null, 2).split('\n').map((line) => `<span class="code-line">${highlightLine(line)}</span>`).join('')}</code></pre></div>`;
}
