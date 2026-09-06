-- JSON esperado de exemplo:
-- [
--   {
--     "nome": "Rafael",
--     "email": "Rafael.teste@gmail.com",
--     "nr": 1,
--     "dataValidade": "2027-02-02"
--   },
--   {
--     "nome": "Lucas",
--     "email": "lucas.teste@gmail.com",
--     "nr": 5,
--     "dataValidade": "2027-03-10"
--   }
-- ]
CREATE OR REPLACE PROCEDURE inserir_conformidades_json(
    IN p_json_data TEXT,
    INOUT p_erros JSONB DEFAULT '[]'::JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_json JSONB;
    v_item JSONB;
    v_indice BIGINT;
    v_email TEXT;
    v_usuarios BIGINT[];
    v_usuario_id BIGINT;
    v_nr INTEGER;
    v_validade DATE;
    v_erro TEXT;
BEGIN
    p_erros := '[]'::JSONB;
    BEGIN
        v_json := p_json_data::JSONB;
    EXCEPTION WHEN invalid_text_representation THEN
        p_erros := JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT(
            'indice', NULL, 'registro', p_json_data, 'erro', 'JSON inválido.'
        ));
        RETURN;
    END;

    IF JSONB_TYPEOF(v_json) IS DISTINCT FROM 'array' THEN
        p_erros := JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT(
            'indice', NULL, 'registro', v_json, 'erro', 'O JSON deve ser um array de objetos.'
        ));
        RETURN;
    END IF;

    FOR v_item, v_indice IN
        SELECT value, ordinality FROM JSONB_ARRAY_ELEMENTS(v_json) WITH ORDINALITY
    LOOP
        -- O bloco isola erros de dados por item, sem desfazer os itens válidos anteriores.
        BEGIN
            IF JSONB_TYPEOF(v_item) IS DISTINCT FROM 'object' THEN
                RAISE EXCEPTION 'O item deve ser um objeto.' USING ERRCODE = '22023';
            END IF;
            IF JSONB_TYPEOF(v_item -> 'email') IS DISTINCT FROM 'string'
               OR BTRIM(v_item ->> 'email') = '' THEN
                RAISE EXCEPTION 'Informe um e-mail não vazio.' USING ERRCODE = '22023';
            END IF;
            v_email := LOWER(BTRIM(v_item ->> 'email'));

            SELECT ARRAY_AGG(id_usuario) INTO v_usuarios
            FROM usuarios
            WHERE LOWER(BTRIM(email)) = v_email AND tipo = 'FUNCIONARIO';

            IF v_usuarios IS NULL THEN
                RAISE EXCEPTION 'Funcionário não encontrado para o e-mail informado.' USING ERRCODE = '22023';
            END IF;
            IF CARDINALITY(v_usuarios) > 1 THEN
                RAISE EXCEPTION 'E-mail ambíguo: mais de um funcionário encontrado.' USING ERRCODE = '22023';
            END IF;
            v_usuario_id := v_usuarios[1];

            IF JSONB_TYPEOF(v_item -> 'nr') IS DISTINCT FROM 'number'
               OR (v_item ->> 'nr') !~ '^[1-9][0-9]*$' THEN
                RAISE EXCEPTION 'A NR deve ser um número inteiro positivo.' USING ERRCODE = '22023';
            END IF;
            BEGIN
                v_nr := (v_item ->> 'nr')::INTEGER;
            EXCEPTION WHEN numeric_value_out_of_range THEN
                RAISE EXCEPTION 'Número da NR fora do intervalo permitido.' USING ERRCODE = '22023';
            END;
            IF NOT EXISTS (SELECT 1 FROM nr_catalogos WHERE codigo_nr = v_nr) THEN
                RAISE EXCEPTION 'NR não encontrada no catálogo.' USING ERRCODE = '22023';
            END IF;

            IF JSONB_TYPEOF(v_item -> 'dataValidade') IS DISTINCT FROM 'string'
               OR (v_item ->> 'dataValidade') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
                RAISE EXCEPTION 'Informe dataValidade no formato YYYY-MM-DD.' USING ERRCODE = '22023';
            END IF;
            BEGIN
                v_validade := (v_item ->> 'dataValidade')::DATE;
            EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
                RAISE EXCEPTION 'dataValidade não é uma data válida.' USING ERRCODE = '22023';
            END;

            -- Serializa chamadas desta procedure para o mesmo funcionário em READ COMMITTED.
            -- O esquema admite múltiplas conformidades por funcionário/NR; não há UNIQUE do par.
            PERFORM 1 FROM usuarios
            WHERE id_usuario = v_usuario_id
            FOR NO KEY UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Funcionário não encontrado para o e-mail informado.' USING ERRCODE = '22023';
            END IF;

            UPDATE conformidades
            SET data_validade = v_validade
            WHERE usuario_id = v_usuario_id AND nr_id = v_nr;

            IF NOT FOUND THEN
                INSERT INTO conformidades
                    (usuario_id, nr_id, aplicavel, data_validade, origem, conclusao_evento_id)
                VALUES (v_usuario_id, v_nr, TRUE, v_validade, 'MANUAL', NULL);
            END IF;
        EXCEPTION
            WHEN invalid_parameter_value THEN
                GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
                p_erros := p_erros || JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT(
                    'indice', v_indice, 'registro', v_item, 'erro', v_erro
                ));
            WHEN foreign_key_violation THEN
                p_erros := p_erros || JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT(
                    'indice', v_indice, 'registro', v_item,
                    'erro', 'Uma referência de funcionário ou NR deixou de existir durante a importação.'
                ));
        END;
    END LOOP;
END;
$$;

COMMENT ON PROCEDURE inserir_conformidades_json(TEXT, JSONB) IS
'Importa um array JSON de conformidades por e-mail e NR. Atualiza somente a validade das existentes, insere novas como MANUAL/aplicável e devolve os itens rejeitados em p_erros.';
