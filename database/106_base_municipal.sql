-- Base municipal de São Paulo do gerador de camadas (plugin municipal-layer).
-- Move para o PostgreSQL o catálogo de atributos, as observações municipais e a
-- malha 2022 que antes viviam em plugins/municipal-layer/data/catalog.sqlite e
-- municipios.gpkg. Os dados são de referência e somente leitura em operação:
-- a carga é feita por scripts/carregar_base_municipal.py.
BEGIN;

CREATE SCHEMA IF NOT EXISTS base_municipal;

-- Malha municipal do IBGE 2022, recorte São Paulo, em SIRGAS 2000 (EPSG:4674).
CREATE TABLE IF NOT EXISTS base_municipal.municipio (
    cd_mun    CHAR(7) PRIMARY KEY,
    nm_mun    TEXT NOT NULL,
    sigla_uf  CHAR(2) NOT NULL,
    area_km2  DOUBLE PRECISION,
    geom      geometry(MultiPolygon, 4674) NOT NULL,
    CONSTRAINT ck_base_municipal_codigo CHECK (cd_mun ~ '^[0-9]{7}$'),
    CONSTRAINT ck_base_municipal_nome CHECK (length(btrim(nm_mun)) > 0)
);

CREATE INDEX IF NOT EXISTS ix_base_municipal_municipio_geom
    ON base_municipal.municipio USING GIST (geom);

-- Catálogo de indicadores. Um atributo é uma variável de uma fonte em um ano.
CREATE TABLE IF NOT EXISTS base_municipal.atributo (
    id         TEXT PRIMARY KEY,
    fonte      TEXT NOT NULL,
    ano        SMALLINT NOT NULL,
    tema       TEXT NOT NULL,
    campo      TEXT NOT NULL UNIQUE,
    rotulo     TEXT NOT NULL,
    unidade    TEXT,
    url        TEXT,
    detalhe    JSONB NOT NULL DEFAULT '{}',
    cobertura  SMALLINT NOT NULL CHECK (cobertura BETWEEN 0 AND 645)
);

CREATE INDEX IF NOT EXISTS ix_base_municipal_atributo_filtro
    ON base_municipal.atributo (fonte, ano, tema);

-- Uma observação por atributo e município. Ausência de valor permanece nula;
-- zero é preservado. A linha existe mesmo sem valor, para separar "não medido"
-- de "município fora do recorte".
CREATE TABLE IF NOT EXISTS base_municipal.observacao (
    atributo_id  TEXT NOT NULL REFERENCES base_municipal.atributo(id) ON DELETE CASCADE,
    cd_mun       CHAR(7) NOT NULL REFERENCES base_municipal.municipio(cd_mun) ON DELETE RESTRICT,
    valor        DOUBLE PRECISION,
    PRIMARY KEY (atributo_id, cd_mun)
);

-- Arquivos de origem conferidos na importação, para auditoria da procedência.
CREATE TABLE IF NOT EXISTS base_municipal.procedencia (
    caminho      TEXT PRIMARY KEY,
    sha256       VARCHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    importado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON SCHEMA base_municipal IS
    'Base municipal de referência de São Paulo: malha IBGE 2022 e indicadores socioeconômicos usados pelo gerador de camadas municipais da extração de atributos.';
COMMENT ON TABLE base_municipal.municipio IS
    'Malha municipal do IBGE de 2022 para São Paulo, 645 municípios em SIRGAS 2000. O ano dos indicadores não altera esta malha de referência.';
COMMENT ON TABLE base_municipal.atributo IS
    'Catálogo de indicadores municipais. Cada linha identifica variável, fonte, ano, tema e unidade; cobertura registra quantos municípios possuem valor.';
COMMENT ON COLUMN base_municipal.atributo.campo IS
    'Nome do campo exportado nos formatos que aceitam nomes longos. Em Shapefile o campo é renumerado no momento da exportação.';
COMMENT ON COLUMN base_municipal.atributo.detalhe IS
    'Metadados da publicação de origem preservados como vieram da fonte: tabela, variável, categorias, divulgação, notas e multiplicador.';
COMMENT ON TABLE base_municipal.observacao IS
    'Valor de um atributo em um município. Nulo significa ausência de valor na fonte, não zero.';
COMMENT ON TABLE base_municipal.procedencia IS
    'Arquivos de origem e seus checksums no momento da importação. Não é auditoria estatística das publicações.';

GRANT USAGE ON SCHEMA base_municipal TO slt_user;
GRANT SELECT ON base_municipal.municipio, base_municipal.atributo,
    base_municipal.observacao, base_municipal.procedencia TO slt_user;

COMMIT;
