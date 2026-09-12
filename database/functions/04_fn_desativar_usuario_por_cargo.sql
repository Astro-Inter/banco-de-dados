CREATE OR REPLACE FUNCTION fn_desativar_usuario_por_cargo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE usuario
    SET status = 'DESATIVADO'
    WHERE cargo_id = NEW.id_cargo
      AND tipo <> 'GESTOR_WORKSPACE'
      AND status <> 'DESATIVADO';

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_desativar_usuario_por_cargo() IS
'Desativa usuários vinculados ao cargo desativado, preservando gestores de workspace e evitando atualizar contas já desativadas.';
