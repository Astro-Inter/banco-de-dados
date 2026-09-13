CREATE OR REPLACE VIEW dim_nr_catalogo AS
WITH nr_funcionario AS (
    SELECT DISTINCT
        u.unidade_id AS id_unidade,
        nr.codigo_nr,
        nr.titulo
    FROM usuario u
    JOIN cargo_nr cn
        ON cn.cargo_id = u.cargo_id
    JOIN nr_catalogo nr
        ON nr.codigo_nr = cn.nr_id
    WHERE u.tipo = 'FUNCIONARIO'
      AND nr.revogada = false
),
nr_empresa AS (
    SELECT DISTINCT
        un.id_unidade,
        nr.codigo_nr,
        nr.titulo
    FROM nr_catalogo nr
    JOIN unidade_nr un_nr
        ON un_nr.nr_id = nr.codigo_nr
    JOIN unidade un
        ON un.id_unidade = un_nr.unidade_id
    WHERE nr.revogada = false
),
uniao AS (
    SELECT * FROM nr_funcionario
    UNION
    SELECT * FROM nr_empresa
)
SELECT
    ROW_NUMBER() OVER (
        ORDER BY id_unidade, codigo_nr
    ) AS id_dim_nr_catalogo,
    id_unidade,
    codigo_nr,
    titulo
FROM uniao;

COMMENT ON VIEW dim_nr_catalogo IS
'Consolida as NRs aplicáveis a cada unidade, considerando tanto as NRs associadas aos cargos dos funcionários quanto as NRs vinculadas diretamente às unidades. A view desconsidera NRs revogadas e unifica os registros para evitar duplicidades, disponibilizando uma dimensão de NRs por unidade para utilização na camada de BI.';
