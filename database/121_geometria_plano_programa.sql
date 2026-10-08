-- Geometria de plano e programa.
--
-- Plano e programa passam a ter geometria própria, como o projeto. Ela é a
-- área de abrangência materializada: cópia fiel da união das unidades
-- espaciais selecionadas (plano_unidade_espacial / programa_unidade_espacial
-- -> geo.unidade_espacial.geom) ou a geometria desenhada em tela pelo usuário.
-- geometria_origem registra qual dos dois casos produziu a coluna.
BEGIN;

ALTER TABLE demandas.plano
    ADD COLUMN IF NOT EXISTS geometria        geometry(Geometry, 4326),
    ADD COLUMN IF NOT EXISTS geometria_origem VARCHAR(20)
        CHECK (geometria_origem IS NULL OR geometria_origem IN ('unidades_espaciais', 'desenho'));

ALTER TABLE demandas.programa
    ADD COLUMN IF NOT EXISTS geometria        geometry(Geometry, 4326),
    ADD COLUMN IF NOT EXISTS geometria_origem VARCHAR(20)
        CHECK (geometria_origem IS NULL OR geometria_origem IN ('unidades_espaciais', 'desenho'));

ALTER TABLE demandas.plano
    DROP CONSTRAINT IF EXISTS ck_plano_geometria_origem,
    ADD CONSTRAINT ck_plano_geometria_origem
        CHECK ((geometria IS NULL) = (geometria_origem IS NULL));

ALTER TABLE demandas.programa
    DROP CONSTRAINT IF EXISTS ck_programa_geometria_origem,
    ADD CONSTRAINT ck_programa_geometria_origem
        CHECK ((geometria IS NULL) = (geometria_origem IS NULL));

-- Registros existentes: união das unidades já vinculadas.
UPDATE demandas.plano p
   SET geometria = u.geom,
       geometria_origem = 'unidades_espaciais'
  FROM (
        SELECT pue.plano_id, ST_Multi(ST_Union(ue.geom)) AS geom
          FROM demandas.plano_unidade_espacial pue
          JOIN geo.unidade_espacial ue ON ue.id = pue.unidade_espacial_id
         GROUP BY pue.plano_id
       ) u
 WHERE u.plano_id = p.id
   AND p.geometria IS NULL;

UPDATE demandas.programa pg
   SET geometria = u.geom,
       geometria_origem = 'unidades_espaciais'
  FROM (
        SELECT pue.programa_id, ST_Multi(ST_Union(ue.geom)) AS geom
          FROM demandas.programa_unidade_espacial pue
          JOIN geo.unidade_espacial ue ON ue.id = pue.unidade_espacial_id
         GROUP BY pue.programa_id
       ) u
 WHERE u.programa_id = pg.id
   AND pg.geometria IS NULL;

CREATE INDEX IF NOT EXISTS idx_plano_geometria_gist
    ON demandas.plano USING GIST (geometria);
CREATE INDEX IF NOT EXISTS idx_programa_geometria_gist
    ON demandas.programa USING GIST (geometria);

COMMENT ON COLUMN demandas.plano.geometria IS
    'Área de abrangência do plano em EPSG:4326: união fiel das unidades espaciais selecionadas ou geometria desenhada pelo usuário.';
COMMENT ON COLUMN demandas.plano.geometria_origem IS
    'unidades_espaciais = copiada de plano_unidade_espacial/geo.unidade_espacial; desenho = traçada em tela.';
COMMENT ON COLUMN demandas.programa.geometria IS
    'Área de abrangência do programa em EPSG:4326: união fiel das unidades espaciais selecionadas ou geometria desenhada pelo usuário.';
COMMENT ON COLUMN demandas.programa.geometria_origem IS
    'unidades_espaciais = copiada de programa_unidade_espacial/geo.unidade_espacial; desenho = traçada em tela.';

COMMIT;
