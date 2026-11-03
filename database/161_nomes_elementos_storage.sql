BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS geoprocessamento.nome_storage (
    escopo text NOT NULL,
    identidade text NOT NULL,
    nome text NOT NULL,
    PRIMARY KEY (escopo, identidade),
    CHECK (nome <> '' AND nome NOT IN ('.','..') AND nome !~ '[/\\[:cntrl:]]')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_nome_storage_legivel
    ON geoprocessamento.nome_storage (lower(escopo), lower(nome));
GRANT SELECT,INSERT,UPDATE ON geoprocessamento.nome_storage TO slt_user;
ALTER TABLE geoprocessamento.arquivo_resultado
    DROP CONSTRAINT ck_arquivo_resultado_destino;
ALTER TABLE geoprocessamento.arquivo_resultado
    ADD CONSTRAINT ck_arquivo_resultado_destino CHECK (
        (caminho ~ '^saidas-geoespaciais/(execucoes/[0-9a-f-]{36}/(camadas|relatorios|pacotes)|((analises-avulsas/[a-z0-9_-]+|hierarquizacoes/[^/]+/(fase-[123]|consolidado)|exportacoes)/[A-Za-z0-9_]+))/[^/]+$'
         OR caminho LIKE 'data/geoespacial/outputs/%')
        AND strpos(caminho, '..') = 0 AND strpos(caminho, chr(92)) = 0
    );
COMMENT ON CONSTRAINT ck_arquivo_resultado_destino ON geoprocessamento.arquivo_resultado
    IS '161: nomes de elementos; identidades internas e destinos legados preservados';
COMMIT;
