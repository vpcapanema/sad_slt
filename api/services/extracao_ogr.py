"""Motor GDAL/OGR dos dois enriquecimentos.

GeoDataFrames são somente recipientes de atributos/geometrias. A conversão WKB
na fronteira não faz operações espaciais: predicados, cortes, medidas, correção,
buffer e transformação de coordenadas são executados por OGR/OSR.
"""
import math
import uuid
import weakref
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


class LayerOverlay:
    """Adaptador de dados para a álgebra nativa de camadas OGR.

    OGR Layer.Intersection/Identity executam a busca e o overlay. Python apenas
    transfere geometrias e posições de linhas, sem selecionar envelopes ou
    implementar interseção/recorte. FIDs são posições, nunca índices do pandas.
    """
    def __init__(self, geometries):
        if ogr.GetGEOSVersionMajor() < 1:
            raise ValueError('GDAL/OGR precisa de suporte GEOS para overlay.')
        self.geometries = list(geometries)
        self.path = f'/vsimem/sicard-{uuid.uuid4().hex}.gpkg' if len(self.geometries)>256 else None
        self.dataset = ogr.GetDriverByName('GPKG' if self.path else 'Memory').CreateDataSource(self.path or '')
        self.layer = self._layer(self.dataset, 'base', self.geometries, 'base_pos', indexed=bool(self.path))
        self._resources = {'layer':self.layer,'dataset':self.dataset,'path':self.path}
        self._finalizer = weakref.finalize(self, self._release, self._resources)

    @staticmethod
    def _layer(dataset, name, values, field, indexed=False):
        layer = dataset.CreateLayer(name, geom_type=ogr.wkbUnknown,
                                    options=['SPATIAL_INDEX=YES'] if indexed else [])
        layer.CreateField(ogr.FieldDefn(field, ogr.OFTInteger64))
        if indexed: layer.StartTransaction()
        for pos, value in enumerate(values):
            g = geometry(value)
            if g is None or g.IsEmpty(): continue
            feature = ogr.Feature(layer.GetLayerDefn())
            feature.SetFID(pos)
            feature.SetField(field, pos)
            feature.SetGeometry(g)
            if layer.CreateFeature(feature) != ogr.OGRERR_NONE:
                raise ValueError('GDAL/OGR: falha ao preparar camada para overlay.')
        if indexed:
            layer.CommitTransaction()
            layer.SyncToDisk()
        return layer

    @staticmethod
    def _release(resources):
        resources['layer'] = None
        resources['dataset'] = None
        if resources['path']: gdal.Unlink(resources['path'])

    def close(self):
        self.layer = None
        self.dataset = None
        self._finalizer()

    def records(self, values, operation='Intersection', predicate_name='intersects'):
        """(posição entrada, posição base ou None, geometria do overlay)."""
        if operation not in ('Intersection', 'Identity'):
            raise ValueError('Operação de camada não suportada.')
        if predicate_name not in ('intersects', 'within', 'contains'):
            raise ValueError('Predicado espacial não suportado.')
        values = list(values)
        dataset = ogr.GetDriverByName('Memory').CreateDataSource('')
        source = self._layer(dataset, 'entrada', values, 'entrada_pos')
        result = dataset.CreateLayer('resultado', geom_type=ogr.wkbUnknown)
        try:
            code = getattr(source, operation)(self.layer, result, options=[
                'SKIP_FAILURES=NO', 'KEEP_LOWER_DIMENSION_GEOMETRIES=YES'])
            if code != ogr.OGRERR_NONE:
                raise ValueError(f'GDAL/OGR: Layer.{operation} falhou ({code}).')
            rows = []
            for feature in result:
                left, right = feature.GetField('entrada_pos'), feature.GetField('base_pos')
                if right is not None and predicate_name != 'intersects' and not predicate(values[left], self.geometries[right], predicate_name):
                    continue
                rows.append((left, right, external(feature.GetGeometryRef())))
            return sorted(rows, key=lambda r: (r[0], r[1] is None, r[1] or 0))
        except RuntimeError as exc:
            raise ValueError(f'GDAL/OGR: Layer.{operation}: {exc}') from exc
        finally:
            result = source = dataset = None


class SpatialJoin:
    """Junção espacial esquerda nativa GDAL/OGR + SQLite/SpatiaLite.

    Apenas posições de linhas atravessam este adaptador. A geometria e os
    atributos originais da demanda permanecem no GeoDataFrame de saída.
    SpatiaLite executa o predicado espacial e consulta seu índice R-tree.
    """
    def __init__(self, geometries):
        self.dataset = ogr.GetDriverByName('SQLite').CreateDataSource(':memory:', options=['SPATIALITE=YES'])
        self._write_layer('base', geometries, 'base_pos')

    def _write_layer(self, name, geometries, field):
        layer = self.dataset.CreateLayer(name, geom_type=ogr.wkbUnknown,
                                        options=['GEOMETRY_NAME=geometry', 'SPATIAL_INDEX=YES'])
        layer.CreateField(ogr.FieldDefn(field, ogr.OFTInteger64))
        layer.StartTransaction()
        for pos, value in enumerate(geometries):
            feature = ogr.Feature(layer.GetLayerDefn())
            feature.SetField(field, pos)
            geom = geometry(value)
            if geom is not None and not geom.IsEmpty(): feature.SetGeometry(geom)
            if layer.CreateFeature(feature) != ogr.OGRERR_NONE:
                raise ValueError('GDAL/OGR: falha ao carregar camada da junção espacial.')
        layer.CommitTransaction()

    def pairs(self, geometries):
        """Inclui (posição da demanda, None) para feições sem correspondência."""
        if self.dataset.GetLayerByName('entrada') is not None:
            self.dataset.DeleteLayer('entrada')
        self._write_layer('entrada', geometries, 'entrada_pos')
        result = None
        try:
            result = self.dataset.ExecuteSQL("""
                SELECT e.entrada_pos, b.base_pos
                FROM entrada AS e
                LEFT JOIN base AS b ON
                    b.ROWID IN (SELECT ROWID FROM SpatialIndex
                                WHERE f_table_name = 'base' AND search_frame = e.geometry)
                    AND ST_Intersects(e.geometry, b.geometry) = 1
                ORDER BY e.entrada_pos, b.base_pos
            """)
            if result is None:
                raise ValueError('GDAL/OGR: a junção espacial não retornou resultado.')
            return [(f.GetField('entrada_pos'), f.GetField('base_pos')) for f in result]
        except RuntimeError as exc:
            raise ValueError(f'GDAL/OGR: falha na junção espacial esquerda: {exc}') from exc
        finally:
            if result is not None: self.dataset.ReleaseResultSet(result)

    def close(self):
        self.dataset = None


def provenance():
    return {'motor':'GDAL/OGR','versao':gdal.VersionInfo('RELEASE_NAME'),
            'junção':'GDAL/OGR SQLite/SpatiaLite LEFT JOIN ST_Intersects', 'overlay':'OGR.Layer.Intersection', 'recorte':'OGR.Layer.Identity','transformacao':'GDAL/OSR'}
