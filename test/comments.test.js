import assert from 'node:assert/strict';
import test from 'node:test';
import { extractComments, splitQualifiedName, unquoteSqlString } from '../analyzer/comments/postgresql.js';
import { applyComments, commentExtractor } from '../analyzer/comments/index.js';
import { parsePostgreSqlFile } from '../analyzer/parser/postgresql.js';
import { analyzeWorkspace } from '../analyzer/index.js';
import { searchDatabase } from '../site/services/search.js';

const tableSql = `CREATE TABLE public.clientes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL
);`;

function parse(files) {
  const parsed = files.map((file) => ({ file, result: parsePostgreSqlFile(file) }));
  const objects = parsed.flatMap((item) => item.result.objects);
  const comments = parsed.flatMap((item) => item.result.comments);
  const issues = applyComments(objects, comments, new Map(files.map((file) => [file.path, file])));
  return { objects, comments, issues };
}

test('COMMENT ON TABLE vira a descrição da tabela', () => {
  const { objects } = parse([{
    path: 'database/scripts/tabelas.sql',
    category: 'scripts',
    content: `${tableSql}\nCOMMENT ON TABLE clientes IS 'Tabela responsável pelos clientes cadastrados na plataforma.';`
  }]);
  assert.equal(objects[0].description, 'Tabela responsável pelos clientes cadastrados na plataforma.');
});

test('COMMENT ON COLUMN vira a descrição da coluna', () => {
  const { objects } = parse([{
    path: 'database/scripts/tabelas.sql',
    category: 'scripts',
    content: `${tableSql}
COMMENT ON COLUMN clientes.id IS 'Identificador único do cliente.';
COMMENT ON COLUMN clientes.email IS 'E-mail principal utilizado para comunicação.';`
  }]);
  const columns = Object.fromEntries(objects[0].columns.map((column) => [column.name, column.description]));
  assert.equal(columns.id, 'Identificador único do cliente.');
  assert.equal(columns.email, 'E-mail principal utilizado para comunicação.');
  assert.equal(columns.nome, null);
});

test('o prefixo do schema não quebra a associação', () => {
  const { objects, issues } = parse([{
    path: 'database/scripts/tabelas.sql',
    category: 'scripts',
    content: `${tableSql}
COMMENT ON TABLE public.clientes IS 'Tabela de clientes.';
COMMENT ON COLUMN public.clientes.email IS 'E-mail principal do cliente.';`
  }]);
  assert.equal(objects[0].description, 'Tabela de clientes.');
  assert.equal(objects[0].columns.find((column) => column.name === 'email').description, 'E-mail principal do cliente.');
  assert.equal(issues.length, 0);
});

test('o comentário pode estar em outro arquivo, depois da criação da tabela', () => {
  const { objects, issues } = parse([
    { path: 'database/scripts/01_tabelas.sql', category: 'scripts', content: tableSql },
    { path: 'database/scripts/99_documentacao.sql', category: 'scripts', content: "COMMENT ON TABLE clientes IS 'Documentada em outro arquivo.';\nCOMMENT ON COLUMN clientes.nome IS 'Nome completo.';" }
  ]);
  assert.equal(objects[0].description, 'Documentada em outro arquivo.');
  assert.equal(objects[0].columns.find((column) => column.name === 'nome').description, 'Nome completo.');
  assert.equal(issues.length, 0);
});

test('acentos, aspas escapadas e caracteres especiais são preservados', () => {
  const { objects } = parse([{
    path: 'database/scripts/tabelas.sql',
    category: 'scripts',
    content: `${tableSql}
COMMENT ON COLUMN clientes.nome IS 'Nome completo do cliente, incluindo ''sobrenome'' quando informado.';
COMMENT ON TABLE clientes IS 'Ações, informações & registros — 100% do cadastro.';`
  }]);
  assert.equal(objects[0].columns.find((column) => column.name === 'nome').description, "Nome completo do cliente, incluindo 'sobrenome' quando informado.");
  assert.equal(objects[0].description, 'Ações, informações & registros — 100% do cadastro.');
  assert.equal(unquoteSqlString("'a''b'"), "a'b");
  assert.equal(unquoteSqlString('NULL'), null);
});

test('COMMENT ... IS NULL remove a descrição sem exibir o texto NULL', () => {
  const { objects } = parse([{
    path: 'database/scripts/tabelas.sql',
    category: 'scripts',
    content: `${tableSql}
COMMENT ON COLUMN clientes.email IS 'Descrição temporária.';
COMMENT ON COLUMN clientes.email IS NULL;`
  }]);
  assert.equal(objects[0].columns.find((column) => column.name === 'email').description, null);
});

test('dois comentários para o mesmo objeto: o último vence e gera aviso', () => {
  const { objects, issues } = parse([{
    path: 'database/scripts/tabelas.sql',
    category: 'scripts',
    content: `${tableSql}
COMMENT ON COLUMN clientes.email IS 'Descrição 1';
COMMENT ON COLUMN clientes.email IS 'Descrição 2';`
  }]);
  assert.equal(objects[0].columns.find((column) => column.name === 'email').description, 'Descrição 2');
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /sobrescrita/);
});

test('comentário para tabela ou coluna inexistente vira aviso e não interrompe', () => {
  const { objects, issues } = parse([{
    path: 'database/scripts/tabelas.sql',
    category: 'scripts',
    content: `${tableSql}
COMMENT ON COLUMN clientes.telefone IS 'Telefone principal.';
COMMENT ON TABLE fornecedores IS 'Tabela que não existe nos scripts.';
COMMENT ON COLUMN clientes.nome IS 'Nome completo.';`
  }]);
  assert.equal(objects.length, 1, 'a tabela válida continua sendo interpretada');
  assert.equal(objects[0].columns.find((column) => column.name === 'nome').description, 'Nome completo.');
  assert.equal(issues.length, 2);
  assert.match(issues[0].message, /coluna não localizada: clientes\.telefone/);
  assert.match(issues[1].message, /objeto não localizado: fornecedores/);
  assert.ok(issues.every((issue) => issue.severity === 'warning'));
});

test('Log Tables também recebem descrição de tabela e de coluna', () => {
  const { objects } = parse([{
    path: 'database/logs/log_pedidos.sql',
    category: 'logs',
    content: `CREATE TABLE log_pedidos (id BIGSERIAL PRIMARY KEY, status_anterior VARCHAR(30), status_novo VARCHAR(30));
COMMENT ON TABLE log_pedidos IS 'Registra todas as alterações de status realizadas nos pedidos.';
COMMENT ON COLUMN log_pedidos.status_anterior IS 'Status do pedido antes da alteração.';
COMMENT ON COLUMN log_pedidos.status_novo IS 'Status do pedido após a alteração.';`
  }]);
  assert.equal(objects[0].type, 'log-table');
  assert.equal(objects[0].description, 'Registra todas as alterações de status realizadas nos pedidos.');
  assert.equal(objects[0].columns.find((column) => column.name === 'status_anterior').description, 'Status do pedido antes da alteração.');
});

test('outros objetos também aceitam description', () => {
  const { objects } = parse([{
    path: 'database/views/vw_pedidos.sql',
    category: 'views',
    content: `CREATE VIEW vw_pedidos AS SELECT * FROM pedidos;
COMMENT ON VIEW vw_pedidos IS 'Consolidação dos pedidos por cliente.';`
  }]);
  assert.equal(objects[0].description, 'Consolidação dos pedidos por cliente.');
});

test('extrator reconhece a sintaxe do dialeto e ignora a palavra solta', () => {
  assert.equal(typeof commentExtractor('postgresql'), 'function');
  assert.equal(commentExtractor('mysql'), null);
  assert.deepEqual(extractComments('SELECT comments FROM tabela;'), []);
  assert.deepEqual(splitQualifiedName('public."clientes".email'), ['public', 'clientes', 'email']);
  const [comment] = extractComments("COMMENT ON TABLE public.clientes IS 'x';");
  assert.deepEqual([comment.kind, comment.schema, comment.object, comment.description], ['TABLE', 'public', 'clientes', 'x']);
});

test('comentário SQL de linha não é confundido com COMMENT ON', () => {
  const { objects } = parse([{
    path: 'database/scripts/tabelas.sql',
    category: 'scripts',
    content: `${tableSql}
-- COMMENT ON TABLE clientes IS 'Comentado, não deve valer';
COMMENT ON TABLE clientes IS 'Descrição válida -- com hífens no texto.';`
  }]);
  assert.equal(objects[0].description, 'Descrição válida -- com hífens no texto.');
});

test('busca global encontra objetos pela descrição', () => {
  const database = {
    files: [],
    objects: [{
      id: 'table:clientes', name: 'clientes', type: 'table', databaseType: 'table', file: 'a.sql',
      description: 'Armazena pessoas que compram produtos na plataforma.',
      columns: [{ name: 'email', dataType: 'VARCHAR', description: 'Endereço de e-mail para autenticação.' }]
    }]
  };
  assert.equal(searchDatabase(database, 'compram produtos').objects.length, 1);
  assert.equal(searchDatabase(database, 'autenticação').objects.length, 1);
  assert.equal(searchDatabase(database, 'AUTENTICACAO').objects.length, 1);
  assert.doesNotThrow(() => searchDatabase({ objects: [{ id: 'x', description: null }], files: [] }, 'nada'));
});

test('o snapshot gerado leva as descrições para a interface', async () => {
  const database = await analyzeWorkspace({ write: false });
  const workspaces = database.objects.find((object) => object.name === 'workspaces');
  assert.match(workspaces.description, /ambientes clientes/);
  assert.equal(workspaces.columns.find((column) => column.name === 'nome').description, 'Nome empresarial ou nome de exibição do workspace.');
  const log = database.objects.find((object) => object.name === 'insere_log');
  assert.match(log.description, /registros inseridos/);
  // Criação e documentação vivem no mesmo script, e o COMMENT ON continua
  // visível no código-fonte exibido pelo visualizador.
  const script = database.files.find((file) => file.path.endsWith('1_create_table.sql'));
  assert.match(script.content, /CREATE TABLE workspaces/);
  assert.match(script.content, /COMMENT ON TABLE workspaces/);
});
