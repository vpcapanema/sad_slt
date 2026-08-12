-- Explicita a unidade de medida dos atributos cadastrais nominais ordenados.

BEGIN;

UPDATE demandas.dom_atributo_objeto
SET unidade = 'escala ordinal',
    versao = versao + 1,
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo IN (
    'maturidade_objeto',
    'base_estimativa_capex',
    'base_estimativa_prazo'
);

COMMIT;
