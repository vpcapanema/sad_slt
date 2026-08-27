BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_resposta
    ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'enviada',
    ADD COLUMN IF NOT EXISTS iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE ahp.comparacao_colaborativa_resposta
    ALTER COLUMN enviado_em DROP NOT NULL,
    ALTER COLUMN enviado_em DROP DEFAULT;

ALTER TABLE ahp.comparacao_colaborativa_resposta
    DROP CONSTRAINT IF EXISTS ck_comparacao_colaborativa_resposta_status;

ALTER TABLE ahp.comparacao_colaborativa_resposta
    ADD CONSTRAINT ck_comparacao_colaborativa_resposta_status
    CHECK (status IN ('em_preenchimento', 'enviada'));

COMMENT ON COLUMN ahp.comparacao_colaborativa_resposta.status IS
    'em_preenchimento desde a liberação do formulário; enviada somente após validação final.';

COMMIT;
