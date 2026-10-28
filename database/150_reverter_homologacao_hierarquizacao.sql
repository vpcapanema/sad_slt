-- Permite reverter a homologacao: a rodada volta de 'homologada' a 'calculada'
-- e suas demandas voltam de 'hierarq_finalizada' a 'hierarq_em_andamento'.
BEGIN;

INSERT INTO hierarquizacao_demandas.dom_status_hierarquizacao_transicao
    (status_origem, status_destino, via_homologar)
VALUES ('homologada', 'calculada', TRUE)
ON CONFLICT (status_origem, status_destino) DO UPDATE SET
    via_homologar = EXCLUDED.via_homologar;

INSERT INTO demandas.dom_status_demanda_transicao (status_origem, status_destino, via_aprovar)
VALUES ('hierarq_finalizada', 'hierarq_em_andamento', FALSE)
ON CONFLICT (status_origem, status_destino) DO NOTHING;

COMMIT;
