-- SLT — schema cadastro preparado para os 3 níveis: Plano > Programa > Projeto
-- Executar conectado ao banco slt_db (após 013_indicadores_projeto.sql).
--
-- Simetria com demandas_aprovadas (Opção C):
--   cadastro.cadastro_demanda  ->  cadastro.projeto  (intake externo, via SIGMA + geometria)
--   cadastro.plano             ->  cadastro interno (diretoria/admin)
--   cadastro.programa          ->  cadastro interno (filho de plano)
--
-- Plano/Programa são cadastro interno: sem instituição/representante externos.
-- A abrangência territorial é SELECIONADA das tabelas geo (geo.unidade_espacial),
-- via tabelas de vínculo N:N (uma ou mais unidades por plano/programa).

BEGIN;

-- ===========================================================================
-- 1) cadastro.plano  (nível 1 — interno)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS cadastro.plano (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo                  VARCHAR(64) NOT NULL UNIQUE,

    diretoria_id            VARCHAR(50) NOT NULL,

    nome                    VARCHAR(200) NOT NULL,
    descricao               TEXT NOT NULL,

    objetivo_estrategico    TEXT,
    responsavel             TEXT,
    vigencia_inicio         DATE,
    vigencia_fim            DATE,
    valor_global            NUMERIC(18,2),

    status                  VARCHAR(50) NOT NULL DEFAULT 'rascunho'
        REFERENCES cadastro.dom_status_demanda (codigo),
    status_atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por              UUID,
    atualizado_por          UUID,

    CONSTRAINT ck_cadastro_plano_vigencia
        CHECK (vigencia_fim IS NULL OR vigencia_inicio IS NULL OR vigencia_fim >= vigencia_inicio)
);

COMMENT ON TABLE cadastro.plano IS
    'Cadastro (intake) de Planos — nível 1; cadastro interno (diretoria/admin)';

CREATE INDEX IF NOT EXISTS idx_cadastro_plano_diretoria ON cadastro.plano (diretoria_id);
CREATE INDEX IF NOT EXISTS idx_cadastro_plano_status    ON cadastro.plano (status);

-- ===========================================================================
-- 2) cadastro.programa  (nível 2 — interno)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS cadastro.programa (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo                  VARCHAR(64) NOT NULL UNIQUE,

    plano_id                UUID NOT NULL
        REFERENCES cadastro.plano (id) ON DELETE RESTRICT,

    nome                    VARCHAR(200) NOT NULL,
    descricao               TEXT NOT NULL,

    objetivo                TEXT,
    publico_alvo            TEXT,
    orgao_responsavel       TEXT,
    justificativa           TEXT,
    valor_global            NUMERIC(18,2),

    status                  VARCHAR(50) NOT NULL DEFAULT 'rascunho'
        REFERENCES cadastro.dom_status_demanda (codigo),
    status_atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por              UUID,
    atualizado_por          UUID
);

COMMENT ON TABLE cadastro.programa IS
    'Cadastro (intake) de Programas — nível 2; filho de cadastro.plano';

CREATE INDEX IF NOT EXISTS idx_cadastro_programa_plano  ON cadastro.programa (plano_id);
CREATE INDEX IF NOT EXISTS idx_cadastro_programa_status ON cadastro.programa (status);

-- ===========================================================================
-- 3) Abrangência (unidade espacial de atuação) — selecionada das tabelas geo
-- ===========================================================================
CREATE TABLE IF NOT EXISTS cadastro.plano_unidade_espacial (
    plano_id                UUID NOT NULL
        REFERENCES cadastro.plano (id) ON DELETE CASCADE,
    unidade_espacial_id     UUID NOT NULL
        REFERENCES geo.unidade_espacial (id) ON DELETE RESTRICT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (plano_id, unidade_espacial_id)
);

COMMENT ON TABLE cadastro.plano_unidade_espacial IS
    'Abrangência territorial do plano em cadastro (geo.unidade_espacial)';

CREATE INDEX IF NOT EXISTS idx_cad_plano_ue_unidade
    ON cadastro.plano_unidade_espacial (unidade_espacial_id);

CREATE TABLE IF NOT EXISTS cadastro.programa_unidade_espacial (
    programa_id             UUID NOT NULL
        REFERENCES cadastro.programa (id) ON DELETE CASCADE,
    unidade_espacial_id     UUID NOT NULL
        REFERENCES geo.unidade_espacial (id) ON DELETE RESTRICT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (programa_id, unidade_espacial_id)
);

COMMENT ON TABLE cadastro.programa_unidade_espacial IS
    'Abrangência territorial do programa em cadastro (geo.unidade_espacial)';

CREATE INDEX IF NOT EXISTS idx_cad_programa_ue_unidade
    ON cadastro.programa_unidade_espacial (unidade_espacial_id);

-- ===========================================================================
-- 4) Projeto (nível 3) — renomeia cadastro_demanda e prepara vínculo ao programa
-- ===========================================================================
-- Mantém diretoria_id/plano_id (snapshot do form atual) para não quebrar o intake.
ALTER TABLE cadastro.cadastro_demanda
    ADD COLUMN IF NOT EXISTS programa_id UUID
        REFERENCES cadastro.programa (id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS cadastro.cadastro_demanda
    RENAME TO projeto;

COMMENT ON TABLE cadastro.projeto IS
    'Cadastro (intake) de Projetos — nível 3; demanda externa (SIGMA + geometria). Antiga cadastro_demanda';

CREATE INDEX IF NOT EXISTS idx_cadastro_projeto_programa ON cadastro.projeto (programa_id);

-- ===========================================================================
-- 5) Touch atualizado_em / status_atualizado_em (plano, programa)
--    Reutiliza cadastro.fn_touch_atualizado_em (já trata status).
-- ===========================================================================
DROP TRIGGER IF EXISTS trg_cadastro_plano_touch ON cadastro.plano;
CREATE TRIGGER trg_cadastro_plano_touch
    BEFORE UPDATE ON cadastro.plano
    FOR EACH ROW EXECUTE FUNCTION cadastro.fn_touch_atualizado_em();

DROP TRIGGER IF EXISTS trg_cadastro_programa_touch ON cadastro.programa;
CREATE TRIGGER trg_cadastro_programa_touch
    BEFORE UPDATE ON cadastro.programa
    FOR EACH ROW EXECUTE FUNCTION cadastro.fn_touch_atualizado_em();

-- ===========================================================================
-- 6) Permissões
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cadastro TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA cadastro TO slt_user;

COMMIT;
