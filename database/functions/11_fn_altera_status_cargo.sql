CREATE OR REPLACE FUNCTION fn_altera_status_cargo(
    p_firebase_uid TEXT,
    p_id_cargo BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_workspace_id BIGINT;
    v_ativo BOOLEAN;
BEGIN
    IF NULLIF(BTRIM(p_firebase_uid), '') IS NULL OR p_id_cargo IS NULL THEN
        RAISE EXCEPTION 'Informe um Firebase UID e um ID de cargo válidos.'
            USING ERRCODE = '22023';
    END IF;

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
    SET ativo = NOT COALESCE(ativo, FALSE)
    WHERE id_cargo = p_id_cargo
      AND workspace_id = v_workspace_id
    RETURNING ativo INTO v_ativo;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cargo não encontrado no workspace do gestor.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_ativo;
END;
$$;

COMMENT ON FUNCTION fn_altera_status_cargo(TEXT, BIGINT) IS
'Alterna o status ativo do cargo informado quando o Firebase UID pertence a um gestor ativo do mesmo workspace. Retorna TRUE quando o cargo fica ativo e FALSE quando fica inativo. Ao desativar, o trigger existente desativa os usuários vinculados conforme suas regras.';
