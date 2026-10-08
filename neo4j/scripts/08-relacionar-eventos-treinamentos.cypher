// 8. Evento REALIZA Treinamento
MATCH  (e:Evento)
MATCH  (t:Treinamento)
WHERE  e.id_evento = t.id_treinamento
CREATE  (e)-[:REALIZA]->(t);
