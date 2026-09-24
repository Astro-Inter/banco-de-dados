CREATE OR REPLACE FUNCTION fn_ativar_colaborador_apos_firebase_uid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.status := 'ATIVO';
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_ativar_colaborador_apos_firebase_uid() IS
'Ativa o colaborador pré-cadastrado quando seu firebase_uid passa de nulo para preenchido.';
