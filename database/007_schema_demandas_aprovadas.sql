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

DO $$
BEGIN
    IF to_regclass('demandas_aprovadas.objeto_ahp') IS NULL
       AND to_regclass('demandas_aprovadas.projetos') IS NULL THEN
        ALTER TABLE ahp.objeto_ahp SET SCHEMA demandas_aprovadas;
    ELSIF to_regclass('ahp.objeto_ahp') IS NOT NULL THEN
        -- Em uma reaplicação, a migration 003 recria esta tabela legada vazia.
        IF EXISTS (SELECT 1 FROM ahp.objeto_ahp LIMIT 1) THEN
            RAISE EXCEPTION
                'Tabela legada ahp.objeto_ahp contém dados; migração manual necessária';
        END IF;
        DROP TABLE ahp.objeto_ahp;
    END IF;
END $$;

GRANT USAGE ON SCHEMA demandas_aprovadas TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA demandas_aprovadas TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA demandas_aprovadas TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA demandas_aprovadas
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
