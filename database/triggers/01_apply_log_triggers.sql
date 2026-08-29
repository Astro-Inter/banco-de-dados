DROP TRIGGER IF EXISTS trg_auditoria_workspaces ON workspaces;
CREATE TRIGGER trg_auditoria_workspaces
AFTER INSERT OR UPDATE OR DELETE ON workspaces
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_cargos ON cargos;
CREATE TRIGGER trg_auditoria_cargos
AFTER INSERT OR UPDATE OR DELETE ON cargos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_unidades ON unidades;
CREATE TRIGGER trg_auditoria_unidades
AFTER INSERT OR UPDATE OR DELETE ON unidades
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_unidade_enderecos ON unidade_enderecos;
CREATE TRIGGER trg_auditoria_unidade_enderecos
AFTER INSERT OR UPDATE OR DELETE ON unidade_enderecos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_usuarios ON usuarios;
CREATE TRIGGER trg_auditoria_usuarios
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_admin ON admin;
CREATE TRIGGER trg_auditoria_admin
AFTER INSERT OR UPDATE OR DELETE ON admin
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_nr_catalogos ON nr_catalogos;
CREATE TRIGGER trg_auditoria_nr_catalogos
AFTER INSERT OR UPDATE OR DELETE ON nr_catalogos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_cargo_nrs ON cargo_nrs;
CREATE TRIGGER trg_auditoria_cargo_nrs
AFTER INSERT OR UPDATE OR DELETE ON cargo_nrs
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_unidade_nrs ON unidade_nrs;
CREATE TRIGGER trg_auditoria_unidade_nrs
AFTER INSERT OR UPDATE OR DELETE ON unidade_nrs
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_eventos ON eventos;
CREATE TRIGGER trg_auditoria_eventos
AFTER INSERT OR UPDATE OR DELETE ON eventos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_turmas ON turmas;
CREATE TRIGGER trg_auditoria_turmas
AFTER INSERT OR UPDATE OR DELETE ON turmas
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_turma_funcionarios ON turma_funcionarios;
CREATE TRIGGER trg_auditoria_turma_funcionarios
AFTER INSERT OR UPDATE OR DELETE ON turma_funcionarios
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_conclusao_eventos ON conclusao_eventos;
CREATE TRIGGER trg_auditoria_conclusao_eventos
AFTER INSERT OR UPDATE OR DELETE ON conclusao_eventos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_evidencias ON evidencias;
CREATE TRIGGER trg_auditoria_evidencias
AFTER INSERT OR UPDATE OR DELETE ON evidencias
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();

DROP TRIGGER IF EXISTS trg_auditoria_conformidades ON conformidades;
CREATE TRIGGER trg_auditoria_conformidades
AFTER INSERT OR UPDATE OR DELETE ON conformidades
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_dml();