import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeMongo } from '../analyzer/mongo/index.js';
import { createMongoModelState, mongoGraph, mongoModelLayout, mongoModelView } from '../site/components/mongo/mongo-model.js';

test('modelagem deriva documentos embutidos dos campos sem inventar referências por IDs', async () => {
  const data = await analyzeMongo({ write: false });
  const graph = mongoGraph(data.collections);
  assert.equal(graph.nodes.filter((node) => node.type === 'collection').length, 5);
  assert.ok(graph.edges.some((edge) => edge.from === 'chatbot_sessoes' && edge.to === 'chatbot_sessoes::mensagens'));
  assert.ok(graph.edges.some((edge) => edge.from === 'forms' && edge.to === 'forms::perguntas'));
  assert.equal(graph.edges.filter((edge) => edge.type === 'reference').length, 0);
  const layout = mongoModelLayout(graph);
  for (const node of graph.nodes) assert.ok(layout.positions[node.id]);
});

test('referências explícitas só ligam collections existentes', () => {
  const collections = [{ name: 'a', fields: [{ name: 'b_id', type: 'number', references: 'b' }, { name: 'externo_id', type: 'number', references: 'externo' }] }, { name: 'b', fields: [] }];
  assert.deepEqual(mongoGraph(collections).edges, [{ from: 'a', to: 'b', label: 'b_id', type: 'reference' }]);
});

test('modelagem escapa conteúdo e suporta catálogo vazio', () => {
  const data = { collections: [{ name: '<script>', description: '<unsafe>', fields: [] }] };
  const markup = mongoModelView(data, createMongoModelState());
  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /&lt;script&gt;/);
  assert.match(mongoModelView({ collections: [] }, createMongoModelState()), /Nenhuma collection documentada/);
});
