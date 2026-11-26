BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_email
    ADD COLUMN IF NOT EXISTS smtp_aceito_em timestamptz;

UPDATE ahp.comparacao_colaborativa_email
   SET smtp_aceito_em = criado_em
 WHERE envio_status = 'aceito_smtp' AND smtp_aceito_em IS NULL;

CREATE INDEX IF NOT EXISTS ahp_email_primeiro_convite_divulgacao
    ON ahp.comparacao_colaborativa_email (ambiente_id, destinatario, smtp_aceito_em)
    WHERE natureza = 'divulgacao' AND envio_status = 'aceito_smtp';

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS lembrete_prazo_alterado_em timestamptz NOT NULL DEFAULT statement_timestamp();

CREATE OR REPLACE FUNCTION ahp.registrar_alteracao_prazo_lembrete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.lembrete_prazo_alterado_em := clock_timestamp();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ahp_registrar_alteracao_prazo_lembrete ON ahp.comparacao_colaborativa_ambiente;
CREATE TRIGGER ahp_registrar_alteracao_prazo_lembrete
    BEFORE UPDATE OF valido_ate ON ahp.comparacao_colaborativa_ambiente
    FOR EACH ROW WHEN (OLD.valido_ate IS DISTINCT FROM NEW.valido_ate)
    EXECUTE FUNCTION ahp.registrar_alteracao_prazo_lembrete();

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_lembrete_config (
    ambiente_id uuid PRIMARY KEY REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    faixas jsonb NOT NULL CHECK (jsonb_typeof(faixas) = 'array' AND jsonb_array_length(faixas) > 0),
    atualizado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    usuario_id text NOT NULL
);

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_lembrete_envio (
    ambiente_id uuid NOT NULL REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    destinatario varchar(254) NOT NULL,
    previsto_em timestamptz NOT NULL,
    percentual double precision NOT NULL CHECK (percentual > 0 AND percentual < 100),
    mensagem_id text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'enviando'
        CHECK (status IN ('enviando', 'aceito_smtp', 'falha', 'indeterminado', 'cancelado')),
    detalhe text NOT NULL DEFAULT '',
    criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    finalizado_em timestamptz,
    PRIMARY KEY (ambiente_id, destinatario, previsto_em)
);

DO $$
DECLARE
    papel text;
BEGIN
    FOR papel IN SELECT rolname FROM pg_roles WHERE rolname IN ('slt_user', 'sigma_user') LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON ahp.comparacao_colaborativa_lembrete_config TO %I', papel);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON ahp.comparacao_colaborativa_lembrete_envio TO %I', papel);
    END LOOP;
END $$;

COMMIT;
