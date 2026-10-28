BEGIN;

CREATE OR REPLACE FUNCTION ahp.conteudo_matriz_comparavel(valor jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT CASE WHEN jsonb_typeof(valor) = 'array'
        THEN jsonb_build_object('linhas', valor)
        ELSE (valor - 'arquivo' - 'aba' - 'linhas' - 'rows' - 'criterios' - 'dados')
            || jsonb_build_object('linhas', COALESCE(valor->'linhas', valor->'rows',
                                                    valor->'criterios', valor->'dados', '[]'::jsonb))
        END
$$;

CREATE TABLE IF NOT EXISTS ahp.matriz_criterios_premissas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome varchar(200) NOT NULL,
    conteudo jsonb NOT NULL,
    assinatura text GENERATED ALWAYS AS (md5(ahp.conteudo_matriz_comparavel(conteudo)::text)) STORED,
    arquivo_nome varchar(255),
    arquivo_conteudo bytea,
    criado_em timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(ahp.conteudo_matriz_comparavel(conteudo)->'linhas') = 'array')
);

ALTER TABLE hierarquizacao_demandas.hierarquizacao_portfolio
    ADD COLUMN IF NOT EXISTS matriz_id uuid REFERENCES ahp.matriz_criterios_premissas(id);
ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS matriz_id uuid REFERENCES ahp.matriz_criterios_premissas(id),
    ADD COLUMN IF NOT EXISTS origem_legada jsonb;

DO $$
DECLARE registro record; matriz_uuid uuid; conteudo jsonb;
BEGIN
    FOR registro IN
        SELECT id, nome, dados_hierarquizacao
        FROM hierarquizacao_demandas.hierarquizacao_portfolio WHERE matriz_id IS NULL
    LOOP
        conteudo := registro.dados_hierarquizacao #> '{cabecalho_grupo,matriz_premissas_criterios}';
        IF conteudo IS NOT NULL AND conteudo <> 'null'::jsonb THEN
            INSERT INTO ahp.matriz_criterios_premissas(nome, conteudo, arquivo_nome)
            VALUES (left(registro.nome,200), conteudo, conteudo->>'arquivo')
            RETURNING id INTO matriz_uuid;
            UPDATE hierarquizacao_demandas.hierarquizacao_portfolio
                SET matriz_id = matriz_uuid WHERE id = registro.id;
        END IF;
    END LOOP;
    FOR registro IN
        SELECT a.*, h.matriz_id AS matriz_hierarquizacao
        FROM ahp.comparacao_colaborativa_ambiente a
        LEFT JOIN hierarquizacao_demandas.hierarquizacao_portfolio h ON h.id=a.hierarquizacao_id
        WHERE a.matriz_id IS NULL
    LOOP
        matriz_uuid := NULL;
        IF registro.matriz_hierarquizacao IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(registro.criterios) c WHERE c ? '_superficie_id'
        ) THEN
            SELECT m.id INTO matriz_uuid FROM ahp.matriz_criterios_premissas m
            WHERE m.id=registro.matriz_hierarquizacao
              AND ahp.conteudo_matriz_comparavel(m.conteudo)->'linhas'=registro.criterios;
        END IF;
        IF matriz_uuid IS NULL THEN
            INSERT INTO ahp.matriz_criterios_premissas
                (nome,conteudo,arquivo_nome,arquivo_conteudo)
            VALUES (left(COALESCE(registro.nome,registro.config_nome,'Matriz AHP'),200),
                    jsonb_build_object('linhas',registro.criterios),
                    registro.arquivo_matriz_nome,registro.arquivo_excel_matriz_criterios_premissas)
            RETURNING id INTO matriz_uuid;
        ELSE
            UPDATE ahp.matriz_criterios_premissas SET
                arquivo_conteudo=COALESCE(arquivo_conteudo,registro.arquivo_excel_matriz_criterios_premissas),
                arquivo_nome=COALESCE(arquivo_nome,registro.arquivo_matriz_nome)
            WHERE id=matriz_uuid;
        END IF;
        UPDATE ahp.comparacao_colaborativa_ambiente SET matriz_id=matriz_uuid
        WHERE id=registro.id;
    END LOOP;
END $$;

-- A referência antiga conserva somente o contexto específico de superfícies.
UPDATE ahp.comparacao_colaborativa_ambiente a
SET origem_legada=COALESCE(origem_legada,jsonb_build_object(
        'hierarquizacao_id',hierarquizacao_id,'hierarquizacao_codigo',hierarquizacao_codigo,
        'config_tipo',config_tipo,'config_id',config_id)),
    hierarquizacao_id=NULL, hierarquizacao_codigo=NULL,
    config_id=NULL,config_tipo=NULL,config_avulsa_id=NULL,config_portfolio_id=NULL
WHERE matriz_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(a.criterios) c WHERE c ? '_superficie_id'
);

CREATE INDEX IF NOT EXISTS comparacao_colaborativa_matriz_idx
    ON ahp.comparacao_colaborativa_ambiente(matriz_id);
CREATE INDEX IF NOT EXISTS hierarquizacao_matriz_idx
    ON hierarquizacao_demandas.hierarquizacao_portfolio(matriz_id);

UPDATE hierarquizacao_demandas.hierarquizacao_portfolio
SET dados_hierarquizacao=jsonb_set(dados_hierarquizacao,
    '{cabecalho_grupo,matriz_id}',to_jsonb(matriz_id::text),true)
WHERE matriz_id IS NOT NULL;

CREATE OR REPLACE FUNCTION ahp.proteger_matriz_criterios()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.conteudo IS DISTINCT FROM OLD.conteudo
       OR NEW.arquivo_conteudo IS DISTINCT FROM OLD.arquivo_conteudo THEN
        RAISE EXCEPTION 'A matriz é imutável. Cadastre uma nova matriz para alterar critérios ou premissas.';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS matriz_criterios_imutavel ON ahp.matriz_criterios_premissas;
CREATE TRIGGER matriz_criterios_imutavel BEFORE UPDATE ON ahp.matriz_criterios_premissas
    FOR EACH ROW EXECUTE FUNCTION ahp.proteger_matriz_criterios();

ALTER TABLE ahp.comparacao_colaborativa_ambiente ALTER COLUMN matriz_id SET NOT NULL;
CREATE OR REPLACE FUNCTION ahp.proteger_matriz_julgamento()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linhas jsonb;
BEGIN
    IF TG_OP='UPDATE' AND NEW.matriz_id IS DISTINCT FROM OLD.matriz_id THEN
        RAISE EXCEPTION 'A matriz do julgamento é imutável. Crie outro julgamento.';
    END IF;
    SELECT ahp.conteudo_matriz_comparavel(conteudo)->'linhas' INTO linhas
    FROM ahp.matriz_criterios_premissas WHERE id=NEW.matriz_id;
    IF linhas IS NULL OR linhas IS DISTINCT FROM NEW.criterios THEN
        RAISE EXCEPTION 'Os critérios e premissas do julgamento divergem da matriz associada.';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS julgamento_matriz_imutavel ON ahp.comparacao_colaborativa_ambiente;
CREATE TRIGGER julgamento_matriz_imutavel BEFORE INSERT OR UPDATE OF matriz_id,criterios
    ON ahp.comparacao_colaborativa_ambiente FOR EACH ROW
    EXECUTE FUNCTION ahp.proteger_matriz_julgamento();
GRANT SELECT, INSERT ON ahp.matriz_criterios_premissas TO slt_user;
COMMIT;
