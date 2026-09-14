-- Corrige a carga inicial excessivamente ampla da RAIS 2024.
-- Preserva somente os dois indicadores municipais pedidos pela planilha AHP-DANI
-- e remove microdados e atributos categóricos que não pertencem ao escopo.
BEGIN;

CREATE SCHEMA IF NOT EXISTS rais;

CREATE TABLE IF NOT EXISTS rais.fonte_indicador_municipal (
    ano SMALLINT PRIMARY KEY,
    fonte_url TEXT NOT NULL,
    nome_arquivo TEXT NOT NULL,
    sha256 VARCHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    registros_lidos BIGINT NOT NULL CHECK (registros_lidos >= 0),
    importado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rais.indicador_municipal (
    cd_mun CHAR(7) NOT NULL REFERENCES base_municipal.municipio(cd_mun),
    ano SMALLINT NOT NULL,
    emprego_medio_formal DOUBLE PRECISION NOT NULL CHECK (emprego_medio_formal >= 0),
    salario_medio DOUBLE PRECISION CHECK (salario_medio >= 0),
    PRIMARY KEY (cd_mun, ano)
);

DO $correcao$
DECLARE
    v_cobertura INTEGER;
    v_fonte RECORD;
BEGIN
    IF to_regclass('rais.vinculo_2024_sp') IS NULL THEN
        RETURN;
    END IF;

    SELECT fonte_url, nome_arquivo, sha256, registros
      INTO v_fonte
      FROM rais.arquivo_importado
     WHERE ano = 2024 AND tipo = 'vinculo' AND uf = 'SP';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Catálogo da fonte RAIS 2024 não encontrado; nada foi removido.';
    END IF;

    EXECUTE $sql$
        INSERT INTO rais.indicador_municipal (
            cd_mun, ano, emprego_medio_formal, salario_medio
        )
        WITH valores AS (
            SELECT left(btrim(municipio_codigo), 6) AS cd_mun_6,
                   COALESCE(NULLIF(btrim(vl_rem_janeiro_sc), ''), '0')::double precision AS m01,
                   COALESCE(NULLIF(btrim(vl_rem_fevereiro_sc), ''), '0')::double precision AS m02,
                   COALESCE(NULLIF(btrim(vl_rem_marco_sc), ''), '0')::double precision AS m03,
                   COALESCE(NULLIF(btrim(vl_rem_abril_sc), ''), '0')::double precision AS m04,
                   COALESCE(NULLIF(btrim(vl_rem_maio_sc), ''), '0')::double precision AS m05,
                   COALESCE(NULLIF(btrim(vl_rem_junho_sc), ''), '0')::double precision AS m06,
                   COALESCE(NULLIF(btrim(vl_rem_julho_sc), ''), '0')::double precision AS m07,
                   COALESCE(NULLIF(btrim(vl_rem_agosto_sc), ''), '0')::double precision AS m08,
                   COALESCE(NULLIF(btrim(vl_rem_setembro_sc), ''), '0')::double precision AS m09,
                   COALESCE(NULLIF(btrim(vl_rem_outubro_sc), ''), '0')::double precision AS m10,
                   COALESCE(NULLIF(btrim(vl_rem_novembro_sc), ''), '0')::double precision AS m11,
                   COALESCE(NULLIF(btrim(vl_rem_dezembro_nom), ''), '0')::double precision AS m12
              FROM rais.vinculo_2024_sp
        ), agregado AS (
            SELECT cd_mun_6,
                   sum((m01 > 0)::int + (m02 > 0)::int + (m03 > 0)::int +
                       (m04 > 0)::int + (m05 > 0)::int + (m06 > 0)::int +
                       (m07 > 0)::int + (m08 > 0)::int + (m09 > 0)::int +
                       (m10 > 0)::int + (m11 > 0)::int + (m12 > 0)::int) AS vinculos_mes,
                   sum(greatest(m01, 0) + greatest(m02, 0) + greatest(m03, 0) +
                       greatest(m04, 0) + greatest(m05, 0) + greatest(m06, 0) +
                       greatest(m07, 0) + greatest(m08, 0) + greatest(m09, 0) +
                       greatest(m10, 0) + greatest(m11, 0) + greatest(m12, 0)) AS remuneracao
              FROM valores
             GROUP BY cd_mun_6
        )
        SELECT m.cd_mun, 2024,
               COALESCE(a.vinculos_mes, 0)::double precision / 12.0,
               a.remuneracao / NULLIF(a.vinculos_mes, 0)
          FROM base_municipal.municipio m
          LEFT JOIN agregado a ON a.cd_mun_6 = left(m.cd_mun, 6)
        ON CONFLICT (cd_mun, ano) DO UPDATE SET
            emprego_medio_formal = EXCLUDED.emprego_medio_formal,
            salario_medio = EXCLUDED.salario_medio
    $sql$;

    SELECT count(*) INTO v_cobertura
      FROM rais.indicador_municipal
     WHERE ano = 2024
       AND emprego_medio_formal IS NOT NULL
       AND salario_medio IS NOT NULL;

    IF v_cobertura <> 645 THEN
        RAISE EXCEPTION 'Cobertura RAIS inválida: % municípios; esperado 645. Nada foi removido.', v_cobertura;
    END IF;

    INSERT INTO rais.fonte_indicador_municipal
        (ano, fonte_url, nome_arquivo, sha256, registros_lidos, importado_em)
    VALUES
        (2024, v_fonte.fonte_url, v_fonte.nome_arquivo, v_fonte.sha256,
         v_fonte.registros, now())
    ON CONFLICT (ano) DO UPDATE SET
        fonte_url = EXCLUDED.fonte_url,
        nome_arquivo = EXCLUDED.nome_arquivo,
        sha256 = EXCLUDED.sha256,
        registros_lidos = EXCLUDED.registros_lidos,
        importado_em = now();

    DELETE FROM base_municipal.atributo
     WHERE fonte = 'MTE / RAIS' OR campo LIKE 'rais_%';

    INSERT INTO base_municipal.atributo
        (id, fonte, ano, tema, campo, rotulo, unidade, url, detalhe, cobertura)
    VALUES
        ('f0b0f20cbea132be1f12', 'MTE / RAIS', 2024, 'economico_produtivo',
         'rais_emprego_medio_formal_2024', 'Emprego médio formal',
         'Vínculos formais (média mensal)', v_fonte.fonte_url,
         jsonb_build_object(
             'definicao', 'Média mensal de vínculos formais com remuneração positiva no município.',
             'equacao', 'Soma dos vínculos mensais / 12',
             'granularidade', 'Município do estabelecimento',
             'arquivo', v_fonte.nome_arquivo, 'sha256', v_fonte.sha256), 645),
        ('72898c56a1bffd3c0fca', 'MTE / RAIS', 2024, 'economico_produtivo',
         'rais_salario_medio_2024', 'Salário médio', 'R$ correntes', v_fonte.fonte_url,
         jsonb_build_object(
             'definicao', 'Remuneração média mensal dos vínculos formais no município.',
             'equacao', 'Soma das remunerações mensais / número de vínculos-mês remunerados',
             'granularidade', 'Município do estabelecimento',
             'arquivo', v_fonte.nome_arquivo, 'sha256', v_fonte.sha256), 645);

    INSERT INTO base_municipal.observacao (atributo_id, cd_mun, valor)
    SELECT 'f0b0f20cbea132be1f12', cd_mun, emprego_medio_formal
      FROM rais.indicador_municipal WHERE ano = 2024
    UNION ALL
    SELECT '72898c56a1bffd3c0fca', cd_mun, salario_medio
      FROM rais.indicador_municipal WHERE ano = 2024;

    EXECUTE 'DROP TABLE rais.vinculo_2024_sp';
    IF to_regclass('rais.estabelecimento_2024_sp') IS NOT NULL THEN
        EXECUTE 'DROP TABLE rais.estabelecimento_2024_sp';
    END IF;
    DROP TABLE rais.arquivo_importado;
END
$correcao$;

COMMENT ON SCHEMA rais IS
    'Resultados municipais da RAIS necessários aos indicadores da planilha AHP-DANI.';
COMMENT ON TABLE rais.indicador_municipal IS
    'Uma linha por município e ano, somente com emprego médio formal e salário médio.';

GRANT USAGE ON SCHEMA rais TO slt_user;
GRANT SELECT ON rais.fonte_indicador_municipal, rais.indicador_municipal TO slt_user;

COMMIT;
