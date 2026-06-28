"""Acesso a dados — catálogo geo (unidades espaciais de atuação)."""
from __future__ import annotations

import json
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


def _union_from_ids(alias: str) -> str:
    return f"""
    SELECT ST_MakeValid(ST_Union(geom)) AS src
    FROM geo.unidade_espacial
    WHERE id = ANY(%({alias})s::uuid[])
    """


_CONTAINMENT_SQL = """
WITH user_g AS (
    SELECT src FROM (
        {user_geom_source}
    ) s
),
user_geom AS (
    SELECT ST_MakeValid(
        CASE
            WHEN ST_GeometryType(src) IN ('ST_Point', 'ST_LineString')
                THEN ST_Buffer(src::geography, 1)::geometry
            ELSE src
        END
    ) AS g
    FROM user_g
    WHERE src IS NOT NULL
),
parent_geom AS (
    SELECT ST_MakeValid(ST_Union(geom)) AS g
    FROM geo.unidade_espacial
    WHERE id = ANY(%(parent_ids)s::uuid[])
),
metrics AS (
    SELECT
        ST_Intersects(u.g, p.g) AS intersects,
        ST_Area(u.g::geography) AS user_area,
        CASE
            WHEN ST_Intersects(u.g, p.g)
            THEN ST_Area(ST_Intersection(u.g, p.g)::geography)
            ELSE 0
        END AS inter_area
    FROM user_geom u
    CROSS JOIN parent_geom p
)
SELECT
    COALESCE(intersects, FALSE) AS intersects,
    COALESCE(
        CASE
            WHEN NOT intersects OR user_area IS NULL OR user_area = 0 THEN 0
            ELSE LEAST(100, GREATEST(0, 100.0 * inter_area / user_area))
        END,
        0
    ) AS pct_inside
FROM metrics
"""


def analyze_containment(
    *,
    parent_ids: list[str],
    geometry: dict[str, Any] | None = None,
    unidade_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Calcula percentual de sobreposição da geometria do usuário dentro do vínculo."""
    if not parent_ids:
        return {"status": "inside", "pct_inside": 100.0, "pct_outside": 0.0, "message": ""}

    if unidade_ids:
        user_source = _union_from_ids("user_ids")
        params: dict[str, Any] = {"parent_ids": parent_ids, "user_ids": unidade_ids}
    elif geometry:
        user_source = """
        SELECT ST_SetSRID(ST_GeomFromGeoJSON(%(geom)s::text), 4326) AS src
        """
        params = {
            "parent_ids": parent_ids,
            "geom": json.dumps(geometry),
        }
    else:
        return {"status": "inside", "pct_inside": 100.0, "pct_outside": 0.0, "message": ""}

    sql = _CONTAINMENT_SQL.format(user_geom_source=user_source)
    with get_connection() as conn:
        row = conn.execute(sql, params).fetchone()

    if not row:
        return {"status": "outside", "pct_inside": 0.0, "pct_outside": 100.0, "message": ""}

    pct_inside = float(row["pct_inside"] or 0)
    pct_outside = max(0.0, min(100.0, 100.0 - pct_inside))
    intersects = bool(row["intersects"])

    if not intersects or pct_inside <= 0.05:
        status = "outside"
    elif pct_inside >= 99.5:
        status = "inside"
    else:
        status = "partial"

    return {
        "status": status,
        "pct_inside": round(pct_inside, 1),
        "pct_outside": round(pct_outside, 1),
        "message": "",
    }


_PROJETO_TIPOS = (
    "municipio",
    "regiao_governo",
    "regiao_administrativa",
    "regiao_metropolitana",
    "zona_zee",
)

_LOCATE_SQL = """
WITH user_geom AS (
    SELECT ST_MakeValid(
        CASE
            WHEN ST_GeometryType(ST_SetSRID(ST_GeomFromGeoJSON(%(geom)s::text), 4326)) IN ('ST_Point', 'ST_LineString')
                THEN ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON(%(geom)s::text), 4326)::geography, 1)::geometry
            ELSE ST_SetSRID(ST_GeomFromGeoJSON(%(geom)s::text), 4326)
        END
    ) AS g
)
SELECT ue.tipo_regionalizacao, tr.nome AS tipo_nome, ue.nome
FROM geo.unidade_espacial ue
JOIN geo.tipo_regionalizacao tr ON tr.codigo = ue.tipo_regionalizacao
CROSS JOIN user_geom ug
WHERE ue.tipo_regionalizacao = ANY(%(tipos)s)
  AND ST_Intersects(ue.geom, ug.g)
ORDER BY tr.ordem, ue.nome
"""


def locate_geometry(geometry: dict[str, Any]) -> dict[str, Any]:
    """Identifica regionalidades oficiais que intersectam a geometria do projeto."""
    params = {"geom": json.dumps(geometry), "tipos": list(_PROJETO_TIPOS)}
    with get_connection() as conn:
        rows = list(conn.execute(_LOCATE_SQL, params).fetchall())

    grouped: dict[str, dict[str, Any]] = {}
    regionalidades: dict[str, list[str]] = {}
    for row in rows:
        tipo = row["tipo_regionalizacao"]
        if tipo not in grouped:
            grouped[tipo] = {"tipo": tipo, "tipo_nome": row["tipo_nome"], "nomes": []}
            regionalidades[tipo] = []
        grouped[tipo]["nomes"].append(row["nome"])
        regionalidades[tipo].append(row["nome"])

    itens = sorted(grouped.values(), key=lambda x: _PROJETO_TIPOS.index(x["tipo"]) if x["tipo"] in _PROJETO_TIPOS else 999)
    return {"regionalidades": regionalidades, "itens": itens}


_PROGRAMA_HIGHER_SQL = """
WITH sel AS (
    SELECT ST_MakeValid(ST_Union(ue.geom)) AS g,
           MIN(tr.ordem) AS sel_ordem
    FROM geo.unidade_espacial ue
    JOIN geo.tipo_regionalizacao tr ON tr.codigo = ue.tipo_regionalizacao
    WHERE ue.id = ANY(%(ids)s::uuid[])
),
regioes_sobrepostas AS (
    SELECT ue.tipo_regionalizacao, tr.nome AS tipo_nome, tr.ordem, ue.nome
    FROM geo.unidade_espacial ue
    JOIN geo.tipo_regionalizacao tr ON tr.codigo = ue.tipo_regionalizacao
    CROSS JOIN sel s
    WHERE s.g IS NOT NULL
      AND tr.ordem > s.sel_ordem
      AND ue.tipo_regionalizacao <> 'estado'
      AND ST_Intersects(ue.geom, s.g)
)
SELECT tipo_regionalizacao, tipo_nome, ordem, array_agg(nome ORDER BY nome) AS nomes
FROM regioes_sobrepostas
GROUP BY tipo_regionalizacao, tipo_nome, ordem
ORDER BY ordem, tipo_nome
"""


def programa_regionalidades_sobrepostas(unidade_ids: list[str]) -> dict[str, Any]:
    """Regionalidades hierarquicamente maiores que intersectam a abrangência do programa."""
    if not unidade_ids:
        return {"itens": [], "regionalidades": {}}

    with get_connection() as conn:
        rows = list(conn.execute(_PROGRAMA_HIGHER_SQL, {"ids": unidade_ids}).fetchall())

    itens = []
    regionalidades: dict[str, list[str]] = {}
    for row in rows:
        if row["tipo_regionalizacao"] == "estado":
            continue
        nomes = list(row["nomes"] or [])
        itens.append(
            {
                "tipo": row["tipo_regionalizacao"],
                "tipo_nome": row["tipo_nome"],
                "ordem": row["ordem"],
                "nomes": nomes,
            }
        )
        regionalidades[row["tipo_regionalizacao"]] = nomes

    return {"itens": itens, "regionalidades": regionalidades}
