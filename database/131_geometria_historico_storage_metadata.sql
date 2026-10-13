-- Novos originais de geometria ficam exclusivamente no Storage.
-- A coluna BYTEA permanece nullable para compatibilidade de leitura histórica,
-- mas nenhum registro pode continuar armazenando conteúdo binário no banco.
BEGIN;

ALTER TABLE demandas.projeto_geometria_historico
    DROP CONSTRAINT IF EXISTS ck_projeto_geometria_historico_arquivo_completo,
    DROP CONSTRAINT IF EXISTS ck_projeto_geometria_historico_arquivo_por_origem;

ALTER TABLE demandas.projeto_geometria_historico
    ADD CONSTRAINT ck_projeto_geometria_historico_arquivo_completo
        CHECK (
            num_nonnulls(nome_arquivo, extensao, tipo_mime, tamanho_bytes, sha256) IN (0, 5)
            AND conteudo_binario IS NULL
        ),
    ADD CONSTRAINT ck_projeto_geometria_historico_arquivo_por_origem
        CHECK (
            (
                origem = 'upload'
                AND storage_caminho IS NOT NULL
                AND length(btrim(storage_caminho)) > 0
                AND num_nonnulls(
                    nome_arquivo, extensao, tipo_mime, tamanho_bytes, sha256, storage_caminho
                ) = 6
            )
            OR (
                origem <> 'upload'
                AND num_nonnulls(
                    nome_arquivo, extensao, tipo_mime, tamanho_bytes, sha256, storage_caminho
                ) = 0
            )
        );

ALTER TABLE demandas.projeto_geometria_historico
    VALIDATE CONSTRAINT ck_projeto_geometria_historico_arquivo_completo,
    VALIDATE CONSTRAINT ck_projeto_geometria_historico_arquivo_por_origem;

COMMENT ON CONSTRAINT ck_projeto_geometria_historico_arquivo_completo
    ON demandas.projeto_geometria_historico IS
    '131: metadados completos; novos arquivos não são armazenados em BYTEA';
COMMENT ON CONSTRAINT ck_projeto_geometria_historico_arquivo_por_origem
    ON demandas.projeto_geometria_historico IS
    '131: uploads usam exclusivamente storage_caminho; demais origens não têm arquivo';

COMMIT;
