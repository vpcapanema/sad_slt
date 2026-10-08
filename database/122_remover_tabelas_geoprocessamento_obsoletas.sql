-- Retira estruturas vazias do armazenamento anterior de camadas e da
-- execução por etapas, substituídos pelo catálogo segregado e execucao_arquivo.
-- Não retira tabelas ainda consultadas pelos fluxos de homologação existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
    nome text;
    tem_dados boolean;
BEGIN
    FOREACH nome IN ARRAY ARRAY[
        'camada_feicao', 'camada_vetor', 'camada_raster',
        'mensagem_execucao', 'execucao_etapa', 'produto_homologado_fase1'
    ] LOOP
        IF to_regclass('geoprocessamento.' || nome) IS NOT NULL THEN
            EXECUTE format('LOCK TABLE geoprocessamento.%I IN ACCESS EXCLUSIVE MODE', nome);
            EXECUTE format('SELECT EXISTS (SELECT 1 FROM geoprocessamento.%I)', nome) INTO tem_dados;
            IF tem_dados THEN
                RAISE EXCEPTION 'Tabela geoprocessamento.% contém dados; migre-os antes da remoção', nome;
            END IF;
        END IF;
    END LOOP;

    -- Os validadores antigos consultam camada_vetor/camada_raster. Só podem
    -- ser retirados quando o catálogo legado também estiver vazio.
    IF EXISTS (SELECT 1 FROM geoprocessamento.camada) THEN
        RAISE EXCEPTION 'Catálogo legado geoprocessamento.camada contém dados; migre-os antes da remoção';
    END IF;
END $$;

DROP TRIGGER IF EXISTS trg_gp_camada_conteudo_obrigatorio ON geoprocessamento.camada;
DROP TABLE IF EXISTS geoprocessamento.mensagem_execucao RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.execucao_etapa RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.produto_homologado_fase1 RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.camada_feicao RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.camada_vetor RESTRICT;
DROP TABLE IF EXISTS geoprocessamento.camada_raster RESTRICT;
DROP FUNCTION IF EXISTS geoprocessamento.fn_validar_conteudo_camada() RESTRICT;
DROP FUNCTION IF EXISTS geoprocessamento.fn_validar_remocao_conteudo_camada() RESTRICT;
COMMIT;
