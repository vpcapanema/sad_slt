"""Exporta mapas dos atributos reescalonados e das superfícies de média simples."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import geopandas as gpd

from exportar_mapas_fase1_relatorio import MAP_CRS, STATE_PATH, fixed_extent, load_basemap, slugify
from exportar_mapas_fase2_relatorio import END_COLORS, export_map
from gerar_superficies_media_simples_fase2 import SPECS, VALUE_COLUMN
from normalizar_favorabilidade_fase2 import GRADE_OUTPUT, NETWORK_OUTPUT
from criterios_favorabilidade_fase2 import available_criteria, validate_catalog_against_matrix

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "geoespacial" / "relatorios" / "mapas_fase2_normalizados"

# Estas rampas e as quebras quantilicas afetam somente a renderizacao.
PALETTES = [
    ["#FFF7EC", "#FDD49E", "#FC8D59", "#B30000"],
    ["#F7FCF5", "#C7E9C0", "#41AB5D", "#005A32"],
    ["#F7FCFD", "#BFD3E6", "#8C6BB1", "#4D004B"],
    ["#FFFFCC", "#A1DAB4", "#41B6C4", "#225EA8"],
    ["#FFF7FB", "#ECE2F0", "#A6BDDB", "#2B8CBE"],
    ["#FFFFD9", "#C7E9B4", "#41B6C4", "#081D58"],
]

VULNERABILITY_PALETTE = [
    "#2166AC", "#67A9CF", "#D1E5F0", "#FFFFBF",
    "#FDDBC7", "#EF8A62", "#B2182B",
]

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Regenera PNGs normalizados já existentes")
    args = parser.parse_args()
    validate_catalog_against_matrix()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    state = gpd.read_file(STATE_PATH).to_crs(MAP_CRS)
    extent = fixed_extent(state)
    basemap = load_basemap(extent)
    grade = gpd.read_file(GRADE_OUTPUT, layer="favorabilidade_grade_normalizada")
    network = gpd.read_file(NETWORK_OUTPUT, layer="favorabilidade_rede_normalizada").to_crs(MAP_CRS)
    catalog = [("grade", grade), ("rede", network)]

    manifest = []
    index = 0
    total = sum(len(available_criteria(group)) for group, _ in catalog) + len(SPECS)
    for group, frame in catalog:
        for criterion in available_criteria(group):
            index += 1
            attribute = criterion.output
            alias = f"{criterion.code} — {criterion.alias}"
            filename = f"{index:03d}_{group}_{slugify(criterion.code)}_{slugify(attribute)}_reescalonado.png"
            destination = OUTPUT_DIR / filename
            if args.force or not destination.exists():
                palette = (
                    VULNERABILITY_PALETTE
                    if criterion.code == "G02"
                    else PALETTES[(index - 1) % len(PALETTES)]
                )
                item = export_map(
                    frame, group, attribute, alias, "índice 0–1", END_COLORS[index - 1],
                    state, extent, basemap, filename, output_dir=OUTPUT_DIR, limits=(0.0, 1.0),
                    palette=palette,
                    quantile_classes=None if criterion.code == "G02" else 7,
                )
            else:
                item = {"arquivo": filename, "grupo": group, "atributo": attribute, "alias": alias}
            item["tipo"] = "criterio_matriz_v3_reescalonado"
            item["codigo_criterio"] = criterion.code
            item["criterio_matriz"] = criterion.matrix_name
            item["componentes"] = list(criterion.components)
            manifest.append(item)
            print(f"[{index:03d}/{total:03d}] {filename}", flush=True)

    for group, spec in SPECS.items():
        index += 1
        frame = gpd.read_file(spec["output"], layer=spec["output_layer"])
        if group == "rede":
            frame = frame.to_crs(MAP_CRS)
        alias = f"Favorabilidade da {group} — média simples"
        filename = f"{index:03d}_{group}_favorabilidade_media_simples.png"
        destination = OUTPUT_DIR / filename
        if args.force or not destination.exists():
            item = export_map(
                frame, group, VALUE_COLUMN, alias, "índice 0–1", END_COLORS[index - 1],
                state, extent, basemap, filename, output_dir=OUTPUT_DIR, limits=(0.0, 1.0),
                palette=PALETTES[(index - 1) % len(PALETTES)], quantile_classes=7,
            )
        else:
            item = {"arquivo": filename, "grupo": group, "atributo": VALUE_COLUMN, "alias": alias}
        item["tipo"] = "superficie_media_simples"
        manifest.append(item)
        print(f"[{index:03d}/{total:03d}] {filename}", flush=True)

    report = {
        "formato": "PNG 1920 x 1080 px",
        "crs_renderizacao": MAP_CRS,
        "basemap": "CARTO Positron em escala de cinza",
        "escala_visual": "valores 0 a 1 classificados por quantis adaptativos (ate 7 classes)",
        "observacao_simbologia": "A classificacao altera somente as cores da exportacao; os valores dos GeoPackages permanecem inalterados.",
        "fonte_criterios": "documentacao/matrizes/Matriz_Criterios_Premissas_PLI-SP_v3.xlsx",
        "total_imagens": len(manifest),
        "imagens": manifest,
    }
    (OUTPUT_DIR / "manifesto.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8",
    )
    print(f"Imagens exportadas em {OUTPUT_DIR}", flush=True)


if __name__ == "__main__":
    main()
