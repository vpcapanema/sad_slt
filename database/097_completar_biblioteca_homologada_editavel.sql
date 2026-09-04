-- 097 — Conclui a autorização de manutenção administrativa iniciada pela 085.
--
-- A 085 declarou que exclusão na biblioteca de camadas homologadas é permitida
-- (ON DELETE CASCADE nas feições, GRANT DELETE, COMMENT na tabela) e derrubou
-- trg_gp_homologada_snapshot_imutavel, trg_gp_homologada_feicao_imutavel e
-- trg_gp_homologada_raster_imutavel.
--
-- Só que o gatilho que efetivamente bloqueia é o da 039 — trg_gp_homologada_imutavel,
-- BEFORE UPDATE OR DELETE em camada_homologada — cujo nome não constava daquela
-- lista. Com ele de pé, todo DELETE continuava abortando com "A biblioteca de
-- camadas homologadas é imutável", contradizendo o COMMENT da própria tabela.
--
-- Esta migração remove o gatilho remanescente, alinhando o comportamento à decisão
-- já tomada. Os gatilhos de conteúdo em camada/camada_feicao/camada_vetor/
-- camada_raster permanecem: eles protegem o dado da camada de origem, que a 085
-- não autorizou excluir.

BEGIN;

DROP TRIGGER IF EXISTS trg_gp_homologada_imutavel
    ON geoprocessamento.camada_homologada;

COMMIT;
