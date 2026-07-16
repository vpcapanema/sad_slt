"""Carrega o catálogo territorial local em geo.unidade_espacial."""
from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Any, Iterable

import geopandas as gpd
import psycopg
from psycopg.types.json import Jsonb

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.config import get_settings
from api.path_policy import project_path


UPSERT_SQL = """
    INSERT INTO geo.unidade_espacial
        (tipo_regionalizacao, codigo, nome, municipio_cod_ibge, metadados, geom)
    VALUES (%s, %s, %s, %s, %s,
            ST_Multi(ST_SetSRID(ST_GeomFromWKB(%s), 4326)))
    ON CONFLICT (tipo_regionalizacao, codigo) DO UPDATE SET
        nome = EXCLUDED.nome,
        municipio_cod_ibge = EXCLUDED.municipio_cod_ibge,
        metadados = EXCLUDED.metadados,
        geom = EXCLUDED.geom,
        atualizado_em = CURRENT_TIMESTAMP
"""


def _clean(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def _code(value: Any) -> str:
    value = _clean(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _rows(
    relative_path: str,
    tipo: str,
    code_column: str,
    name_column: str,
    *,
    municipality_code: bool = False,
    metadata_columns: Iterable[str] = (),
    filter_column: str | None = None,
    filter_value: str | None = None,
) -> list[tuple[Any, ...]]:
    frame = gpd.read_file(project_path(relative_path)).to_crs("EPSG:4326")
    if filter_column:
        frame = frame[
            frame[filter_column].astype(str).str.upper() == str(filter_value).upper()
        ]

    result: list[tuple[Any, ...]] = []
    for _, row in frame.iterrows():
        geometry = row.geometry
        if geometry is None or geometry.is_empty:
            continue
        codigo = _code(row[code_column])
        metadata = {
            column.lower(): _clean(row[column])
            for column in metadata_columns
            if _clean(row[column]) is not None
        }
        result.append(
            (
                tipo,
                codigo,
                str(row[name_column]),
                codigo if municipality_code else None,
                Jsonb(metadata),
                geometry.wkb,
            )
        )
    return result


def load_catalog() -> dict[str, int]:
    sources = [
        (
            "municipio",
            _rows(
                "database/geo/raw/municipio/municipio.shp",
                "municipio",
                "Cod_ibge",
                "Municipio",
                municipality_code=True,
                metadata_columns=("GID_RA", "GID_RG", "RA", "RG", "GID_RM", "GID_AU", "RM", "AU"),
            ),
        ),
        (
            "regiao_administrativa",
            _rows(
                "database/geo/raw/regiao_administrativa/regiao_administrativa.shp",
                "regiao_administrativa",
                "GID_RA",
                "RA",
                metadata_columns=("GID_RA",),
            ),
        ),
        (
            "regiao_governo",
            _rows(
                "database/geo/raw/regiao_de_governo/regiao_de_governo.shp",
                "regiao_governo",
                "GID_RG",
                "RG",
                metadata_columns=("GID_RG",),
            ),
        ),
        (
            "regiao_metropolitana",
            _rows(
                "database/geo/raw/regiao_metropolitana/regiao_metropolitana.shp",
                "regiao_metropolitana",
                "GID_RM",
                "RM",
                metadata_columns=("GID_RM", "Lei"),
            ),
        ),
        (
            "ugrhi",
            _rows(
                "database/geo/raw/ugrhi/ugrhi.shp",
                "ugrhi",
                "codigo",
                "nome",
                metadata_columns=("fonte",),
            ),
        ),
        (
            "estado",
            _rows(
                "database/geo/raw/uf/uf.shp",
                "estado",
                "geocodigo",
                "nome",
                metadata_columns=("sigla", "geocodigo"),
                filter_column="sigla",
                filter_value="SP",
            ),
        ),
    ]

    counts: dict[str, int] = {}
    with psycopg.connect(get_settings().slt_database_url) as conn:
        with conn.cursor() as cursor:
            for tipo, rows in sources:
                cursor.executemany(UPSERT_SQL, rows)
                counts[tipo] = len(rows)

            cursor.execute(
                """
                UPDATE geo.unidade_espacial
                SET area_km2 = round((ST_Area(geom::geography) / 1000000.0)::numeric, 3)
                WHERE geom IS NOT NULL;

                INSERT INTO demandas.plano_unidade_espacial (plano_id, unidade_espacial_id)
                SELECT p.id, ue.id
                FROM demandas.plano p
                JOIN geo.unidade_espacial ue
                  ON ue.tipo_regionalizacao = 'estado' AND ue.codigo = '35'
                WHERE p.codigo IN ('PLANO-PLI', 'PLANO-PEF', 'PLANO-OUTROS')
                ON CONFLICT DO NOTHING;

                INSERT INTO demandas.programa_unidade_espacial (programa_id, unidade_espacial_id)
                SELECT pg.id, ue.id
                FROM demandas.programa pg
                JOIN geo.unidade_espacial ue
                  ON ue.tipo_regionalizacao = 'estado' AND ue.codigo = '35'
                WHERE pg.codigo = 'PROG-OUTROS'
                ON CONFLICT DO NOTHING;
                """
            )
        conn.commit()
    return counts


if __name__ == "__main__":
    loaded = load_catalog()
    total = sum(loaded.values())
    detail = ", ".join(f"{key}={value}" for key, value in loaded.items())
    print(f"Catálogo geográfico carregado: {total} unidades ({detail})")
