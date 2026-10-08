BEGIN;
ALTER TABLE geoprocessamento.camada_processada
    ADD COLUMN IF NOT EXISTS storage_caminho text;
ALTER TABLE geoprocessamento.extracao_atributos
    ADD COLUMN IF NOT EXISTS pacote_caminho text,
    ADD COLUMN IF NOT EXISTS relatorio_caminho text;
ALTER TABLE geoprocessamento.extracao_atributos ALTER COLUMN pacote DROP NOT NULL;
ALTER TABLE geoprocessamento.extracao_atributos ALTER COLUMN entrada_geojson
    SET DEFAULT '{"type":"FeatureCollection","features":[]}'::jsonb;
DO $$
DECLARE item record;
BEGIN
    FOR item IN SELECT conname FROM pg_constraint
        WHERE conrelid='geoprocessamento.arquivo_resultado'::regclass AND contype='c'
          AND pg_get_constraintdef(oid) LIKE '%data/geoespacial/outputs/%'
    LOOP
        EXECUTE format('ALTER TABLE geoprocessamento.arquivo_resultado DROP CONSTRAINT %I', item.conname);
    END LOOP;
END $$;
ALTER TABLE geoprocessamento.arquivo_resultado
    DROP CONSTRAINT IF EXISTS ck_arquivo_resultado_destino,
    ADD CONSTRAINT ck_arquivo_resultado_destino CHECK (
        (caminho LIKE 'saidas-geoespaciais/execucoes/%' OR caminho LIKE 'data/geoespacial/outputs/%')
        AND caminho NOT LIKE '%..%');
COMMIT;
