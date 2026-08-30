CREATE OR REPLACE PROCEDURE ler_json_nrs(p_json_data text DEFAULT NULL)
LANGUAGE plpgsql
AS $$
DECLARE
    v_json jsonb;
BEGIN
    BEGIN
        v_json := p_json_data::jsonb;
    EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'O parâmetro enviado não é um JSON válido.';
    END;

    IF v_json IS NULL THEN
        RAISE EXCEPTION 'O parâmetro enviado não é um JSON válido.';
    END IF;

    INSERT INTO nr_catalogo (codigo_nr, titulo, revogada, tempo_reciclagem_meses)
    SELECT
        (elem::jsonb ->> 'id')::integer                       AS codigo_nr,
        (elem::jsonb ->> 'nome')::varchar                     AS titulo,
        (elem::jsonb ->> 'revogada')::boolean                 AS revogada,
        (elem::jsonb ->> 'tempo_reciclagem_meses')::integer   AS tempo_reciclagem_meses
    FROM jsonb_array_elements_text(v_json) AS elem
    ON CONFLICT (codigo_nr)
    DO UPDATE SET
        titulo                 = EXCLUDED.titulo,
        revogada               = EXCLUDED.revogada,
        tempo_reciclagem_meses = EXCLUDED.tempo_reciclagem_meses;

END;
$$;