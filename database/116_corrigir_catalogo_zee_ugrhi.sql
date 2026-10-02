-- Corrige nomes UGRHI importados com interpretação Latin-1 e garante as zonas ZEE.
BEGIN;

UPDATE geo.unidade_espacial
SET nome = convert_from(convert_to(nome, 'LATIN1'), 'UTF8')
WHERE tipo_regionalizacao = 'ugrhi'
  AND nome LIKE '%Ã%';

WITH mapa(codigo, zona, gid_ras) AS (
    VALUES
        ('I',    1, ARRAY[5, 2, 6, 11]::integer[]),
        ('II',   2, ARRAY[3, 8, 9]::integer[]),
        ('III',  3, ARRAY[1, 14]::integer[]),
        ('IV',   4, ARRAY[7, 13]::integer[]),
        ('V',    5, ARRAY[4]::integer[]),
        ('VI',   6, ARRAY[16]::integer[]),
        ('VII',  7, ARRAY[12]::integer[]),
        ('VIII', 8, ARRAY[10]::integer[]),
        ('IX',   9, ARRAY[15]::integer[])
), zonas AS (
    SELECT
        mapa.codigo,
        mapa.zona,
        mapa.gid_ras,
        jsonb_agg(ra.nome ORDER BY ra.codigo) AS ras,
        ST_Multi(ST_UnaryUnion(ST_Collect(ra.geom))) AS geom
    FROM mapa
    JOIN geo.unidade_espacial ra
      ON ra.tipo_regionalizacao = 'regiao_administrativa'
    AND ra.codigo::integer = ANY(mapa.gid_ras)
    GROUP BY mapa.codigo, mapa.zona, mapa.gid_ras
    HAVING count(DISTINCT ra.codigo) = cardinality(mapa.gid_ras)
)
INSERT INTO geo.unidade_espacial
    (tipo_regionalizacao, codigo, nome, area_km2, metadados, geom)
SELECT
    'zona_zee',
    codigo,
    'Zona de Gestão ' || codigo,
    round((ST_Area(geom::geography) / 1000000.0)::numeric, 3),
    jsonb_build_object('zona', zona, 'gid_ras', gid_ras, 'ras', ras),
    geom
FROM zonas
ON CONFLICT (tipo_regionalizacao, codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    area_km2 = EXCLUDED.area_km2,
    metadados = EXCLUDED.metadados,
    geom = EXCLUDED.geom,
    atualizado_em = CURRENT_TIMESTAMP;

COMMIT;