DROP TRIGGER IF EXISTS trg_auditoria_workspace ON workspace;
CREATE TRIGGER trg_auditoria_workspace
AFTER INSERT OR UPDATE OR DELETE ON workspace
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_cargo ON cargo;
CREATE TRIGGER trg_auditoria_cargo
AFTER INSERT OR UPDATE OR DELETE ON cargo
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_unidade ON unidade;
CREATE TRIGGER trg_auditoria_unidade
AFTER INSERT OR UPDATE OR DELETE ON unidade
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_unidade_endereco ON unidade_endereco;
CREATE TRIGGER trg_auditoria_unidade_endereco
AFTER INSERT OR UPDATE OR DELETE ON unidade_endereco
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_usuario ON usuario;
CREATE TRIGGER trg_auditoria_usuario
AFTER INSERT OR UPDATE OR DELETE ON usuario
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_admin ON admin;
CREATE TRIGGER trg_auditoria_admin
AFTER INSERT OR UPDATE OR DELETE ON admin
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_nr_catalogo ON nr_catalogo;
CREATE TRIGGER trg_auditoria_nr_catalogo
AFTER INSERT OR UPDATE OR DELETE ON nr_catalogo
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_cargo_nr ON cargo_nr;
CREATE TRIGGER trg_auditoria_cargo_nr
AFTER INSERT OR UPDATE OR DELETE ON cargo_nr
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_unidade_nr ON unidade_nr;
CREATE TRIGGER trg_auditoria_unidade_nr
AFTER INSERT OR UPDATE OR DELETE ON unidade_nr
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_evento ON evento;
CREATE TRIGGER trg_auditoria_evento
AFTER INSERT OR UPDATE OR DELETE ON evento
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_turma ON turma;
CREATE TRIGGER trg_auditoria_turma
AFTER INSERT OR UPDATE OR DELETE ON turma
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_turma_funcionario ON turma_funcionario;
CREATE TRIGGER trg_auditoria_turma_funcionario
AFTER INSERT OR UPDATE OR DELETE ON turma_funcionario
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_conclusao_evento ON conclusao_evento;
CREATE TRIGGER trg_auditoria_conclusao_evento
AFTER INSERT OR UPDATE OR DELETE ON conclusao_evento
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_evidencia ON evidencia;
CREATE TRIGGER trg_auditoria_evidencia
AFTER INSERT OR UPDATE OR DELETE ON evidencia
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_conformidade ON conformidade;
CREATE TRIGGER trg_auditoria_conformidade
AFTER INSERT OR UPDATE OR DELETE ON conformidade
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();
