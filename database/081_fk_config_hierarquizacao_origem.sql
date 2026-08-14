-- Relação de procedência da configuração AHP.
-- A FK é feita pelo UUID do registro (não pelo BYTEA do arquivo), pois
-- arquivos binários não devem ser chaves referenciais. O Excel continua
-- copiado em arquivo_excel_matriz_criterios_premissas nas duas tabelas.
BEGIN;

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS hierarquizacao_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_config_portfolio_hierarquizacao_origem'
    ) THEN
        ALTER TABLE ahp.config_multicriterio_portfolio
            ADD CONSTRAINT fk_config_portfolio_hierarquizacao_origem
            FOREIGN KEY (hierarquizacao_id)
            REFERENCES hierarquizacao_demandas.hierarquizacao_portfolio(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_config_portfolio_hierarquizacao_id
    ON ahp.config_multicriterio_portfolio (hierarquizacao_id);

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.hierarquizacao_id IS
    'Registro de hierarquização de origem do qual critérios, premissas e Excel foram copiados.';

COMMIT;
