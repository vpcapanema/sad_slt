-- 098 — Corrige a base legal do critério de áreas contaminadas (CETESB).
--
-- A seção 2 de /restrict/geoespacial/configuracao-risco-restricao/ é a regra, e
-- ela declara para "Áreas contaminadas" a Lei Estadual nº 13.577/2009 — proteção
-- da qualidade do solo e gerenciamento de áreas contaminadas —, verificada na
-- fonte em 2026-09-02.
--
-- A regra gravada trazia "Dec. Est. SP 8468/1976", que é a base legal da linha
-- vizinha da mesma tabela: a do embargo ambiental estadual registrado no SIGAM.
-- Base legal do critério ao lado, colada no critério errado. Como `classificar()`
-- carimba esse texto em cada feição, todo produto consolidado sairia atribuindo
-- às áreas contaminadas um regulamento que não as governa.
--
-- Referência: /restrict/geoespacial/configuracao-risco-restricao/, seção 2.

BEGIN;

UPDATE geoprocessamento.regra_classificacao_fase1
SET base_legal = 'Lei Est. SP 13577/2009; Dec. Est. SP 59263/2013',
    atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'interdicao_cetesb';

COMMIT;
