BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.ambiente_usuario (
    usuario_id UUID PRIMARY KEY,
    configuracao JSONB NOT NULL DEFAULT '{}'::jsonb,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

GRANT SELECT, INSERT, UPDATE ON geoprocessamento.ambiente_usuario TO slt_user;

COMMIT;