BEGIN;

-- Atualiza somente o contrato original do seed, sem sobrescrever personalizacoes.
UPDATE geoprocessamento.modelo_geoprocessamento
SET definicao = jsonb_set(
        definicao,
        '{passos,1,parametros}',
        '{"raster_id":"$raster_id","nome_saida":"favorabilidade_normalizada","crs_saida":"entrada","destino":"storage","formato_saida":"GeoTIFF"}'::jsonb
    ),
    atualizado_em = CURRENT_TIMESTAMP
WHERE id = 'funcao_fase2_normalizar_exportar'
  AND tipo = 'funcao'
  AND definicao #>> '{passos,1,algoritmo_id}' = 'OP-26'
  AND definicao #> '{passos,1,parametros}' =
      '{"raster_id":"$raster_id","nome_arquivo":"favorabilidade_normalizada.tif","formato_saida":"GeoTIFF"}'::jsonb;

COMMIT;
