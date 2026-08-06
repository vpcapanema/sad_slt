BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.portal_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(8) NOT NULL CHECK (tipo IN ('WMS', 'WFS')),
    url TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.portal_favorito_usuario (
    usuario_id UUID NOT NULL,
    servico_id UUID NOT NULL REFERENCES geoprocessamento.portal_servico(id) ON DELETE CASCADE,
    camada VARCHAR(300) NOT NULL DEFAULT '',
    titulo VARCHAR(300),
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, servico_id, camada)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON geoprocessamento.portal_servico TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON geoprocessamento.portal_favorito_usuario TO slt_user;

COMMIT;