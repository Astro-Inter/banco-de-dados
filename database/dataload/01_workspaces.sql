INSERT INTO workspaces (id_workspace, nome, cnpj) VALUES
    (1, 'Metalúrgica Brasilfer Ltda', '11222333000144'),
    (2, 'Construtora Horizonte S.A.', '22333444000155'),
    (3, 'Agroquímica Verde Campo Eireli', '33444555000166')
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('workspaces', 'id_workspace'),
    COALESCE(MAX(id_workspace), 1),
    TRUE
)
FROM workspaces;