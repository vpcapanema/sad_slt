"""Substituição atômica da geometria e preservação do original no histórico."""
import json
from fastapi import HTTPException
from psycopg import sql
from api.db.connection import get_connection
from api.services.autoria_demanda import validar_autor
from api.services.normalizacao_demanda import normalizar, reprojetar
from api.repositories.geometria_historico_repository import (
    insert_snapshot,
    insert_upload,
    marcar_vigentes_substituidas,
    regionalidades_de,
)
from osgeo import ogr

TIPOS={'plano','programa','projeto'}
def substituir(tipo,codigo,geometry,arquivo,usuario):
    if tipo not in TIPOS:raise HTTPException(422,"Tipo de demanda inválido.")
    usuario=validar_autor(usuario)
    normalized=normalizar(geometry,crs_saida=4674)
    g=ogr.CreateGeometryFromJson(json.dumps(normalized))
    geo4326=json.dumps(json.loads(reprojetar(g,4674,4326).ExportToJson()))
    point=reprojetar(g,4674,5880).PointOnSurface()
    point=reprojetar(point,5880,4326)
    with get_connection() as conn:
        regionalidades_sql = (
            sql.SQL("complementos") if tipo == "projeto" else sql.SQL("NULL::jsonb")
        )
        consulta = sql.SQL("""
            SELECT id, geometria, COALESCE(NULLIF(ST_SRID(geometria),0),4674) AS srid,
                   criado_por, {regionalidades} AS regionalidades,
                   CASE WHEN geometria IS NULL THEN NULL ELSE
                       ST_AsGeoJSON(ST_Transform(
                           ST_SetSRID(geometria, COALESCE(NULLIF(ST_SRID(geometria),0),4674)),
                           4326
                       ))
                   END AS geometria_geojson,
                   CASE WHEN geometria IS NULL THEN NULL
                        ELSE substring(ST_GeometryType(geometria) from 4)
                   END AS geometria_tipo,
                   CASE WHEN geometria IS NULL THEN NULL ELSE ST_Y(ST_Transform(
                       ST_PointOnSurface(ST_SetSRID(
                           geometria, COALESCE(NULLIF(ST_SRID(geometria),0),4674)
                       )), 4326
                   )) END AS latitude,
                   CASE WHEN geometria IS NULL THEN NULL ELSE ST_X(ST_Transform(
                       ST_PointOnSurface(ST_SetSRID(
                           geometria, COALESCE(NULLIF(ST_SRID(geometria),0),4674)
                       )), 4326
                   )) END AS longitude
              FROM {tabela}
             WHERE codigo=%s
             FOR UPDATE
        """).format(
            regionalidades=regionalidades_sql,
            tabela=sql.Identifier("demandas", tipo),
        )
        row=conn.execute(consulta,(codigo,)).fetchone()
        if not row:raise HTTPException(404,"Demanda não encontrada.")
        stored=reprojetar(g,4674,row['srid'] or 4674)
        versoes_encerradas = marcar_vigentes_substituidas(
            conn,
            alvo=tipo,
            alvo_id=row["id"],
            substituido_por=usuario,
            geometria_geojson=row.get("geometria_geojson"),
            geometria_tipo=row.get("geometria_tipo"),
            latitude=row.get("latitude"),
            longitude=row.get("longitude"),
            regionalidades=regionalidades_de(row.get("regionalidades")),
        )
        if not versoes_encerradas and row.get("geometria_geojson"):
            insert_snapshot(
                conn,
                alvo=tipo,
                alvo_id=row["id"],
                geometria_geojson=row["geometria_geojson"],
                geometria_tipo=row["geometria_tipo"],
                latitude=row["latitude"],
                longitude=row["longitude"],
                regionalidades=regionalidades_de(row.get("regionalidades")),
                criado_por=row.get("criado_por"),
            )
            marcar_vigentes_substituidas(
                conn,
                alvo=tipo,
                alvo_id=row["id"],
                substituido_por=usuario,
                geometria_geojson=row["geometria_geojson"],
                geometria_tipo=row["geometria_tipo"],
                latitude=row["latitude"],
                longitude=row["longitude"],
                regionalidades=regionalidades_de(row.get("regionalidades")),
            )
        # Mesma recepção e histórico do cadastro, inclusive original no Sicard Storage.
        insert_upload(conn,alvo=tipo,alvo_id=row['id'],geometria_geojson=geo4326,arquivo=arquivo,
            latitude=point.GetY(),longitude=point.GetX(),criado_por=usuario)
        fields = [
            sql.SQL("geometria=ST_GeomFromWKB(%s,%s)"),
            sql.SQL("atualizado_por=%s"),
        ]
        params=[bytes(stored.ExportToWkb()),row['srid'] or 4674,usuario]
        if tipo=='projeto':
            fields.extend(
                [
                    sql.SQL("geometria_tipo=%s"),
                    sql.SQL("latitude=%s"),
                    sql.SQL("longitude=%s"),
                ]
            )
            params.extend([normalized['type'],point.GetY(),point.GetX()])
        params.append(codigo)
        atualizar = sql.SQL("UPDATE {} SET {} WHERE codigo=%s").format(
            sql.Identifier("demandas", tipo),
            sql.SQL(",").join(fields),
        )
        conn.execute(atualizar,params)
    return {'codigo':codigo,'tipo':tipo,'mensagem':'Geometria substituída; original preservado no histórico.'}
