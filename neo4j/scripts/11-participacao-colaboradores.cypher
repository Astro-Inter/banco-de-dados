// 11. Participação dos Colaboradores
MATCH  (c1:Colaborador {id_colaborador:1})
MATCH  (c2:Colaborador {id_colaborador:2})
MATCH  (c3:Colaborador {id_colaborador:3})
MATCH  (c4:Colaborador {id_colaborador:4})
MATCH  (c5:Colaborador {id_colaborador:5})
MATCH  (g1:GrupoTreinamento {id_grupo:1})
CREATE (c1)-[:PARTICIPA]->(g1),
  (c2)-[:PARTICIPA]->(g1),
  (c3)-[:PARTICIPA]->(g1),
  (c4)-[:PARTICIPA]->(g1),
  (c5)-[:PARTICIPA]->(g1);

MATCH  (c2:Colaborador {id_colaborador:2})
MATCH  (c4:Colaborador {id_colaborador:4})
MATCH  (c5:Colaborador {id_colaborador:5})
MATCH  (g4:GrupoTreinamento {id_grupo:4})
CREATE (c2)-[:PARTICIPA]->(g4),
  (c4)-[:PARTICIPA]->(g4),
  (c5)-[:PARTICIPA]->(g4);
