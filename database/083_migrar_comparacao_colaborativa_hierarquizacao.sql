-- Migrate collaborative AHP rounds from configuration records to hierarchies.
BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS hierarquizacao_id UUID,
    ADD COLUMN IF NOT EXISTS hierarquizacao_codigo VARCHAR(64);

-- Preferred provenance introduced by migration 081.
UPDATE ahp.comparacao_colaborativa_ambiente a
   SET hierarquizacao_id = c.hierarquizacao_id
  FROM ahp.config_multicriterio_portfolio c
 WHERE a.hierarquizacao_id IS NULL
   AND a.config_portfolio_id = c.id
   AND c.hierarquizacao_id IS NOT NULL;

-- Compatibility for portfolios whose hierarchy already references config_id.
UPDATE ahp.comparacao_colaborativa_ambiente a
   SET hierarquizacao_id = h.id
  FROM hierarquizacao_demandas.hierarquizacao_portfolio h
 WHERE a.hierarquizacao_id IS NULL
   AND a.config_portfolio_id = h.config_id;

UPDATE ahp.comparacao_colaborativa_ambiente a
   SET hierarquizacao_codigo = h.codigo
  FROM hierarquizacao_demandas.hierarquizacao_portfolio h
 WHERE a.hierarquizacao_id = h.id
   AND a.hierarquizacao_codigo IS DISTINCT FROM h.codigo;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM ahp.comparacao_colaborativa_ambiente
         WHERE hierarquizacao_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Existem ambientes colaborativos sem hierarquizacao correspondente; regularize a procedencia antes de concluir a migration 083.';
    END IF;
END $$;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ALTER COLUMN hierarquizacao_id SET NOT NULL,
    ALTER COLUMN hierarquizacao_codigo SET NOT NULL,
    DROP CONSTRAINT IF EXISTS ck_collab_ambiente_config_ref,
    DROP COLUMN IF EXISTS config_avulsa_id,
    DROP COLUMN IF EXISTS config_portfolio_id,
    DROP COLUMN IF EXISTS config_tipo,
    DROP COLUMN IF EXISTS config_codigo;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'fk_collab_ambiente_hierarquizacao'
           AND conrelid = 'ahp.comparacao_colaborativa_ambiente'::regclass
    ) THEN
        ALTER TABLE ahp.comparacao_colaborativa_ambiente
            ADD CONSTRAINT fk_collab_ambiente_hierarquizacao
            FOREIGN KEY (hierarquizacao_id)
            REFERENCES hierarquizacao_demandas.hierarquizacao_portfolio(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DROP INDEX IF EXISTS ahp.idx_collab_ambiente_config;
DROP INDEX IF EXISTS ahp.idx_collab_ambiente_config_avulsa;
DROP INDEX IF EXISTS ahp.idx_collab_ambiente_config_portfolio;

CREATE INDEX IF NOT EXISTS idx_collab_ambiente_hierarquizacao
    ON ahp.comparacao_colaborativa_ambiente
       (hierarquizacao_id, criado_em DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_collab_ambiente_hierarquizacao_ativa
    ON ahp.comparacao_colaborativa_ambiente (hierarquizacao_id)
    WHERE status = 'ativa';

COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.hierarquizacao_id IS
    'Hierarquizacao proprietaria da rodada colaborativa AHP.';
COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.hierarquizacao_codigo IS
    'Snapshot do codigo da hierarquizacao no momento de abertura da rodada.';

COMMIT;