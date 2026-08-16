import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDestructiveOperations, destructiveSummary, requiresDestructiveConfirmation } from '../server/database/destructive-analyzer.js';
import { findNonTransactionalStatements, requiresAdministrativeExecution, splitStatements } from '../server/database/sql-text.js';

function operations(sql) {
  return analyzeDestructiveOperations(sql, 'database/scripts/teste.sql').map((finding) => finding.operation);
}

test('detecta os comandos destrutivos obrigatórios', () => {
  assert.deepEqual(operations('DROP TABLE clientes;'), ['DROP TABLE']);
  assert.deepEqual(operations('DROP DATABASE astro;'), ['DROP DATABASE']);
  assert.deepEqual(operations('DROP SCHEMA public CASCADE;'), ['DROP SCHEMA']);
  assert.deepEqual(operations('DROP VIEW vw_clientes;'), ['DROP VIEW']);
  assert.deepEqual(operations('DROP FUNCTION fn_total();'), ['DROP FUNCTION']);
  assert.deepEqual(operations('DROP PROCEDURE sp_relatorio();'), ['DROP PROCEDURE']);
  assert.deepEqual(operations('TRUNCATE TABLE pedidos;'), ['TRUNCATE']);
  assert.deepEqual(operations('ALTER TABLE clientes DROP COLUMN email;'), ['DROP COLUMN']);
});

test('DELETE sem WHERE é destrutivo e DELETE com WHERE não é', () => {
  assert.deepEqual(operations('DELETE FROM clientes;'), ['DELETE sem WHERE']);
  assert.deepEqual(operations('DELETE FROM clientes WHERE id = 1;'), []);
  assert.deepEqual(operations('UPDATE clientes SET nome = upper(nome);'), ['UPDATE sem WHERE']);
  assert.deepEqual(operations('UPDATE clientes SET nome = upper(nome) WHERE id = 1;'), []);
});

test('não confunde comentários e literais com comandos reais', () => {
  assert.deepEqual(operations("-- DROP TABLE clientes\nSELECT 1;"), []);
  assert.deepEqual(operations('/* DROP TABLE clientes */ SELECT 1;'), []);
  assert.deepEqual(operations("INSERT INTO logs (mensagem) VALUES ('DROP TABLE clientes');"), []);
});

test('descreve o achado com alvo, arquivo, linha e severidade', () => {
  const [finding] = analyzeDestructiveOperations('SELECT 1;\n\nDROP TABLE public.clientes;', 'database/scripts/remove_clientes.sql');
  assert.equal(finding.operation, 'DROP TABLE');
  assert.equal(finding.target, 'public.clientes');
  assert.equal(finding.file, 'database/scripts/remove_clientes.sql');
  assert.equal(finding.severity, 'critical');
  assert.equal(finding.line, 3);
  assert.match(finding.message, /perda permanente de dados/);
  assert.equal(requiresDestructiveConfirmation([finding]), true);
  assert.equal(requiresDestructiveConfirmation([]), false);
  assert.deepEqual(destructiveSummary([finding]), { total: 1, critical: 1, warning: 0 });
});

test('não fatia corpos $$ ao separar comandos para análise', () => {
  const sql = `CREATE FUNCTION exemplo() RETURNS trigger AS $$
BEGIN
    UPDATE clientes SET nome = upper(nome);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SELECT 1;`;
  const statements = splitStatements(sql);
  assert.equal(statements.length, 2);
  assert.match(statements[0].sql, /CREATE FUNCTION/);
  assert.match(statements[1].sql, /SELECT 1/);
});

test('identifica comandos administrativos e não transacionais', () => {
  assert.equal(requiresAdministrativeExecution('CREATE DATABASE astro;'), true);
  assert.equal(requiresAdministrativeExecution('CREATE TABLE clientes (id INT);'), false);
  assert.deepEqual(findNonTransactionalStatements('CREATE DATABASE astro;'), ['CREATE DATABASE']);
  assert.deepEqual(findNonTransactionalStatements('CREATE INDEX CONCURRENTLY idx ON t (c);'), ['CREATE INDEX CONCURRENTLY']);
  assert.deepEqual(findNonTransactionalStatements('CREATE TABLE t (id INT);'), []);
});
