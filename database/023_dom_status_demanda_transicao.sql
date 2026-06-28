-- SLT — Matriz de transições permitidas entre status de demanda.
-- Executar após 022_criado_por_representante_not_null.sql.
--
-- dom_status_demanda = domínio dos status (nome, ordem, ativo).
-- dom_status_demanda_transicao = arestas permitidas (origem → destino) para PATCH/admin.
-- Transições para elegivel_ahp a partir de intake usam POST /aprovar, não PATCH.

BEGIN;

CREATE TABLE IF NOT EXISTS demandas.dom_status_demanda_transicao (
    status_origem   VARCHAR(50) NOT NULL
        REFERENCES demandas.dom_status_demanda (codigo) ON DELETE CASCADE,
    status_destino  VARCHAR(50) NOT NULL
        REFERENCES demandas.dom_status_demanda (codigo) ON DELETE CASCADE,
    via_aprovar     BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (status_origem, status_destino)
);

COMMENT ON TABLE demandas.dom_status_demanda_transicao IS
    'Transições de status permitidas na edição administrativa (PATCH). via_aprovar=TRUE exige POST /aprovar.';

-- Intake (ordem < 70)
INSERT INTO demandas.dom_status_demanda_transicao (status_origem, status_destino, via_aprovar) VALUES
    ('rascunho', 'rascunho', FALSE),
    ('rascunho', 'fila_hierarquizacao', FALSE),
    ('rascunho', 'arquivada', FALSE),
    ('fila_hierarquizacao', 'fila_hierarquizacao', FALSE),
    ('fila_hierarquizacao', 'em_analise', FALSE),
    ('fila_hierarquizacao', 'reprovada', FALSE),
    ('fila_hierarquizacao', 'arquivada', FALSE),
    ('em_analise', 'em_analise', FALSE),
    ('em_analise', 'reprovada', FALSE),
    ('em_analise', 'arquivada', FALSE),
    ('aprovada', 'aprovada', FALSE),
    ('aprovada', 'arquivada', FALSE),
    ('reprovada', 'reprovada', FALSE),
    ('reprovada', 'fila_hierarquizacao', FALSE),
    ('reprovada', 'arquivada', FALSE),
    ('arquivada', 'arquivada', FALSE),
    -- AHP (ordem >= 70)
    ('elegivel_ahp', 'elegivel_ahp', FALSE),
    ('elegivel_ahp', 'em_hierarquizacao', FALSE),
    ('elegivel_ahp', 'suspenso', FALSE),
    ('elegivel_ahp', 'retirado', FALSE),
    ('elegivel_ahp', 'arquivada', FALSE),
    ('em_hierarquizacao', 'em_hierarquizacao', FALSE),
    ('em_hierarquizacao', 'hierarquizado', FALSE),
    ('em_hierarquizacao', 'suspenso', FALSE),
    ('em_hierarquizacao', 'retirado', FALSE),
    ('hierarquizado', 'hierarquizado', FALSE),
    ('hierarquizado', 'suspenso', FALSE),
    ('hierarquizado', 'retirado', FALSE),
    ('hierarquizado', 'arquivada', FALSE),
    ('suspenso', 'suspenso', FALSE),
    ('suspenso', 'elegivel_ahp', FALSE),
    ('suspenso', 'retirado', FALSE),
    ('suspenso', 'arquivada', FALSE),
    ('retirado', 'retirado', FALSE),
    ('retirado', 'arquivada', FALSE),
    -- Aprovação dedicada (não listada no PATCH da lista admin)
    ('fila_hierarquizacao', 'elegivel_ahp', TRUE),
    ('em_analise', 'elegivel_ahp', TRUE)
ON CONFLICT (status_origem, status_destino) DO NOTHING;

COMMIT;
