import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { analyzeWorkspace } from '../analyzer/index.js';
import { generateGitHistory } from '../analyzer/git/history.js';
import { findPath } from '../analyzer/dependencies/graph.js';
import { analyzeImpact } from '../analyzer/impact/analyze-impact.js';
import { loadConfig, workspaceRoot } from '../analyzer/config.js';
import { mimeType, readJson, sendJson } from './http.js';
import { createSqlFile, deleteSqlFile, readSqlFile, renameSqlFile, writeSqlFile } from './services/file-service.js';
import { searchObjects } from '../site/services/search.js';
import { databaseApi } from './routes/database.js';
import { closeAllSessions } from './database/connection-service.js';

const run = promisify(execFile);
const port = Number(process.env.PORT || 4173);
let database = await analyzeWorkspace();

/**
 * O Histórico do Banco é lido do arquivo estático nos dois modos. No Local Mode
 * ele é regenerado ao iniciar para não ficar defasado; falhar aqui nunca impede
 * o workspace de subir.
 */
const history = await generateGitHistory().catch((error) => {
  console.warn(`Histórico do Banco não pôde ser gerado: ${error.message}`);
  return null;
});
if (history && !history.available) console.log(`Histórico Git indisponível: ${history.message}`);

async function refresh() {
  database = await analyzeWorkspace();
  return database;
}

async function gitStatus() {
  try {
    const { stdout } = await run('git', ['status', '--short'], { cwd: workspaceRoot });
    return stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => ({ status: line.slice(0, 2), file: line.slice(3) }));
  } catch { return []; }
}

async function api(request, response, url) {
  if (url.pathname.startsWith('/api/database/')) {
    if (await databaseApi(request, response, url, { getDatabase: () => database })) return;
    return sendJson(response, 404, { error: 'Endpoint não encontrado.' });
  }
  if (request.method === 'GET' && url.pathname === '/api/status') {
    const config = await loadConfig();
    return sendJson(response, 200, { mode: 'local', editable: true, execution: config.execution?.enabled !== false });
  }
  if (request.method === 'GET' && url.pathname === '/api/objects') return sendJson(response, 200, database);
  if (request.method === 'GET' && url.pathname === '/api/dependencies') return sendJson(response, 200, database.dependencies);
  if (request.method === 'GET' && url.pathname === '/api/files/content') return sendJson(response, 200, { path: url.searchParams.get('path'), content: await readSqlFile(url.searchParams.get('path')) });
  if (request.method === 'GET' && url.pathname === '/api/search') {
    return sendJson(response, 200, searchObjects(database.objects, url.searchParams.get('q')));
  }
  if (request.method === 'GET' && url.pathname === '/api/path') return sendJson(response, 200, findPath(database.objects, url.searchParams.get('from'), url.searchParams.get('to')));
  if (request.method === 'GET' && url.pathname === '/api/changes') return sendJson(response, 200, await gitStatus());
  if (request.method === 'POST' && url.pathname === '/api/impact-analysis') return sendJson(response, 200, analyzeImpact(database, await readJson(request)));
  if (request.method === 'PUT' && url.pathname === '/api/files/content') {
    const body = await readJson(request); await writeSqlFile(body.path, body.content); await refresh();
    return sendJson(response, 200, { saved: true });
  }
  if (request.method === 'POST' && url.pathname === '/api/files') {
    const body = await readJson(request); const file = await createSqlFile(body.category, body.filename, body.content); await refresh();
    return sendJson(response, 201, { created: true, file });
  }
  if (request.method === 'PATCH' && url.pathname === '/api/files') {
    const body = await readJson(request); const file = await renameSqlFile(body.path, body.filename); await refresh();
    return sendJson(response, 200, { renamed: true, file });
  }
  if (request.method === 'DELETE' && url.pathname === '/api/files') {
    const body = await readJson(request); await deleteSqlFile(body.path); await refresh();
    return sendJson(response, 200, { deleted: true });
  }
  return sendJson(response, 404, { error: 'Endpoint não encontrado.' });
}

async function staticFile(response, url) {
  const config = await loadConfig();
  let relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  if (relative.startsWith('/generated/') || relative.startsWith('/models/')) {
    const file = path.resolve(workspaceRoot, `.${relative}`);
    const root = path.resolve(workspaceRoot, relative.startsWith('/models/') ? 'models' : config.generated);
    if (!file.startsWith(root)) throw new Error('Caminho inválido.');
    return { file, content: await fs.readFile(file) };
  }
  const root = path.resolve(workspaceRoot, config.site);
  let file = path.resolve(root, `.${relative}`);
  if (!file.startsWith(root)) throw new Error('Caminho inválido.');
  try { return { file, content: await fs.readFile(file) }; }
  catch { file = path.join(root, 'index.html'); return { file, content: await fs.readFile(file) }; }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(request, response, url);
    const asset = await staticFile(response, url);
    response.writeHead(200, { 'Content-Type': `${mimeType(asset.file)}; charset=utf-8` });
    response.end(asset.content);
  } catch (error) {
    const status = ['ENOENT', 'EEXIST'].includes(error.code) ? 404 : 400;
    sendJson(response, status, { error: error.message || 'Erro inesperado.' });
  }
});

server.on('error', (error) => {
  if (error.code !== 'EADDRINUSE') throw error;
  console.error(`A porta ${port} já está em uso.`);
  console.error(`Se o workspace já estiver rodando, abra http://localhost:${port}`);
  console.error(`Para usar outra porta: PORT=${port + 1} npm run dev`);
  process.exit(1);
});

server.listen(port, () => console.log(`Astro Database Workspace em http://localhost:${port}`));

// Encerrar o processo fecha as conexões abertas e apaga as credenciais da memória.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await closeAllSessions();
    server.close(() => process.exit(0));
  });
}
