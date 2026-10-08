// 3. Relacionar Colaboradores às Unidades
MATCH  (u1:Unidade {nome:'Metalúrgica Brasilfer Ltda'})
MATCH  (u2:Unidade {nome:'Construtora Horizonte S.A.'})
MATCH  (u3:Unidade {nome:'Agroquímica Verde Campo Eireli'})
MATCH  (c1:Colaborador {id_colaborador:1})
MATCH  (c2:Colaborador {id_colaborador:2})
MATCH  (c3:Colaborador {id_colaborador:3})
MATCH  (c4:Colaborador {id_colaborador:4})
MATCH  (c5:Colaborador {id_colaborador:5})
MATCH  (c6:Colaborador {id_colaborador:6})
MATCH  (c7:Colaborador {id_colaborador:7})
MATCH  (c8:Colaborador {id_colaborador:8})
MATCH  (c9:Colaborador {id_colaborador:9})
MATCH  (c10:Colaborador {id_colaborador:10})
MATCH  (c11:Colaborador {id_colaborador:11})
MATCH  (c12:Colaborador {id_colaborador:12})
MATCH  (c13:Colaborador {id_colaborador:13})
MATCH  (c14:Colaborador {id_colaborador:14})
MATCH  (c15:Colaborador {id_colaborador:15})
CREATE (c1)-[:PERTENCE]->(u1),
  (c2)-[:PERTENCE]->(u1),
  (c3)-[:PERTENCE]->(u1),
  (c4)-[:PERTENCE]->(u1),
  (c5)-[:PERTENCE]->(u1),
  (c6)-[:PERTENCE]->(u2),
  (c7)-[:PERTENCE]->(u2),
  (c8)-[:PERTENCE]->(u2),
  (c9)-[:PERTENCE]->(u2),
  (c10)-[:PERTENCE]->(u2),
  (c11)-[:PERTENCE]->(u3),
  (c12)-[:PERTENCE]->(u3),
  (c13)-[:PERTENCE]->(u3),
  (c14)-[:PERTENCE]->(u3),
  (c15)-[:PERTENCE]->(u3);
