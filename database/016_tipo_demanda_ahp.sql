-- SLT — Tipo de demanda no AHP (config + hierarquização).
--
-- Executar após 015_colapso_demandas.sql (já existe demandas.dom_tipo_demanda).
-- A Configuração Multicritério de portfólio e a Hierarquização passam a saber
-- QUAL nível de demanda (plano/programa/projeto) está sendo hierarquizado.

BEGIN;

-- ===========================================================================
-- 1) Configuração Multicritério (portfólio) — vínculo ao tipo de demanda
-- ===========================================================================
ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS tipo_demanda_id SMALLINT NOT NULL DEFAULT 3
        REFERENCES demandas.dom_tipo_demanda (id);

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.tipo_demanda_id IS
    'Nível de demanda ao qual esta configuração se aplica (1 plano, 2 programa, 3 projeto)';

CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_tipo
    ON ahp.config_multicriterio_portfolio (tipo_demanda_id);

-- ===========================================================================
-- 2) Hierarquização — troca grupo_comparacao por tipo_demanda_id + grupo_id
-- ===========================================================================
ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ADD COLUMN IF NOT EXISTS tipo_demanda_id SMALLINT NOT NULL DEFAULT 3
        REFERENCES demandas.dom_tipo_demanda (id);

-- grupo_id: identificador do conjunto comparável (o "pai"):
--   plano -> diretoria_id; programa -> plano_id; projeto -> programa_id.
ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ADD COLUMN IF NOT EXISTS grupo_id VARCHAR(64);

-- Remove o antigo grupo_comparacao (e seu índice, em cascata)
DROP INDEX IF EXISTS hierarquizacao_demandas.idx_hier_portfolio_grupo;
ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    DROP COLUMN IF EXISTS grupo_comparacao;

COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.tipo_demanda_id IS
    'Nível de demanda hierarquizado nesta rodada (1 plano, 2 programa, 3 projeto)';
COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.grupo_id IS
    'Conjunto comparável (pai): diretoria (plano), plano (programa) ou programa (projeto)';

CREATE INDEX IF NOT EXISTS idx_hier_portfolio_tipo
    ON hierarquizacao_demandas.hierarquizacao_portfolio (tipo_demanda_id);
CREATE INDEX IF NOT EXISTS idx_hier_portfolio_grupo_id
    ON hierarquizacao_demandas.hierarquizacao_portfolio (grupo_id);

COMMIT;
