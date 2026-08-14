BEGIN;

-- Espelha relatorio_fase1: persiste os relatórios técnicos das Fases 2 e 3
-- e da síntese (consolidado), hoje mantidos apenas dentro de dados_hierarquizacao.
ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ADD COLUMN IF NOT EXISTS relatorio_fase2 JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS relatorio_fase3 JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS relatorio_consolidado JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.relatorio_fase2 IS
    'Relatório técnico integral da última execução da Fase 2 (favorabilidade territorial).';
COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.relatorio_fase3 IS
    'Relatório técnico integral da última execução da Fase 3 (ajuste por atributos).';
COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.relatorio_consolidado IS
    'Relatório técnico integral da última síntese (consolidação final do ranking).';

COMMIT;
