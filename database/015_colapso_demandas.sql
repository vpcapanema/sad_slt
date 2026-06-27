-- SLT — Colapso do modelo dual em UMA tabela por tipo de demanda.
--
-- Decisão de arquitetura: a mesma demanda deixa de existir em dois lugares
-- (cadastro.* + demandas_aprovadas.*). Passa a ser UMA linha por tipo
-- (plano/programa/projeto) que avança no ciclo de vida in-place. A
-- imutabilidade do que foi rankeado fica na própria hierarquização
-- (objetos JSONB) + auditoria.log_sistema.
--
-- Este script (executar após 014_cadastro_hierarquia.sql):
--   1) amplia o domínio de status para cobrir o ciclo inteiro (intake → AHP);
--   2) cria a tabela de domínio de tipo de demanda (plano/programa/projeto);
--   3) adiciona ao plano/programa/projeto as colunas de aprovação;
--   4) recria indicadores referenciando os 3 níveis no schema único;
--   5) preserva a aprovação dos projetos a partir do snapshot antigo;
--   6) DROPa o schema demandas_aprovadas;
--   7) renomeia o schema cadastro -> demandas.

BEGIN;

-- ===========================================================================
-- 1) Domínio de status — ciclo de vida unificado (intake -> decisão -> AHP)
-- ===========================================================================
INSERT INTO cadastro.dom_status_demanda (codigo, nome, descricao, ordem, ativo) VALUES
    ('elegivel_ahp',      'Elegível à hierarquização', 'Aprovada e disponível para o AHP',        70, TRUE),
    ('em_hierarquizacao', 'Em hierarquização',         'Participando de uma rodada de AHP',        80, TRUE),
    ('hierarquizado',     'Hierarquizado',             'Já hierarquizado em rodada homologada',    90, TRUE),
    ('suspenso',          'Suspenso',                  'Temporariamente fora do universo do AHP', 100, TRUE),
    ('retirado',          'Retirado',                  'Removido do universo do AHP',             110, TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ===========================================================================
-- 2) Domínio de TIPO DE DEMANDA (plano / programa / projeto)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS cadastro.dom_tipo_demanda (
    id          SMALLINT PRIMARY KEY,
    codigo      VARCHAR(20) NOT NULL UNIQUE,
    nome        TEXT NOT NULL,
    descricao   TEXT,
    ordem       SMALLINT NOT NULL DEFAULT 0,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cadastro.dom_tipo_demanda IS
    'Domínio dos níveis de demanda da hierarquia: plano (1) > programa (2) > projeto (3)';

INSERT INTO cadastro.dom_tipo_demanda (id, codigo, nome, descricao, ordem) VALUES
    (1, 'plano',    'Plano',    'Nível 1 — comparável dentro da diretoria', 1),
    (2, 'programa', 'Programa', 'Nível 2 — comparável dentro do plano',     2),
    (3, 'projeto',  'Projeto',  'Nível 3 — comparável dentro do programa',  3)
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- 3) Colunas de aprovação (preenchidas in-place quando a demanda avança)
-- ===========================================================================
ALTER TABLE cadastro.plano
    ADD COLUMN IF NOT EXISTS aprovado_em      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS aprovado_por     UUID,
    ADD COLUMN IF NOT EXISTS motivo_aprovacao TEXT;

ALTER TABLE cadastro.programa
    ADD COLUMN IF NOT EXISTS aprovado_em      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS aprovado_por     UUID,
    ADD COLUMN IF NOT EXISTS motivo_aprovacao TEXT;

ALTER TABLE cadastro.projeto
    ADD COLUMN IF NOT EXISTS aprovado_em      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS aprovado_por     UUID,
    ADD COLUMN IF NOT EXISTS motivo_aprovacao TEXT;

-- ===========================================================================
-- 4) Indicadores — agora vinculados a plano OU programa OU projeto
-- ===========================================================================
CREATE TABLE IF NOT EXISTS cadastro.indicadores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    plano_id        UUID REFERENCES cadastro.plano    (id) ON DELETE CASCADE,
    programa_id     UUID REFERENCES cadastro.programa (id) ON DELETE CASCADE,
    projeto_id      UUID REFERENCES cadastro.projeto  (id) ON DELETE CASCADE,

    nome            TEXT NOT NULL,
    descricao       TEXT,
    unidade_medida  TEXT,
    linha_base      NUMERIC(18,4),
    polaridade      VARCHAR(20)
        CHECK (polaridade IS NULL OR polaridade IN ('maior_melhor', 'menor_melhor')),
    metas           JSONB,

    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_indicadores_um_pai
        CHECK (num_nonnulls(plano_id, programa_id, projeto_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_indicadores_plano    ON cadastro.indicadores (plano_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_programa ON cadastro.indicadores (programa_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_projeto  ON cadastro.indicadores (projeto_id);

DROP TRIGGER IF EXISTS trg_cadastro_indicadores_touch ON cadastro.indicadores;
CREATE TRIGGER trg_cadastro_indicadores_touch
    BEFORE UPDATE ON cadastro.indicadores
    FOR EACH ROW EXECUTE FUNCTION cadastro.fn_touch_atualizado_em();

-- ===========================================================================
-- 5) Preserva a aprovação dos PROJETOS a partir do snapshot antigo
-- ===========================================================================
UPDATE cadastro.projeto p
SET status           = s.status,
    aprovado_em      = s.aprovado_em,
    aprovado_por     = s.aprovado_por,
    motivo_aprovacao = NULLIF(s.motivo_aprovacao, '')
FROM demandas_aprovadas.projetos s
WHERE s.demanda_id = p.id;

-- ===========================================================================
-- 6) Remove o schema espelho (snapshot deixa de existir)
-- ===========================================================================
DROP SCHEMA IF EXISTS demandas_aprovadas CASCADE;

-- ===========================================================================
-- 7) Renomeia o schema cadastro -> demandas (só contém tabelas de demanda)
-- ===========================================================================
ALTER SCHEMA cadastro RENAME TO demandas;

COMMIT;
