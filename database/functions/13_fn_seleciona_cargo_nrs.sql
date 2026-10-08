DROP FUNCTION IF EXISTS fn_seleciona_cargo_nrs(TEXT, BIGINT);

CREATE OR REPLACE FUNCTION fn_seleciona_cargo_nrs(
    p_firebase_uid TEXT,
    p_id_cargo BIGINT
)
RETURNS TABLE (
    codigo_nr INTEGER,
    descricao VARCHAR(255)
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        nr.codigo_nr,
        nr.titulo AS descricao
    FROM usuario solicitante
    INNER JOIN unidade un
        ON un.id_unidade = solicitante.unidade_id
    INNER JOIN cargo c
        ON c.workspace_id = un.workspace_id
       AND c.id_cargo = p_id_cargo
    INNER JOIN cargo_nr cn
        ON cn.cargo_id = c.id_cargo
    INNER JOIN nr_catalogo nr
        ON nr.codigo_nr = cn.nr_id
    WHERE NULLIF(BTRIM(p_firebase_uid), '') IS NOT NULL
      AND p_id_cargo IS NOT NULL
      AND solicitante.firebase_uid = p_firebase_uid
      AND solicitante.tipo IN ('GESTOR', 'GESTOR_WORKSPACE')
      AND solicitante.status = 'ATIVO'
    ORDER BY nr.codigo_nr;
$$;

COMMENT ON FUNCTION fn_seleciona_cargo_nrs(TEXT, BIGINT) IS
'Retorna o código numérico e a descrição das NRs associadas ao cargo informado, quando o Firebase UID pertence a um gestor ativo do mesmo workspace. Retorna zero linhas para UID ou cargo sem acesso e para cargos sem NRs associadas.';
