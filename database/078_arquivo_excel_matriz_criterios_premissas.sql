-- Armazena o Excel original usado na importação da matriz conceitual.
BEGIN;

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS arquivo_excel_matriz_criterios_premissas BYTEA;

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.arquivo_excel_matriz_criterios_premissas IS
    'Conteúdo binário do arquivo Excel original da matriz de critérios e premissas.';

-- Evita replicar o binário no JSON de auditoria a cada alteração do registro.
CREATE OR REPLACE FUNCTION auditoria.fn_registrar_auditoria_multicriterio()
RETURNS TRIGGER AS $$
DECLARE
    v_operacao VARCHAR(10);
    v_anterior JSONB;
    v_novo JSONB;
    v_id UUID;
    v_codigo TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operacao := 'INSERT'; v_anterior := NULL; v_novo := to_jsonb(NEW);
        v_id := NEW.id; v_codigo := NEW.codigo;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operacao := 'UPDATE'; v_anterior := to_jsonb(OLD); v_novo := to_jsonb(NEW);
        v_id := NEW.id; v_codigo := NEW.codigo;
    ELSIF TG_OP = 'DELETE' THEN
        v_operacao := 'DELETE'; v_anterior := to_jsonb(OLD); v_novo := NULL;
        v_id := OLD.id; v_codigo := OLD.codigo;
    END IF;

    IF v_anterior IS NOT NULL THEN
        v_anterior := v_anterior - 'arquivo_conteudo' - 'arquivo_excel_matriz_criterios_premissas';
    END IF;
    IF v_novo IS NOT NULL THEN
        v_novo := v_novo - 'arquivo_conteudo' - 'arquivo_excel_matriz_criterios_premissas';
    END IF;

    INSERT INTO auditoria.log_sistema (
        nivel, categoria, operacao, schema_nome, tabela, registro_id,
        mensagem, dados_anteriores, dados_novos, origem
    ) VALUES (
        'AUDIT', TG_TABLE_NAME, v_operacao, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_id,
        format('%s %s — operação %s', TG_TABLE_NAME, v_codigo, v_operacao),
        v_anterior, v_novo, 'sistema'
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
