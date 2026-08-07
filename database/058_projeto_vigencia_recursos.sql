-- SLT — adiciona "Vigência e recursos" ao cadastro de projeto.
--
-- Motivação: alinhar o projeto aos campos já existentes em plano/programa
-- (seção "4. Vigência e recursos"), de modo que vigência e valor global sejam
-- atributos cadastrais passíveis de hierarquização (colunas estáticas da Fase 3).
--
-- Idempotente: pode ser reaplicada com segurança.

BEGIN;

ALTER TABLE demandas.projeto
    ADD COLUMN IF NOT EXISTS vigencia_inicio DATE,
    ADD COLUMN IF NOT EXISTS vigencia_fim    DATE,
    ADD COLUMN IF NOT EXISTS valor_global    NUMERIC(18, 2);

ALTER TABLE demandas.projeto
    DROP CONSTRAINT IF EXISTS ck_projeto_vigencia;

ALTER TABLE demandas.projeto
    ADD CONSTRAINT ck_projeto_vigencia
        CHECK (vigencia_fim IS NULL OR vigencia_inicio IS NULL OR vigencia_fim >= vigencia_inicio);

COMMENT ON COLUMN demandas.projeto.vigencia_inicio IS
    'Início da vigência informado no cadastro (seção Vigência e recursos)';
COMMENT ON COLUMN demandas.projeto.vigencia_fim IS
    'Fim da vigência informado no cadastro (seção Vigência e recursos)';
COMMENT ON COLUMN demandas.projeto.valor_global IS
    'Valor global estimado do projeto em R$ (seção Vigência e recursos)';

COMMIT;
