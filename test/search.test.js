import assert from 'node:assert/strict';
import test from 'node:test';
import {
  columnName,
  columnNames,
  normalizeSearchValue,
  sameIdentifier,
  searchColumns,
  searchDatabase,
  searchObjects
} from '../site/services/search.js';
import { searchResults } from '../site/views.js';

/**
 * O erro original: `index.columns` é uma lista de strings (["email"]), enquanto
 * `table.columns` é uma lista de objetos. A busca chamava `column.name.toLowerCase()`
 * para todos os objetos e quebrava assim que existia um índice no projeto.
 */
const database = {
  dialect: 'postgresql',
  files: [
    { path: 'database/scripts/02_create_tables.sql', category: 'scripts', content: 'CREATE TABLE clientes ();', size: 24 },
    { path: 'database/indexes/idx_cliente_email.sql', category: 'indexes', content: 'CREATE INDEX ...', size: 16 }
  ],
  objects: [
    {
      id: 'table:clientes', name: 'clientes', type: 'table', file: 'database/scripts/02_create_tables.sql',
      columns: [{ name: 'id', dataType: 'BIGSERIAL' }, { name: 'email', dataType: 'VARCHAR(150)' }],
      dependencies: [], usedBy: ['vw_pedidos_cliente']
    },
    {
      id: 'index:idx_cliente_email', name: 'idx_cliente_email', type: 'index', file: 'database/indexes/idx_cliente_email.sql',
      table: 'clientes', columns: ['email'], dependencies: ['clientes'], usedBy: []
    },
    {
      id: 'view:vw_pedidos_cliente', name: 'vw_pedidos_cliente', type: 'view', file: 'database/views/vw_pedidos_cliente.sql',
      dependencies: ['clientes'], usedBy: []
    }
  ]
};

test('regressão: busca com índice no projeto não lança TypeError de toLowerCase', () => {
  // Antes da correção, esta chamada quebrava com
  // "Cannot read properties of undefined (reading 'toLowerCase')".
  assert.doesNotThrow(() => searchDatabase(database, 'cliente'));
  assert.doesNotThrow(() => searchResults(database, 'cliente'));
  const result = searchDatabase(database, 'cliente');
  assert.ok(result.total > 0);
});

test('pesquisa normal encontra objeto, arquivo e coluna', () => {
  const result = searchDatabase(database, 'email');
  assert.ok(result.objects.some((object) => object.name === 'idx_cliente_email'));
  assert.ok(result.columns.some(({ column }) => column.name === 'email'));
  assert.ok(result.files.some((file) => file.path.endsWith('idx_cliente_email.sql')));
});

test('pesquisa é case-insensitive e ignora acentos', () => {
  for (const query of ['CLIENTES', 'Clientes', 'clientes', ' clientes ']) {
    assert.equal(searchObjects(database.objects, query).length, searchObjects(database.objects, 'clientes').length);
    assert.ok(searchObjects(database.objects, query).length > 0);
  }
  assert.equal(normalizeSearchValue('Índice'), 'indice');
  assert.ok(searchObjects([{ name: 'índice_ação', type: 'index' }], 'indice_acao').length === 1);
});

test('objeto sem name, sem file ou sem type continua pesquisável', () => {
  const objects = [
    { id: 'a', type: 'file', file: 'database/scripts/teste.sql' },
    { id: 'b', name: 'clientes' },
    { id: 'c', name: 'pedidos', type: 'table', file: undefined }
  ];
  assert.doesNotThrow(() => searchObjects(objects, 'teste'));
  assert.equal(searchObjects(objects, 'teste').length, 1);
  assert.equal(searchObjects(objects, 'clientes').length, 1);
  assert.equal(searchObjects(objects, 'pedidos').length, 1);
});

test('coluna sem nome e arrays inexistentes não quebram a busca', () => {
  const objects = [
    { id: 'a', name: 'clientes', type: 'table', columns: [{ dataType: 'INT' }, null, undefined, { name: 'email' }] },
    { id: 'b', name: 'pedidos', type: 'table' }
  ];
  assert.doesNotThrow(() => searchColumns(objects, 'email'));
  assert.equal(searchColumns(objects, 'email').length, 1);
  assert.deepEqual(columnNames(objects[0]), ['email']);
  assert.deepEqual(columnNames(objects[1]), []);
});

test('valores não-string são normalizados sem erro', () => {
  const objects = [{ id: 1, name: 42, type: { toString: () => 'objeto' }, file: ['a', 'b'], columns: [7, true] }];
  assert.doesNotThrow(() => searchDatabase({ objects, files: [] }, '42'));
  assert.equal(searchObjects(objects, '42').length, 1);
  assert.equal(normalizeSearchValue(null), '');
  assert.equal(normalizeSearchValue(undefined), '');
  assert.equal(normalizeSearchValue(0), '0');
  assert.equal(columnName('email'), 'email');
  assert.equal(columnName({ name: 'email' }), 'email');
  assert.equal(columnName(null), '');
});

test('campo vazio, só espaços e caracteres especiais retornam estado vazio', () => {
  for (const query of ['', '   ', null, undefined, '\t\n']) {
    const result = searchDatabase(database, query);
    assert.equal(result.total, 0);
    assert.doesNotThrow(() => searchResults(database, query));
  }
  const special = searchDatabase(database, '%$#@!*(){}[]');
  assert.equal(special.total, 0);
});

test('pesquisa sem resultados devolve listas vazias, não erro', () => {
  const result = searchDatabase(database, 'objeto_que_nao_existe');
  assert.deepEqual([result.objects.length, result.columns.length, result.files.length], [0, 0, 0]);
  assert.match(searchResults(database, 'objeto_que_nao_existe'), /Tente buscar por outro nome/);
});

test('busca cobre prefixos usados no projeto e caminhos de arquivo', () => {
  for (const query of ['vw_', 'idx_', '.sql', 'database/indexes']) {
    assert.ok(searchDatabase(database, query).total > 0, `esperava resultados para ${query}`);
  }
});

test('sameIdentifier compara com schema, caixa e valores ausentes', () => {
  assert.ok(sameIdentifier('public.clientes', 'CLIENTES'));
  assert.ok(sameIdentifier('clientes', 'clientes'));
  assert.equal(sameIdentifier(undefined, 'clientes'), false);
  assert.equal(sameIdentifier(null, null), false);
});
