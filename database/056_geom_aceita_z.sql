-- Relaxa as colunas de feição para aceitar geometrias 2D e 3D (com Z).
-- O typmod geometry(Geometry,4326) fixa 2D e rejeita coordenadas Z; o tipo
-- geometry genérico preserva tanto 2D quanto 3D sem alterar os dados existentes.
BEGIN;

ALTER TABLE geoprocessamento.camada_feicao
    ALTER COLUMN geom TYPE geometry USING geom;

ALTER TABLE geoprocessamento.camada_importada_feicao
    ALTER COLUMN geom TYPE geometry USING geom;

ALTER TABLE geoprocessamento.camada_processada_feicao
    ALTER COLUMN geom TYPE geometry USING geom;

ALTER TABLE geoprocessamento.camada_homologada_feicao
    ALTER COLUMN geom TYPE geometry USING geom;

COMMIT;
