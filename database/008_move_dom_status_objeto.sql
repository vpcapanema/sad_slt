-- SLT — Move a tabela de domínio de status do objeto para a camada isolada.
-- Move ahp.dom_status_objeto -> demandas_aprovadas.dom_status_objeto.
--
-- Executar conectado ao banco slt_db (após 007_schema_demandas_aprovadas.sql).
-- A FK demandas_aprovadas.objeto_ahp.status -> dom_status_objeto continua válida
-- (constraints referenciam o objeto da tabela, não o nome qualificado por schema).

BEGIN;

ALTER TABLE ahp.dom_status_objeto SET SCHEMA demandas_aprovadas;

GRANT SELECT, INSERT, UPDATE, DELETE ON demandas_aprovadas.dom_status_objeto TO slt_user;

COMMIT;
