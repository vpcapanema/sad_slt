-- Decisões e mudanças de situação têm auditoria distinta da edição cadastral.
BEGIN;
CREATE OR REPLACE FUNCTION demandas.fn_touch_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    campos_decisao text[] := ARRAY['status','status_atualizado_em','aprovado_por','aprovado_em',
        'motivo_aprovacao','reprovado_por','reprovado_em','motivo_reprovacao','atualizado_em'];
BEGIN
    IF (to_jsonb(NEW) - campos_decisao) IS DISTINCT FROM (to_jsonb(OLD) - campos_decisao) THEN
        NEW.atualizado_em := CURRENT_TIMESTAMP;
    ELSE
        NEW.atualizado_em := OLD.atualizado_em;
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_atualizado_em := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION demandas.fn_touch_atualizado_em() IS '130: decisões separadas de edição cadastral';
COMMIT;
