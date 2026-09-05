-- SLT — atualiza o metadado textual "crs" das camadas já catalogadas para
-- refletir a reprojeção feita em 100_padronizar_geometria_sirgas2000.sql.
--
-- 100 mudou a geometria de fato (a coluna geom/envelope); esta migração só
-- corrige a COLUNA DE TEXTO "crs", que descreve o CRS para quem lê o
-- catálogo (interface, exportação) — sem isto ela ficaria desatualizada,
-- ainda dizendo EPSG:4326 sobre uma geometria que já é EPSG:4674.

BEGIN;

UPDATE geoprocessamento.camada_importada SET crs = 'EPSG:4674' WHERE tipo = 'vetor';
UPDATE geoprocessamento.camada_homologada SET crs = 'EPSG:4674' WHERE tipo = 'vetor';
UPDATE geoprocessamento.camada_processada SET crs = 'EPSG:4674' WHERE tipo = 'vetor';

COMMIT;
