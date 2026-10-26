BEGIN;
CREATE TABLE IF NOT EXISTS geoprocessamento.superficie_criterios (
    id UUID PRIMARY KEY,
    hierarquizacao_id UUID NOT NULL REFERENCES hierarquizacao_demandas.hierarquizacao_portfolio(id),
    criado_por UUID NOT NULL,
    nome VARCHAR(200) NOT NULL,
    territorialidade TEXT NOT NULL CHECK (territorialidade IN ('municipios', 'setores_2022')),
    criterios JSONB NOT NULL CHECK (jsonb_typeof(criterios) = 'array'),
    camada_id TEXT NOT NULL,
    calculo JSONB,
    camada_indice_id TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_superficie_criterios_hierarquizacao
    ON geoprocessamento.superficie_criterios(hierarquizacao_id);
COMMENT ON TABLE geoprocessamento.superficie_criterios IS
    'Preparação persistida e imutável dos critérios da Fase 2. Índice e julgamentos vinculados ao conjunto exato de critérios.';
GRANT SELECT, INSERT, UPDATE ON geoprocessamento.superficie_criterios TO slt_user;
COMMIT;
