-- Regressão executável em um banco de teste com scripts/1_create_table.sql,
-- scripts/2_constraints.sql e procedures/inserir_conformidades_json.sql aplicados.
-- Todos os dados de teste são revertidos ao final.
BEGIN;
DO $$
DECLARE
    v_workspace BIGINT;
    v_unidade BIGINT;
    v_cargo BIGINT;
    v_usuario BIGINT;
    v_gestor BIGINT;
    v_evento BIGINT;
    v_turma BIGINT;
    v_participacao BIGINT;
    v_conclusao BIGINT;
    v_conformidade BIGINT;
    v_erros JSONB;
    v_payload JSONB;
    v_invalido JSONB;
    v_antes BIGINT;
BEGIN
    INSERT INTO workspaces (nome, cnpj) VALUES ('Teste SCRUM-174', '99999999999174') RETURNING id_workspace INTO v_workspace;
    INSERT INTO unidades (workspace_id, nome) VALUES (v_workspace, 'Unidade teste') RETURNING id_unidade INTO v_unidade;
    INSERT INTO cargos (workspace_id, nome) VALUES (v_workspace, 'Cargo teste') RETURNING id_cargo INTO v_cargo;
    INSERT INTO usuarios (nome, email, firebase_uid, tipo, cargo_id, unidade_id, status)
    VALUES ('Funcionário teste', 'scrum174@example.com', 'scrum174-funcionario', 'FUNCIONARIO', v_cargo, v_unidade, 'ATIVO')
    RETURNING id_usuario INTO v_usuario;
    INSERT INTO usuarios (nome, email, firebase_uid, tipo, cargo_id, unidade_id, status)
    VALUES ('Gestor teste', 'gestor174@example.com', 'scrum174-gestor', 'GESTOR', v_cargo, v_unidade, 'ATIVO')
    RETURNING id_usuario INTO v_gestor;
    INSERT INTO nr_catalogos (codigo_nr, titulo, tempo_reciclagem_meses, revogada)
    VALUES (99174, 'Norma de teste A', 12, FALSE), (99175, 'Norma de teste B', 12, FALSE);

    -- Lote misto: cria os dois válidos, preserva o inválido integralmente no retorno.
    v_invalido := '{"nome":"Ausente","email":"ausente174@example.com","nr":99174,"dataValidade":"2027-02-02"}';
    v_payload := JSONB_BUILD_ARRAY(
        '{"nome":"Nome informativo","email":" SCRUM174@EXAMPLE.COM ","nr":99174,"dataValidade":"2027-02-02"}'::JSONB,
        v_invalido,
        '{"email":"scrum174@example.com","nr":99175,"dataValidade":"2027-03-10"}'::JSONB
    );
    CALL inserir_conformidades_json(v_payload::TEXT, v_erros);
    ASSERT JSONB_ARRAY_LENGTH(v_erros) = 1, 'Deve devolver apenas o item com e-mail inexistente';
    ASSERT v_erros -> 0 -> 'registro' = v_invalido, 'Deve preservar a linha original';
    ASSERT (v_erros -> 0 ->> 'indice')::INTEGER = 2, 'O índice deve ser baseado em 1';
    ASSERT v_erros -> 0 ->> 'erro' = 'Funcionário não encontrado para o e-mail informado.';
    ASSERT (SELECT COUNT(*) = 2 FROM conformidades WHERE usuario_id = v_usuario);
    ASSERT (SELECT BOOL_AND(aplicavel AND origem = 'MANUAL' AND conclusao_evento_id IS NULL)
            FROM conformidades WHERE usuario_id = v_usuario), 'Defaults da conformidade manual';
    ASSERT (SELECT nome = 'Funcionário teste' FROM usuarios WHERE id_usuario = v_usuario), 'Não altera o cadastro';

    -- Atualização não duplica; a última entrada válida do mesmo par vence.
    CALL inserir_conformidades_json('[
        {"email":"scrum174@example.com","nr":99174,"dataValidade":"2028-02-29"},
        {"email":"scrum174@example.com","nr":99174,"dataValidade":"2029-03-01"}
    ]', v_erros);
    ASSERT v_erros = '[]'::JSONB;
    ASSERT (SELECT COUNT(*) = 2 FROM conformidades WHERE usuario_id = v_usuario);
    ASSERT (SELECT data_validade = DATE '2029-03-01' FROM conformidades WHERE usuario_id = v_usuario AND nr_id = 99174);
    ASSERT (SELECT data_validade = DATE '2027-03-10' FROM conformidades WHERE usuario_id = v_usuario AND nr_id = 99175);

    -- Preserva origem, aplicabilidade e vínculo com a conclusão nas linhas existentes.
    INSERT INTO eventos (gestor_id, nr_id, titulo, descricao, modo_conclusao)
    VALUES (v_gestor, 99174, 'Evento teste', 'Descrição teste', 'GESTOR') RETURNING id_evento INTO v_evento;
    INSERT INTO turmas (evento_id, nome, data_inicial, data_termino)
    VALUES (v_evento, 'Turma teste', '2026-01-01 08:00:00', '2026-01-01 12:00:00') RETURNING id_turma INTO v_turma;
    INSERT INTO turma_funcionarios (turma_id, usuario_id) VALUES (v_turma, v_usuario) RETURNING id_turma_funcionario INTO v_participacao;
    INSERT INTO conclusao_eventos (turma_funcionario_id, status, data_conclusao, data_validacao, data_validade)
    VALUES (v_participacao, 'CONCLUIDO', '2026-01-01 12:00:00', '2026-01-01 13:00:00', '2027-01-01')
    RETURNING id_conclusao_evento INTO v_conclusao;
    INSERT INTO conformidades (usuario_id, nr_id, aplicavel, origem, conclusao_evento_id, data_validade)
    VALUES (v_usuario, 99174, FALSE, 'CONCLUSAO_EVENTO', v_conclusao, '2027-01-01') RETURNING id_conformidade INTO v_conformidade;
    CALL inserir_conformidades_json('[{"email":"scrum174@example.com","nr":99174,"dataValidade":"2030-01-01"}]', v_erros);
    ASSERT v_erros = '[]'::JSONB;
    ASSERT (SELECT COUNT(*) = 2 AND BOOL_AND(data_validade = DATE '2030-01-01') FROM conformidades WHERE usuario_id = v_usuario AND nr_id = 99174);
    ASSERT (SELECT NOT aplicavel AND origem = 'CONCLUSAO_EVENTO' AND conclusao_evento_id = v_conclusao FROM conformidades WHERE id_conformidade = v_conformidade);
    ASSERT (SELECT data_validade = DATE '2027-01-01' FROM conclusao_eventos WHERE id_conclusao_evento = v_conclusao);

    -- Erros de formato e referências não escrevem registros, nem interrompem o lote.
    SELECT COUNT(*) INTO v_antes FROM conformidades;
    CALL inserir_conformidades_json('[
        null,
        {"email":""},
        {"email":"scrum174@example.com","nr":"99174","dataValidade":"2027-01-01"},
        {"email":"scrum174@example.com","nr":-1,"dataValidade":"2027-01-01"},
        {"email":"scrum174@example.com","nr":1.5,"dataValidade":"2027-01-01"},
        {"email":"scrum174@example.com","nr":99999999999999999,"dataValidade":"2027-01-01"},
        {"email":"scrum174@example.com","nr":99176,"dataValidade":"2027-01-01"},
        {"email":"scrum174@example.com","nr":99174,"dataValidade":"2027-02-29"},
        {"email":"scrum174@example.com","nr":99174,"dataValidade":null},
        {"email":"scrum174@example.com","nr":99174,"dataValidade":"02/02/2027"},
        {"email":"gestor174@example.com","nr":99174,"dataValidade":"2027-02-02"},
        {"email":"scrum174@example.com","dataValidade":"2027-02-02"}
    ]', v_erros);
    ASSERT JSONB_ARRAY_LENGTH(v_erros) = 12;
    ASSERT (SELECT COUNT(*) = v_antes FROM conformidades);
    ASSERT (SELECT BOOL_AND(data_validade = DATE '2030-01-01') FROM conformidades WHERE usuario_id = v_usuario AND nr_id = 99174);

    CALL inserir_conformidades_json('não é json', v_erros);
    ASSERT v_erros -> 0 ->> 'erro' = 'JSON inválido.';
    CALL inserir_conformidades_json('{}', v_erros);
    ASSERT v_erros -> 0 ->> 'erro' = 'O JSON deve ser um array de objetos.';
    CALL inserir_conformidades_json(NULL, v_erros);
    ASSERT JSONB_ARRAY_LENGTH(v_erros) = 1;
    CALL inserir_conformidades_json('null', v_erros);
    ASSERT JSONB_ARRAY_LENGTH(v_erros) = 1;
    CALL inserir_conformidades_json('[]', v_erros);
    ASSERT v_erros = '[]'::JSONB, 'O retorno deve ser reiniciado a cada chamada';

    INSERT INTO usuarios (nome, email, firebase_uid, tipo, cargo_id, unidade_id, status)
    VALUES ('Homônimo', 'SCRUM174@example.com', 'scrum174-ambiguo', 'FUNCIONARIO', v_cargo, v_unidade, 'ATIVO');
    CALL inserir_conformidades_json('[{"email":"scrum174@example.com","nr":99174,"dataValidade":"2031-01-01"}]', v_erros);
    ASSERT v_erros -> 0 ->> 'erro' = 'E-mail ambíguo: mais de um funcionário encontrado.';
    ASSERT (SELECT COUNT(*) = v_antes FROM conformidades);
    ASSERT (SELECT BOOL_AND(data_validade = DATE '2030-01-01') FROM conformidades WHERE usuario_id = v_usuario AND nr_id = 99174);
END;
$$;
ROLLBACK;
