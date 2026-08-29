INSERT INTO cargo_nrs (cargo_id, nr_id)
SELECT
    c.id_cargo,
    dados.nr_id
FROM (
    VALUES
        ('11222333000144', 'Gestor de Segurança', 1),
        ('11222333000144', 'Gestor de Segurança', 5),
        ('11222333000144', 'Soldador', 6),
        ('11222333000144', 'Soldador', 11),
        ('11222333000144', 'Operador de Máquinas', 6),
        ('11222333000144', 'Operador de Máquinas', 12),
        ('11222333000144', 'Técnico de Manutenção', 6),
        ('11222333000144', 'Técnico de Manutenção', 10),
        ('11222333000144', 'Técnico de Manutenção', 12),
        ('22333444000155', 'Gestor de Segurança', 1),
        ('22333444000155', 'Gestor de Segurança', 5),
        ('22333444000155', 'Engenheiro Civil', 18),
        ('22333444000155', 'Engenheiro Civil', 35),
        ('22333444000155', 'Eletricista', 10),
        ('22333444000155', 'Eletricista', 18),
        ('22333444000155', 'Trabalhador em Altura', 18),
        ('22333444000155', 'Trabalhador em Altura', 35),
        ('33444555000166', 'Gestor de Segurança', 1),
        ('33444555000166', 'Gestor de Segurança', 5),
        ('33444555000166', 'Engenheiro Agrônomo', 31),
        ('33444555000166', 'Aplicador de Defensivos', 6),
        ('33444555000166', 'Aplicador de Defensivos', 20),
        ('33444555000166', 'Aplicador de Defensivos', 31),
        ('33444555000166', 'Operador de Máquinas Agrícolas', 6),
        ('33444555000166', 'Operador de Máquinas Agrícolas', 12),
        ('33444555000166', 'Operador de Máquinas Agrícolas', 31)
) AS dados(cnpj, nome_cargo, nr_id)
INNER JOIN workspaces w
    ON w.cnpj = dados.cnpj
INNER JOIN cargos c
    ON c.workspace_id = w.id_workspace
   AND c.nome = dados.nome_cargo
INNER JOIN nr_catalogos nr
    ON nr.codigo_nr = dados.nr_id
ON CONFLICT (cargo_id, nr_id) DO NOTHING;