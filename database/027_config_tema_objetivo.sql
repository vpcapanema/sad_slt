-- SLT — Configuração Multicritério: cabeçalho do escopo da análise.
--
-- Executar após 026_config_portfolio_grupo_tipo.sql.
--
-- A definição do escopo passa a capturar, do geral para o específico:
--   tema      -> assunto/área da análise
--   objetivo  -> o que se quer decidir
--   nome      -> escopo (título) da análise (já existente)
--   descricao -> detalhamento (já existente)
-- Campos gerais de cabeçalho: valem para avulsa e portfólio.

BEGIN;

ALTER TABLE ahp.config_multicriterio_avulsa
    ADD COLUMN IF NOT EXISTS tema     TEXT,
    ADD COLUMN IF NOT EXISTS objetivo TEXT;

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS tema     TEXT,
    ADD COLUMN IF NOT EXISTS objetivo TEXT;

COMMENT ON COLUMN ahp.config_multicriterio_avulsa.tema IS
    'Tema/assunto da análise (cabeçalho do escopo)';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.objetivo IS
    'Objetivo da análise — o que se quer decidir (cabeçalho do escopo)';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.tema IS
    'Tema/assunto da análise (cabeçalho do escopo)';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.objetivo IS
    'Objetivo da análise — o que se quer decidir (cabeçalho do escopo)';

COMMIT;
