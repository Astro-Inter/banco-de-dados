// 10. Treinamento RECEBE Certificado
MATCH  (t:Treinamento)
MATCH  (cert:Certificado)
WHERE  t.id_treinamento = cert.id_certificado
CREATE  (t)-[:RECEBE]->(cert);
