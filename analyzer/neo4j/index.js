import fs from 'node:fs/promises';
import path from 'node:path';
import { workspaceRoot, loadConfig } from '../config.js';

// Materializa apenas o subconjunto literal usado na carga documentada.
// Não executa Cypher nem se conecta ao Neo4j; sintaxe desconhecida gera aviso.
const literal = "(?:date\\(\\s*'(?:\\\\.|[^'])*'\\s*\\)|'(?:\\\\.|[^'])*'|-?\\d+(?:\\.\\d+)?|true|false|null)";

export function parseProperties(text) {
  const properties = {};
  const pattern = new RegExp(`(\\w+)\\s*:\\s*(${literal})`, 'g');
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (text.slice(last, match.index).replace(/[\s,]/g, '')) throw new Error('Propriedade Cypher não suportada na prévia.');
    const value = match[2];
    properties[match[1]] = value.startsWith('date(') ? value.match(/'([^']+)'/)[1]
      : value.startsWith("'") ? value.slice(1, -1).replace(/\\(['\\])/g, '$1')
        : value === 'null' ? null : value === 'true' ? true : value === 'false' ? false : Number(value);
    last = match.index + match[0].length;
  }
  if (text.slice(last).replace(/\s/g, '')) throw new Error('Propriedade Cypher não suportada na prévia.');
  return properties;
}

export function materializeScript(code, graph, catalog) {
  const clean = code.replace(/^\s*\/\/.*$/gm, '');
  const statements = clean.match(/(?:'(?:\\.|[^'])*'|[^';])+;?/g) ?? [];
  for (const statement of statements) {
    if (!statement.trim()) continue;
    const createIndex = statement.search(/\bCREATE\b/);
    if (createIndex < 0) throw new Error('Carga sem CREATE ou sintaxe não suportada na prévia.');
    const prefix = statement.slice(0, createIndex);
    const creation = statement.slice(createIndex + 6).replace(/;\s*$/, '').trim();
    const bindings = new Map();
    const where = prefix.match(/\bWHERE\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)\s*$/);
    let remainingPrefix = where ? prefix.slice(0, where.index) : prefix;
    remainingPrefix = remainingPrefix.replace(/MATCH\s*\((\w+):(\w+)(?:\s*\{([^}]+)\})?\)\s*/g, (_, variable, label, values) => {
      const properties = values ? parseProperties(values) : {};
      bindings.set(variable, graph.nodes.filter((node) => node.label === label && Object.entries(properties).every(([key, value]) => node.properties[key] === value)));
      return '';
    });
    if (remainingPrefix.trim()) throw new Error('MATCH ou WHERE não suportado na prévia.');
    const nodePattern = /\((\w+):(\w+)\s*\{([^}]+)\}\)/g;
    let remainder = creation.replace(nodePattern, (_, variable, label, values) => {
      const definition = catalog.labels.find((item) => item.name === label);
      if (!definition) throw new Error(`Label ${label} sem documentação.`);
      const properties = parseProperties(values);
      if (properties[definition.identity] == null) throw new Error(`Identificador ausente em ${label}.`);
      const id = `${label}:${properties[definition.identity]}`;
      if (graph.nodes.some((node) => node.id === id)) throw new Error(`Nó duplicado na carga: ${id}.`);
      const node = { id, label, properties };
      graph.nodes.push(node);
      bindings.set(variable, [node]);
      return '';
    });
    remainder = remainder.replace(/\((\w+)\)-\[:(\w+)\]->\((\w+)\)/g, (_, from, type, to) => {
      const definition = catalog.relationships.find((item) => item.type === type);
      if (!definition || !bindings.has(from) || !bindings.has(to)) throw new Error(`Relacionamento ${type} sem definição ou variável vinculada.`);
      let count = 0;
      for (const source of bindings.get(from)) for (const target of bindings.get(to)) {
        const variables = { [from]: source, [to]: target };
        if (where) {
          const left = variables[where[1]]?.properties[where[2]];
          const right = variables[where[3]]?.properties[where[4]];
          if (left == null || right == null || left !== right) continue;
        }
        if (source.label !== definition.from || target.label !== definition.to) throw new Error(`Endpoints de ${type} divergentes da documentação.`);
        graph.edges.push({ id: `r${graph.edges.length + 1}`, from: source.id, to: target.id, type });
        count++;
      }
      if (!count) throw new Error(`Nenhum vínculo encontrado para ${type}.`);
      return '';
    });
    if (remainder.replace(/[\s,]/g, '')) throw new Error('CREATE não suportado na prévia.');
  }
}

export async function analyzeNeo4j({ root = workspaceRoot, write = true, generated } = {}) {
  const catalog = JSON.parse(await fs.readFile(path.join(root, 'neo4j/docs/catalog.json'), 'utf8'));
  const graph = { nodes: [], edges: [] };
  const scripts = [];
  const issues = [];
  for (const entry of catalog.scripts) {
    if (!/^[\w-]+\.cypher$/.test(entry.file)) throw new Error('Nome de script Neo4j inválido.');
    const file = `neo4j/scripts/${entry.file}`;
    try {
      const code = await fs.readFile(path.join(root, file), 'utf8');
      scripts.push({ ...entry, file, title: code.match(/^\/\/\s*\d+\.\s*(.+)/)?.[1] ?? entry.file, code });
      if (entry.kind === 'load') {
        const candidate = structuredClone(graph);
        materializeScript(code, candidate, catalog);
        graph.nodes = candidate.nodes;
        graph.edges = candidate.edges;
      }
    } catch (error) { issues.push({ file, message: error.message }); }
  }
  const result = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), ...catalog, scripts, graph, issues,
    counts: { nodes: graph.nodes.length, relationships: graph.edges.length, labels: catalog.labels.length, scripts: scripts.length }
  };
  if (write) {
    const output = path.resolve(root, generated ?? (await loadConfig()).generated);
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'neo4j.json'), JSON.stringify(result, null, 2));
  }
  return result;
}
