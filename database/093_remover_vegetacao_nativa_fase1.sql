-- 093 — Retira a vegetação nativa da Fase 1.
--
-- A camada "Vegetação nativa mapeada" deixa de compor a triagem territorial:
-- sai das camadas de risco e restrição e de qualquer classificação associada.
-- O arcabouço teórico-conceitual passa a declarar sete camadas de restrição e
-- treze de risco, vinte no total.
--
-- As regras vieram da migração 046 e são removidas aqui, e não lá, porque 046
-- já foi aplicada.

BEGIN;

DELETE FROM geoprocessamento.regra_classificacao_fase1
WHERE criterio_id = 'vegetacao_protegida';

DELETE FROM geoprocessamento.fonte_fase1
WHERE criterio_id_padrao = 'vegetacao_protegida';

COMMIT;
