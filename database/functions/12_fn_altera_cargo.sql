CREATE OR REPLACE FUNCTION fn_altera_cargo(
    p_firebase_uid TEXT,
    p_id_cargo BIGINT,
    p_nome TEXT,
    p_status TEXT
)
RETURNS SETOF vw_cargos
LANGUAGE plpgsql
AS $$
DECLARE
    v_workspace_id BIGINT;
    v_ativo BOOLEAN;
    v_id_cargo BIGINT;
BEGIN
    IF NULLIF(BTRIM(p_firebase_uid), '') IS NULL
       OR p_id_cargo IS NULL
       OR NULLIF(BTRIM(p_nome), '') IS NULL
       OR NULLIF(BTRIM(p_status), '') IS NULL THEN
        RAISE EXCEPTION 'Informe Firebase UID, ID do cargo, nome e status.'
            USING ERRCODE = '22023';
    END IF;

    IF CHAR_LENGTH(BTRIM(p_nome)) NOT BETWEEN 2 AND 255 THEN
        RAISE EXCEPTION 'O nome do cargo deve ter entre 2 e 255 caracteres.'
            USING ERRCODE = '22023';
    END IF;

    IF LOWER(BTRIM(p_status)) NOT IN ('ativo', 'inativo') THEN
        RAISE EXCEPTION 'O status deve ser Ativo ou Inativo.'
            USING ERRCODE = '22023';
    END IF;

    v_ativo := LOWER(BTRIM(p_status)) = 'ativo';

    SELECT un.workspace_id
    INTO v_workspace_id
    FROM usuario solicitante
    INNER JOIN unidade un
        ON un.id_unidade = solicitante.unidade_id
    WHERE solicitante.firebase_uid = p_firebase_uid
      AND solicitante.tipo IN ('GESTOR', 'GESTOR_WORKSPACE')
      AND solicitante.status = 'ATIVO';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Gestor ativo não encontrado para o Firebase UID informado.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE cargo
    SET nome = BTRIM(p_nome),
        ativo = v_ativo
    WHERE id_cargo = p_id_cargo
      AND workspace_id = v_workspace_id
    RETURNING id_cargo INTO v_id_cargo;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cargo não encontrado no workspace do gestor.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT vc.*
    FROM vw_cargos vc
    WHERE vc.id_cargo = v_id_cargo
      AND vc.id_workspace = v_workspace_id;
END;
$$;

COMMENT ON FUNCTION fn_altera_cargo(TEXT, BIGINT, TEXT, TEXT) IS
'Atualiza nome e status de um cargo quando o Firebase UID pertence a um gestor ativo do mesmo workspace. Aceita status Ativo ou Inativo e retorna a linha atualizada de vw_cargos. Ao desativar, o trigger existente desativa os usuários vinculados conforme suas regras.';
