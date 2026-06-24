-- SLT — esquemas cadastro + auditoria, tabelas iniciais e PostGIS
-- Executar conectado ao banco slt_db.

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Esquemas
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS cadastro;
CREATE SCHEMA IF NOT EXISTS auditoria;

COMMENT ON SCHEMA cadastro IS 'Cadastros operacionais do SLT (demandas de projeto, etc.)';
COMMENT ON SCHEMA auditoria IS 'Trilha de auditoria e logs do sistema SLT';

-- ---------------------------------------------------------------------------
-- Domínio de status da demanda
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cadastro.dom_status_demanda (
    codigo          VARCHAR(50) PRIMARY KEY,
    nome            TEXT NOT NULL,
    descricao       TEXT,
    ordem           SMALLINT NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cadastro.dom_status_demanda IS
    'Status do fluxo de vida da demanda no SLT';

INSERT INTO cadastro.dom_status_demanda (codigo, nome, descricao, ordem) VALUES
    ('rascunho',              'Rascunho',              'Demanda iniciada, ainda não enviada',                    10),
    ('fila_hierarquizacao',   'Fila de hierarquização', 'Demanda registrada aguardando hierarquização (AHP)',     20),
    ('em_analise',            'Em análise',            'Demanda em análise técnica',                             30),
    ('aprovada',              'Aprovada',              'Demanda aprovada no fluxo',                              40),
    ('reprovada',             'Reprovada',             'Demanda reprovada no fluxo',                             50),
    ('arquivada',             'Arquivada',             'Demanda arquivada / encerrada',                          60)
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- cadastro.cadastro_demanda
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cadastro.cadastro_demanda (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identificador legível exibido na UI (ex.: DEM-20260617-abc123)
    codigo                      VARCHAR(64) NOT NULL UNIQUE,

    -- Fluxo
    status                      VARCHAR(50) NOT NULL DEFAULT 'fila_hierarquizacao'
        REFERENCES cadastro.dom_status_demanda (codigo),
    status_atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- -----------------------------------------------------------------------
    -- Instituição demandante (origem: API SIGMA — cadastro.instituicao)
    -- Referência lógica cross-database; sem FK física para sigma_pli_qr53.
    -- -----------------------------------------------------------------------
    sigma_instituicao_id        UUID NOT NULL,
    instituicao_nome            TEXT,
    instituicao_razao_social    TEXT,
    instituicao_nome_fantasia   TEXT,
    instituicao_cnpj            VARCHAR(18),

    -- -----------------------------------------------------------------------
    -- Representante legal (origem: API SIGMA — cadastro.pessoa)
    -- -----------------------------------------------------------------------
    sigma_pessoa_id             UUID NOT NULL,
    representante_nome          TEXT NOT NULL,
    representante_email         TEXT,
    representante_telefone        TEXT,

    -- -----------------------------------------------------------------------
    -- Contexto institucional SLT (catálogo local)
    -- -----------------------------------------------------------------------
    diretoria_id                VARCHAR(50) NOT NULL,
    plano_id                    VARCHAR(50) NOT NULL,

    -- -----------------------------------------------------------------------
    -- Projeto
    -- -----------------------------------------------------------------------
    nome                        VARCHAR(200) NOT NULL,
    descricao                   TEXT,

    -- -----------------------------------------------------------------------
    -- Localização (WGS84 — mesmo SRID usado pelo formulário / Leaflet)
    -- -----------------------------------------------------------------------
    latitude                    DOUBLE PRECISION NOT NULL,
    longitude                   DOUBLE PRECISION NOT NULL,
    geometria_tipo              VARCHAR(20)
        CHECK (geometria_tipo IS NULL OR geometria_tipo IN ('Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon')),
    geometria                   geometry(Geometry, 4326),

    -- Classificação PLI/PEF e complementos (espelho do payload JSON do formulário)
    classificacao               JSONB,
    complementos                JSONB,

    -- Metadados
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por                  UUID,
    atualizado_por              UUID,

    CONSTRAINT ck_cadastro_demanda_coordenadas
        CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),

    CONSTRAINT ck_cadastro_demanda_geometria_consistente
        CHECK (
            (geometria IS NULL AND geometria_tipo IS NULL)
            OR (geometria IS NOT NULL)
        )
);

COMMENT ON TABLE cadastro.cadastro_demanda IS
    'Demandas de projeto registradas pelo formulário inicial do SLT';

COMMENT ON COLUMN cadastro.cadastro_demanda.sigma_instituicao_id IS
    'UUID da instituição no SIGMA (cadastro.instituicao.id) — preenchido via API SIGMA';
COMMENT ON COLUMN cadastro.cadastro_demanda.sigma_pessoa_id IS
    'UUID do representante legal no SIGMA (cadastro.pessoa.id) — preenchido via API SIGMA';
COMMENT ON COLUMN cadastro.cadastro_demanda.instituicao_nome IS
    'Snapshot do rótulo exibido no formulário (razão social / nome) no momento do cadastro';
COMMENT ON COLUMN cadastro.cadastro_demanda.representante_nome IS
    'Snapshot de nome_completo do representante no momento do cadastro';
COMMENT ON COLUMN cadastro.cadastro_demanda.status IS
    'Status atual da demanda no fluxo SLT';
COMMENT ON COLUMN cadastro.cadastro_demanda.geometria IS
    'Geometria do projeto (ponto, linha ou polígono) em EPSG:4326 (PostGIS)';
COMMENT ON COLUMN cadastro.cadastro_demanda.classificacao IS
    'Classificação PLI ({tipo:frente_pli,frente_id}) ou PEF ({tipo:eixo_pef,eixo_id,corredor_tic_id})';
COMMENT ON COLUMN cadastro.cadastro_demanda.complementos IS
    'Modal, tipologia e carteira opcionais ({modal_id, tipologia_id, carteira_id})';

CREATE INDEX IF NOT EXISTS idx_cadastro_demanda_status
    ON cadastro.cadastro_demanda (status);

CREATE INDEX IF NOT EXISTS idx_cadastro_demanda_criado_em
    ON cadastro.cadastro_demanda (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_cadastro_demanda_sigma_instituicao
    ON cadastro.cadastro_demanda (sigma_instituicao_id);

CREATE INDEX IF NOT EXISTS idx_cadastro_demanda_sigma_pessoa
    ON cadastro.cadastro_demanda (sigma_pessoa_id);

CREATE INDEX IF NOT EXISTS idx_cadastro_demanda_plano
    ON cadastro.cadastro_demanda (plano_id);

CREATE INDEX IF NOT EXISTS idx_cadastro_demanda_geometria_gist
    ON cadastro.cadastro_demanda USING GIST (geometria);

CREATE INDEX IF NOT EXISTS idx_cadastro_demanda_classificacao_gin
    ON cadastro.cadastro_demanda USING GIN (classificacao);

-- ---------------------------------------------------------------------------
-- auditoria.log_sistema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria.log_sistema (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_hora                   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Contexto
    nivel                       VARCHAR(10) NOT NULL DEFAULT 'INFO'
        CHECK (nivel IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'AUDIT')),
    categoria                   VARCHAR(50) NOT NULL DEFAULT 'sistema',
    operacao                    VARCHAR(10)
        CHECK (operacao IS NULL OR operacao IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'LOGIN', 'EXPORT', 'IMPORT')),

    -- Entidade afetada
    schema_nome                 VARCHAR(63),
    tabela                      VARCHAR(100),
    registro_id                 UUID,

    -- Executor
    usuario_id                  UUID,
    usuario_nome                VARCHAR(200),

    -- Conteúdo
    mensagem                    TEXT NOT NULL,
    dados_anteriores            JSONB,
    dados_novos                 JSONB,
    campos_alterados            JSONB,
    contexto                    JSONB,

    -- Rede / origem
    ip_address                  INET,
    user_agent                  TEXT,
    origem                      VARCHAR(30) NOT NULL DEFAULT 'web'
        CHECK (origem IN ('web', 'api', 'sistema', 'migracao', 'script', 'health')),

    -- Integridade / retenção
    hash_verificacao            VARCHAR(64),
    purgavel                    BOOLEAN NOT NULL DEFAULT TRUE,
    expira_em                   TIMESTAMPTZ
);

COMMENT ON TABLE auditoria.log_sistema IS
    'Logs e trilha de auditoria do Sistema de Apoio à Tomada de Decisão';

CREATE INDEX IF NOT EXISTS idx_log_sistema_data_hora
    ON auditoria.log_sistema (data_hora DESC);

CREATE INDEX IF NOT EXISTS idx_log_sistema_nivel
    ON auditoria.log_sistema (nivel);

CREATE INDEX IF NOT EXISTS idx_log_sistema_categoria
    ON auditoria.log_sistema (categoria);

CREATE INDEX IF NOT EXISTS idx_log_sistema_tabela_registro
    ON auditoria.log_sistema (tabela, registro_id);

CREATE INDEX IF NOT EXISTS idx_log_sistema_usuario
    ON auditoria.log_sistema (usuario_id);

CREATE INDEX IF NOT EXISTS idx_log_sistema_dados_novos_gin
    ON auditoria.log_sistema USING GIN (dados_novos);

-- ---------------------------------------------------------------------------
-- Função + trigger: atualizar atualizado_em
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cadastro.fn_touch_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := CURRENT_TIMESTAMP;
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_atualizado_em := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cadastro_demanda_touch ON cadastro.cadastro_demanda;
CREATE TRIGGER trg_cadastro_demanda_touch
    BEFORE UPDATE ON cadastro.cadastro_demanda
    FOR EACH ROW
    EXECUTE FUNCTION cadastro.fn_touch_atualizado_em();

-- ---------------------------------------------------------------------------
-- Função + trigger: auditoria automática de cadastro_demanda
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auditoria.fn_registrar_auditoria_demanda()
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
        nivel,
        categoria,
        operacao,
        schema_nome,
        tabela,
        registro_id,
        mensagem,
        dados_anteriores,
        dados_novos,
        origem
    ) VALUES (
        'AUDIT',
        'cadastro_demanda',
        v_operacao,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        v_id,
        format('Demanda %s — operação %s', COALESCE(NEW.codigo, OLD.codigo), v_operacao),
        v_anterior,
        v_novo,
        'sistema'
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_cadastro_demanda ON cadastro.cadastro_demanda;
CREATE TRIGGER trg_auditoria_cadastro_demanda
    AFTER INSERT OR UPDATE OR DELETE ON cadastro.cadastro_demanda
    FOR EACH ROW
    EXECUTE FUNCTION auditoria.fn_registrar_auditoria_demanda();

-- ---------------------------------------------------------------------------
-- Permissões (ajuste conforme roles do cluster)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA cadastro TO slt_user;
GRANT USAGE ON SCHEMA auditoria TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cadastro TO slt_user;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA auditoria TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA cadastro TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auditoria TO slt_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auditoria GRANT SELECT, INSERT ON TABLES TO slt_user;

COMMIT;
