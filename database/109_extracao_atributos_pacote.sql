-- Extração de atributos: uma linha por execução, com tudo o que ela produziu.
--
-- A geometria resultante continua nas tabelas de feições de camada_processada
-- (camada_resultado_id). As bases vêm do storage do SICARD e ficam só como
-- referência, com a impressão digital do arquivo no momento da execução. O
-- pacote .zip (GeoPackage, relatórios PDF, XLSX e CSV) é gerado ao final de toda
-- extração e guardado aqui: nada da extração é gravado no disco da VM.
BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.extracao_atributos (
 execucao_id uuid PRIMARY KEY REFERENCES geoprocessamento.execucao_arquivo(id) ON DELETE CASCADE,
 nome_saida text NOT NULL,
 operacao text NOT NULL,
 responsavel text,
 entrada jsonb NOT NULL,
 entrada_geojson jsonb NOT NULL,
 bases jsonb NOT NULL DEFAULT '[]',
 camada_resultado_id text NOT NULL,
 relatorio jsonb NOT NULL,
 etapas jsonb NOT NULL DEFAULT '[]',
 pacote bytea NOT NULL,
 pacote_nome text NOT NULL,
 pacote_sha256 varchar(64) NOT NULL CHECK (pacote_sha256 ~ '^[0-9a-f]{64}$'),
 pacote_tamanho_bytes bigint NOT NULL CHECK (pacote_tamanho_bytes > 0),
 pacote_arquivos jsonb NOT NULL DEFAULT '[]',
 criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_extracao_atributos_responsavel
 ON geoprocessamento.extracao_atributos (responsavel, criado_em DESC);

COMMENT ON TABLE geoprocessamento.extracao_atributos IS
 'Uma linha por extração de atributos: entrada, procedência das bases, relatório, etapas e o pacote .zip de saída.';

GRANT SELECT,INSERT,UPDATE,DELETE ON geoprocessamento.extracao_atributos TO slt_user;

COMMIT;
