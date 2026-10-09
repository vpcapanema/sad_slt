-- Preserva o acervo histórico e remove a substituição de autoria nas novas demandas.
BEGIN;
CREATE OR REPLACE FUNCTION demandas.fn_exigir_autor_criacao()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.criado_por IS NULL OR NEW.criado_por = '00000000-0000-0000-0000-000000000000'::uuid THEN
        IF TG_OP = 'INSERT' THEN
            RAISE EXCEPTION 'Demanda não pode ser cadastrada sem criado_por' USING ERRCODE = '23514';
        ELSIF OLD.criado_por IS NOT NULL THEN
            RAISE EXCEPTION 'Autoria de criação não pode ser removida' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'INSERT' AND (NEW.atualizado_por IS NULL
        OR NEW.atualizado_por = '00000000-0000-0000-0000-000000000000'::uuid
        OR NEW.atualizado_por IS DISTINCT FROM NEW.criado_por) THEN
        RAISE EXCEPTION 'Criação exige criado_por e atualizado_por do mesmo usuário da sessão' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION demandas.fn_exigir_autor_criacao() IS '129: autoria da sessão ativa na criação';
COMMIT;
