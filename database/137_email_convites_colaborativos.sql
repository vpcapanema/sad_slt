-- Estados de transporte e retornos de email; não alteram julgamentos ou pesos.
CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_email (
    id UUID PRIMARY KEY,
    ambiente_id UUID NOT NULL REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    destinatario VARCHAR(254) NOT NULL,
    conteudo_hash VARCHAR(64) NOT NULL,
    mensagem_id TEXT NOT NULL UNIQUE,
    usuario_id TEXT NOT NULL,
    envio_status TEXT NOT NULL DEFAULT 'enviando'
        CHECK (envio_status IN ('enviando', 'aceito_smtp', 'falha', 'indeterminado')),
    detalhe TEXT NOT NULL DEFAULT '',
    dsn_solicitada BOOLEAN NOT NULL DEFAULT false,
    leitura_solicitada BOOLEAN NOT NULL DEFAULT false,
    entrega_status TEXT NOT NULL DEFAULT 'sem_confirmacao'
        CHECK (entrega_status IN ('sem_confirmacao', 'adiada', 'confirmada', 'falha')),
    leitura_status TEXT NOT NULL DEFAULT 'sem_confirmacao'
        CHECK (leitura_status IN ('sem_confirmacao', 'confirmada')),
    eventos JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ambiente_id, destinatario, conteudo_hash)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.comparacao_colaborativa_email TO slt_user;
