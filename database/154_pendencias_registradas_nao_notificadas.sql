-- Registrar uma pendência não comprova comunicação ao representante.
ALTER TABLE demandas.solicitacao_complementacao_demanda
 DROP CONSTRAINT IF EXISTS solicitacao_complementacao_demanda_status_check;

UPDATE demandas.solicitacao_complementacao_demanda
 SET status='registrada', revisao=revisao+1, atualizado_em=now(),
     historico_edicoes=historico_edicoes || jsonb_build_array(jsonb_build_object(
       'revisao',revisao,'por',NULL,'em',now(),'origem','migracao_154',
       'valores',jsonb_build_object('status',status),
       'alteracoes',jsonb_build_object('status','registrada')))
 WHERE status='solicitada';

ALTER TABLE demandas.solicitacao_complementacao_demanda
 ALTER COLUMN status SET DEFAULT 'registrada',
 ALTER COLUMN notificacao SET DEFAULT '{"status":"nao_enviado"}'::jsonb,
 ADD CONSTRAINT solicitacao_complementacao_demanda_status_check
 CHECK (status IN ('registrada','atendida'));

UPDATE demandas.solicitacao_complementacao_demanda
 SET notificacao=jsonb_set(COALESCE(notificacao,'{}'::jsonb),'{status}',
   CASE WHEN COALESCE(notificacao->>'id_mensagem','') <> ''
          OR notificacao->>'enviado_em' IS NOT NULL
          OR jsonb_array_length(COALESCE(notificacao->'eventos','[]'::jsonb)) > 0
     THEN '"indeterminado"'::jsonb ELSE '"nao_enviado"'::jsonb END)
 WHERE COALESCE(notificacao->>'status','')='';

DROP INDEX IF EXISTS demandas.uq_solicitacao_complementacao_contexto_aberto;
CREATE UNIQUE INDEX uq_solicitacao_complementacao_contexto_aberto
 ON demandas.solicitacao_complementacao_demanda
 (demanda_tipo,demanda_codigo,coalesce(hierarquizacao_codigo,''))
 WHERE status='registrada';

COMMENT ON COLUMN demandas.solicitacao_complementacao_demanda.status
 IS 'Ciclo interno do registro: registrada ou atendida. Não comprova notificação.';
COMMENT ON COLUMN demandas.solicitacao_complementacao_demanda.notificacao
 IS 'Estado e auditoria da comunicação. nao_enviado não equivale a enviada; aceito_smtp depende do retorno SMTP.';
