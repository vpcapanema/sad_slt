"""Normaliza nomes físicos e aliases dos uploads geoespaciais já catalogados."""
from __future__ import annotations

import sys
from pathlib import Path

from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.db.connection import get_connection
from api.path_policy import project_path, project_relative
from api.services.geospatial_upload_storage import _safe_name
from api.services.importar_camadas_service import _friendly_layer_alias


def _rename(source: Path, destination: Path, completed: list[tuple[Path, Path]]) -> None:
    if source == destination:
        return
    if destination.exists():
        raise FileExistsError(f"Destino já existe: {destination}")
    source.rename(destination)
    completed.append((source, destination))


def _normalize_contents(root: Path, completed: list[tuple[Path, Path]]) -> None:
    for source in sorted(root.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        _rename(source, source.with_name(_safe_name(source.name)), completed)


def main() -> None:
    datastorage = project_path("data/geoespacial/uploads/datastorage")
    completed: list[tuple[Path, Path]] = []
    updates: list[tuple[str, str, str]] = []
    try:
        for category in ("vetor", "raster", "geodatabase"):
            folder = datastorage / category
            if not folder.exists():
                continue
            packages = sorted(
                item for item in folder.iterdir()
                if item.is_file() and not item.name.startswith(".")
            )
            for package in packages:
                old_relative = project_relative(package)
                normalized_name = _safe_name(package.name)
                contents = folder / f"{package.name}.contents"
                alias_source = package.stem
                if contents.exists() and category != "geodatabase":
                    datasets = sorted(contents.rglob("*.shp")) or sorted(contents.rglob("*.tif"))
                    if datasets:
                        alias_source = datasets[0].stem
                    _normalize_contents(contents, completed)
                normalized_contents = folder / f"{normalized_name}.contents"
                if contents.exists():
                    _rename(contents, normalized_contents, completed)
                normalized_package = folder / normalized_name
                _rename(package, normalized_package, completed)
                updates.append((old_relative, project_relative(normalized_package), _friendly_layer_alias(alias_source)))

        with get_connection() as connection:
            with connection.cursor() as cursor:
                for old_path, new_path, alias in updates:
                    cursor.execute(
                        sql.SQL("""
                            UPDATE geoprocessamento.camada_importada
                               SET nome = %s,
                                   metadados = jsonb_set(
                                       jsonb_set(metadados, '{nome}', to_jsonb(%s::text), true),
                                       '{metadados,arquivo_original}', to_jsonb(%s::text), true
                                   )
                             WHERE metadados #>> '{metadados,arquivo_original}' = %s
                            RETURNING recurso_sessao_id
                        """),
                        (alias, alias, new_path, old_path),
                    )
                    row = cursor.fetchone()
                    if row is None:
                        raise RuntimeError(f"Registro do banco não encontrado para {old_path}")
            connection.commit()
    except Exception:
        for source, destination in reversed(completed):
            if destination.exists() and not source.exists():
                destination.rename(source)
        raise

    for old_path, new_path, alias in updates:
        print(f"OK  {old_path} -> {new_path} | {alias}")


if __name__ == "__main__":
    main()
