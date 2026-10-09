-- Aplicar após publicar os escritores que consultam Find_SRID.
-- Reprojeção real; não altera retrospectivamente pontos/linhas de cadastros antigos.
BEGIN;
ALTER TABLE demandas.projeto ALTER COLUMN geometria TYPE geometry(Geometry,4674) USING ST_Transform(geometria,4674);
ALTER TABLE demandas.plano ALTER COLUMN geometria TYPE geometry(Geometry,4674) USING ST_Transform(geometria,4674);
ALTER TABLE demandas.programa ALTER COLUMN geometria TYPE geometry(Geometry,4674) USING ST_Transform(geometria,4674);
ALTER TABLE demandas.projeto_geometria_historico ALTER COLUMN geometria TYPE geometry(Geometry,4674) USING ST_Transform(geometria,4674);
COMMIT;
