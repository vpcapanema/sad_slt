-- SLT — Vínculo institucional estratégico opcional em programa (plano pai nullable).
-- Executar após 018_representante_plano_programa.sql.
-- Projeto já possui programa_id nullable desde 014_cadastro_hierarquia.sql.

BEGIN;

ALTER TABLE demandas.programa
    ALTER COLUMN plano_id DROP NOT NULL;

COMMENT ON COLUMN demandas.programa.plano_id IS
    'Plano pai cadastrado; NULL quando o programa não possui vínculo institucional estratégico.';

COMMIT;
