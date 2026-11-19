-- Configuração efetivamente usada no envio dos convites de cada julgamento.
ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS email_remetente_alias VARCHAR(200) NOT NULL DEFAULT 'SICARD-PLI',
    ADD COLUMN IF NOT EXISTS email_assunto VARCHAR(200) NOT NULL
        DEFAULT 'Convite para preenchimento colaborativo AHP - PLI - SICARD',
    ADD COLUMN IF NOT EXISTS email_mensagem TEXT;

COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.email_remetente_alias IS
    'Nome exibido ao destinatário no cabeçalho From dos convites do julgamento.';
COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.email_assunto IS
    'Assunto persistido e efetivamente enviado nos convites do julgamento.';
COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.email_mensagem IS
    'Corpo persistido e efetivamente enviado, antes da chave individual acrescentada pelo servidor.';
