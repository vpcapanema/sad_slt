-- SLT — análises AHP (uma tabela por tipo: avulsa e portfólio)
-- Executar conectado ao banco slt_db (após 003_schema_ahp_objetos.sql).
--
-- Cada linha concentra todo o ciclo da hierarquização (conceitual + julgamentos + ranking).
-- Coleções (critérios, premissas, alternativas, matrizes, pesos) ficam em JSONB na mesma linha.

BEGIN;

-- ---------------------------------------------------------------------------
-- ahp.analise_avulsa — hierarquização sem vínculo com demandas / objeto_ahp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ahp.analise_avulsa (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    codigo                      VARCHAR(64) NOT NULL UNIQUE,
    titulo                      VARCHAR(200) NOT NULL,
    descricao                   TEXT,

    status                      VARCHAR(40) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN (
            'rascunho',
            'conceitual_ok',
            'em_julgamento',
            'calculada',
            'homologada',
            'arquivada'
        )),

    -- Etapa conceitual (Excel importado ou preenchido na UI)
    dimensoes                   JSONB NOT NULL DEFAULT '[]'::jsonb,
    criterios                   JSONB NOT NULL DEFAULT '[]'::jsonb,
    matriz_arquivo_nome         TEXT,
    matriz_arquivo_hash         VARCHAR(64),

    -- Fenômenos / alternativas desta análise (sem objeto_ahp)
    -- Ex.: [{"ordem":1,"nome":"Projeto A","descricao":"..."}]
    alternativas                JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Critérios ativos na rodada (subconjunto de criterios)
    criterios_selecionados      JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Julgamentos Saaty entre critérios: {criteria:[], matrix:[][]}
    julgamento_criterios        JSONB,

    -- Pesos dos critérios + métricas AHP: {weights:[], lambda_max, ci, cr, ...}
    pesos_criterios             JSONB,

    -- Julgamentos Saaty entre alternativas, por critério
    -- Ex.: [{"criterio":"NS / Saturacao","criteria":["A","B"],"matrix":[[1,3],[0.333,1]]}]
    julgamento_alternativas     JSONB,

    -- Pesos locais por critério + síntese global
    pesos_alternativas          JSONB,

    -- Ranking final: [{ordem, nome, score, peso_global, detalhe_por_criterio:{...}}]
    ranking                     JSONB,

    homologado_em               TIMESTAMPTZ,
    homologado_por              UUID,

    criado_por                  UUID,
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ahp.analise_avulsa IS
    'Hierarquização AHP avulsa: fenômenos definidos na própria análise; sem vínculo com ahp.objeto_ahp';
COMMENT ON COLUMN ahp.analise_avulsa.dimensoes IS
    'Dimensões conceituais: [{dimensao, justificativa}]';
COMMENT ON COLUMN ahp.analise_avulsa.criterios IS
    'Critérios e premissas: [{dimensao, criterio, premissa, relacao, metricas, fonte, mandatorio}]';
COMMENT ON COLUMN ahp.analise_avulsa.alternativas IS
    'Alternativas (fenômenos) comparados nesta análise';
COMMENT ON COLUMN ahp.analise_avulsa.julgamento_criterios IS
    'Matriz pareada Saaty entre critérios (formato SIGMA AHP: criteria + matrix)';
COMMENT ON COLUMN ahp.analise_avulsa.julgamento_alternativas IS
    'Matrizes pareadas entre alternativas, uma entrada por critério selecionado';
COMMENT ON COLUMN ahp.analise_avulsa.ranking IS
    'Resultado hierárquico final (scores e posições)';

CREATE INDEX IF NOT EXISTS idx_analise_avulsa_status
    ON ahp.analise_avulsa (status);

CREATE INDEX IF NOT EXISTS idx_analise_avulsa_criado_em
    ON ahp.analise_avulsa (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_analise_avulsa_criterios_gin
    ON ahp.analise_avulsa USING GIN (criterios);

CREATE INDEX IF NOT EXISTS idx_analise_avulsa_ranking_gin
    ON ahp.analise_avulsa USING GIN (ranking);

-- ---------------------------------------------------------------------------
-- ahp.analise_portfolio — hierarquização vinculada a ahp.objeto_ahp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ahp.analise_portfolio (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    codigo                      VARCHAR(64) NOT NULL UNIQUE,
    titulo                      VARCHAR(200) NOT NULL,
    descricao                   TEXT,

    grupo_comparacao            VARCHAR(120) NOT NULL,

    status                      VARCHAR(40) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN (
            'rascunho',
            'conceitual_ok',
            'em_julgamento',
            'calculada',
            'homologada',
            'arquivada'
        )),

    dimensoes                   JSONB NOT NULL DEFAULT '[]'::jsonb,
    criterios                   JSONB NOT NULL DEFAULT '[]'::jsonb,
    matriz_arquivo_nome         TEXT,
    matriz_arquivo_hash         VARCHAR(64),

    -- Projetos do portfólio SLT incluídos na análise
    -- Ex.: [{"objeto_ahp_id":"uuid","codigo":"DEM-001","nome":"...","ordem":1}]
    objetos                     JSONB NOT NULL DEFAULT '[]'::jsonb,

    criterios_selecionados      JSONB NOT NULL DEFAULT '[]'::jsonb,

    julgamento_criterios        JSONB,
    pesos_criterios             JSONB,

    -- Julgamentos Saaty entre projetos, por critério
    julgamento_projetos         JSONB,

    pesos_projetos              JSONB,

    -- Ranking: [{objeto_ahp_id, codigo, nome, score, posicao, detalhe_por_criterio:{...}}]
    ranking                     JSONB,

    homologado_em               TIMESTAMPTZ,
    homologado_por              UUID,

    criado_por                  UUID,
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ahp.analise_portfolio IS
    'Hierarquização AHP de portfólio: projetos referenciam ahp.objeto_ahp (snapshot em objetos JSONB)';
COMMENT ON COLUMN ahp.analise_portfolio.grupo_comparacao IS
    'Universo comparável (mesmo plano + frente/eixo); filtra objetos elegíveis';
COMMENT ON COLUMN ahp.analise_portfolio.objetos IS
    'Projetos incluídos: referência a objeto_ahp_id + snapshot operacional';
COMMENT ON COLUMN ahp.analise_portfolio.julgamento_projetos IS
    'Matrizes pareadas entre projetos, uma entrada por critério selecionado';

CREATE INDEX IF NOT EXISTS idx_analise_portfolio_status
    ON ahp.analise_portfolio (status);

CREATE INDEX IF NOT EXISTS idx_analise_portfolio_grupo
    ON ahp.analise_portfolio (grupo_comparacao);

CREATE INDEX IF NOT EXISTS idx_analise_portfolio_criado_em
    ON ahp.analise_portfolio (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_analise_portfolio_criterios_gin
    ON ahp.analise_portfolio USING GIN (criterios);

CREATE INDEX IF NOT EXISTS idx_analise_portfolio_objetos_gin
    ON ahp.analise_portfolio USING GIN (objetos);

CREATE INDEX IF NOT EXISTS idx_analise_portfolio_ranking_gin
    ON ahp.analise_portfolio USING GIN (ranking);

-- ---------------------------------------------------------------------------
-- Touch atualizado_em
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ahp.fn_touch_analise_avulsa()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ahp.fn_touch_analise_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_analise_avulsa_touch ON ahp.analise_avulsa;
CREATE TRIGGER trg_analise_avulsa_touch
    BEFORE UPDATE ON ahp.analise_avulsa
    FOR EACH ROW
    EXECUTE FUNCTION ahp.fn_touch_analise_avulsa();

DROP TRIGGER IF EXISTS trg_analise_portfolio_touch ON ahp.analise_portfolio;
CREATE TRIGGER trg_analise_portfolio_touch
    BEFORE UPDATE ON ahp.analise_portfolio
    FOR EACH ROW
    EXECUTE FUNCTION ahp.fn_touch_analise_portfolio();

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auditoria.fn_registrar_auditoria_analise_avulsa()
RETURNS TRIGGER AS $$
DECLARE
    v_operacao VARCHAR(10);
    v_anterior JSONB;
    v_novo JSONB;
    v_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operacao := 'INSERT';
        v_anterior := NULL;
        v_novo := to_jsonb(NEW);
        v_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operacao := 'UPDATE';
        v_anterior := to_jsonb(OLD);
        v_novo := to_jsonb(NEW);
        v_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        v_operacao := 'DELETE';
        v_anterior := to_jsonb(OLD);
        v_novo := NULL;
        v_id := OLD.id;
    END IF;

    INSERT INTO auditoria.log_sistema (
        nivel, categoria, operacao, schema_nome, tabela, registro_id,
        mensagem, dados_anteriores, dados_novos, origem
    ) VALUES (
        'AUDIT', 'analise_avulsa', v_operacao, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_id,
        format('Análise AHP avulsa %s — operação %s', COALESCE(NEW.codigo, OLD.codigo), v_operacao),
        v_anterior, v_novo, 'sistema'
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auditoria.fn_registrar_auditoria_analise_portfolio()
RETURNS TRIGGER AS $$
DECLARE
    v_operacao VARCHAR(10);
    v_anterior JSONB;
    v_novo JSONB;
    v_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operacao := 'INSERT';
        v_anterior := NULL;
        v_novo := to_jsonb(NEW);
        v_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operacao := 'UPDATE';
        v_anterior := to_jsonb(OLD);
        v_novo := to_jsonb(NEW);
        v_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        v_operacao := 'DELETE';
        v_anterior := to_jsonb(OLD);
        v_novo := NULL;
        v_id := OLD.id;
    END IF;

    INSERT INTO auditoria.log_sistema (
        nivel, categoria, operacao, schema_nome, tabela, registro_id,
        mensagem, dados_anteriores, dados_novos, origem
    ) VALUES (
        'AUDIT', 'analise_portfolio', v_operacao, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_id,
        format('Análise AHP portfólio %s — operação %s', COALESCE(NEW.codigo, OLD.codigo), v_operacao),
        v_anterior, v_novo, 'sistema'
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_analise_avulsa ON ahp.analise_avulsa;
CREATE TRIGGER trg_auditoria_analise_avulsa
    AFTER INSERT OR UPDATE OR DELETE ON ahp.analise_avulsa
    FOR EACH ROW
    EXECUTE FUNCTION auditoria.fn_registrar_auditoria_analise_avulsa();

DROP TRIGGER IF EXISTS trg_auditoria_analise_portfolio ON ahp.analise_portfolio;
CREATE TRIGGER trg_auditoria_analise_portfolio
    AFTER INSERT OR UPDATE OR DELETE ON ahp.analise_portfolio
    FOR EACH ROW
    EXECUTE FUNCTION auditoria.fn_registrar_auditoria_analise_portfolio();

GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.analise_avulsa TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ahp.analise_portfolio TO slt_user;

COMMIT;
