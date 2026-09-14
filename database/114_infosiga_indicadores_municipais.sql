-- Opções municipais do InfoSiga para o gerador de camadas.
--
-- São publicados somente os numeradores comprováveis dos dois indicadores da
-- planilha AHP-DANI. As taxas não são calculadas sem as séries anuais dos
-- denominadores (população e frota de veículos).
BEGIN;

CREATE TABLE IF NOT EXISTS infosiga.indicador_municipal (
    cd_mun CHAR(7) NOT NULL REFERENCES base_municipal.municipio(cd_mun),
    ano SMALLINT NOT NULL,
    obitos_transito DOUBLE PRECISION NOT NULL CHECK (obitos_transito >= 0),
    sinistros_veiculos_carga DOUBLE PRECISION NOT NULL CHECK (sinistros_veiculos_carga >= 0),
    PRIMARY KEY (cd_mun, ano)
);

DELETE FROM infosiga.indicador_municipal WHERE ano BETWEEN 2015 AND 2025;

INSERT INTO infosiga.indicador_municipal
    (cd_mun, ano, obitos_transito, sinistros_veiculos_carga)
WITH agregado AS (
    SELECT COALESCE(l.cd_mun_espacial, l.cd_mun_fonte) AS cd_mun,
           s.ano_sinistro::smallint AS ano,
           sum(COALESCE(NULLIF(btrim(s.qtd_gravidade_fatal), ''), '0')::integer) AS obitos,
           count(*) FILTER (
               WHERE COALESCE(NULLIF(btrim(s.qtd_caminhao), ''), '0')::integer > 0
           ) AS sinistros_carga
      FROM infosiga.sinistro s
      JOIN infosiga.sinistro_localizacao l USING (id_sinistro)
     WHERE s.ano_sinistro::integer BETWEEN 2015 AND 2025
       AND COALESCE(l.cd_mun_espacial, l.cd_mun_fonte) IS NOT NULL
     GROUP BY 1, 2
), anos AS (
    SELECT generate_series(2015, 2025)::smallint AS ano
)
SELECT m.cd_mun, a.ano,
       COALESCE(g.obitos, 0)::double precision,
       COALESCE(g.sinistros_carga, 0)::double precision
  FROM base_municipal.municipio m
 CROSS JOIN anos a
  LEFT JOIN agregado g ON g.cd_mun = m.cd_mun AND g.ano = a.ano;

DELETE FROM base_municipal.atributo
 WHERE fonte = 'InfoSiga SP' OR campo LIKE 'infosiga_%';

DO $catalogo$
DECLARE
    v_ano SMALLINT;
    v_campo TEXT;
    v_id TEXT;
BEGIN
    FOR v_ano IN 2015..2025 LOOP
        v_campo := 'infosiga_obitos_transito_' || v_ano;
        v_id := substr(md5(v_campo), 1, 20);
        INSERT INTO base_municipal.atributo
            (id, fonte, ano, tema, campo, rotulo, unidade, url, detalhe, cobertura)
        VALUES (
            v_id, 'InfoSiga SP', v_ano, 'seguranca_viaria', v_campo,
            'Óbitos em sinistros de trânsito', 'Óbitos',
            'https://infosiga.detran.sp.gov.br/',
            jsonb_build_object(
                'definicao', 'Número de óbitos registrados nos sinistros de trânsito localizados no município.',
                'componente_do_indicador', 'Numerador da taxa anual de óbitos por 100.000 habitantes.',
                'nota', 'A taxa não foi calculada porque a base ainda não contém população anual compatível para todos os anos.',
                'granularidade', 'Município do evento; coordenada espacial preferida, município informado usado como alternativa.'
            ), 645
        );
        INSERT INTO base_municipal.observacao (atributo_id, cd_mun, valor)
        SELECT v_id, cd_mun, obitos_transito
          FROM infosiga.indicador_municipal WHERE ano = v_ano;

        v_campo := 'infosiga_sinistros_veiculos_carga_' || v_ano;
        v_id := substr(md5(v_campo), 1, 20);
        INSERT INTO base_municipal.atributo
            (id, fonte, ano, tema, campo, rotulo, unidade, url, detalhe, cobertura)
        VALUES (
            v_id, 'InfoSiga SP', v_ano, 'seguranca_viaria', v_campo,
            'Sinistros de trânsito com veículos de carga', 'Sinistros',
            'https://infosiga.detran.sp.gov.br/',
            jsonb_build_object(
                'definicao', 'Número de sinistros com pelo menos um caminhão registrado no município.',
                'componente_do_indicador', 'Numerador da taxa anual de sinistros com veículos de carga por 10.000 veículos.',
                'nota', 'Caminhão é a variável disponível usada como aproximação de veículo de carga. A taxa não foi calculada sem a frota municipal anual.',
                'granularidade', 'Município do evento; coordenada espacial preferida, município informado usado como alternativa.'
            ), 645
        );
        INSERT INTO base_municipal.observacao (atributo_id, cd_mun, valor)
        SELECT v_id, cd_mun, sinistros_veiculos_carga
          FROM infosiga.indicador_municipal WHERE ano = v_ano;
    END LOOP;
END
$catalogo$;

COMMENT ON TABLE infosiga.indicador_municipal IS
    'Numeradores municipais anuais dos indicadores de segurança viária pedidos pela planilha AHP-DANI.';

GRANT SELECT ON infosiga.indicador_municipal TO slt_user;

COMMIT;
