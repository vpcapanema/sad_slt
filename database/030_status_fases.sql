-- SLT — Reformulação do domínio de status: conceito «fase» (3 fases) e códigos intuitivos.
-- Executar após 029_config_subconjunto.sql.
--
-- Mudanças:
--   1) Renomeia a coluna camada -> fase em demandas.dom_status_demanda.
--   2) Define 3 fases do ciclo de vida e elimina os status «transversais»:
--        cadastro_analise — cadastro e análise da demanda
--        hierarquizacao   — aprovada vira plano/programa/projeto e segue p/ hierarquização e ranqueamento
--        execucao         — pós-ranqueamento (status globais genéricos)
--   3) Cria códigos únicos e intuitivos com prefixo de fase (analise_*, hierarq_*, exec_*).
--   4) Migra os registros existentes (status antigos -> novos) em plano/programa/projeto.
--   5) Reconstrói a matriz de transições.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Coluna camada -> fase
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'demandas' AND table_name = 'dom_status_demanda'
          AND column_name = 'camada'
    ) THEN
        ALTER TABLE demandas.dom_status_demanda RENAME COLUMN camada TO fase;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'demandas' AND table_name = 'dom_status_demanda'
          AND column_name = 'fase'
    ) THEN
        ALTER TABLE demandas.dom_status_demanda ADD COLUMN fase VARCHAR(30);
    END IF;
END $$;

COMMENT ON COLUMN demandas.dom_status_demanda.fase IS
    'Fase do ciclo de vida: cadastro_analise | hierarquizacao | execucao';

-- ---------------------------------------------------------------------------
-- 2) Novos status (códigos intuitivos com prefixo de fase)
-- ---------------------------------------------------------------------------
INSERT INTO demandas.dom_status_demanda (codigo, nome, descricao, ordem, ativo, fase) VALUES
    -- Fase 1 — cadastro e análise da demanda
    ('analise_rascunho',     'Em rascunho',            'Cadastro iniciado, ainda não submetido à análise',                 10, TRUE, 'cadastro_analise'),
    ('analise_em_avaliacao', 'Em análise',             'Equipe avalia factibilidade e consistência do cadastro',           20, TRUE, 'cadastro_analise'),
    ('analise_aprovada',     'Aprovada',               'Parecer positivo — apta a virar objeto e seguir para hierarquização', 30, TRUE, 'cadastro_analise'),
    ('analise_reprovada',    'Reprovada na análise',   'Parecer negativo na análise de cadastro',                          40, TRUE, 'cadastro_analise'),
    ('analise_suspensa',     'Análise suspensa',       'Análise temporariamente pausada',                                  50, TRUE, 'cadastro_analise'),
    ('analise_cancelada',    'Cadastro cancelado',     'Encerrada na fase de análise, sem seguir para hierarquização',     60, TRUE, 'cadastro_analise'),
    -- Fase 2 — hierarquização e ranqueamento
    ('hierarq_apta',         'Apta à hierarquização',  'Objeto apto a compor o universo comparável da hierarquização',     70, TRUE, 'hierarquizacao'),
    ('hierarq_em_andamento', 'Em hierarquização',      'Participando ativamente da comparação AHP na rodada',              80, TRUE, 'hierarquizacao'),
    ('hierarq_finalizada',   'Hierarquização concluída', 'Hierarquização salva no banco, ainda não publicada no ranking',  90, TRUE, 'hierarquizacao'),
    ('hierarq_ranqueada',    'Ranqueada',              'Ranking publicado na página pública oficial',                     100, TRUE, 'hierarquizacao'),
    ('hierarq_suspensa',     'Hierarquização suspensa', 'Pausa temporária durante a hierarquização',                      110, TRUE, 'hierarquizacao'),
    ('hierarq_retirada',     'Retirada do ranking',    'Removida do universo de hierarquização',                          120, TRUE, 'hierarquizacao'),
    -- Fase 3 — pós-ranqueamento / execução
    ('exec_em_execucao',     'Em execução',            'Aprovada no ranking e em implementação operacional',              130, TRUE, 'execucao'),
    ('exec_suspensa',        'Execução suspensa',      'Execução temporariamente pausada',                                140, TRUE, 'execucao'),
    ('exec_finalizada',      'Finalizada',             'Execução concluída com êxito',                                    150, TRUE, 'execucao'),
    ('exec_cancelada',       'Cancelada',              'Encerrada antes da conclusão da execução',                        160, TRUE, 'execucao')
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo,
    fase = EXCLUDED.fase;

-- ---------------------------------------------------------------------------
-- 3) Migra os registros existentes (plano/programa/projeto.status)
--    Mapeamento dos códigos antigos -> novos. «fila_hierarquizacao» foi
--    eliminado e dobra em hierarq_apta; «suspenso»/«retirado» (transversais)
--    assumem por padrão a fase de hierarquização.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['plano', 'programa', 'projeto'] LOOP
        EXECUTE format(
            'UPDATE demandas.%I SET status = CASE status'
            || ' WHEN ''rascunho'' THEN ''analise_rascunho'''
            || ' WHEN ''em_analise'' THEN ''analise_em_avaliacao'''
            || ' WHEN ''aprovada'' THEN ''analise_aprovada'''
            || ' WHEN ''reprovada'' THEN ''analise_reprovada'''
            || ' WHEN ''arquivada'' THEN ''analise_cancelada'''
            || ' WHEN ''fila_hierarquizacao'' THEN ''hierarq_apta'''
            || ' WHEN ''elegivel_ahp'' THEN ''hierarq_apta'''
            || ' WHEN ''em_hierarquizacao'' THEN ''hierarq_em_andamento'''
            || ' WHEN ''hierarquizado'' THEN ''hierarq_finalizada'''
            || ' WHEN ''em_execucao'' THEN ''exec_em_execucao'''
            || ' WHEN ''finalizado'' THEN ''exec_finalizada'''
            || ' WHEN ''cancelado'' THEN ''exec_cancelada'''
            || ' WHEN ''suspenso'' THEN ''hierarq_suspensa'''
            || ' WHEN ''retirado'' THEN ''hierarq_retirada'''
            || ' ELSE status END',
            t
        );
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Reconstrói a matriz de transições com os novos códigos
-- ---------------------------------------------------------------------------
DELETE FROM demandas.dom_status_demanda_transicao;

INSERT INTO demandas.dom_status_demanda_transicao (status_origem, status_destino, via_aprovar) VALUES
    -- Fase 1 — cadastro e análise
    ('analise_rascunho', 'analise_rascunho', FALSE),
    ('analise_rascunho', 'analise_em_avaliacao', FALSE),
    ('analise_rascunho', 'analise_suspensa', FALSE),
    ('analise_rascunho', 'analise_cancelada', FALSE),
    ('analise_em_avaliacao', 'analise_em_avaliacao', FALSE),
    ('analise_em_avaliacao', 'analise_aprovada', FALSE),
    ('analise_em_avaliacao', 'analise_reprovada', FALSE),
    ('analise_em_avaliacao', 'analise_suspensa', FALSE),
    ('analise_em_avaliacao', 'analise_cancelada', FALSE),
    ('analise_aprovada', 'analise_aprovada', FALSE),
    ('analise_aprovada', 'analise_cancelada', FALSE),
    ('analise_reprovada', 'analise_reprovada', FALSE),
    ('analise_reprovada', 'analise_em_avaliacao', FALSE),
    ('analise_reprovada', 'analise_cancelada', FALSE),
    ('analise_suspensa', 'analise_suspensa', FALSE),
    ('analise_suspensa', 'analise_rascunho', FALSE),
    ('analise_suspensa', 'analise_em_avaliacao', FALSE),
    ('analise_suspensa', 'analise_cancelada', FALSE),
    ('analise_cancelada', 'analise_cancelada', FALSE),
    -- Fase 2 — hierarquização e ranqueamento
    ('hierarq_apta', 'hierarq_apta', FALSE),
    ('hierarq_apta', 'hierarq_em_andamento', FALSE),
    ('hierarq_apta', 'hierarq_suspensa', FALSE),
    ('hierarq_apta', 'hierarq_retirada', FALSE),
    ('hierarq_em_andamento', 'hierarq_em_andamento', FALSE),
    ('hierarq_em_andamento', 'hierarq_finalizada', FALSE),
    ('hierarq_em_andamento', 'hierarq_suspensa', FALSE),
    ('hierarq_em_andamento', 'hierarq_retirada', FALSE),
    ('hierarq_finalizada', 'hierarq_finalizada', FALSE),
    ('hierarq_finalizada', 'hierarq_ranqueada', FALSE),
    ('hierarq_finalizada', 'hierarq_suspensa', FALSE),
    ('hierarq_finalizada', 'hierarq_retirada', FALSE),
    ('hierarq_ranqueada', 'hierarq_ranqueada', FALSE),
    ('hierarq_ranqueada', 'exec_em_execucao', FALSE),
    ('hierarq_ranqueada', 'hierarq_retirada', FALSE),
    ('hierarq_suspensa', 'hierarq_suspensa', FALSE),
    ('hierarq_suspensa', 'hierarq_apta', FALSE),
    ('hierarq_suspensa', 'hierarq_em_andamento', FALSE),
    ('hierarq_suspensa', 'hierarq_retirada', FALSE),
    ('hierarq_retirada', 'hierarq_retirada', FALSE),
    ('hierarq_retirada', 'analise_cancelada', FALSE),
    -- Fase 3 — pós-ranqueamento / execução
    ('exec_em_execucao', 'exec_em_execucao', FALSE),
    ('exec_em_execucao', 'exec_finalizada', FALSE),
    ('exec_em_execucao', 'exec_suspensa', FALSE),
    ('exec_em_execucao', 'exec_cancelada', FALSE),
    ('exec_suspensa', 'exec_suspensa', FALSE),
    ('exec_suspensa', 'exec_em_execucao', FALSE),
    ('exec_suspensa', 'exec_cancelada', FALSE),
    ('exec_finalizada', 'exec_finalizada', FALSE),
    ('exec_cancelada', 'exec_cancelada', FALSE),
    -- Aprovação dedicada (POST /aprovar -> apta à hierarquização)
    ('analise_em_avaliacao', 'hierarq_apta', TRUE),
    ('analise_aprovada', 'hierarq_apta', TRUE);

-- ---------------------------------------------------------------------------
-- 5) Remove os status antigos (já sem referências após a migração)
-- ---------------------------------------------------------------------------
DELETE FROM demandas.dom_status_demanda
WHERE codigo IN (
    'rascunho', 'em_analise', 'aprovada', 'reprovada', 'arquivada',
    'fila_hierarquizacao', 'elegivel_ahp', 'em_hierarquizacao', 'hierarquizado',
    'em_execucao', 'finalizado', 'cancelado', 'suspenso', 'retirado'
);

-- ---------------------------------------------------------------------------
-- 6) Atualiza os defaults das colunas de status
-- ---------------------------------------------------------------------------
ALTER TABLE demandas.plano    ALTER COLUMN status SET DEFAULT 'analise_rascunho';
ALTER TABLE demandas.programa ALTER COLUMN status SET DEFAULT 'analise_rascunho';
ALTER TABLE demandas.projeto  ALTER COLUMN status SET DEFAULT 'analise_rascunho';

COMMIT;
