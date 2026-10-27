BEGIN;
ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS nome VARCHAR(200);
UPDATE ahp.comparacao_colaborativa_ambiente
SET nome = 'Julgamento ' || COALESCE(hierarquizacao_codigo, config_codigo, id::text)
WHERE nome IS NULL OR btrim(nome) = '';
COMMIT;
