-- Executar em banco de teste com tabelas, constraints, functions e triggers aplicados.
BEGIN;
DO $$
DECLARE
    v_workspace BIGINT;
    v_cargo_a BIGINT;
    v_cargo_b BIGINT;
    v_unidade_a BIGINT;
    v_unidade_b BIGINT;
    v_usuario BIGINT;
BEGIN
    INSERT INTO workspaces (nome, cnpj) VALUES ('Teste SCRUM-176', '99999999999176')
    RETURNING id_workspace INTO v_workspace;
    INSERT INTO cargos (workspace_id, nome) VALUES (v_workspace, 'Cargo A') RETURNING id_cargo INTO v_cargo_a;
    INSERT INTO cargos (workspace_id, nome) VALUES (v_workspace, 'Cargo B') RETURNING id_cargo INTO v_cargo_b;
    INSERT INTO unidades (workspace_id, nome) VALUES (v_workspace, 'Unidade A') RETURNING id_unidade INTO v_unidade_a;
    INSERT INTO unidades (workspace_id, nome) VALUES (v_workspace, 'Unidade B') RETURNING id_unidade INTO v_unidade_b;

    INSERT INTO usuarios (nome, email, firebase_uid, tipo, cargo_id, unidade_id, status)
    SELECT 'Teste SCRUM-176',
        CONCAT(c.id, '-', u.id, '-', p.tipo, '-', s.status, '@scrum176.example.com'),
        CONCAT('scrum176-', c.id, '-', u.id, '-', p.tipo, '-', s.status),
        p.tipo, c.id, u.id, s.status
    FROM (VALUES (v_cargo_a), (v_cargo_b)) c(id)
    CROSS JOIN (VALUES (v_unidade_a), (v_unidade_b)) u(id)
    CROSS JOIN (VALUES ('FUNCIONARIO'), ('GESTOR'), ('GESTOR_WORKSPACE')) p(tipo)
    CROSS JOIN (VALUES ('ATIVO'), ('PRE_CADASTRADO'), ('DESATIVADO')) s(status);

    CREATE TEMP TABLE usuarios_antes_scrum176 ON COMMIT DROP AS
    SELECT id_usuario, cargo_id, unidade_id, tipo, status
    FROM usuarios WHERE cargo_id IN (v_cargo_a, v_cargo_b);

    UPDATE cargos SET ativo = FALSE WHERE id_cargo = v_cargo_a;
    ASSERT NOT EXISTS (
        SELECT 1 FROM usuarios u JOIN usuarios_antes_scrum176 a USING (id_usuario)
        WHERE u.status IS DISTINCT FROM CASE
            WHEN a.cargo_id = v_cargo_a AND a.tipo <> 'GESTOR_WORKSPACE' THEN 'DESATIVADO'
            ELSE a.status END
    ), 'Cargo deve afetar apenas seus usuários, exceto GESTOR_WORKSPACE';

    UPDATE cargos SET ativo = TRUE WHERE id_cargo = v_cargo_a;
    ASSERT NOT EXISTS (SELECT 1 FROM usuarios WHERE cargo_id = v_cargo_a AND tipo <> 'GESTOR_WORKSPACE' AND status <> 'DESATIVADO'),
        'Reativar cargo não deve reativar contas';
    UPDATE usuarios u SET status = a.status FROM usuarios_antes_scrum176 a WHERE u.id_usuario = a.id_usuario;

    UPDATE unidades SET ativo = FALSE WHERE id_unidade = v_unidade_a;
    ASSERT NOT EXISTS (
        SELECT 1 FROM usuarios u JOIN usuarios_antes_scrum176 a USING (id_usuario)
        WHERE u.status IS DISTINCT FROM CASE
            WHEN a.unidade_id = v_unidade_a AND a.tipo <> 'GESTOR_WORKSPACE' THEN 'DESATIVADO'
            ELSE a.status END
    ), 'Unidade deve afetar todos os cargos vinculados, exceto GESTOR_WORKSPACE';

    UPDATE unidades SET ativo = TRUE WHERE id_unidade = v_unidade_a;
    ASSERT NOT EXISTS (SELECT 1 FROM usuarios WHERE unidade_id = v_unidade_a AND tipo <> 'GESTOR_WORKSPACE' AND status <> 'DESATIVADO'),
        'Reativar unidade não deve reativar contas';
    UPDATE usuarios u SET status = a.status FROM usuarios_antes_scrum176 a WHERE u.id_usuario = a.id_usuario;

    UPDATE cargos SET ativo = TRUE, nome = 'Cargo renomeado' WHERE id_cargo = v_cargo_a;
    UPDATE unidades SET ativo = TRUE, nome = 'Unidade renomeada' WHERE id_unidade = v_unidade_a;
    ASSERT NOT EXISTS (SELECT 1 FROM usuarios u JOIN usuarios_antes_scrum176 a USING (id_usuario) WHERE u.status <> a.status),
        'Atualizações sem desativação não devem afetar usuários';

    -- Mudanças em múltiplas linhas e em valores legados nulos também são cobertas.
    UPDATE cargos SET ativo = NULL WHERE id_cargo = v_cargo_b;
    UPDATE cargos SET ativo = FALSE WHERE id_cargo IN (v_cargo_a, v_cargo_b);
    ASSERT NOT EXISTS (SELECT 1 FROM usuarios u JOIN usuarios_antes_scrum176 a USING (id_usuario)
        WHERE u.status <> CASE WHEN a.tipo = 'GESTOR_WORKSPACE' THEN a.status ELSE 'DESATIVADO' END);

    SELECT id_usuario INTO v_usuario FROM usuarios_antes_scrum176
    WHERE cargo_id = v_cargo_a AND tipo = 'FUNCIONARIO' LIMIT 1;
    UPDATE usuarios SET status = 'ATIVO' WHERE id_usuario = v_usuario;
    UPDATE cargos SET ativo = FALSE WHERE id_cargo = v_cargo_a;
    UPDATE cargos SET nome = 'Cargo inativo renomeado' WHERE id_cargo = v_cargo_a;
    ASSERT (SELECT status = 'ATIVO' FROM usuarios WHERE id_usuario = v_usuario), 'Cargo já inativo não dispara novamente';

    UPDATE usuarios u SET status = a.status FROM usuarios_antes_scrum176 a WHERE u.id_usuario = a.id_usuario;
    UPDATE unidades SET ativo = NULL WHERE id_unidade = v_unidade_b;
    UPDATE unidades SET ativo = FALSE WHERE id_unidade IN (v_unidade_a, v_unidade_b);
    ASSERT NOT EXISTS (SELECT 1 FROM usuarios u JOIN usuarios_antes_scrum176 a USING (id_usuario)
        WHERE u.status <> CASE WHEN a.tipo = 'GESTOR_WORKSPACE' THEN a.status ELSE 'DESATIVADO' END);

    UPDATE usuarios SET status = 'ATIVO' WHERE id_usuario = v_usuario;
    UPDATE unidades SET ativo = FALSE WHERE id_unidade IN (v_unidade_a, v_unidade_b);
    UPDATE unidades SET nome = 'Unidade inativa renomeada' WHERE id_unidade = v_unidade_a;
    ASSERT (SELECT status = 'ATIVO' FROM usuarios WHERE id_usuario = v_usuario), 'Unidade já inativa não dispara novamente';
END;
$$;
ROLLBACK;
