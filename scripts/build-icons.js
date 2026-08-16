import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspaceRoot } from '../analyzer/config.js';

/**
 * Gera `site/icons-library.js` a partir dos SVGs da identidade visual do Astro
 * (`site/images/*.svg`).
 *
 * Os assets são a fonte da verdade dos ícones: este script apenas normaliza a
 * cor para `currentColor` e remove width/height, para que o mesmo desenho sirva
 * em qualquer tamanho e herde a cor do contexto. Rode `npm run icons` depois de
 * adicionar ou substituir um SVG.
 */
const source = path.join(workspaceRoot, 'site', 'images');
const target = path.join(workspaceRoot, 'site', 'icons-library.js');

// A marca é usada como <img> na sidebar e possui gradiente próprio.
const excluded = new Set(['astro.svg']);

function normalize(svg) {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) return null;
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    .replace(/stroke="#F6F6F6"/g, 'stroke="currentColor"')
    .replace(/fill="#F6F6F6"/g, 'fill="currentColor"')
    .replace(/stroke="white"/g, 'stroke="currentColor"')
    .replace(/\s+/g, ' ')
    .trim();
  return { viewBox, body };
}

export async function buildIconLibrary() {
  const files = (await fs.readdir(source)).filter((file) => file.endsWith('.svg') && !excluded.has(file)).sort();
  const library = {};
  const skipped = [];
  for (const file of files) {
    const normalized = normalize(await fs.readFile(path.join(source, file), 'utf8'));
    if (!normalized) { skipped.push(file); continue; }
    library[path.basename(file, '.svg')] = normalized;
  }
  const contents = `// Arquivo gerado por scripts/build-icons.js a partir de site/images/*.svg.
// Não edite à mão: adicione ou substitua o SVG e rode \`npm run icons\`.
export const iconLibrary = ${JSON.stringify(library, null, 1)};
`;
  await fs.writeFile(target, contents, 'utf8');
  return { total: Object.keys(library).length, skipped };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await buildIconLibrary();
  console.log(`Biblioteca de ícones: ${result.total} asset(s) em site/icons-library.js.`);
  if (result.skipped.length) console.log(`Ignorados (sem viewBox): ${result.skipped.join(', ')}`);
}
