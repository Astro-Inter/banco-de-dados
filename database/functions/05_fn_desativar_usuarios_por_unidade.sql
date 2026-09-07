CREATE OR REPLACE FUNCTION fn_desativar_usuarios_por_unidade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE usuarios
    SET status = 'DESATIVADO'
    WHERE unidade_id = NEW.id_unidade
      AND tipo <> 'GESTOR_WORKSPACE'
      AND status <> 'DESATIVADO';

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_desativar_usuarios_por_unidade() IS
'Desativa usuários vinculados à unidade desativada, preservando gestores de workspace e evitando atualizar contas já desativadas.';
