-- Estrutura auditável da nova análise de contribuições recebidas via SEI.
BEGIN;

ALTER TABLE integracoes.sei_documento
    ADD COLUMN IF NOT EXISTS tipo_demanda VARCHAR(10) NOT NULL DEFAULT 'projeto',
    ADD COLUMN IF NOT EXISTS analise JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE integracoes.sei_documento
    DROP CONSTRAINT IF EXISTS sei_documento_tipo_demanda_check;

ALTER TABLE integracoes.sei_documento
    ADD CONSTRAINT sei_documento_tipo_demanda_check
    CHECK (tipo_demanda IN ('plano', 'programa', 'projeto'));

COMMENT ON COLUMN integracoes.sei_documento.tipo_demanda IS
    'Tipo escolhido pelo analista antes do processamento; projeto é o padrão.';
COMMENT ON COLUMN integracoes.sei_documento.analise IS
    'Resultado estruturado por página, campo, evidência, confiança e conflito.';

COMMIT;
