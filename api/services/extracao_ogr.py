"""Motor GDAL/OGR dos dois enriquecimentos.

GeoDataFrames são somente recipientes de atributos/geometrias. A conversão WKB
na fronteira não faz operações espaciais: predicados, cortes, medidas, correção,
buffer e transformação de coordenadas são executados por OGR/OSR.
"""
import math
import uuid
import weakref
import numpy as np
import geopandas as gpd
from osgeo import ogr, osr, gdal

ogr.UseExceptions()
osr.UseExceptions()


def geometry(value):
    if value is None:
        return None
    if isinstance(value, ogr.Geometry):
        return value
    return ogr.CreateGeometryFromWkb(bytes(value.wkb))


def external(value):
    if value is None:
        return None
    return gpd.GeoSeries.from_wkb([bytes(value.ExportToWkb())]).iloc[0]


def operation(name, a, b=None, *args):
    try:
        geom = geometry(a)
        if geom is None:
            return None
        result = getattr(geom, name)(geometry(b), *args) if b is not None else getattr(geom, name)(*args)
        if result is None:
            raise ValueError(f'GDAL/OGR: {name} não retornou geometria.')
        return external(result)
    except RuntimeError as exc:
        raise ValueError(f'GDAL/OGR: falha em {name}: {exc}') from exc


def intersection(a, b): return operation('Intersection', a, b)
def difference(a, b): return operation('Difference', a, b)
def boundary(a): return operation('Boundary', a)
def make_valid(a): return operation('MakeValid', a)


def buffer(a, distance):
    try:
        return external(geometry(a).Buffer(distance, 16))
    except RuntimeError as exc:
        raise ValueError(f'GDAL/OGR: falha no buffer: {exc}') from exc


def predicate(a, b, name='intersects'):
    ga, gb = geometry(a), geometry(b)
    if ga is None or gb is None or ga.IsEmpty() or gb.IsEmpty():
        return False
    method = {'intersects':'Intersects', 'contains':'Contains', 'within':'Within', 'touches':'Touches'}[name]
    try:
        return bool(getattr(ga, method)(gb))
    except RuntimeError as exc:
        raise ValueError(f'GDAL/OGR: falha em {method}: {exc}') from exc


def is_valid(a):
    g = geometry(a)
    return g is not None and bool(g.IsValid())


def dimension(a):
    g = geometry(a)
    return -1 if g is None else g.GetDimension()


def parts_ogr(g):
    if g is None or g.IsEmpty():
        return
    if ogr.GT_Flatten(g.GetGeometryType()) in (ogr.wkbGeometryCollection, ogr.wkbMultiPoint, ogr.wkbMultiLineString, ogr.wkbMultiPolygon):
        for i in range(g.GetGeometryCount()):
            yield from parts_ogr(g.GetGeometryRef(i))
    else:
        yield g


def parts(a):
    return [external(g) for g in parts_ogr(geometry(a))]


def measure(a, dim):
    # GetArea/Length só nas dimensões apropriadas: sem perímetro como extensão.
    return sum(g.Length() if dim == 1 else g.GetArea() for g in parts_ogr(geometry(a))
               if dim in (1,2) and g.GetDimension() == dim)


def length(a):
    # Equivalente à extensão geométrica total; polígonos só usam isto para contato de bordas.
    g = geometry(a)
    if g is None or g.IsEmpty(): return 0.
    return sum(p.Boundary().Length() if p.GetDimension()==2 else p.Length() if p.GetDimension()==1 else 0.
               for p in parts_ogr(g))


def area(a): return measure(a, 2)


def collect(values, dim=None):
    geoms = [geometry(g) for g in values if g is not None]
    if not geoms: return None
    if len(geoms)==1: return external(geoms[0])
    kind = {0:ogr.wkbMultiPoint,1:ogr.wkbMultiLineString,2:ogr.wkbMultiPolygon}.get(dim,ogr.wkbGeometryCollection)
    result = ogr.Geometry(kind)
    for g in geoms:
        result.AddGeometry(g)
    if dim==2:
        result = result.UnionCascaded()
        if result is None: raise ValueError('GDAL/OGR: falha na união de polígonos.')
    return external(result)


def vertex_count(value):
    def count(g):
        if g is None or g.IsEmpty(): return 0
        return g.GetPointCount() + sum(count(g.GetGeometryRef(i)) for i in range(g.GetGeometryCount()))
    return count(geometry(value))


def spatial_reference(value):
    ref = osr.SpatialReference()
    ref.SetFromUserInput(value.to_wkt() if hasattr(value,'to_wkt') else str(value) if not isinstance(value,int) else f'EPSG:{value}')
    ref.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return ref


def _check_coordinates(g, name, geographic=False):
    if g is None or g.IsEmpty(): return
    for point in (g.GetPoints() if g.GetPointCount() else []):
        if not all(math.isfinite(v) for v in point):
            raise ValueError(f'{name}: coordenadas não finitas na fonte ou transformação.')
        if geographic and (abs(point[0])>180 or abs(point[1])>90):
            raise ValueError(f'{name}: coordenadas incompatíveis com o CRS geográfico declarado.')
    for i in range(g.GetGeometryCount()):
        _check_coordinates(g.GetGeometryRef(i), name, geographic)


def reproject(frame, target, name='Camada'):
    if frame.crs is None: raise ValueError(f'{name}: CRS ausente.')
    try:
        source, dest = spatial_reference(frame.crs), spatial_reference(target)
        transform = None if source.IsSame(dest) else osr.CoordinateTransformation(source, dest)
        converted = []
        for value in frame.geometry:
            g = geometry(value)
            _check_coordinates(g, name, bool(source.IsGeographic()))
            if g is not None:
                # Não alterar geometrias OGR fornecidas pelo chamador.
                g = g.Clone()
                if transform is not None and not g.IsEmpty() and g.Transform(transform)!=0:
                    raise ValueError(f'{name}: GDAL/OGR não conseguiu transformar a geometria.')
                _check_coordinates(g, name, bool(dest.IsGeographic()))
            converted.append(None if g is None else bytes(g.ExportToWkb()))
        result = frame.copy()
        result.geometry = gpd.GeoSeries.from_wkb(converted,index=frame.index,crs=target)
        return result.set_crs(target, allow_override=True)
    except RuntimeError as exc:
        raise ValueError(f'{name}: GDAL/OSR não conseguiu transformar o CRS: {exc}') from exc


class SpatialIndex:
    """Camada OGR por base; filtro espacial de envelopes seguido de predicado exato.

    O FID é a posição original, inclusive quando há feições vazias entre válidas.
    Bases maiores usam GeoPackage temporário com R-tree gerido pelo GDAL.
    O datasource vive junto com a layer; nenhuma conexão é compartilhada por jobs.
    """
    def __init__(self, geometries):
        if ogr.GetGEOSVersionMajor() < 1:
            raise ValueError('GDAL/OGR precisa de suporte GEOS para predicados espaciais exatos.')
        geometries = list(geometries)
        self.path = f'/vsimem/sicard-{uuid.uuid4().hex}.gpkg' if len(geometries)>256 else None
        self.dataset = ogr.GetDriverByName('GPKG' if self.path else 'Memory').CreateDataSource(self.path or '')
        self.layer = self.dataset.CreateLayer('base', geom_type=ogr.wkbUnknown,
                                              options=['SPATIAL_INDEX=YES'] if self.path else [])
        self._resources = {'layer':self.layer,'dataset':self.dataset,'path':self.path}
        self._finalizer = weakref.finalize(self, self._release, self._resources)
        if self.path: self.layer.StartTransaction()
        for pos, value in enumerate(geometries):
            g = geometry(value)
            if g is None or g.IsEmpty(): continue
            f = ogr.Feature(self.layer.GetLayerDefn())
            f.SetFID(pos)
            f.SetGeometry(g)
            if self.layer.CreateFeature(f)!=0: raise ValueError('GDAL/OGR: falha ao preparar base espacial.')
        if self.path:
            self.layer.CommitTransaction()
            self.layer.SyncToDisk()

    @staticmethod
    def _release(resources):
        resources['layer'] = None
        resources['dataset'] = None
        if resources['path']:
            gdal.Unlink(resources['path'])

    def close(self):
        self.layer = None
        self.dataset = None
        self._finalizer()

    def query(self, values, predicate='intersects'):
        if values is None or hasattr(values,'wkb') or isinstance(values,ogr.Geometry):
            return np.asarray(self._one(values,predicate), dtype=np.int64)
        pairs = [(i,j) for i,g in enumerate(values) for j in self._one(g,predicate)]
        return np.asarray(pairs,dtype=np.int64).T if pairs else np.empty((2,0),dtype=np.int64)

    def _one(self, value, name):
        g = geometry(value)
        if g is None or g.IsEmpty(): return []
        xmin,xmax,ymin,ymax = g.GetEnvelope()
        self.layer.SetSpatialFilterRect(xmin,ymin,xmax,ymax)
        self.layer.ResetReading()
        method = {'intersects':'Intersects','contains':'Contains','within':'Within'}[name]
        try:
            return sorted(f.GetFID() for f in self.layer if getattr(g,method)(f.GetGeometryRef()))
        except RuntimeError as exc:
            raise ValueError(f'GDAL/OGR: falha na junção espacial: {exc}') from exc
        finally:
            self.layer.SetSpatialFilter(None)


def provenance():
    return {'motor':'GDAL/OGR','versao':gdal.VersionInfo('RELEASE_NAME'),
            'junção':'OGR spatial filter + exact predicate','transformacao':'GDAL/OSR'}
