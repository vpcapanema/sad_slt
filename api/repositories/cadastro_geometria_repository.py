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
    WITH cadastradas AS MATERIALIZED (
        SELECT t.codigo, t.nome, t.status, t.criado_em,
               {posicao} AS posicao,
               ST_Transform(t.geometria,4326) AS geometria_mapa,
               ST_GeometryType(t.geometria) AS geometria_tipo
        FROM {tabela} t
        WHERE t.geometria IS NOT NULL {filtro}
    )
    SELECT codigo, nome, status, criado_em, posicao, geometria_tipo,
           ST_AsGeoJSON(geometria_mapa)::jsonb AS geometria,
           ARRAY[ST_XMin(geometria_mapa), ST_YMin(geometria_mapa),
                 ST_XMax(geometria_mapa), ST_YMax(geometria_mapa)] AS bounds
    FROM cadastradas
    ORDER BY criado_em DESC
"""


def listar(tipo: TipoCadastro, codigo: str | None = None) -> list[dict[str, Any]]:
    """Registros do tipo com geometria, prontos para virar camadas do mapa."""
    tabela = _TABELAS.get(tipo)
    if not tabela:
        raise ValueError(f"Tipo de cadastro desconhecido: {tipo}")
    with get_connection() as conn:
        position = 'CASE WHEN t.longitude IS NOT NULL AND t.latitude IS NOT NULL THEN ARRAY[t.longitude,t.latitude] END' if tipo == 'projeto' else 'NULL::double precision[]'
        query = _SQL.format(tabela=tabela, posicao=position,
                            filtro="AND t.codigo = %s" if codigo is not None else "")
        rows = conn.execute(query, (codigo,) if codigo is not None else ()).fetchall()
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
            "posicao": [float(v) for v in row["posicao"]] if row.get("posicao") else None,
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


def listar_arquivos(tipo: TipoCadastro) -> list[dict[str, Any]]:
    """Catálogo virtual, sem transportar geometrias para listar pastas."""
    tabela = _TABELAS.get(tipo)
    if not tabela:
        raise ValueError("Tipo de cadastro desconhecido")
    with get_connection() as conn:
        rows=conn.execute(f"""SELECT t.codigo,t.nome,t.status,t.criado_em,
            COALESCE(t.atualizado_em,t.criado_em) AS modificado_em,
            ST_GeometryType(geometria) AS geometria_tipo,ST_SRID(geometria) AS srid
            FROM {tabela} t WHERE geometria IS NOT NULL ORDER BY criado_em DESC""").fetchall()
    return [dict(row,id=f"cadastro:{tipo}:{row['codigo']}",tipo=tipo) for row in rows]


def exportar_original(tipo: TipoCadastro, codigo: str) -> dict[str, Any]:
    """Exporta coordenadas cadastradas no CRS original, sem reprojeção."""
    tabela = _TABELAS.get(tipo)
    if not tabela:
        raise ValueError("Tipo de cadastro desconhecido")
    with get_connection() as conn:
        row=conn.execute(f"""SELECT codigo,nome,status,ST_SRID(geometria) AS srid,
            ST_AsGeoJSON(geometria,17)::jsonb AS geometria
            FROM {tabela} WHERE codigo=%s AND geometria IS NOT NULL""",(codigo,)).fetchone()
    if not row:
        raise FileNotFoundError("Geometria de demanda não encontrada")
    return {"type":"FeatureCollection","crs":{"type":"name","properties":{"name":f"EPSG:{row['srid']}"}},
        "features":[{"type":"Feature","properties":{key:row[key] for key in ('codigo','nome','status')},"geometry":row['geometria']}]}
