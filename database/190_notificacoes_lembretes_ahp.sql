BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS lembrete_notificacoes_ativas boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS lembrete_notificacoes_alteradas_em timestamptz;

COMMIT;
