"""Acesso a dados — geometrias materializadas do cadastro para o mapa.

Plano, programa e projeto guardam a própria geometria no CRS cadastral (padrão EPSG:4674); aqui cada
registro vira uma camada candidata do visualizador, com o GeoJSON pronto.
"""
from __future__ import annotations

from typing import Any, Literal

from api.db.connection import get_connection

TipoCadastro = Literal["plano", "programa", "projeto"]

_TABELAS: dict[str, str] = {
    "plano": "demandas.plano",
    "programa": "demandas.programa",
    "projeto": "demandas.projeto",
}

_SQL = """
    SELECT
        t.codigo,
        t.nome,
        t.status,
        t.criado_em,
        ST_AsGeoJSON(ST_Transform(t.geometria,4326))::jsonb AS geometria,
        ST_GeometryType(t.geometria) AS geometria_tipo,
        ARRAY[ST_XMin(ST_Transform(t.geometria,4326)), ST_YMin(ST_Transform(t.geometria,4326)), ST_XMax(ST_Transform(t.geometria,4326)), ST_YMax(ST_Transform(t.geometria,4326))] AS bounds
    FROM {tabela} t
    WHERE t.geometria IS NOT NULL
    ORDER BY t.criado_em DESC
"""


def listar(tipo: TipoCadastro) -> list[dict[str, Any]]:
    """Registros do tipo com geometria, prontos para virar camadas do mapa."""
    tabela = _TABELAS.get(tipo)
    if not tabela:
        raise ValueError(f"Tipo de cadastro desconhecido: {tipo}")
    with get_connection() as conn:
        rows = conn.execute(_SQL.format(tabela=tabela)).fetchall()
    return [
        {
            "id": f"cadastro:{tipo}:{row['codigo']}",
            "tipo": tipo,
            "codigo": row["codigo"],
            "nome": row["nome"],
            "status": row["status"],
            "criado_em": row["criado_em"].isoformat() if row.get("criado_em") else None,
            "geometria_tipo": (row["geometria_tipo"] or "").replace("ST_", ""),
            "bounds": [float(v) for v in row["bounds"]],
            "geojson": {
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "properties": {"codigo": row["codigo"], "nome": row["nome"], "status": row["status"]},
                    "geometry": row["geometria"],
                }],
            },
        }
        for row in rows
    ]
