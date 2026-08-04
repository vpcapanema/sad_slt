-- Fase 1 · cavidade de relevância máxima é risco, não restrição automática.
-- O Decreto 10.935/2022 condiciona eventual impacto irreversível ao licenciamento.
BEGIN;

UPDATE geoprocessamento.regra_classificacao_fase1
SET
    tipo_tratamento_resultante = 'risco',
    severidade = 3,
    base_legal = 'Dec. 10935/2022 arts. 3, 4 e 6',
    observacao = 'Cavidade de relevância máxima: risco; restrição depende da análise e autorização do licenciamento.',
    atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'cavidade_maxima'
  AND ordem = 10;

COMMIT;