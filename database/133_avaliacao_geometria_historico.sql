-- Avaliação informativa da geometria e origem explicitamente desconhecida
-- para snapshots de geometrias legadas sem registro de procedência.
BEGIN;

ALTER TABLE demandas.analise_demanda
    ADD COLUMN IF NOT EXISTS avaliacao_geometria JSONB,
    DROP CONSTRAINT IF EXISTS ck_analise_demanda_avaliacao_geometria_objeto,
    ADD CONSTRAINT ck_analise_demanda_avaliacao_geometria_objeto
        CHECK (
            avaliacao_geometria IS NULL
            OR jsonb_typeof(avaliacao_geometria) = 'object'
        );

ALTER TABLE demandas.projeto_geometria_historico
    DROP CONSTRAINT IF EXISTS ck_projeto_geometria_historico_origem,
    ADD CONSTRAINT ck_projeto_geometria_historico_origem
        CHECK (origem IN ('desenho', 'upload', 'coordenadas', 'nao_identificada'));

COMMENT ON COLUMN demandas.analise_demanda.avaliacao_geometria IS
    'Respostas e observação da avaliação geométrica informativa; não integra o resultado de admissibilidade.';
COMMENT ON CONSTRAINT ck_projeto_geometria_historico_origem
    ON demandas.projeto_geometria_historico IS
    '133: snapshots legados sem evidência da origem usam nao_identificada.';

COMMIT;
