BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.configuracao_fatiamento_fase1 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(120) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    padrao BOOLEAN NOT NULL DEFAULT FALSE,
    parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gp_fatiamento_fase1_padrao
    ON geoprocessamento.configuracao_fatiamento_fase1 (padrao) WHERE padrao;

INSERT INTO geoprocessamento.configuracao_fatiamento_fase1
    (codigo,nome,descricao,padrao,parametros)
VALUES (
    'FAT-F1-PADRAO', 'Fatiamento padrão da Fase 1',
    'Uma classe impeditiva de restrição e três classes de risco.', TRUE,
    '{"restricao":{"limiar":1,"classes":[{"codigo":"restricao","rotulo":"Restrição","minimo":1}]},"risco":{"classes":[{"codigo":"baixo","rotulo":"Risco baixo","minimo":0,"maximo":1.5},{"codigo":"medio","rotulo":"Risco médio","minimo":1.5,"maximo":2.5},{"codigo":"alto","rotulo":"Risco alto","minimo":2.5,"maximo":null}]}}'::jsonb
)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ADD COLUMN IF NOT EXISTS relatorio_fase1 JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN geoprocessamento.produto_fase1.produto_id IS
    'Identificador único compartilhado pelo par de camadas consolidadas de restrição e risco.';
COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.relatorio_fase1 IS
    'Relatório técnico integral da última execução da Fase 1.';

GRANT SELECT ON geoprocessamento.configuracao_fatiamento_fase1 TO slt_user;
COMMIT;
