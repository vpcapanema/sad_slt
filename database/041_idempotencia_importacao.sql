-- Uma mesma versão binária de uma fonte externa só pode ser importada uma vez.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gp_importada_hash_arquivo
    ON geoprocessamento.camada_importada(hash_arquivo)
    WHERE hash_arquivo IS NOT NULL;

COMMENT ON COLUMN geoprocessamento.camada_importada.hash_arquivo IS
    'SHA-256 do arquivo externo; garante idempotência da importação';

COMMIT;
