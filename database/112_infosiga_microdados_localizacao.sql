-- Microdados do InfoSiga-SP e enriquecimento espacial dos sinistros.
--
-- As tabelas de sinistros, pessoas e veículos preservam como TEXT os campos
-- publicados. Município e trecho/rodovia calculados por geometria ficam em
-- infosiga.sinistro_localizacao, separados dos dados brutos e dos indicadores.
BEGIN;

CREATE SCHEMA IF NOT EXISTS infosiga;

CREATE TABLE IF NOT EXISTS infosiga.arquivo_importado (
    nome_arquivo          TEXT PRIMARY KEY,
    entidade              TEXT NOT NULL CHECK (entidade IN ('sinistro', 'pessoa', 'veiculo', 'trecho')),
    pacote_origem         TEXT NOT NULL,
    sha256_pacote         VARCHAR(64) NOT NULL CHECK (sha256_pacote ~ '^[0-9a-f]{64}$'),
    sha256_arquivo        VARCHAR(64) NOT NULL CHECK (sha256_arquivo ~ '^[0-9a-f]{64}$'),
    tamanho_bytes         BIGINT NOT NULL CHECK (tamanho_bytes > 0),
    codificacao           TEXT,
    delimitador           CHAR(1),
    cabecalho_original    JSONB NOT NULL,
    ano_minimo            SMALLINT,
    ano_maximo            SMALLINT,
    ano_maximo_carga      SMALLINT NOT NULL DEFAULT 2025,
    registros_arquivo     BIGINT NOT NULL CHECK (registros_arquivo >= 0),
    registros_importados  BIGINT NOT NULL CHECK (registros_importados >= 0),
    registros_excluidos   BIGINT NOT NULL CHECK (registros_excluidos >= 0),
    importado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (registros_importados + registros_excluidos = registros_arquivo)
);

CREATE TABLE IF NOT EXISTS infosiga.sinistro (
    arquivo_origem TEXT NOT NULL REFERENCES infosiga.arquivo_importado(nome_arquivo),
    linha_arquivo BIGINT NOT NULL,
    id_sinistro TEXT PRIMARY KEY,
    tipo_registro TEXT,
    data_sinistro TEXT,
    ano_sinistro TEXT NOT NULL,
    mes_sinistro TEXT,
    dia_sinistro TEXT,
    hora_sinistro TEXT,
    ano_mes_sinistro TEXT,
    dia_da_semana TEXT,
    turno TEXT,
    logradouro TEXT,
    numero_logradouro TEXT,
    tipo_via TEXT,
    tipo_local TEXT,
    latitude TEXT,
    longitude TEXT,
    cod_ibge TEXT NOT NULL,
    municipio TEXT,
    regiao_administrativa TEXT,
    administracao TEXT,
    conservacao TEXT,
    circunscricao TEXT,
    tp_sinistro_primario TEXT,
    qtd_pedestre TEXT,
    qtd_bicicleta TEXT,
    qtd_motocicleta TEXT,
    qtd_automovel TEXT,
    qtd_onibus TEXT,
    qtd_caminhao TEXT,
    qtd_veic_outros TEXT,
    qtd_veic_nao_disponivel TEXT,
    qtd_gravidade_fatal TEXT,
    qtd_gravidade_grave TEXT,
    qtd_gravidade_leve TEXT,
    qtd_gravidade_ileso TEXT,
    qtd_gravidade_nao_disponivel TEXT,
    tp_sinistro_atropelamento TEXT,
    tp_sinistro_colisao_frontal TEXT,
    tp_sinistro_colisao_traseira TEXT,
    tp_sinistro_colisao_lateral TEXT,
    tp_sinistro_colisao_transversal TEXT,
    tp_sinistro_colisao_outros TEXT,
    tp_sinistro_choque TEXT,
    tp_sinistro_capotamento TEXT,
    tp_sinistro_engavetamento TEXT,
    tp_sinistro_tombamento TEXT,
    tp_sinistro_outros TEXT,
    tp_sinistro_nao_disponivel TEXT,
    UNIQUE (arquivo_origem, linha_arquivo)
);

CREATE TABLE IF NOT EXISTS infosiga.pessoa (
    id_pessoa BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    arquivo_origem TEXT NOT NULL REFERENCES infosiga.arquivo_importado(nome_arquivo),
    linha_arquivo BIGINT NOT NULL,
    id_sinistro TEXT NOT NULL REFERENCES infosiga.sinistro(id_sinistro),
    id_veiculo TEXT,
    cod_ibge TEXT NOT NULL,
    municipio TEXT,
    regiao_administrativa TEXT,
    tipo_via TEXT,
    tipo_veiculo_vitima TEXT,
    sexo TEXT,
    idade TEXT,
    gravidade_lesao TEXT,
    tipo_de_vitima TEXT,
    faixa_etaria_demografica TEXT,
    faixa_etaria_legal TEXT,
    profissao TEXT,
    grau_de_instrucao TEXT,
    nacionalidade TEXT,
    data_sinistro TEXT,
    ano_sinistro TEXT NOT NULL,
    mes_sinistro TEXT,
    dia_sinistro TEXT,
    ano_mes_sinistro TEXT,
    data_obito TEXT,
    ano_obito TEXT,
    mes_obito TEXT,
    dia_obito TEXT,
    ano_mes_obito TEXT,
    local_obito TEXT,
    local_via TEXT,
    tempo_sinistro_obito TEXT,
    UNIQUE (arquivo_origem, linha_arquivo)
);

CREATE TABLE IF NOT EXISTS infosiga.veiculo (
    arquivo_origem TEXT NOT NULL REFERENCES infosiga.arquivo_importado(nome_arquivo),
    linha_arquivo BIGINT NOT NULL,
    id_sinistro TEXT NOT NULL REFERENCES infosiga.sinistro(id_sinistro),
    id_veiculo TEXT PRIMARY KEY,
    marca_modelo TEXT,
    ano_fab TEXT,
    ano_modelo TEXT,
    cor_veiculo TEXT,
    tipo_veiculo TEXT,
    data_sinistro TEXT,
    ano_sinistro TEXT NOT NULL,
    mes_sinistro TEXT,
    dia_sinistro TEXT,
    ano_mes_sinistro TEXT,
    UNIQUE (arquivo_origem, linha_arquivo)
);

CREATE TABLE IF NOT EXISTS infosiga.trecho_rodoviario (
    trecho_id TEXT PRIMARY KEY,
    arquivo_origem TEXT NOT NULL REFERENCES infosiga.arquivo_importado(nome_arquivo),
    subtrecho TEXT NOT NULL,
    rodovia TEXT NOT NULL,
    municipio_fonte TEXT NOT NULL,
    cd_mun CHAR(7) NOT NULL REFERENCES base_municipal.municipio(cd_mun),
    km_inicial DOUBLE PRECISION NOT NULL,
    km_final DOUBLE PRECISION NOT NULL,
    extensao_km DOUBLE PRECISION,
    administracao TEXT,
    jurisdicao TEXT,
    geom geometry(GeometryZ, 5880) NOT NULL
);

CREATE TABLE IF NOT EXISTS infosiga.sinistro_localizacao (
    id_sinistro TEXT PRIMARY KEY REFERENCES infosiga.sinistro(id_sinistro) ON DELETE CASCADE,
    ano_sinistro SMALLINT NOT NULL,
    cd_mun_fonte CHAR(7) REFERENCES base_municipal.municipio(cd_mun),
    cd_mun_espacial CHAR(7) REFERENCES base_municipal.municipio(cd_mun),
    cd_mun_trecho CHAR(7) REFERENCES base_municipal.municipio(cd_mun),
    municipio_divergente BOOLEAN NOT NULL DEFAULT FALSE,
    trecho_id TEXT REFERENCES infosiga.trecho_rodoviario(trecho_id),
    rodovia TEXT,
    distancia_rodovia_m DOUBLE PRECISION,
    metodo_rodovia TEXT,
    status_coordenada TEXT NOT NULL,
    status_municipio TEXT NOT NULL,
    status_rodovia TEXT NOT NULL,
    geom geometry(Point, 4674)
);

CREATE INDEX IF NOT EXISTS ix_infosiga_sinistro_ano_municipio
    ON infosiga.sinistro (ano_sinistro, cod_ibge);
CREATE INDEX IF NOT EXISTS ix_infosiga_pessoa_sinistro
    ON infosiga.pessoa (id_sinistro);
CREATE INDEX IF NOT EXISTS ix_infosiga_pessoa_ano_municipio
    ON infosiga.pessoa (ano_sinistro, cod_ibge);
CREATE INDEX IF NOT EXISTS ix_infosiga_pessoa_gravidade
    ON infosiga.pessoa (gravidade_lesao);
CREATE INDEX IF NOT EXISTS ix_infosiga_veiculo_sinistro
    ON infosiga.veiculo (id_sinistro);
CREATE INDEX IF NOT EXISTS ix_infosiga_veiculo_ano_tipo
    ON infosiga.veiculo (ano_sinistro, tipo_veiculo);
CREATE INDEX IF NOT EXISTS ix_infosiga_trecho_geom
    ON infosiga.trecho_rodoviario USING GIST (geom);
CREATE INDEX IF NOT EXISTS ix_infosiga_trecho_municipio
    ON infosiga.trecho_rodoviario (cd_mun);
CREATE INDEX IF NOT EXISTS ix_infosiga_localizacao_ano_municipio
    ON infosiga.sinistro_localizacao (ano_sinistro, cd_mun_espacial);
CREATE INDEX IF NOT EXISTS ix_infosiga_localizacao_trecho
    ON infosiga.sinistro_localizacao (trecho_id);
CREATE INDEX IF NOT EXISTS ix_infosiga_localizacao_geom
    ON infosiga.sinistro_localizacao USING GIST (geom);

COMMENT ON SCHEMA infosiga IS
    'Microdados do InfoSiga-SP e vínculos espaciais auditáveis, sem indicadores calculados.';
COMMENT ON TABLE infosiga.sinistro IS
    'Registros brutos de sinistros publicados pelo InfoSiga-SP, limitados ao ano máximo registrado no catálogo.';
COMMENT ON TABLE infosiga.pessoa IS
    'Registros brutos de pessoas envolvidas nos sinistros, sem agregação.';
COMMENT ON TABLE infosiga.veiculo IS
    'Registros brutos de veículos envolvidos nos sinistros, sem agregação.';
COMMENT ON TABLE infosiga.sinistro_localizacao IS
    'Enriquecimento derivado: município por ponto e trecho rodoviário mais próximo em até 300 metros.';

GRANT USAGE ON SCHEMA infosiga TO slt_user;
GRANT SELECT ON ALL TABLES IN SCHEMA infosiga TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA infosiga TO slt_user;

COMMIT;
