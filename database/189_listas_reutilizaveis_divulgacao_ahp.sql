BEGIN;

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_divulgacao_lista (
    id uuid PRIMARY KEY,
    nome varchar(120) NOT NULL CHECK (btrim(nome) <> ''),
    destinatarios jsonb NOT NULL CHECK (jsonb_typeof(destinatarios) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS comparacao_colaborativa_divulgacao_lista_nome_uidx
    ON ahp.comparacao_colaborativa_divulgacao_lista (lower(nome));

DO $$
DECLARE
    papel text;
BEGIN
    FOR papel IN SELECT rolname FROM pg_roles WHERE rolname IN ('slt_user', 'sigma_user') LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON ahp.comparacao_colaborativa_divulgacao_lista TO %I', papel);
    END LOOP;
END $$;

COMMIT;
