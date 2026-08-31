CREATE OR REPLACE FUNCTION fn_registrar_acesso_diario(
    p_usuario_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO acessos (
        data,
        usuario_id
    )
    VALUES (
        CURRENT_DATE,
        p_usuario_id 
    )
    ON CONFLICT (data, usuario_id)
    DO NOTHING;
END;
$$;