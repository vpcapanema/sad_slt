-- 096 — Inclui as Unidades de Conservação municipais na Fase 1.
--
-- A fonte do CNUC/MMA vem agregada: uma camada por grupo (Proteção Integral e
-- Uso Sustentável) reunindo as três esferas. A desagregação por `esfera` que
-- existia parava em Estadual e Federal, deixando de fora 44 UCs de Proteção
-- Integral e 13 de Uso Sustentável municipais — que, mesmo assim, entravam no
-- produto consolidado porque o geoprocesso consumiu a camada agregada.
--
-- O grupo da unidade é definido pela Lei nº 9.985/2000, não pela esfera do
-- órgão gestor: UC de Proteção Integral municipal tem o mesmo regime de uso
-- indireto das estaduais e federais. Recebe, portanto, a mesma classificação.
--
-- Referência: /restrict/geoespacial/configuracao-risco-restricao/, seção 2.

BEGIN;

INSERT INTO geoprocessamento.regra_classificacao_fase1
    (criterio_id, ordem, expressao, tipo_tratamento_resultante, severidade, base_legal, observacao)
VALUES
    ('uc_pi_municipal', 999, $expr$True$expr$, 'restricao', 4,
     'Lei 9985/2000 art. 7 §1',
     'UC de Proteção Integral municipal: admite apenas uso indireto dos recursos.'),
    ('uc_us_municipal', 999, $expr$True$expr$, 'risco', 2,
     'Lei 9985/2000 art. 7 §2',
     'UC de Uso Sustentável municipal: categoria e zoneamento condicionam a intervenção.')
ON CONFLICT (criterio_id, ordem) DO UPDATE SET
    tipo_tratamento_resultante = EXCLUDED.tipo_tratamento_resultante,
    severidade = EXCLUDED.severidade,
    base_legal = EXCLUDED.base_legal,
    observacao = EXCLUDED.observacao,
    ativo = TRUE,
    atualizado_em = CURRENT_TIMESTAMP;

COMMIT;
