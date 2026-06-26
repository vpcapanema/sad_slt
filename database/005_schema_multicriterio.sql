-- SLT — Separação conceitual em dois módulos:
--   1) Configuração da Análise Multicritério  (define critérios e calcula pesos/consistência)
--   2) Hierarquização de Projetos             (consome uma configuração e rankeia projetos)
--
-- Executar conectado ao banco slt_db (após 004_schema_ahp_analises.sql).
-- Mantém o padrão do schema 'ahp': triggers de atualizado_em, auditoria e grants.
--
-- Convenção: métricas escalares (λmax, IC, IA, RC, consistente) em colunas próprias;
-- coleções de tamanho variável (critérios, matriz, pesos, ranking) em JSONB;
-- snapshot completo da configuração em configuracao_completa (JSONB);
-- arquivo enviado (upload de tabela) guardado por completo em arquivo_conteudo (BYTEA).

BEGIN;

-- ===========================================================================
-- 1) CONFIGURAÇÃO DA ANÁLISE MULTICRITÉRIO
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- ahp.config_multicriterio_avulsa — configuração sem vínculo com portfólio
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ahp.config_multicriterio_avulsa (
    -- Identificação
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo                  VARCHAR(64) NOT NULL UNIQUE,
    nome                    VARCHAR(200) NOT NULL,
    descricao               TEXT,

    status                  VARCHAR(40) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'calculada', 'homologada', 'arquivada')),

    -- Parâmetros dos formulários (Etapas 1–4)
    metodo_entrada          VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (metodo_entrada IN ('manual', 'upload_tabela')),
    metodo_comparacao       VARCHAR(20)
        CHECK (metodo_comparacao IN ('matriz', 'formulario')),
    n_criterios             INTEGER NOT NULL DEFAULT 0,

    criterios               JSONB NOT NULL DEFAULT '[]'::jsonb,
    matriz_comparacao       JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Métricas calculadas (Etapa 5) — colunas próprias
    pesos                   JSONB,
    lambda_max              NUMERIC(12,6),
    indice_consistencia     NUMERIC(12,6),
    indice_aleatorio        NUMERIC(12,6),
    razao_consistencia      NUMERIC(12,6),
    consistente             BOOLEAN,

    -- Arquivo enviado (quando metodo_entrada = upload_tabela)
    arquivo_nome            TEXT,
    arquivo_tipo            VARCHAR(20),
    arquivo_hash            VARCHAR(64),
    arquivo_conteudo        BYTEA,

    -- Snapshot completo da configuração
    configuracao_completa   JSONB,

    -- Auditoria
    homologado_em           TIMESTAMPTZ,
    homologado_por          UUID,
    criado_por              UUID,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ahp.config_multicriterio_avulsa IS
    'Configuração da Análise Multicritério (avulsa): critérios, julgamentos e métricas de consistência';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.criterios IS
    'Critérios e premissas: [{dimensao, criterio, premissa, relacao, metricas, fonte, mandatorio}]';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.matriz_comparacao IS
    'Matriz pareada Saaty entre critérios [][]';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.pesos IS
    'Vetor de pesos por critério (autovetor principal normalizado)';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.lambda_max IS 'λmax — maior autovalor da matriz';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.indice_consistencia IS 'IC = (λmax - n) / (n - 1)';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.indice_aleatorio IS 'IA — índice aleatório (por n)';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.razao_consistencia IS 'RC = IC / IA';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.consistente IS 'RC < 0,10';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.arquivo_conteudo IS
    'Conteúdo binário do arquivo de tabela enviado (xlsx/csv)';
COMMENT ON COLUMN ahp.config_multicriterio_avulsa.configuracao_completa IS
    'Snapshot completo da configuração (todos os parâmetros e saídas em um único JSON)';

CREATE INDEX IF NOT EXISTS idx_config_mc_avulsa_status
    ON ahp.config_multicriterio_avulsa (status);
CREATE INDEX IF NOT EXISTS idx_config_mc_avulsa_criado_em
    ON ahp.config_multicriterio_avulsa (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_config_mc_avulsa_criterios_gin
    ON ahp.config_multicriterio_avulsa USING GIN (criterios);

-- Regra: só pode ser homologada se as métricas estiverem de acordo (consistente = true)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_config_mc_avulsa_homolog') THEN
        ALTER TABLE ahp.config_multicriterio_avulsa
            ADD CONSTRAINT chk_config_mc_avulsa_homolog
            CHECK (status <> 'homologada' OR consistente IS TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ahp.config_multicriterio_portfolio — configuração vinculada a portfólio
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ahp.config_multicriterio_portfolio (
    -- Identificação
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo                  VARCHAR(64) NOT NULL UNIQUE,
    nome                    VARCHAR(200) NOT NULL,
    descricao               TEXT,

    grupo_comparacao        VARCHAR(120) NOT NULL,

    status                  VARCHAR(40) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'calculada', 'homologada', 'arquivada')),

    metodo_entrada          VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (metodo_entrada IN ('manual', 'upload_tabela')),
    metodo_comparacao       VARCHAR(20)
        CHECK (metodo_comparacao IN ('matriz', 'formulario')),
    n_criterios             INTEGER NOT NULL DEFAULT 0,

    criterios               JSONB NOT NULL DEFAULT '[]'::jsonb,
    matriz_comparacao       JSONB NOT NULL DEFAULT '[]'::jsonb,

    pesos                   JSONB,
    lambda_max              NUMERIC(12,6),
    indice_consistencia     NUMERIC(12,6),
    indice_aleatorio        NUMERIC(12,6),
    razao_consistencia      NUMERIC(12,6),
    consistente             BOOLEAN,

    arquivo_nome            TEXT,
    arquivo_tipo            VARCHAR(20),
    arquivo_hash            VARCHAR(64),
    arquivo_conteudo        BYTEA,

    configuracao_completa   JSONB,

    homologado_em           TIMESTAMPTZ,
    homologado_por          UUID,
    criado_por              UUID,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ahp.config_multicriterio_portfolio IS
    'Configuração da Análise Multicritério (portfólio): critérios/pesos para um grupo comparável de projetos';
COMMENT ON COLUMN ahp.config_multicriterio_portfolio.grupo_comparacao IS
    'Universo comparável (mesmo plano + frente/eixo)';

CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_status
    ON ahp.config_multicriterio_portfolio (status);
CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_grupo
    ON ahp.config_multicriterio_portfolio (grupo_comparacao);
CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_criado_em
    ON ahp.config_multicriterio_portfolio (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_config_mc_portfolio_criterios_gin
    ON ahp.config_multicriterio_portfolio USING GIN (criterios);

-- Regra: só pode ser homologada se as métricas estiverem de acordo (consistente = true)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_config_mc_portfolio_homolog') THEN
        ALTER TABLE ahp.config_multicriterio_portfolio
            ADD CONSTRAINT chk_config_mc_portfolio_homolog
            CHECK (status <> 'homologada' OR consistente IS TRUE);
    END IF;
END $$;

-- ===========================================================================
-- 2) HIERARQUIZAÇÃO DE PROJETOS (consome uma configuração)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- ahp.hierarquizacao_portfolio — projetos do portfólio (objeto_ahp)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ahp.hierarquizacao_portfolio (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo                  VARCHAR(64) NOT NULL UNIQUE,
    config_id               UUID NOT NULL
        REFERENCES ahp.config_multicriterio_portfolio(id) ON DELETE RESTRICT,

    nome                    VARCHAR(200) NOT NULL,
    descricao               TEXT,
    grupo_comparacao        VARCHAR(120) NOT NULL,

    status                  VARCHAR(40) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'em_julgamento', 'calculada', 'homologada', 'arquivada')),

    -- Projetos incluídos: [{objeto_ahp_id, codigo, nome, ordem}]
    objetos                 JSONB NOT NULL DEFAULT '[]'::jsonb,

    julgamento_projetos     JSONB,
    pesos_projetos          JSONB,
    ranking                 JSONB,

    homologado_em           TIMESTAMPTZ,
    homologado_por          UUID,
    criado_por              UUID,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ahp.hierarquizacao_portfolio IS
    'Hierarquização de Projetos (portfólio): rankeia objeto_ahp usando uma config_multicriterio_portfolio';

CREATE INDEX IF NOT EXISTS idx_hier_portfolio_config
    ON ahp.hierarquizacao_portfolio (config_id);
CREATE INDEX IF NOT EXISTS idx_hier_portfolio_status
    ON ahp.hierarquizacao_portfolio (status);
CREATE INDEX IF NOT EXISTS idx_hier_portfolio_grupo
    ON ahp.hierarquizacao_portfolio (grupo_comparacao);
CREATE INDEX IF NOT EXISTS idx_hier_portfolio_objetos_gin
    ON ahp.hierarquizacao_portfolio USING GIN (objetos);
CREATE INDEX IF NOT EXISTS idx_hier_portfolio_ranking_gin
    ON ahp.hierarquizacao_portfolio USING GIN (ranking);

-- ===========================================================================
-- Triggers: atualizado_em (touch)
-- ===========================================================================
CREATE OR REPLACE FUNCTION ahp.fn_touch_multicriterio()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_config_mc_avulsa ON ahp.config_multicriterio_avulsa;
CREATE TRIGGER trg_touch_config_mc_avulsa
    BEFORE UPDATE ON ahp.config_multicriterio_avulsa
    FOR EACH ROW EXECUTE FUNCTION ahp.fn_touch_multicriterio();

DROP TRIGGER IF EXISTS trg_touch_config_mc_portfolio ON ahp.config_multicriterio_portfolio;
CREATE TRIGGER trg_touch_config_mc_portfolio
    BEFORE UPDATE ON ahp.config_multicriterio_portfolio
    FOR EACH ROW EXECUTE FUNCTION ahp.fn_touch_multicriterio();

DROP TRIGGER IF EXISTS trg_touch_hier_portfolio ON ahp.hierarquizacao_portfolio;
CREATE TRIGGER trg_touch_hier_portfolio
    BEFORE UPDATE ON ahp.hierarquizacao_portfolio
    FOR EACH ROW EXECUTE FUNCTION ahp.fn_touch_multicriterio();

-- ===========================================================================
-- Auditoria (genérica para as 4 tabelas)
-- ===========================================================================
CREATE OR REPLACE FUNCTION auditoria.fn_registrar_auditoria_multicriterio()
RETURNS TRIGGER AS $$
DECLARE
    v_operacao VARCHAR(10);
    v_anterior JSONB;
    v_novo JSONB;
    v_id UUID;
    v_codigo TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operacao := 'INSERT'; v_anterior := NULL; v_novo := to_jsonb(NEW);
        v_id := NEW.id; v_codigo := NEW.codigo;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operacao := 'UPDATE'; v_anterior := to_jsonb(OLD); v_novo := to_jsonb(NEW);
        v_id := NEW.id; v_codigo := NEW.codigo;
    ELSIF TG_OP = 'DELETE' THEN
        v_operacao := 'DELETE'; v_anterior := to_jsonb(OLD); v_novo := NULL;
        v_id := OLD.id; v_codigo := OLD.codigo;
    END IF;

    -- Evita gravar o binário do arquivo na auditoria
    IF v_anterior IS NOT NULL THEN v_anterior := v_anterior - 'arquivo_conteudo'; END IF;
    IF v_novo IS NOT NULL THEN v_novo := v_novo - 'arquivo_conteudo'; END IF;

    INSERT INTO auditoria.log_sistema (
        nivel, categoria, operacao, schema_nome, tabela, registro_id,
        mensagem, dados_anteriores, dados_novos, origem
    ) VALUES (
        'AUDIT', TG_TABLE_NAME, v_operacao, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_id,
        format('%s %s — operação %s', TG_TABLE_NAME, v_codigo, v_operacao),
        v_anterior, v_novo, 'sistema'
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_config_mc_avulsa ON ahp.config_multicriterio_avulsa;
CREATE TRIGGER trg_auditoria_config_mc_avulsa
    AFTER INSERT OR UPDATE OR DELETE ON ahp.config_multicriterio_avulsa
    FOR EACH ROW EXECUTE FUNCTION auditoria.fn_registrar_auditoria_multicriterio();

DROP TRIGGER IF EXISTS trg_auditoria_config_mc_portfolio ON ahp.config_multicriterio_portfolio;
CREATE TRIGGER trg_auditoria_config_mc_portfolio
    AFTER INSERT OR UPDATE OR DELETE ON ahp.config_multicriterio_portfolio
    FOR EACH ROW EXECUTE FUNCTION auditoria.fn_registrar_auditoria_multicriterio();

DROP TRIGGER IF EXISTS trg_auditoria_hier_portfolio ON ahp.hierarquizacao_portfolio;
CREATE TRIGGER trg_auditoria_hier_portfolio
    AFTER INSERT OR UPDATE OR DELETE ON ahp.hierarquizacao_portfolio
    FOR EACH ROW EXECUTE FUNCTION auditoria.fn_registrar_auditoria_multicriterio();

-- ===========================================================================
-- Grants
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.config_multicriterio_avulsa TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.config_multicriterio_portfolio TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.hierarquizacao_portfolio TO slt_user;

COMMIT;
