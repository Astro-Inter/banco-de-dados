INSERT INTO cargos (id_cargo, workspace_id, nome) VALUES
    (1,  1, 'Gestor de Segurança'),
    (2,  1, 'Soldador'),
    (3,  1, 'Operador de Máquinas'),
    (4,  1, 'Técnico de Manutenção'),
    (5,  2, 'Gestor de Segurança'),
    (6,  2, 'Engenheiro Civil'),
    (7,  2, 'Eletricista'),
    (8,  2, 'Trabalhador em Altura'),
    (9,  3, 'Gestor de Segurança'),
    (10, 3, 'Engenheiro Agrônomo'),
    (11, 3, 'Aplicador de Defensivos'),
    (12, 3, 'Operador de Máquinas Agrícolas')
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('cargos', 'id_cargo'),
    COALESCE(MAX(id_cargo), 1),
    TRUE
)
FROM cargos;