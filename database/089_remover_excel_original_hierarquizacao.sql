-- A matriz original pertence exclusivamente ao ambiente colaborativo.
BEGIN;

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    DROP COLUMN IF EXISTS arquivo_excel_matriz_criterios_premissas;

COMMIT;
