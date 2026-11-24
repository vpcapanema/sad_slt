BEGIN;

DO $$
DECLARE
    papel text;
BEGIN
    FOR papel IN SELECT rolname FROM pg_roles WHERE rolname IN ('slt_user', 'sigma_user') LOOP
        EXECUTE format('GRANT DELETE ON ahp.comparacao_colaborativa_inscricao TO %I', papel);
        IF NOT has_table_privilege(papel, 'ahp.comparacao_colaborativa_inscricao', 'DELETE') THEN
            RAISE EXCEPTION 'Execute esta migração com o proprietário da tabela de inscrições do AHP.';
        END IF;
    END LOOP;
END $$;

COMMIT;
