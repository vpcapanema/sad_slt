-- SLT — remove os schemas legados de demanda, consolidando tudo em demandas.*.
--
-- Contexto: o modelo dual foi colapsado pela migração 015 (cadastro.* +
-- demandas_aprovadas.* -> demandas.*). Em bancos que passaram por reaplicações
-- parciais das migrações antigas (002/007/010/012/013/014), os schemas legados
-- "cadastro" e "demandas_aprovadas" podem ter sido recriados vazios, sem que a
-- 015 os removesse de novo. A aplicação usa exclusivamente demandas.*; estes
-- schemas ficam órfãos e devem ser eliminados.
--
-- Segurança: nenhuma FK ou view de outro schema depende dos legados; ambos
-- estão vazios no ambiente atual. O CASCADE afeta apenas objetos internos.
--
-- Idempotente: pode ser reaplicada com segurança (DROP ... IF EXISTS).

BEGIN;

DROP SCHEMA IF EXISTS demandas_aprovadas CASCADE;
DROP SCHEMA IF EXISTS cadastro CASCADE;

COMMIT;
