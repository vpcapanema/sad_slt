BEGIN;

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_email_rascunho (
    id uuid PRIMARY KEY,
    ambiente_id uuid NOT NULL REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    editor_id text NOT NULL,
    assunto varchar(200) NOT NULL,
    alias_remetente varchar(200) NOT NULL,
    texto text NOT NULL,
    operacao_id uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_ahp_rascunho_pendente
    ON ahp.comparacao_colaborativa_email_rascunho (ambiente_id, editor_id)
    WHERE operacao_id IS NULL;

DO $$
DECLARE papel text;
BEGIN
    FOR papel IN SELECT rolname FROM pg_roles WHERE rolname IN ('slt_user', 'sigma_user') LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON ahp.comparacao_colaborativa_email_rascunho TO %I', papel);
    END LOOP;
END $$;

COMMIT;
