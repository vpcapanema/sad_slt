-- Representante institucional independente da instituicao interessada.
BEGIN;
ALTER TABLE demandas.projeto
    ADD COLUMN IF NOT EXISTS representante_instituicao_id UUID,
    ALTER COLUMN sigma_pessoa_id DROP NOT NULL;
ALTER TABLE demandas.plano
    ADD COLUMN IF NOT EXISTS representante_instituicao_id UUID,
    ALTER COLUMN sigma_pessoa_id DROP NOT NULL;
ALTER TABLE demandas.programa
    ADD COLUMN IF NOT EXISTS representante_instituicao_id UUID,
    ALTER COLUMN sigma_pessoa_id DROP NOT NULL;
COMMIT;
