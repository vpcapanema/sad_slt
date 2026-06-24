-- SLT — objetos alvo da hierarquização AHP
-- Executar conectado ao banco slt_db (após 002_schema_cadastro_auditoria.sql).
--
-- Fluxo: demanda aprovada pelo administrador → registro em ahp.objeto_ahp.
-- O módulo AHP consulta SOMENTE ahp.objeto_ahp (não cadastro.cadastro_demanda).

BEGIN;

CREATE SCHEMA IF NOT EXISTS ahp;

COMMENT ON SCHEMA ahp IS
    'Objetos elegíveis e em processo de hierarquização AHP';

-- ---------------------------------------------------------------------------
-- Status do objeto na fila / rodada AHP
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ahp.dom_status_objeto (
    codigo          VARCHAR(50) PRIMARY KEY,
    nome            TEXT NOT NULL,
    descricao       TEXT,
    ordem           SMALLINT NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ahp.dom_status_objeto IS
    'Status do ciclo de vida do objeto na hierarquização AHP';

INSERT INTO ahp.dom_status_objeto (codigo, nome, descricao, ordem) VALUES
    ('elegivel_ahp',        'Elegível AHP',           'Demanda aprovada; aguardando rodada de hierarquização', 10),
    ('em_hierarquizacao',   'Em hierarquização',      'Objeto incluído em rodada AHP ativa',                   20),
    ('hierarquizado',       'Hierarquizado',          'Ranking AHP concluído para este objeto',                30),
    ('suspenso',            'Suspenso',               'Retirado temporariamente da fila AHP',                  40),
    ('retirado',            'Retirado',               'Removido do universo AHP (definitivo)',                 50)
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- ahp.objeto_ahp — universo comparável da AHP
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ahp.objeto_ahp (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identificação (código legível; por padrão igual ao da demanda de origem)
    codigo                      VARCHAR(64) NOT NULL UNIQUE,

    -- Origem (1 demanda aprovada → no máximo 1 objeto AHP)
    demanda_id                  UUID NOT NULL UNIQUE
        REFERENCES cadastro.cadastro_demanda (id) ON DELETE RESTRICT,
    demanda_codigo              VARCHAR(64) NOT NULL,

    -- Fluxo AHP
    status                      VARCHAR(50) NOT NULL DEFAULT 'elegivel_ahp'
        REFERENCES ahp.dom_status_objeto (codigo),
    status_atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Agrupamento para comparação pareada (mesmo plano + frente/eixo)
    grupo_comparacao            VARCHAR(120) NOT NULL,

    -- Snapshot operacional para a AHP (copiado na aprovação)
    nome                        VARCHAR(200) NOT NULL,
    descricao                   TEXT,
    diretoria_id                VARCHAR(50) NOT NULL,
    plano_id                    VARCHAR(50) NOT NULL,
    classificacao               JSONB,
    complementos                JSONB,

    instituicao_nome            TEXT,
    instituicao_cnpj            VARCHAR(18),

    latitude                    DOUBLE PRECISION NOT NULL,
    longitude                   DOUBLE PRECISION NOT NULL,
    geometria_tipo              VARCHAR(20)
        CHECK (geometria_tipo IS NULL OR geometria_tipo IN (
            'Point', 'LineString', 'Polygon',
            'MultiPoint', 'MultiLineString', 'MultiPolygon'
        )),
    geometria                   geometry(Geometry, 4326),

    -- Aprovação administrativa
    aprovado_em                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aprovado_por                UUID,
    motivo_aprovacao            TEXT,

    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_objeto_ahp_coordenadas
        CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

COMMENT ON TABLE ahp.objeto_ahp IS
    'Objetos alvo da hierarquização AHP; populados quando a demanda é aprovada pelo administrador';
COMMENT ON COLUMN ahp.objeto_ahp.demanda_id IS
    'Demanda de origem (cadastro.cadastro_demanda.id); relação 1:1 após aprovação';
COMMENT ON COLUMN ahp.objeto_ahp.grupo_comparacao IS
    'Chave de universo comparável (ex.: PLANO-PLI|FRENTE-01) para rodadas AHP';
COMMENT ON COLUMN ahp.objeto_ahp.status IS
    'Status no fluxo AHP; módulo AHP filtra por status elegivel_ahp / em_hierarquizacao';

CREATE INDEX IF NOT EXISTS idx_objeto_ahp_status
    ON ahp.objeto_ahp (status);

CREATE INDEX IF NOT EXISTS idx_objeto_ahp_grupo
    ON ahp.objeto_ahp (grupo_comparacao);

CREATE INDEX IF NOT EXISTS idx_objeto_ahp_plano
    ON ahp.objeto_ahp (plano_id);

CREATE INDEX IF NOT EXISTS idx_objeto_ahp_aprovado_em
    ON ahp.objeto_ahp (aprovado_em DESC);

CREATE INDEX IF NOT EXISTS idx_objeto_ahp_geometria_gist
    ON ahp.objeto_ahp USING GIST (geometria);

CREATE INDEX IF NOT EXISTS idx_objeto_ahp_classificacao_gin
    ON ahp.objeto_ahp USING GIN (classificacao);

-- ---------------------------------------------------------------------------
-- Touch atualizado_em
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ahp.fn_touch_objeto_ahp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := CURRENT_TIMESTAMP;
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_atualizado_em := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_objeto_ahp_touch ON ahp.objeto_ahp;
CREATE TRIGGER trg_objeto_ahp_touch
    BEFORE UPDATE ON ahp.objeto_ahp
    FOR EACH ROW
    EXECUTE FUNCTION ahp.fn_touch_objeto_ahp();

-- ---------------------------------------------------------------------------
-- Auditoria automática
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auditoria.fn_registrar_auditoria_objeto_ahp()
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
        'AUDIT', 'objeto_ahp', v_operacao, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_id,
        format('Objeto AHP %s — operação %s', COALESCE(NEW.codigo, OLD.codigo), v_operacao),
        v_anterior, v_novo, 'sistema'
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_objeto_ahp ON ahp.objeto_ahp;
CREATE TRIGGER trg_auditoria_objeto_ahp
    AFTER INSERT OR UPDATE OR DELETE ON ahp.objeto_ahp
    FOR EACH ROW
    EXECUTE FUNCTION auditoria.fn_registrar_auditoria_objeto_ahp();

GRANT USAGE ON SCHEMA ahp TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ahp TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ahp TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ahp GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
