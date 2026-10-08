// 6. GrupoTreinamento POSSUI Evento
MATCH  (g:GrupoTreinamento)
MATCH  (e:Evento)
WHERE  g.id_grupo = e.id_evento
CREATE  (g)-[:POSSUI]->(e);
