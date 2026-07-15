"""Internaliza camadas vetoriais legadas referenciadas apenas por URI."""
from __future__ import annotations

from pathlib import Path

import geopandas as gpd

from api.db.connection import get_connection
from api.path_policy import project_path
from api.repositories.camada_geoespacial_repository import migrar_vetor_existente


def main() -> int:
    with get_connection() as conn:
        rows = list(conn.execute(
            """SELECT c.id,c.uri FROM geoprocessamento.camada c
               WHERE c.tipo='vetor' AND NOT EXISTS (
                 SELECT 1 FROM geoprocessamento.camada_vetor v WHERE v.camada_id=c.id
               )"""
        ).fetchall())

    for row in rows:
        filename = Path(str(row["uri"] or "").replace("\\", "/")).name
        relative_uri = f"data/geoespacial/{filename}"
        source = project_path(relative_uri)
        if not filename or not source.exists():
            raise FileNotFoundError(f"Arquivo da camada legada não encontrado: {relative_uri}")
        gdf = gpd.read_file(source)
        recurso_id = f"camada_{row['id'].hex}"
        migrar_vetor_existente(str(row["id"]), recurso_id, gdf, relative_uri)
        print(f"{recurso_id}: {len(gdf)} feições internalizadas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
