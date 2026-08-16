import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeWorkspace } from '../analyzer/index.js';
import { generateGitHistory } from '../analyzer/git/history.js';
import { loadConfig, workspaceRoot } from '../analyzer/config.js';
import { buildIconLibrary } from './build-icons.js';

const config = await loadConfig();
const dist = path.join(workspaceRoot, 'dist');
// A biblioteca de ícones é regenerada a partir dos SVGs para nunca ficar
// dessincronizada com os assets da identidade visual.
await buildIconLibrary();
await analyzeWorkspace();
// O Histórico do Banco é estático: o site publicado nunca executa Git.
const history = await generateGitHistory({ config });
if (!history.available) console.warn(`Histórico Git indisponível: ${history.message}`);
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
await fs.cp(path.join(workspaceRoot, config.site), dist, { recursive: true });
await fs.cp(path.join(workspaceRoot, config.generated), path.join(dist, 'generated'), { recursive: true });
try { await fs.cp(path.join(workspaceRoot, 'models'), path.join(dist, 'models'), { recursive: true }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Build estático criado em ${path.relative(workspaceRoot, dist)}/`);
