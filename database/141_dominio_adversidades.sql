-- Domínio temático de famílias e tipos de adversidade das camadas geoespaciais.
-- Não define se uma camada será tratada como risco ou restrição.
BEGIN;

CREATE SCHEMA IF NOT EXISTS dominios;

CREATE TABLE IF NOT EXISTS dominios.familia_adversidade (
    codigo      VARCHAR(60) PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    conceito    TEXT NOT NULL,
    ordem       SMALLINT NOT NULL DEFAULT 0 CHECK (ordem >= 0),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_familia_adversidade_codigo
        CHECK (codigo ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_familia_adversidade_nome
        CHECK (length(btrim(nome)) > 0),
    CONSTRAINT ck_familia_adversidade_conceito
        CHECK (length(btrim(conceito)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_familia_adversidade_nome
    ON dominios.familia_adversidade (lower(btrim(nome)));

CREATE TABLE IF NOT EXISTS dominios.tipo_adversidade (
    codigo          VARCHAR(80) PRIMARY KEY,
    familia_codigo  VARCHAR(60) NOT NULL
        REFERENCES dominios.familia_adversidade(codigo) ON DELETE RESTRICT,
    nome            VARCHAR(140) NOT NULL,
    conceito        TEXT NOT NULL,
    ordem           SMALLINT NOT NULL DEFAULT 0 CHECK (ordem >= 0),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_tipo_adversidade_codigo
        CHECK (codigo ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_tipo_adversidade_nome
        CHECK (length(btrim(nome)) > 0),
    CONSTRAINT ck_tipo_adversidade_conceito
        CHECK (length(btrim(conceito)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tipo_adversidade_nome_familia
    ON dominios.tipo_adversidade (familia_codigo, lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS idx_tipo_adversidade_familia
    ON dominios.tipo_adversidade (familia_codigo, ordem)
    WHERE ativo = TRUE;

COMMENT ON TABLE dominios.familia_adversidade IS
    'Domínio de famílias temáticas das adversidades representadas por camadas geoespaciais; não determina risco ou restrição.';
COMMENT ON TABLE dominios.tipo_adversidade IS
    'Domínio de tipos de adversidade associados às famílias; não determina risco ou restrição.';
COMMENT ON COLUMN dominios.tipo_adversidade.familia_codigo IS
    'Família temática da adversidade; independente do tratamento configurável da camada.';
COMMENT ON COLUMN dominios.familia_adversidade.ativo IS
    'Indica disponibilidade do conceito para novas configurações; preserva registros já referenciados.';
COMMENT ON COLUMN dominios.tipo_adversidade.ativo IS
    'Indica disponibilidade do conceito para novas configurações; preserva registros já referenciados.';

INSERT INTO dominios.familia_adversidade (codigo, nome, conceito, ordem)
VALUES
    ('perigo_fisico_geotecnico', 'Perigos físicos e geotécnicos',
     'Condições hidrológicas ou geotécnicas espacialmente delimitadas que podem afetar a segurança, a implantação ou a operação da intervenção.', 10),
    ('protecao_regulacao_ambiental', 'Proteção e regulação ambiental do território',
     'Áreas e ecossistemas sujeitos a regimes de proteção, zoneamento ou regras ambientais que podem condicionar a intervenção.', 20),
    ('contaminacao_ambiental', 'Contaminação ambiental',
     'Áreas com contaminação identificada ou sob gerenciamento ambiental, com possíveis implicações para investigação, proteção e implantação.', 30),
    ('ato_administrativo_controle', 'Atos administrativos e medidas de controle',
     'Atos ou registros administrativos que podem impor condições à atividade ou ao uso de determinada área.', 40),
    ('territorial_fundiario_social', 'Direitos territoriais e relações fundiárias',
     'Territórios, comunidades e ocupações cuja incidência pode envolver direitos territoriais, consulta, negociação ou situação fundiária.', 50),
    ('patrimonio_cultural_espeleologico', 'Patrimônio cultural e espeleológico',
     'Bens, sítios e áreas de influência patrimonial ou espeleológica que podem exigir estudos, proteção, autorização ou adequação da intervenção.', 60)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO dominios.tipo_adversidade
    (codigo, familia_codigo, nome, conceito, ordem)
VALUES
    ('inundacao', 'perigo_fisico_geotecnico', 'Inundação, enxurrada ou alagamento',
     'Área suscetível a inundação, enxurrada ou alagamento representada pela camada de origem.', 10),
    ('movimento_massa', 'perigo_fisico_geotecnico', 'Escorregamento, erosão ou movimento de massa',
     'Área suscetível a escorregamento, erosão ou movimento de massa representada pela camada de origem.', 20),
    ('uc_protecao_integral', 'protecao_regulacao_ambiental', 'Unidade de Conservação de Proteção Integral',
     'Unidade de Conservação de Proteção Integral, independentemente da esfera administrativa.', 10),
    ('uc_uso_sustentavel', 'protecao_regulacao_ambiental', 'Unidade de Conservação de Uso Sustentável',
     'Unidade de Conservação de Uso Sustentável, independentemente da esfera administrativa.', 20),
    ('aprm_mananciais', 'protecao_regulacao_ambiental', 'Área de proteção e recuperação de mananciais',
     'Perímetro de APRM publicado para uma área de manancial; a camada, por si só, não identifica necessariamente a subárea regulatória incidente.', 30),
    ('manguezal', 'protecao_regulacao_ambiental', 'Manguezal',
     'Área de manguezal oficialmente mapeada.', 40),
    ('area_contaminada', 'contaminacao_ambiental', 'Área contaminada',
     'Área cadastrada como contaminada ou sujeita a investigação e gerenciamento ambiental.', 10),
    ('restricao_cetesb', 'ato_administrativo_controle', 'Área de restrição cadastrada pela CETESB',
     'Área identificada em cadastro de restrições da CETESB; vigência, alcance e atividade aplicável dependem do registro administrativo correspondente.', 10),
    ('embargo_ambiental', 'ato_administrativo_controle', 'Embargo ambiental',
     'Área associada a embargo ambiental estadual ou federal, conforme a camada de origem.', 20),
    ('terra_indigena', 'territorial_fundiario_social', 'Terra Indígena',
     'Território oficialmente delimitado ou identificado como Terra Indígena na fonte espacial.', 10),
    ('territorio_quilombola', 'territorial_fundiario_social', 'Território quilombola',
     'Território quilombola oficialmente delimitado ou identificado na fonte espacial.', 20),
    ('assentamento_rural', 'territorial_fundiario_social', 'Assentamento rural',
     'Perímetro de assentamento rural registrado pela fonte fundiária.', 30),
    ('influencia_cavidade', 'patrimonio_cultural_espeleologico', 'Área de influência sobre cavidade natural',
     'Área oficial de influência associada ao patrimônio espeleológico, conforme publicada pela fonte.', 10),
    ('sitio_arqueologico', 'patrimonio_cultural_espeleologico', 'Sítio arqueológico',
     'Sítio arqueológico oficialmente cadastrado na fonte patrimonial.', 20),
    ('bem_tombado', 'patrimonio_cultural_espeleologico', 'Bem tombado ou área envoltória',
     'Bem tombado ou área envoltória oficialmente delimitada por órgão de proteção patrimonial.', 30)
ON CONFLICT (codigo) DO NOTHING;

GRANT USAGE ON SCHEMA dominios TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON dominios.familia_adversidade, dominios.tipo_adversidade TO slt_user;

COMMIT;
