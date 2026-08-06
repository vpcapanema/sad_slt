BEGIN;

ALTER TABLE geoprocessamento.portal_servico
    DROP CONSTRAINT IF EXISTS portal_servico_tipo_check;
ALTER TABLE geoprocessamento.portal_servico
    ADD CONSTRAINT portal_servico_tipo_check
    CHECK (tipo IN ('WMS', 'WFS', 'WMTS', 'XYZ', 'STAC', 'OGCAPI'));

INSERT INTO geoprocessamento.portal_servico (nome, tipo, url, descricao, metadados)
VALUES
    ('INPE BDC - imagens e cubos do Brasil', 'STAC', 'https://data.inpe.br/bdc/stac/v1/',
     'Catálogo público do INPE: CBERS, Amazônia-1, Sentinel, Landsat, MODIS, mosaicos e Topodata.',
     '{"gratuito":true,"tema":"imagens de satélite e séries históricas","provedor":"INPE","colecoes":"CBERS, Amazônia-1, Sentinel, Landsat, MODIS, Topodata"}'::jsonb),
    ('Earth Search - Sentinel e Landsat', 'STAC', 'https://earth-search.aws.element84.com/v1',
     'Catálogo público STAC com Sentinel-1, Sentinel-2, Landsat Collection 2 e modelos de elevação.',
     '{"gratuito":true,"tema":"imagens de satélite e séries históricas","provedor":"Element 84 / AWS Open Data","colecoes":"Sentinel-1, Sentinel-2, Landsat C2, Copernicus DEM"}'::jsonb),
    ('Microsoft Planetary Computer', 'STAC', 'https://planetarycomputer.microsoft.com/api/stac/v1',
     'Catálogo STAC público de dados de ciência da Terra, incluindo coleções Sentinel, Landsat e uso e cobertura.',
     '{"gratuito":true,"tema":"imagens, uso e cobertura do solo","provedor":"Microsoft Planetary Computer"}'::jsonb),
    ('Copernicus Data Space Ecosystem', 'STAC', 'https://stac.dataspace.copernicus.eu/v1/',
     'Catálogo STAC de observação da Terra com coleções Sentinel. A consulta é aberta; alguns downloads podem exigir conta gratuita.',
     '{"gratuito":true,"tema":"séries históricas Sentinel","provedor":"Copernicus","cadastro_gratuito_para_download":true}'::jsonb),
    ('NASA GIBS - VIIRS True Color diário', 'WMTS', 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2026-08-04/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
     'Mosaico global diário de reflectância em cor natural, pronto para visualização no mapa.',
     '{"gratuito":true,"tema":"imagem de satélite diária","provedor":"NASA GIBS","camada":"VIIRS_SNPP_CorrectedReflectance_TrueColor"}'::jsonb),
    ('OpenStreetMap - rede viária e feições', 'OGCAPI', 'https://overpass-api.de/api/interpreter',
     'API pública Overpass para consultar estradas, vias, edifícios, hidrografia e demais feições OpenStreetMap.',
     '{"gratuito":true,"tema":"rede rodoviária e infraestrutura","provedor":"OpenStreetMap / Overpass","licenca":"ODbL"}'::jsonb)
ON CONFLICT (url) DO UPDATE
    SET nome=EXCLUDED.nome, tipo=EXCLUDED.tipo, descricao=EXCLUDED.descricao,
        metadados=EXCLUDED.metadados, ativo=TRUE, atualizado_em=CURRENT_TIMESTAMP;

COMMIT;