-- Armazenamentos físicos independentes para importação, processamento e homologação.
BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_importada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurso_sessao_id VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('vetor','raster')),
    geometria_tipo VARCHAR(100),
    crs VARCHAR(50),
    uri TEXT,
    formato VARCHAR(50),
    envelope geometry(Geometry,4326),
    hash_arquivo VARCHAR(128),
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_importada_feicao (
    camada_id UUID NOT NULL REFERENCES geoprocessamento.camada_importada(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    propriedades JSONB NOT NULL DEFAULT '{}'::jsonb,
    geom geometry(Geometry,4326),
    PRIMARY KEY (camada_id,ordem)
);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_importada_raster (
    camada_id UUID PRIMARY KEY REFERENCES geoprocessamento.camada_importada(id) ON DELETE CASCADE,
    dados_geotiff BYTEA NOT NULL,
    largura INTEGER NOT NULL CHECK (largura > 0),
    altura INTEGER NOT NULL CHECK (altura > 0),
    bandas SMALLINT NOT NULL DEFAULT 1 CHECK (bandas > 0),
    dtype VARCHAR(40) NOT NULL,
    nodata DOUBLE PRECISION,
    perfil JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_processada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurso_sessao_id VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('vetor','raster')),
    geometria_tipo VARCHAR(100),
    crs VARCHAR(50),
    formato VARCHAR(50),
    envelope geometry(Geometry,4326),
    operacao_origem VARCHAR(50),
    linhagem JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_processada_feicao (
    camada_id UUID NOT NULL REFERENCES geoprocessamento.camada_processada(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    propriedades JSONB NOT NULL DEFAULT '{}'::jsonb,
    geom geometry(Geometry,4326),
    PRIMARY KEY (camada_id,ordem)
);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_processada_raster (
    camada_id UUID PRIMARY KEY REFERENCES geoprocessamento.camada_processada(id) ON DELETE CASCADE,
    dados_geotiff BYTEA NOT NULL,
    largura INTEGER NOT NULL CHECK (largura > 0),
    altura INTEGER NOT NULL CHECK (altura > 0),
    bandas SMALLINT NOT NULL DEFAULT 1 CHECK (bandas > 0),
    dtype VARCHAR(40) NOT NULL,
    nodata DOUBLE PRECISION,
    perfil JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gp_importada_envelope
    ON geoprocessamento.camada_importada USING GIST(envelope);
CREATE INDEX IF NOT EXISTS idx_gp_importada_feicao_geom
    ON geoprocessamento.camada_importada_feicao USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_gp_processada_envelope
    ON geoprocessamento.camada_processada USING GIST(envelope);
CREATE INDEX IF NOT EXISTS idx_gp_processada_feicao_geom
    ON geoprocessamento.camada_processada_feicao USING GIST(geom);

-- Copia o acervo legado para os dois armazenamentos de trabalho.
INSERT INTO geoprocessamento.camada_importada
    (id,recurso_sessao_id,nome,tipo,geometria_tipo,crs,uri,formato,envelope,
     hash_arquivo,metadados,criado_em,atualizado_em)
SELECT c.id,c.recurso_sessao_id,c.nome,c.tipo,c.geometria_tipo,c.crs,c.uri,c.formato,
       c.envelope,c.hash_arquivo,c.metadados,c.criado_em,c.criado_em
FROM geoprocessamento.camada c
WHERE c.persistida IS TRUE AND c.recurso_sessao_id IS NOT NULL
  AND NOT (
      COALESCE(c.metadados->>'origem','') LIKE 'OP-%'
      OR COALESCE(c.metadados->>'origem','')='processamento'
  )
ON CONFLICT DO NOTHING;

INSERT INTO geoprocessamento.camada_processada
    (id,recurso_sessao_id,nome,tipo,geometria_tipo,crs,formato,envelope,
     operacao_origem,linhagem,metadados,criado_em,atualizado_em)
SELECT c.id,c.recurso_sessao_id,c.nome,c.tipo,c.geometria_tipo,c.crs,c.formato,
       c.envelope,c.metadados->>'origem','{}'::jsonb,c.metadados,c.criado_em,c.criado_em
FROM geoprocessamento.camada c
WHERE c.persistida IS TRUE AND c.recurso_sessao_id IS NOT NULL
  AND (
      COALESCE(c.metadados->>'origem','') LIKE 'OP-%'
      OR COALESCE(c.metadados->>'origem','')='processamento'
  )
ON CONFLICT DO NOTHING;

INSERT INTO geoprocessamento.camada_importada_feicao(camada_id,ordem,propriedades,geom)
SELECT i.id,f.ordem,f.propriedades,f.geom
FROM geoprocessamento.camada_importada i
JOIN geoprocessamento.camada_feicao f ON f.camada_id=i.id
ON CONFLICT DO NOTHING;

INSERT INTO geoprocessamento.camada_processada_feicao(camada_id,ordem,propriedades,geom)
SELECT p.id,f.ordem,f.propriedades,f.geom
FROM geoprocessamento.camada_processada p
JOIN geoprocessamento.camada_feicao f ON f.camada_id=p.id
ON CONFLICT DO NOTHING;

INSERT INTO geoprocessamento.camada_importada_raster
    (camada_id,dados_geotiff,largura,altura,bandas,dtype,nodata,perfil,criado_em,atualizado_em)
SELECT i.id,r.dados_geotiff,r.largura,r.altura,r.bandas,r.dtype,r.nodata,r.perfil,
       r.criado_em,r.atualizado_em
FROM geoprocessamento.camada_importada i
JOIN geoprocessamento.camada_raster r ON r.camada_id=i.id
ON CONFLICT DO NOTHING;

INSERT INTO geoprocessamento.camada_processada_raster
    (camada_id,dados_geotiff,largura,altura,bandas,dtype,nodata,perfil,criado_em,atualizado_em)
SELECT p.id,r.dados_geotiff,r.largura,r.altura,r.bandas,r.dtype,r.nodata,r.perfil,
       r.criado_em,r.atualizado_em
FROM geoprocessamento.camada_processada p
JOIN geoprocessamento.camada_raster r ON r.camada_id=p.id
ON CONFLICT DO NOTHING;

-- A antiga tabela de vínculo torna-se o catálogo físico da biblioteca oficial.
DROP TRIGGER IF EXISTS trg_gp_homologada_imutavel ON geoprocessamento.camada_homologada;
DROP TRIGGER IF EXISTS trg_gp_camada_homologada_imutavel ON geoprocessamento.camada;
DROP TRIGGER IF EXISTS trg_gp_feicao_homologada_imutavel ON geoprocessamento.camada_feicao;
DROP TRIGGER IF EXISTS trg_gp_vetor_homologado_imutavel ON geoprocessamento.camada_vetor;
DROP TRIGGER IF EXISTS trg_gp_raster_homologado_imutavel ON geoprocessamento.camada_raster;

ALTER TABLE geoprocessamento.camada_homologada
    ALTER COLUMN camada_id DROP NOT NULL;
ALTER TABLE geoprocessamento.camada_homologada
    ADD COLUMN IF NOT EXISTS recurso_sessao_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS origem_categoria VARCHAR(20),
    ADD COLUMN IF NOT EXISTS origem_camada_id UUID,
    ADD COLUMN IF NOT EXISTS origem_recurso_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS nome VARCHAR(200),
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS geometria_tipo VARCHAR(100),
    ADD COLUMN IF NOT EXISTS crs VARCHAR(50),
    ADD COLUMN IF NOT EXISTS formato VARCHAR(50),
    ADD COLUMN IF NOT EXISTS envelope geometry(Geometry,4326),
    ADD COLUMN IF NOT EXISTS hash_conteudo VARCHAR(128);

UPDATE geoprocessamento.camada_homologada h
SET recurso_sessao_id=COALESCE(h.recurso_sessao_id,'homologada_' || replace(h.id::text,'-','')),
    origem_categoria=COALESCE(h.origem_categoria,'legado'),
    origem_camada_id=COALESCE(h.origem_camada_id,h.camada_id),
    origem_recurso_id=COALESCE(h.origem_recurso_id,c.recurso_sessao_id),
    nome=COALESCE(h.nome,h.nome_publicacao,c.nome),
    tipo=COALESCE(h.tipo,c.tipo),
    geometria_tipo=COALESCE(h.geometria_tipo,c.geometria_tipo),
    crs=COALESCE(h.crs,c.crs),
    formato=COALESCE(h.formato,c.formato),
    envelope=COALESCE(h.envelope,c.envelope)
FROM geoprocessamento.camada c
WHERE c.id=h.camada_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gp_homologada_recurso
    ON geoprocessamento.camada_homologada(recurso_sessao_id);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_homologada_feicao (
    camada_id UUID NOT NULL REFERENCES geoprocessamento.camada_homologada(id) ON DELETE RESTRICT,
    ordem INTEGER NOT NULL,
    propriedades JSONB NOT NULL DEFAULT '{}'::jsonb,
    geom geometry(Geometry,4326),
    PRIMARY KEY (camada_id,ordem)
);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_homologada_raster (
    camada_id UUID PRIMARY KEY REFERENCES geoprocessamento.camada_homologada(id) ON DELETE RESTRICT,
    dados_geotiff BYTEA NOT NULL,
    largura INTEGER NOT NULL CHECK (largura > 0),
    altura INTEGER NOT NULL CHECK (altura > 0),
    bandas SMALLINT NOT NULL DEFAULT 1 CHECK (bandas > 0),
    dtype VARCHAR(40) NOT NULL,
    nodata DOUBLE PRECISION,
    perfil JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gp_homologada_envelope
    ON geoprocessamento.camada_homologada USING GIST(envelope);
CREATE INDEX IF NOT EXISTS idx_gp_homologada_feicao_geom
    ON geoprocessamento.camada_homologada_feicao USING GIST(geom);

-- Materializa eventuais homologações criadas pela versão anterior.
INSERT INTO geoprocessamento.camada_homologada_feicao(camada_id,ordem,propriedades,geom)
SELECT h.id,f.ordem,f.propriedades,f.geom
FROM geoprocessamento.camada_homologada h
JOIN geoprocessamento.camada_feicao f ON f.camada_id=h.camada_id
ON CONFLICT DO NOTHING;

INSERT INTO geoprocessamento.camada_homologada_raster
    (camada_id,dados_geotiff,largura,altura,bandas,dtype,nodata,perfil,criado_em)
SELECT h.id,r.dados_geotiff,r.largura,r.altura,r.bandas,r.dtype,r.nodata,r.perfil,r.criado_em
FROM geoprocessamento.camada_homologada h
JOIN geoprocessamento.camada_raster r ON r.camada_id=h.camada_id
ON CONFLICT DO NOTHING;

UPDATE geoprocessamento.camada_homologada h
SET hash_conteudo=CASE
    WHEN h.tipo='vetor' THEN (
        SELECT md5(COALESCE(string_agg(
            f.ordem::text || f.propriedades::text ||
            COALESCE(encode(ST_AsEWKB(f.geom),'hex'),''), '' ORDER BY f.ordem
        ),''))
        FROM geoprocessamento.camada_homologada_feicao f WHERE f.camada_id=h.id
    )
    WHEN h.tipo='raster' THEN (
        SELECT md5(r.dados_geotiff)
        FROM geoprocessamento.camada_homologada_raster r WHERE r.camada_id=h.id
    )
END
WHERE h.hash_conteudo IS NULL;

ALTER TABLE geoprocessamento.camada_homologada
    ALTER COLUMN recurso_sessao_id SET NOT NULL,
    ALTER COLUMN origem_categoria SET NOT NULL,
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN tipo SET NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='ck_gp_homologada_tipo'
    ) THEN
        ALTER TABLE geoprocessamento.camada_homologada
            ADD CONSTRAINT ck_gp_homologada_tipo CHECK (tipo IN ('vetor','raster'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='ck_gp_homologada_origem'
    ) THEN
        ALTER TABLE geoprocessamento.camada_homologada
            ADD CONSTRAINT ck_gp_homologada_origem
            CHECK (origem_categoria IN ('importadas','processadas','legado'));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION geoprocessamento.fn_bloquear_snapshot_homologado()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'A biblioteca homologada é somente leitura e imutável';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gp_homologada_snapshot_imutavel ON geoprocessamento.camada_homologada;
CREATE TRIGGER trg_gp_homologada_snapshot_imutavel
BEFORE UPDATE OR DELETE ON geoprocessamento.camada_homologada
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_snapshot_homologado();

DROP TRIGGER IF EXISTS trg_gp_homologada_feicao_imutavel ON geoprocessamento.camada_homologada_feicao;
CREATE TRIGGER trg_gp_homologada_feicao_imutavel
BEFORE UPDATE OR DELETE ON geoprocessamento.camada_homologada_feicao
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_snapshot_homologado();

DROP TRIGGER IF EXISTS trg_gp_homologada_raster_imutavel ON geoprocessamento.camada_homologada_raster;
CREATE TRIGGER trg_gp_homologada_raster_imutavel
BEFORE UPDATE OR DELETE ON geoprocessamento.camada_homologada_raster
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_snapshot_homologado();

COMMENT ON TABLE geoprocessamento.camada_importada IS
    'Armazenamento físico das camadas provenientes de fontes externas';
COMMENT ON TABLE geoprocessamento.camada_processada IS
    'Armazenamento físico dos resultados produzidos pelo motor';
COMMENT ON TABLE geoprocessamento.camada_homologada IS
    'Catálogo físico de snapshots oficiais imutáveis consumidos pelas fases 1 e 2';
COMMENT ON TABLE geoprocessamento.camada IS
    'Catálogo legado preservado apenas para integridade de referências históricas; não recebe novas camadas';

CREATE OR REPLACE FUNCTION geoprocessamento.fn_bloquear_nova_camada_legada()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'geoprocessamento.camada é legado; use camada_importada ou camada_processada';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gp_bloquear_insert_camada_legada ON geoprocessamento.camada;
CREATE TRIGGER trg_gp_bloquear_insert_camada_legada
BEFORE INSERT ON geoprocessamento.camada
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_nova_camada_legada();

GRANT SELECT,INSERT,UPDATE,DELETE ON
    geoprocessamento.camada_importada,
    geoprocessamento.camada_importada_feicao,
    geoprocessamento.camada_importada_raster,
    geoprocessamento.camada_processada,
    geoprocessamento.camada_processada_feicao,
    geoprocessamento.camada_processada_raster TO slt_user;
GRANT SELECT,INSERT ON
    geoprocessamento.camada_homologada,
    geoprocessamento.camada_homologada_feicao,
    geoprocessamento.camada_homologada_raster TO slt_user;

COMMIT;
