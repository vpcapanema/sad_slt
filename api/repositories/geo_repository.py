"""Acesso a dados — catálogo geo (unidades espaciais de atuação)."""
from __future__ import annotations

from typing import Any

from api.db.connection import get_connection

_TIPOS_SQL = """
    SELECT codigo, nome, descricao, ordem
    FROM geo.tipo_regionalizacao
    WHERE ativo IS TRUE
    ORDER BY ordem, nome
"""

_UNIDADES_BASE = """
    SELECT id, tipo_regionalizacao, codigo, nome, municipio_cod_ibge
    FROM geo.unidade_espacial
"""


def list_tipos() -> list[dict[str, Any]]:
    """Lista os tipos de regionalização disponíveis."""
    with get_connection() as conn:
        return list(conn.execute(_TIPOS_SQL).fetchall())


_GEOJSON_SQL = """
    SELECT id, tipo_regionalizacao, codigo, nome,
           ST_AsGeoJSON(geom)::jsonb AS geojson
    FROM geo.unidade_espacial
    WHERE id = ANY(%s::uuid[])
"""


def geojson_by_ids(ids: list[str]) -> list[dict[str, Any]]:
    """Retorna a geometria (GeoJSON) das unidades espaciais informadas."""
    if not ids:
        return []
    with get_connection() as conn:
        return list(conn.execute(_GEOJSON_SQL, (ids,)).fetchall())


def list_unidades(tipo: str | None = None) -> list[dict[str, Any]]:
    """Lista unidades espaciais (sem geometria), opcionalmente filtradas por tipo."""
    query = _UNIDADES_BASE
    params: tuple[Any, ...] = ()
    if tipo:
        query += " WHERE tipo_regionalizacao = %s"
        params = (tipo,)
    query += " ORDER BY nome"
    with get_connection() as conn:
        return list(conn.execute(query, params).fetchall())
