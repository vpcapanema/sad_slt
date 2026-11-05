-- Uma comunicação lógica por colaborador e natureza, com histórico de tentativas.
ALTER TABLE ahp.comparacao_colaborativa_email
    ADD COLUMN IF NOT EXISTS natureza TEXT NOT NULL DEFAULT 'convite'
    CHECK (natureza IN ('convite', 'resposta'));
CREATE INDEX IF NOT EXISTS comparacao_colaborativa_email_colaborador_idx
    ON ahp.comparacao_colaborativa_email (ambiente_id, destinatario, natureza);
