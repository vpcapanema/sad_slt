-- SLT — indicadores também para projetos
-- Executar conectado ao banco slt_db (após 012_schema_hierarquia_demandas.sql).
--
-- Antes: indicador pertencia a plano OU programa.
-- Agora: indicador pertence a exatamente um entre plano, programa OU projeto.

BEGIN;

ALTER TABLE demandas_aprovadas.indicadores
    ADD COLUMN IF NOT EXISTS projeto_id UUID
        REFERENCES demandas_aprovadas.projetos (id) ON DELETE CASCADE;

-- Recria a regra "exatamente um pai" incluindo projeto
ALTER TABLE demandas_aprovadas.indicadores
    DROP CONSTRAINT IF EXISTS ck_indicadores_um_pai;

ALTER TABLE demandas_aprovadas.indicadores
    ADD CONSTRAINT ck_indicadores_um_pai
        CHECK (num_nonnulls(plano_id, programa_id, projeto_id) = 1);

CREATE INDEX IF NOT EXISTS idx_indicadores_projeto
    ON demandas_aprovadas.indicadores (projeto_id);

COMMENT ON TABLE demandas_aprovadas.indicadores IS
    'Indicadores de plano, programa ou projeto (exatamente um pai); alimentam critérios/dados do AHP';

COMMIT;
