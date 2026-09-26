# Documentação MongoDB

Este módulo documenta propostas de modelagem. Não executa comandos MongoDB nem substitui a aprovação das regras de negócio.

- `collections/*.json`: uma definição por collection ou modelo, com nome, finalidade, campos, exemplo, observações e índices documentados.
- `docs/modeling.json`: princípios e decisões pendentes.
- `analyzer/mongo/`: leitura e validação do catálogo, independente do parser SQL.
- `site/components/mongo/`: interface da área MongoDB.

Os arquivos JSON são a fonte da documentação. Nos exemplos, datas usam `$date`. A modelagem de formulários registra a proposta de uma collection por formulário, sem decidir por uma única collection física. Notificações continuam com destino MongoDB/Redis em aberto. Tipos, obrigatoriedade e índices ainda precisam de validação.

No modo local, use **Editar documentação** na collection ou na aba de decisões. Revise as alterações e salve para atualizar o arquivo JSON e o catálogo. Para editar os arquivos diretamente, altere os JSONs e execute `npm run analyze` ou `npm run build`. O snapshot `generated/mongo.json` atende tanto ao modo local quanto ao site estático. PostgreSQL continua em `database/`; seus scripts, métricas, execução e histórico permanecem separados do catálogo MongoDB.

Uma nova definição deve conter `name`, `title`, `description`, `status`, `pattern`, `fields`, `example`, `notes` e `indexes`. Cada campo usa `name`, `type`, `description` e `required` (`Sim`, `Não` ou `A definir`). Não coloque credenciais ou dados reais nos exemplos.

A aba **Modelagem** mostra collections e documentos embutidos, com busca, zoom e arraste dos cards. Caminhos como `mensagens[].role` detalham um documento embutido no campo `mensagens` de tipo `array<object>`. Para documentar uma referência entre collections, acrescente `references` ao campo com o nome da collection de destino, por exemplo `"references": "nr_catalogo"`. IDs sem essa declaração não geram ligações. As posições arrastadas são temporárias durante a navegação; os arquivos JSON definem a estrutura do diagrama.
