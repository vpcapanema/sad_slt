-- SLT — Isolamento da camada de demandas aprovadas.
-- Cria o schema demandas_aprovadas e move ahp.objeto_ahp para dentro dele.
--
-- Executar conectado ao banco slt_db (após 006_drop_old_analises.sql).
-- Observações:
--   - ALTER TABLE ... SET SCHEMA move índices, constraints e triggers junto.
--   - As FKs para ahp.dom_status_objeto e cadastro.cadastro_demanda continuam
--     válidas (FKs entre schemas são suportadas).
--   - As funções de trigger (ahp.fn_touch_objeto_ahp e
--     auditoria.fn_registrar_auditoria_objeto_ahp) permanecem onde estão e
--     continuam sendo chamadas normalmente.

BEGIN;

CREATE SCHEMA IF NOT EXISTS demandas_aprovadas;
COMMENT ON SCHEMA demandas_aprovadas IS
    'Camada isolada das demandas aprovadas (objetos elegíveis à hierarquização)';

ALTER TABLE ahp.objeto_ahp SET SCHEMA demandas_aprovadas;

GRANT USAGE ON SCHEMA demandas_aprovadas TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA demandas_aprovadas TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA demandas_aprovadas TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA demandas_aprovadas
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
