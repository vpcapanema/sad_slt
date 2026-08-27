-- Permite que julgamentos colaborativos tenham origem em configuração avulsa ou de portfólio.
BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS config_tipo VARCHAR(16),
    ADD COLUMN IF NOT EXISTS config_id UUID,
    ADD COLUMN IF NOT EXISTS config_avulsa_id UUID,
    ADD COLUMN IF NOT EXISTS config_portfolio_id UUID,
    ADD COLUMN IF NOT EXISTS config_codigo VARCHAR(64),
    ADD COLUMN IF NOT EXISTS config_nome VARCHAR(200);

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    DROP CONSTRAINT IF EXISTS fk_collab_ambiente_hierarquizacao,
    ALTER COLUMN hierarquizacao_id DROP NOT NULL,
    ALTER COLUMN hierarquizacao_codigo DROP NOT NULL;

UPDATE ahp.comparacao_colaborativa_ambiente a
   SET config_tipo = 'portfolio',
       config_id = c.id,
       config_portfolio_id = c.id,
       config_codigo = c.codigo,
       config_nome = c.nome
  FROM hierarquizacao_demandas.hierarquizacao_portfolio h
  JOIN ahp.config_multicriterio_portfolio c ON c.id = h.config_id
 WHERE a.hierarquizacao_id = h.id
   AND a.config_id IS NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_collab_config_avulsa') THEN
        ALTER TABLE ahp.comparacao_colaborativa_ambiente
            ADD CONSTRAINT fk_collab_config_avulsa FOREIGN KEY (config_avulsa_id)
            REFERENCES ahp.config_multicriterio_avulsa(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_collab_config_portfolio') THEN
        ALTER TABLE ahp.comparacao_colaborativa_ambiente
            ADD CONSTRAINT fk_collab_config_portfolio FOREIGN KEY (config_portfolio_id)
            REFERENCES ahp.config_multicriterio_portfolio(id) ON DELETE RESTRICT;
    END IF;
END $$;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD CONSTRAINT ck_collab_ambiente_config_tipo
    CHECK (config_tipo IS NULL OR config_tipo IN ('avulsa', 'portfolio'));

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD CONSTRAINT ck_collab_config_origem_coerente CHECK (
        config_id IS NULL OR
        (config_tipo = 'avulsa' AND config_avulsa_id = config_id AND config_portfolio_id IS NULL) OR
        (config_tipo = 'portfolio' AND config_portfolio_id = config_id AND config_avulsa_id IS NULL)
    );

CREATE INDEX IF NOT EXISTS idx_collab_ambiente_config_origem
    ON ahp.comparacao_colaborativa_ambiente (config_tipo, config_id, criado_em DESC);

DROP INDEX IF EXISTS ahp.uq_collab_ambiente_hierarquizacao_ativa;
CREATE UNIQUE INDEX IF NOT EXISTS uq_collab_ambiente_config_ativa
    ON ahp.comparacao_colaborativa_ambiente (config_tipo, config_id)
    WHERE status = 'ativa' AND config_id IS NOT NULL;

COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.config_tipo IS
    'Tabela de origem da configuração: ahp.config_multicriterio_avulsa ou ahp.config_multicriterio_portfolio.';
COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.config_id IS
    'Identificador da configuração multicritério selecionada.';

COMMIT;
