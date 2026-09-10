BEGIN;
CREATE TABLE IF NOT EXISTS geoprocessamento.execucao_arquivo (
 id uuid PRIMARY KEY,
 operacao text NOT NULL,
 responsavel text,
 parametros jsonb NOT NULL DEFAULT '{}',
 entradas jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL CHECK (status IN ('executando','concluido','erro','regularizacao')),
 iniciado_em timestamptz NOT NULL DEFAULT now(),
 finalizado_em timestamptz,
 erro text
);
CREATE TABLE IF NOT EXISTS geoprocessamento.arquivo_resultado (
 id uuid PRIMARY KEY,
 camada_id uuid NOT NULL UNIQUE REFERENCES geoprocessamento.camada_processada(id) ON DELETE RESTRICT,
 execucao_id uuid NOT NULL REFERENCES geoprocessamento.execucao_arquivo(id),
 caminho text NOT NULL UNIQUE CHECK (caminho LIKE 'data/geoespacial/outputs/%' AND caminho NOT LIKE '%..%'),
 sha256 varchar(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
 tamanho_bytes bigint NOT NULL CHECK (tamanho_bytes >= 0),
 formato text NOT NULL CHECK (formato IN ('GPKG','GTiff')),
 validacao jsonb NOT NULL,
 estado text NOT NULL DEFAULT 'resultado' CHECK (estado IN ('temporario','resultado','acervo','removido')),
 criado_em timestamptz NOT NULL DEFAULT now(),
 publicado_em timestamptz,
 publicado_por text,
 removido_em timestamptz,
 removido_por text
);
CREATE TABLE IF NOT EXISTS geoprocessamento.arquivo_resultado_uso (
 arquivo_id uuid NOT NULL REFERENCES geoprocessamento.arquivo_resultado(id),
 tipo text NOT NULL CHECK (tipo IN ('entrada','relatorio','homologacao')),
 referencia text NOT NULL,
 PRIMARY KEY (arquivo_id,tipo,referencia)
);
CREATE TABLE IF NOT EXISTS geoprocessamento.politica_retencao_arquivo (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 dias_temporarios integer CHECK (dias_temporarios BETWEEN 1 AND 3650),
 atualizado_em timestamptz NOT NULL DEFAULT now(),
 atualizado_por text
);
CREATE TABLE IF NOT EXISTS geoprocessamento.arquivo_exportado (
 id uuid PRIMARY KEY,
 execucao_id uuid NOT NULL REFERENCES geoprocessamento.execucao_arquivo(id),
 recurso_origem text NOT NULL,
 caminho text NOT NULL UNIQUE,
 componentes jsonb NOT NULL,
 validacao jsonb NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT now()
);
INSERT INTO geoprocessamento.politica_retencao_arquivo(id) VALUES (true) ON CONFLICT DO NOTHING;
GRANT SELECT,INSERT,UPDATE ON geoprocessamento.execucao_arquivo,geoprocessamento.arquivo_resultado,
 geoprocessamento.arquivo_resultado_uso,geoprocessamento.politica_retencao_arquivo,
 geoprocessamento.arquivo_exportado TO slt_user;
COMMIT;
