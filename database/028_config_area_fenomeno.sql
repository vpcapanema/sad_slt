-- SLT — Configuração Multicritério: completa o cabeçalho do escopo.
--
-- Executar após 027_config_tema_objetivo.sql.
--
-- Decomposição do escopo (do geral ao específico), conforme metodologia:
--   area_conhecimento -> área/campo do conhecimento (ex.: logística e transporte)
--   tema              -> assunto dentro da área (ex.: execução de projetos)  [já existe]
--   fenomeno          -> objeto de estudo medido pelos critérios (ex.: favorabilidade)
--   objetivo          -> o que a comparação deve produzir  [já existe]
--   nome              -> escopo (título) da análise  [já existe]
--   descricao         -> detalhamento  [já existe]

BEGIN;

ALTER TABLE ahp.config_multicriterio_avulsa
    ADD COLUMN IF NOT EXISTS area_conhecimento TEXT,
    ADD COLUMN IF NOT EXISTS fenomeno          TEXT;

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS area_conhecimento TEXT,
    ADD COLUMN IF NOT EXISTS fenomeno          TEXT;

COMMENT ON COLUMN ahp.config_multicriterio_avulsa.area_conhecimento IS
    'Área/campo do conhecimento em que a comparação se insere';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.fenomeno IS
    'Fenômeno (objeto de estudo) avaliado pelos critérios — ex.: favorabilidade';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.area_conhecimento IS
    'Área/campo do conhecimento em que a comparação se insere';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.fenomeno IS
    'Fenômeno (objeto de estudo) avaliado pelos critérios — ex.: favorabilidade';

COMMIT;
