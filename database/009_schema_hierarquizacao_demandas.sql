-- SLT — Isolamento da camada de hierarquização de demandas.
-- Cria o schema hierarquizacao_demandas e move ahp.hierarquizacao_portfolio para dentro dele.
--
-- Executar conectado ao banco slt_db (após 008_move_dom_status_objeto.sql).
-- A FK config_id -> ahp.config_multicriterio_portfolio e os triggers
-- (ahp.fn_touch_multicriterio / auditoria.fn_registrar_auditoria_multicriterio)
-- permanecem válidos entre schemas.

BEGIN;

CREATE SCHEMA IF NOT EXISTS hierarquizacao_demandas;
COMMENT ON SCHEMA hierarquizacao_demandas IS
    'Camada de hierarquização (priorização) de demandas/projetos a partir de configurações homologadas';

ALTER TABLE ahp.hierarquizacao_portfolio SET SCHEMA hierarquizacao_demandas;

GRANT USAGE ON SCHEMA hierarquizacao_demandas TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hierarquizacao_demandas TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hierarquizacao_demandas TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA hierarquizacao_demandas
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
