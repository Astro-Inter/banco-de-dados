# Endpoints de cargos

## GET — listar cargos

Recebe o `firebase_uid` e chama `fn_seleciona_cargos(firebase_uid)`.

Retorna a lista para a tabela com:

- `nome`
- `quantidade_colaboradores`
- `status` (`Ativo` ou `Inativo`)
- `id_cargo`, para identificar o cargo nas ações de alterar status e editar

A função SQL retorna o nome na coluna `cargo`; mapear esse valor para `nome` no DTO. A view também fornece `id_workspace`. A quantidade considera colaboradores ativos.

## POST — criar cargo

Recebe:

- `firebase_uid`
- `nome`
- `status` (`Ativo` ou `Inativo`)

Chama `pr_inseri_cargo(firebase_uid, nome, status)`. A procedure valida o gestor e cria o cargo no workspace dele, gravando o status no campo `ativo`.

## PATCH — alternar status

Recebe:

- `firebase_uid`
- `id_cargo`

Chama `fn_altera_status_cargo(firebase_uid, id_cargo)`. A função alterna o status e retorna `true` se ficou ativo ou `false` se ficou inativo.

## PUT — editar cargo

Recebe:

- `firebase_uid`
- `id_cargo`
- `nome`
- `status` (`Ativo` ou `Inativo`)

Chama `fn_altera_cargo(firebase_uid, id_cargo, nome, status)`. A função valida o acesso, atualiza o cargo e retorna os dados atualizados.
