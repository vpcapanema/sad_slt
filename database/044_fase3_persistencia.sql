BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.atributo_fase3 (
    atributo_id VARCHAR(160) PRIMARY KEY,
    nome_coluna VARCHAR(160) NOT NULL UNIQUE,
    rotulo VARCHAR(240) NOT NULL,
    definicao JSONB NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.rodada_fase3 (
    rodada_id VARCHAR(180) PRIMARY KEY,
    versao VARCHAR(80) NOT NULL,
    arquivo_origem TEXT NOT NULL,
    data_importacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_homologacao TIMESTAMPTZ,
    responsavel TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'validado', 'homologado', 'arquivado')),
    dados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gp_rodada_fase3_status
    ON geoprocessamento.rodada_fase3 (status, data_importacao DESC);

GRANT SELECT, INSERT, UPDATE, DELETE
    ON geoprocessamento.atributo_fase3, geoprocessamento.rodada_fase3 TO slt_user;

COMMIT;
