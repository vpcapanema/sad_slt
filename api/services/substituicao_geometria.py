"""Substituição atômica da geometria e preservação do original no histórico."""
import json
from fastapi import HTTPException
from api.db.connection import get_connection
from api.services.autoria_demanda import validar_autor
from api.services.normalizacao_demanda import normalizar, reprojetar
from api.repositories.geometria_historico_repository import insert_upload
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
        row=conn.execute(f"SELECT id,geometria,ST_SRID(geometria) AS srid FROM demandas.{tipo} WHERE codigo=%s FOR UPDATE",(codigo,)).fetchone()
        if not row:raise HTTPException(404,"Demanda não encontrada.")
        stored=reprojetar(g,4674,row['srid'] or 4674)
        # Mesma recepção e histórico do cadastro, inclusive original no Sicard Storage.
        insert_upload(conn,alvo=tipo,alvo_id=row['id'],geometria_geojson=geo4326,arquivo=arquivo,
            latitude=point.GetY(),longitude=point.GetX(),criado_por=usuario)
        fields="geometria=ST_GeomFromWKB(%s,%s),atualizado_por=%s"
        params=[bytes(stored.ExportToWkb()),row['srid'] or 4674,usuario]
        if tipo=='projeto':
            fields+=",geometria_tipo=%s,latitude=%s,longitude=%s";params.extend([normalized['type'],point.GetY(),point.GetX()])
        params.append(codigo)
        conn.execute(f"UPDATE demandas.{tipo} SET {fields} WHERE codigo=%s",params)
    return {'codigo':codigo,'tipo':tipo,'mensagem':'Geometria substituída; original preservado no histórico.'}
