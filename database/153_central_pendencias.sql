-- Campos de negócio separados da comunicação externa e trilha de revisões.
ALTER TABLE demandas.solicitacao_complementacao_demanda
 ADD COLUMN IF NOT EXISTS parecer_tecnico text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS mensagem_gestor text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS revisao integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS atualizado_por uuid,
 ADD COLUMN IF NOT EXISTS atualizado_em timestamptz,
 ADD COLUMN IF NOT EXISTS historico_edicoes jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN demandas.solicitacao_complementacao_demanda.parecer_tecnico
 IS 'Parecer interno. Não encaminhar ao solicitante.';
COMMENT ON COLUMN demandas.solicitacao_complementacao_demanda.mensagem_gestor
 IS 'Comunicação externa ao solicitante. Descrição legada permanece como motivo.';
