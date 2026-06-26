-- SLT — esquema geo: catálogo de unidades espaciais de atuação (regionalizações de SP)
-- Executar conectado ao banco slt_db (após 010_rename_demandas_aprovadas.sql).
--
-- Conceito: "unidade espacial de atuação" é a área territorial sobre a qual um
-- plano/programa atua. Pode ser um ou mais municípios, ou uma ou mais regiões
-- administrativas comumente usadas no Estado de São Paulo (RA, RG, RM, UGRHI,
-- zona ZEE), com teto no Estado de São Paulo.
--
-- Fontes oficiais: Fundação SEADE (limites e regiões 2021), Dados Abertos SP /
-- SP Águas (UGRHI), IBGE (UF). Zonas de gestão ZEE-SP derivadas das Regiões
-- Administrativas conforme Decreto Estadual nº 67.430/2022, art. 4º.
--
-- Geometrias em EPSG:4326 (WGS84), MultiPolygon, sem simplificação.

BEGIN;

CREATE SCHEMA IF NOT EXISTS geo;

COMMENT ON SCHEMA geo IS
    'Catálogo de unidades espaciais (regionalizações oficiais de SP) para área de atuação de planos/programas';

-- ---------------------------------------------------------------------------
-- Domínio dos tipos de regionalização
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo.tipo_regionalizacao (
    codigo          VARCHAR(40) PRIMARY KEY,
    nome            TEXT NOT NULL,
    descricao       TEXT,
    fonte           TEXT,
    ordem           SMALLINT NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE geo.tipo_regionalizacao IS
    'Tipos de regionalização disponíveis para unidades espaciais de atuação';

INSERT INTO geo.tipo_regionalizacao (codigo, nome, descricao, fonte, ordem) VALUES
    ('estado',                'Estado',                 'Unidade da Federação (teto máximo de abrangência)',                 'IBGE / SEADE',                10),
    ('municipio',             'Município',              'Limite municipal (granularidade mínima)',                           'SEADE (Limites e Regiões 2021)', 20),
    ('regiao_governo',        'Região de Governo',      'Região de Governo do Estado de São Paulo',                          'SEADE (Limites e Regiões 2021)', 30),
    ('regiao_administrativa', 'Região Administrativa',  'Região Administrativa do Estado de São Paulo',                      'SEADE (Limites e Regiões 2021)', 40),
    ('regiao_metropolitana',  'Região Metropolitana',   'Região Metropolitana do Estado de São Paulo',                      'SEADE (Limites e Regiões 2021)', 50),
    ('ugrhi',                 'UGRHI',                  'Unidade de Gerenciamento de Recursos Hídricos',                     'Dados Abertos SP / SP Águas',    60),
    ('zona_zee',              'Zona de Gestão ZEE-SP',  'Zona de gestão do Zoneamento Ecológico-Econômico (Dec. 67.430/2022)', 'Derivada das RAs (SEADE/ZEE-SP)', 70)
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Unidades espaciais (catálogo geográfico)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo.unidade_espacial (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    tipo_regionalizacao     VARCHAR(40) NOT NULL
        REFERENCES geo.tipo_regionalizacao (codigo) ON DELETE RESTRICT,

    -- Código oficial dentro do tipo (ex.: cód. IBGE do município, GID da RA/RG/RM,
    -- código da UGRHI, numeral romano da zona ZEE). Único por tipo.
    codigo                  VARCHAR(20) NOT NULL,
    nome                    TEXT NOT NULL,

    -- Hierarquia auxiliar (preenchida quando aplicável; ex.: município conhece sua RA/RG/RM)
    municipio_cod_ibge      VARCHAR(7),
    metadados               JSONB,

    area_km2                NUMERIC(14,3),
    geom                    geometry(MultiPolygon, 4326) NOT NULL,

    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_unidade_espacial_tipo_codigo UNIQUE (tipo_regionalizacao, codigo)
);

COMMENT ON TABLE geo.unidade_espacial IS
    'Unidades espaciais oficiais (municípios e regionalizações de SP) usadas como área de atuação';
COMMENT ON COLUMN geo.unidade_espacial.codigo IS
    'Código oficial dentro do tipo (IBGE/GID/UGRHI/zona); único por tipo de regionalização';
COMMENT ON COLUMN geo.unidade_espacial.metadados IS
    'Atributos originais da fonte (RA/RG/RM/AU do município, lei da RM, fonte da UGRHI, RAs da zona ZEE, etc.)';

CREATE INDEX IF NOT EXISTS idx_unidade_espacial_tipo
    ON geo.unidade_espacial (tipo_regionalizacao);

CREATE INDEX IF NOT EXISTS idx_unidade_espacial_municipio_ibge
    ON geo.unidade_espacial (municipio_cod_ibge);

CREATE INDEX IF NOT EXISTS idx_unidade_espacial_geom_gist
    ON geo.unidade_espacial USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_unidade_espacial_metadados_gin
    ON geo.unidade_espacial USING GIN (metadados);

-- ---------------------------------------------------------------------------
-- Touch atualizado_em
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION geo.fn_touch_unidade_espacial()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unidade_espacial_touch ON geo.unidade_espacial;
CREATE TRIGGER trg_unidade_espacial_touch
    BEFORE UPDATE ON geo.unidade_espacial
    FOR EACH ROW
    EXECUTE FUNCTION geo.fn_touch_unidade_espacial();

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA geo TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA geo TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA geo TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA geo GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
