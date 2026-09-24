DROP TRIGGER IF EXISTS trg_ativar_colaborador_apos_firebase_uid ON usuario;
CREATE TRIGGER trg_ativar_colaborador_apos_firebase_uid
BEFORE UPDATE OF firebase_uid ON usuario
FOR EACH ROW
WHEN (
    OLD.firebase_uid IS NULL
    AND NEW.firebase_uid IS NOT NULL
    AND NEW.tipo = 'COLABORADOR'
    AND NEW.status = 'PRE_CADASTRADO'
)
EXECUTE FUNCTION fn_ativar_colaborador_apos_firebase_uid();

COMMENT ON TRIGGER trg_ativar_colaborador_apos_firebase_uid ON usuario IS
'Ao preencher o firebase_uid de um colaborador pré-cadastrado, altera seu status para ATIVO.';
