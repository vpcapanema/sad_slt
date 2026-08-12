-- Padroniza os nomes canônicos dos atributos cadastrais com a terminologia
-- empregada na Fase 3 e nos formulários de cadastro.

BEGIN;

UPDATE demandas.dom_atributo_objeto
SET nome = CASE codigo
        WHEN 'maturidade_objeto' THEN 'Etapa atual de desenvolvimento'
        WHEN 'capex_estimado' THEN 'Capex (custo estimado para implantação)'
        WHEN 'base_estimativa_capex' THEN 'Nível de detalhamento da estimativa de custo'
        WHEN 'prazo_referencia_meses' THEN 'Prazo estimado para implantação'
        WHEN 'base_estimativa_prazo' THEN 'Nível de detalhamento do cronograma'
        ELSE nome
    END,
    descricao = CASE codigo
        WHEN 'maturidade_objeto' THEN 'Etapa nominal atual do desenvolvimento do plano, programa ou projeto.'
        WHEN 'capex_estimado' THEN 'Custo estimado, em reais, necessário para implantar o programa ou projeto.'
        WHEN 'base_estimativa_capex' THEN 'Nível documental da informação utilizada para calcular o Capex informado.'
        WHEN 'prazo_referencia_meses' THEN 'Prazo estimado, em meses, até o marco de implantação aplicável ao tipo de objeto.'
        WHEN 'base_estimativa_prazo' THEN 'Nível documental do cronograma utilizado para calcular o prazo informado.'
        ELSE descricao
    END,
    versao = versao + 1,
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo IN (
    'maturidade_objeto',
    'capex_estimado',
    'base_estimativa_capex',
    'prazo_referencia_meses',
    'base_estimativa_prazo'
);

COMMIT;
