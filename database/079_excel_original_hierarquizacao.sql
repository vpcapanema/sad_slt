-- Preserva o XLSX original associado à matriz da hierarquização.
BEGIN;

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ADD COLUMN IF NOT EXISTS arquivo_excel_matriz_criterios_premissas BYTEA;

COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.arquivo_excel_matriz_criterios_premissas IS
    'Conteúdo binário do arquivo Excel original da matriz de critérios e premissas.';

COMMIT;
