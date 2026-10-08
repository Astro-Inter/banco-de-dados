CREATE OR REPLACE PROCEDURE pr_inseri_cargo(
    IN p_firebase_uid TEXT,
    IN p_nome TEXT,
    IN p_status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_workspace_id BIGINT;
    v_ativo BOOLEAN;
BEGIN
    IF NULLIF(BTRIM(p_firebase_uid), '') IS NULL
       OR NULLIF(BTRIM(p_nome), '') IS NULL
       OR NULLIF(BTRIM(p_status), '') IS NULL THEN
        RAISE EXCEPTION 'Informe Firebase UID, nome e status do cargo.'
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

    INSERT INTO cargo (workspace_id, nome, ativo)
    VALUES (v_workspace_id, BTRIM(p_nome), v_ativo);
END;
$$;

COMMENT ON PROCEDURE pr_inseri_cargo(TEXT, TEXT, TEXT) IS
'Insere um cargo no workspace associado ao Firebase UID de um gestor ativo. Recebe o nome e o status Ativo/Inativo; o status é gravado no campo cargo.ativo.';
