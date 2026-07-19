BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.modelo_geoprocessamento (
    id VARCHAR(160) PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('funcao','fluxo')),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    modulo VARCHAR(20) CHECK (modulo IN ('fase1','fase2','geral')),
    definicao JSONB NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_modelo_gp_tipo_modulo
    ON geoprocessamento.modelo_geoprocessamento (tipo, modulo, ativo);

INSERT INTO geoprocessamento.modelo_geoprocessamento (id,tipo,nome,descricao,modulo,definicao)
VALUES
('funcao_fase1_validar_camadas','funcao','Validar camadas da Fase 1','Valida separadamente as camadas de restrição e risco.','fase1',
 '{"id":"funcao_fase1_validar_camadas","nome":"Validar camadas da Fase 1","descricao":"Valida restrição e risco","modulo":"fase1","passos":[{"algoritmo_id":"OP-02","parametros":{"camada_id":"$camada_restricao_id"}},{"algoritmo_id":"OP-02","parametros":{"camada_id":"$camada_risco_id"}}]}'::jsonb),
('fluxo_fase1_elegibilidade','fluxo','Fluxo de elegibilidade territorial','Executa a função de validação e a sobreposição das camadas da Fase 1.','fase1',
 '{"id":"fluxo_fase1_elegibilidade","nome":"Fluxo de elegibilidade territorial","descricao":"Validação e sobreposição territorial","modulo":"fase1","itens":[{"funcao_id":"funcao_fase1_validar_camadas","parametros":{}},{"algoritmo_id":"OP-05","parametros":{"camada_id_1":"$camada_restricao_id","camada_id_2":"$camada_risco_id","tipo_overlay":"identity"}}]}'::jsonb),
('funcao_fase2_normalizar_exportar','funcao','Normalizar e exportar raster','Normaliza o raster de favorabilidade e prepara a saída GeoTIFF.','fase2',
 '{"id":"funcao_fase2_normalizar_exportar","nome":"Normalizar e exportar raster","descricao":"Normalização e exportação","modulo":"fase2","passos":[{"algoritmo_id":"OP-20","parametros":{"raster_id":"$raster_id","metodo_normalizacao":"linear"}},{"algoritmo_id":"OP-26","parametros":{"raster_id":"$raster_id","nome_arquivo":"favorabilidade_normalizada.tif","formato_saida":"GeoTIFF"}}]}'::jsonb),
('fluxo_fase2_favorabilidade','fluxo','Fluxo de favorabilidade territorial','Normaliza a superfície e amostra seus valores nas demandas.','fase2',
 '{"id":"fluxo_fase2_favorabilidade","nome":"Fluxo de favorabilidade territorial","descricao":"Normalização e amostragem","modulo":"fase2","itens":[{"funcao_id":"funcao_fase2_normalizar_exportar","parametros":{}},{"algoritmo_id":"OP-23","parametros":{"raster_id":"$raster_id","camada_pontos_id":"$camada_pontos_id"}}]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON geoprocessamento.modelo_geoprocessamento TO slt_user;

COMMIT;
