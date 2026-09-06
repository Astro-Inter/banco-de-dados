-- Executar em banco de teste com os scripts de criação, constraints e a function aplicados.
BEGIN;
DO $$
DECLARE
    v_workspace BIGINT;
    v_unidade BIGINT;
    v_cargo BIGINT;
BEGIN
    INSERT INTO workspaces (nome, cnpj)
    VALUES ('Teste SCRUM-175', '99999999999175') RETURNING id_workspace INTO v_workspace;
    INSERT INTO unidades (workspace_id, nome)
    VALUES (v_workspace, 'Unidade teste') RETURNING id_unidade INTO v_unidade;
    INSERT INTO cargos (workspace_id, nome)
    VALUES (v_workspace, 'Cargo teste') RETURNING id_cargo INTO v_cargo;

    INSERT INTO usuarios (nome, email, firebase_uid, tipo, cargo_id, unidade_id, status)
    VALUES
        ('Gestor teste', 'gestor175@example.com', 'scrum175-gestor', 'GESTOR', v_cargo, v_unidade, 'ATIVO'),
        ('Gestor workspace teste', 'workspace175@example.com', 'scrum175-workspace', 'GESTOR_WORKSPACE', v_cargo, v_unidade, 'ATIVO'),
        ('Funcionário teste', 'funcionario175@example.com', 'scrum175-funcionario', 'FUNCIONARIO', v_cargo, v_unidade, 'ATIVO'),
        ('Funcionário desativado', 'desativado175@example.com', 'scrum175-desativado', 'FUNCIONARIO', v_cargo, v_unidade, 'DESATIVADO'),
        ('Funcionário pré-cadastrado', 'precadastro175@example.com', 'scrum175-precadastro', 'FUNCIONARIO', v_cargo, v_unidade, 'PRE_CADASTRADO');
    INSERT INTO admin (nome, email, firebase_uid)
    VALUES ('Admin teste', 'admin175@example.com', 'scrum175-admin');

    ASSERT fn_retornar_nivel_acesso('scrum175-admin') = 'ADMIN';
    ASSERT fn_retornar_nivel_acesso('scrum175-gestor') = 'GESTOR';
    ASSERT fn_retornar_nivel_acesso('scrum175-workspace') = 'GESTOR_WORKSPACE';
    ASSERT fn_retornar_nivel_acesso('scrum175-funcionario') = 'FUNCIONARIO';
    ASSERT fn_retornar_nivel_acesso('scrum175-desativado') = 'FUNCIONARIO';
    ASSERT fn_retornar_nivel_acesso('scrum175-precadastro') = 'FUNCIONARIO';
    ASSERT fn_retornar_nivel_acesso('scrum175-ausente') = 'SEM_ACESSO';
    ASSERT fn_retornar_nivel_acesso(NULL) = 'SEM_ACESSO';
    ASSERT fn_retornar_nivel_acesso('') = 'SEM_ACESSO';
    ASSERT fn_retornar_nivel_acesso('   ') = 'SEM_ACESSO';
    ASSERT fn_retornar_nivel_acesso('SCRUM175-admin') = 'SEM_ACESSO', 'O UID deve ser comparado exatamente';
    ASSERT fn_retornar_nivel_acesso(' scrum175-admin ') = 'SEM_ACESSO';

    -- O mesmo UID pode existir nas duas tabelas; o perfil ADMIN tem prioridade.
    INSERT INTO admin (nome, email, firebase_uid)
    VALUES ('Admin e usuário', 'adminusuario175@example.com', 'scrum175-funcionario');
    ASSERT fn_retornar_nivel_acesso('scrum175-funcionario') = 'ADMIN';

    INSERT INTO conta (nome, email, firebase_uid)
    VALUES ('Conta sem perfil', 'conta175@example.com', 'scrum175-conta');
    ASSERT fn_retornar_nivel_acesso('scrum175-conta') = 'SEM_ACESSO';
END;
$$;
ROLLBACK;
