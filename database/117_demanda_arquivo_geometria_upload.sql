-- Guarda os arquivos vetoriais originais enviados com geometrias de demandas.
-- O modelo aceita projeto, plano ou programa; a integração de upload desta
-- etapa ativa o vínculo com projeto e deixa os outros dois prontos para uso.
BEGIN;

CREATE TABLE IF NOT EXISTS demandas.demanda_arquivo_geometria_upload (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id          UUID REFERENCES demandas.projeto(id) ON DELETE CASCADE,
    plano_id            UUID REFERENCES demandas.plano(id) ON DELETE CASCADE,
    programa_id         UUID REFERENCES demandas.programa(id) ON DELETE CASCADE,
    nome_arquivo        TEXT NOT NULL CHECK (length(btrim(nome_arquivo)) > 0),
    extensao            VARCHAR(10) NOT NULL
        CHECK (extensao IN ('kmz', 'kml', 'gpkg', 'zip', 'geojson')),
    tipo_mime           TEXT NOT NULL,
    geometria_tipo      VARCHAR(20) NOT NULL
        CHECK (geometria_tipo IN (
            'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'
        )),
    tamanho_bytes       BIGINT NOT NULL
        CHECK (tamanho_bytes BETWEEN 1 AND 52428800),
    sha256              CHAR(64) NOT NULL
        CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    conteudo_binario    BYTEA NOT NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_demanda_arquivo_geometria_upload_alvo
        CHECK (num_nonnulls(projeto_id, plano_id, programa_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_demanda_arquivo_geometria_upload_projeto
    ON demandas.demanda_arquivo_geometria_upload (projeto_id, criado_em DESC)
    WHERE projeto_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_demanda_arquivo_geometria_upload_plano
    ON demandas.demanda_arquivo_geometria_upload (plano_id, criado_em DESC)
    WHERE plano_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_demanda_arquivo_geometria_upload_programa
    ON demandas.demanda_arquivo_geometria_upload (programa_id, criado_em DESC)
    WHERE programa_id IS NOT NULL;

COMMENT ON TABLE demandas.demanda_arquivo_geometria_upload IS
    'Arquivo vetorial original da geometria enviada para projeto, plano ou programa. O conteúdo binário, hash e metadados são preservados para transparência e rastreabilidade; o upload é integrado inicialmente ao cadastro de projeto.';

COMMENT ON COLUMN demandas.demanda_arquivo_geometria_upload.conteudo_binario IS
    'Bytes originais do arquivo vetorial, sem conversão ou alteração.';

COMMENT ON COLUMN demandas.demanda_arquivo_geometria_upload.sha256 IS
    'Hash SHA-256 hexadecimal dos bytes originais enviados.';

COMMIT;