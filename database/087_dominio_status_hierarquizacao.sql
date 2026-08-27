-- Domínio e matriz de transição do ciclo de vida da hierarquização.
-- Não existe status "rascunho": registros legados são migrados para em_julgamento.
BEGIN;

CREATE TABLE IF NOT EXISTS hierarquizacao_demandas.dom_status_hierarquizacao (
    codigo          VARCHAR(50) PRIMARY KEY,
    nome            TEXT NOT NULL,
    descricao       TEXT,
    ordem           SMALLINT NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE hierarquizacao_demandas.dom_status_hierarquizacao IS
    'Domínio dos status do ciclo de vida de uma hierarquização de demandas.';

INSERT INTO hierarquizacao_demandas.dom_status_hierarquizacao
    (codigo, nome, descricao, ordem, ativo)
VALUES
    ('em_julgamento', 'Em julgamento', 'Hierarquização configurada e em preenchimento ou processamento dos julgamentos.', 10, TRUE),
    ('calculada',     'Calculada',      'Ranking calculado e disponível para conferência antes da homologação.',           20, TRUE),
    ('homologada',    'Homologada',     'Resultado final conferido e homologado pelo gestor.',                             30, TRUE),
    ('arquivada',     'Arquivada',      'Hierarquização encerrada e retirada do fluxo operacional ativo.',                 40, TRUE)
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo;

CREATE TABLE IF NOT EXISTS hierarquizacao_demandas.dom_status_hierarquizacao_transicao (
    status_origem   VARCHAR(50) NOT NULL
        REFERENCES hierarquizacao_demandas.dom_status_hierarquizacao (codigo) ON DELETE CASCADE,
    status_destino  VARCHAR(50) NOT NULL
        REFERENCES hierarquizacao_demandas.dom_status_hierarquizacao (codigo) ON DELETE CASCADE,
    via_homologar   BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (status_origem, status_destino)
);

COMMENT ON TABLE hierarquizacao_demandas.dom_status_hierarquizacao_transicao IS
    'Transições permitidas entre status da hierarquização. via_homologar=TRUE exige o fluxo dedicado de homologação.';

INSERT INTO hierarquizacao_demandas.dom_status_hierarquizacao_transicao
    (status_origem, status_destino, via_homologar)
VALUES
    ('em_julgamento', 'em_julgamento', FALSE),
    ('em_julgamento', 'calculada', FALSE),
    ('em_julgamento', 'arquivada', FALSE),
    ('calculada', 'calculada', FALSE),
    ('calculada', 'em_julgamento', FALSE),
    ('calculada', 'homologada', TRUE),
    ('calculada', 'arquivada', FALSE),
    ('homologada', 'homologada', TRUE),
    ('homologada', 'arquivada', FALSE),
    ('arquivada', 'arquivada', FALSE),
    ('arquivada', 'em_julgamento', FALSE)
ON CONFLICT (status_origem, status_destino) DO UPDATE SET
    via_homologar = EXCLUDED.via_homologar;

UPDATE hierarquizacao_demandas.hierarquizacao_portfolio
   SET status = 'em_julgamento'
 WHERE status = 'rascunho';

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
         WHERE nsp.nspname = 'hierarquizacao_demandas'
           AND rel.relname = 'hierarquizacao_portfolio'
           AND con.contype = 'c'
           AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    LOOP
        EXECUTE format(
            'ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio DROP CONSTRAINT %I',
            constraint_name
        );
    END LOOP;
END $$;

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ALTER COLUMN status SET DEFAULT 'em_julgamento';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'fk_hierarquizacao_portfolio_status'
           AND conrelid = 'hierarquizacao_demandas.hierarquizacao_portfolio'::regclass
    ) THEN
        ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
            ADD CONSTRAINT fk_hierarquizacao_portfolio_status
            FOREIGN KEY (status)
            REFERENCES hierarquizacao_demandas.dom_status_hierarquizacao (codigo)
            ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dom_status_hierarquizacao_ativo_ordem
    ON hierarquizacao_demandas.dom_status_hierarquizacao (ativo, ordem);

COMMIT;
