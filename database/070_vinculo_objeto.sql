-- SLT - Identificador explicito do objeto selecionado no vinculo institucional.
-- Executar apos 069_envio_cadastro_em_avaliacao.sql.

BEGIN;

ALTER TABLE demandas.programa
    ADD COLUMN IF NOT EXISTS vinculo_objeto_id UUID;

ALTER TABLE demandas.projeto
    ADD COLUMN IF NOT EXISTS vinculo_objeto_id UUID;

COMMENT ON COLUMN demandas.programa.vinculo_objeto_id IS
    'UUID do plano selecionado no campo Vinculo ao plano; NULL quando nao ha vinculo institucional';
COMMENT ON COLUMN demandas.projeto.vinculo_objeto_id IS
    'UUID do plano ou programa selecionado como objeto do vinculo institucional';

CREATE OR REPLACE FUNCTION demandas.fn_sync_vinculo_objeto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_TABLE_NAME = 'programa' THEN
        NEW.vinculo_objeto_id := CASE
            WHEN NEW.vinculo_institucional THEN NEW.plano_id
            ELSE NULL
        END;
        RETURN NEW;
    END IF;

    IF NOT NEW.vinculo_institucional THEN
        NEW.vinculo_objeto_id := NULL;
    ELSIF NEW.vinculo_tipo = 'programa' THEN
        NEW.vinculo_objeto_id := NEW.programa_id;
    ELSIF NEW.vinculo_tipo = 'plano' THEN
        SELECT plano.id
          INTO NEW.vinculo_objeto_id
          FROM demandas.plano
         WHERE plano.codigo = NEW.plano_id;
    ELSE
        NEW.vinculo_objeto_id := NULL;
    END IF;

    RETURN NEW;
END;
$$;

UPDATE demandas.programa
   SET vinculo_objeto_id = CASE
       WHEN vinculo_institucional THEN plano_id
       ELSE NULL
   END;

UPDATE demandas.projeto projeto
   SET vinculo_objeto_id = CASE
       WHEN NOT projeto.vinculo_institucional THEN NULL
       WHEN projeto.vinculo_tipo = 'programa' THEN projeto.programa_id
       WHEN projeto.vinculo_tipo = 'plano' THEN (
           SELECT plano.id
             FROM demandas.plano
            WHERE plano.codigo = projeto.plano_id
       )
       ELSE NULL
   END;

ALTER TABLE demandas.programa
    DROP CONSTRAINT IF EXISTS ck_programa_vinculo_objeto;
ALTER TABLE demandas.programa
    ADD CONSTRAINT ck_programa_vinculo_objeto CHECK (
        (vinculo_institucional AND vinculo_objeto_id IS NOT NULL)
        OR (NOT vinculo_institucional AND vinculo_objeto_id IS NULL)
    );

ALTER TABLE demandas.projeto
    DROP CONSTRAINT IF EXISTS ck_projeto_vinculo_objeto;
ALTER TABLE demandas.projeto
    ADD CONSTRAINT ck_projeto_vinculo_objeto CHECK (
        (vinculo_institucional AND vinculo_objeto_id IS NOT NULL)
        OR (NOT vinculo_institucional AND vinculo_objeto_id IS NULL)
    );

DROP TRIGGER IF EXISTS trg_programa_sync_vinculo_objeto ON demandas.programa;
CREATE TRIGGER trg_programa_sync_vinculo_objeto
    BEFORE INSERT OR UPDATE OF vinculo_institucional, plano_id, vinculo_objeto_id
    ON demandas.programa
    FOR EACH ROW EXECUTE FUNCTION demandas.fn_sync_vinculo_objeto();

DROP TRIGGER IF EXISTS trg_projeto_sync_vinculo_objeto ON demandas.projeto;
CREATE TRIGGER trg_projeto_sync_vinculo_objeto
    BEFORE INSERT OR UPDATE OF vinculo_institucional, vinculo_tipo, plano_id, programa_id, vinculo_objeto_id
    ON demandas.projeto
    FOR EACH ROW EXECUTE FUNCTION demandas.fn_sync_vinculo_objeto();

CREATE INDEX IF NOT EXISTS idx_programa_vinculo_objeto
    ON demandas.programa (vinculo_objeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_vinculo_objeto
    ON demandas.projeto (vinculo_objeto_id);

COMMIT;