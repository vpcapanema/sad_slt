-- Alertas de coerência conceitual (validação inteligente AHP).
-- Gravados na Etapa 5 ao salvar a configuração da Fase 2 (matriz consistente).

ALTER TABLE ahp.config_multicriterio_avulsa
    ADD COLUMN IF NOT EXISTS alertas_conceituais JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS alertas_conceituais JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ahp.config_multicriterio_avulsa.alertas_conceituais IS
    'Alertas de divergência conceitual confirmados pelo gestor (catálogo PLI-SP vs config).';

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.alertas_conceituais IS
    'Alertas de divergência conceitual confirmados pelo gestor (catálogo PLI-SP vs config).';
