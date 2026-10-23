"""Fronteira dos fixtures legados; o serviço recebe exclusivamente camadas OGR."""
from io import BytesIO
import pandas as pd
import geopandas as gpd
from osgeo import ogr
from api.services import analise_territorial_ogr as nativo
from api.services import elegibilidade_processamento as service


def camada(frame):
    if isinstance(frame, nativo.Camada):
        return frame
    buffer = BytesIO()
    frame.to_file(buffer, driver='GPKG', layer='fixture', engine='pyogrio', index=False)
    resultado = nativo.ler(buffer.getvalue(), 'fixture')
    resultado.fids = list(frame.index)
    if frame.crs is None:
        resultado.crs = None
    return resultado


def tabela(dados):
    geometria = gpd.GeoSeries.from_wkb([bytes(g.ExportToWkb()) if g is not None else None for g in dados.geometrias],
                                     crs=dados.crs.ExportToWkt())
    return gpd.GeoDataFrame(dados.registros, geometry=geometria)


def calcular_ogr(entrada, bases, controle, **kwargs):
    return service.calcular(camada(entrada), [(p, n, i, camada(b)) for p, n, i, b in bases], controle, **kwargs)


def geometria(value):
    return ogr.CreateGeometryFromWkb(value.wkb)


def geometrias_preservadas(a, b):
    return service._geometria_preservada(geometria(a), geometria(b))


def normalizar_fixture(frame):
    from api.services.elegibilidade_preparacao import normalizar_frame
    dados, audit = normalizar_frame(camada(frame))
    resultado = tabela(dados)
    resultado.index = frame.index
    return resultado, audit


def serializar_fixture(saida, auditoria, recortes, arquivo, **kwargs):
    saida = camada(saida)
    recortes = [{**{k: None if k != 'geometry' and pd.isna(v) else v for k, v in r.items()},
                 'geometry': r['geometry'] if isinstance(r['geometry'], ogr.Geometry)
                else geometria(r['geometry'])} for r in recortes]
    if auditoria.get('atributos_superficies') and not saida.campos_intersecoes:
        nomes = [n for b in auditoria['atributos_superficies'] for n in b['campos'].values()]
        for n in nomes:
            valores = [r[n] for r in recortes if r.get(n) is not None]
            tipo = ogr.OFTReal if valores and isinstance(valores[0], (int, float)) else ogr.OFTString
            saida.campos_intersecoes.append(nativo.campo(n, tipo))
    return service.serializar(saida, auditoria, recortes, arquivo, **kwargs)
