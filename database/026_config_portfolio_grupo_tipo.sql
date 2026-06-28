-- SLT — Configuração Multicritério (portfólio): troca grupo_comparacao por
-- colunas de refino do universo de demandas.
--
-- Executar após 025_outros_abrangencia_estado.sql.
--
-- O "grupo comparável" deixa de ser uma string livre (grupo_comparacao) e passa
-- a ser declarado pelo nível de demanda (tipo_demanda_id, já existente) somado a
-- filtros de refino que apontam para o conjunto da tabela correspondente:
--   plano    -> diretoria_id
--   programa -> plano_id
--   projeto  -> diretoria_id / plano_id / programa_id

BEGIN;

-- 1) Remove o antigo grupo_comparacao (string livre) e seu índice
DROP INDEX IF EXISTS ahp.idx_config_mc_portfolio_grupo;

ALTER TABLE ahp.config_multicriterio_portfolio
    DROP COLUMN IF EXISTS grupo_comparacao;

-- 2) Colunas dedicadas de refino do universo (nuláveis; obrigatoriedade no app)
ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS diretoria_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS plano_id     UUID REFERENCES demandas.plano (id),
    ADD COLUMN IF NOT EXISTS programa_id  UUID REFERENCES demandas.programa (id);

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.diretoria_id IS
    'Refino do universo: diretoria (catálogo institucional). Usado p/ plano e projeto';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.plano_id IS
    'Refino do universo: plano pai (demandas.plano). Usado p/ programa e projeto';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.programa_id IS
    'Refino do universo: programa pai (demandas.programa). Usado p/ projeto';

CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_diretoria
    ON ahp.config_multicriterio_portfolio (diretoria_id);
CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_plano
    ON ahp.config_multicriterio_portfolio (plano_id);
CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_programa
    ON ahp.config_multicriterio_portfolio (programa_id);

COMMIT;
