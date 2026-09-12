DROP TRIGGER IF EXISTS trg_desativar_usuario_por_cargo ON cargo;
CREATE TRIGGER trg_desativar_usuario_por_cargo
AFTER UPDATE OF ativo ON cargo
FOR EACH ROW
WHEN (OLD.ativo IS DISTINCT FROM FALSE AND NEW.ativo IS FALSE)
EXECUTE FUNCTION fn_desativar_usuario_por_cargo();
