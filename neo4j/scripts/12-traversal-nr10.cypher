// 12. Consulta Traversal - NR-10 Básico
MATCH (c:Colaborador)-[:PARTICIPA]->(g:GrupoTreinamento)
      -[:POSSUI]->(e:Evento)-[:REALIZA]->(t:Treinamento)
WHERE t.nome = 'NR-10 Básico'
RETURN c.nome AS colaborador,
       c.cargo AS cargo,
       g.titulo AS grupo,
       e.data_evento AS data_treinamento;
