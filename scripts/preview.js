import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { workspaceRoot } from '../analyzer/config.js';
import { mimeType } from '../server/http.js';

/**
 * Pré-visualização do site publicado (GitHub Pages).
 *
 * Serve apenas o conteúdo estático de `dist/`, sem nenhuma API: é exatamente o
 * que o GitHub Pages entrega. Como `GET /api/status` responde 404, a interface
 * cai sozinha em Read Only — o mesmo caminho de código do site publicado.
 */
const dist = path.join(workspaceRoot, 'dist');
const port = Number(process.env.PORT || 4174);

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  // O Pages não tem backend: qualquer rota de API precisa falhar aqui também.
  if (url.pathname.startsWith('/api/')) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return response.end(JSON.stringify({ error: 'Sem backend no GitHub Pages.' }));
  }

  const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.resolve(dist, `.${relative}`);
  if (!file.startsWith(dist)) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return response.end('Caminho inválido.');
  }

  try {
    const content = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': `${mimeType(file)}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    try {
      const fallback = await fs.readFile(path.join(dist, 'index.html'));
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(fallback);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Execute npm run build antes de pré-visualizar.');
    }
  }
});

try {
  await fs.access(path.join(dist, 'index.html'));
} catch {
  console.error('dist/ ainda não existe. Rode npm run build primeiro.');
  process.exit(1);
}

// Porta ocupada é uma situação comum (a pré-visualização já estar aberta) e não
// merece um stack trace: explique o que fazer.
server.on('error', (error) => {
  if (error.code !== 'EADDRINUSE') throw error;
  console.error(`A porta ${port} já está em uso.`);
  console.error(`Se a pré-visualização já estiver rodando, abra http://localhost:${port}`);
  console.error(`Para usar outra porta: PORT=${port + 1} npm run preview`);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Pré-visualização Read Only (GitHub Pages) em http://localhost:${port}`);
  console.log('Sem backend: edição, Git e Executar Banco aparecem bloqueados, como no site publicado.');
  console.log('Encerre com Ctrl+C.');
});
