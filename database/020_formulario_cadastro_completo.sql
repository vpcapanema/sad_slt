-- SLT — Colunas espelhando todos os campos dos formulários de cadastro (plano/programa/projeto).
-- Executar após 019_vinculo_institucional_opcional.sql (schema demandas).

BEGIN;

-- ---------------------------------------------------------------------------
-- Plano: instituição interessada (SIGMA) — espelho de demandas.projeto
-- ---------------------------------------------------------------------------
ALTER TABLE demandas.plano
    ADD COLUMN IF NOT EXISTS sigma_instituicao_id       UUID,
    ADD COLUMN IF NOT EXISTS instituicao_nome             TEXT,
    ADD COLUMN IF NOT EXISTS instituicao_razao_social     TEXT,
    ADD COLUMN IF NOT EXISTS instituicao_nome_fantasia    TEXT,
    ADD COLUMN IF NOT EXISTS instituicao_cnpj             VARCHAR(18);

COMMENT ON COLUMN demandas.plano.sigma_instituicao_id IS
    'UUID da instituição interessada no SIGMA (cadastro.instituicao.id)';
COMMENT ON COLUMN demandas.plano.instituicao_nome IS
    'Rótulo exibido no formulário no momento do cadastro';

CREATE INDEX IF NOT EXISTS idx_plano_sigma_instituicao
    ON demandas.plano (sigma_instituicao_id);

-- ---------------------------------------------------------------------------
-- Programa: instituição + vínculo institucional (pergunta sim/não do formulário)
-- ---------------------------------------------------------------------------
ALTER TABLE demandas.programa
    ADD COLUMN IF NOT EXISTS sigma_instituicao_id       UUID,
    ADD COLUMN IF NOT EXISTS instituicao_nome             TEXT,
    ADD COLUMN IF NOT EXISTS instituicao_razao_social     TEXT,
    ADD COLUMN IF NOT EXISTS instituicao_nome_fantasia    TEXT,
    ADD COLUMN IF NOT EXISTS instituicao_cnpj             VARCHAR(18),
    ADD COLUMN IF NOT EXISTS vinculo_institucional        BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN demandas.programa.vinculo_institucional IS
    'TRUE quando o formulário indica vínculo a um plano cadastrado (pg-vinculo = sim)';

CREATE INDEX IF NOT EXISTS idx_programa_sigma_instituicao
    ON demandas.programa (sigma_instituicao_id);

-- ---------------------------------------------------------------------------
-- Projeto: vínculo institucional explícito (pergunta sim/não + tipo programa/plano)
-- ---------------------------------------------------------------------------
ALTER TABLE demandas.projeto
    ADD COLUMN IF NOT EXISTS vinculo_institucional        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS vinculo_tipo                  VARCHAR(20);

ALTER TABLE demandas.projeto
    DROP CONSTRAINT IF EXISTS ck_projeto_vinculo_tipo;

ALTER TABLE demandas.projeto
    ADD CONSTRAINT ck_projeto_vinculo_tipo
        CHECK (vinculo_tipo IS NULL OR vinculo_tipo IN ('programa', 'plano'));

COMMENT ON COLUMN demandas.projeto.vinculo_institucional IS
    'TRUE quando o formulário indica vínculo a programa ou plano cadastrado';
COMMENT ON COLUMN demandas.projeto.vinculo_tipo IS
    'Tipo de vínculo selecionado: programa cadastrado ou plano direto';

COMMIT;
