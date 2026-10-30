-- Os códigos compartilhados antigos deixam de autorizar qualquer acesso.
BEGIN;
CREATE TABLE IF NOT EXISTS ahp.convite_individual (
    ambiente_id uuid NOT NULL REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    email text NOT NULL,
    segredo_hash text NOT NULL,
    emitido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    revogado_em timestamptz,
    PRIMARY KEY (ambiente_id, email)
);
UPDATE ahp.comparacao_colaborativa_ambiente SET token_acesso = NULL;
COMMIT;
