CREATE OR REPLACE FUNCTION fn_seleciona_cargos(
    p_firebase_uid TEXT
)
RETURNS SETOF vw_cargos
LANGUAGE sql
STABLE
AS $$
    SELECT vc.*
    FROM vw_cargos vc
    INNER JOIN usuario solicitante
        ON solicitante.firebase_uid = p_firebase_uid
    INNER JOIN unidade un
        ON un.id_unidade = solicitante.unidade_id
    WHERE NULLIF(BTRIM(p_firebase_uid), '') IS NOT NULL
      AND solicitante.tipo IN ('GESTOR', 'GESTOR_WORKSPACE')
      AND solicitante.status = 'ATIVO'
      AND vc.id_workspace = un.workspace_id
    ORDER BY vc.cargo, vc.id_cargo;
$$;

COMMENT ON FUNCTION fn_seleciona_cargos(TEXT) IS
'Retorna os cargos da view vw_cargos pertencentes ao workspace associado à unidade do gestor ativo identificado pelo Firebase UID. Retorna zero linhas quando o UID é nulo, vazio, inexistente, inativo ou não pertence a um gestor.';
