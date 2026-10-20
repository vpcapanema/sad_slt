BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE geoprocessamento.arquivo_resultado IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
    anterior text;
    versao text;
BEGIN
    SELECT pg_get_expr(conbin, conrelid), obj_description(oid, 'pg_constraint')
      INTO anterior, versao
      FROM pg_constraint
     WHERE conrelid = 'geoprocessamento.arquivo_resultado'::regclass
       AND conname = 'ck_arquivo_resultado_destino';

    IF versao = '139: saidas por contexto; destinos legados preservados' THEN
        RETURN;
    END IF;
    IF anterior IS NULL THEN
        RAISE EXCEPTION 'Aplique a migration 123 de saidas no Storage antes da migration 139.';
    END IF;

    ALTER TABLE geoprocessamento.arquivo_resultado
        DROP CONSTRAINT ck_arquivo_resultado_destino;
    EXECUTE format(
        'ALTER TABLE geoprocessamento.arquivo_resultado
         ADD CONSTRAINT ck_arquivo_resultado_destino CHECK (
             (%s) OR (
                 caminho ~ %L
                 AND strpos(caminho, ''..'') = 0
                 AND strpos(caminho, chr(92)) = 0
             )
         )',
        anterior,
        '^saidas-geoespaciais/(analises-avulsas/[^/]+|hierarquizacoes/[^/]+/(fase-[123]|consolidado)|exportacoes)/[A-Za-z0-9_]+_[0-9a-f]{32}/[^/]+$'
    );
END $$;

COMMENT ON CONSTRAINT ck_arquivo_resultado_destino
    ON geoprocessamento.arquivo_resultado IS
    '139: saidas por contexto; destinos legados preservados';
COMMIT;
