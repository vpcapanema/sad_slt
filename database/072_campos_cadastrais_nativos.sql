-- SLT — Migração: Transforma atributos cadastrais fixos em colunas explícitas
-- Data: 2026-08-12
--
-- Remove a dependencia de JSON genérico (`atributos_cadastrais`) para os atributos:
-- maturidade, capex_estimado, base_estimativa_capex, prazo_referencia_meses, base_estimativa_prazo
-- que são estruturais ao negócio e tornam-se colunas físicas.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Criação de tipos/domínios para restringir valores estáticos de dicionário
-- -----------------------------------------------------------------------------

-- Domínios base_estimativa_capex
CREATE DOMAIN demandas.dom_base_estimativa_capex AS VARCHAR(50)
CHECK (
    VALUE IN (
        'estimativa_preliminar',
        'estudo_viabilidade',
        'anteprojeto',
        'projeto_basico',
        'projeto_executivo',
        'valor_contratado'
    )
);

-- Domínios maturidade (comum/agregado)
CREATE DOMAIN demandas.dom_maturidade_objeto AS VARCHAR(50)
CHECK (
    VALUE IN (
        -- Plano
        'concepcao',
        'elaboracao',
        'consulta',
        -- Programa
        'estruturacao',
        'pactuacao',
        'implantacao',
        -- Projeto
        'ideia',
        'estudo_preliminar',
        'estudo_viabilidade',
        'anteprojeto',
        'projeto_basico',
        'projeto_executivo',
        'pronto_implantacao',
        -- Compartilhado
        'aprovado',
        'vigente'
    )
);

-- Domínios base_estimativa_prazo
CREATE DOMAIN demandas.dom_base_estimativa_prazo AS VARCHAR(50)
CHECK (
    VALUE IN (
        'estimativa_preliminar',
        -- Plano
        'cronograma_elaboracao',
        'cronograma_consultas',
        'cronograma_aprovado',
        'cronograma_vigente',
        -- Programa
        'cronograma_programa',
        'cronograma_consolidado',
        'cronograma_pactuado',
        'cronogramas_componentes',
        -- Projeto
        'cronograma_estudos',
        'cronograma_anteprojeto',
        'cronograma_projeto_basico',
        'cronograma_projeto_executivo',
        'cronograma_contratual'
    )
);


-- -----------------------------------------------------------------------------
-- 2. Adicionar colunas físicas às tabelas de negócio
-- -----------------------------------------------------------------------------

-- Tabela: PLANO
ALTER TABLE demandas.plano
    ADD COLUMN maturidade demandas.dom_maturidade_objeto,
    ADD COLUMN prazo_referencia_meses INTEGER CHECK (prazo_referencia_meses >= 0),
    ADD COLUMN base_estimativa_prazo demandas.dom_base_estimativa_prazo;

-- Tabela: PROGRAMA
ALTER TABLE demandas.programa
    ADD COLUMN maturidade demandas.dom_maturidade_objeto,
    ADD COLUMN capex_estimado NUMERIC(18, 2) CHECK (capex_estimado >= 0),
    ADD COLUMN base_estimativa_capex demandas.dom_base_estimativa_capex,
    ADD COLUMN prazo_referencia_meses INTEGER CHECK (prazo_referencia_meses >= 0),
    ADD COLUMN base_estimativa_prazo demandas.dom_base_estimativa_prazo;

-- Tabela: PROJETO
ALTER TABLE demandas.projeto
    ADD COLUMN maturidade demandas.dom_maturidade_objeto,
    ADD COLUMN capex_estimado NUMERIC(18, 2) CHECK (capex_estimado >= 0),
    ADD COLUMN base_estimativa_capex demandas.dom_base_estimativa_capex,
    ADD COLUMN prazo_referencia_meses INTEGER CHECK (prazo_referencia_meses >= 0),
    ADD COLUMN base_estimativa_prazo demandas.dom_base_estimativa_prazo;

-- Comentários
COMMENT ON COLUMN demandas.plano.maturidade IS 'Estágio de desenvolvimento do plano';
COMMENT ON COLUMN demandas.plano.prazo_referencia_meses IS 'Prazo para aprovação, início de vigência ou horizonte';
COMMENT ON COLUMN demandas.plano.base_estimativa_prazo IS 'Documento ou estágio de planejamento que sustenta o prazo';

COMMENT ON COLUMN demandas.programa.maturidade IS 'Estágio de desenvolvimento do programa';
COMMENT ON COLUMN demandas.programa.capex_estimado IS 'Custo de investimento estimado (Capex) em R$';
COMMENT ON COLUMN demandas.programa.base_estimativa_capex IS 'Nível documental que sustenta o custo';
COMMENT ON COLUMN demandas.programa.prazo_referencia_meses IS 'Prazo para implantação do programa';
COMMENT ON COLUMN demandas.programa.base_estimativa_prazo IS 'Documento ou estágio que sustenta o prazo';

COMMENT ON COLUMN demandas.projeto.maturidade IS 'Estágio de desenvolvimento do projeto';
COMMENT ON COLUMN demandas.projeto.capex_estimado IS 'Custo de investimento estimado (Capex) em R$';
COMMENT ON COLUMN demandas.projeto.base_estimativa_capex IS 'Nível documental que sustenta o custo';
COMMENT ON COLUMN demandas.projeto.prazo_referencia_meses IS 'Prazo até a implantação ou entrada em operação';
COMMENT ON COLUMN demandas.projeto.base_estimativa_prazo IS 'Documento ou estágio que sustenta o prazo';

-- -----------------------------------------------------------------------------
-- 3. Preencher os novos campos físicos com os dados JSONB anteriores (se houver)
-- -----------------------------------------------------------------------------
UPDATE demandas.plano
SET 
    maturidade = (atributos_cadastrais->>'maturidade_objeto')::demandas.dom_maturidade_objeto,
    prazo_referencia_meses = (atributos_cadastrais->>'prazo_referencia_meses')::INTEGER,
    base_estimativa_prazo = (atributos_cadastrais->>'base_estimativa_prazo')::demandas.dom_base_estimativa_prazo
WHERE atributos_cadastrais != '{}'::jsonb;

UPDATE demandas.programa
SET 
    maturidade = (atributos_cadastrais->>'maturidade_objeto')::demandas.dom_maturidade_objeto,
    capex_estimado = (atributos_cadastrais->>'capex_estimado')::NUMERIC(18,2),
    base_estimativa_capex = (atributos_cadastrais->>'base_estimativa_capex')::demandas.dom_base_estimativa_capex,
    prazo_referencia_meses = (atributos_cadastrais->>'prazo_referencia_meses')::INTEGER,
    base_estimativa_prazo = (atributos_cadastrais->>'base_estimativa_prazo')::demandas.dom_base_estimativa_prazo
WHERE atributos_cadastrais != '{}'::jsonb;

UPDATE demandas.projeto
SET 
    maturidade = (atributos_cadastrais->>'maturidade_objeto')::demandas.dom_maturidade_objeto,
    capex_estimado = (atributos_cadastrais->>'capex_estimado')::NUMERIC(18,2),
    base_estimativa_capex = (atributos_cadastrais->>'base_estimativa_capex')::demandas.dom_base_estimativa_capex,
    prazo_referencia_meses = (atributos_cadastrais->>'prazo_referencia_meses')::INTEGER,
    base_estimativa_prazo = (atributos_cadastrais->>'base_estimativa_prazo')::demandas.dom_base_estimativa_prazo
WHERE atributos_cadastrais != '{}'::jsonb;


-- -----------------------------------------------------------------------------
-- 4. Remoção limpa das chaves passadas do dicionário genérico JSONB
-- -----------------------------------------------------------------------------
UPDATE demandas.plano SET atributos_cadastrais = atributos_cadastrais - 'maturidade_objeto' - 'prazo_referencia_meses' - 'base_estimativa_prazo';
UPDATE demandas.programa SET atributos_cadastrais = atributos_cadastrais - 'maturidade_objeto' - 'capex_estimado' - 'base_estimativa_capex' - 'prazo_referencia_meses' - 'base_estimativa_prazo';
UPDATE demandas.projeto SET atributos_cadastrais = atributos_cadastrais - 'maturidade_objeto' - 'capex_estimado' - 'base_estimativa_capex' - 'prazo_referencia_meses' - 'base_estimativa_prazo';

-- demandas.dom_atributo_objeto permanece a fonte canônica dos rótulos ordinais
-- ("Nível N — ...", ver migrations 067/068) consumidos pelo formulário de cadastro
-- (cadastro/cadastro.js) e pela tela de ponderação AHP (hierarquizacao/js/atributos-objetos.js).
-- Somente 'vinculo_institucional' é removido: já é coluna booleana própria desde a
-- migration 020 e não possui lista de valores associada nesta tabela.
DELETE FROM demandas.dom_atributo_objeto
WHERE codigo = 'vinculo_institucional';

COMMIT;
