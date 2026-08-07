-- SLT — remove o status hierarq_apta ("Apta à hierarquização" / "aguardando
-- hierarquização"), consolidando o handoff na fase de análise.
--
-- Decisão: a ação Aprovar deixa de promover para hierarq_apta e passa a
-- promover a demanda para analise_aprovada ("Aprovada"). O universo comparável
-- da hierarquização (AHP) passa a ser lido a partir de analise_aprovada; a
-- entrada em rodada continua sendo hierarq_em_andamento.
--
-- Idempotente: pode ser reaplicada com segurança.

BEGIN;

-- 1) Migra demandas atualmente em hierarq_apta -> analise_aprovada.
UPDATE demandas.projeto  SET status = 'analise_aprovada' WHERE status = 'hierarq_apta';
UPDATE demandas.programa SET status = 'analise_aprovada' WHERE status = 'hierarq_apta';
UPDATE demandas.plano    SET status = 'analise_aprovada' WHERE status = 'hierarq_apta';

-- 2) Recria as transições que passavam por hierarq_apta, agora a partir de
--    analise_aprovada (aprovação, entrada em rodada e transversais).
INSERT INTO demandas.dom_status_demanda_transicao (status_origem, status_destino, via_aprovar)
SELECT v.origem, v.destino, v.via
FROM (VALUES
    ('analise_em_avaliacao', 'analise_aprovada',     TRUE),
    ('analise_aprovada',     'hierarq_em_andamento', FALSE),
    ('analise_aprovada',     'hierarq_suspensa',     FALSE),
    ('analise_aprovada',     'hierarq_retirada',     FALSE),
    ('hierarq_suspensa',     'analise_aprovada',     FALSE)
) AS v(origem, destino, via)
WHERE NOT EXISTS (
    SELECT 1 FROM demandas.dom_status_demanda_transicao t
    WHERE t.status_origem = v.origem AND t.status_destino = v.destino
);

-- 2.1) Garante que a promoção para "aprovada" seja handoff dedicado (via_aprovar),
--      para não aparecer como destino no PATCH administrativo comum.
UPDATE demandas.dom_status_demanda_transicao
   SET via_aprovar = TRUE
 WHERE status_origem = 'analise_em_avaliacao' AND status_destino = 'analise_aprovada';

-- 3) Remove todas as transições que referenciam hierarq_apta.
DELETE FROM demandas.dom_status_demanda_transicao
WHERE status_origem = 'hierarq_apta' OR status_destino = 'hierarq_apta';

-- 4) Remove o status do domínio (sem mais linhas nem FKs apontando para ele).
DELETE FROM demandas.dom_status_demanda WHERE codigo = 'hierarq_apta';

COMMIT;
