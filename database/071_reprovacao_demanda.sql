-- SLT - Metadados obrigatorios da decisao de reprovar uma demanda.
-- Executar apos 070_vinculo_objeto.sql.

BEGIN;

ALTER TABLE demandas.plano
    ADD COLUMN IF NOT EXISTS reprovado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reprovado_por UUID,
    ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT;

ALTER TABLE demandas.programa
    ADD COLUMN IF NOT EXISTS reprovado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reprovado_por UUID,
    ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT;

ALTER TABLE demandas.projeto
    ADD COLUMN IF NOT EXISTS reprovado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reprovado_por UUID,
    ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT;

COMMENT ON COLUMN demandas.plano.motivo_reprovacao IS
    'Justificativa obrigatoria registrada na reprovação da demanda';
COMMENT ON COLUMN demandas.programa.motivo_reprovacao IS
    'Justificativa obrigatoria registrada na reprovação da demanda';
COMMENT ON COLUMN demandas.projeto.motivo_reprovacao IS
    'Justificativa obrigatoria registrada na reprovação da demanda';

UPDATE demandas.dom_status_demanda_transicao
     SET via_aprovar = TRUE
 WHERE status_destino = 'analise_reprovada';

ALTER TABLE demandas.plano
    DROP CONSTRAINT IF EXISTS ck_plano_reprovacao_justificada;
ALTER TABLE demandas.plano
    ADD CONSTRAINT ck_plano_reprovacao_justificada CHECK (
        status <> 'analise_reprovada'
        OR NULLIF(BTRIM(motivo_reprovacao), '') IS NOT NULL
    );

ALTER TABLE demandas.programa
    DROP CONSTRAINT IF EXISTS ck_programa_reprovacao_justificada;
ALTER TABLE demandas.programa
    ADD CONSTRAINT ck_programa_reprovacao_justificada CHECK (
        status <> 'analise_reprovada'
        OR NULLIF(BTRIM(motivo_reprovacao), '') IS NOT NULL
    );

ALTER TABLE demandas.projeto
    DROP CONSTRAINT IF EXISTS ck_projeto_reprovacao_justificada;
ALTER TABLE demandas.projeto
    ADD CONSTRAINT ck_projeto_reprovacao_justificada CHECK (
        status <> 'analise_reprovada'
        OR NULLIF(BTRIM(motivo_reprovacao), '') IS NOT NULL
    );

COMMIT;