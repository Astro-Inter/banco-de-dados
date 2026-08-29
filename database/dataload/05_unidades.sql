INSERT INTO unidades (id_unidade, workspace_id, nome) VALUES
    (1, 1, 'Matriz São Paulo'),
    (2, 1, 'Unidade Guarulhos'),
    (3, 2, 'Sede São Paulo'),
    (4, 2, 'Canteiro Osasco'),
    (5, 3, 'Matriz Campinas'),
    (6, 3, 'Centro de Distribuição Ribeirão Preto')
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('unidades', 'id_unidade'),
    COALESCE(MAX(id_unidade), 1),
    TRUE
)
FROM unidades;