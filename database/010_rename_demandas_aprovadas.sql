-- SLT — Renomeia as tabelas da camada de demandas aprovadas para nomes intuitivos.
--   demandas_aprovadas.objeto_ahp        -> demandas_aprovadas.demandas_aprovadas
--   demandas_aprovadas.dom_status_objeto -> demandas_aprovadas.dom_status_demandas_aprovadas
--
-- Executar conectado ao banco slt_db (após 009_schema_hierarquizacao_demandas.sql).
-- FKs e triggers continuam válidos (referenciam o objeto da tabela, não o nome).

BEGIN;

ALTER TABLE demandas_aprovadas.dom_status_objeto
    RENAME TO dom_status_demandas_aprovadas;

ALTER TABLE demandas_aprovadas.objeto_ahp
    RENAME TO demandas_aprovadas;

COMMENT ON TABLE demandas_aprovadas.demandas_aprovadas IS
    'Demandas aprovadas pelo administrador; universo elegível à hierarquização';
COMMENT ON TABLE demandas_aprovadas.dom_status_demandas_aprovadas IS
    'Domínio de status das demandas aprovadas no fluxo de hierarquização';

COMMIT;
