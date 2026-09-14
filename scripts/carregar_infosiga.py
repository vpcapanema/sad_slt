"""Carrega InfoSiga bruto até 2025 e gera a localização espacial separada."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import tempfile
import unicodedata
import zipfile
from pathlib import Path

import geopandas as gpd
from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection


ANO_MAXIMO = 2025
CHUNK = 8 * 1024 * 1024
CODIFICACAO = "LATIN1"
DELIMITADOR = ";"

COLUNAS = {
    "sinistro": (
        "id_sinistro", "tipo_registro", "data_sinistro", "ano_sinistro",
        "mes_sinistro", "dia_sinistro", "hora_sinistro", "ano_mes_sinistro",
        "dia_da_semana", "turno", "logradouro", "numero_logradouro", "tipo_via",
        "tipo_local", "latitude", "longitude", "cod_ibge", "municipio",
        "regiao_administrativa", "administracao", "conservacao", "circunscricao",
        "tp_sinistro_primario", "qtd_pedestre", "qtd_bicicleta", "qtd_motocicleta",
        "qtd_automovel", "qtd_onibus", "qtd_caminhao", "qtd_veic_outros",
        "qtd_veic_nao_disponivel", "qtd_gravidade_fatal", "qtd_gravidade_grave",
        "qtd_gravidade_leve", "qtd_gravidade_ileso",
        "qtd_gravidade_nao_disponivel", "tp_sinistro_atropelamento",
        "tp_sinistro_colisao_frontal", "tp_sinistro_colisao_traseira",
        "tp_sinistro_colisao_lateral", "tp_sinistro_colisao_transversal",
        "tp_sinistro_colisao_outros", "tp_sinistro_choque", "tp_sinistro_capotamento",
        "tp_sinistro_engavetamento", "tp_sinistro_tombamento", "tp_sinistro_outros",
        "tp_sinistro_nao_disponivel",
    ),
    "pessoa": (
        "id_sinistro", "id_veiculo", "cod_ibge", "municipio",
        "regiao_administrativa", "tipo_via", "tipo_veiculo_vitima", "sexo", "idade",
        "gravidade_lesao", "tipo_de_vitima", "faixa_etaria_demografica",
        "faixa_etaria_legal", "profissao", "grau_de_instrucao", "nacionalidade",
        "data_sinistro", "ano_sinistro", "mes_sinistro", "dia_sinistro",
        "ano_mes_sinistro", "data_obito", "ano_obito", "mes_obito", "dia_obito",
        "ano_mes_obito", "local_obito", "local_via", "tempo_sinistro_obito",
    ),
    "veiculo": (
        "id_sinistro", "id_veiculo", "marca_modelo", "ano_fab", "ano_modelo",
        "cor_veiculo", "tipo_veiculo", "data_sinistro", "ano_sinistro",
        "mes_sinistro", "dia_sinistro", "ano_mes_sinistro",
    ),
}

ARQUIVOS = {
    "sinistro": ("sinistros_2015-2021.csv", "sinistros_2022-2026.csv"),
    "pessoa": ("pessoas_2015-2021.csv", "pessoas_2022-2026.csv"),
    "veiculo": ("veiculos_2015-2021.csv", "veiculos_2022-2026.csv"),
}

TABELAS = {"sinistro": "sinistro", "pessoa": "pessoa", "veiculo": "veiculo"}
ALIAS_MUNICIPIO = {"SAO LUIS DO PARAITINGA": "SAO LUIZ DO PARAITINGA"}


def sha256_arquivo(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while bloco := stream.read(CHUNK):
            digest.update(bloco)
    return digest.hexdigest()


def normalizar_nome(valor: str) -> str:
    texto = unicodedata.normalize("NFKD", str(valor).upper())
    sem_acentos = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"[^A-Z0-9]+", " ", sem_acentos).strip()


def numero_trecho(valor: object) -> str:
    return str(round(float(valor), 2))


def trecho_id(registro) -> str:
    return (
        f"{str(registro.Subtrecho).strip()} | {str(registro.Rodovia).strip().upper()} "
        f"km {numero_trecho(registro.KmInicial)}-{numero_trecho(registro.KmFinal)}"
    )


def extrair_zip_seguro(arquivo: Path, destino: Path) -> None:
    destino = destino.resolve()
    with zipfile.ZipFile(arquivo) as pacote:
        for membro in pacote.infolist():
            alvo = (destino / membro.filename).resolve()
            if destino not in alvo.parents and alvo != destino:
                raise ValueError(f"Caminho inseguro no ZIP: {membro.filename}")
        pacote.extractall(destino)


def ler_cabecalho(path: Path) -> list[str]:
    with path.open("r", encoding="latin-1", newline="") as stream:
        return [valor.lstrip("\ufeff").strip() for valor in next(csv.reader(stream, delimiter=DELIMITADOR))]


def validar_esquema() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('infosiga.sinistro') AS tabela")
            if cur.fetchone()["tabela"] is None:
                raise RuntimeError("Aplique database/112_infosiga_microdados_localizacao.sql antes da carga.")


def limpar_carga() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                TRUNCATE infosiga.sinistro_localizacao, infosiga.pessoa,
                    infosiga.veiculo, infosiga.sinistro,
                    infosiga.trecho_rodoviario, infosiga.arquivo_importado
                RESTART IDENTITY
                """
            )


def copiar_csv(cur, path: Path, staging: str, colunas: tuple[str, ...]) -> None:
    comando = sql.SQL(
        "COPY {}.{} ({}) FROM STDIN WITH "
        "(FORMAT CSV, HEADER TRUE, DELIMITER ';', QUOTE '\"', ESCAPE '\"', ENCODING 'LATIN1')"
    ).format(
        sql.Identifier("infosiga"),
        sql.Identifier(staging),
        sql.SQL(", ").join(map(sql.Identifier, colunas)),
    )
    with path.open("rb") as origem, cur.copy(comando) as copy:
        while bloco := origem.read(CHUNK):
            copy.write(bloco)


def registrar_arquivo(
    cur,
    *,
    entidade: str,
    arquivo: Path,
    pacote: Path,
    sha_pacote: str,
    cabecalho: list[str],
    registros_arquivo: int,
    registros_importados: int,
    ano_minimo: int | None,
    ano_maximo: int | None,
) -> None:
    cur.execute(
        """
        INSERT INTO infosiga.arquivo_importado (
            nome_arquivo, entidade, pacote_origem, sha256_pacote,
            sha256_arquivo, tamanho_bytes, codificacao, delimitador,
            cabecalho_original, ano_minimo, ano_maximo, ano_maximo_carga,
            registros_arquivo, registros_importados, registros_excluidos, importado_em
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, now()
        )
        ON CONFLICT (nome_arquivo) DO UPDATE SET
            entidade = EXCLUDED.entidade,
            pacote_origem = EXCLUDED.pacote_origem,
            sha256_pacote = EXCLUDED.sha256_pacote,
            sha256_arquivo = EXCLUDED.sha256_arquivo,
            tamanho_bytes = EXCLUDED.tamanho_bytes,
            codificacao = EXCLUDED.codificacao,
            delimitador = EXCLUDED.delimitador,
            cabecalho_original = EXCLUDED.cabecalho_original,
            ano_minimo = EXCLUDED.ano_minimo,
            ano_maximo = EXCLUDED.ano_maximo,
            ano_maximo_carga = EXCLUDED.ano_maximo_carga,
            registros_arquivo = EXCLUDED.registros_arquivo,
            registros_importados = EXCLUDED.registros_importados,
            registros_excluidos = EXCLUDED.registros_excluidos,
            importado_em = now()
        """,
        (
            arquivo.name, entidade, pacote.name, sha_pacote,
            sha256_arquivo(arquivo), arquivo.stat().st_size, CODIFICACAO,
            DELIMITADOR, Jsonb(cabecalho), ano_minimo, ano_maximo, ANO_MAXIMO,
            registros_arquivo, registros_importados,
            registros_arquivo - registros_importados,
        ),
    )


def carregar_csv(entidade: str, arquivo: Path, pacote: Path, sha_pacote: str) -> dict[str, object]:
    colunas = COLUNAS[entidade]
    cabecalho = ler_cabecalho(arquivo)
    if cabecalho != list(colunas):
        raise ValueError(
            f"Cabeçalho inesperado em {arquivo.name}. "
            f"Esperado={list(colunas)!r}; recebido={cabecalho!r}"
        )
    tabela = TABELAS[entidade]
    staging = f"_{tabela}_carga"
    definicoes = sql.SQL(", ").join(
        sql.SQL("{} TEXT").format(sql.Identifier(coluna)) for coluna in colunas
    )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql.SQL("DROP TABLE IF EXISTS {}.{}").format(
                sql.Identifier("infosiga"), sql.Identifier(staging)))
            cur.execute(sql.SQL(
                "CREATE UNLOGGED TABLE {}.{} "
                "(linha_arquivo BIGINT GENERATED ALWAYS AS IDENTITY, {})"
            ).format(sql.Identifier("infosiga"), sql.Identifier(staging), definicoes))
            copiar_csv(cur, arquivo, staging, colunas)
            cur.execute(sql.SQL(
                "SELECT count(*) AS total, "
                "count(*) FILTER (WHERE ano_sinistro ~ '^[0-9]{{4}}$' "
                "AND ano_sinistro::integer <= {}) AS importados, "
                "min(ano_sinistro::integer) FILTER (WHERE ano_sinistro ~ '^[0-9]{{4}}$' "
                "AND ano_sinistro::integer <= {}) AS ano_minimo, "
                "max(ano_sinistro::integer) FILTER (WHERE ano_sinistro ~ '^[0-9]{{4}}$' "
                "AND ano_sinistro::integer <= {}) AS ano_maximo "
                "FROM {}.{}"
            ).format(
                sql.Literal(ANO_MAXIMO), sql.Literal(ANO_MAXIMO), sql.Literal(ANO_MAXIMO),
                sql.Identifier("infosiga"), sql.Identifier(staging),
            ))
            contagem = cur.fetchone()
            registrar_arquivo(
                cur, entidade=entidade, arquivo=arquivo, pacote=pacote,
                sha_pacote=sha_pacote, cabecalho=cabecalho,
                registros_arquivo=int(contagem["total"]),
                registros_importados=int(contagem["importados"]),
                ano_minimo=contagem["ano_minimo"], ano_maximo=contagem["ano_maximo"],
            )
            destinos = ("arquivo_origem", "linha_arquivo", *colunas)
            cur.execute(sql.SQL(
                "INSERT INTO {}.{} ({}) "
                "SELECT {}, linha_arquivo, {} FROM {}.{} "
                "WHERE ano_sinistro ~ '^[0-9]{{4}}$' AND ano_sinistro::integer <= {}"
            ).format(
                sql.Identifier("infosiga"), sql.Identifier(tabela),
                sql.SQL(", ").join(map(sql.Identifier, destinos)),
                sql.Literal(arquivo.name),
                sql.SQL(", ").join(map(sql.Identifier, colunas)),
                sql.Identifier("infosiga"), sql.Identifier(staging),
                sql.Literal(ANO_MAXIMO),
            ))
            inseridos = int(cur.rowcount)
            cur.execute(sql.SQL("DROP TABLE {}.{}").format(
                sql.Identifier("infosiga"), sql.Identifier(staging)))
    return {
        "entidade": entidade,
        "arquivo": arquivo.name,
        "registros_arquivo": int(contagem["total"]),
        "registros_importados": inseridos,
        "registros_excluidos": int(contagem["total"]) - inseridos,
        "ano_minimo": contagem["ano_minimo"],
        "ano_maximo": contagem["ano_maximo"],
    }


def carregar_trechos(malha: Path, pacote: Path, sha_pacote: str) -> dict[str, object]:
    gdf = gpd.read_file(malha)
    if gdf.crs is None or gdf.crs.to_epsg() != 5880:
        raise ValueError(f"CRS inesperado da malha: {gdf.crs}; esperado EPSG:5880.")
    obrigatorias = {
        "Subtrecho", "Rodovia", "Municipio", "KmInicial", "KmFinal",
        "Extensao", "Administra", "Jurisdicao", "geometry",
    }
    ausentes = obrigatorias - set(gdf.columns)
    if ausentes:
        raise ValueError(f"Campos ausentes na malha: {sorted(ausentes)}")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT cd_mun, nm_mun FROM base_municipal.municipio")
            mapa_municipios = {
                normalizar_nome(row["nm_mun"]): row["cd_mun"] for row in cur.fetchall()
            }
            cur.execute("DROP TABLE IF EXISTS infosiga._trecho_carga")
            cur.execute(
                """
                CREATE UNLOGGED TABLE infosiga._trecho_carga (
                    trecho_id TEXT, subtrecho TEXT, rodovia TEXT,
                    municipio_fonte TEXT, cd_mun CHAR(7),
                    km_inicial DOUBLE PRECISION, km_final DOUBLE PRECISION,
                    extensao_km DOUBLE PRECISION, administracao TEXT,
                    jurisdicao TEXT, geom_wkt TEXT
                )
                """
            )
            registros: list[tuple[object, ...]] = []
            nao_mapeados: set[str] = set()
            for row in gdf.itertuples(index=False):
                nome = normalizar_nome(row.Municipio)
                nome = ALIAS_MUNICIPIO.get(nome, nome)
                codigo = mapa_municipios.get(nome)
                if not codigo:
                    nao_mapeados.add(str(row.Municipio))
                    continue
                registros.append((
                    trecho_id(row), str(row.Subtrecho).strip(),
                    str(row.Rodovia).strip().upper(), str(row.Municipio).strip(), codigo,
                    float(row.KmInicial), float(row.KmFinal),
                    None if row.Extensao is None else float(row.Extensao),
                    None if row.Administra is None else str(row.Administra).strip(),
                    None if row.Jurisdicao is None else str(row.Jurisdicao).strip(),
                    row.geometry.wkt,
                ))
            if nao_mapeados:
                raise ValueError(f"Municípios da malha sem código IBGE: {sorted(nao_mapeados)}")
            if len({row[0] for row in registros}) != len(registros):
                raise ValueError("A malha produziu trecho_id duplicado.")
            with cur.copy(
                "COPY infosiga._trecho_carga "
                "(trecho_id, subtrecho, rodovia, municipio_fonte, cd_mun, "
                "km_inicial, km_final, extensao_km, administracao, jurisdicao, geom_wkt) "
                "FROM STDIN"
            ) as copy:
                for registro in registros:
                    copy.write_row(registro)
            cabecalho = [coluna for coluna in gdf.columns if coluna != "geometry"] + ["geometry"]
            registrar_arquivo(
                cur, entidade="trecho", arquivo=malha, pacote=pacote,
                sha_pacote=sha_pacote, cabecalho=cabecalho,
                registros_arquivo=len(registros), registros_importados=len(registros),
                ano_minimo=None, ano_maximo=None,
            )
            cur.execute(
                """
                INSERT INTO infosiga.trecho_rodoviario (
                    trecho_id, arquivo_origem, subtrecho, rodovia,
                    municipio_fonte, cd_mun, km_inicial, km_final, extensao_km,
                    administracao, jurisdicao, geom
                )
                SELECT trecho_id, %s, subtrecho, rodovia,
                    municipio_fonte, cd_mun, km_inicial, km_final, extensao_km,
                    administracao, jurisdicao,
                    ST_SetSRID(ST_GeomFromText(geom_wkt), 5880)::geometry(GeometryZ, 5880)
                FROM infosiga._trecho_carga
                """,
                (malha.name,),
            )
            inseridos = int(cur.rowcount)
            cur.execute("DROP TABLE infosiga._trecho_carga")
    return {"entidade": "trecho", "arquivo": malha.name, "registros_importados": inseridos}


SQL_LOCALIZACAO = """
WITH coordenadas AS (
    SELECT
        s.id_sinistro,
        s.ano_sinistro::smallint AS ano_sinistro,
        btrim(s.cod_ibge) AS cod_ibge,
        upper(btrim(s.tipo_via)) LIKE '%%RODOVIA%%'
            OR upper(btrim(s.tipo_via)) LIKE '%%ESTRADA%%' AS eh_rodovia,
        CASE WHEN btrim(s.latitude) ~ '^-?[0-9]+([,.][0-9]+)?$'
            THEN replace(btrim(s.latitude), ',', '.')::double precision END AS latitude,
        CASE WHEN btrim(s.longitude) ~ '^-?[0-9]+([,.][0-9]+)?$'
            THEN replace(btrim(s.longitude), ',', '.')::double precision END AS longitude
    FROM infosiga.sinistro s
    WHERE s.ano_sinistro = %s
),
pontos AS (
    SELECT c.*,
        CASE WHEN c.latitude BETWEEN -25.5 AND -19.5
                  AND c.longitude BETWEEN -53.5 AND -44.0
            THEN ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4674)
        END AS geom
    FROM coordenadas c
),
projetados AS (
    SELECT p.*,
        CASE WHEN p.geom IS NOT NULL THEN ST_Transform(p.geom, 5880) END AS geom_5880
    FROM pontos p
)
INSERT INTO infosiga.sinistro_localizacao (
    id_sinistro, ano_sinistro, cd_mun_fonte, cd_mun_espacial,
    cd_mun_trecho, municipio_divergente, trecho_id, rodovia,
    distancia_rodovia_m, metodo_rodovia, status_coordenada,
    status_municipio, status_rodovia, geom
)
SELECT
    p.id_sinistro,
    p.ano_sinistro,
    CASE WHEN p.cod_ibge ~ '^[0-9]{7}$' THEN p.cod_ibge::char(7) END,
    m.cd_mun,
    t.cd_mun,
    m.cd_mun IS NOT NULL AND p.cod_ibge ~ '^[0-9]{7}$'
        AND m.cd_mun <> p.cod_ibge::char(7),
    t.trecho_id,
    t.rodovia,
    t.distancia_m,
    CASE WHEN t.trecho_id IS NOT NULL THEN 'vizinho_mais_proximo_ate_300m' END,
    CASE
        WHEN p.latitude IS NULL OR p.longitude IS NULL THEN 'ausente_ou_invalida'
        WHEN p.latitude = 0 AND p.longitude = 0 THEN 'placeholder_zero'
        WHEN p.geom IS NULL THEN 'fora_limite_sp'
        ELSE 'valida'
    END,
    CASE
        WHEN p.geom IS NULL THEN 'sem_coordenada_valida'
        WHEN m.cd_mun IS NULL THEN 'fora_malha_municipal'
        WHEN p.cod_ibge ~ '^[0-9]{7}$' AND m.cd_mun <> p.cod_ibge::char(7)
            THEN 'divergente_fonte'
        ELSE 'associado'
    END,
    CASE
        WHEN NOT p.eh_rodovia THEN 'nao_rodoviario'
        WHEN p.geom IS NULL THEN 'sem_coordenada_valida'
        WHEN t.trecho_id IS NULL THEN 'fora_tolerancia_300m'
        ELSE 'associado'
    END,
    p.geom
FROM projetados p
LEFT JOIN LATERAL (
    SELECT mun.cd_mun
    FROM base_municipal.municipio mun
    WHERE p.geom IS NOT NULL AND ST_Covers(mun.geom, p.geom)
    ORDER BY mun.cd_mun
    LIMIT 1
) m ON TRUE
LEFT JOIN LATERAL (
    SELECT tr.trecho_id, tr.rodovia, tr.cd_mun,
        ST_Distance(tr.geom, p.geom_5880) AS distancia_m
    FROM infosiga.trecho_rodoviario tr
    WHERE p.eh_rodovia AND p.geom_5880 IS NOT NULL
      AND ST_DWithin(tr.geom, p.geom_5880, 300)
    ORDER BY tr.geom <-> p.geom_5880, tr.trecho_id
    LIMIT 1
) t ON TRUE
"""


def gerar_localizacao() -> list[dict[str, object]]:
    saida = []
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT ano_sinistro::smallint AS ano "
                "FROM infosiga.sinistro ORDER BY ano"
            )
            anos = [int(row["ano"]) for row in cur.fetchall()]
    for ano in anos:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM infosiga.sinistro_localizacao WHERE ano_sinistro = %s", (ano,))
                cur.execute(SQL_LOCALIZACAO, (str(ano),))
                registros = int(cur.rowcount)
                cur.execute(
                    """
                    SELECT count(*) FILTER (WHERE status_coordenada = 'valida') AS coordenadas_validas,
                           count(*) FILTER (WHERE status_municipio = 'divergente_fonte') AS divergencias,
                           count(*) FILTER (WHERE status_rodovia = 'associado') AS rodovias_associadas,
                           count(*) FILTER (WHERE status_rodovia = 'fora_tolerancia_300m') AS fora_tolerancia
                    FROM infosiga.sinistro_localizacao
                    WHERE ano_sinistro = %s
                    """,
                    (ano,),
                )
                resumo = dict(cur.fetchone())
                resumo.update({"ano": ano, "registros": registros})
                saida.append(resumo)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("ANALYZE infosiga.sinistro_localizacao")
    return saida


def executar(dados_zip: Path, malha_zip: Path, substituir: bool) -> dict[str, object]:
    dados_zip = dados_zip.resolve(strict=True)
    malha_zip = malha_zip.resolve(strict=True)
    validar_esquema()
    if not substituir:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT EXISTS (SELECT 1 FROM infosiga.arquivo_importado) AS existe")
                if cur.fetchone()["existe"]:
                    raise ValueError("O InfoSiga já possui carga; use --substituir para recarregar.")
    limpar_carga()
    sha_dados = sha256_arquivo(dados_zip)
    sha_malha = sha256_arquivo(malha_zip)
    resultados: list[dict[str, object]] = []
    with tempfile.TemporaryDirectory(prefix="infosiga_") as tmp:
        pasta = Path(tmp)
        dados = pasta / "dados"
        malha_dir = pasta / "malha"
        dados.mkdir()
        malha_dir.mkdir()
        extrair_zip_seguro(dados_zip, dados)
        extrair_zip_seguro(malha_zip, malha_dir)
        for entidade in ("sinistro", "pessoa", "veiculo"):
            for nome in ARQUIVOS[entidade]:
                resultados.append(carregar_csv(entidade, dados / nome, dados_zip, sha_dados))
        resultados.append(carregar_trechos(
            malha_dir / "MALHA_RODOVIARIA.shp", malha_zip, sha_malha,
        ))
    localizacao = gerar_localizacao()
    return {
        "ano_maximo": ANO_MAXIMO,
        "arquivos": resultados,
        "localizacao_por_ano": localizacao,
    }


def argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dados-zip", required=True, type=Path)
    parser.add_argument("--malha-zip", required=True, type=Path)
    parser.add_argument("--substituir", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = argumentos()
    print(json.dumps(
        executar(args.dados_zip, args.malha_zip, args.substituir),
        ensure_ascii=False, indent=2, default=str,
    ))


if __name__ == "__main__":
    main()
