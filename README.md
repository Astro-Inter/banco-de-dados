# Astro Database Workspace

O Astro Database Workspace transforma arquivos `.sql` em documentação navegável. Ele cataloga objetos, revela dependências, encontra caminhos entre objetos, estima o impacto de alterações e, quando executado localmente, edita os próprios arquivos do repositório.

> Foco em PostgreSQL. Os arquivos SQL continuam sendo a fonte da verdade: no Local Mode eles também podem ser **executados** em um banco informado por você, na ordem calculada pelo grafo de dependências.

## O que a V1 oferece

- Dashboard com contadores, data de geração e saúde do analyzer;
- Explorer de tabelas, **Log Tables**, views, procedures, functions, índices, triggers e Data Loads;
- Descrições de tabelas e colunas lidas dos `COMMENT ON` do próprio SQL;
- Modelagem física navegável com busca, filtros, seleção e relacionamentos explicados;
- Colunas, tipos, nullability, defaults, PKs, FKs e constraints;
- Visualizador SQL com realce de sintaxe, cópia e caminho do arquivo;
- Relações “Depende de” e “Usado por”;
- Grafo de dependências e busca de caminho entre objetos;
- Busca global por objetos, colunas e arquivos;
- Análise de impacto explicável, com pesos centralizados;
- Editor local com diff antes do salvamento;
- Criação, renomeação e exclusão confirmada de arquivos SQL;
- Consulta somente de leitura ao `git status`;
- **Histórico do Banco**: evolução dos arquivos SQL commit a commit, com diff, busca e filtros, também no GitHub Pages;
- Build estático e workflow para GitHub Pages;
- Estados vazios e erros isolados por arquivo;
- **Executar Banco**: conexão PostgreSQL, plano de execução, validação e migração (somente no Local Mode).

## Read Only e Local Mode

A interface consulta `GET /api/status` ao iniciar. Se a API responder, o modo local habilita as operações de filesystem. Se a API estiver indisponível, a interface carrega `generated/database.json` e assume Read Only.

No **Read Only**, todas as funções de documentação, busca, dependências e navegação permanecem disponíveis. Nenhum arquivo pode ser alterado. No **Local Mode**, a API Node valida as operações e modifica os `.sql` reais; o Git reconhece essas mudanças normalmente.

## Instalação e execução

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Acesse `http://localhost:4173`. A única dependência de runtime é o driver [`pg`](https://node-postgres.com/), usado exclusivamente pela página **Executar Banco**; toda a documentação, análise e edição funcionam sem qualquer banco instalado.

Comandos disponíveis:

```bash
npm run dev         # analyzer + API local + frontend
npm run analyze     # atualiza os JSON em generated/
npm run git-history # regenera generated/git-history.json a partir do git log
npm run icons     # regenera a biblioteca de ícones a partir de site/images/
npm run preview   # simula o GitHub Pages: build + servidor estático Read Only
npm test          # executa os testes automatizados
npm run build     # gera o site estático em dist/
npm start         # inicia o workspace local
```

## Estrutura

```text
database/       arquivos SQL independentes da aplicação
analyzer/       scanner, parser, grafo, impacto e geração de JSON
analyzer/git/   histórico Git filtrado pelos arquivos SQL do banco
server/         API local e acesso seguro ao filesystem
server/database/  adapters, plano, validação, histórico e runner da migração
site/           frontend estático
site/components/database-model/  explorador visual da modelagem física
site/images/    biblioteca de ícones da identidade visual
models/         imagens conceitual e lógica
generated/      representação normalizada gerada
scripts/        automações de build
test/           testes automatizados
.github/        publicação no GitHub Pages
```

O fluxo principal é:

```text
Arquivos SQL → scanner/parser → modelo normalizado → dependências → JSON/API → interface
```

O diretório `database/` não depende do site ou do servidor e continua utilizável isoladamente.

## Como adicionar scripts

Coloque arquivos `.sql` na categoria correspondente:

- `database/scripts`: criação do banco e tabelas;
- `database/dataload`: cargas de dados;
- `database/functions`: functions;
- `database/views`: views;
- `database/procedures`: procedures;
- `database/indexes`: índices;
- `database/triggers`: triggers PostgreSQL;
- `database/logs`: tabelas de log (documentadas como Log Tables).

Depois execute `npm run analyze`, ou use o modo local, que reprocessa o workspace após criar, editar, renomear ou excluir um arquivo pela interface.

Os diretórios são configuráveis em [database-workspace.config.json](database-workspace.config.json). Evite codificar novos caminhos diretamente nos módulos.

## Onde trocar as imagens

A aplicação utiliza arquivos de imagem apenas na página **Modelagem**:

- `models/conceitual.png`: modelo conceitual;
- `models/logico.png`: modelo lógico.

Você pode substituir esses dois arquivos mantendo os nomes ou apontar para outros arquivos na seção `models` de `database-workspace.config.json`:

```json
"models": {
  "conceptual": "models/minha-imagem-conceitual.png",
  "logical": "models/minha-imagem-logica.png"
}
```

Os caminhos são enviados pelo analyzer em `analyzer/index.js` e renderizados em `site/views.js`. A troca normal deve ser feita apenas na configuração central. O pequeno planeta do menu não é uma imagem: ele é desenhado pelas classes `.brand-planet` em `site/styles.css`.

A V1 apresenta as imagens fornecidas e não tenta gerar diagramas conceituais ou lógicos automaticamente.

## Analyzer

O scanner percorre apenas as pastas configuradas. O parser PostgreSQL identifica inicialmente tabelas, colunas, constraints, views, procedures, functions, parâmetros, índices, triggers e Data Loads. Para triggers, registra tabela, função executada, momento, eventos, nível e dependências. Ele reconhece construções comuns como `CREATE OR REPLACE`, `IF NOT EXISTS`, parâmetros PostgreSQL, `LANGUAGE` e índices `USING`. Cada arquivo produz objetos e ocorrências independentes: um SQL vazio ou parcialmente interpretável não impede os demais arquivos de serem processados.

Os artefatos gerados são:

- `generated/database.json`: snapshot completo;
- `generated/objects.json`: objetos normalizados;
- `generated/dependencies.json`: arestas do grafo;
- `generated/metadata.json`: contadores e geração;
- `generated/git-history.json` e `generated/git-history/<hash>.json`: Histórico do Banco.

O parser usa uma estratégia modular por dialeto. Para adicionar outro dialeto, implemente uma estratégia compatível em `analyzer/parser/` e registre-a em `analyzer/index.js`.

O modelo é tolerante por natureza: um arquivo parcialmente interpretado pode gerar objetos sem `name` ou sem colunas, e `columns` tem duas formas legítimas — tabelas descrevem objetos (`{ name, dataType, … }`) e índices listam apenas nomes (`['email']`). Por isso a busca global e as comparações de identificadores passam por `site/services/search.js` (`normalizeSearchValue`, `columnName`, `sameIdentifier`), usado tanto pelo frontend quanto por `GET /api/search`. Nenhum consumidor deve chamar `.toLowerCase()` direto em um valor do modelo.

## Criar tabelas pela interface

Na página **Banco de Dados** (Local Mode):

- **Ver script SQL** abre o script de criação inteiro para edição. Você vê todo o SQL existente — tabelas e comentários — e escreve a tabela nova direto no código.

Novas tabelas entram sempre no **mesmo arquivo** das demais, então não há um script de documentação paralelo para manter — e é por isso que existe um único botão: criar e editar são a mesma ação sobre o mesmo arquivo. O diff é exibido antes de salvar e o analyzer reprocessa o workspace em seguida. No Read Only o botão apenas explica que a edição exige o modo local.

## Modelagem física

A aba **Modelagem** (dentro de Banco de Dados) é o explorador visual da arquitetura do banco — não apenas um desenho estático.

- **Layout automático por dependência**: as tabelas são organizadas em níveis a partir das chaves estrangeiras que o Analyzer já conhece, de modo que `clientes → pedidos → log_pedidos` se lê da esquerda para a direita. A ordem dentro de cada coluna usa baricentro para reduzir cruzamentos, e Log Tables sem relação vão para o final. Não existe um segundo sistema de dependências.
- **Busca** (`Buscar tabela…`): localiza por nome, coluna ou descrição, centraliza a tabela no canvas e a destaca temporariamente.
- **Filtros**: `Todas`, `Tabelas`, `Log Tables`.
- **Zoom** de 40% a 200% por scroll ou pelos botões, com indicador percentual. **Ajustar à tela** calcula o zoom a partir do conteúdo real; **Restaurar** devolve zoom, pan e o layout automático (inclusive de tabelas movidas à mão).
- **Navegação**: arraste o fundo para mover o canvas; arraste um card para reposicionar a tabela.
- **Seleção**: clique destaca a tabela e as diretamente relacionadas, esmaecendo as demais, e abre um painel de contexto com descrição, contagem de colunas/PK/FK, "usado por" e **Abrir detalhes**. Duplo clique continua abrindo os detalhes completos.
- **Relacionamentos**: cada linha liga a coluna de origem à coluna de destino; passar o mouse destaca a relação e clicar mostra `tabela.coluna → tabela.coluna` com o nome da constraint.
- **Log Tables** são identificadas por ícone e tag `LOG`, sem sair da identidade visual.
- Um erro de parser em um arquivo **não esconde o diagrama**: os objetos válidos continuam aparecendo e o alerta é exibido separadamente.

Tudo funciona apenas com o snapshot gerado, então a modelagem continua completa no GitHub Pages. Mover o canvas ou aplicar zoom nunca dispara o Analyzer: dados, layout, renderização e interação são módulos separados em `site/components/database-model/`.

## Ícones e identidade visual

O Astro Database Workspace utiliza uma **biblioteca própria de ícones**, versionada em `site/images/*.svg`. Não devem ser adicionadas bibliotecas externas de ícones (Lucide, Font Awesome, Material, Bootstrap, Heroicons), emojis ou caracteres Unicode simulando ícones sem aprovação.

Caso uma funcionalidade nova precise de um ícone inexistente, **o asset correspondente deve ser solicitado antes da implementação visual** — nunca substituído por um ícone genérico.

Como funciona:

```text
site/images/*.svg  →  npm run icons  →  site/icons-library.js  →  site/icons.js
```

- `scripts/build-icons.js` normaliza os SVGs (cor para `currentColor`, sem width/height fixos) e gera a biblioteca. O `npm run build` regenera automaticamente;
- `site/icons.js` mapeia **nomes semânticos** (`table`, `logTable`, `primaryKey`, `foreignKey`, `search`, `filter`…) para os assets, de modo que trocar o desenho de um conceito é uma alteração de uma linha;
- o HTML declara apenas `data-icon="…"` e a aplicação injeta o ícone, mantendo uma única fonte da verdade;
- ícones decorativos usam `aria-hidden="true"`; botões só com ícone têm `aria-label` e tooltip. Nenhuma ação é comunicada apenas pelo desenho.

Associação semântica principal: Grid (tabelas), Clock/Log (Log Tables), Key (PK), Link (FK), Add Column (colunas), Search (busca), Filter (filtros), Zoom In/Minus (zoom), Expand (ajustar), Reset (restaurar), Refresh (atualizar), Info Circle (informações), New Tab (abrir objeto), Check Circle (sucesso), Copy, Edit, Trash, Play Circle (executar), Setting (configurações).

O Histórico do Banco usa **Clock 2** (relógio com seta de retorno) para o próprio histórico — na navegação lateral e no Histórico de Execuções —, **List 3** na lista de arquivos do commit e reaproveita os assets existentes: Document Add (arquivo adicionado), Edit (modificado), Document Missing (removido), Right (renomeado), Search, Filter, Chevron Right e New Tab. O relógio simples (**Clock**) ficou com as Log Tables e **List 4** (lista numerada) marca o Plano de execução, que é uma ordem. **Commit** ainda não tem asset próprio: usa Tag como stand-in do próprio projeto e continua declarado em `pendingIcons` — nada de ícone genérico, emoji ou Unicode como substituto. Ao receber o asset, salve `commit.svg` em `site/images/`, rode `npm run icons` e aponte o nome semântico para ele.

Um teste automatizado garante que nenhum arquivo do frontend volte a usar emoji ou biblioteca externa de ícones.

## Análise de impacto

A análise percorre transitivamente os dependentes do objeto selecionado. Cada tipo afetado soma um peso, e relações indiretas adicionam peso próprio. A configuração fica centralizada em `analyzer/impact/weights.js`.

O resultado inclui nível, pontuação, dependências diretas e indiretas, arquivos, explicações e sugestões. Ele é uma recomendação estática: a V1 não altera automaticamente os objetos relacionados.

## Tabelas de Log

Log Tables são **tabelas físicas do banco** que ganham categoria própria na documentação. Elas continuam tendo colunas, PK, FK, constraints, índices, dependências e código SQL como qualquer tabela — mas aparecem separadas de `Tables` no dashboard, nos filtros, na busca e na modelagem.

No modelo normalizado:

```json
{
  "type": "log-table",
  "databaseType": "table",
  "name": "log_pedidos"
}
```

### Como criar uma Log Table

Pelo **Novo SQL** (Local Mode), escolha a categoria **Log Table** e informe o nome do arquivo:

```text
Categoria   Log Table
Nome        log_pedidos.sql
Resultado   database/logs/log_pedidos.sql
```

O destino é mostrado no próprio formulário e vem de `database.paths.logs`, não de um caminho escrito na interface. A extensão `.sql` e as demais validações do sistema de arquivos continuam valendo. Log Table é a única categoria com modelo inicial (chave e carimbo de tempo), aplicado apenas enquanto o campo de conteúdo estiver intocado; as outras continuam criando arquivos vazios.

Fora da interface, basta colocar o `CREATE TABLE` em `database/logs`:

```text
database/logs/
├── log_clientes.sql
└── log_pedidos.sql
```

A pasta é configurável em `database.paths.logs` de [database-workspace.config.json](database-workspace.config.json). Depois execute `npm run analyze` (ou use o Local Mode, que reprocessa sozinho).

**A classificação vem da pasta, nunca do nome.** Uma tabela chamada `log_importacao`, `audit_clientes` ou `historico_status` criada em `database/scripts` continua sendo uma `table` normal — prefixos gerariam falsos positivos.

### Onde elas aparecem

- **Visão Geral**: contador `Log Tables` separado de `Tables` (cada objeto conta em uma única categoria);
- **Logs**: página própria na barra lateral, com descrição, número de colunas e relacionamentos;
- **Banco de Dados**: listadas junto das tabelas, com a tag `LOG`;
- **Modelagem**: card com ícone e tag próprios, além do filtro `Log Tables`;
- **Novo SQL**: categoria própria, que grava em `database/logs`;
- **Dependências e Impacto**: participam normalmente — `pedidos → trg_pedidos_registrar_log → log_pedidos`;
- **Executar Banco**: entram no plano logo depois das tabelas de origem, sempre respeitando o grafo.

## Descrições vindas do SQL (COMMENT ON)

Os comentários declarados no próprio SQL viram documentação automaticamente. O frontend nunca guarda descrição fixa: a origem é sempre o arquivo.

```text
COMMENT SQL → Analyzer → Modelo normalizado → Interface
```

```sql
COMMENT ON TABLE public.clientes IS
'Tabela responsável por armazenar os dados cadastrais dos clientes.';

COMMENT ON COLUMN public.clientes.email IS
'Endereço de e-mail utilizado para comunicação e autenticação.';
```

O Analyzer preenche `description` no objeto e em cada coluna, e a informação aparece nos detalhes da tabela, nos cards, no tooltip da coluna, no painel de contexto da modelagem e na busca global (pesquisar por um trecho da descrição encontra o objeto).

Regras implementadas:

- criação e documentação ficam no **mesmo script**: `CREATE TABLE` e seus `COMMENT ON` convivem em `database/scripts/02_create_tables.sql`, sem arquivo separado;
- ainda assim, o comentário pode estar **em qualquer arquivo** — se você preferir um script só de documentação, a associação continua funcionando;
- o prefixo de schema (`public.`) não atrapalha a associação;
- aspas escapadas (`''`), acentos e caracteres especiais são preservados;
- `COMMENT ON ... IS NULL` remove a descrição (nunca exibe o texto "NULL");
- duas definições para o mesmo alvo: **a última vence**, como no banco, e o analyzer registra um aviso;
- comentário para tabela ou coluna inexistente vira aviso e **não interrompe** a análise dos demais arquivos;
- o `COMMENT ON` continua visível no visualizador de código;
- `description` é um campo do modelo, disponível também para views, functions, procedures, indexes e triggers.

Cada dialeto tem sua própria estratégia em `analyzer/comments/`. PostgreSQL está implementado; SQL Server, MySQL e Oracle entram como módulos irmãos, sem misturar regras.

## Histórico do Banco

A página **Histórico** conta a evolução do banco a partir do histórico Git — e **somente dos arquivos SQL**. Ela responde perguntas como “quando essa View mudou?”, “quem adicionou esse script?” e “como estava esse SQL antes?” sem sair da documentação.

Cada commit traz mensagem, hash curto, autor, data, quantos arquivos SQL foram alterados e quantos foram adicionados, modificados, removidos ou renomeados. Abrindo o commit aparecem os arquivos; abrindo um arquivo aparece o diff, no mesmo visual usado pela revisão do editor local. Arquivos criados mostram o conteúdo adicionado, arquivos removidos mostram o conteúdo que existia antes e renomeações mostram `caminho antigo → caminho novo`.

### Por que só SQL

O escopo vem de `database.paths` no [database-workspace.config.json](database-workspace.config.json): entra no histórico qualquer arquivo `.sql` dentro das pastas configuradas do banco. Nenhum caminho é codificado no código.

- um commit que alterou apenas `site/app.js`, `site/styles.css` ou o `README` **não aparece**;
- um commit que alterou `site/app.js` **e** `database/views/vw_clientes.sql` aparece, mas mostra **apenas o arquivo SQL**.

Esta é a página do **banco**, não do repositório.

### Como funciona no GitHub Pages

O histórico é gerado no build e publicado como arquivo estático. O visitante não precisa de Git instalado, GitHub API, token, login ou backend.

```text
Git → generate-git-history → generated/git-history.json → npm run build → dist/generated → GitHub Pages
```

Comandos usados, todos somente leitura: `git rev-parse`, `git log --name-status` e `git show`. O índice (`git-history.json`) traz apenas metadados; o diff de cada commit vive em `generated/git-history/<hash>.json` e só é buscado quando o commit é aberto. Diffs muito grandes são exibidos atrás de um botão **Visualizar**, para não travar a interface.

Como o histórico depende do `git log`, o workflow faz o checkout com `fetch-depth: 0`. Um checkout raso publicaria a documentação sem os commits anteriores.

### Configuração

```json
"git": {
  "history": {
    "enabled": true,
    "maxCommits": 100,
    "includeDiff": true,
    "maxDiffLinesPerFile": 4000
  }
}
```

O limite padrão é de **100 commits** e vive apenas aqui e em `analyzer/git/history-config.js` — nunca espalhado pelo código. Com `includeDiff: false` a página continua listando commits e arquivos, sem os diffs.

### Busca e filtros

A busca cobre mensagem do commit, hash, autor, caminho do arquivo e nome do objeto SQL (buscar por `clientes` encontra `database/views/vw_clientes.sql`). Os filtros por tipo usam as **pastas configuradas** (Scripts, Data Loads, Functions, Views, Procedures, Índices, Triggers, Log Tables) e por operação (Adicionados, Modificados, Removidos, Renomeados). Como as tabelas do projeto vivem em `database/scripts`, elas são filtradas por **Scripts**; Log Tables têm filtro próprio porque têm pasta própria.

Cada arquivo alterado oferece **Abrir objeto** ou **Ver script atual**, reaproveitando a navegação já existente. Arquivos que não existem mais na versão atual são marcados como tal.

### Quando não há Git

Baixar o projeto como ZIP em vez de cloná-lo deixa o workspace sem `.git`. Isso **não é erro**: o gerador devolve `available: false`, a página informa que o histórico está indisponível e todo o restante do Astro continua funcionando. Um repositório cujos commits nunca tocaram em SQL mostra “Nenhuma alteração SQL encontrada no histórico”.

### Histórico não é Alterações Locais

```text
Alterações Locais   git status   o que ainda está solto no workspace
Histórico           git log      os commits já registrados
```

A página é de **documentação, somente leitura**, nos dois modos. Ela não faz `commit`, `push`, `pull`, `reset`, `checkout`, `revert` nem `merge`: o Astro não vira um cliente Git.

## Executar Banco

**Executar Banco** aplica os arquivos `.sql` do projeto em um PostgreSQL informado por você, respeitando a ordem de dependências que o analyzer já conhece. Os arquivos continuam sendo a fonte da verdade — a página não gera SQL, não altera scripts e não converte dialetos.

```text
SQL Files → Analyzer → Modelo normalizado → Dependências → Execution Planner
          → Validation → Migration Runner → PostgreSQL
```

### Somente no Local Mode

A funcionalidade exige o backend Node local. No GitHub Pages a página existe, mas informa que a execução está disponível apenas no Local Mode: o navegador **nunca** abre conexão direta com o banco.

```text
Frontend → Backend Node.js local → PostgreSQL
```

### Como conectar

1. Abra **Executar Banco** na barra lateral;
2. Informe tipo (PostgreSQL), host, porta, database, usuário, senha e SSL;
3. Clique em **Testar conexão**.

Host `localhost` e porta `5432` já vêm preenchidos. Database, usuário e senha nunca são preenchidos automaticamente. Após conectar, o cartão mostra apenas dados seguros (tipo, host, porta, database, usuário, versão) e um botão **Desconectar**, que encerra a conexão e apaga as credenciais da memória.

### Plano, validação e execução

- **Gerar plano** ordena os arquivos por dependência (ordenação topológica). Quando dois arquivos não dependem um do outro, vale a ordem base configurável: estruturais → tables → data loads → functions → views → procedures → indexes → triggers. Essa ordem vive só em `server/database/execution-config.js`.
- **Validar migração** confere conexão, dialeto, arquivos encontrados, arquivos vazios, erros do parser, dependências, dependências ausentes, ciclos, ordem, operações destrutivas, scripts já executados e scripts modificados.
- **Executar Banco** só é habilitado com conexão válida, plano gerado e validação sem erros. O progresso mostra cada arquivo como Pendente, Executando, Sucesso, Erro, Ignorado, Já executado, Modificado ou Não executado, e o relatório final traz executados, ignorados, erros e tempo total.

Dependências circulares interrompem o planejamento e listam os objetos envolvidos, em vez de gerar uma ordem arbitrária. Dependências que não existem em nenhum arquivo aparecem como aviso na validação.

### Histórico e checksum

A ferramenta cria no banco alvo a tabela interna `_astroworkspace_migrations` (`id`, `file_path`, `file_name`, `checksum`, `executed_at`, `duration_ms`, `status`, `error_message`, `database_version`). Cada arquivo tem um checksum **SHA-256** do conteúdo, com quebras de linha normalizadas para que CRLF e LF produzam o mesmo valor.

```text
sem registro          → Nunca executado  → executa
checksum igual        → Já executado     → ignora
checksum diferente    → Modificado       → exige decisão
```

Um script **modificado** nunca é reexecutado silenciosamente: a interface oferece **Ignorar** ou **Executar novamente**. A mesma regra protege os **Data Loads**, evitando duplicar registros ao rodar a mesma carga duas vezes.

### Scripts destrutivos

Antes de executar, cada arquivo é analisado em busca de `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, `DROP VIEW`, `DROP FUNCTION`, `DROP PROCEDURE`, `DROP INDEX`, `DROP TRIGGER`, `DROP COLUMN`, `DROP CONSTRAINT`, `TRUNCATE`, `DELETE` sem `WHERE` e `UPDATE` sem `WHERE`. Comentários e literais são ignorados na varredura. Havendo qualquer ocorrência entre os scripts que serão executados, o botão só é liberado depois de digitar exatamente:

```text
EXECUTAR
```

### Transações e timeouts

O padrão é `per-script`: cada arquivo roda dentro da própria transação e sofre rollback se falhar. Arquivos com comandos que o PostgreSQL recusa dentro de transação (`CREATE DATABASE`, `CREATE INDEX CONCURRENTLY`, `VACUUM`…) são executados fora de transação automaticamente. Com `stopOnError` ligado (padrão), o primeiro erro interrompe a migração e os arquivos seguintes ficam como **Não executado**.

Arquivos são enviados **inteiros** ao driver; nada é fatiado por `;`, então corpos `$$ ... $$` de functions e triggers permanecem intactos.

### Configuração

Apenas valores **não sensíveis** ficam em [database-workspace.config.json](database-workspace.config.json):

```json
"execution": {
  "enabled": true,
  "stopOnError": true,
  "transactionMode": "per-script",
  "connectionTimeout": 10000,
  "queryTimeout": 60000,
  "historyTable": "_astroworkspace_migrations"
}
```

`transactionMode` aceita `per-script`, `single` ou `none`. Chaves como `password`, `user` e `host` são descartadas se alguém as escrever nesse arquivo.

### Segurança da execução

- A senha existe apenas na chamada de teste de conexão e no processo do servidor, enquanto a sessão estiver aberta. Nunca é gravada em `localStorage`, `sessionStorage`, cookies, configuração, `generated/`, arquivos `.sql`, Git ou logs, e nunca volta para o frontend;
- O frontend recebe apenas um `sessionId` opaco e envia, no máximo, caminhos de arquivo e decisões;
- O backend nunca executa SQL arbitrário vindo do frontend: ele relê o arquivo pelo filesystem seguro, que bloqueia `../`, caminhos absolutos, diretórios fora de `database/` e extensões diferentes de `.sql`;
- Mensagens de erro e payloads passam por sanitização que remove segredos e credenciais embutidas em URLs;
- Antes de executar, o checksum é reconferido: se o arquivo mudou depois do plano, a execução é recusada.

### Limitações atuais

- Apenas **PostgreSQL**. SQL Server e MySQL aparecem no formulário como previstos e recusam a conexão com uma mensagem clara;
- **Não há conversão de dialeto**: scripts PostgreSQL só rodam em PostgreSQL;
- `CREATE DATABASE` e `DROP DATABASE` não são executados automaticamente. O arquivo é marcado como **Requer execução administrativa** e deve ser rodado manualmente em uma sessão administrativa, já que o comando não pode criar o próprio banco a partir de uma conexão feita a ele;
- A detecção de comandos destrutivos é conservadora e baseada em texto: um `DROP` dentro do corpo de uma function também é sinalizado;
- O histórico vive no banco alvo; bancos diferentes têm históricos independentes.

## Segurança local

A API:

- aceita somente caminhos dentro das categorias configuradas;
- resolve e valida o caminho antes do acesso ao filesystem;
- aceita somente arquivos `.sql` e nomes seguros;
- bloqueia path traversal e arquivos fora do workspace;
- limita o corpo das requisições;
- não executa SQL enviado pelo frontend: a execução aceita apenas caminhos de arquivos do workspace, resolvidos e validados pelo servidor;
- pede confirmação visual antes de renomear ou excluir.

Os únicos comandos externos usados são de Git, todos com argumentos fixos e apenas para leitura: `git status --short` (Alterações Locais) e `git rev-parse`, `git log`, `git show` (Histórico do Banco). Nenhum deles escreve no repositório, e o artefato publicado não contém e-mail de autor, token nem credencial.

## Build e publicação

`npm run build` executa o analyzer, gera o Histórico do Banco e cria `dist/`, contendo o frontend, os JSON gerados e os modelos.

```text
Analyzer            → generated/database.json
Git History         → generated/git-history.json
Build               → dist/
```

Nesse pacote não existe backend, então a interface entra automaticamente em Read Only e a página **Executar Banco** exibe o aviso de disponibilidade apenas no Local Mode.

### Pré-visualizar o Read Only antes de publicar

```bash
npm run preview     # http://localhost:4174
```

O comando roda o build e sobe um servidor que entrega **apenas** o conteúdo de `dist/`, respondendo 404 em qualquer `/api/*` — exatamente como o GitHub Pages. A interface detecta a ausência do backend e entra em Read Only sozinha, pelo mesmo caminho de código do site publicado: badge Read Only, edição e Git bloqueados, **Executar Banco** exibindo o aviso de Local Mode. Documentação, busca, dependências, impacto e a modelagem (zoom, filtros, seleção, Log Tables) continuam completos.

Use `npm run dev` (porta 4173) para o Local Mode e `npm run preview` (porta 4174) para conferir o publicado — os dois podem rodar ao mesmo tempo. Se a porta já estiver ocupada, os dois comandos avisam e sugerem uma alternativa; para escolher outra, use `PORT=4175 npm run preview`.

O workflow `.github/workflows/pages.yml` executa testes, build e deploy. No GitHub, habilite **Settings → Pages → Source: GitHub Actions**. Nenhuma credencial deve ser adicionada ao projeto.

## Limitações atuais

- O parser V1 é tolerante e baseado em reconhecimento estrutural; SQL dinâmico e construções muito complexas podem gerar avisos ou dependências incompletas.
- O dialeto suportado prioritariamente é PostgreSQL.
- O editor é deliberadamente simples e não possui autocomplete nem executa consultas avulsas.
- A execução aplica arquivos inteiros; ela não roda comandos individuais escolhidos na interface.
- O grafo prioriza até 40 objetos para manter a primeira renderização legível.
- Log Tables são reconhecidas pela pasta `database/logs`; ainda não existe marcação manual por arquivo.
- Os cards da modelagem exibem até 14 colunas e indicam quantas ficaram ocultas; os detalhes completos ficam na tela da tabela.
- Comentários são lidos na sintaxe PostgreSQL (`COMMENT ON`); os equivalentes de SQL Server, MySQL e Oracle ainda não estão implementados.
- Os ícones de **Histórico** e **Commit** ainda aguardam o asset oficial da biblioteca do Astro; até lá os lugares aparecem sem ícone, nunca com um ícone de terceiros.
- O Histórico do Banco é textual: ele mostra **quais arquivos e linhas** mudaram, ainda não “a coluna `telefone` foi adicionada”. A comparação semântica entre snapshots do Analyzer é o próximo passo previsto;
- O Histórico não executa o Analyzer commit a commit, para não pesar o build;
- Commits de merge não trazem diff próprio: eles aparecem com os arquivos, sem o conteúdo alterado;
- Diffs acima de `maxDiffLinesPerFile` são truncados no artefato gerado.
- A reanálise local atual prioriza correção e reprocessa o snapshot após uma mudança.

## Próximas versões

Evoluções previstas incluem parsers AST mais completos, reanálise incremental, editor CodeMirror/Monaco e layouts avançados de grafo.

Para o **Executar Banco**, o próximo passo é o suporte a **SQL Server** e **MySQL**: a arquitetura já separa o contrato (`server/database/adapters/base-adapter.js`) da implementação, então adicionar um dialeto significa criar um adapter e registrá-lo em `server/database/adapters/index.js` — plano, validação, histórico e runner não mudam. Conversão de dialeto (por exemplo PostgreSQL → SQL Server) continua fora de escopo e será avaliada separadamente. Login e automações de commit/push permanecem fora do projeto.
