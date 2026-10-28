BEGIN;

-- Mantém a matriz integral imutável; somente seu recorte da Fase 3 é julgado.
CREATE OR REPLACE FUNCTION ahp.criterios_fase3_matriz(conteudo jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT COALESCE(jsonb_agg(item ORDER BY ordem), '[]'::jsonb)
    FROM jsonb_array_elements(ahp.conteudo_matriz_comparavel(conteudo)->'linhas')
         WITH ORDINALITY AS linhas(item, ordem)
    WHERE EXISTS (
        SELECT 1 FROM jsonb_each_text(item) AS campo(chave, valor)
        WHERE translate(lower(btrim(chave)), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc')
              IN ('etapa', 'etapa da hierarquizacao', 'etapa_hierarquizacao')
          AND (
              regexp_replace(translate(lower(btrim(valor)), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc'),
                             '[[:space:]-]+', '_', 'g') IN ('3', 'fase3', 'fase_3')
              OR translate(lower(btrim(valor)), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc') LIKE 'priorizacao%'
              OR translate(lower(btrim(valor)), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc') LIKE 'ajuste%'
          )
    )
$$;

CREATE OR REPLACE FUNCTION ahp.proteger_matriz_julgamento()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linhas jsonb;
BEGIN
    IF TG_OP='UPDATE' AND NEW.matriz_id IS DISTINCT FROM OLD.matriz_id THEN
        RAISE EXCEPTION 'A matriz do julgamento é imutável. Crie outro julgamento.';
    END IF;
    SELECT ahp.criterios_fase3_matriz(conteudo) INTO linhas
    FROM ahp.matriz_criterios_premissas WHERE id=NEW.matriz_id;
    IF linhas IS NULL OR jsonb_array_length(linhas) < 2 OR linhas IS DISTINCT FROM NEW.criterios
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.criterios) c WHERE c ? '_superficie_id') THEN
        RAISE EXCEPTION 'O julgamento deve conter exclusivamente o recorte da Fase 3 da matriz associada, com ao menos dois critérios.';
    END IF;
    RETURN NEW;
END $$;

-- Não altera snapshots, respostas ou pesos históricos.
COMMIT;
