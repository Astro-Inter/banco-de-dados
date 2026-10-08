# API de cargos

Os caminhos abaixo são sugestões. Em todas as chamadas, use o `firebase_uid` recebido para identificar o gestor. As funções e procedures do banco validam o gestor ativo e o workspace do cargo.

## 1. Listar cargos

**GET `/cargos?firebase_uid={firebase_uid}`**

Chama `fn_seleciona_cargos(firebase_uid)`.

Retorna a lista para a tabela:

```json
[
  {
    "id_cargo": 12,
    "id_workspace": 3,
    "nome": "Gerente",
    "quantidade_colaboradores": 25,
    "status": "Ativo"
  }
]
```

Mapeie a coluna `cargo` para `nome`. `id_cargo` é usado nas ações; `id_workspace` está disponível na view. A quantidade conta colaboradores ativos.

## 2. Mostrar NRs ligadas a um cargo

**GET `/cargos/{id_cargo}/nrs?firebase_uid={firebase_uid}`**

Chama `fn_seleciona_cargo_nrs(firebase_uid, id_cargo)`. Retorna as NRs já ligadas ao cargo:

```json
[
  { "codigo_nr": 1, "descricao": "Disposições gerais e gerenciamento de riscos ocupacionais." }
]
```

O front pode exibir `codigo_nr` como `NR1`.

## 3. Listar NRs disponíveis para selecionar

**GET `/cargos/{id_cargo}/nrs/opcoes?firebase_uid={firebase_uid}`**

1. Consulte a collection Mongo `NRs`, filtrando `usabilidade` igual a `Colaborador`.
2. Chame `fn_seleciona_cargo_nrs(firebase_uid, id_cargo)` para obter os códigos já ligados ao cargo.
3. Para cada documento do Mongo, compare o `_id` numérico com `codigo_nr` da função. Retorne `ativo: true` quando a NR já estiver ligada e `false` quando não estiver.

Exemplo de resposta:

```json
[
  { "nr": 1, "descricao": "Disposições gerais e gerenciamento de riscos ocupacionais.", "ativo": true },
  { "nr": 2, "descricao": "Inspeção preliminar e medidas de controle.", "ativo": false }
]
```

Use `descricao` do documento Mongo e o `_id` como número da NR.

O modelo Mongo deste repositório está documentado como `nr_catalogo` em `mongo/collections/nr_catalogo.json`; confirme se a collection usada pela aplicação tem o nome `NRs`. Para ligar uma NR ao cargo, o número também precisa existir em `nr_catalogo.codigo_nr` no PostgreSQL.

## 4. Criar cargo

**POST `/cargos`**

Recebe `firebase_uid`, `nome` e `status` (`Ativo` ou `Inativo`):

```json
{
  "firebase_uid": "uid-do-firebase",
  "nome": "Gerente",
  "status": "Ativo"
}
```

Chama `pr_inseri_cargo(firebase_uid, nome, status)`. O workspace é obtido pelo gestor; `status` é gravado no campo `cargo.ativo`.

## 5. Alternar status do cargo

**PATCH `/cargos/{id_cargo}/status`**

Recebe `firebase_uid` no corpo e usa `id_cargo` da rota:

```json
{ "firebase_uid": "uid-do-firebase" }
```

Chama `fn_altera_status_cargo(firebase_uid, id_cargo)`. Alterna entre ativo e inativo; retorna `true` se ficou ativo e `false` se ficou inativo.

## 6. Editar cargo

**PUT `/cargos/{id_cargo}`**

Recebe `firebase_uid`, `nome` e `status` (`Ativo` ou `Inativo`); usa `id_cargo` da rota:

```json
{
  "firebase_uid": "uid-do-firebase",
  "nome": "Gerente regional",
  "status": "Ativo"
}
```

Chama `fn_altera_cargo(firebase_uid, id_cargo, nome, status)`. Retorna os dados atualizados do cargo.

## 7. Alterar NRs ligadas ao cargo

**POST `/cargos/{id_cargo}/nrs`**

Recebe `firebase_uid` e uma lista de NRs; usa `id_cargo` da rota:

```json
{
  "firebase_uid": "uid-do-firebase",
  "nrs": [
    { "nr": 1, "ativo": true },
    { "nr": 17, "ativo": false }
  ]
}
```

Chama `pr_alterar_cargo_nrs(firebase_uid, id_cargo, nrs)`. `ativo: true` liga a NR ao cargo; `false` remove a ligação. Cada item atualiza somente a NR indicada.
