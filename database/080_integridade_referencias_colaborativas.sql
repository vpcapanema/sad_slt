-- Garante que cada ambiente colaborativo aponte para exatamente uma tabela
-- de configuração AHP, conforme config_tipo.
BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    DROP CONSTRAINT IF EXISTS ck_collab_ambiente_config_ref;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD CONSTRAINT ck_collab_ambiente_config_ref CHECK (
        (config_tipo = 'avulsa' AND config_avulsa_id IS NOT NULL AND config_portfolio_id IS NULL)
        OR
        (config_tipo = 'portfolio' AND config_portfolio_id IS NOT NULL AND config_avulsa_id IS NULL)
    );

COMMIT;
