-- SLT — hierarquia de demandas aprovadas: Plano > Programa > Projeto (+ indicadores)
-- Executar conectado ao banco slt_db (após 011_schema_geo.sql).
--
-- Conceito (após selecionar a Diretoria):
--   Plano    (nível 1) -> Programa (nível 2) -> Projeto (nível 3)
-- O grupo comparável do AHP em cada nível é o pai:
--   projetos por programa; programas por plano; planos por diretoria.
--
-- Abrangência territorial (unidade espacial de atuação): plano e programa
-- referenciam uma ou mais geo.unidade_espacial (município, RA, RG, RM, UGRHI,
-- zona ZEE ou o estado inteiro). Projeto mantém apenas sua geometria própria.
--
-- Estratégia "banco rico, formulário progressivo": apenas o núcleo é NOT NULL;
-- os demais campos são opcionais e a UI os habilita em versões futuras.

BEGIN;

-- ===========================================================================
-- 1) PLANO  (nível 1)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS demandas_aprovadas.planos (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo                  VARCHAR(64) NOT NULL UNIQUE,

    -- Contexto institucional (catálogo local) — obrigatório v1
    diretoria_id            VARCHAR(50) NOT NULL,

    nome                    VARCHAR(200) NOT NULL,
    descricao               TEXT NOT NULL,

    -- Atributos ricos (opcionais; UI habilita depois)
    objetivo_estrategico    TEXT,
    responsavel             TEXT,
    vigencia_inicio         DATE,
    vigencia_fim            DATE,
    valor_global            NUMERIC(18,2),

    -- Fluxo (reaproveita o domínio de status das demandas aprovadas)
    status                  VARCHAR(50) NOT NULL DEFAULT 'elegivel_ahp'
        REFERENCES demandas_aprovadas.dom_status_demandas_aprovadas (codigo),
    status_atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por              UUID,
    atualizado_por          UUID,

    CONSTRAINT ck_planos_vigencia
        CHECK (vigencia_fim IS NULL OR vigencia_inicio IS NULL OR vigencia_fim >= vigencia_inicio)
);

COMMENT ON TABLE demandas_aprovadas.planos IS
    'Planos (nível 1 da hierarquia de demandas aprovadas); pai = diretoria';

CREATE INDEX IF NOT EXISTS idx_planos_diretoria ON demandas_aprovadas.planos (diretoria_id);
CREATE INDEX IF NOT EXISTS idx_planos_status    ON demandas_aprovadas.planos (status);

-- ===========================================================================
-- 2) PROGRAMA  (nível 2)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS demandas_aprovadas.programas (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo                  VARCHAR(64) NOT NULL UNIQUE,

    plano_id                UUID NOT NULL
        REFERENCES demandas_aprovadas.planos (id) ON DELETE RESTRICT,

    nome                    VARCHAR(200) NOT NULL,
    descricao               TEXT NOT NULL,

    -- Atributos ricos (opcionais)
    objetivo                TEXT,
    publico_alvo            TEXT,
    orgao_responsavel       TEXT,
    justificativa           TEXT,
    valor_global            NUMERIC(18,2),

    status                  VARCHAR(50) NOT NULL DEFAULT 'elegivel_ahp'
        REFERENCES demandas_aprovadas.dom_status_demandas_aprovadas (codigo),
    status_atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por              UUID,
    atualizado_por          UUID
);

COMMENT ON TABLE demandas_aprovadas.programas IS
    'Programas (nível 2); pai = plano. Grupo comparável do AHP = plano_id';

CREATE INDEX IF NOT EXISTS idx_programas_plano  ON demandas_aprovadas.programas (plano_id);
CREATE INDEX IF NOT EXISTS idx_programas_status ON demandas_aprovadas.programas (status);

-- ===========================================================================
-- 3) PROJETO (nível 3) — renomeia a tabela existente e ajusta colunas
-- ===========================================================================
-- 3a) novo pai: programa_id (nullable por ora; app exige no cadastro novo)
ALTER TABLE demandas_aprovadas.demandas_aprovadas
    ADD COLUMN IF NOT EXISTS programa_id UUID
        REFERENCES demandas_aprovadas.programas (id) ON DELETE RESTRICT;

-- 3b) remove redundância (plano/diretoria derivam da cadeia programa->plano)
ALTER TABLE demandas_aprovadas.demandas_aprovadas DROP COLUMN IF EXISTS diretoria_id;
ALTER TABLE demandas_aprovadas.demandas_aprovadas DROP COLUMN IF EXISTS plano_id;

-- 3c) renomeia a tabela para "projetos"
ALTER TABLE IF EXISTS demandas_aprovadas.demandas_aprovadas
    RENAME TO projetos;

COMMENT ON TABLE demandas_aprovadas.projetos IS
    'Projetos (nível 3); pai = programa. Grupo comparável do AHP = programa_id (grupo_comparacao mantido temporariamente)';

CREATE INDEX IF NOT EXISTS idx_projetos_programa ON demandas_aprovadas.projetos (programa_id);

-- ===========================================================================
-- 4) INDICADORES (vinculados a plano OU programa) — future-proof
-- ===========================================================================
CREATE TABLE IF NOT EXISTS demandas_aprovadas.indicadores (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    plano_id                UUID REFERENCES demandas_aprovadas.planos (id) ON DELETE CASCADE,
    programa_id             UUID REFERENCES demandas_aprovadas.programas (id) ON DELETE CASCADE,

    nome                    TEXT NOT NULL,
    descricao               TEXT,
    unidade_medida          TEXT,
    linha_base              NUMERIC(18,4),
    polaridade              VARCHAR(20)
        CHECK (polaridade IS NULL OR polaridade IN ('maior_melhor', 'menor_melhor')),
    metas                   JSONB,

    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Exatamente um pai (plano OU programa)
    CONSTRAINT ck_indicadores_um_pai
        CHECK (num_nonnulls(plano_id, programa_id) = 1)
);

COMMENT ON TABLE demandas_aprovadas.indicadores IS
    'Indicadores de plano/programa (alimentam critérios/dados do AHP no futuro)';

CREATE INDEX IF NOT EXISTS idx_indicadores_plano    ON demandas_aprovadas.indicadores (plano_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_programa ON demandas_aprovadas.indicadores (programa_id);

-- ===========================================================================
-- 5) ABRANGÊNCIA (unidade espacial de atuação) — N:N com geo.unidade_espacial
-- ===========================================================================
CREATE TABLE IF NOT EXISTS demandas_aprovadas.plano_unidade_espacial (
    plano_id                UUID NOT NULL
        REFERENCES demandas_aprovadas.planos (id) ON DELETE CASCADE,
    unidade_espacial_id     UUID NOT NULL
        REFERENCES geo.unidade_espacial (id) ON DELETE RESTRICT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (plano_id, unidade_espacial_id)
);

COMMENT ON TABLE demandas_aprovadas.plano_unidade_espacial IS
    'Abrangência territorial do plano (um ou mais municípios/regiões de geo.unidade_espacial)';

CREATE INDEX IF NOT EXISTS idx_plano_ue_unidade
    ON demandas_aprovadas.plano_unidade_espacial (unidade_espacial_id);

CREATE TABLE IF NOT EXISTS demandas_aprovadas.programa_unidade_espacial (
    programa_id             UUID NOT NULL
        REFERENCES demandas_aprovadas.programas (id) ON DELETE CASCADE,
    unidade_espacial_id     UUID NOT NULL
        REFERENCES geo.unidade_espacial (id) ON DELETE RESTRICT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (programa_id, unidade_espacial_id)
);

COMMENT ON TABLE demandas_aprovadas.programa_unidade_espacial IS
    'Abrangência territorial do programa (um ou mais municípios/regiões de geo.unidade_espacial)';

CREATE INDEX IF NOT EXISTS idx_programa_ue_unidade
    ON demandas_aprovadas.programa_unidade_espacial (unidade_espacial_id);

-- ===========================================================================
-- 6) Touch atualizado_em / status_atualizado_em (plano, programa, indicadores)
-- ===========================================================================
CREATE OR REPLACE FUNCTION demandas_aprovadas.fn_touch_hierarquia()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := CURRENT_TIMESTAMP;
    IF TG_OP = 'UPDATE'
       AND to_jsonb(NEW) ? 'status'
       AND (to_jsonb(OLD)->>'status') IS DISTINCT FROM (to_jsonb(NEW)->>'status') THEN
        NEW.status_atualizado_em := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_planos_touch ON demandas_aprovadas.planos;
CREATE TRIGGER trg_planos_touch BEFORE UPDATE ON demandas_aprovadas.planos
    FOR EACH ROW EXECUTE FUNCTION demandas_aprovadas.fn_touch_hierarquia();

DROP TRIGGER IF EXISTS trg_programas_touch ON demandas_aprovadas.programas;
CREATE TRIGGER trg_programas_touch BEFORE UPDATE ON demandas_aprovadas.programas
    FOR EACH ROW EXECUTE FUNCTION demandas_aprovadas.fn_touch_hierarquia();

DROP TRIGGER IF EXISTS trg_indicadores_touch ON demandas_aprovadas.indicadores;
CREATE TRIGGER trg_indicadores_touch BEFORE UPDATE ON demandas_aprovadas.indicadores
    FOR EACH ROW EXECUTE FUNCTION demandas_aprovadas.fn_touch_hierarquia();

-- ===========================================================================
-- 7) Permissões
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA demandas_aprovadas TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA demandas_aprovadas TO slt_user;

COMMIT;
