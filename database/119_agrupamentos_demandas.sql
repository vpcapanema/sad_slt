BEGIN;

CREATE TABLE IF NOT EXISTS demandas.grupos_demandas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(64) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo_demanda_id SMALLINT NOT NULL
        REFERENCES demandas.dom_tipo_demanda (id),
    objetos JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_por UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE demandas.grupos_demandas IS
    'Conjuntos reutilizáveis de demandas selecionados para futura hierarquização.';
COMMENT ON COLUMN demandas.grupos_demandas.objetos IS
    'Snapshot dos objetos selecionados no agrupamento, independente de uma rodada.';

CREATE INDEX IF NOT EXISTS idx_grupos_demandas_tipo_criado
    ON demandas.grupos_demandas (tipo_demanda_id, criado_em DESC);

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ADD COLUMN IF NOT EXISTS grupo_demanda_id UUID
        REFERENCES demandas.grupos_demandas (id) ON DELETE RESTRICT;

-- Cada universo já usado em uma hierarquização vira um grupo independente.
-- O código determinístico torna o backfill repetível.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'hierarquizacao_demandas'
           AND table_name = 'hierarquizacao_portfolio'
           AND column_name = 'objetos'
    ) THEN
        INSERT INTO demandas.grupos_demandas
            (codigo, nome, descricao, tipo_demanda_id, objetos, criado_por, criado_em, atualizado_em)
        SELECT
            'GRU-' || UPPER(SUBSTRING(MD5(h.codigo) FROM 1 FOR 24)),
            h.nome,
            h.descricao,
            h.tipo_demanda_id,
            COALESCE(h.objetos, '[]'::jsonb),
            h.criado_por,
            h.criado_em,
            h.atualizado_em
        FROM hierarquizacao_demandas.hierarquizacao_portfolio h
        WHERE h.tipo_demanda_id IN (1, 2, 3)
        ON CONFLICT (codigo) DO NOTHING;

        UPDATE hierarquizacao_demandas.hierarquizacao_portfolio h
           SET grupo_demanda_id = g.id
          FROM demandas.grupos_demandas g
         WHERE g.codigo = 'GRU-' || UPPER(SUBSTRING(MD5(h.codigo) FROM 1 FOR 24))
           AND h.grupo_demanda_id IS NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM hierarquizacao_demandas.hierarquizacao_portfolio
         WHERE grupo_demanda_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Há hierarquizações sem grupo_demanda_id após o backfill';
    END IF;
END $$;

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ALTER COLUMN grupo_demanda_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hierarquizacao_portfolio_grupo_demanda
    ON hierarquizacao_demandas.hierarquizacao_portfolio (grupo_demanda_id);

-- A composição vive somente no grupo salvo; dados_hierarquizacao preserva
-- resultados e parâmetros calculados das fases.
ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    DROP COLUMN IF EXISTS objetos;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON demandas.grupos_demandas TO slt_user;

COMMIT;