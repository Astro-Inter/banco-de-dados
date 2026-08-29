INSERT INTO unidades (workspace_id, nome)
SELECT
    w.id_workspace,
    dados.nome_unidade
FROM (
    VALUES
        ('11222333000144', 'Matriz São Paulo'),
        ('11222333000144', 'Unidade Guarulhos'),
        ('22333444000155', 'Sede São Paulo'),
        ('22333444000155', 'Canteiro Osasco'),
        ('33444555000166', 'Matriz Campinas'),
        ('33444555000166', 'Centro de Distribuição Ribeirão Preto')
) AS dados(cnpj, nome_unidade)
INNER JOIN workspaces w
    ON w.cnpj = dados.cnpj
ON CONFLICT (workspace_id, nome) DO NOTHING;