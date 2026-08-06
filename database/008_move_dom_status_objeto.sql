-- SLT — Move a tabela de domínio de status do objeto para a camada isolada.
-- Move ahp.dom_status_objeto -> demandas_aprovadas.dom_status_objeto.
--
-- Executar conectado ao banco slt_db (após 007_schema_demandas_aprovadas.sql).
-- A FK demandas_aprovadas.objeto_ahp.status -> dom_status_objeto continua válida
-- (constraints referenciam o objeto da tabela, não o nome qualificado por schema).

BEGIN;

DO $$
BEGIN
    IF to_regclass('demandas_aprovadas.dom_status_objeto') IS NULL
       AND to_regclass('demandas_aprovadas.dom_status_demandas_aprovadas') IS NULL THEN
        ALTER TABLE ahp.dom_status_objeto SET SCHEMA demandas_aprovadas;
    ELSIF to_regclass('ahp.dom_status_objeto') IS NOT NULL THEN
        -- A migration 003 recria e popula apenas a cópia legada em reaplicações.
        -- A tabela definitiva já existente no destino deve ser preservada.
        DROP TABLE ahp.dom_status_objeto;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('demandas_aprovadas.dom_status_objeto') IS NOT NULL THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON demandas_aprovadas.dom_status_objeto TO slt_user;
    ELSIF to_regclass('demandas_aprovadas.dom_status_demandas_aprovadas') IS NOT NULL THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON demandas_aprovadas.dom_status_demandas_aprovadas TO slt_user;
    END IF;
END $$;

COMMIT;
