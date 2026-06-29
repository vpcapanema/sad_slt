-- Ambiente de preenchimento colaborativo da matriz pareada (Etapa 4/5 AHP).

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_ambiente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_tipo VARCHAR(16) NOT NULL CHECK (config_tipo IN ('avulsa', 'portfolio')),
    config_codigo VARCHAR(64) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    convites JSONB NOT NULL DEFAULT '[]'::jsonb,
    valido_ate TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ativa'
        CHECK (status IN ('ativa', 'encerrada', 'consolidada')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_resposta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambiente_id UUID NOT NULL
        REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    nome_completo VARCHAR(200) NOT NULL,
    email VARCHAR(320) NOT NULL,
    instituicao VARCHAR(300) NOT NULL,
    matriz_comparacao JSONB NOT NULL,
    lambda_max NUMERIC(12, 6),
    indice_consistencia NUMERIC(12, 6),
    indice_aleatorio NUMERIC(12, 6),
    razao_consistencia NUMERIC(12, 6),
    consistente BOOLEAN NOT NULL DEFAULT false,
    estatisticas JSONB NOT NULL DEFAULT '{}'::jsonb,
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ambiente_id, email)
);

CREATE INDEX IF NOT EXISTS idx_collab_ambiente_config
    ON ahp.comparacao_colaborativa_ambiente (config_tipo, config_codigo);

CREATE INDEX IF NOT EXISTS idx_collab_ambiente_token
    ON ahp.comparacao_colaborativa_ambiente (token);

CREATE INDEX IF NOT EXISTS idx_collab_resposta_ambiente
    ON ahp.comparacao_colaborativa_resposta (ambiente_id);

COMMENT ON TABLE ahp.comparacao_colaborativa_ambiente IS
    'Sessão de preenchimento colaborativo da matriz pareada AHP (link público por token).';
COMMENT ON TABLE ahp.comparacao_colaborativa_resposta IS
    'Resposta individual enviada por participante convidado (RC < 0,10 obrigatório).';

GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.comparacao_colaborativa_ambiente TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.comparacao_colaborativa_resposta TO slt_user;
