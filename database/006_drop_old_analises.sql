-- SLT — Remoção das tabelas antigas de análise AHP (ciclo "tudo em uma linha"),
-- substituídas pela separação em configuração (005) + hierarquização de projetos.
--
-- Executar conectado ao banco slt_db (após 005_schema_multicriterio.sql).
-- DROP CASCADE remove os triggers associados; as funções de trigger são removidas em seguida.

BEGIN;

DROP TABLE IF EXISTS ahp.analise_avulsa CASCADE;
DROP TABLE IF EXISTS ahp.analise_portfolio CASCADE;

DROP FUNCTION IF EXISTS ahp.fn_touch_analise_avulsa() CASCADE;
DROP FUNCTION IF EXISTS ahp.fn_touch_analise_portfolio() CASCADE;
DROP FUNCTION IF EXISTS auditoria.fn_registrar_auditoria_analise_avulsa() CASCADE;
DROP FUNCTION IF EXISTS auditoria.fn_registrar_auditoria_analise_portfolio() CASCADE;

COMMIT;
