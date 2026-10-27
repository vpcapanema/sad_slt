INSERT INTO demandas.dom_status_demanda (codigo, nome, descricao, ordem, ativo, fase)
VALUES ('hierarq_aguardando_complementacao',
 'Em hierarquização: aguardando complementação de atributos',
 'Pendências dos atributos da demanda na hierarquização; não reabre a avaliação cadastral.',
 85, TRUE, 'hierarquizacao')
ON CONFLICT (codigo) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao,
 fase=EXCLUDED.fase, ordem=EXCLUDED.ordem, ativo=TRUE;

-- Handoff dedicado: estas mudancas nunca sao oferecidas no PATCH administrativo.
INSERT INTO demandas.dom_status_demanda_transicao (status_origem, status_destino, via_aprovar)
VALUES
 ('analise_aprovada','hierarq_aguardando_complementacao',TRUE),
 ('hierarq_em_andamento','hierarq_aguardando_complementacao',TRUE),
 ('hierarq_aguardando_complementacao','hierarq_em_andamento',TRUE)
ON CONFLICT (status_origem,status_destino) DO UPDATE SET via_aprovar=TRUE;

ALTER TABLE demandas.solicitacao_complementacao_demanda
 ADD COLUMN IF NOT EXISTS notificacao jsonb NOT NULL DEFAULT '{}'::jsonb;
