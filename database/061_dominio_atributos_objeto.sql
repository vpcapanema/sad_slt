-- SLT — domínio canônico dos atributos cadastrais dos objetos de demanda.
--
-- Contém somente atributos estáveis e independentes da matriz vigente.
-- Critérios, pesos, escalas decisórias e atributos solicitados dinamicamente
-- em complementações não pertencem a esta tabela.
--
-- Idempotente: pode ser reaplicada com segurança.

BEGIN;

CREATE TABLE IF NOT EXISTS demandas.dom_atributo_objeto (
    codigo                  VARCHAR(100) PRIMARY KEY,
    nome                    VARCHAR(200) NOT NULL,
    descricao               TEXT NOT NULL,
    tipo_dado               VARCHAR(30) NOT NULL,
    unidade                 VARCHAR(60),
    origem_valor            VARCHAR(30) NOT NULL DEFAULT 'declarado',
    tipos_objeto            TEXT[] NOT NULL,
    dominio_valores         JSONB,
    configuracao_por_tipo   JSONB NOT NULL DEFAULT '{}'::JSONB,
    regras_validacao        JSONB NOT NULL DEFAULT '{}'::JSONB,
    exige_evidencia         BOOLEAN NOT NULL DEFAULT FALSE,
    permite_nao_informado   BOOLEAN NOT NULL DEFAULT TRUE,
    versao                  INTEGER NOT NULL DEFAULT 1,
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_dom_atributo_objeto_codigo
        CHECK (codigo ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_dom_atributo_objeto_tipo_dado
        CHECK (tipo_dado IN (
            'inteiro', 'monetario', 'categoria', 'vinculo', 'lista_vinculos'
        )),
    CONSTRAINT ck_dom_atributo_objeto_origem
        CHECK (origem_valor IN ('declarado', 'derivado_cadastro')),
    CONSTRAINT ck_dom_atributo_objeto_tipos
        CHECK (
            cardinality(tipos_objeto) > 0
            AND tipos_objeto <@ ARRAY['plano','programa','projeto']::TEXT[]
        ),
    CONSTRAINT ck_dom_atributo_objeto_dominio
        CHECK (dominio_valores IS NULL OR jsonb_typeof(dominio_valores) = 'array'),
    CONSTRAINT ck_dom_atributo_objeto_config_tipo
        CHECK (jsonb_typeof(configuracao_por_tipo) = 'object'),
    CONSTRAINT ck_dom_atributo_objeto_regras
        CHECK (jsonb_typeof(regras_validacao) = 'object'),
    CONSTRAINT ck_dom_atributo_objeto_versao
        CHECK (versao > 0)
);

COMMENT ON TABLE demandas.dom_atributo_objeto IS
    'Fonte canônica dos atributos estáveis coletados no cadastro de planos, programas e projetos';
COMMENT ON COLUMN demandas.dom_atributo_objeto.codigo IS
    'Identificador semântico estável que pode ser referenciado por diferentes matrizes';
COMMENT ON COLUMN demandas.dom_atributo_objeto.tipos_objeto IS
    'Categorias às quais o atributo cadastral se aplica: plano, programa e/ou projeto';
COMMENT ON COLUMN demandas.dom_atributo_objeto.dominio_valores IS
    'Lista canônica comum de opções; cada item possui código estável e rótulo';
COMMENT ON COLUMN demandas.dom_atributo_objeto.configuracao_por_tipo IS
    'Rótulos ou opções cadastrais específicos para plano, programa e projeto';
COMMENT ON COLUMN demandas.dom_atributo_objeto.regras_validacao IS
    'Restrições de coleta do dado cadastral, sem pesos ou pontuações decisórias';

CREATE INDEX IF NOT EXISTS idx_dom_atributo_objeto_ativo
    ON demandas.dom_atributo_objeto (ativo, nome);
CREATE INDEX IF NOT EXISTS idx_dom_atributo_objeto_tipos
    ON demandas.dom_atributo_objeto USING GIN (tipos_objeto);

CREATE OR REPLACE FUNCTION demandas.fn_touch_dom_atributo_objeto()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_dom_atributo_objeto
    ON demandas.dom_atributo_objeto;
CREATE TRIGGER trg_touch_dom_atributo_objeto
    BEFORE UPDATE ON demandas.dom_atributo_objeto
    FOR EACH ROW
    EXECUTE FUNCTION demandas.fn_touch_dom_atributo_objeto();

ALTER TABLE demandas.plano
    ADD COLUMN IF NOT EXISTS atributos_cadastrais JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE demandas.programa
    ADD COLUMN IF NOT EXISTS atributos_cadastrais JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE demandas.projeto
    ADD COLUMN IF NOT EXISTS atributos_cadastrais JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN demandas.plano.atributos_cadastrais IS
    'Valores dos atributos estáveis definidos em demandas.dom_atributo_objeto';
COMMENT ON COLUMN demandas.programa.atributos_cadastrais IS
    'Valores dos atributos estáveis definidos em demandas.dom_atributo_objeto';
COMMENT ON COLUMN demandas.projeto.atributos_cadastrais IS
    'Valores dos atributos estáveis definidos em demandas.dom_atributo_objeto';

INSERT INTO demandas.dom_atributo_objeto (
    codigo, nome, descricao, tipo_dado, unidade, origem_valor, tipos_objeto,
    dominio_valores, configuracao_por_tipo, regras_validacao,
    exige_evidencia, permite_nao_informado
) VALUES
(
    'maturidade_objeto', 'Maturidade do objeto de demanda',
    'Estágio de desenvolvimento do plano, programa ou projeto na data do cadastro.',
    'categoria', NULL, 'declarado', ARRAY['plano','programa','projeto'], NULL,
    '{
      "plano":{"opcoes":[
        {"codigo":"concepcao","rotulo":"Em concepção"},
        {"codigo":"elaboracao","rotulo":"Em elaboração"},
        {"codigo":"consulta","rotulo":"Em consulta ou pactuação"},
        {"codigo":"aprovado","rotulo":"Aprovado"},
        {"codigo":"vigente","rotulo":"Vigente"}
      ]},
      "programa":{"opcoes":[
        {"codigo":"concepcao","rotulo":"Em concepção"},
        {"codigo":"estruturacao","rotulo":"Em estruturação"},
        {"codigo":"pactuacao","rotulo":"Em pactuação"},
        {"codigo":"aprovado","rotulo":"Aprovado"},
        {"codigo":"implantacao","rotulo":"Em implantação"}
      ]},
      "projeto":{"opcoes":[
        {"codigo":"ideia","rotulo":"Ideia ou necessidade identificada"},
        {"codigo":"estudo_preliminar","rotulo":"Estudos preliminares"},
        {"codigo":"estudo_viabilidade","rotulo":"Estudo de viabilidade concluído"},
        {"codigo":"anteprojeto","rotulo":"Anteprojeto"},
        {"codigo":"projeto_basico","rotulo":"Projeto básico"},
        {"codigo":"projeto_executivo","rotulo":"Projeto executivo"},
        {"codigo":"pronto_implantacao","rotulo":"Pronto para contratação ou implantação"}
      ]}
    }'::JSONB,
    '{}'::JSONB, TRUE, TRUE
),
(
    'capex_estimado', 'Custo de investimento estimado (Capex)',
    'Custo de investimento cadastral, separado do valor global e acompanhado de data-base.',
    'monetario', 'R$', 'declarado', ARRAY['programa','projeto'], NULL,
    '{}'::JSONB,
    '{"minimo":0,"campos_associados":["data_base_capex","base_estimativa_capex"]}'::JSONB,
    TRUE, TRUE
),
(
    'base_estimativa_capex', 'Base da estimativa do Capex',
    'Nível documental ou metodológico que sustenta o custo informado no cadastro.',
    'categoria', NULL, 'declarado', ARRAY['programa','projeto'],
    '[
      {"codigo":"estimativa_preliminar","rotulo":"Estimativa preliminar"},
      {"codigo":"estudo_viabilidade","rotulo":"Estudo de viabilidade"},
      {"codigo":"anteprojeto","rotulo":"Orçamento de anteprojeto"},
      {"codigo":"projeto_basico","rotulo":"Orçamento de projeto básico"},
      {"codigo":"projeto_executivo","rotulo":"Orçamento de projeto executivo"},
      {"codigo":"valor_contratado","rotulo":"Valor contratado"}
    ]'::JSONB,
    '{}'::JSONB, '{}'::JSONB, TRUE, TRUE
),
(
    'prazo_referencia_meses', 'Prazo de referência do objeto',
    'Prazo cadastral em meses, interpretado conforme a categoria do objeto.',
    'inteiro', 'meses', 'declarado', ARRAY['plano','programa','projeto'], NULL,
    '{
      "plano":{"rotulo":"Prazo para aprovação, início de vigência ou horizonte do plano"},
      "programa":{"rotulo":"Prazo para implantação do programa"},
      "projeto":{"rotulo":"Prazo até a implantação ou entrada em operação"}
    }'::JSONB,
    '{"minimo":0,"campos_associados":["base_estimativa_prazo"]}'::JSONB,
    TRUE, TRUE
),
(
    'base_estimativa_prazo', 'Base da estimativa do prazo',
    'Documento ou estágio de planejamento que sustenta o prazo informado no cadastro.',
    'categoria', NULL, 'declarado', ARRAY['plano','programa','projeto'], NULL,
    '{
      "plano":{"opcoes":[
        {"codigo":"estimativa_preliminar","rotulo":"Estimativa preliminar"},
        {"codigo":"cronograma_elaboracao","rotulo":"Cronograma de elaboração"},
        {"codigo":"cronograma_consultas","rotulo":"Cronograma de consultas"},
        {"codigo":"cronograma_aprovado","rotulo":"Cronograma aprovado"},
        {"codigo":"cronograma_vigente","rotulo":"Cronograma institucional vigente"}
      ]},
      "programa":{"opcoes":[
        {"codigo":"estimativa_preliminar","rotulo":"Estimativa preliminar"},
        {"codigo":"cronograma_programa","rotulo":"Cronograma do programa"},
        {"codigo":"cronograma_consolidado","rotulo":"Cronograma consolidado das ações"},
        {"codigo":"cronograma_aprovado","rotulo":"Cronograma aprovado"},
        {"codigo":"cronograma_pactuado","rotulo":"Cronograma pactuado"},
        {"codigo":"cronogramas_componentes","rotulo":"Cronogramas dos projetos componentes"}
      ]},
      "projeto":{"opcoes":[
        {"codigo":"estimativa_preliminar","rotulo":"Estimativa preliminar"},
        {"codigo":"cronograma_estudos","rotulo":"Cronograma de estudos"},
        {"codigo":"cronograma_anteprojeto","rotulo":"Cronograma de anteprojeto"},
        {"codigo":"cronograma_projeto_basico","rotulo":"Cronograma de projeto básico"},
        {"codigo":"cronograma_projeto_executivo","rotulo":"Cronograma de projeto executivo"},
        {"codigo":"cronograma_contratual","rotulo":"Cronograma contratual"}
      ]}
    }'::JSONB,
    '{}'::JSONB, TRUE, TRUE
),
(
    'vinculo_institucional', 'Vínculo institucional',
    'Relação cadastral entre projeto e programa/plano ou entre programa e plano.',
    'vinculo', NULL, 'derivado_cadastro', ARRAY['programa','projeto'], NULL,
    '{
      "programa":{"vinculos":["programa_plano"]},
      "projeto":{"vinculos":["projeto_programa","projeto_plano"]}
    }'::JSONB,
    '{}'::JSONB, FALSE, TRUE
)
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    tipo_dado = EXCLUDED.tipo_dado,
    unidade = EXCLUDED.unidade,
    origem_valor = EXCLUDED.origem_valor,
    tipos_objeto = EXCLUDED.tipos_objeto,
    dominio_valores = EXCLUDED.dominio_valores,
    configuracao_por_tipo = EXCLUDED.configuracao_por_tipo,
    regras_validacao = EXCLUDED.regras_validacao,
    exige_evidencia = EXCLUDED.exige_evidencia,
    permite_nao_informado = EXCLUDED.permite_nao_informado,
    versao = GREATEST(demandas.dom_atributo_objeto.versao, EXCLUDED.versao),
    ativo = TRUE,
    atualizado_em = CURRENT_TIMESTAMP;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON demandas.dom_atributo_objeto TO slt_user;

COMMIT;
