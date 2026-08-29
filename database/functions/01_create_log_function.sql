CREATE OR REPLACE FUNCTION fn_registrar_log_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_dado_anterior JSONB;
    v_dado_atual JSONB;
    v_usuario_banco VARCHAR(255) := SESSION_USER::TEXT;
BEGIN
    IF TG_TABLE_NAME IN (
        'insere_log',
        'altera_log',
        'deleta_log'
    ) THEN
        RAISE EXCEPTION
            'A função de auditoria não pode monitorar a tabela %.',
            TG_TABLE_NAME;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO insere_log (
            tabela,
            dado,
            usuario
        )
        VALUES (
            TG_TABLE_NAME,
            TO_JSONB(NEW),
            v_usuario_banco
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        SELECT
            COALESCE(
                JSONB_OBJECT_AGG(anterior.chave, anterior.valor),
                '{}'::JSONB
            ),
            COALESCE(
                JSONB_OBJECT_AGG(atual.chave, atual.valor),
                '{}'::JSONB
            )
        INTO
            v_dado_anterior,
            v_dado_atual
        FROM JSONB_EACH(TO_JSONB(OLD))
            AS anterior(chave, valor)
        INNER JOIN JSONB_EACH(TO_JSONB(NEW))
            AS atual(chave, valor)
            ON atual.chave = anterior.chave
        WHERE anterior.valor IS DISTINCT FROM atual.valor;

        IF v_dado_anterior <> '{}'::JSONB THEN
            INSERT INTO altera_log (
                tabela,
                dado_anterior,
                dado_atual,
                usuario
            )
            VALUES (
                TG_TABLE_NAME,
                v_dado_anterior,
                v_dado_atual,
                v_usuario_banco
            );
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO deleta_log (
            tabela,
            dado,
            usuario
        )
        VALUES (
            TG_TABLE_NAME,
            TO_JSONB(OLD),
            v_usuario_banco
        );

        RETURN OLD;
    END IF;

    RAISE EXCEPTION
        'Operação DML não suportada pela auditoria: %.',
        TG_OP;
END;
$$;

COMMENT ON FUNCTION fn_registrar_log_dml() IS
'Função genérica acionada por triggers AFTER para auditar INSERT, UPDATE e DELETE, registrando o usuário conectado ao PostgreSQL.';

REVOKE ALL
ON FUNCTION fn_registrar_log_dml()
FROM PUBLIC;