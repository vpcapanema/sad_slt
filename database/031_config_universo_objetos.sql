-- SLT — AHP: snapshot do conjunto confirmado de objetos (universo da análise).
--
-- Executar conectado ao banco slt_db (após 029_config_subconjunto.sql).
--
-- O "Confirmar universo de análise" (módulo de configuração) congela o conjunto
-- de demandas que será hierarquizado. Esse snapshot é gravado aqui, na própria
-- linha da configuração de portfólio, separado do `subconjunto` (que guarda a
-- DEFINIÇÃO dos filtros). Enquanto `subconjunto` é a "receita", `universo_objetos`
-- é o "resultado congelado" no momento da confirmação.

BEGIN;

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS universo_objetos JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.universo_objetos IS
    'Snapshot do conjunto confirmado de objetos (congelado ao confirmar o universo): '
    '[{id, codigo, nome, tipo_demanda}]. Alvo da hierarquização no módulo seguinte.';

CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_universo_gin
    ON ahp.config_multicriterio_portfolio USING GIN (universo_objetos);

COMMIT;
