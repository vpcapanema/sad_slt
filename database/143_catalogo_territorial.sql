-- Incorporacao aditiva: originais municipais e camadas importadas permanecem intactos.
BEGIN;
CREATE SCHEMA IF NOT EXISTS base_territorial;

CREATE TABLE IF NOT EXISTS base_territorial.variavel_combinada (
    codigo TEXT NOT NULL,
    territorialidade TEXT NOT NULL CHECK (territorialidade IN ('municipios', 'setores_2022')),
    versao INTEGER NOT NULL CHECK (versao > 0),
    definicao JSONB NOT NULL,
    calculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (codigo, territorialidade, versao)
);

CREATE TABLE IF NOT EXISTS base_territorial.setor (
    cd_setor CHAR(15) PRIMARY KEY CHECK (cd_setor ~ '^35[0-9]{13}$'),
    cd_mun CHAR(7) NOT NULL REFERENCES base_municipal.municipio(cd_mun),
    area_km2 DOUBLE PRECISION NOT NULL CHECK (area_km2 > 0),
    partes INTEGER NOT NULL CHECK (partes > 0),
    geom geometry(MultiPolygon, 4674) NOT NULL,
    valores JSONB NOT NULL,
    sinais JSONB NOT NULL DEFAULT '{}',
    combinados JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS ix_base_territorial_setor_geom
    ON base_territorial.setor USING gist(geom);
CREATE INDEX IF NOT EXISTS ix_base_territorial_setor_municipio
    ON base_territorial.setor(cd_mun);

CREATE TABLE IF NOT EXISTS base_territorial.atributo_setorial (
    id TEXT PRIMARY KEY,
    campo TEXT UNIQUE NOT NULL,
    chave TEXT NOT NULL,
    origem TEXT NOT NULL CHECK (origem IN ('originais', 'combinados')),
    fonte TEXT NOT NULL,
    ano SMALLINT NOT NULL,
    tema TEXT NOT NULL,
    rotulo TEXT NOT NULL,
    unidade TEXT,
    url TEXT NOT NULL,
    detalhe JSONB NOT NULL,
    cobertura INTEGER NOT NULL CHECK (cobertura >= 0)
);

CREATE TABLE IF NOT EXISTS base_territorial.procedencia (
    url TEXT NOT NULL,
    sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    bytes BIGINT NOT NULL CHECK (bytes > 0),
    importado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (url, sha256)
);

COMMENT ON TABLE base_territorial.setor IS
    'Setores logicos de SP, malha oficial 2022. Partes reunidas sem simplificacao ou reparo; medidas demograficas contadas uma vez. Nulos e sigilos preservados.';
COMMENT ON TABLE base_territorial.variavel_combinada IS
    'Formulas versionadas SICARD; calculabilidade nao significa homologacao para hierarquizacao.';
GRANT USAGE ON SCHEMA base_territorial TO slt_user;
GRANT SELECT ON ALL TABLES IN SCHEMA base_territorial TO slt_user;
COMMIT;
