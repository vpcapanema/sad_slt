BEGIN;

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_fila (
    inscricao_id uuid PRIMARY KEY REFERENCES ahp.comparacao_colaborativa_inscricao(id) ON DELETE CASCADE,
    ordem bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    admitida boolean NOT NULL DEFAULT false,
    expira_em timestamptz NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.comparacao_colaborativa_fila TO slt_user;
GRANT USAGE ON SEQUENCE ahp.comparacao_colaborativa_fila_ordem_seq TO slt_user;

COMMIT;
