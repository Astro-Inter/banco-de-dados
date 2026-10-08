CREATE OR REPLACE PROCEDURE pr_alterar_cargo_nrs(
    IN p_firebase_uid TEXT,
    IN p_id_cargo BIGINT,
    IN p_nrs JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_workspace_id BIGINT;
    v_item JSONB;
    v_indice BIGINT;
    v_nr INTEGER;
    v_ativo BOOLEAN;
    v_nrs_processadas INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
    IF NULLIF(BTRIM(p_firebase_uid), '') IS NULL
       OR p_id_cargo IS NULL
       OR p_nrs IS NULL THEN
        RAISE EXCEPTION 'Informe Firebase UID, ID do cargo e a lista de NRs.'
            USING ERRCODE = '22023';
    END IF;

    IF JSONB_TYPEOF(p_nrs) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'A lista de NRs deve ser um array JSON.'
            USING ERRCODE = '22023';
    END IF;

    SELECT un.workspace_id
    INTO v_workspace_id
    FROM usuario solicitante
    INNER JOIN unidade un
        ON un.id_unidade = solicitante.unidade_id
    WHERE solicitante.firebase_uid = p_firebase_uid
      AND solicitante.tipo IN ('GESTOR', 'GESTOR_WORKSPACE')
      AND solicitante.status = 'ATIVO';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Gestor ativo não encontrado para o Firebase UID informado.'
            USING ERRCODE = '42501';
    END IF;

    PERFORM 1
    FROM cargo
    WHERE id_cargo = p_id_cargo
      AND workspace_id = v_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cargo não encontrado no workspace do gestor.'
            USING ERRCODE = 'P0002';
    END IF;

    FOR v_item, v_indice IN
        SELECT elemento, posicao
        FROM JSONB_ARRAY_ELEMENTS(p_nrs) WITH ORDINALITY AS itens(elemento, posicao)
    LOOP
        IF JSONB_TYPEOF(v_item) IS DISTINCT FROM 'object' THEN
            RAISE EXCEPTION 'O item % deve ser um objeto JSON.', v_indice
                USING ERRCODE = '22023';
        END IF;

        IF JSONB_TYPEOF(v_item -> 'nr') IS DISTINCT FROM 'number'
           OR (v_item ->> 'nr') !~ '^[1-9][0-9]*$' THEN
            RAISE EXCEPTION 'O campo nr do item % deve ser um inteiro positivo.', v_indice
                USING ERRCODE = '22023';
        END IF;

        BEGIN
            v_nr := (v_item ->> 'nr')::INTEGER;
        EXCEPTION WHEN numeric_value_out_of_range THEN
            RAISE EXCEPTION 'O código NR do item % está fora do intervalo permitido.', v_indice
                USING ERRCODE = '22023';
        END;

        IF JSONB_TYPEOF(v_item -> 'ativo') IS DISTINCT FROM 'boolean' THEN
            RAISE EXCEPTION 'O campo ativo do item % deve ser true ou false.', v_indice
                USING ERRCODE = '22023';
        END IF;

        IF v_nr = ANY(v_nrs_processadas) THEN
            RAISE EXCEPTION 'A NR % aparece mais de uma vez na lista.', v_nr
                USING ERRCODE = '22023';
        END IF;
        v_nrs_processadas := ARRAY_APPEND(v_nrs_processadas, v_nr);

        IF NOT EXISTS (
            SELECT 1 FROM nr_catalogo WHERE codigo_nr = v_nr
        ) THEN
            RAISE EXCEPTION 'A NR % não existe no catálogo.', v_nr
                USING ERRCODE = '22023';
        END IF;

        v_ativo := (v_item ->> 'ativo')::BOOLEAN;

        IF v_ativo THEN
            INSERT INTO cargo_nr (cargo_id, nr_id)
            VALUES (p_id_cargo, v_nr)
            ON CONFLICT (cargo_id, nr_id) DO NOTHING;
        ELSE
            DELETE FROM cargo_nr
            WHERE cargo_id = p_id_cargo
              AND nr_id = v_nr;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON PROCEDURE pr_alterar_cargo_nrs(TEXT, BIGINT, JSONB) IS
'Atualiza as NRs associadas a um cargo. Exige um gestor ativo do mesmo workspace; cada item do array JSON liga a NR quando ativo é true e remove a ligação quando ativo é false. Valida formato, códigos existentes e duplicidades antes de concluir a chamada.';
