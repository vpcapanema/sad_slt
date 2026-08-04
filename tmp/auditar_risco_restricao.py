from pathlib import Path

import fiona


root = Path(__file__).resolve().parents[1] / "data" / "geoespacial" / "local"
groups = [path for path in root.iterdir() if path.name in {"risco", "restrição"}]

failures = []
for group in groups:
    for layer_dir in sorted(path for path in group.iterdir() if path.is_dir()):
        shapefiles = list(layer_dir.glob("*.shp"))
        if len(shapefiles) != 1:
            failures.append(f"{group.name}/{layer_dir.name}: shapefiles={len(shapefiles)}")
            continue
        shapefile_path = shapefiles[0]
        missing = [suffix for suffix in (".cpg", ".dbf", ".prj", ".shp", ".shx") if not shapefile_path.with_suffix(suffix).exists()]
        with fiona.open(shapefile_path) as source:
            feature_count = len(source)
            crs = str(source.crs)
        print(f"{group.name}/{layer_dir.name}|features={feature_count}|crs={crs}")
        if missing or feature_count == 0 or "4674" not in crs:
            failures.append(f"{group.name}/{layer_dir.name}: missing={missing}, features={feature_count}, crs={crs}")

if failures:
    raise SystemExit("\n".join(failures))
