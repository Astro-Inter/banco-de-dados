ALTER TABLE workspaces
    ALTER COLUMN id_workspace SET NOT NULL, 
    ALTER COLUMN nome SET NOT NULL,         
    ALTER COLUMN cnpj SET NOT NULL;        

ALTER TABLE workspaces
    ADD CONSTRAINT pk_workspaces PRIMARY KEY (id_workspace),
    ADD CONSTRAINT uq_workspaces_cnpj UNIQUE (cnpj),          
    ADD CONSTRAINT ck_workspaces_nome CHECK (CHAR_LENGTH(BTRIM(nome)) >= 2), 
    ADD CONSTRAINT ck_workspaces_cnpj CHECK (cnpj ~ '^[0-9]{14}$'); 

ALTER TABLE conta
    ALTER COLUMN email SET NOT NULL;

ALTER TABLE conta
    ADD CONSTRAINT ck_conta_nome CHECK (CHAR_LENGTH(BTRIM(nome)) >= 2),
    ADD CONSTRAINT ck_conta_email CHECK (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

ALTER TABLE cargos
    ALTER COLUMN id_cargo SET NOT NULL,
    ALTER COLUMN workspace_id SET NOT NULL, 
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN ativo SET DEFAULT TRUE;

ALTER TABLE cargos
    ADD CONSTRAINT pk_cargos PRIMARY KEY (id_cargo),
    ADD CONSTRAINT uq_cargos_workspace_nome UNIQUE (workspace_id, nome), -- O nome não se repete dentro do mesmo workspace.
    ADD CONSTRAINT ck_cargos_nome CHECK (CHAR_LENGTH(BTRIM(nome)) >= 2);


ALTER TABLE unidades
    ALTER COLUMN id_unidade SET NOT NULL,
    ALTER COLUMN workspace_id SET NOT NULL, 
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN ativo SET DEFAULT TRUE;

ALTER TABLE unidades
    ADD CONSTRAINT pk_unidades PRIMARY KEY (id_unidade),
    ADD CONSTRAINT uq_unidades_workspace_nome UNIQUE (workspace_id, nome),
    ADD CONSTRAINT ck_unidades_nome CHECK (CHAR_LENGTH(BTRIM(nome)) >= 2);

ALTER TABLE unidade_enderecos
    ALTER COLUMN unidade_id SET NOT NULL,
    ALTER COLUMN cep SET NOT NULL,
    ALTER COLUMN rua SET NOT NULL,
    ALTER COLUMN cidade SET NOT NULL,
    ALTER COLUMN bairro SET NOT NULL,
    ALTER COLUMN estado SET NOT NULL;

ALTER TABLE unidade_enderecos
    ADD CONSTRAINT pk_unidade_enderecos PRIMARY KEY (unidade_id), 
    ADD CONSTRAINT ck_unidade_enderecos_cep CHECK (cep ~ '^[0-9]{8}$'),
    ADD CONSTRAINT ck_unidade_enderecos_estado CHECK (estado ~ '^[A-Z]{2}$'),
    ADD CONSTRAINT ck_unidade_enderecos_rua CHECK (CHAR_LENGTH(BTRIM(rua)) >= 2),
    ADD CONSTRAINT ck_unidade_enderecos_cidade CHECK (CHAR_LENGTH(BTRIM(cidade)) >= 2),
    ADD CONSTRAINT ck_unidade_enderecos_bairro CHECK (CHAR_LENGTH(BTRIM(bairro)) >= 2),
    ADD CONSTRAINT ck_unidade_enderecos_complemento CHECK (
        complemento IS NULL OR CHAR_LENGTH(BTRIM(complemento)) >= 1
    );

ALTER TABLE usuarios
    ALTER COLUMN id_usuario SET NOT NULL,
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN tipo SET NOT NULL,
    ALTER COLUMN cargo_id SET NOT NULL,   
    ALTER COLUMN unidade_id SET NOT NULL, 
    ALTER COLUMN status SET DEFAULT 'PRE_CADASTRADO',
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN criado_em SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE usuarios
    ADD CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
    ADD CONSTRAINT uq_usuarios_email UNIQUE (email),
    ADD CONSTRAINT uq_usuarios_cpf UNIQUE (cpf), 
    ADD CONSTRAINT ck_usuarios_cpf CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
    ADD CONSTRAINT ck_usuarios_tipo CHECK (tipo IN ('GESTOR', 'GESTOR_WORKSPACE', 'FUNCIONARIO')),
    ADD CONSTRAINT ck_usuarios_status CHECK (status IN ('PRE_CADASTRADO', 'ATIVO', 'DESATIVADO')),
    ADD CONSTRAINT ck_usuarios_modalidade CHECK (
        modalidade IS NULL OR CHAR_LENGTH(BTRIM(modalidade)) >= 2
    ),
    ADD CONSTRAINT ck_usuarios_senha CHECK (
        status = 'PRE_CADASTRADO'
        OR (senha_hash IS NOT NULL AND CHAR_LENGTH(BTRIM(senha_hash)) >= 40)
    ); 

ALTER TABLE admin
    ALTER COLUMN id_admin SET NOT NULL,
    ALTER COLUMN senha_hash SET NOT NULL;

ALTER TABLE admin
    ADD CONSTRAINT pk_admin PRIMARY KEY (id_admin),
    ADD CONSTRAINT uq_admin_email UNIQUE (email),
    ADD CONSTRAINT ck_admin_senha_hash CHECK (CHAR_LENGTH(BTRIM(senha_hash)) >= 40);

ALTER TABLE usuario_foto_perfil
    ALTER COLUMN usuario_id SET NOT NULL,
    ALTER COLUMN caminho_objeto SET NOT NULL;

ALTER TABLE usuario_foto_perfil
    ADD CONSTRAINT pk_usuario_foto_perfil PRIMARY KEY (usuario_id),
    ADD CONSTRAINT uq_usuario_foto_perfil_caminho UNIQUE (caminho_objeto),
    ADD CONSTRAINT ck_usuario_foto_perfil_caminho CHECK (CHAR_LENGTH(BTRIM(caminho_objeto)) >= 1);

ALTER TABLE nr_catalogos
    ALTER COLUMN codigo_nr SET NOT NULL,
    ALTER COLUMN titulo SET NOT NULL,
    ALTER COLUMN tempo_reciclagem_meses SET NOT NULL,
    ALTER COLUMN revogada SET DEFAULT FALSE,
    ALTER COLUMN revogada SET NOT NULL;

ALTER TABLE nr_catalogos
    ADD CONSTRAINT pk_nr_catalogos PRIMARY KEY (codigo_nr),
    ADD CONSTRAINT ck_nr_catalogos_codigo CHECK (codigo_nr > 0),
    ADD CONSTRAINT ck_nr_catalogos_titulo CHECK (CHAR_LENGTH(BTRIM(titulo)) >= 3),
    ADD CONSTRAINT ck_nr_catalogos_reciclagem CHECK (tempo_reciclagem_meses > 0);

ALTER TABLE cargo_nrs
    ALTER COLUMN cargo_id SET NOT NULL,
    ALTER COLUMN nr_id SET NOT NULL;

ALTER TABLE cargo_nrs
    ADD CONSTRAINT pk_cargo_nrs PRIMARY KEY (cargo_id, nr_id); 

ALTER TABLE unidade_nrs
    ALTER COLUMN unidade_id SET NOT NULL,
    ALTER COLUMN nr_id SET NOT NULL;

ALTER TABLE unidade_nrs
    ADD CONSTRAINT pk_unidade_nrs PRIMARY KEY (unidade_id, nr_id); 

ALTER TABLE eventos
    ALTER COLUMN id_evento SET NOT NULL,
    ALTER COLUMN gestor_id SET NOT NULL,
    ALTER COLUMN titulo SET NOT NULL,
    ALTER COLUMN descricao SET NOT NULL,
    ALTER COLUMN modo_conclusao SET NOT NULL,
    ALTER COLUMN evidencia_obrigatoria SET DEFAULT FALSE,
    ALTER COLUMN evidencia_obrigatoria SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'ATIVO',
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE eventos
    ADD CONSTRAINT pk_eventos PRIMARY KEY (id_evento),
    ADD CONSTRAINT ck_eventos_titulo CHECK (CHAR_LENGTH(BTRIM(titulo)) >= 3),
    ADD CONSTRAINT ck_eventos_descricao CHECK (CHAR_LENGTH(BTRIM(descricao)) >= 3),
    ADD CONSTRAINT ck_eventos_link_externo CHECK (
        link_externo IS NULL OR link_externo ~* '^https?://[^[:space:]]+$'
    ),
    ADD CONSTRAINT ck_eventos_modo_conclusao CHECK (
        modo_conclusao IN ('FUNCIONARIO', 'GESTOR', 'LISTA_PRESENCA')
    ),
    ADD CONSTRAINT ck_eventos_status CHECK (
        status IN ('ATIVO', 'CONCLUIDO', 'CANCELADO')
    ),
    ADD CONSTRAINT ck_eventos_cancelamento CHECK (
        (status = 'CANCELADO'
            AND data_cancelamento IS NOT NULL
            AND motivo_cancelamento IS NOT NULL
            AND CHAR_LENGTH(BTRIM(motivo_cancelamento)) >= 3)
        OR
        (status <> 'CANCELADO'
            AND data_cancelamento IS NULL
            AND motivo_cancelamento IS NULL)
    ); 

ALTER TABLE turmas
    ALTER COLUMN id_turma SET NOT NULL,
    ALTER COLUMN evento_id SET NOT NULL,
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN data_inicial SET NOT NULL,
    ALTER COLUMN data_termino SET NOT NULL;

ALTER TABLE turmas
    ADD CONSTRAINT pk_turmas PRIMARY KEY (id_turma),
    ADD CONSTRAINT uq_turmas_evento_nome UNIQUE (evento_id, nome),
    ADD CONSTRAINT ck_turmas_nome CHECK (CHAR_LENGTH(BTRIM(nome)) >= 1),
    ADD CONSTRAINT ck_turmas_periodo CHECK (data_termino > data_inicial);

ALTER TABLE turma_funcionarios
    ALTER COLUMN id_turma_funcionario SET NOT NULL,
    ALTER COLUMN turma_id SET NOT NULL,
    ALTER COLUMN usuario_id SET NOT NULL;

ALTER TABLE turma_funcionarios
    ADD CONSTRAINT pk_turma_funcionarios PRIMARY KEY (id_turma_funcionario),
    ADD CONSTRAINT uq_turma_funcionarios_participacao UNIQUE (turma_id, usuario_id); -- Impede incluir o mesmo usuário duas vezes na turma.

ALTER TABLE conclusao_eventos
    ALTER COLUMN id_conclusao_evento SET NOT NULL,
    ALTER COLUMN turma_funcionario_id SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'PENDENTE',
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE conclusao_eventos
    ADD CONSTRAINT pk_conclusao_eventos PRIMARY KEY (id_conclusao_evento),
    ADD CONSTRAINT uq_conclusao_eventos_participacao UNIQUE (turma_funcionario_id), -- Materializa a cardinalidade 1:0..1.
    ADD CONSTRAINT ck_conclusao_eventos_status CHECK (
        status IN ('PENDENTE', 'CONCLUIDO', 'REJEITADO')
    ),
    ADD CONSTRAINT ck_conclusao_eventos_data_conclusao CHECK (
        status <> 'CONCLUIDO' OR data_conclusao IS NOT NULL
    ),
    ADD CONSTRAINT ck_conclusao_eventos_data_validacao CHECK (
        status = 'PENDENTE' OR data_validacao IS NOT NULL
    ),
    ADD CONSTRAINT ck_conclusao_eventos_motivo_rejeicao CHECK (
        (status = 'REJEITADO'
            AND motivo_rejeicao IS NOT NULL
            AND CHAR_LENGTH(BTRIM(motivo_rejeicao)) >= 3)
        OR
        (status <> 'REJEITADO' AND motivo_rejeicao IS NULL)
    ),
    ADD CONSTRAINT ck_conclusao_eventos_validade CHECK (
        data_validade IS NULL
        OR data_conclusao IS NULL
        OR data_validade >= data_conclusao::DATE
    );

ALTER TABLE evidencias
    ALTER COLUMN id_evidencia SET NOT NULL,
    ALTER COLUMN conclusao_evento_id SET NOT NULL,
    ALTER COLUMN nome_original SET NOT NULL,
    ALTER COLUMN caminho_objeto SET NOT NULL,
    ALTER COLUMN mime_type SET NOT NULL,
    ALTER COLUMN tamanho_bytes SET NOT NULL;

ALTER TABLE evidencias
    ADD CONSTRAINT pk_evidencias PRIMARY KEY (id_evidencia),
    ADD CONSTRAINT uq_evidencias_caminho_objeto UNIQUE (caminho_objeto),
    ADD CONSTRAINT ck_evidencias_nome_original CHECK (CHAR_LENGTH(BTRIM(nome_original)) >= 1),
    ADD CONSTRAINT ck_evidencias_caminho_objeto CHECK (CHAR_LENGTH(BTRIM(caminho_objeto)) >= 1),
    ADD CONSTRAINT ck_evidencias_mime_type CHECK (
        mime_type ~ '^[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+$'
    ),
    ADD CONSTRAINT ck_evidencias_tamanho_bytes CHECK (tamanho_bytes > 0);

ALTER TABLE conformidades
    ALTER COLUMN id_conformidade SET NOT NULL,
    ALTER COLUMN usuario_id SET NOT NULL,
    ALTER COLUMN nr_id SET NOT NULL,
    ALTER COLUMN aplicavel SET NOT NULL,
    ALTER COLUMN origem SET NOT NULL;

ALTER TABLE conformidades
    ADD CONSTRAINT pk_conformidades PRIMARY KEY (id_conformidade),
    ADD CONSTRAINT uq_conformidades_conclusao UNIQUE (conclusao_evento_id), 
    ADD CONSTRAINT ck_conformidades_origem CHECK (CHAR_LENGTH(BTRIM(origem)) >= 2);

ALTER TABLE cargos
    ADD CONSTRAINT fk_cargos_workspace FOREIGN KEY (workspace_id)
        REFERENCES workspaces (id_workspace)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE unidades
    ADD CONSTRAINT fk_unidades_workspace FOREIGN KEY (workspace_id)
        REFERENCES workspaces (id_workspace)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE unidade_enderecos
    ADD CONSTRAINT fk_unidade_enderecos_unidade FOREIGN KEY (unidade_id)
        REFERENCES unidades (id_unidade)
        ON UPDATE CASCADE ON DELETE CASCADE; 

ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_cargo FOREIGN KEY (cargo_id)
        REFERENCES cargos (id_cargo)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_usuarios_unidade FOREIGN KEY (unidade_id)
        REFERENCES unidades (id_unidade)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE usuario_foto_perfil
    ADD CONSTRAINT fk_usuario_foto_perfil_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE cargo_nrs
    ADD CONSTRAINT fk_cargo_nrs_cargo FOREIGN KEY (cargo_id)
        REFERENCES cargos (id_cargo)
        ON UPDATE CASCADE ON DELETE CASCADE,
    ADD CONSTRAINT fk_cargo_nrs_nr FOREIGN KEY (nr_id)
        REFERENCES nr_catalogos (codigo_nr)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE unidade_nrs
    ADD CONSTRAINT fk_unidade_nrs_unidade FOREIGN KEY (unidade_id)
        REFERENCES unidades (id_unidade)
        ON UPDATE CASCADE ON DELETE CASCADE,
    ADD CONSTRAINT fk_unidade_nrs_nr FOREIGN KEY (nr_id)
        REFERENCES nr_catalogos (codigo_nr)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE eventos
    ADD CONSTRAINT fk_eventos_gestor FOREIGN KEY (gestor_id)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_eventos_nr FOREIGN KEY (nr_id)
        REFERENCES nr_catalogos (codigo_nr)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE turmas
    ADD CONSTRAINT fk_turmas_evento FOREIGN KEY (evento_id)
        REFERENCES eventos (id_evento)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE turma_funcionarios
    ADD CONSTRAINT fk_turma_funcionarios_turma FOREIGN KEY (turma_id)
        REFERENCES turmas (id_turma)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_turma_funcionarios_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE conclusao_eventos
    ADD CONSTRAINT fk_conclusao_eventos_participacao FOREIGN KEY (turma_funcionario_id)
        REFERENCES turma_funcionarios (id_turma_funcionario)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE evidencias
    ADD CONSTRAINT fk_evidencias_conclusao_evento FOREIGN KEY (conclusao_evento_id)
        REFERENCES conclusao_eventos (id_conclusao_evento)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE conformidades
    ADD CONSTRAINT fk_conformidades_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_conformidades_nr FOREIGN KEY (nr_id)
        REFERENCES nr_catalogos (codigo_nr)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_conformidades_conclusao FOREIGN KEY (conclusao_evento_id)
        REFERENCES conclusao_eventos (id_conclusao_evento)
        ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE calendario
    ADD CONSTRAINT pk_calendario
        PRIMARY KEY (data_evento),
    ADD CONSTRAINT chk_calendario_mes
        CHECK (mes BETWEEN 1 AND 12),
    ADD CONSTRAINT chk_calendario_dia
        CHECK (dia BETWEEN 1 AND 31),
    ADD CONSTRAINT chk_calendario_trimestre
        CHECK (trimestre BETWEEN 1 AND 4);

ALTER TABLE acessos
    ALTER COLUMN data SET NOT NULL,
    ALTER COLUMN usuario_id SET NOT NULL,
    ADD CONSTRAINT pk_acessos PRIMARY KEY (data, usuario_id);
