-- O codigo de acesso e distinto do token usado no link publico.
-- Julgamentos antigos recebem o codigo no primeiro envio de email apos a migracao.
ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS token_acesso VARCHAR(6)
        CHECK (token_acesso IS NULL OR token_acesso ~ '^[0-9]{6}$');

COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.token_acesso IS
    'Codigo de seis digitos compartilhado pelos convidados do julgamento; nao expor na API publica.';
