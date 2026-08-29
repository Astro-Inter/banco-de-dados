ALTER TABLE workspace
    ADD CONSTRAINT pk_workspace PRIMARY KEY (id_workspace);

ALTER TABLE workspace
    ADD CONSTRAINT uq_workspace_cnpj UNIQUE (cnpj);

ALTER TABLE workspace
    ADD CONSTRAINT ck_workspace_nome CHECK (CHAR_LENGTH(BTRIM(nome_empresa)) >= 2);

ALTER TABLE workspace
    ADD CONSTRAINT ck_workspace_cnpj CHECK (cnpj::TEXT ~ '^[0-9]{14}$');

ALTER TABLE unidade
    ADD CONSTRAINT pk_unidade PRIMARY KEY (id_unidade);

ALTER TABLE unidade
    ADD CONSTRAINT fk_unidade_workspace FOREIGN KEY (id_workspace)
        REFERENCES workspace (id_workspace)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE unidade
    ADD CONSTRAINT uq_unidade_cnpj UNIQUE (cnpj);

ALTER TABLE unidade
    ADD CONSTRAINT uq_unidade_workspace_nome UNIQUE (id_workspace, nome_unidade);

ALTER TABLE unidade
    ADD CONSTRAINT ck_unidade_nome CHECK (CHAR_LENGTH(BTRIM(nome_unidade)) >= 2);

ALTER TABLE unidade
    ADD CONSTRAINT ck_unidade_cnpj CHECK (cnpj::TEXT ~ '^[0-9]{14}$');

ALTER TABLE endereco_unidade
    ADD CONSTRAINT pk_endereco_unidade PRIMARY KEY (id_unidade);

ALTER TABLE endereco_unidade
    ADD CONSTRAINT fk_endereco_unidade_unidade FOREIGN KEY (id_unidade)
        REFERENCES unidade (id_unidade)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE endereco_unidade
    ADD CONSTRAINT ck_endereco_unidade_cep CHECK (cep::TEXT ~ '^[0-9]{8}$');

ALTER TABLE endereco_unidade
    ADD CONSTRAINT ck_endereco_unidade_estado CHECK (estado::TEXT ~ '^[A-Z]{2}$');

ALTER TABLE endereco_unidade
    ADD CONSTRAINT ck_endereco_unidade_numero CHECK (CHAR_LENGTH(BTRIM(numero)) >= 1);

ALTER TABLE nr_catalogo
    ADD CONSTRAINT pk_nr_catalogo PRIMARY KEY (codigo_nr);

ALTER TABLE nr_catalogo
    ADD CONSTRAINT ck_nr_codigo CHECK (codigo_nr > 0);

ALTER TABLE nr_catalogo
    ADD CONSTRAINT ck_nr_titulo CHECK (CHAR_LENGTH(BTRIM(titulo)) >= 3);

ALTER TABLE nr_catalogo
    ADD CONSTRAINT ck_nr_reciclagem CHECK (tempo_reciclagem_meses > 0);

ALTER TABLE cargo
    ADD CONSTRAINT pk_cargo PRIMARY KEY (id_cargo);

ALTER TABLE cargo
    ADD CONSTRAINT ck_cargo_nome CHECK (CHAR_LENGTH(BTRIM(nome)) >= 2);

ALTER TABLE usuario
    ADD CONSTRAINT pk_usuario PRIMARY KEY (id_usuario);

ALTER TABLE usuario
    ADD CONSTRAINT fk_usuario_unidade FOREIGN KEY (id_unidade)
        REFERENCES unidade (id_unidade)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE usuario
    ADD CONSTRAINT fk_usuario_cargo FOREIGN KEY (id_cargo)
        REFERENCES cargo (id_cargo)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_nome CHECK (CHAR_LENGTH(BTRIM(nome)) >= 2);

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_email CHECK (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_cpf CHECK (cpf IS NULL OR cpf::TEXT ~ '^[0-9]{11}$');

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_status CHECK (status IN ('PRE_CADASTRADO', 'ATIVO', 'DESATIVADO'));

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_tipo CHECK (tipo IN ('GESTOR', 'GESTOR_WORKSPACE', 'FUNCIONARIO'));

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_senha CHECK (status = 'PRE_CADASTRADO' OR senha_hash IS NOT NULL);

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_dados_funcionario CHECK (
        tipo <> 'FUNCIONARIO'
        OR status = 'PRE_CADASTRADO'
        OR (
            cpf IS NOT NULL
            AND id_cargo IS NOT NULL
            AND departamento IS NOT NULL
            AND modalidade IS NOT NULL
        )
    );

ALTER TABLE usuario_telefone
    ADD CONSTRAINT pk_usuario_telefone PRIMARY KEY (id_usuario, telefone);

ALTER TABLE usuario_telefone
    ADD CONSTRAINT fk_usuario_telefone_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE usuario_telefone
    ADD CONSTRAINT ck_usuario_telefone_formato CHECK (telefone ~ '^[0-9]{10,15}$');

ALTER TABLE admin
    ADD CONSTRAINT pk_admin PRIMARY KEY (id_admin);

ALTER TABLE admin
    ADD CONSTRAINT ck_admin_email CHECK (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

ALTER TABLE admin
    ADD CONSTRAINT ck_admin_senha_hash CHECK (CHAR_LENGTH(senha_hash) >= 40);

ALTER TABLE unidade_nr
    ADD CONSTRAINT pk_unidade_nr PRIMARY KEY (id_unidade, codigo_nr);

ALTER TABLE unidade_nr
    ADD CONSTRAINT fk_unidade_nr_unidade FOREIGN KEY (id_unidade)
        REFERENCES unidade (id_unidade)
        ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE unidade_nr
    ADD CONSTRAINT fk_unidade_nr_nr FOREIGN KEY (codigo_nr)
        REFERENCES nr_catalogo (codigo_nr)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE cargo_nr
    ADD CONSTRAINT pk_cargo_nr PRIMARY KEY (id_cargo, codigo_nr);

ALTER TABLE cargo_nr
    ADD CONSTRAINT fk_cargo_nr_cargo FOREIGN KEY (id_cargo)
        REFERENCES cargo (id_cargo)
        ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE cargo_nr
    ADD CONSTRAINT fk_cargo_nr_nr FOREIGN KEY (codigo_nr)
        REFERENCES nr_catalogo (codigo_nr)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE evento
    ADD CONSTRAINT pk_evento PRIMARY KEY (id_evento);

ALTER TABLE evento
    ADD CONSTRAINT fk_evento_gestor FOREIGN KEY (id_gestor)
        REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE evento
    ADD CONSTRAINT fk_evento_nr FOREIGN KEY (codigo_nr)
        REFERENCES nr_catalogo (codigo_nr)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE evento
    ADD CONSTRAINT ck_evento_titulo CHECK (CHAR_LENGTH(BTRIM(titulo)) >= 3);

ALTER TABLE evento
    ADD CONSTRAINT ck_evento_descricao CHECK (CHAR_LENGTH(BTRIM(descricao)) >= 3);

ALTER TABLE evento
    ADD CONSTRAINT ck_evento_validade CHECK (validade_meses > 0);

ALTER TABLE evento
    ADD CONSTRAINT ck_evento_link CHECK (
        link_externo IS NULL OR link_externo ~* '^https?://[^[:space:]]+$'
    );

ALTER TABLE evento
    ADD CONSTRAINT ck_evento_modo_conclusao CHECK (
        modo_conclusao IN ('FUNCIONARIO', 'GESTOR', 'LISTA_PRESENCA')
    );

ALTER TABLE turma
    ADD CONSTRAINT pk_turma PRIMARY KEY (id_turma);

ALTER TABLE turma
    ADD CONSTRAINT fk_turma_evento FOREIGN KEY (id_evento)
        REFERENCES evento (id_evento)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE turma
    ADD CONSTRAINT uq_turma_evento_nome UNIQUE (id_evento, nome_turma);

ALTER TABLE turma
    ADD CONSTRAINT ck_turma_nome CHECK (CHAR_LENGTH(BTRIM(nome_turma)) >= 1);

ALTER TABLE turma
    ADD CONSTRAINT ck_turma_periodo CHECK (termino_em > inicio_em);

ALTER TABLE turma_funcionario
    ADD CONSTRAINT pk_turma_funcionario PRIMARY KEY (id_turma_funcionario);

ALTER TABLE turma_funcionario
    ADD CONSTRAINT fk_turma_funcionario_turma FOREIGN KEY (id_turma)
        REFERENCES turma (id_turma)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE turma_funcionario
    ADD CONSTRAINT fk_turma_funcionario_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE turma_funcionario
    ADD CONSTRAINT uq_turma_funcionario UNIQUE (id_turma, id_usuario);

ALTER TABLE conclusao_evento
    ADD CONSTRAINT pk_conclusao_evento PRIMARY KEY (id_conclusao);

ALTER TABLE conclusao_evento
    ADD CONSTRAINT fk_conclusao_turma_funcionario FOREIGN KEY (id_turma_funcionario)
        REFERENCES turma_funcionario (id_turma_funcionario)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE conclusao_evento
    ADD CONSTRAINT ck_conclusao_status CHECK (
        status IN ('PENDENTE', 'CONCLUIDO', 'REJEITADO')
    );

ALTER TABLE conclusao_evento
    ADD CONSTRAINT ck_conclusao_data_final CHECK (
        status <> 'CONCLUIDO' OR data_conclusao IS NOT NULL
    );

ALTER TABLE conclusao_evento
    ADD CONSTRAINT ck_conclusao_data_validacao CHECK (
        status = 'PENDENTE' OR data_validacao IS NOT NULL
    );

ALTER TABLE conclusao_evento
    ADD CONSTRAINT ck_conclusao_motivo CHECK (
        (
            status = 'REJEITADO'
            AND motivo_rejeicao IS NOT NULL
            AND CHAR_LENGTH(BTRIM(motivo_rejeicao)) >= 3
        )
        OR (status <> 'REJEITADO' AND motivo_rejeicao IS NULL)
    );

ALTER TABLE conclusao_evento
    ADD CONSTRAINT ck_conclusao_validade CHECK (
        data_validade IS NULL
        OR data_conclusao IS NULL
        OR data_validade >= data_conclusao::DATE
    );

ALTER TABLE evidencia
    ADD CONSTRAINT pk_evidencia PRIMARY KEY (id_evidencia);

ALTER TABLE evidencia
    ADD CONSTRAINT fk_evidencia_conclusao FOREIGN KEY (id_conclusao)
        REFERENCES conclusao_evento (id_conclusao)
        ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE evidencia
    ADD CONSTRAINT ck_evidencia_nome CHECK (CHAR_LENGTH(BTRIM(nome_arquivo)) >= 1);

ALTER TABLE evidencia
    ADD CONSTRAINT ck_evidencia_caminho CHECK (CHAR_LENGTH(BTRIM(caminho_arquivo)) >= 1);

ALTER TABLE evidencia
    ADD CONSTRAINT ck_evidencia_mime CHECK (
        mime_type ~ '^[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+$'
    );

ALTER TABLE evidencia
    ADD CONSTRAINT ck_evidencia_tamanho CHECK (tamanho_bytes > 0);
