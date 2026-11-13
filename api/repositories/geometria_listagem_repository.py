"""Coordenadas exatas ja serializadas, sem reconstruir milhares de listas Python."""
from api.db.connection import get_connection


def por_codigos(codigos: list[str]) -> dict[str, str]:
    if not codigos:
        return {}
    query = """
        SELECT codigo, json_build_object(
            'tipo', replace(ST_GeometryType(geometria), 'ST_', ''),
            'coordinates', ST_AsGeoJSON(ST_Transform(geometria,4326))::json->'coordinates'
        )::text AS geojson
        FROM (
            SELECT codigo, geometria FROM demandas.plano WHERE codigo = ANY(%s)
            UNION ALL SELECT codigo, geometria FROM demandas.programa WHERE codigo = ANY(%s)
            UNION ALL SELECT codigo, geometria FROM demandas.projeto WHERE codigo = ANY(%s)
        ) s WHERE geometria IS NOT NULL
    """
    with get_connection() as conn:
        return {row['codigo']: row['geojson'] for row in conn.execute(query, (codigos, codigos, codigos))}
