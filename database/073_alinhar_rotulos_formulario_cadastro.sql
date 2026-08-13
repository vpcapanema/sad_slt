-- SLT — Alinha demandas.dom_atributo_objeto (colunas nome / configuracao_por_tipo)
-- com o texto literal exibido nos formulários de cadastro de plano/programa/projeto
-- (templates/paginas/cadastro/nova-demanda.html), mantendo essa tabela como fonte
-- canônica única para rótulos e opções (ver database/067 e 068).
--
-- Idempotente: pode ser reaplicada com segurança.

BEGIN;

-- Grau de maturidade do [plano|programa|projeto]
UPDATE demandas.dom_atributo_objeto
SET nome = 'Grau de maturidade do objeto de demanda',
    configuracao_por_tipo = jsonb_set(
        jsonb_set(
            jsonb_set(
                COALESCE(configuracao_por_tipo, '{}'::JSONB),
                '{plano,rotulo}', '"Grau de maturidade do plano"'::JSONB, TRUE
            ),
            '{programa,rotulo}', '"Grau de maturidade do programa"'::JSONB, TRUE
        ),
        '{projeto,rotulo}', '"Grau de maturidade do projeto"'::JSONB, TRUE
    ),
    versao = versao + 1,
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo = 'maturidade_objeto';

-- Capex — custo estimado para implantação (R$)
UPDATE demandas.dom_atributo_objeto
SET nome = 'Capex — custo estimado para implantação (R$)',
    versao = versao + 1,
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo = 'capex_estimado';

-- Grau de definição do custo de implantação
UPDATE demandas.dom_atributo_objeto
SET nome = 'Grau de definição do custo de implantação',
    versao = versao + 1,
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo = 'base_estimativa_capex';

-- Prazo estimado até [aprovação/vigência|implantação do programa|entrada em operação] (meses)
UPDATE demandas.dom_atributo_objeto
SET nome = 'Prazo estimado para implantação (meses)',
    configuracao_por_tipo = jsonb_set(
        jsonb_set(
            jsonb_set(
                COALESCE(configuracao_por_tipo, '{}'::JSONB),
                '{plano,rotulo}', '"Prazo estimado até a aprovação ou início da vigência (meses)"'::JSONB, TRUE
            ),
            '{programa,rotulo}', '"Prazo estimado para implantação do programa (meses)"'::JSONB, TRUE
        ),
        '{projeto,rotulo}', '"Prazo estimado até a entrada em operação (meses)"'::JSONB, TRUE
    ),
    versao = versao + 1,
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo = 'prazo_referencia_meses';

-- Grau de definição do [horizonte temporal (plano)|prazo de implantação (programa/projeto)]
UPDATE demandas.dom_atributo_objeto
SET nome = 'Grau de definição do prazo de implantação',
    configuracao_por_tipo = jsonb_set(
        COALESCE(configuracao_por_tipo, '{}'::JSONB),
        '{plano,rotulo}', '"Grau de definição do horizonte temporal"'::JSONB, TRUE
    ),
    versao = versao + 1,
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo = 'base_estimativa_prazo';

COMMIT;
