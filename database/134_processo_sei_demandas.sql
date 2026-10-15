-- Número do processo SEI pertence à demanda; admite várias demandas por processo.
BEGIN;
ALTER TABLE demandas.plano ADD COLUMN IF NOT EXISTS origem_sei_processo text;
COMMENT ON COLUMN demandas.plano.origem_sei_processo IS 'Processo SEI';
-- Recupera somente vínculos inequívocos e não substitui números já conferidos.
WITH origem AS (
    SELECT demanda_id, min(btrim(numero_processo)) AS numero
    FROM integracoes.sei_documento
    WHERE nullif(btrim(numero_processo), '') IS NOT NULL
    GROUP BY demanda_id
    HAVING count(DISTINCT btrim(numero_processo)) = 1
)
UPDATE demandas.plano d SET origem_sei_processo = origem.numero
FROM origem
WHERE d.codigo = origem.demanda_id
  AND nullif(btrim(d.origem_sei_processo), '') IS NULL;
ALTER TABLE demandas.programa ADD COLUMN IF NOT EXISTS origem_sei_processo text;
COMMENT ON COLUMN demandas.programa.origem_sei_processo IS 'Processo SEI';
-- Recupera somente vínculos inequívocos e não substitui números já conferidos.
WITH origem AS (
    SELECT demanda_id, min(btrim(numero_processo)) AS numero
    FROM integracoes.sei_documento
    WHERE nullif(btrim(numero_processo), '') IS NOT NULL
    GROUP BY demanda_id
    HAVING count(DISTINCT btrim(numero_processo)) = 1
)
UPDATE demandas.programa d SET origem_sei_processo = origem.numero
FROM origem
WHERE d.codigo = origem.demanda_id
  AND nullif(btrim(d.origem_sei_processo), '') IS NULL;
ALTER TABLE demandas.projeto ADD COLUMN IF NOT EXISTS origem_sei_processo text;
COMMENT ON COLUMN demandas.projeto.origem_sei_processo IS 'Processo SEI';
-- Recupera somente vínculos inequívocos e não substitui números já conferidos.
WITH origem AS (
    SELECT demanda_id, min(btrim(numero_processo)) AS numero
    FROM integracoes.sei_documento
    WHERE nullif(btrim(numero_processo), '') IS NOT NULL
    GROUP BY demanda_id
    HAVING count(DISTINCT btrim(numero_processo)) = 1
)
UPDATE demandas.projeto d SET origem_sei_processo = origem.numero
FROM origem
WHERE d.codigo = origem.demanda_id
  AND nullif(btrim(d.origem_sei_processo), '') IS NULL;
COMMIT;
