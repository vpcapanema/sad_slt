-- Integridade entre a configuração multicritério e o fluxo colaborativo AHP.
BEGIN;

ALTER TABLE ahp.config_multicriterio_avulsa
    ADD COLUMN IF NOT EXISTS modo_preenchimento VARCHAR(20)
        CHECK (modo_preenchimento IN ('individual', 'colaborativo'));
ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS modo_preenchimento VARCHAR(20)
        CHECK (modo_preenchimento IN ('individual', 'colaborativo'));

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS config_avulsa_id UUID
        REFERENCES ahp.config_multicriterio_avulsa(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS config_portfolio_id UUID
        REFERENCES ahp.config_multicriterio_portfolio(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS criterios JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS n_criterios INTEGER NOT NULL DEFAULT 0 CHECK (n_criterios >= 0);

UPDATE ahp.comparacao_colaborativa_ambiente a
SET config_avulsa_id = c.id,
    criterios = CASE WHEN a.criterios = '[]'::jsonb THEN c.criterios ELSE a.criterios END,
    n_criterios = CASE WHEN a.n_criterios = 0 THEN c.n_criterios ELSE a.n_criterios END
FROM ahp.config_multicriterio_avulsa c
WHERE a.config_tipo = 'avulsa' AND a.config_codigo = c.codigo;

UPDATE ahp.comparacao_colaborativa_ambiente a
SET config_portfolio_id = c.id,
    criterios = CASE WHEN a.criterios = '[]'::jsonb THEN c.criterios ELSE a.criterios END,
    n_criterios = CASE WHEN a.n_criterios = 0 THEN c.n_criterios ELSE a.n_criterios END
FROM ahp.config_multicriterio_portfolio c
WHERE a.config_tipo = 'portfolio' AND a.config_codigo = c.codigo;

UPDATE ahp.config_multicriterio_avulsa c
SET modo_preenchimento = 'colaborativo'
WHERE EXISTS (
    SELECT 1 FROM ahp.comparacao_colaborativa_ambiente a
    WHERE a.config_avulsa_id = c.id
);
UPDATE ahp.config_multicriterio_portfolio c
SET modo_preenchimento = 'colaborativo'
WHERE EXISTS (
    SELECT 1 FROM ahp.comparacao_colaborativa_ambiente a
    WHERE a.config_portfolio_id = c.id
);

CREATE INDEX IF NOT EXISTS idx_collab_ambiente_config_avulsa
    ON ahp.comparacao_colaborativa_ambiente(config_avulsa_id);
CREATE INDEX IF NOT EXISTS idx_collab_ambiente_config_portfolio
    ON ahp.comparacao_colaborativa_ambiente(config_portfolio_id);

COMMENT ON COLUMN ahp.config_multicriterio_avulsa.modo_preenchimento IS
    'Responsável pelo julgamento: individual ou colaborativo; independente da estratégia matriz/formulário.';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.modo_preenchimento IS
    'Responsável pelo julgamento: individual ou colaborativo; independente da estratégia matriz/formulário.';
COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.criterios IS
    'Snapshot dos critérios vigentes quando o ambiente foi aberto.';

COMMIT;
