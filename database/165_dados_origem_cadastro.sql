-- Linha original de importacao, separada dos atributos operacionais.
BEGIN;
ALTER TABLE demandas.plano ADD COLUMN IF NOT EXISTS dados_origem JSONB;
ALTER TABLE demandas.programa ADD COLUMN IF NOT EXISTS dados_origem JSONB;
ALTER TABLE demandas.projeto ADD COLUMN IF NOT EXISTS dados_origem JSONB;
COMMIT;
