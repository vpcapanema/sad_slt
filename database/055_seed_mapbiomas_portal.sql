BEGIN;

ALTER TABLE geoprocessamento.portal_servico
    ALTER COLUMN tipo TYPE VARCHAR(16);
ALTER TABLE geoprocessamento.portal_servico
    DROP CONSTRAINT IF EXISTS portal_servico_tipo_check;
ALTER TABLE geoprocessamento.portal_servico
    ADD CONSTRAINT portal_servico_tipo_check
    CHECK (tipo IN ('WMS', 'WFS', 'WMTS', 'XYZ', 'STAC', 'OGCAPI', 'MAPBIOMAS'));

INSERT INTO geoprocessamento.portal_servico (nome, tipo, url, descricao, metadados)
VALUES (
    'MapBiomas Brasil - cobertura e uso anual da terra',
    'MAPBIOMAS',
    'https://brasil.mapbiomas.org/colecoes-mapbiomas/',
    'Séries anuais públicas de cobertura e uso da terra do Brasil: Coleção 10.1 (30 m, 1985-2024) e Coleção 3 beta (10 m, 2017-2024).',
    '{"gratuito":true,"tema":"uso e cobertura da terra","provedor":"MapBiomas Brasil","licenca":"CC-BY","colecoes":"10.1 (30 m, 1985-2024); 3 beta (10 m, 2017-2024)"}'::jsonb
)
ON CONFLICT (url) DO UPDATE
    SET nome=EXCLUDED.nome, tipo=EXCLUDED.tipo, descricao=EXCLUDED.descricao,
        metadados=EXCLUDED.metadados, ativo=TRUE, atualizado_em=CURRENT_TIMESTAMP;

COMMIT;