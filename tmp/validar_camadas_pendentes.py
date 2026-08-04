from pathlib import Path

import fiona


root = Path(__file__).resolve().parents[1] / "data" / "geoespacial" / "local"
restriction = next(path for path in root.iterdir() if path.name.startswith("restri"))

for layer_name in ("vegetacao_nativa_sp", "embargos_ibama_ativos_sp"):
    shapefile_path = next((restriction / layer_name).glob("*.shp"))
    with fiona.open(shapefile_path) as source:
        print(f"{layer_name}|features={len(source)}|crs={source.crs}")
