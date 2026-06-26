-- Normaliza as tabelas de staging (geo.stg_*) para geo.unidade_espacial.
-- Geometrias preservadas em resolução cheia (sem ST_Simplify). EPSG:4326.

BEGIN;

TRUNCATE geo.unidade_espacial;

-- ---------------------------------------------------------------------------
-- Município (645) — granularidade mínima; guarda RA/RG/RM/AU em metadados
-- ---------------------------------------------------------------------------
INSERT INTO geo.unidade_espacial
    (tipo_regionalizacao, codigo, nome, municipio_cod_ibge, area_km2, metadados, geom)
SELECT
    'municipio',
    m.cod_ibge::text,
    m.municipio,
    m.cod_ibge::text,
    m.area_km2,
    jsonb_strip_nulls(jsonb_build_object(
        'ra', m.ra, 'rg', m.rg, 'rm', m.rm, 'au', m.au,
        'gid_ra', m.gid_ra, 'gid_rg', m.gid_rg, 'gid_rm', m.gid_rm, 'gid_au', m.gid_au
    )),
    ST_Multi(m.geom)
FROM geo.stg_municipio m;

-- ---------------------------------------------------------------------------
-- Região Administrativa (16)
-- ---------------------------------------------------------------------------
INSERT INTO geo.unidade_espacial
    (tipo_regionalizacao, codigo, nome, area_km2, metadados, geom)
SELECT
    'regiao_administrativa', r.gid_ra::text, r.ra,
    round((ST_Area(r.geom::geography)/1000000.0)::numeric, 3),
    jsonb_build_object('gid_ra', r.gid_ra),
    ST_Multi(r.geom)
FROM geo.stg_regiao_administrativa r;

-- ---------------------------------------------------------------------------
-- Região de Governo (43)
-- ---------------------------------------------------------------------------
INSERT INTO geo.unidade_espacial
    (tipo_regionalizacao, codigo, nome, area_km2, metadados, geom)
SELECT
    'regiao_governo', r.gid_rg::text, r.rg,
    round((ST_Area(r.geom::geography)/1000000.0)::numeric, 3),
    jsonb_build_object('gid_rg', r.gid_rg),
    ST_Multi(r.geom)
FROM geo.stg_regiao_de_governo r;

-- ---------------------------------------------------------------------------
-- Região Metropolitana (9)
-- ---------------------------------------------------------------------------
INSERT INTO geo.unidade_espacial
    (tipo_regionalizacao, codigo, nome, area_km2, metadados, geom)
SELECT
    'regiao_metropolitana', r.gid_rm::text, r.rm,
    round((ST_Area(r.geom::geography)/1000000.0)::numeric, 3),
    jsonb_strip_nulls(jsonb_build_object('gid_rm', r.gid_rm, 'lei', r.lei)),
    ST_Multi(r.geom)
FROM geo.stg_regiao_metropolitana r;

-- ---------------------------------------------------------------------------
-- UGRHI (22)
-- ---------------------------------------------------------------------------
INSERT INTO geo.unidade_espacial
    (tipo_regionalizacao, codigo, nome, area_km2, metadados, geom)
SELECT
    'ugrhi', (u.codigo)::int::text, u.nome,
    round((ST_Area(u.geom::geography)/1000000.0)::numeric, 3),
    jsonb_strip_nulls(jsonb_build_object('fonte', u.fonte)),
    ST_Multi(u.geom)
FROM geo.stg_ugrhi u;

-- ---------------------------------------------------------------------------
-- Estado de São Paulo (teto) — filtra a UF SP
-- ---------------------------------------------------------------------------
INSERT INTO geo.unidade_espacial
    (tipo_regionalizacao, codigo, nome, area_km2, metadados, geom)
SELECT
    'estado', '35', 'São Paulo',
    round((ST_Area(u.geom::geography)/1000000.0)::numeric, 3),
    jsonb_build_object('sigla', u.sigla, 'geocodigo', u.geocodigo),
    ST_Multi(u.geom)
FROM geo.stg_uf u
WHERE upper(u.sigla) = 'SP';

-- ---------------------------------------------------------------------------
-- Zonas de Gestão ZEE-SP (9) — derivadas das RAs (Decreto 67.430/2022, art. 4º)
-- União exata dos polígonos das RAs (sem simplificação).
-- ---------------------------------------------------------------------------
WITH mapa(zona, romano, gid_ras) AS (
    VALUES
        (1, 'I',    ARRAY[5,2,6,11]),
        (2, 'II',   ARRAY[3,8,9]),
        (3, 'III',  ARRAY[1,14]),
        (4, 'IV',   ARRAY[7,13]),
        (5, 'V',    ARRAY[4]),
        (6, 'VI',   ARRAY[16]),
        (7, 'VII',  ARRAY[12]),
        (8, 'VIII', ARRAY[10]),
        (9, 'IX',   ARRAY[15])
),
uni AS (
    SELECT mp.zona, mp.romano, mp.gid_ras,
           ST_Multi(ST_Union(r.geom)) AS geom,
           jsonb_agg(r.ra ORDER BY r.gid_ra) AS ras
    FROM mapa mp
    JOIN geo.stg_regiao_administrativa r ON r.gid_ra = ANY(mp.gid_ras)
    GROUP BY mp.zona, mp.romano, mp.gid_ras
)
INSERT INTO geo.unidade_espacial
    (tipo_regionalizacao, codigo, nome, area_km2, metadados, geom)
SELECT
    'zona_zee', uni.romano, 'Zona de Gestão ' || uni.romano,
    round((ST_Area(uni.geom::geography)/1000000.0)::numeric, 3),
    jsonb_build_object('zona', uni.zona, 'gid_ras', uni.gid_ras, 'ras', uni.ras),
    uni.geom
FROM uni;

COMMIT;

-- Resumo
SELECT tipo_regionalizacao, count(*) AS n, round(sum(area_km2))::int AS area_total_km2
FROM geo.unidade_espacial
GROUP BY tipo_regionalizacao
ORDER BY min((SELECT ordem FROM geo.tipo_regionalizacao t WHERE t.codigo = tipo_regionalizacao));
