INSERT INTO workspaces (nome, cnpj)
VALUES
    ('Metalúrgica Brasilfer Ltda', '11222333000144'),
    ('Construtora Horizonte S.A.', '22333444000155'),
    ('Agroquímica Verde Campo Eireli', '33444555000166')
ON CONFLICT (cnpj) DO UPDATE
SET nome = EXCLUDED.nome;