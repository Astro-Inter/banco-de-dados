INSERT INTO cargos (workspace_id, nome)
SELECT
    w.id_workspace,
    dados.nome_cargo
FROM (
    VALUES
        ('11222333000144', 'Gestor de Segurança'),
        ('11222333000144', 'Soldador'),
        ('11222333000144', 'Operador de Máquinas'),
        ('11222333000144', 'Técnico de Manutenção'),
        ('22333444000155', 'Gestor de Segurança'),
        ('22333444000155', 'Engenheiro Civil'),
        ('22333444000155', 'Eletricista'),
        ('22333444000155', 'Trabalhador em Altura'),
        ('33444555000166', 'Gestor de Segurança'),
        ('33444555000166', 'Engenheiro Agrônomo'),
        ('33444555000166', 'Aplicador de Defensivos'),
        ('33444555000166', 'Operador de Máquinas Agrícolas')
) AS dados(cnpj, nome_cargo)
INNER JOIN workspaces w
    ON w.cnpj = dados.cnpj
ON CONFLICT (workspace_id, nome) DO NOTHING;