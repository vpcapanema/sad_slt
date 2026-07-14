-- Conteúdo obrigatório das camadas do módulo de geoprocessamento.
BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_vetor (
    camada_id UUID PRIMARY KEY
        REFERENCES geoprocessamento.camada(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_feicao (
    camada_id UUID NOT NULL
        REFERENCES geoprocessamento.camada(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    propriedades JSONB NOT NULL DEFAULT '{}'::jsonb,
    geom geometry(Geometry, 4326),
    PRIMARY KEY (camada_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_gp_camada_feicao_geom
    ON geoprocessamento.camada_feicao USING GIST (geom);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_raster (
    camada_id UUID PRIMARY KEY
        REFERENCES geoprocessamento.camada(id) ON DELETE CASCADE,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_gp_camada_recurso_sessao
    ON geoprocessamento.camada(recurso_sessao_id)
    WHERE recurso_sessao_id IS NOT NULL;

COMMENT ON TABLE geoprocessamento.camada_feicao IS
    'Conteúdo vetorial integral das camadas, uma feição PostGIS por registro';
COMMENT ON TABLE geoprocessamento.camada_raster IS
    'Conteúdo raster integral persistido no PostgreSQL em formato GeoTIFF';

INSERT INTO geoprocessamento.camada_vetor(camada_id)
SELECT c.id FROM geoprocessamento.camada c
WHERE c.tipo='vetor'
  AND EXISTS (SELECT 1 FROM geoprocessamento.camada_feicao f WHERE f.camada_id=c.id)
ON CONFLICT (camada_id) DO NOTHING;

-- Registros legados sem conteúdo deixam de se declarar persistidos até serem
-- internalizados pelo script de migração.
UPDATE geoprocessamento.camada c
SET persistida=FALSE
WHERE persistida IS TRUE AND (
    (tipo='vetor' AND NOT EXISTS (
        SELECT 1 FROM geoprocessamento.camada_vetor v WHERE v.camada_id=c.id
    )) OR
    (tipo='raster' AND NOT EXISTS (
        SELECT 1 FROM geoprocessamento.camada_raster r WHERE r.camada_id=c.id
    ))
);

CREATE OR REPLACE FUNCTION geoprocessamento.fn_validar_conteudo_camada()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.persistida IS NOT TRUE THEN
        RETURN NEW;
    END IF;
    IF NEW.tipo = 'vetor' AND NOT EXISTS (
        SELECT 1 FROM geoprocessamento.camada_vetor v WHERE v.camada_id=NEW.id
    ) THEN
        RAISE EXCEPTION 'Camada vetorial % não possui conteúdo no banco', NEW.id;
    END IF;
    IF NEW.tipo = 'raster' AND NOT EXISTS (
        SELECT 1 FROM geoprocessamento.camada_raster r WHERE r.camada_id=NEW.id
    ) THEN
        RAISE EXCEPTION 'Camada raster % não possui conteúdo no banco', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gp_camada_conteudo_obrigatorio ON geoprocessamento.camada;
CREATE CONSTRAINT TRIGGER trg_gp_camada_conteudo_obrigatorio
AFTER INSERT OR UPDATE OF tipo, persistida ON geoprocessamento.camada
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION geoprocessamento.fn_validar_conteudo_camada();

CREATE OR REPLACE FUNCTION geoprocessamento.fn_validar_remocao_conteudo_camada()
RETURNS TRIGGER AS $$
DECLARE camada_atual geoprocessamento.camada%ROWTYPE;
BEGIN
    SELECT * INTO camada_atual FROM geoprocessamento.camada WHERE id=OLD.camada_id;
    IF FOUND AND camada_atual.persistida IS TRUE THEN
        RAISE EXCEPTION 'Conteúdo obrigatório da camada % não pode ser removido isoladamente', OLD.camada_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gp_vetor_remocao_conteudo ON geoprocessamento.camada_vetor;
CREATE CONSTRAINT TRIGGER trg_gp_vetor_remocao_conteudo
AFTER DELETE ON geoprocessamento.camada_vetor
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION geoprocessamento.fn_validar_remocao_conteudo_camada();

DROP TRIGGER IF EXISTS trg_gp_raster_remocao_conteudo ON geoprocessamento.camada_raster;
CREATE CONSTRAINT TRIGGER trg_gp_raster_remocao_conteudo
AFTER DELETE ON geoprocessamento.camada_raster
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION geoprocessamento.fn_validar_remocao_conteudo_camada();

GRANT SELECT, INSERT, UPDATE, DELETE ON
    geoprocessamento.camada_vetor,
    geoprocessamento.camada_feicao,
    geoprocessamento.camada_raster TO slt_user;

COMMIT;
