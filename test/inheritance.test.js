import assert from 'node:assert/strict';
import test from 'node:test';
import { inheritanceOf, inheritanceMarkup } from '../site/services/inheritance.js';
import { computeLayout } from '../site/components/database-model/model-layout.js';
import { renderDiagram } from '../site/components/database-model/model-renderer.js';

const base = { id: 'conta', type: 'table', name: 'public.conta', columns: [] };
const child = { id: 'usuario', type: 'table', name: 'usuario', inherits: ['CONTA'], columns: [] };
const reference = { id: 'evento', type: 'table', name: 'evento', columns: [{ name: 'conta_id', references: 'public.conta' }] };

test('identifica a base pelo INHERITS com schema e caixa, sem confundir FK com herança', () => {
  assert.deepEqual(inheritanceOf(base, [base, child, reference]).children, [child]);
  assert.deepEqual(inheritanceOf(child, [base, child]).parents, ['CONTA']);
  assert.equal(inheritanceMarkup(reference, [base, child, reference]), '');
});

test('a base continua identificada no diagrama quando as filhas não estão visíveis', () => {
  const layout = computeLayout([base]);
  const markup = renderDiagram([base], layout, layout.positions, {}, undefined, [base, child]);
  assert.match(markup, /Tabela base de herança/);
  assert.match(markup, /Fornece colunas para: usuario/);
});

test('nomes de tabelas são escapados na indicação de herança', () => {
  const table = { ...child, name: '<usuario>', inherits: ['<conta>'] };
  assert.match(inheritanceMarkup(table), /&lt;conta&gt;/);
  assert.doesNotMatch(inheritanceMarkup(table), /<conta>/);
});
