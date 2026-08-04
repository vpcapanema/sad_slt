-- Fase 1 · cadastro de fontes + produto homologado versionado
BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.fonte_fase1 (
    fonte_id                VARCHAR(80)  PRIMARY KEY,
    nome                    VARCHAR(200) NOT NULL,
    orgao                   VARCHAR(120) NOT NULL,
    esfera                  VARCHAR(20)  NOT NULL CHECK (esfera IN ('federal','estadual','municipal','misto')),
    criterio_id_padrao      VARCHAR(80)  NOT NULL,
    tipo_tratamento_padrao  VARCHAR(20)  NOT NULL CHECK (tipo_tratamento_padrao IN ('restricao','risco')),
    severidade_padrao       INTEGER      NOT NULL CHECK (severidade_padrao BETWEEN 1 AND 4),
    base_legal              TEXT         NOT NULL,
    url_origem              TEXT,
    versao_dado             VARCHAR(40),
    data_referencia         DATE,
    ativo                   BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fonte_fase1_criterio
    ON geoprocessamento.fonte_fase1 (criterio_id_padrao) WHERE ativo = TRUE;

CREATE TABLE IF NOT EXISTS geoprocessamento.produto_homologado_fase1 (
    id                      SERIAL       PRIMARY KEY,
    codigo                  VARCHAR(120) NOT NULL UNIQUE,
    area_estudo             VARCHAR(60)  NOT NULL,
    versao                  INTEGER      NOT NULL,
    data_geracao            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    camada_restricao_path   TEXT         NOT NULL,
    camada_risco_path       TEXT         NOT NULL,
    relatorio_path          TEXT,
    fontes_utilizadas       JSONB        NOT NULL DEFAULT '[]'::jsonb,
    parametros              JSONB        NOT NULL DEFAULT '{}'::jsonb,
    estatisticas            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    homologado              BOOLEAN      NOT NULL DEFAULT FALSE,
    homologado_em           TIMESTAMPTZ,
    homologado_por          VARCHAR(120),
    criado_por              VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_produto_homologado_fase1_area_versao
    ON geoprocessamento.produto_homologado_fase1 (area_estudo, versao DESC);

-- Seed inicial das 3 fontes de restrição obrigatórias por lei + fontes básicas
INSERT INTO geoprocessamento.fonte_fase1
    (fonte_id, nome, orgao, esfera, criterio_id_padrao, tipo_tratamento_padrao,
     severidade_padrao, base_legal, url_origem)
VALUES
('ibama_embargos', 'Áreas embargadas IBAMA', 'IBAMA', 'federal',
 'embargo_ibama', 'restricao', 4,
 'Lei 9605/1998 art. 72; Dec. 6514/2008',
 'https://servicos.ibama.gov.br/ctf/publico/areasembargadas/'),
('semil_embargos', 'Áreas embargadas SEMIL/SP', 'SEMIL-SP', 'estadual',
 'embargo_estadual', 'restricao', 4,
 'Dec. Est. SP 8468/1976; Lei Est. SP 9509/1997', NULL),
('cetesb_interdicoes', 'Interdições ativas CETESB', 'CETESB', 'estadual',
 'interdicao_cetesb', 'restricao', 4,
 'Dec. Est. SP 8468/1976', NULL),
('mma_cnuc_pi_federal', 'UCs de Proteção Integral federais (CNUC/MMA)', 'MMA/ICMBio', 'federal',
 'uc_pi_federal', 'risco', 3,
 'Lei 9985/2000',
 'https://cnuc.mma.gov.br/'),
('ff_uc_pi_estadual', 'UCs de Proteção Integral estaduais SP', 'Fundação Florestal SP', 'estadual',
 'uc_pi_estadual', 'risco', 3,
 'Lei 9985/2000; SMA-SP', NULL),
('cecav_cavidades', 'Cavidades naturais CECAV/ICMBio', 'CECAV/ICMBio', 'federal',
 'cavidade', 'risco', 2,
 'Dec. 10935/2022; IN ICMBio 02/2017',
 'https://www.gov.br/icmbio/pt-br/assuntos/centros-de-pesquisa/cecav/'),
('funai_ti', 'Terras Indígenas', 'FUNAI', 'federal',
 'terra_indigena', 'risco', 3,
 'CF/88 art. 231; Port. Interministerial 60/2015',
 'https://geoserver.funai.gov.br/'),
('incra_quilombolas', 'Territórios quilombolas', 'INCRA/Palmares', 'federal',
 'territorio_quilombola', 'risco', 3,
 'Dec. 4887/2003; Port. Interministerial 60/2015', NULL),
('cetesb_areas_contaminadas', 'Áreas contaminadas CETESB', 'CETESB', 'estadual',
 'area_contaminada', 'risco', 2,
 'Dec. Est. SP 59263/2013',
 'https://cetesb.sp.gov.br/areas-contaminadas/'),
('iphan_sitios', 'Sítios arqueológicos IPHAN', 'IPHAN', 'federal',
 'sitio_arqueologico', 'risco', 3,
 'Lei 3924/1961; Port. IPHAN 375/2018',
 'https://sicg.iphan.gov.br/')
ON CONFLICT (fonte_id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON geoprocessamento.fonte_fase1 TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON geoprocessamento.produto_homologado_fase1 TO slt_user;
GRANT USAGE, SELECT
    ON SEQUENCE geoprocessamento.produto_homologado_fase1_id_seq TO slt_user;

COMMIT;
