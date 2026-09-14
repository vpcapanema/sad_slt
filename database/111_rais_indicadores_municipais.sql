-- Indicadores municipais da RAIS exigidos pela planilha AHP-DANI.
--
-- O banco persiste somente os resultados municipais. Os microdados de vínculos
-- são insumo transitório do carregador e não permanecem no PostgreSQL.
BEGIN;

CREATE SCHEMA IF NOT EXISTS rais;

CREATE TABLE IF NOT EXISTS rais.fonte_indicador_municipal (
    ano                    SMALLINT PRIMARY KEY,
    fonte_url              TEXT NOT NULL,
    nome_arquivo           TEXT NOT NULL,
    sha256                 VARCHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    registros_lidos        BIGINT NOT NULL CHECK (registros_lidos >= 0),
    importado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rais.indicador_municipal (
    cd_mun                  CHAR(7) NOT NULL REFERENCES base_municipal.municipio(cd_mun),
    ano                     SMALLINT NOT NULL,
    emprego_medio_formal    DOUBLE PRECISION NOT NULL CHECK (emprego_medio_formal >= 0),
    salario_medio           DOUBLE PRECISION CHECK (salario_medio >= 0),
    PRIMARY KEY (cd_mun, ano)
);

COMMENT ON SCHEMA rais IS
    'Resultados municipais da RAIS necessários aos indicadores da planilha AHP-DANI.';
COMMENT ON TABLE rais.indicador_municipal IS
    'Uma linha por município e ano, somente com emprego médio formal e salário médio.';
COMMENT ON COLUMN rais.indicador_municipal.emprego_medio_formal IS
    'Soma dos vínculos com remuneração positiva em cada mês dividida por 12.';
COMMENT ON COLUMN rais.indicador_municipal.salario_medio IS
    'Soma das remunerações mensais positivas dividida pelo número de vínculos-mês remunerados.';

GRANT USAGE ON SCHEMA rais TO slt_user;
GRANT SELECT ON rais.fonte_indicador_municipal, rais.indicador_municipal TO slt_user;

COMMIT;
