BEGIN;

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ALTER COLUMN config_id DROP NOT NULL;

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ADD COLUMN IF NOT EXISTS dados_hierarquizacao JSONB NOT NULL DEFAULT jsonb_build_object(
        'versao', 1,
        'cabecalho_grupo', '{}'::jsonb,
        'objetos', '[]'::jsonb
    );

COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.dados_hierarquizacao IS
    'Documento autocontido da rodada: cabeçalho do grupo e avaliação detalhada de cada objeto nas fases 1, 2 e 3.';

CREATE INDEX IF NOT EXISTS idx_hier_portfolio_dados_gin
    ON hierarquizacao_demandas.hierarquizacao_portfolio USING GIN (dados_hierarquizacao);

COMMIT;
