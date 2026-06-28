-- SLT — Domínio de status em duas camadas + desfechos pós-hierarquização.
-- Executar após 023_dom_status_demanda_transicao.sql.
--
-- Camadas:
--   analise            — prefixo «Demanda» (intake e parecer)
--   hierarquizacao     — aguardando → fila → em hierarquização → hierarquizado
--   pos_hierarquizado  — execução, finalizado, cancelado (+ arquivamento definitivo)
--   transversal        — suspenso, retirado (ambas as camadas)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Coluna camada no domínio de status
-- ---------------------------------------------------------------------------
ALTER TABLE demandas.dom_status_demanda
    ADD COLUMN IF NOT EXISTS camada VARCHAR(30);

COMMENT ON COLUMN demandas.dom_status_demanda.camada IS
    'Camada do ciclo de vida: analise | hierarquizacao | pos_hierarquizado | transversal';

-- ---------------------------------------------------------------------------
-- 2) Novos status
-- ---------------------------------------------------------------------------
INSERT INTO demandas.dom_status_demanda (codigo, nome, descricao, ordem, ativo, camada) VALUES
    ('em_execucao', 'Em execução',       'Aprovado no ranking e em implementação operacional', 100, TRUE, 'pos_hierarquizado'),
    ('finalizado',  'Finalizado',        'Execução concluída com êxito',                       110, TRUE, 'pos_hierarquizado'),
    ('cancelado',   'Cancelado',         'Encerrado antes da conclusão da execução',           120, TRUE, 'pos_hierarquizado')
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo,
    camada = EXCLUDED.camada;

-- ---------------------------------------------------------------------------
-- 3) Atualiza nomes, ordem e camada dos status existentes
-- ---------------------------------------------------------------------------
UPDATE demandas.dom_status_demanda SET
    nome = 'Demanda em rascunho',
    descricao = 'Cadastro iniciado, ainda não submetido à análise',
    ordem = 10,
    camada = 'analise'
WHERE codigo = 'rascunho';

UPDATE demandas.dom_status_demanda SET
    nome = 'Demanda em análise',
    descricao = 'Equipe avalia factibilidade e consistência do cadastro',
    ordem = 20,
    camada = 'analise'
WHERE codigo = 'em_analise';

UPDATE demandas.dom_status_demanda SET
    nome = 'Demanda aprovada',
    descricao = 'Parecer positivo — último status como demanda antes da hierarquização',
    ordem = 30,
    camada = 'analise'
WHERE codigo = 'aprovada';

UPDATE demandas.dom_status_demanda SET
    nome = 'Demanda reprovada',
    descricao = 'Parecer negativo na análise de cadastro',
    ordem = 40,
    camada = 'analise'
WHERE codigo = 'reprovada';

UPDATE demandas.dom_status_demanda SET
    nome = 'Demanda arquivada',
    descricao = 'Encerrada na análise ou arquivamento definitivo após hierarquização',
    ordem = 50,
    camada = 'analise'
WHERE codigo = 'arquivada';

UPDATE demandas.dom_status_demanda SET
    nome = 'Aguardando hierarquização',
    descricao = 'Handoff da demanda aprovada — apto a compor universo comparável (código elegivel_ahp)',
    ordem = 70,
    camada = 'hierarquizacao'
WHERE codigo = 'elegivel_ahp';

UPDATE demandas.dom_status_demanda SET
    nome = 'Na fila de hierarquização',
    descricao = 'Entrou na fila da rodada de hierarquização',
    ordem = 75,
    camada = 'hierarquizacao'
WHERE codigo = 'fila_hierarquizacao';

UPDATE demandas.dom_status_demanda SET
    nome = 'Em hierarquização',
    descricao = 'Participando ativamente da comparação AHP na rodada',
    ordem = 80,
    camada = 'hierarquizacao'
WHERE codigo = 'em_hierarquizacao';

UPDATE demandas.dom_status_demanda SET
    nome = 'Hierarquizado',
    descricao = 'Ranking concluído em rodada homologada',
    ordem = 90,
    camada = 'hierarquizacao'
WHERE codigo = 'hierarquizado';

UPDATE demandas.dom_status_demanda SET
    nome = 'Suspenso',
    descricao = 'Pausa temporária — análise, hierarquização ou execução',
    ordem = 55,
    camada = 'transversal'
WHERE codigo = 'suspenso';

UPDATE demandas.dom_status_demanda SET
    nome = 'Retirado',
    descricao = 'Removido do fluxo ativo ou do ranking',
    ordem = 56,
    camada = 'transversal'
WHERE codigo = 'retirado';

-- ---------------------------------------------------------------------------
-- 4) Dados — intake antigo em fila_hierarquizacao volta para análise
-- ---------------------------------------------------------------------------
UPDATE demandas.plano    SET status = 'em_analise' WHERE status = 'fila_hierarquizacao' AND aprovado_em IS NULL;
UPDATE demandas.programa SET status = 'em_analise' WHERE status = 'fila_hierarquizacao' AND aprovado_em IS NULL;
UPDATE demandas.projeto  SET status = 'em_analise' WHERE status = 'fila_hierarquizacao' AND aprovado_em IS NULL;

-- ---------------------------------------------------------------------------
-- 5) Matriz de transição (substitui 023)
-- ---------------------------------------------------------------------------
DELETE FROM demandas.dom_status_demanda_transicao;

INSERT INTO demandas.dom_status_demanda_transicao (status_origem, status_destino, via_aprovar) VALUES
    -- Camada 1 — análise
    ('rascunho', 'rascunho', FALSE),
    ('rascunho', 'em_analise', FALSE),
    ('rascunho', 'arquivada', FALSE),
    ('rascunho', 'suspenso', FALSE),
    ('rascunho', 'retirado', FALSE),
    ('em_analise', 'em_analise', FALSE),
    ('em_analise', 'aprovada', FALSE),
    ('em_analise', 'reprovada', FALSE),
    ('em_analise', 'arquivada', FALSE),
    ('em_analise', 'suspenso', FALSE),
    ('em_analise', 'retirado', FALSE),
    ('aprovada', 'aprovada', FALSE),
    ('aprovada', 'arquivada', FALSE),
    ('reprovada', 'reprovada', FALSE),
    ('reprovada', 'em_analise', FALSE),
    ('reprovada', 'arquivada', FALSE),
    ('arquivada', 'arquivada', FALSE),
    -- Transversais (Camada 1)
    ('suspenso', 'suspenso', FALSE),
    ('suspenso', 'rascunho', FALSE),
    ('suspenso', 'em_analise', FALSE),
    ('suspenso', 'retirado', FALSE),
    ('suspenso', 'arquivada', FALSE),
    ('retirado', 'retirado', FALSE),
    ('retirado', 'arquivada', FALSE),
    -- Camada 2 — hierarquização
    ('elegivel_ahp', 'elegivel_ahp', FALSE),
    ('elegivel_ahp', 'fila_hierarquizacao', FALSE),
    ('elegivel_ahp', 'suspenso', FALSE),
    ('elegivel_ahp', 'retirado', FALSE),
    ('elegivel_ahp', 'arquivada', FALSE),
    ('fila_hierarquizacao', 'fila_hierarquizacao', FALSE),
    ('fila_hierarquizacao', 'em_hierarquizacao', FALSE),
    ('fila_hierarquizacao', 'suspenso', FALSE),
    ('fila_hierarquizacao', 'retirado', FALSE),
    ('fila_hierarquizacao', 'arquivada', FALSE),
    ('em_hierarquizacao', 'em_hierarquizacao', FALSE),
    ('em_hierarquizacao', 'hierarquizado', FALSE),
    ('em_hierarquizacao', 'suspenso', FALSE),
    ('em_hierarquizacao', 'retirado', FALSE),
    ('em_hierarquizacao', 'arquivada', FALSE),
    ('hierarquizado', 'hierarquizado', FALSE),
    ('hierarquizado', 'em_execucao', FALSE),
    ('hierarquizado', 'suspenso', FALSE),
    ('hierarquizado', 'retirado', FALSE),
    ('hierarquizado', 'cancelado', FALSE),
    ('hierarquizado', 'arquivada', FALSE),
    -- Pós-hierarquizado
    ('em_execucao', 'em_execucao', FALSE),
    ('em_execucao', 'finalizado', FALSE),
    ('em_execucao', 'suspenso', FALSE),
    ('em_execucao', 'cancelado', FALSE),
    ('em_execucao', 'arquivada', FALSE),
    ('finalizado', 'finalizado', FALSE),
    ('finalizado', 'arquivada', FALSE),
    ('cancelado', 'cancelado', FALSE),
    ('cancelado', 'arquivada', FALSE),
    -- Suspenso / retirado na hierarquização ou execução
    ('suspenso', 'elegivel_ahp', FALSE),
    ('suspenso', 'fila_hierarquizacao', FALSE),
    ('suspenso', 'em_hierarquizacao', FALSE),
    ('suspenso', 'em_execucao', FALSE),
    -- Aprovação dedicada (POST /aprovar → elegivel_ahp)
    ('em_analise', 'elegivel_ahp', TRUE),
    ('aprovada', 'elegivel_ahp', TRUE);

COMMIT;
