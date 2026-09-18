"""Gera a linha de costa de São Paulo usada na localização assistida do SEI.

Costa = contorno de SP menos as divisas com outros estados, a partir dos
limites estaduais do IBGE (br_uf_2024). Esse arquivo fica em
data/geoespacial/local/, fora da imagem Docker (.dockerignore); o resultado,
pequeno e simplificado, vai para database/geo/derived/, que entra na imagem.

Uso: .venv\\Scripts\\python.exe scripts/gerar_linha_costa_sp.py
"""
from __future__ import annotations

import json
from pathlib import Path

import shapefile
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

RAIZ = Path(__file__).resolve().parents[1]
ORIGEM = RAIZ / "data/geoespacial/local/limites_administrativos/br_uf_2024/br_uf_2024.shp"
DESTINO = RAIZ / "database/geo/derived/linha_costa_sp.geojson"
# Em graus (SIRGAS 2000). ~50 m: sobra precisão para uma faixa de quilômetros.
SIMPLIFICACAO = 0.0005
# Folga para descartar a divisa terrestre, que coincide com a dos vizinhos.
FOLGA_DIVISA = 0.0005


def main() -> None:
    leitor = shapefile.Reader(str(ORIGEM), encoding="utf-8")
    sp, vizinhos = None, []
    for forma, registro in zip(leitor.shapes(), leitor.records()):
        geometria = shape(forma.__geo_interface__)
        if registro["SIGLA_UF"] == "SP":
            sp = geometria
        else:
            vizinhos.append(geometria)
    if sp is None:
        raise SystemExit("SP não encontrado em br_uf_2024.")
    divisas = unary_union([v for v in vizinhos if v.intersects(sp.buffer(0.01))]).boundary.buffer(FOLGA_DIVISA)
    costa = sp.boundary.difference(divisas).simplify(SIMPLIFICACAO, preserve_topology=False)
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps({
        "type": "Feature",
        "properties": {
            "fonte": "IBGE — limites estaduais 2024 (br_uf_2024)",
            "descricao": "Contorno de SP sem as divisas com outros estados (linha de costa)",
            "gerado_por": "scripts/gerar_linha_costa_sp.py",
        },
        "geometry": mapping(costa),
    }), encoding="utf-8")
    print(f"{DESTINO.relative_to(RAIZ)}: {costa.geom_type}, {len(getattr(costa, 'geoms', [costa]))} trecho(s)")


if __name__ == "__main__":
    main()
