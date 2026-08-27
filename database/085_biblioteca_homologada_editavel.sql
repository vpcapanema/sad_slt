-- Autoriza manutenção administrativa da biblioteca de camadas homologadas.
BEGIN;

DROP TRIGGER IF EXISTS trg_gp_homologada_snapshot_imutavel
    ON geoprocessamento.camada_homologada;
DROP TRIGGER IF EXISTS trg_gp_homologada_feicao_imutavel
    ON geoprocessamento.camada_homologada_feicao;
DROP TRIGGER IF EXISTS trg_gp_homologada_raster_imutavel
    ON geoprocessamento.camada_homologada_raster;

ALTER TABLE geoprocessamento.camada_homologada_feicao
    DROP CONSTRAINT IF EXISTS camada_homologada_feicao_camada_id_fkey;
ALTER TABLE geoprocessamento.camada_homologada_feicao
    ADD CONSTRAINT camada_homologada_feicao_camada_id_fkey
    FOREIGN KEY (camada_id) REFERENCES geoprocessamento.camada_homologada(id)
    ON DELETE CASCADE;

ALTER TABLE geoprocessamento.camada_homologada_raster
    DROP CONSTRAINT IF EXISTS camada_homologada_raster_camada_id_fkey;
ALTER TABLE geoprocessamento.camada_homologada_raster
    ADD CONSTRAINT camada_homologada_raster_camada_id_fkey
    FOREIGN KEY (camada_id) REFERENCES geoprocessamento.camada_homologada(id)
    ON DELETE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    geoprocessamento.camada_homologada,
    geoprocessamento.camada_homologada_feicao,
    geoprocessamento.camada_homologada_raster TO slt_user;

COMMENT ON TABLE geoprocessamento.camada_homologada IS
    'Catálogo físico de snapshots oficiais; manutenção administrativa de metadados e exclusão são permitidas.';

COMMIT;
