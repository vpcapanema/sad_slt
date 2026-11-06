-- Registra o primeiro acesso ao link do convite, independente do servidor de e-mail.
ALTER TABLE ahp.comparacao_colaborativa_email
    ADD COLUMN IF NOT EXISTS link_acessado_em TIMESTAMPTZ;
