-- Grupo conceitual das dimensões e critérios da estrutura hierárquica do PLI-SP 2050.
-- Fonte: documentacao/fundamentacao/PLI_Fig_Estrutura_Criterios_v6.pptx, onde os
-- critérios são denominados indicadores. Os códigos de identificação do arquivo
-- não são gravados: o domínio usa somente os nomes.
BEGIN;

ALTER TABLE dominios.categoria_extracao_atributos
    ADD COLUMN IF NOT EXISTS grupo_conceitual VARCHAR(60);

ALTER TABLE dominios.categoria_extracao_atributos
    DROP CONSTRAINT IF EXISTS ck_categoria_extracao_grupo_conceitual;
ALTER TABLE dominios.categoria_extracao_atributos
    ADD CONSTRAINT ck_categoria_extracao_grupo_conceitual
    CHECK (grupo_conceitual IS NULL OR length(btrim(grupo_conceitual)) > 0);

-- O nome passa a ser único dentro do grupo conceitual: a dimensão "Segurança" do
-- PLI convive com a categoria "Segurança" já usada na extração de atributos.
DROP INDEX IF EXISTS dominios.uq_categoria_extracao_nome;
CREATE UNIQUE INDEX IF NOT EXISTS uq_categoria_extracao_grupo_nome
    ON dominios.categoria_extracao_atributos (COALESCE(grupo_conceitual, ''), lower(btrim(nome)));

COMMENT ON COLUMN dominios.categoria_extracao_atributos.grupo_conceitual IS
    'Grupo conceitual em que a dimensão se insere. PLI identifica as dimensões estabelecidas para o PLI-SP 2050; vazio indica categoria sem grupo definido.';

CREATE TABLE IF NOT EXISTS dominios.criterio (
    codigo           VARCHAR(80) PRIMARY KEY,
    dimensao_codigo  VARCHAR(50) NOT NULL
        REFERENCES dominios.categoria_extracao_atributos(codigo) ON DELETE RESTRICT,
    nome             VARCHAR(140) NOT NULL,
    ordem            SMALLINT NOT NULL DEFAULT 0 CHECK (ordem >= 0),
    ativo            BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_criterio_codigo CHECK (codigo ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_criterio_nome CHECK (length(btrim(nome)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_criterio_dimensao_nome
    ON dominios.criterio (dimensao_codigo, lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS idx_criterio_dimensao
    ON dominios.criterio (dimensao_codigo, ordem) WHERE ativo = TRUE;

COMMENT ON TABLE dominios.criterio IS
    'Domínio de critérios de hierarquização, vinculados à dimensão a que pertencem. Os critérios do PLI-SP 2050 são os indicadores selecionados pela equipe do PLI.';
COMMENT ON COLUMN dominios.criterio.dimensao_codigo IS
    'Dimensão do critério, registrada em dominios.categoria_extracao_atributos.';
COMMENT ON COLUMN dominios.criterio.ativo IS
    'Indica disponibilidade para novas configurações; preserva registros já referenciados.';

INSERT INTO dominios.categoria_extracao_atributos
    (codigo, nome, conceito, ordem, grupo_conceitual)
VALUES
    ('pli_tecnica_logistica', 'Técnica e logística',
     'Dimensão da estrutura hierárquica de critérios do PLI-SP 2050, estabelecida pela equipe do PLI. Critérios: Saturação e alívio de gargalos; Tempo e confiabilidade; Conectividade e intermodalidade.', 210, 'PLI'),
    ('pli_economica', 'Econômica',
     'Dimensão da estrutura hierárquica de critérios do PLI-SP 2050, estabelecida pela equipe do PLI. Critérios: Emprego e desenv. regional; Impacto nas cadeias produtivas.', 220, 'PLI'),
    ('pli_social_territorial', 'Social e territorial',
     'Dimensão da estrutura hierárquica de critérios do PLI-SP 2050, estabelecida pela equipe do PLI. Critérios: Equidade territorial; Acessibilidade a serviços; Integração urbana.', 230, 'PLI'),
    ('pli_seguranca', 'Segurança',
     'Dimensão da estrutura hierárquica de critérios do PLI-SP 2050, estabelecida pela equipe do PLI. Critério: Sinistros graves.', 240, 'PLI'),
    ('pli_ambiental_climatica', 'Ambiental e climática',
     'Dimensão da estrutura hierárquica de critérios do PLI-SP 2050, estabelecida pela equipe do PLI. Critérios: Descarbonização; Sensibilidade socioambiental; Resiliência climática.', 250, 'PLI'),
    ('pli_viabilidade_institucional_financeira', 'Viabilidade institucional e financeira',
     'Dimensão da estrutura hierárquica de critérios do PLI-SP 2050, estabelecida pela equipe do PLI. Critérios: Esforço fiscal e alavancagem; Governança e aderência a planos; Prontidão.', 260, 'PLI'),
    ('pli_riscos', 'Riscos',
     'Dimensão da estrutura hierárquica de critérios do PLI-SP 2050, estabelecida pela equipe do PLI. Critérios: Risco de entrega; Risco de demanda e benefício.', 270, 'PLI')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO dominios.criterio (codigo, dimensao_codigo, nome, ordem)
VALUES
    ('saturacao_alivio_gargalos', 'pli_tecnica_logistica', 'Saturação e alívio de gargalos', 10),
    ('tempo_confiabilidade', 'pli_tecnica_logistica', 'Tempo e confiabilidade', 20),
    ('conectividade_intermodalidade', 'pli_tecnica_logistica', 'Conectividade e intermodalidade', 30),
    ('emprego_desenvolvimento_regional', 'pli_economica', 'Emprego e desenv. regional', 10),
    ('impacto_cadeias_produtivas', 'pli_economica', 'Impacto nas cadeias produtivas', 20),
    ('equidade_territorial', 'pli_social_territorial', 'Equidade territorial', 10),
    ('acessibilidade_servicos', 'pli_social_territorial', 'Acessibilidade a serviços', 20),
    ('integracao_urbana', 'pli_social_territorial', 'Integração urbana', 30),
    ('sinistros_graves', 'pli_seguranca', 'Sinistros graves', 10),
    ('descarbonizacao', 'pli_ambiental_climatica', 'Descarbonização', 10),
    ('sensibilidade_socioambiental', 'pli_ambiental_climatica', 'Sensibilidade socioambiental', 20),
    ('resiliencia_climatica', 'pli_ambiental_climatica', 'Resiliência climática', 30),
    ('esforco_fiscal_alavancagem', 'pli_viabilidade_institucional_financeira', 'Esforço fiscal e alavancagem', 10),
    ('governanca_aderencia_planos', 'pli_viabilidade_institucional_financeira', 'Governança e aderência a planos', 20),
    ('prontidao', 'pli_viabilidade_institucional_financeira', 'Prontidão', 30),
    ('risco_entrega', 'pli_riscos', 'Risco de entrega', 10),
    ('risco_demanda_beneficio', 'pli_riscos', 'Risco de demanda e benefício', 20)
ON CONFLICT (codigo) DO NOTHING;

GRANT USAGE ON SCHEMA dominios TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON dominios.criterio TO slt_user;

COMMIT;
