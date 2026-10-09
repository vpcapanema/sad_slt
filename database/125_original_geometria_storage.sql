-- Compatível com a aplicação anterior: originais novos no Storage, legados preservados.
BEGIN;
ALTER TABLE demandas.projeto_geometria_historico
    ADD COLUMN IF NOT EXISTS storage_caminho TEXT,
    ADD COLUMN IF NOT EXISTS processamento JSONB;
COMMIT;
