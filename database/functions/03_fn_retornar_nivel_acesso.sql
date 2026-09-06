-- Exemplo: SELECT fn_retornar_nivel_acesso('firebase-uid');
CREATE OR REPLACE FUNCTION fn_retornar_nivel_acesso(
    p_firebase_uid TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_tipo TEXT;
BEGIN
    IF p_firebase_uid IS NULL OR BTRIM(p_firebase_uid) = '' THEN
        RETURN 'SEM_ACESSO';
    END IF;

    IF EXISTS (SELECT 1 FROM admin WHERE firebase_uid = p_firebase_uid) THEN
        RETURN 'ADMIN';
    END IF;

    SELECT tipo INTO v_tipo
    FROM usuarios
    WHERE firebase_uid = p_firebase_uid;

    RETURN COALESCE(v_tipo, 'SEM_ACESSO');
END;
$$;

COMMENT ON FUNCTION fn_retornar_nivel_acesso(TEXT) IS
'Retorna ADMIN quando o Firebase UID existe em admin; caso contrário, retorna o tipo de usuarios ou SEM_ACESSO. A consulta identifica o perfil independentemente do status do usuário.';
