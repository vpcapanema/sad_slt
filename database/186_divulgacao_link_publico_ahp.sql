BEGIN;

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_divulgacao (
    ambiente_id uuid NOT NULL REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    email varchar(254) NOT NULL CHECK (email = lower(btrim(email))),
    nome varchar(200) NOT NULL CHECK (btrim(nome) <> ''),
    criado_em timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (ambiente_id, email)
);

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_divulgacao_mensagem (
    ambiente_id uuid PRIMARY KEY REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    assunto varchar(200) NOT NULL,
    texto varchar(49000) NOT NULL
);

ALTER TABLE ahp.comparacao_colaborativa_email
    DROP CONSTRAINT IF EXISTS comparacao_colaborativa_email_natureza_check;
ALTER TABLE ahp.comparacao_colaborativa_email
    ADD CONSTRAINT comparacao_colaborativa_email_natureza_check
    CHECK (natureza IN ('convite', 'resposta', 'divulgacao'));

DO $$
DECLARE
    papel text;
BEGIN
    FOR papel IN SELECT rolname FROM pg_roles WHERE rolname IN ('slt_user', 'sigma_user') LOOP
        EXECUTE format('GRANT SELECT, INSERT ON ahp.comparacao_colaborativa_divulgacao TO %I', papel);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON ahp.comparacao_colaborativa_divulgacao_mensagem TO %I', papel);
    END LOOP;
END $$;

COMMIT;
