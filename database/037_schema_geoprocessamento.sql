-- SLT — persistência dos módulos geradores de insumos geoespaciais
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS geoprocessamento;

CREATE TABLE IF NOT EXISTS geoprocessamento.produto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(120) NOT NULL UNIQUE,
    modulo VARCHAR(20) NOT NULL CHECK (modulo IN ('fase1', 'fase2')),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    versao VARCHAR(40) NOT NULL DEFAULT 'v1',
    status VARCHAR(30) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho','em_processamento','processado','validado','homologado','publicado','arquivado','erro')),
    responsavel_tecnico VARCHAR(200),
    crs_saida VARCHAR(80) NOT NULL,
    area_estudo_id UUID REFERENCES geo.unidade_espacial(id) ON DELETE SET NULL,
    area_estudo_geom geometry(Geometry, 4326),
    formato_saida VARCHAR(40),
    data_referencia DATE,
    observacao_metodologica TEXT,
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_por UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.produto_fase1 (
    produto_id UUID PRIMARY KEY REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    camada_restricao_id UUID,
    camada_risco_id UUID,
    regra_sobreposicao VARCHAR(40) NOT NULL DEFAULT 'identity',
    regra_conflito_atributos VARCHAR(120) NOT NULL DEFAULT 'prefixo_fonte',
    restricao_prevalece BOOLEAN NOT NULL DEFAULT TRUE,
    configuracao JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS geoprocessamento.produto_fase2 (
    produto_id UUID PRIMARY KEY REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    resolucao NUMERIC(14,4) NOT NULL CHECK (resolucao > 0),
    unidade_resolucao VARCHAR(20) NOT NULL DEFAULT 'm',
    extensao_processamento JSONB NOT NULL DEFAULT '{}'::jsonb,
    regra_nodata VARCHAR(40) NOT NULL,
    valor_nodata NUMERIC,
    metodo_combinacao VARCHAR(60) NOT NULL DEFAULT 'media_ponderada',
    configuracao_ahp_id UUID,
    raster_final_id UUID,
    configuracao JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS geoprocessamento.fonte (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(120) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    url_origem TEXT,
    arquivo_origem TEXT,
    layer_name TEXT,
    orgao_responsavel VARCHAR(200),
    data_referencia DATE,
    importado_em TIMESTAMPTZ,
    hash_origem VARCHAR(128),
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.camada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fonte_id UUID REFERENCES geoprocessamento.fonte(id) ON DELETE SET NULL,
    recurso_sessao_id VARCHAR(120),
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('vetor','raster','tabela')),
    geometria_tipo VARCHAR(60),
    crs VARCHAR(80),
    uri TEXT,
    formato VARCHAR(40),
    envelope geometry(Geometry, 4326),
    hash_arquivo VARCHAR(128),
    persistida BOOLEAN NOT NULL DEFAULT FALSE,
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fase1_restricao') THEN
    ALTER TABLE geoprocessamento.produto_fase1 ADD CONSTRAINT fk_fase1_restricao FOREIGN KEY (camada_restricao_id) REFERENCES geoprocessamento.camada(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fase1_risco') THEN
    ALTER TABLE geoprocessamento.produto_fase1 ADD CONSTRAINT fk_fase1_risco FOREIGN KEY (camada_risco_id) REFERENCES geoprocessamento.camada(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fase2_raster') THEN
    ALTER TABLE geoprocessamento.produto_fase2 ADD CONSTRAINT fk_fase2_raster FOREIGN KEY (raster_final_id) REFERENCES geoprocessamento.camada(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS geoprocessamento.produto_fonte (
    produto_id UUID NOT NULL REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    fonte_id UUID NOT NULL REFERENCES geoprocessamento.fonte(id) ON DELETE RESTRICT,
    tipo_tratamento VARCHAR(50),
    criterio_associado VARCHAR(200),
    base_legal_tecnica TEXT,
    severidade VARCHAR(40),
    ordem_processamento INTEGER,
    parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (produto_id, fonte_id)
);

CREATE TABLE IF NOT EXISTS geoprocessamento.criterio_fase2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(120) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    dimensao VARCHAR(100),
    classe_modelagem VARCHAR(20) NOT NULL DEFAULT 'grade'
        CHECK (classe_modelagem IN ('grade','rede','projeto','hibrido')),
    tipo_dado_entrada VARCHAR(30) NOT NULL,
    operador_espacial VARCHAR(80) NOT NULL,
    relacao VARCHAR(20) NOT NULL CHECK (relacao IN ('positiva','negativa')),
    unidade_original VARCHAR(80),
    regra_normalizacao VARCHAR(80) NOT NULL,
    observacao_metodologica TEXT,
    configuracao JSONB NOT NULL DEFAULT '{}'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE geoprocessamento.criterio_fase2
    ADD COLUMN IF NOT EXISTS configuracao JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS geoprocessamento.produto_criterio_fase2 (
    produto_id UUID NOT NULL REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    criterio_id UUID NOT NULL REFERENCES geoprocessamento.criterio_fase2(id) ON DELETE RESTRICT,
    fonte_id UUID REFERENCES geoprocessamento.fonte(id) ON DELETE SET NULL,
    peso_ahp NUMERIC(12,10) NOT NULL CHECK (peso_ahp >= 0 AND peso_ahp <= 1),
    obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
    parametros_operador JSONB NOT NULL DEFAULT '{}'::jsonb,
    parametros_normalizacao JSONB NOT NULL DEFAULT '{}'::jsonb,
    raster_bruto_id UUID REFERENCES geoprocessamento.camada(id) ON DELETE SET NULL,
    raster_normalizado_id UUID REFERENCES geoprocessamento.camada(id) ON DELETE SET NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (produto_id, criterio_id)
);

CREATE TABLE IF NOT EXISTS geoprocessamento.configuracao_fluxo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID NOT NULL REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    versao INTEGER NOT NULL DEFAULT 1,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    validado BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.configuracao_fluxo_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fluxo_id UUID NOT NULL REFERENCES geoprocessamento.configuracao_fluxo(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('algoritmo','funcao','fluxo')),
    referencia_id VARCHAR(120) NOT NULL,
    nome_snapshot VARCHAR(200),
    parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
    mapeamento_entrada JSONB NOT NULL DEFAULT '{}'::jsonb,
    mapeamento_saida JSONB NOT NULL DEFAULT '{}'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (fluxo_id, ordem)
);

CREATE TABLE IF NOT EXISTS geoprocessamento.execucao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID NOT NULL REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    fluxo_id UUID REFERENCES geoprocessamento.configuracao_fluxo(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    progresso NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
    contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
    erro TEXT,
    iniciado_em TIMESTAMPTZ,
    finalizado_em TIMESTAMPTZ,
    criado_por UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.execucao_etapa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execucao_id UUID NOT NULL REFERENCES geoprocessamento.execucao(id) ON DELETE CASCADE,
    fluxo_item_id UUID REFERENCES geoprocessamento.configuracao_fluxo_item(id) ON DELETE SET NULL,
    ordem INTEGER NOT NULL,
    nome VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    parametros_efetivos JSONB NOT NULL DEFAULT '{}'::jsonb,
    resultado JSONB NOT NULL DEFAULT '{}'::jsonb,
    erro TEXT,
    iniciado_em TIMESTAMPTZ,
    finalizado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS geoprocessamento.mensagem_execucao (
    id BIGSERIAL PRIMARY KEY,
    execucao_id UUID NOT NULL REFERENCES geoprocessamento.execucao(id) ON DELETE CASCADE,
    etapa_id UUID REFERENCES geoprocessamento.execucao_etapa(id) ON DELETE CASCADE,
    nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('debug','info','aviso','erro','interacao')),
    mensagem TEXT NOT NULL,
    dados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.artefato (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID NOT NULL REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    execucao_id UUID REFERENCES geoprocessamento.execucao(id) ON DELETE SET NULL,
    camada_id UUID REFERENCES geoprocessamento.camada(id) ON DELETE SET NULL,
    papel VARCHAR(60) NOT NULL,
    nome VARCHAR(200) NOT NULL,
    uri TEXT,
    hash_arquivo VARCHAR(128),
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    oficial BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.validacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID NOT NULL REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    execucao_id UUID REFERENCES geoprocessamento.execucao(id) ON DELETE SET NULL,
    tipo VARCHAR(60) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('aprovado','reprovado','aviso')),
    resultados JSONB NOT NULL DEFAULT '{}'::jsonb,
    observacoes TEXT,
    validado_por UUID,
    validado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geoprocessamento.homologacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID NOT NULL REFERENCES geoprocessamento.produto(id) ON DELETE CASCADE,
    versao VARCHAR(40) NOT NULL,
    decisao VARCHAR(20) NOT NULL CHECK (decisao IN ('homologado','rejeitado')),
    checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    observacoes TEXT,
    homologado_por UUID,
    homologado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (produto_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_gp_produto_modulo_status ON geoprocessamento.produto(modulo, status);
CREATE INDEX IF NOT EXISTS idx_gp_produto_area_gist ON geoprocessamento.produto USING GIST(area_estudo_geom);
CREATE INDEX IF NOT EXISTS idx_gp_camada_envelope_gist ON geoprocessamento.camada USING GIST(envelope);
CREATE INDEX IF NOT EXISTS idx_gp_execucao_produto ON geoprocessamento.execucao(produto_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_gp_mensagem_execucao ON geoprocessamento.mensagem_execucao(execucao_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_gp_artefato_produto ON geoprocessamento.artefato(produto_id, papel);

CREATE OR REPLACE FUNCTION geoprocessamento.fn_touch_atualizado_em()
RETURNS TRIGGER AS $$ BEGIN NEW.atualizado_em = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$
DECLARE tabela TEXT;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['produto','fonte','criterio_fase2','configuracao_fluxo'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_%I ON geoprocessamento.%I', tabela, tabela);
    EXECUTE format('CREATE TRIGGER trg_touch_%I BEFORE UPDATE ON geoprocessamento.%I FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_touch_atualizado_em()', tabela, tabela);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA geoprocessamento TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA geoprocessamento TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA geoprocessamento TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA geoprocessamento GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
