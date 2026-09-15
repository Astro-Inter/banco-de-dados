CREATE OR REPLACE PROCEDURE atualizar_fato_historico()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO fato_historico_geral_unidade (
        id_unidade,
        nome_unidade,
        id_dim_nr_catalogo,
        id_dim_resumo,
        qtd_nr,
        qtd_funcionario,
        qtd_evento,
        dt_referencia
    )
    WITH resumo_nr AS (
        SELECT
            id_unidade,
            COUNT(DISTINCT codigo_nr) AS qtd_nr,
            MIN(id_dim_nr_catalogo) AS id_dim_nr_catalogo
        FROM dim_nr_catalogo
        GROUP BY id_unidade
    ),
    resumo_funcionario AS (
        SELECT
            id_unidade,
            SUM(qtd_funcionario) AS qtd_funcionario,
            MIN(id_dim_resumo) AS id_dim_resumo
        FROM dim_resumo_funcionario
        GROUP BY id_unidade
    ),
  resumo_eventos AS (
   with base as (
    select 
        id_evento,
        gestor_id,
        nr_id,
        modo_conclusao,
        status
    from evento
    where status <> 'CANCELADO'
),
base_gestor as (
    select 
        id_usuario,
        id_unidade
    from usuario
    where tipo = 'GESTOR'
        and status = 'ATIVO'
        and unidade_id = 1
    ),
    juncao as (
      select 
          id_evento,
          id_unidade
      from base b 
      join base_gestor bg on bg.id_usuario = b.gestor_id
    )
    select 
        id_unidade,
        count(distinct id_evento) as qtd_evento
    from juncao 
    group by 1  
  )
    SELECT
        u.id_unidade,
        u.nome,
        nr.id_dim_nr_catalogo,
        f.id_dim_resumo,
        COALESCE(nr.qtd_nr, 0),
        COALESCE(f.qtd_funcionario, 0),
        COALESCE(re.qtd_evento, 0),
        CURRENT_DATE
    FROM unidade u
    LEFT JOIN resumo_nr nr
        ON nr.id_unidade = u.id_unidade
    LEFT JOIN resumo_funcionario f
        ON f.id_unidade = u.id_unidade
    LEFT JOIN resumo_eventos re
        ON re.id_unidade = u.id_unidade
    ON CONFLICT (id_unidade, dt_referencia)
    DO NOTHING;
END;
$$;

COMMENT ON PROCEDURE atualizar_fato_historico() IS
'Atualiza a tabela fato_historico_geral_unidade com um resumo diário dos indicadores de cada unidade, consolidando a quantidade de NRs, funcionários e eventos. Os registros são armazenados por unidade e data de referência, permitindo preservar o histórico dos dados e acompanhar a evolução dos indicadores na camada de BI.';
CREATE OR REPLACE PROCEDURE atualizar_fato_historico()
LANGUAGE plpgsql
AS $$
BEGIN
    WITH resumo_nr AS (
        SELECT
            id_unidade,
            COUNT(DISTINCT codigo_nr) AS qtd_nr,
            MIN(id_dim_nr_catalogo) AS id_dim_nr_catalogo
        FROM dim_nr_catalogo
        GROUP BY id_unidade
    ),
    resumo_funcionario AS (
        SELECT
            id_unidade,
            SUM(qtd_funcionario) AS qtd_funcionario,
            MIN(id_dim_resumo) AS id_dim_resumo
        FROM dim_resumo_funcionario
        GROUP BY id_unidade
    ),
    base_eventos AS (
        SELECT 
            id_evento,
            gestor_id,
            nr_id,
            modo_conclusao,
            status
        FROM evento
        WHERE status <> 'CANCELADO'
    ),
    base_gestor AS (
        SELECT 
            id_usuario,
            id_unidade
        FROM usuario
        WHERE tipo = 'GESTOR'
          AND status = 'ATIVO'
          AND unidade_id = 1
    ),
    juncao_eventos AS (
        SELECT 
            b.id_evento,
            bg.id_unidade
        FROM base_eventos b 
        JOIN base_gestor bg ON bg.id_usuario = b.gestor_id
    ),
    resumo_eventos AS (
        SELECT 
            id_unidade,
            COUNT(DISTINCT id_evento) AS qtd_evento
        FROM juncao_eventos 
        GROUP BY id_unidade
    )
    INSERT INTO fato_historico_geral_unidade (
        id_unidade,
        nome_unidade,
        id_dim_nr_catalogo,
        id_dim_resumo,
        qtd_nr,
        qtd_funcionario,
        qtd_evento,
        dt_referencia
    )
    SELECT
        u.id_unidade,
        u.nome,
        nr.id_dim_nr_catalogo,
        f.id_dim_resumo,
        COALESCE(nr.qtd_nr, 0),
        COALESCE(f.qtd_funcionario, 0),
        COALESCE(re.qtd_evento, 0),
        CURRENT_DATE
    FROM unidade u
    LEFT JOIN resumo_nr nr 
        ON nr.id_unidade = u.id_unidade
    LEFT JOIN resumo_funcionario f 
        ON f.id_unidade = u.id_unidade
    LEFT JOIN resumo_eventos re 
        ON re.id_unidade = u.id_unidade
    ON CONFLICT (id_unidade, dt_referencia)
    DO NOTHING;
END;
$$;

COMMENT ON PROCEDURE atualizar_fato_historico() IS
'Atualiza a tabela fato_historico_geral_unidade com um resumo diário dos indicadores de cada unidade, consolidando a quantidade de NRs, funcionários e eventos. Os registros são armazenados por unidade e data de referência, permitindo preservar o histórico dos dados e acompanhar a evolução dos indicadores na camada de BI.';