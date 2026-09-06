DROP TRIGGER IF EXISTS trg_desativar_usuarios_por_cargo ON cargos;
CREATE TRIGGER trg_desativar_usuarios_por_cargo
AFTER UPDATE OF ativo ON cargos
FOR EACH ROW
WHEN (OLD.ativo IS DISTINCT FROM FALSE AND NEW.ativo IS FALSE)
EXECUTE FUNCTION fn_desativar_usuarios_por_cargo();
