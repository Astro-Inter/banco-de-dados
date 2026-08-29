INSERT INTO unidade_nrs (unidade_id, nr_id)
SELECT
    u.id_unidade,
    dados.nr_id
FROM (
    VALUES
        ('11222333000144', 'Matriz São Paulo', 1),
        ('11222333000144', 'Matriz São Paulo', 5),
        ('11222333000144', 'Matriz São Paulo', 6),
        ('11222333000144', 'Matriz São Paulo', 11),
        ('11222333000144', 'Matriz São Paulo', 12),
        ('11222333000144', 'Unidade Guarulhos', 1),
        ('11222333000144', 'Unidade Guarulhos', 5),
        ('11222333000144', 'Unidade Guarulhos', 6),
        ('11222333000144', 'Unidade Guarulhos', 10),
        ('11222333000144', 'Unidade Guarulhos', 12),
        ('22333444000155', 'Sede São Paulo', 1),
        ('22333444000155', 'Sede São Paulo', 5),
        ('22333444000155', 'Sede São Paulo', 18),
        ('22333444000155', 'Sede São Paulo', 35),
        ('22333444000155', 'Canteiro Osasco', 1),
        ('22333444000155', 'Canteiro Osasco', 6),
        ('22333444000155', 'Canteiro Osasco', 10),
        ('22333444000155', 'Canteiro Osasco', 18),
        ('22333444000155', 'Canteiro Osasco', 33),
        ('22333444000155', 'Canteiro Osasco', 35),
        ('33444555000166', 'Matriz Campinas', 1),
        ('33444555000166', 'Matriz Campinas', 5),
        ('33444555000166', 'Matriz Campinas', 6),
        ('33444555000166', 'Matriz Campinas', 31),
        ('33444555000166', 'Centro de Distribuição Ribeirão Preto', 1),
        ('33444555000166', 'Centro de Distribuição Ribeirão Preto', 6),
        ('33444555000166', 'Centro de Distribuição Ribeirão Preto', 12),
        ('33444555000166', 'Centro de Distribuição Ribeirão Preto', 20),
        ('33444555000166', 'Centro de Distribuição Ribeirão Preto', 31)
) AS dados(cnpj, nome_unidade, nr_id)
INNER JOIN workspaces w
    ON w.cnpj = dados.cnpj
INNER JOIN unidades u
    ON u.workspace_id = w.id_workspace
   AND u.nome = dados.nome_unidade
INNER JOIN nr_catalogos nr
    ON nr.codigo_nr = dados.nr_id
ON CONFLICT (unidade_id, nr_id) DO NOTHING;