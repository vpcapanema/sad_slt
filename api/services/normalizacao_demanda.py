"""Demandas: operações OGR em EPSG:5880 e armazenamento em EPSG:4674."""
import json
from fastapi import HTTPException
from osgeo import ogr, osr
ogr.UseExceptions()
osr.UseExceptions()

BUFFER_PONTO_M = 50
BUFFER_LINHA_M = 25
SEGMENTOS_QUADRANTE = 32
CRS_METRICO = 5880
CRS_CADASTRAL = 4674


def referencia(crs):
    ref = osr.SpatialReference()
    ref.SetFromUserInput(f'EPSG:{crs}' if isinstance(crs, int) else str(crs))
    ref.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return ref


def reprojetar(geom, origem, destino):
    copy = geom.Clone()
    copy.AssignSpatialReference(referencia(origem))
    if copy.TransformTo(referencia(destino)) != 0:
        raise HTTPException(422, 'GDAL/OGR não conseguiu reprojetar a geometria.')
    return copy


def normalizar(geometry, *, crs_origem: int | str = 4326, crs_saida: int | str = CRS_CADASTRAL):
    try:
        geom = ogr.CreateGeometryFromJson(json.dumps(geometry, allow_nan=False))
        if geom is None or geom.IsEmpty():
            raise HTTPException(422, 'A geometria da demanda está vazia.')
        geom.FlattenTo2D()
        geographic = reprojetar(geom, crs_origem, 4674)
        x0, x1, y0, y1 = geographic.GetEnvelope()
        if not (-180 <= x0 <= x1 <= 180 and -90 <= y0 <= y1 <= 90):
            raise HTTPException(422, 'Coordenadas incompatíveis com o CRS informado.')
        kind = ogr.GT_Flatten(geom.GetGeometryType())
        radius = BUFFER_PONTO_M if kind in (ogr.wkbPoint, ogr.wkbMultiPoint) else BUFFER_LINHA_M if kind in (ogr.wkbLineString, ogr.wkbMultiLineString) else None
        metric = reprojetar(geographic, 4674, CRS_METRICO)
        if radius:
            metric = metric.Buffer(radius, SEGMENTOS_QUADRANTE)
        metric = metric.MakeValid()
        polygons = ogr.Geometry(ogr.wkbMultiPolygon)
        def collect(g):
            if ogr.GT_Flatten(g.GetGeometryType()) == ogr.wkbPolygon:
                polygons.AddGeometry(g)
            else:
                for i in range(g.GetGeometryCount()):
                    collect(g.GetGeometryRef(i))
        collect(metric)
        if polygons.IsEmpty():
            raise HTTPException(422, 'Não foi possível obter um polígono válido da demanda.')
        result = polygons.UnionCascaded()
        if result is None or result.IsEmpty():
            raise HTTPException(422, 'GDAL/OGR não conseguiu consolidar os polígonos.')
        return json.loads(reprojetar(result, CRS_METRICO, crs_saida).ExportToJson())
    except HTTPException:
        raise
    except (RuntimeError, ValueError, TypeError) as exc:
        raise HTTPException(422, 'Geometria ou CRS inválido para processamento GDAL/OGR.') from exc
