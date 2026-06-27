-- SLT — Representante legal (pessoa física SIGMA) em plano e programa.
-- Executar após 017_seed_planos_estrategicos.sql (schema demandas).

BEGIN;

ALTER TABLE demandas.plano
    ADD COLUMN IF NOT EXISTS sigma_pessoa_id       UUID,
    ADD COLUMN IF NOT EXISTS representante_nome      TEXT,
    ADD COLUMN IF NOT EXISTS representante_email     TEXT,
    ADD COLUMN IF NOT EXISTS representante_telefone  TEXT;

ALTER TABLE demandas.programa
    ADD COLUMN IF NOT EXISTS sigma_pessoa_id       UUID,
    ADD COLUMN IF NOT EXISTS representante_nome      TEXT,
    ADD COLUMN IF NOT EXISTS representante_email     TEXT,
    ADD COLUMN IF NOT EXISTS representante_telefone  TEXT;

COMMENT ON COLUMN demandas.plano.sigma_pessoa_id IS
    'UUID do representante legal no SIGMA (cadastro.pessoa.id)';
COMMENT ON COLUMN demandas.programa.sigma_pessoa_id IS
    'UUID do representante legal no SIGMA (cadastro.pessoa.id)';

CREATE INDEX IF NOT EXISTS idx_plano_sigma_pessoa ON demandas.plano (sigma_pessoa_id);
CREATE INDEX IF NOT EXISTS idx_programa_sigma_pessoa ON demandas.programa (sigma_pessoa_id);

COMMIT;
