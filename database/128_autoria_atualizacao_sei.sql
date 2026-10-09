-- Autoria da atualização do acervo SEI e da criação de novas demandas SEI.
BEGIN;
UPDATE demandas.plano SET atualizado_por='f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid
 WHERE codigo LIKE '%-SEI-%' AND atualizado_por IS DISTINCT FROM 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
UPDATE demandas.programa SET atualizado_por='f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid
 WHERE codigo LIKE '%-SEI-%' AND atualizado_por IS DISTINCT FROM 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
UPDATE demandas.projeto SET atualizado_por='f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid
 WHERE codigo LIKE '%-SEI-%' AND atualizado_por IS DISTINCT FROM 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
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
    IF TG_OP = 'INSERT' AND NEW.codigo LIKE '%-SEI-%' THEN
        NEW.criado_por := 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
        NEW.atualizado_por := 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
    END IF;
    RETURN NEW;
END;
$$;
COMMIT;
