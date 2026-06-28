-- SLT — Abrangência estadual (SP) para planos/programas sentinela OUTROS.
-- Mesmo critério de PLANO-PLI / PLANO-PEF (geo.unidade_espacial estado codigo 35).

BEGIN;

INSERT INTO demandas.plano_unidade_espacial (plano_id, unidade_espacial_id)
SELECT p.id, ue.id
FROM demandas.plano p
CROSS JOIN geo.unidade_espacial ue
WHERE p.codigo = 'PLANO-OUTROS'
  AND ue.tipo_regionalizacao = 'estado'
  AND ue.codigo = '35'
ON CONFLICT DO NOTHING;

INSERT INTO demandas.programa_unidade_espacial (programa_id, unidade_espacial_id)
SELECT pg.id, ue.id
FROM demandas.programa pg
CROSS JOIN geo.unidade_espacial ue
WHERE pg.codigo = 'PROG-OUTROS'
  AND ue.tipo_regionalizacao = 'estado'
  AND ue.codigo = '35'
ON CONFLICT DO NOTHING;

COMMIT;
