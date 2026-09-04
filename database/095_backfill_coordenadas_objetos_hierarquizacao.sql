-- 095 — Copia latitude/longitude da demanda de origem para os objetos da rodada.
--
-- As Fases 1 e 2 intersectam o ponto do objeto com as camadas homologadas e leem
-- a coordenada de `cabecalho_objeto`. O seed de exemplos montava o cabeçalho
-- apenas com id, codigo, nome e status, então a execução parava em
-- "Demanda <codigo> sem coordenadas" mesmo com a coordenada disponível em
-- demandas.projeto. O script do seed já foi corrigido; isto repara o que ficou
-- gravado.
--
-- Idempotente: reescreve o valor a partir da origem e não toca em objeto cuja
-- demanda não tenha coordenada.

BEGIN;

-- Coluna `objetos`.
UPDATE hierarquizacao_demandas.hierarquizacao_portfolio h
SET objetos = s.novo
FROM (
    SELECT p.id,
           jsonb_agg(
               CASE WHEN pr.latitude IS NOT NULL AND pr.longitude IS NOT NULL
                    THEN t.obj || jsonb_build_object(
                             'latitude', pr.latitude::float8,
                             'longitude', pr.longitude::float8)
                    ELSE t.obj END
               ORDER BY t.ord) AS novo
    FROM hierarquizacao_demandas.hierarquizacao_portfolio p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.objetos, '[]'::jsonb))
               WITH ORDINALITY AS t(obj, ord)
    LEFT JOIN demandas.projeto pr ON pr.codigo = t.obj->>'codigo'
    GROUP BY p.id
) s
WHERE h.id = s.id;

-- `dados_hierarquizacao.objetos[*].cabecalho_objeto`, que é o que as fases leem.
UPDATE hierarquizacao_demandas.hierarquizacao_portfolio h
SET dados_hierarquizacao = jsonb_set(h.dados_hierarquizacao, '{objetos}', s.novo)
FROM (
    SELECT p.id,
           jsonb_agg(
               CASE WHEN pr.latitude IS NOT NULL AND pr.longitude IS NOT NULL
                    THEN jsonb_set(t.obj, '{cabecalho_objeto}',
                             (t.obj->'cabecalho_objeto') || jsonb_build_object(
                                 'latitude', pr.latitude::float8,
                                 'longitude', pr.longitude::float8))
                    ELSE t.obj END
               ORDER BY t.ord) AS novo
    FROM hierarquizacao_demandas.hierarquizacao_portfolio p
    CROSS JOIN LATERAL jsonb_array_elements(
               COALESCE(p.dados_hierarquizacao->'objetos', '[]'::jsonb))
               WITH ORDINALITY AS t(obj, ord)
    LEFT JOIN demandas.projeto pr ON pr.codigo = t.obj->'cabecalho_objeto'->>'codigo'
    GROUP BY p.id
) s
WHERE h.id = s.id AND h.dados_hierarquizacao ? 'objetos';

COMMIT;
