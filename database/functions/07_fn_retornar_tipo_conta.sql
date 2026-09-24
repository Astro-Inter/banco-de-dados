CREATE OR REPLACE FUNCTION fn_retornar_tipo_conta(
    p_email TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT CASE tipo
        WHEN 'GESTOR_WORKSPACE' THEN 'WORKSPACE'
        WHEN 'COLABORADOR' THEN 'COLABORADOR'
        ELSE NULL
    END
    FROM usuario
    WHERE email = p_email;
$$;

COMMENT ON FUNCTION fn_retornar_tipo_conta(TEXT) IS
'Consulta o usuário pelo e-mail e retorna WORKSPACE para GESTOR_WORKSPACE ou COLABORADOR para COLABORADOR. Retorna NULL para os demais perfis ou quando não há usuário correspondente.';
