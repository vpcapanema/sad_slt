-- Explicita o valor informado, o valor rescalonado e o peso em cada atributo
-- dinâmico já materializado nos snapshots das hierarquizações existentes.
WITH objetos_atualizados AS (
    SELECT
        h.codigo,
        jsonb_agg(
            CASE
                WHEN objeto->'cabecalho_objeto'->'atributos_fase3' IS NULL THEN objeto
                ELSE jsonb_set(
                    objeto,
                    '{cabecalho_objeto,atributos_fase3}',
                    COALESCE((
                        SELECT jsonb_object_agg(
                            atributo.key,
                            atributo.value
                                || jsonb_build_object(
                                    'valor_bruto', COALESCE(atributo.value->'valor_bruto', atributo.value->'valor', 'null'::jsonb),
                                    'valor_rescalonado', COALESCE(atributo.value->'valor_rescalonado', 'null'::jsonb),
                                    'peso', COALESCE(atributo.value->'peso', 'null'::jsonb)
                                )
                        )
                        FROM jsonb_each(objeto->'cabecalho_objeto'->'atributos_fase3') AS atributo
                    ), '{}'::jsonb),
                    true
                )
            END
            ORDER BY objeto_ordem
        ) AS objetos
    FROM hierarquizacao_demandas.hierarquizacao_portfolio AS h
    CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(h.dados_hierarquizacao->'objetos', '[]'::jsonb)
    ) WITH ORDINALITY AS itens(objeto, objeto_ordem)
    GROUP BY h.codigo
)
UPDATE hierarquizacao_demandas.hierarquizacao_portfolio AS h
SET dados_hierarquizacao = jsonb_set(h.dados_hierarquizacao, '{objetos}', oa.objetos, true)
FROM objetos_atualizados AS oa
WHERE h.codigo = oa.codigo;
