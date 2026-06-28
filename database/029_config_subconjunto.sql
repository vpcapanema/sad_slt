-- SLT — AHP: subconjunto do universo (portfólio) gravado como JSON único.
--
-- Em vez de colunas fixas (diretoria_id/plano_id/programa_id), o recorte do
-- universo escolhido na configuração passa a ser persistido num único campo
-- JSONB com toda a configuração dos campos selecionados (tipo_demanda + filtros).
-- As colunas antigas permanecem (não são mais populadas pelo endpoint).

BEGIN;

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS subconjunto JSONB;

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.subconjunto IS
    'Configuração do recorte do universo (JSON): filtros campo/valor selecionados.';

COMMIT;
