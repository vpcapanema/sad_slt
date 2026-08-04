from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data/geoespacial/local/embargos_estaduais/embargos_estaduais_sigam_ativos_operacionais.geojson"
RAW_TARGET = ROOT / "data/geoespacial/arquivados/fontes_brutas/embargos_estaduais/embargos_estaduais_sigam_ativos_operacionais.geojson"
POINT_QUERY = (
    "https://mapas.semil.sp.gov.br/server/rest/services/Hosted/"
    "Dados_Fiscalizacao_Ambiental/FeatureServer/0/query"
)
POLYGON_QUERY = (
    "https://mapas.semil.sp.gov.br/server/rest/services/SIGAM/"
    "AIAe_AreaOcorrencia_P/MapServer/0/query"
)
ACTIVE_STATUS = """
(
    status LIKE 'Aguarda%'
    OR status LIKE 'Em análise%'
    OR status = 'TCRA em andamento'
    OR status = 'Execução Judicial'
    OR status = 'Aguarda PGE'
    OR status = 'Aguarda manifestação da Pamb'
    OR status = 'Recurso julgado'
    OR status = 'Recurso não acolhido'
    OR status = 'Recurso Intempestivo'
    OR status = 'Transitado em julgado'
)
""".strip()

WHERE = """
UPPER(penalidade) LIKE '%EMBARGO%'
AND decisaoauto = 'Manutenção'
AND decisaosancao = 'Manter'
AND {active_status}
""".format(active_status=ACTIVE_STATUS).strip()
POLYGON_FIELDS = (
    "NIS,NumeroAuto,NumeroProcesso,Situacao,Fase,Status,DataStatus,"
    "Natureza,CategoriaInfracao,NomeInfracao,DescricaoInfracao,DataInfracao,"
    "Municipio,AreaDegradada,AreaTotal,DataAtualizacao,NumeroPoligono"
)


def request_json(url: str, parameters: dict[str, object]) -> dict:
    encoded = urllib.parse.urlencode(parameters).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=encoded,
        headers={"User-Agent": "SICARD-SLT/1.0"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.load(response)


def buscar_autos() -> list[dict]:
    features: list[dict] = []
    offset = 0
    while True:
        page = request_json(
            POINT_QUERY,
            {
                "f": "json",
                "where": WHERE,
                "outFields": "nis,numeroaia,penalidade,status,decisaoauto,decisaosancao,finalizado",
                "returnGeometry": "false",
                "resultOffset": offset,
                "resultRecordCount": 1000,
                "orderByFields": "nis",
            },
        )
        batch = page.get("features", [])
        features.extend(batch)
        if len(batch) < 1000:
            return features
        offset += len(batch)


def buscar_poligonos(nises: list[int]) -> list[dict]:
    features: list[dict] = []
    for start in range(0, len(nises), 100):
        chunk = nises[start : start + 100]
        where = "NIS IN ({}) AND {}".format(
            ",".join(str(nis) for nis in chunk),
            ACTIVE_STATUS,
        )
        page = request_json(
            POLYGON_QUERY,
            {
                "f": "geojson",
                "where": where,
                "outFields": POLYGON_FIELDS,
                "returnGeometry": "true",
                "outSR": 4674,
                "resultRecordCount": 1000,
            },
        )
        features.extend(page.get("features", []))
        print(f"Lote {start // 100 + 1}: {len(page.get('features', []))} polígonos")
    return features


def reparar_geometrias_para_exibicao(features: list[dict]) -> int:
    """Repara somente geometrias inválidas para renderização interoperável."""
    repaired = 0
    for feature in features:
        geometry = feature.get("geometry")
        if not geometry:
            continue
        parsed = shape(geometry)
        if not parsed.is_valid:
            feature["geometry"] = mapping(make_valid(parsed))
            repaired += 1
    return repaired


def main() -> None:
    autos = buscar_autos()
    nises = sorted({feature["attributes"]["nis"] for feature in autos if feature["attributes"].get("nis")})
    polygons = buscar_poligonos(nises)
    if not polygons:
        raise RuntimeError("Nenhum polígono SIGAM foi retornado para os autos selecionados.")

    raw_payload = {"type": "FeatureCollection", "features": polygons}
    RAW_TARGET.parent.mkdir(parents=True, exist_ok=True)
    RAW_TARGET.write_text(json.dumps(raw_payload, ensure_ascii=False), encoding="utf-8")

    repaired = reparar_geometrias_para_exibicao(polygons)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": polygons,
                "metadata": {
                    "origem": "SIGAM/SEMIL",
                    "geometrias_reparadas_para_exibicao": repaired,
                    "arquivo_bruto": RAW_TARGET.relative_to(ROOT).as_posix(),
                },
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"Autos selecionados: {len(autos)}")
    print(f"Polígonos baixados: {len(polygons)}")
    print(f"Geometrias reparadas para exibição: {repaired}")
    print(f"Arquivo: {TARGET}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERRO: {error}", file=sys.stderr)
        raise
