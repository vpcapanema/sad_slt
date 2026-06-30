-- Artefatos JSON completos gerados automaticamente em cada marco do fluxo AHP.
--
-- arquivo_config_fase1    : gerado ao criar a configuração (escopo + universo).
-- arquivo_config_fase2    : gerado ao salvar a matriz pareada (Etapa 5).
--                           Inclui todos os campos da Fase 1.
-- arquivo_config_homologado: gerado ao homologar (Etapa 6).
--                           Inclui todos os campos da Fase 2 + pesos + métricas.
--
-- Estes artefatos são a fonte de consumo dos módulos seguintes; dispensam
-- a reconstrução de payloads no cliente.

ALTER TABLE ahp.config_multicriterio_avulsa
    ADD COLUMN IF NOT EXISTS arquivo_config_fase1      JSONB,
    ADD COLUMN IF NOT EXISTS arquivo_config_fase2      JSONB,
    ADD COLUMN IF NOT EXISTS arquivo_config_homologado JSONB;

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS arquivo_config_fase1      JSONB,
    ADD COLUMN IF NOT EXISTS arquivo_config_fase2      JSONB,
    ADD COLUMN IF NOT EXISTS arquivo_config_homologado JSONB;

COMMENT ON COLUMN ahp.config_multicriterio_avulsa.arquivo_config_fase1 IS
    'Artefato JSON da Fase 1: escopo, objetivo, universo de objetos e metadados de criação.';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.arquivo_config_fase2 IS
    'Artefato JSON da Fase 2: campos da Fase 1 + critérios, premissas e matriz de comparação pareada.';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.arquivo_config_homologado IS
    'Artefato JSON homologado: campos da Fase 2 + pesos calculados, métricas de consistência e registro de homologação.';

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.arquivo_config_fase1 IS
    'Artefato JSON da Fase 1: escopo, objetivo, universo de objetos e metadados de criação.';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.arquivo_config_fase2 IS
    'Artefato JSON da Fase 2: campos da Fase 1 + critérios, premissas e matriz de comparação pareada.';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.arquivo_config_homologado IS
    'Artefato JSON homologado: campos da Fase 2 + pesos calculados, métricas de consistência e registro de homologação.';
