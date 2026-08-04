-- Fase 1 · remove a dependência de relevância da classificação de cavidades.
BEGIN;

DELETE FROM geoprocessamento.regra_classificacao_fase1
WHERE criterio_id IN ('cavidade_maxima', 'cavidade_demais');

INSERT INTO geoprocessamento.regra_classificacao_fase1
    (criterio_id, ordem, expressao, tipo_tratamento_resultante, severidade, base_legal, observacao)
VALUES
    ('cavidade', 999, $expr$True$expr$, 'risco', 2,
     'Dec. 10935/2022; IN ICMBio 02/2017',
     'Cavidade natural ou área oficial de influência: risco sem pré-requisito de relevância.')
ON CONFLICT (criterio_id, ordem) DO UPDATE SET
    expressao = EXCLUDED.expressao,
    tipo_tratamento_resultante = EXCLUDED.tipo_tratamento_resultante,
    severidade = EXCLUDED.severidade,
    base_legal = EXCLUDED.base_legal,
    observacao = EXCLUDED.observacao,
    ativo = TRUE,
    atualizado_em = CURRENT_TIMESTAMP;

UPDATE geoprocessamento.fonte_fase1
SET criterio_id_padrao = 'cavidade',
    tipo_tratamento_padrao = 'risco',
    severidade_padrao = 2,
    atualizado_em = CURRENT_TIMESTAMP
WHERE fonte_id = 'cecav_cavidades';

COMMIT;