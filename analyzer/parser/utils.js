export function cleanName(value = '') {
  return value.replace(/[\[\]`"']/g, '').replace(/^(dbo|public)\./i, '').trim();
}

export function splitCommaAware(value) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Remove comentários SQL preservando literais entre aspas simples: textos como
 * `'Cliente -- pessoa física'` não podem ser truncados, senão a descrição de um
 * `COMMENT ON` chegaria pela metade ao modelo normalizado.
 */
export function stripComments(sql) {
  const text = String(sql ?? '');
  let result = '';
  let index = 0;
  let quoted = false;
  while (index < text.length) {
    const char = text[index];
    if (quoted) {
      result += char;
      if (char === "'") quoted = false;
      index += 1;
      continue;
    }
    if (char === "'") { quoted = true; result += char; index += 1; continue; }
    if (char === '-' && text[index + 1] === '-') {
      while (index < text.length && text[index] !== '\n') index += 1;
      result += ' ';
      continue;
    }
    if (char === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2);
      const stop = end === -1 ? text.length : end + 2;
      result += text.slice(index, stop).replace(/[^\n]/g, ' ');
      index = stop;
      continue;
    }
    result += char;
    index += 1;
  }
  return result;
}

export function findReferences(sql) {
  const clean = stripComments(sql);
  const names = [];
  const expression = /\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM|REFERENCES)\s+([\[\]`"\w.]+)/gi;
  let match;
  while ((match = expression.exec(clean))) names.push(cleanName(match[1]));
  return unique(names);
}
