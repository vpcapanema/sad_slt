-- SLT — análise de admissibilidade da demanda (portão de entrada da Fase 1).
-- Cinco critérios binários Sim/Não; o resultado é a maioria simples — 5 é ímpar,
-- então nunca empata: 3 ou mais "Sim" aprova, 3 ou mais "Não" reprova.
--
-- A demanda vive em três tabelas (demandas.plano, demandas.programa e
-- demandas.projeto), por isso a referência aqui é o código legível — mesmo
-- padrão já usado pelos serviços/repositórios (`get_by_codigo`) — e não uma FK.
--
-- Não existe schema local `usuarios` (a autenticação é delegada ao SIGMA), logo
-- `avaliador_id` é UUID sem FK física, como `criado_por` nas demais tabelas.
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS demandas;

CREATE TABLE IF NOT EXISTS demandas.analise_demanda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demanda_codigo TEXT NOT NULL UNIQUE,
    demanda_tipo VARCHAR(20) NOT NULL CHECK (demanda_tipo IN ('plano', 'programa', 'projeto')),
    criterio_competencia BOOLEAN,
    criterio_clareza BOOLEAN,
    criterio_finalidade_publica BOOLEAN,
    criterio_relevancia_setorial BOOLEAN,
    criterio_nao_duplicidade BOOLEAN,
    resultado VARCHAR(20) CHECK (resultado IN ('aprovado', 'reprovado')),
    parecer_texto TEXT,
    parecer_complemento TEXT,
    decisao VARCHAR(30) CHECK (decisao IN ('aprovada', 'ressalvas', 'reprovada')),
    avaliador_id UUID,
    avaliador_nome TEXT,
    parecer_pdf BYTEA,
    parecer_pdf_gerado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analise_demanda_tipo ON demandas.analise_demanda (demanda_tipo);

CREATE OR REPLACE FUNCTION demandas.fn_touch_analise_demanda()
RETURNS TRIGGER AS $$ BEGIN NEW.atualizado_em = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_analise_demanda ON demandas.analise_demanda;
CREATE TRIGGER trg_touch_analise_demanda
    BEFORE UPDATE ON demandas.analise_demanda
    FOR EACH ROW EXECUTE FUNCTION demandas.fn_touch_analise_demanda();

GRANT USAGE ON SCHEMA demandas TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON demandas.analise_demanda TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA demandas TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA demandas GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
