# Documentação Neo4j do Astro

Esta área documenta o grafo de colaboradores e treinamentos do arquivo `codigos_neo4j_colaborador_evento.docx`, associado à demanda SCRUM-446. A nomenclatura preservada é `Colaborador` / `id_colaborador` e `Evento` / `id_evento`.

## Organização

- `docs/catalog.json`: descrições dos seis labels, propriedades, cinco tipos de relacionamento, regras da carga e observações.
- `scripts/01-*.cypher` a `scripts/11-*.cypher`: todas as etapas de criação do documento, na ordem original.
- `scripts/12-traversal-nr10.cypher`: consulta de participação em NR-10 Básico.
- `../generated/neo4j.json`: snapshot gerado para o workspace local e para o site estático.

Os scripts preservam os dados e a semântica do documento. Espaços e quebras de linha foram normalizados para separar cláusulas Cypher que vieram juntas na extração do DOCX.

## Modelo documentado

```text
Colaborador ──PERTENCE──> Unidade
Colaborador ──PARTICIPA──> GrupoTreinamento ──POSSUI──> Evento
Evento ──REALIZA──> Treinamento ──RECEBE──> Certificado
```

A carga define 3 unidades, 15 colaboradores, 12 grupos, 12 eventos, 12 treinamentos e 12 certificados: **66 nós e 59 relacionamentos**. As participações declaradas são colaboradores 1–5 no grupo 1 e colaboradores 2, 4 e 5 no grupo 4. As demais participações não são inferidas. O certificado se relaciona ao treinamento, sem emissão individual ou validade definida no documento.

A consulta NR-10 percorre `PARTICIPA → POSSUI → REALIZA` e encontra cinco participações no grupo 1, em 15/08/2026. O treinamento 5 também se chama NR-10 Básico, mas não possui participação vinculada no exemplo.

## Grafo virtual no workspace

Abra **Neo4j → Modelagem de grafos**. A vista **Esquema** mostra os tipos e direções; **Dados de exemplo** mostra cada nó da carga. É possível selecionar nós, ler propriedades, abrir conexões, filtrar por label ou unidade, localizar valores, arrastar nós, navegar pelo fundo e ajustar o zoom. **Simular consulta NR-10** mostra os caminhos e os campos retornados pela etapa 12.

O workspace não se conecta ao Neo4j nem executa os scripts. A simulação lê a carga documentada no repositório e funciona nos modos local e estático. Os scripts podem ser copiados ou baixados pela aba **Scripts Cypher**.

## Manutenção

Atualize o catálogo e os scripts e execute `npm run analyze` ou `npm run build`. O analyzer materializa somente o subconjunto usado no documento: `CREATE` de nós com propriedades literais, `MATCH` de labels e propriedades, relacionamentos explícitos e igualdade entre propriedades dos endpoints. Sintaxe adicional gera um aviso e exclui a etapa inteira da prévia, sem executar o Cypher. Consultas de leitura são exibidas integralmente; a simulação é específica ao traversal NR-10 documentado.

Os IDs correspondentes de grupo/evento/treinamento/certificado são uma regra da carga, sem constraints declaradas. [CREATE sempre cria novos dados](https://neo4j.com/docs/cypher-manual/current/clauses/create/); reexecutar a carga pode gerar duplicatas. Prepare uma base de exemplo vazia para usar as etapas de criação. Não há limpeza automática de dados nem constraints ou carga idempotente fornecidas no documento.
