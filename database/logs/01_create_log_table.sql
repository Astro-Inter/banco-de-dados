CREATE TABLE insere_log (
    id_log BIGSERIAL,
    tabela VARCHAR(255) NOT NULL,
    data TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dado JSONB NOT NULL,
    usuario VARCHAR(255) NOT NULL,

    CONSTRAINT pk_insere_log PRIMARY KEY (id_log),
    CONSTRAINT ck_insere_log_tabela CHECK (CHAR_LENGTH(BTRIM(tabela)) >= 1),
    CONSTRAINT ck_insere_log_usuario CHECK (CHAR_LENGTH(BTRIM(usuario)) >= 1)
);

COMMENT ON TABLE insere_log IS 'Auditoria dos registros inseridos nas tabelas monitoradas do Astro.';
COMMENT ON COLUMN insere_log.id_log IS 'Identificador interno e autoincrementado do log de inserção.';
COMMENT ON COLUMN insere_log.tabela IS 'Nome da tabela na qual o registro foi inserido.';
COMMENT ON COLUMN insere_log.data IS 'Data e horário da inserção, considerando o fuso horário da sessão.';
COMMENT ON COLUMN insere_log.dado IS 'Representação JSONB completa do registro criado.';
COMMENT ON COLUMN insere_log.usuario IS 'Usuário da conexão com o banco de dados que realizou a operação.';

CREATE TABLE altera_log (
    id_log BIGSERIAL,
    tabela VARCHAR(255) NOT NULL,
    data TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dado_anterior JSONB NOT NULL,
    dado_atual JSONB NOT NULL,
    usuario VARCHAR(255) NOT NULL,

    CONSTRAINT pk_altera_log PRIMARY KEY (id_log),
    CONSTRAINT ck_altera_log_tabela CHECK (CHAR_LENGTH(BTRIM(tabela)) >= 1),
    CONSTRAINT ck_altera_log_usuario CHECK (CHAR_LENGTH(BTRIM(usuario)) >= 1),
    CONSTRAINT ck_altera_log_possui_alteracao CHECK (
        dado_anterior <> '{}'::JSONB AND dado_atual <> '{}'::JSONB
    )
);

COMMENT ON TABLE altera_log IS 'Auditoria dos campos efetivamente alterados nas tabelas monitoradas do Astro.';
COMMENT ON COLUMN altera_log.id_log IS 'Identificador interno e autoincrementado do log de alteração.';
COMMENT ON COLUMN altera_log.tabela IS 'Nome da tabela na qual o registro foi alterado.';
COMMENT ON COLUMN altera_log.data IS 'Data e horário da alteração, considerando o fuso horário da sessão.';
COMMENT ON COLUMN altera_log.dado_anterior IS 'JSONB contendo somente os campos alterados e seus valores anteriores.';
COMMENT ON COLUMN altera_log.dado_atual IS 'JSONB contendo somente os campos alterados e seus valores novos.';
COMMENT ON COLUMN altera_log.usuario IS 'Usuário da conexão com o banco de dados que realizou a operação.';

CREATE TABLE deleta_log (
    id_log BIGSERIAL,
    tabela VARCHAR(255) NOT NULL,
    data TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dado JSONB NOT NULL,
    usuario VARCHAR(255) NOT NULL,

    CONSTRAINT pk_deleta_log PRIMARY KEY (id_log),
    CONSTRAINT ck_deleta_log_tabela CHECK (CHAR_LENGTH(BTRIM(tabela)) >= 1),
    CONSTRAINT ck_deleta_log_usuario CHECK (CHAR_LENGTH(BTRIM(usuario)) >= 1)
);

COMMENT ON TABLE deleta_log IS 'Auditoria dos registros excluídos das tabelas monitoradas do Astro.';
COMMENT ON COLUMN deleta_log.id_log IS 'Identificador interno e autoincrementado do log de exclusão.';
COMMENT ON COLUMN deleta_log.tabela IS 'Nome da tabela da qual o registro foi excluído.';
COMMENT ON COLUMN deleta_log.data IS 'Data e horário da exclusão, considerando o fuso horário da sessão.';
COMMENT ON COLUMN deleta_log.dado IS 'Representação JSONB completa do registro antes da exclusão.';
COMMENT ON COLUMN deleta_log.usuario IS 'Usuário da conexão com o banco de dados que realizou a operação.';