-- Fase 1 · o tombamento oficialmente identificado já produz restrição jurídica.
BEGIN;

DELETE FROM geoprocessamento.regra_classificacao_fase1
WHERE criterio_id = 'bem_tombado';

INSERT INTO geoprocessamento.regra_classificacao_fase1
    (criterio_id, ordem, expressao, tipo_tratamento_resultante, severidade, base_legal, observacao)
VALUES
    ('bem_tombado', 999, $expr$True$expr$, 'restricao', 4,
     'Dec-Lei 25/1937, arts. 10, 17 e 18; IN IPHAN 001/2015',
     'Bem tombado ou área envoltória oficial: restrição jurídica; intervenção depende de autorização patrimonial.')
ON CONFLICT (criterio_id, ordem) DO UPDATE SET
    expressao = EXCLUDED.expressao,
    tipo_tratamento_resultante = EXCLUDED.tipo_tratamento_resultante,
    severidade = EXCLUDED.severidade,
    base_legal = EXCLUDED.base_legal,
    observacao = EXCLUDED.observacao,
    ativo = TRUE,
    atualizado_em = CURRENT_TIMESTAMP;

COMMIT;