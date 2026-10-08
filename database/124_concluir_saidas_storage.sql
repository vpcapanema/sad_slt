-- Aplicar somente após atualizar todos os servidores que compartilham o banco.
-- 123 mantém compatibilidade de transição; esta migração retira conteúdo duplicado.
BEGIN;
LOCK TABLE geoprocessamento.camada_processada,
    geoprocessamento.arquivo_resultado,geoprocessamento.extracao_atributos
    IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE tabela text; quantidade bigint;
BEGIN
    FOREACH tabela IN ARRAY ARRAY['camada_processada_feicao','camada_processada_raster',
        'camada_homologada_feicao','camada_homologada_raster','camada_homologada']
    LOOP
        IF to_regclass('geoprocessamento.'||tabela) IS NOT NULL THEN
            EXECUTE format('LOCK TABLE geoprocessamento.%I IN ACCESS EXCLUSIVE MODE',tabela);
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM geoprocessamento.camada_processada c
        LEFT JOIN geoprocessamento.arquivo_resultado a ON a.camada_id=c.id
        WHERE c.storage_caminho IS NULL OR c.storage_caminho IS DISTINCT FROM a.caminho
          OR c.storage_caminho !~ '^saidas-geoespaciais/execucoes/[0-9a-f-]{36}/camadas/[^/]+$'
          OR a.sha256 IS NULL OR a.validacao->>'reaberto_gdal' IS DISTINCT FROM 'true') THEN
        RAISE EXCEPTION 'Existem saídas sem arquivo validado no Storage. Migre e confira antes de remover conteúdo do banco.';
    END IF;
    IF to_regclass('geoprocessamento.camada_processada_feicao') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM geoprocessamento.camada_processada_feicao f
            JOIN geoprocessamento.arquivo_resultado a ON a.camada_id=f.camada_id
            GROUP BY f.camada_id,a.validacao
            HAVING count(*) IS DISTINCT FROM (a.validacao->>'feicoes')::bigint) THEN
            RAISE EXCEPTION 'Contagem de feições no Storage diverge do conteúdo legado.';
        END IF;
    END IF;
    FOREACH tabela IN ARRAY ARRAY['camada_homologada_feicao','camada_homologada_raster','camada_homologada']
    LOOP
        IF to_regclass('geoprocessamento.'||tabela) IS NOT NULL THEN
            EXECUTE format('SELECT count(*) FROM geoprocessamento.%I',tabela) INTO quantidade;
            IF quantidade<>0 THEN
                RAISE EXCEPTION 'Tabela % ainda possui registros; nenhuma homologação será removida automaticamente.',tabela;
            END IF;
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM geoprocessamento.extracao_atributos
        WHERE pacote_caminho IS NULL OR relatorio_caminho IS NULL
          OR pacote_caminho NOT LIKE 'saidas-geoespaciais/execucoes/%/pacotes/%'
          OR relatorio_caminho NOT LIKE 'saidas-geoespaciais/execucoes/%/relatorios/%') THEN
        RAISE EXCEPTION 'Pacotes ou relatórios de extração ainda não foram migrados para o Storage.';
    END IF;
    IF EXISTS (SELECT 1 FROM geoprocessamento.arquivo_exportado
        WHERE validacao->>'reaberto_gdal'='true'
          AND caminho NOT LIKE 'saidas-geoespaciais/execucoes/%/camadas/%') THEN
        RAISE EXCEPTION 'Existem exportações geoespaciais ainda fora do Storage.';
    END IF;
END $$;
DROP TABLE IF EXISTS geoprocessamento.camada_processada_feicao RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.camada_processada_raster RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.camada_homologada_feicao RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.camada_homologada_raster RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.camada_homologada RESTRICT;
ALTER TABLE geoprocessamento.camada_processada
    DROP COLUMN IF EXISTS envelope,
    ALTER COLUMN storage_caminho SET NOT NULL;
ALTER TABLE geoprocessamento.extracao_atributos
    DROP COLUMN IF EXISTS pacote,
    DROP COLUMN IF EXISTS entrada_geojson,
    ALTER COLUMN pacote_caminho SET NOT NULL,
    ALTER COLUMN relatorio_caminho SET NOT NULL;
ALTER TABLE geoprocessamento.arquivo_resultado
    DROP CONSTRAINT IF EXISTS ck_arquivo_resultado_destino,
    ADD CONSTRAINT ck_arquivo_resultado_destino CHECK (
        estado='removido' OR (caminho LIKE 'saidas-geoespaciais/execucoes/%/camadas/%'
        AND caminho NOT LIKE '%..%'));
UPDATE geoprocessamento.camada_processada c SET formato=a.formato
    FROM geoprocessamento.arquivo_resultado a WHERE a.camada_id=c.id;
COMMENT ON TABLE geoprocessamento.camada_processada IS
    'Catálogo de metadados das saídas; conteúdo vetorial e raster exclusivamente no Sicard Storage.';
COMMENT ON TABLE geoprocessamento.extracao_atributos IS
    'Metadados e referências de extração; pacote e relatório completo no Sicard Storage.';
COMMIT;
