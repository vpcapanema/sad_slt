-- SLT — Renomeia as tabelas da camada de demandas aprovadas para nomes intuitivos.
--   demandas_aprovadas.objeto_ahp        -> demandas_aprovadas.demandas_aprovadas
--   demandas_aprovadas.dom_status_objeto -> demandas_aprovadas.dom_status_demandas_aprovadas
--
-- Executar conectado ao banco slt_db (após 009_schema_hierarquizacao_demandas.sql).
-- FKs e triggers continuam válidos (referenciam o objeto da tabela, não o nome).

BEGIN;

DO $$ BEGIN
    IF to_regclass('demandas_aprovadas.dom_status_objeto') IS NOT NULL
       AND to_regclass('demandas_aprovadas.dom_status_demandas_aprovadas') IS NULL THEN
        ALTER TABLE demandas_aprovadas.dom_status_objeto
            RENAME TO dom_status_demandas_aprovadas;
    END IF;

    IF to_regclass('demandas_aprovadas.objeto_ahp') IS NOT NULL
       AND to_regclass('demandas_aprovadas.demandas_aprovadas') IS NULL
       AND to_regclass('demandas_aprovadas.projetos') IS NULL THEN
        ALTER TABLE demandas_aprovadas.objeto_ahp
            RENAME TO demandas_aprovadas;
    END IF;

    IF to_regclass('demandas_aprovadas.demandas_aprovadas') IS NOT NULL THEN
        COMMENT ON TABLE demandas_aprovadas.demandas_aprovadas IS
            'Demandas aprovadas pelo administrador; universo elegível à hierarquização';
    END IF;
    IF to_regclass('demandas_aprovadas.dom_status_demandas_aprovadas') IS NOT NULL THEN
        COMMENT ON TABLE demandas_aprovadas.dom_status_demandas_aprovadas IS
            'Domínio de status das demandas aprovadas no fluxo de hierarquização';
    END IF;
END $$;

COMMIT;
