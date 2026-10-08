import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyzeNeo4j, materializeScript, parseProperties } from '../analyzer/neo4j/index.js';
import { workspaceRoot } from '../analyzer/config.js';
import { createNeo4jModelState, schemaGraph, traverseTraining, visibleGraph, graphLayout } from '../site/components/neo4j/neo4j-model.js';
import { neo4jView, neo4jMatches } from '../site/components/neo4j/neo4j-view.js';

test('Neo4j materializa toda a carga do documento e preserva os tipos e vínculos', async () => {
  const data = await analyzeNeo4j({ write: false });
  assert.deepEqual(data.counts, { nodes: 66, relationships: 59, labels: 6, scripts: 12 });
  assert.deepEqual(data.issues, []);
  const counts = Object.fromEntries(data.relationships.map(({ type }) => [type, data.graph.edges.filter((edge) => edge.type === type).length]));
  assert.deepEqual(counts, { PERTENCE: 15, PARTICIPA: 8, POSSUI: 12, REALIZA: 12, RECEBE: 12 });
  const node = data.graph.nodes.find((entry) => entry.id === 'Evento:1');
  assert.deepEqual(node.properties, { id_evento: 1, data_evento: '2026-08-15', horario: '08:00' });
  assert.equal(data.graph.nodes.find((entry) => entry.id === 'Colaborador:15').properties.nome, 'Larissa Mendes');
  assert.deepEqual(parseProperties("nome:'Exemplo; valor', id:7, ativo:true"), { nome: 'Exemplo; valor', id: 7, ativo: true });
});

test('traversal segue relações reais e não presume participação por IDs ou nomes iguais', async () => {
  const data = await analyzeNeo4j({ write: false });
  const paths = traverseTraining(data.graph);
  assert.equal(paths.length, 5);
  assert.deepEqual(paths.map((entry) => entry.row.colaborador), ['João Silva', 'Maria Souza', 'Pedro Lima', 'Lucas Oliveira', 'Fernanda Costa']);
  assert.ok(paths.every((entry) => entry.row.data_treinamento === '2026-08-15' && entry.nodes.includes('GrupoTreinamento:1')));
  assert.ok(paths.every((entry) => !entry.nodes.includes('GrupoTreinamento:5')));
  const withoutParticipation = { ...data.graph, edges: data.graph.edges.filter((edge) => edge.type !== 'PARTICIPA') };
  assert.deepEqual(traverseTraining(withoutParticipation), []);
});

test('esquema e filtros mantêm endpoints existentes e unidades sem participações', async () => {
  const data = await analyzeNeo4j({ write: false });
  assert.equal(schemaGraph(data).nodes.length, 6);
  assert.equal(schemaGraph(data).edges.length, 5);
  const state = { ...createNeo4jModelState(), view: 'sample', unit: 'Unidade:Construtora Horizonte S.A.' };
  const filtered = visibleGraph(data, state);
  assert.equal(filtered.nodes.length, 6);
  assert.equal(filtered.edges.length, 5);
  assert.ok(filtered.edges.every((edge) => edge.type === 'PERTENCE'));
  state.unit = ''; state.label = 'Evento';
  assert.equal(visibleGraph(data, state).nodes.length, 12);
  assert.equal(visibleGraph(data, state).edges.length, 0);
  state.label = ''; state.traversal = true;
  const traversal = visibleGraph(data, state);
  assert.equal(traversal.nodes.length, 8);
  assert.equal(traversal.edges.length, 7);
  const layout = graphLayout(traversal, 'sample');
  assert.ok(traversal.nodes.every((node) => layout.positions[node.id]));
});

test('sintaxe de carga desconhecida gera aviso sem aplicar uma etapa parcial', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-neo4j-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.cp(path.join(workspaceRoot, 'neo4j'), path.join(root, 'neo4j'), { recursive: true });
  await fs.appendFile(path.join(root, 'neo4j/scripts/01-criar-unidades.cypher'), "\nCREATE (u4:Unidade {nome:'Extra', grupo_empresarial:'Extra'});\nSET u4.nome = 'Outro';\n");
  const data = await analyzeNeo4j({ root, write: false });
  assert.ok(data.issues.some((issue) => issue.file.endsWith('01-criar-unidades.cypher')));
  assert.equal(data.graph.nodes.filter((node) => node.label === 'Unidade').length, 0);
  assert.throws(() => materializeScript('CREATE (x:Outro {id:1});', { nodes: [], edges: [] }, data), /sem documentação/);
});

test('documentação pesquisa dados, escapa conteúdo e apresenta scripts completos no modo estático', async () => {
  const data = await analyzeNeo4j({ write: false });
  assert.ok(neo4jMatches(data.labels.find((label) => label.name === 'Colaborador'), 'patricia', data));
  const unsafe = structuredClone(data);
  unsafe.graph.nodes.find((node) => node.label === 'Colaborador').properties.nome = '<script>alert(1)</script>';
  const state = { query: '', selected: 'Colaborador', scriptQuery: '', scriptSelected: null, model: createNeo4jModelState() };
  const docs = neo4jView(unsafe, state);
  assert.doesNotMatch(docs, /<script>/);
  assert.match(docs, /&lt;script&gt;/);
  assert.match(neo4jView(data, { ...state, tab: 'scripts', scriptSelected: 'neo4j/scripts/12-traversal-nr10.cypher' }), /c\.nome AS colaborador/);
  assert.match(neo4jView(data, { ...state, tab: 'model' }), /Simular consulta NR-10/);
  assert.match(neo4jView(data, { ...state, query: 'inexistente' }), /Nenhuma documentação encontrada/);
  assert.match(neo4jView(null, { error: 'Sem dados' }), /Tentar novamente/);
});
