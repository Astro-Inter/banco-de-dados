CREATE OR REPLACE VIEW vw_cargos AS
SELECT
    c.id_cargo,
    c.workspace_id AS id_workspace,
    c.nome AS cargo,
    COUNT(DISTINCT u.id_usuario) FILTER (
        WHERE u.tipo = 'COLABORADOR'
          AND u.status = 'ATIVO'
    ) AS quantidade_colaboradores,
    CASE
        WHEN c.ativo THEN 'Ativo'
        ELSE 'Inativo'
    END AS status
FROM cargo c
LEFT JOIN usuario u
    ON u.cargo_id = c.id_cargo
GROUP BY
    c.id_cargo,
    c.workspace_id,
    c.nome,
    c.ativo;

COMMENT ON VIEW vw_cargos IS
'Lista os cargos por workspace, com o identificador do cargo, o nome, a quantidade de colaboradores ativos vinculados e o status do cargo. Cargos sem colaboradores também são exibidos com quantidade zero.';