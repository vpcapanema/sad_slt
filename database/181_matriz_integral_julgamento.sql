BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS matriz_integral boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION ahp.proteger_matriz_julgamento()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linhas jsonb;
BEGIN
    IF TG_OP = 'UPDATE' AND (NEW.matriz_id IS DISTINCT FROM OLD.matriz_id
       OR NEW.matriz_integral IS DISTINCT FROM OLD.matriz_integral) THEN
        RAISE EXCEPTION 'A matriz e o escopo do julgamento são imutáveis. Crie outro julgamento.';
    END IF;
    SELECT CASE WHEN NEW.matriz_integral THEN ahp.conteudo_matriz_comparavel(conteudo)->'linhas'
                ELSE ahp.criterios_fase3_matriz(conteudo) END INTO linhas
    FROM ahp.matriz_criterios_premissas WHERE id = NEW.matriz_id;
    IF linhas IS NULL OR jsonb_array_length(linhas) < 2 OR linhas IS DISTINCT FROM NEW.criterios
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.criterios) c WHERE c ? '_superficie_id') THEN
        RAISE EXCEPTION 'Os critérios do julgamento devem corresponder ao escopo original da matriz associada, com ao menos dois critérios.';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS julgamento_matriz_imutavel ON ahp.comparacao_colaborativa_ambiente;
CREATE TRIGGER julgamento_matriz_imutavel BEFORE INSERT OR UPDATE OF matriz_id, criterios, matriz_integral
    ON ahp.comparacao_colaborativa_ambiente FOR EACH ROW
    EXECUTE FUNCTION ahp.proteger_matriz_julgamento();

COMMIT;
