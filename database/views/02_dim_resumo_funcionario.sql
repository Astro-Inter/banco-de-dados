CREATE OR REPLACE VIEW dim_resumo_funcionario AS
WITH func AS (
    SELECT
        u.id_usuario,
        u.cargo_id,
        c.nome AS cargo,
        u.unidade_id,
        un.nome AS unidade
    FROM usuarios u
    INNER JOIN cargos c
        ON c.id_cargo = u.cargo_id
    INNER JOIN unidades un
        ON un.id_unidade = u.unidade_id
    WHERE u.tipo = 'FUNCIONARIO'
      AND u.status = 'ATIVO'
),
agrupado AS (
    SELECT
        unidade_id,
        unidade,
        cargo_id,
        cargo,
        COUNT(DISTINCT id_usuario) AS qtd_funcionario
    FROM func
    GROUP BY
        unidade_id,
        unidade,
        cargo_id,
        cargo
)
SELECT
    ROW_NUMBER() OVER (
        ORDER BY unidade_id, cargo
    ) AS id_dim_resumo,
    unidade_id,
    unidade,
    cargo_id,
    cargo,
    qtd_funcionario,
    CURRENT_DATE AS dt_referencia
FROM agrupado;

COMMENT ON VIEW dim_resumo_funcionario IS
'Consolida a quantidade de funcionários ativos por unidade e cargo, considerando apenas usuários do tipo FUNCIONARIO. A view agrupa os funcionários de acordo com sua unidade e cargo e disponibiliza a quantidade de funcionários e a data de referência para utilização na camada de BI.';