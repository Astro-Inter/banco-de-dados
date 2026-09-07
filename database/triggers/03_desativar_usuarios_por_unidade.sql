DROP TRIGGER IF EXISTS trg_desativar_usuarios_por_unidade ON unidades;
CREATE TRIGGER trg_desativar_usuarios_por_unidade
AFTER UPDATE OF ativo ON unidades
FOR EACH ROW
WHEN (OLD.ativo IS DISTINCT FROM FALSE AND NEW.ativo IS FALSE)
EXECUTE FUNCTION fn_desativar_usuarios_por_unidade();
