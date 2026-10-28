-- Reconcilia somente demandas ainda em hierarquizacao cuja rodada mais recente
-- possui sintese concluida e atual. Nao publica nem altera demandas em execucao.
BEGIN;

CREATE TEMP TABLE sicard_conclusoes_pendentes ON COMMIT DROP AS
WITH participacoes AS (
    SELECT h.tipo_demanda_id, o.item->'cabecalho_objeto'->>'demanda_id' AS demanda_id,
           h.status, o.item->'hierarquizacao' AS resultado,
           o.item->'cabecalho_objeto'->'complementacao_atributos'->>'concluida' AS complementacao_concluida,
           h.dados_hierarquizacao->'cabecalho_grupo'->'relatorios' AS relatorios,
           row_number() OVER (
               PARTITION BY h.tipo_demanda_id, o.item->'cabecalho_objeto'->>'demanda_id'
               ORDER BY h.criado_em DESC, h.codigo DESC
           ) AS ordem
    FROM hierarquizacao_demandas.hierarquizacao_portfolio h
    CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(h.dados_hierarquizacao->'objetos', '[]'::jsonb)
    ) AS o(item)
)
SELECT tipo_demanda_id, demanda_id
FROM participacoes
WHERE ordem = 1 AND status = 'homologada'
  AND resultado->'sintese'->>'executada' = 'true'
  AND COALESCE(complementacao_concluida, 'true') <> 'false'
  AND COALESCE(resultado->'fase_1'->>'desatualizado', 'false') <> 'true'
  AND COALESCE(resultado->'fase_2'->>'desatualizado', 'false') <> 'true'
  AND COALESCE(resultado->'fase_3'->>'desatualizado', 'false') <> 'true'
  AND COALESCE(resultado->'sintese'->>'desatualizado', 'false') <> 'true'
  AND COALESCE(relatorios->'fase_3'->>'desatualizado', 'false') <> 'true'
  AND COALESCE(relatorios->'sintese'->>'desatualizado', 'false') <> 'true';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM demandas.dom_status_demanda_transicao
        WHERE status_origem='hierarq_em_andamento' AND status_destino='hierarq_finalizada'
    ) THEN
        RAISE EXCEPTION 'O dominio nao permite concluir a hierarquizacao das demandas.';
    END IF;
END $$;

UPDATE demandas.plano d SET status='hierarq_finalizada'
FROM sicard_conclusoes_pendentes c
WHERE c.tipo_demanda_id=1 AND d.id::text=c.demanda_id AND d.status='hierarq_em_andamento';

UPDATE demandas.programa d SET status='hierarq_finalizada'
FROM sicard_conclusoes_pendentes c
WHERE c.tipo_demanda_id=2 AND d.id::text=c.demanda_id AND d.status='hierarq_em_andamento';

UPDATE demandas.projeto d SET status='hierarq_finalizada'
FROM sicard_conclusoes_pendentes c
WHERE c.tipo_demanda_id=3 AND d.id::text=c.demanda_id AND d.status='hierarq_em_andamento';

COMMIT;
