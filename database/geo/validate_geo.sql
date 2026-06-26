SELECT tipo_regionalizacao,
       count(*) FILTER (WHERE NOT ST_IsValid(geom)) AS invalidas,
       count(*) FILTER (WHERE ST_SRID(geom) <> 4326) AS srid_errado,
       count(*) FILTER (WHERE GeometryType(geom) <> 'MULTIPOLYGON') AS tipo_errado
FROM geo.unidade_espacial
GROUP BY 1 ORDER BY 1;

SELECT codigo, nome, round(area_km2)::int AS km2, metadados->'ras' AS ras
FROM geo.unidade_espacial
WHERE tipo_regionalizacao = 'zona_zee'
ORDER BY (metadados->>'zona')::int;
