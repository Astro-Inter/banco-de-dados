import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyComments } from './comments/index.js';
import { loadConfig, workspaceRoot } from './config.js';
import { buildDependencyGraph } from './dependencies/graph.js';
import { applyAlterTableConstraints, parseSqlServerFile } from './parser/sqlserver.js';
import { parsePostgreSqlFile } from './parser/postgresql.js';
import { scanSqlFiles } from './scanners/sql-file-scanner.js';

const parsers = { postgresql: parsePostgreSqlFile, postgres: parsePostgreSqlFile, sqlserver: parseSqlServerFile };

export async function analyzeWorkspace({ write = true } = {}) {
  const config = await loadConfig();
  const files = await scanSqlFiles(workspaceRoot, config.database.paths);
  const parser = parsers[config.database.dialect];
  if (!parser) throw new Error(`Dialeto não suportado: ${config.database.dialect}`);
  const parsed = files.map(parser);
  const objects = parsed.flatMap((result) => result.objects);
  const constraintIssues = applyAlterTableConstraints(objects, parsed.flatMap((result) => result.constraints ?? []));
  // As descrições (COMMENT ON) são aplicadas depois de ler todos os arquivos,
  // porque o comentário pode estar em um script de documentação separado.
  const commentIssues = applyComments(
    objects,
    parsed.flatMap((result) => result.comments ?? []),
    new Map(files.map((file) => [file.path, file]))
  );
  const dependencies = buildDependencyGraph(objects);
  const now = new Date().toISOString();
  const counts = Object.fromEntries(['table', 'log-table', 'view', 'procedure', 'function', 'index', 'trigger', 'dataload'].map((type) => [type, objects.filter((object) => object.type === type).length]));
  const database = {
    schemaVersion: 1,
    project: config.project,
    models: config.models,
    dialect: config.database.dialect,
    // As pastas configuradas viajam com o snapshot: a interface monta caminhos
    // (Novo SQL, Histórico) a partir daqui, nunca de literais no frontend.
    paths: config.database.paths,
    generatedAt: now,
    counts: { ...counts, files: files.length },
    files: files.map(({ category, path: filePath, content }) => ({ category, path: filePath, size: Buffer.byteLength(content), content })),
    objects,
    dependencies,
    issues: [...parsed.flatMap((result) => result.issues), ...constraintIssues, ...commentIssues]
  };
  if (write) {
    const generated = path.resolve(workspaceRoot, config.generated);
    await fs.mkdir(generated, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(generated, 'database.json'), JSON.stringify(database, null, 2)),
      fs.writeFile(path.join(generated, 'objects.json'), JSON.stringify(objects, null, 2)),
      fs.writeFile(path.join(generated, 'dependencies.json'), JSON.stringify(dependencies, null, 2)),
      fs.writeFile(path.join(generated, 'metadata.json'), JSON.stringify({ generatedAt: now, counts: database.counts, dialect: database.dialect }, null, 2))
    ]);
  }
  return database;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await analyzeWorkspace();
  console.log(`Analyzer: ${result.counts.files} arquivo(s), ${result.objects.length} objeto(s), ${result.issues.length} aviso(s).`);
}
