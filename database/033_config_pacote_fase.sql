-- Identificador do conjunto de parâmetros produzido em cada fase do fluxo AHP.
-- fase_1: escopo, objeto(s) e cadastro inicial (saída da Fase 1)
-- fase_2: cadastro conceitual + matriz pareada salva (saída da Fase 2)

ALTER TABLE ahp.config_multicriterio_avulsa
  ADD COLUMN IF NOT EXISTS pacote_fase VARCHAR(16) NOT NULL DEFAULT 'fase_1';

ALTER TABLE ahp.config_multicriterio_portfolio
  ADD COLUMN IF NOT EXISTS pacote_fase VARCHAR(16) NOT NULL DEFAULT 'fase_1';

ALTER TABLE ahp.config_multicriterio_avulsa
  DROP CONSTRAINT IF EXISTS chk_config_mc_avulsa_pacote_fase;
ALTER TABLE ahp.config_multicriterio_avulsa
  ADD CONSTRAINT chk_config_mc_avulsa_pacote_fase
  CHECK (pacote_fase IN ('fase_1', 'fase_2'));

ALTER TABLE ahp.config_multicriterio_portfolio
  DROP CONSTRAINT IF EXISTS chk_config_mc_portfolio_pacote_fase;
ALTER TABLE ahp.config_multicriterio_portfolio
  ADD CONSTRAINT chk_config_mc_portfolio_pacote_fase
  CHECK (pacote_fase IN ('fase_1', 'fase_2'));

-- Retrocompatível: matriz pareada gravada implica pacote da Fase 2.
UPDATE ahp.config_multicriterio_avulsa
SET pacote_fase = 'fase_2'
WHERE jsonb_array_length(COALESCE(matriz_comparacao, '[]'::jsonb)) > 0;

UPDATE ahp.config_multicriterio_portfolio
SET pacote_fase = 'fase_2'
WHERE jsonb_array_length(COALESCE(matriz_comparacao, '[]'::jsonb)) > 0;

COMMENT ON COLUMN ahp.config_multicriterio_avulsa.pacote_fase IS
  'Identificador do pacote de parâmetros: fase_1 (Fase 1) ou fase_2 (Fase 2 concluída).';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.pacote_fase IS
  'Identificador do pacote de parâmetros: fase_1 (Fase 1) ou fase_2 (Fase 2 concluída).';
