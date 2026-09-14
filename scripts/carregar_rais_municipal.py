"""Calcula e publica os dois indicadores municipais da RAIS para um ano."""
from __future__ import annotations

import argparse
import csv
import hashlib
import sys
import tempfile
from pathlib import Path

import py7zr
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api.db.connection import get_connection


FONTE = "MTE / RAIS"
ANOS_SUPORTADOS = range(2022, 2025)
COLUNA_MUNICIPIO = "Município - Código"
COLUNAS_REMUNERACAO = (
    "Vl Rem Janeiro SC", "Vl Rem Fevereiro SC", "Vl Rem Março SC",
    "Vl Rem Abril SC", "Vl Rem Maio SC", "Vl Rem Junho SC",
    "Vl Rem Julho SC", "Vl Rem Agosto SC", "Vl Rem Setembro SC",
    "Vl Rem Outubro SC", "Vl Rem Novembro SC", "Vl Rem Dezembro Nom",
)
ALIAS_COLUNAS = {
    COLUNA_MUNICIPIO: ("Município",),
    "Vl Rem Dezembro Nom": ("Vl Remun Dezembro Nom",),
}
CHUNK = 8 * 1024 * 1024


def sha256_arquivo(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while bloco := stream.read(CHUNK):
            digest.update(bloco)
    return digest.hexdigest()


def numero_positivo(valor: str | None) -> float | None:
    if valor is None or not valor.strip():
        return None
    try:
        numero = float(valor.strip().replace(",", "."))
    except ValueError:
        return None
    return numero if numero > 0 else None


def acumular(linha: dict[str, str], totais: dict[str, list[float]]) -> bool:
    """Acumula vínculos-mês e remuneração pelo município do estabelecimento."""
    return acumular_valores(
        linha.get(COLUNA_MUNICIPIO),
        (linha.get(coluna) for coluna in COLUNAS_REMUNERACAO),
        totais,
    )


def acumular_valores(codigo_bruto: str | None, valores_brutos, totais: dict[str, list[float]]) -> bool:
    codigo = (codigo_bruto or "").strip()
    if len(codigo) < 6 or not codigo[:6].isdigit() or not codigo.startswith("35"):
        return False
    valores = [numero_positivo(valor) for valor in valores_brutos]
    positivos = [valor for valor in valores if valor is not None]
    total = totais.setdefault(codigo[:6], [0.0, 0.0])
    total[0] += len(positivos)
    total[1] += sum(positivos)
    return True


def localizar_arquivo_dados(arquivo: Path, pasta: Path) -> Path:
    with py7zr.SevenZipFile(arquivo, "r") as compactado:
        membros = [item for item in compactado.list() if not item.is_directory]
        candidatos = [item for item in membros if Path(item.filename).suffix.lower() in {".txt", ".csv", ".comt"}]
        if len(candidatos) != 1:
            raise ValueError(f"Esperado um arquivo de dados no 7z; encontrados: {[x.filename for x in candidatos]}")
        nome = candidatos[0].filename
        compactado.extract(path=pasta, targets=[nome])
    extraido = pasta / nome
    if not extraido.is_file():
        encontrados = list(pasta.rglob(Path(nome).name))
        if len(encontrados) != 1:
            raise FileNotFoundError(f"Arquivo interno não localizado: {nome}")
        extraido = encontrados[0]
    return extraido


def ler_indicadores(arquivo: Path, codificacao: str = "LATIN1") -> tuple[dict[str, list[float]], int]:
    totais: dict[str, list[float]] = {}
    registros = 0
    with tempfile.TemporaryDirectory(prefix="rais_indicadores_", dir=arquivo.parent) as tmp:
        extraido = localizar_arquivo_dados(arquivo, Path(tmp))
        with extraido.open("r", encoding=codificacao, newline="") as stream:
            cabecalho = stream.readline()
            stream.seek(0)
            delimitador = ";" if cabecalho.count(";") > cabecalho.count(",") else ","
            leitor = csv.reader(stream, delimiter=delimitador)
            cabecalhos = next(leitor, [])
            disponiveis = set(cabecalhos)
            colunas = {}
            for coluna in (COLUNA_MUNICIPIO, *COLUNAS_REMUNERACAO):
                colunas[coluna] = next(
                    (candidata for candidata in (coluna, *ALIAS_COLUNAS.get(coluna, ()))
                     if candidata in disponiveis),
                    None,
                )
            ausentes = {coluna for coluna, encontrada in colunas.items() if encontrada is None}
            if ausentes:
                raise ValueError(f"Colunas necessárias ausentes: {sorted(ausentes)}")
            indices = {coluna: cabecalhos.index(encontrada) for coluna, encontrada in colunas.items()}
            for linha in leitor:
                registros += 1
                acumular_valores(
                    linha[indices[COLUNA_MUNICIPIO]],
                    (linha[indices[coluna]] for coluna in COLUNAS_REMUNERACAO),
                    totais,
                )
                if registros % 1_000_000 == 0:
                    print(f"{registros:,} registros processados", file=sys.stderr, flush=True)
    return totais, registros


def identificadores(ano: int) -> dict[str, str]:
    if ano not in ANOS_SUPORTADOS:
        raise ValueError(f"Ano RAIS não suportado: {ano}. Use um ano entre 2022 e 2024.")
    campos = {
        "emprego": f"rais_emprego_medio_formal_{ano}",
        "salario": f"rais_salario_medio_{ano}",
    }
    return {**campos, "id_emprego": hashlib.sha1(campos["emprego"].encode()).hexdigest()[:20],
            "id_salario": hashlib.sha1(campos["salario"].encode()).hexdigest()[:20]}


def publicar(arquivo: Path, fonte_url: str, ano: int, codificacao: str = "LATIN1") -> dict[str, object]:
    ids = identificadores(ano)
    arquivo = arquivo.resolve(strict=True)
    totais, registros = ler_indicadores(arquivo, codificacao)
    checksum = sha256_arquivo(arquivo)

    with get_connection() as conn:
        municipios = [r["cd_mun"] for r in conn.execute(
            "SELECT cd_mun FROM base_municipal.municipio ORDER BY cd_mun"
        )]
        if len(municipios) != 645:
            raise ValueError(f"A base municipal possui {len(municipios)} municípios; esperado 645.")
        linhas = []
        for cd_mun in municipios:
            vinculos_mes, remuneracao = totais.get(cd_mun[:6], (0.0, 0.0))
            emprego = vinculos_mes / 12.0
            salario = remuneracao / vinculos_mes if vinculos_mes else None
            linhas.append((cd_mun, ano, emprego, salario))
        if any(salario is None for _, _, _, salario in linhas):
            raise ValueError("Há município sem remuneração válida; nada foi gravado.")

        with conn.cursor() as cursor:
            cursor.executemany(
                """INSERT INTO rais.indicador_municipal
                   (cd_mun,ano,emprego_medio_formal,salario_medio)
                   VALUES (%s,%s,%s,%s)
                   ON CONFLICT (cd_mun,ano) DO UPDATE SET
                     emprego_medio_formal=EXCLUDED.emprego_medio_formal,
                     salario_medio=EXCLUDED.salario_medio""",
                linhas,
            )
        conn.execute(
            """INSERT INTO rais.fonte_indicador_municipal
               (ano,fonte_url,nome_arquivo,sha256,registros_lidos,importado_em)
               VALUES (%s,%s,%s,%s,%s,now())
               ON CONFLICT (ano) DO UPDATE SET fonte_url=EXCLUDED.fonte_url,
                 nome_arquivo=EXCLUDED.nome_arquivo,sha256=EXCLUDED.sha256,
                 registros_lidos=EXCLUDED.registros_lidos,importado_em=now()""",
            (ano, fonte_url, arquivo.name, checksum, registros),
        )
        conn.execute(
            "DELETE FROM base_municipal.atributo WHERE (fonte=%s AND ano=%s) OR campo IN (%s,%s)",
            (FONTE, ano, ids["emprego"], ids["salario"]),
        )
        metadados = (
            (ids["id_emprego"], ids["emprego"], "Emprego médio formal", "Vínculos formais (média mensal)",
             "Soma dos vínculos com remuneração positiva em cada mês dividida por 12."),
            (ids["id_salario"], ids["salario"], "Salário médio", "R$ correntes",
             "Soma das remunerações mensais positivas dividida pelo número de vínculos-mês remunerados."),
        )
        for identificador, campo, rotulo, unidade, equacao in metadados:
            conn.execute(
                """INSERT INTO base_municipal.atributo
                   (id,fonte,ano,tema,campo,rotulo,unidade,url,detalhe,cobertura)
                   VALUES (%s,%s,%s,'economico_produtivo',%s,%s,%s,%s,%s,645)""",
                (identificador, FONTE, ano, campo, rotulo, unidade, fonte_url,
                 Jsonb({"equacao": equacao, "granularidade": "Município do estabelecimento",
                        "arquivo": arquivo.name, "sha256": checksum})),
            )
        with conn.cursor() as cursor:
            cursor.executemany(
                "INSERT INTO base_municipal.observacao (atributo_id,cd_mun,valor) VALUES (%s,%s,%s)",
                [(ids["id_emprego"], cd, emprego) for cd, _, emprego, _ in linhas] +
                [(ids["id_salario"], cd, salario) for cd, _, _, salario in linhas],
            )
        conn.execute("DROP TABLE IF EXISTS rais.vinculo_2024_sp")
        conn.execute("DROP TABLE IF EXISTS rais.estabelecimento_2024_sp")
        conn.execute("DROP TABLE IF EXISTS rais.arquivo_importado")

    return {"ano": ano, "municipios": len(linhas), "atributos": 2, "registros_lidos": registros}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arquivo", required=True, type=Path)
    parser.add_argument("--fonte-url", required=True)
    parser.add_argument("--ano", required=True, type=int, choices=ANOS_SUPORTADOS)
    parser.add_argument("--codificacao", default="LATIN1")
    args = parser.parse_args()
    print(publicar(args.arquivo, args.fonte_url, args.ano, args.codificacao))


if __name__ == "__main__":
    main()
