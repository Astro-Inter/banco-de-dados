DROP TRIGGER IF EXISTS trg_desativar_usuario_por_unidade ON unidade;
CREATE TRIGGER trg_desativar_usuario_por_unidade
AFTER UPDATE OF ativo ON unidade
FOR EACH ROW
WHEN (OLD.ativo IS DISTINCT FROM FALSE AND NEW.ativo IS FALSE)
EXECUTE FUNCTION fn_desativar_usuario_por_unidade();
