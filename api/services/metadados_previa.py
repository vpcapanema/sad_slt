"""Ficha descritiva calculada sobre a camada integral, nunca sobre sua simplificação."""
from pathlib import Path
import geopandas as gpd
import shapely
from shapely.geometry.polygon import orient
from pyproj import CRS


def descrever_vetor(frame, *, arquivo=None, formato=None, componente=None, campos=None):
    crs = CRS.from_user_input(frame.crs) if frame.crs else None
    fields = campos if campos is not None else [
        {'nome': c, 'tipo': str(frame[c].dtype)} for c in frame.columns if c != frame.geometry.name]
    geometrias = [g for g in frame.geometry if g is not None and not g.is_empty]
    meta = {'feicoes': len(frame), 'vertices': sum(int(shapely.get_num_coordinates(g)) for g in geometrias),
            'tipos_geometria': sorted({g.geom_type for g in geometrias}), 'campos': fields,
            'campos_total': len(fields), 'componente': componente, 'formato': formato,
            'crs': crs.to_string() if crs else None, 'crs_nome': crs.name if crs else None,
            'unidade': crs.axis_info[0].unit_name if crs and crs.axis_info else None, 'avisos': []}
    if arquivo:
        path = Path(arquivo)
        meta['formato'] = formato or path.suffix.lstrip('.').upper()
        if path.is_file():
            meta['bytes'] = path.stat().st_size
            parts = [path]
            if path.suffix.lower() == '.shp':
                parts = [p for p in path.parent.iterdir() if p.stem == path.stem and p.suffix.lower() in {'.shp','.shx','.dbf','.prj','.cpg','.qpj'}]
            meta['bytes_descompactados'] = sum(p.stat().st_size for p in parts)
    if crs and geometrias:
        mapa = frame.to_crs(4326)
        meta['limites_wgs84'] = mapa.total_bounds.tolist()
        geod = CRS.from_epsg(4326).get_geod()
        area, comprimento = 0., 0.
        def partes(g):
            if hasattr(g, 'geoms'):
                for child in g.geoms:
                    yield from partes(child)
            else:
                yield g
        invalidas = 0
        for geometry in mapa.geometry:
            if geometry is None or geometry.is_empty:
                continue
            for g in partes(geometry):
                if not g.is_valid:
                    invalidas += 1
                    continue
                if g.geom_type == 'Polygon':
                    area += abs(geod.geometry_area_perimeter(orient(g, sign=1.))[0])
                elif g.geom_type in ('LineString', 'LinearRing'):
                    comprimento += geod.geometry_length(g)
        meta.update(area_km2=area/1e6, comprimento_km=comprimento/1000)
        if invalidas:
            meta['avisos'].append(f'{invalidas} geometria(s) inválida(s) excluída(s) das medições de área e comprimento.')
        from api.services.extracao_entrada_local import localizacao
        meta['localizacao'] = localizacao(frame)
    return meta


def descrever_geojson(data, *, arquivo=None, formato=None, componente=None, camada_ogr=None):
    # O GeoJSON integral desses leitores já está em WGS84; recupera o CRS original
    # antes de montar a ficha. Não usa a prévia de camadas simplificadas.
    frame = gpd.GeoDataFrame.from_features(data['geojson']['features'], crs=4326)
    if data.get('crs_arquivo'):
        frame = frame.to_crs(data['crs_arquivo'])
    meta = descrever_vetor(frame, arquivo=arquivo, formato=formato, componente=componente, campos=data.get('campos'))
    if camada_ogr is not None:
        camada_ogr.ResetReading()
        vertices, tipos = 0, set()
        for feature in camada_ogr:
            geometry = feature.GetGeometryRef()
            if geometry is not None:
                original = shapely.from_wkb(bytes(geometry.ExportToWkb()))
                vertices += int(shapely.get_num_coordinates(original))
                tipos.add(original.geom_type)
        meta.update(feicoes=camada_ogr.GetFeatureCount(), vertices=vertices, tipos_geometria=sorted(tipos))
    return meta
