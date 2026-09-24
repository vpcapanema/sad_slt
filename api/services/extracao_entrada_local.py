"""Leitura de entrada local exclusivamente em RAM, sem cadastro ou cache de arquivos.

O navegador conserva o arquivo original e o reenvia na execução. GDAL usa
/vsimem durante a leitura; assim os dois workers HTTP não dependem de estado
compartilhado nem de arquivos temporários em disco.
"""
from __future__ import annotations

import base64
import binascii
import io
import json
import logging
from hashlib import sha256
from pathlib import PurePosixPath
from uuid import uuid4
from zipfile import BadZipFile, ZipFile

import geopandas as gpd
import numpy as np
import shapely
from osgeo import gdal, ogr
from pyproj import CRS

from api.db.connection import get_connection
from api.repositories.camada_geoespacial_repository import _json_safe

MAX_ARQUIVO = 16 * 1024 * 1024
MAX_DESCOMPACTADO = 32 * 1024 * 1024
MAX_FEICOES = 50000
MAX_VERTICES = 500000
EXTENSOES = {'.gpkg': 'GPKG', '.shp': 'ESRI Shapefile', '.geojson': 'GeoJSON',
             '.json': 'GeoJSON', '.fgb': 'FlatGeobuf', '.kml': 'KML'}
_log = logging.getLogger(__name__)


def _nome(nome):
    nome = str(nome or '').replace('\\', '/').split('/')[-1]
    if not nome or len(nome) > 200 or any(ord(c) < 32 for c in nome):
        raise ValueError('Nome de arquivo inválido.')
    return nome


def _componentes(conteudo, nome):
    extensao = PurePosixPath(nome).suffix.lower()
    if extensao not in ('.zip', '.kmz'):
        if extensao == '.shp':
            raise ValueError('Envie o Shapefile em ZIP, incluindo .shp, .shx, .dbf e .prj.')
        if extensao not in EXTENSOES:
            raise ValueError('Use GeoPackage, GeoJSON, FlatGeobuf, KML/KMZ ou Shapefile em ZIP.')
        return {nome: conteudo}
    try:
        with ZipFile(io.BytesIO(conteudo)) as arquivo:
            itens = arquivo.infolist()
            if len(itens) > 200 or sum(i.file_size for i in itens) > MAX_DESCOMPACTADO:
                raise ValueError('O ZIP excede o limite de 200 componentes ou 32 MB descompactados.')
            saida = {}
            for item in itens:
                path = PurePosixPath(item.filename.replace('\\', '/'))
                if path.is_absolute() or '..' in path.parts or ':' in str(path) or ((item.external_attr >> 16) & 0o170000) == 0o120000:
                    raise ValueError('O ZIP contém um caminho ou link não permitido.')
                if item.is_dir() or '__MACOSX' in path.parts or path.name.startswith('.'):
                    continue
                if item.flag_bits & 1:
                    raise ValueError('ZIP protegido por senha não é aceito.')
                chave = str(path)
                if chave in saida:
                    raise ValueError('O ZIP contém nomes de arquivos repetidos.')
                if path.suffix.lower() not in {*EXTENSOES, '.shx', '.dbf', '.prj', '.cpg', '.qix', '.sbn', '.sbx', '.qml', '.sld', '.txt', '.xml'}:
                    continue
                saida[chave] = arquivo.read(item)
            return saida
    except (BadZipFile, RuntimeError, NotImplementedError) as exc:
        raise ValueError('Não foi possível descompactar o ZIP. Confira se o arquivo está íntegro e sem senha.') from exc


def validar(frame):
    if frame.crs is None:
        raise ValueError('A camada não informa o sistema de coordenadas. Inclua o .prj no ZIP ou defina o CRS no arquivo.')
    if frame.empty or len(frame) > MAX_FEICOES:
        raise ValueError(f'A entrada deve conter entre 1 e {MAX_FEICOES:,} feições.')
    if len(frame.columns) > 2001:
        raise ValueError('A entrada excede o limite de 2000 campos.')
    if not frame.columns.is_unique:
        raise ValueError('A camada contém nomes de campos repetidos.')
    geometrias = frame.geometry
    coordenadas = shapely.get_coordinates(geometrias.values, include_z=False)
    if len(coordenadas) > MAX_VERTICES:
        raise ValueError('A entrada excede o limite de 500 mil vértices para upload em memória.')
    if not len(coordenadas) or not np.isfinite(coordenadas).all():
        raise ValueError('A camada não contém coordenadas válidas para visualização.')
    mapa = frame.to_crs(4326)
    coords_mapa = shapely.get_coordinates(mapa.geometry.values)
    if not np.isfinite(coords_mapa).all() or np.any(np.abs(coords_mapa[:, 0]) > 180) or np.any(np.abs(coords_mapa[:, 1]) > 90):
        raise ValueError('As coordenadas não correspondem ao CRS declarado no arquivo.')
    invalidas = int(sum(g is not None and not g.is_empty and not g.is_valid for g in geometrias))
    vazias = int(sum(g is None or g.is_empty for g in geometrias))
    avisos = []
    if invalidas:
        avisos.append(f'{invalidas} geometria(s) inválida(s). A prévia preserva o original; confira antes de executar e use as opções de correção do algoritmo.')
    if vazias:
        avisos.append(f'{vazias} feição(ões) sem geometria visível; seus registros foram mantidos.')
    return mapa, avisos


def ler(conteudo: bytes, nome: str, camada: str | None = None):
    """Devolve escolhas de camada ou (frame, metadados). Nunca escreve no disco."""
    nome = _nome(nome)
    if not conteudo or len(conteudo) > MAX_ARQUIVO:
        raise ValueError('Envie um arquivo não vazio de até 16 MB.')
    componentes = _componentes(conteudo, nome)
    raiz = f'/vsimem/entrada-{uuid4().hex}'
    gdal.Mkdir(raiz, 0o700)
    datasets = []
    try:
        for relativo, dados in componentes.items():
            destino = f'{raiz}/{relativo}'
            partes = PurePosixPath(relativo).parts[:-1]
            for i in range(len(partes)):
                gdal.Mkdir(f"{raiz}/{'/'.join(partes[:i+1])}", 0o700)
            gdal.FileFromMemBuffer(destino, dados)
        opcoes = []
        for relativo in componentes:
            extensao = PurePosixPath(relativo).suffix.lower()
            if extensao not in EXTENSOES:
                continue
            # Metadados JSON auxiliares dentro de pacotes não são GeoJSON.
            if extensao in ('.json', '.geojson'):
                try:
                    if json.loads(componentes[relativo]).get('type') not in ('FeatureCollection', 'Feature'):
                        continue
                except (ValueError, AttributeError):
                    if len(componentes) == 1:
                        raise ValueError('GeoJSON inválido.')
                    continue
            if extensao == '.shp':
                radical = str(PurePosixPath(relativo).with_suffix('')).lower()
                nomes = {p.lower() for p in componentes}
                faltando = [ext for ext in ('.shx', '.dbf', '.prj') if radical+ext not in nomes]
                if faltando:
                    raise ValueError(f'Shapefile incompleto: faltam {", ".join(faltando)}.')
            dataset = gdal.OpenEx(f'{raiz}/{relativo}', gdal.OF_VECTOR | gdal.OF_READONLY,
                                 allowed_drivers=[EXTENSOES[extensao]])
            if dataset is None:
                raise ValueError(f'Não foi possível ler a camada em {relativo}.')
            datasets.append(dataset)
            for i in range(dataset.GetLayerCount()):
                layer = dataset.GetLayerByIndex(i)
                if layer.GetGeomType() == ogr.wkbNone:
                    continue
                chave = f'{relativo}::{i}'
                opcoes.append({'chave': chave, 'nome': layer.GetName(), 'arquivo': relativo, 'layer': layer})
        if not opcoes:
            raise ValueError('Nenhuma camada vetorial compatível foi encontrada no arquivo.')
        if len(opcoes) > 1 and not camada:
            return None, {'camadas': [{k:v for k,v in o.items() if k != 'layer'} for o in opcoes]}
        escolha = next((o for o in opcoes if o['chave'] == camada), None) if camada else opcoes[0]
        if escolha is None:
            raise ValueError('A camada escolhida não existe neste arquivo.')
        layer = escolha['layer']
        srs = layer.GetSpatialRef()
        if srs is None:
            raise ValueError('A camada não informa seu CRS. Inclua o .prj ou defina o CRS no arquivo.')
        crs = CRS.from_wkt(srs.ExportToWkt())
        definicao = layer.GetLayerDefn()
        campos = [definicao.GetFieldDefn(i).GetName() for i in range(definicao.GetFieldCount())]
        tipos = [definicao.GetFieldDefn(i).GetTypeName() for i in range(definicao.GetFieldCount())]
        if len(campos) > 2000 or len(set(campos)) != len(campos):
            raise ValueError('A camada deve ter até 2000 campos, sem nomes repetidos.')
        registros, geometrias = [], []
        vertices = 0
        for feature in layer:
            if len(registros) >= MAX_FEICOES:
                raise ValueError('A entrada excede o limite de 50 mil feições.')
            registros.append({c: feature.GetField(i) for i,c in enumerate(campos)})
            geom = feature.GetGeometryRef()
            geometria_lida = shapely.from_wkb(bytes(geom.ExportToWkb())) if geom is not None else None
            vertices += int(shapely.get_num_coordinates(geometria_lida))
            if vertices > MAX_VERTICES:
                raise ValueError('A entrada excede o limite de 500 mil vértices para leitura em memória.')
            geometrias.append(geometria_lida)
        # Não sobrescrever um atributo que já se chama geometry.
        geometria = '__geometria_local__'
        while geometria in campos:
            geometria += '_'
        import pandas as pd
        tabela = pd.DataFrame(registros, columns=campos)
        tabela[geometria] = gpd.GeoSeries(geometrias, crs=crs)
        frame = gpd.GeoDataFrame(tabela, geometry=geometria, crs=crs)
        mapa, avisos = validar(frame)
        geod = CRS.from_epsg(4326).get_geod()
        comprimento = sum(geod.geometry_length(g) for g in mapa.geometry if g is not None and not g.is_empty and g.geom_type in ('LineString','MultiLineString'))
        area = sum(abs(geod.geometry_area_perimeter(g)[0]) for g in mapa.geometry if g is not None and not g.is_empty and g.is_valid and g.geom_type in ('Polygon','MultiPolygon'))
        meta = {'comprimento_km': comprimento/1000, 'area_km2': area/1000000, 'arquivo': nome, 'componente': escolha['arquivo'], 'camada': escolha['chave'],
                'nome_camada': escolha['nome'], 'formato': EXTENSOES[PurePosixPath(escolha['arquivo']).suffix.lower()],
                'bytes': len(conteudo), 'bytes_descompactados': sum(map(len, componentes.values())),
                'sha256': sha256(conteudo).hexdigest(), 'feicoes': len(frame), 'campos_total': len(campos),
                'tipos_geometria': sorted(set(frame.geom_type.dropna())), 'crs': crs.to_string(),
                'crs_nome': crs.name, 'crs_wkt': crs.to_wkt(),
                'unidade': crs.axis_info[0].unit_name if crs.axis_info else None,
                'limites_wgs84': mapa.total_bounds.tolist(), 'avisos': avisos,
                'campos': [{'nome': c, 'tipo': t} for c,t in zip(campos, tipos)]}
        return frame, meta
    except (RuntimeError, UnicodeError) as exc:
        raise ValueError('Falha ao ler o arquivo vetorial. Verifique sua integridade, formato e codificação.') from exc
    finally:
        # Layer referencia seu dataset; liberar ambos antes de remover os buffers.
        if 'opcoes' in locals():
            opcoes.clear()
        layer = None
        escolha = None
        feature = None
        geom = None
        datasets.clear()
        dataset = None
        gdal.RmdirRecursive(raiz)


def localizacao(frame):
    """Consulta espacial somente de leitura, com cobertura explicitamente informada."""
    geometrias = frame.to_crs(4674).geometry
    validas = [shapely.make_valid(g) if not g.is_valid else g for g in geometrias if g is not None and not g.is_empty]
    consulta = shapely.GeometryCollection(validas).wkb
    resultado = {'fonte': 'IBGE · Malha municipal 2022', 'cobertura': 'Estado de São Paulo',
                 'municipios': [], 'ufs': [], 'status': 'consultado'}
    try:
        import pyogrio
        from api.path_policy import project_path
        estados = pyogrio.read_dataframe(project_path('database/geo/raw/uf/uf.shp'), bbox=tuple(frame.to_crs(4674).total_bounds))
        geometria = shapely.GeometryCollection(validas)
        encontrados = estados.loc[estados.geometry.intersects(geometria)]
        resultado['ufs'] = sorted(set(encontrados['sigla']))
        resultado['cobertura'] = 'UFs: Brasil; municípios: Estado de São Paulo'
        resultado['fonte'] = 'UFs: malha do acervo SICARD; municípios: IBGE 2022'
    except Exception:
        resultado['aviso_ufs'] = 'Malha nacional de UFs indisponível; UF será identificada apenas pela consulta municipal de SP.'
    try:
        with get_connection() as conn:
            rows = conn.execute('''SELECT cd_mun, nm_mun, sigla_uf FROM base_municipal.municipio
                WHERE ST_Intersects(geom, ST_GeomFromWKB(%s::bytea,4674)) ORDER BY nm_mun''', (consulta,)).fetchall()
        resultado['municipios'] = [dict(r) for r in rows]
        resultado['ufs'] = sorted(set(resultado['ufs']) | {r['sigla_uf'] for r in rows})
        if not rows:
            resultado['aviso'] = 'Nenhum município intersectado na malha disponível de SP. Localizações fora dessa cobertura não foram verificadas.'
        else:
            resultado['aviso'] = 'Municípios intersectados pela geometria; a consulta de municípios cobre somente SP.'
    except Exception:
        _log.warning('Consulta cadastral da entrada local indisponível', exc_info=False)
        resultado.update(status='parcial' if resultado['ufs'] else 'indisponivel', aviso='A consulta municipal está indisponível. O arquivo foi validado; municípios não foram confirmados.')
    return resultado


def previa(conteudo, nome, camada=None):
    frame, meta = ler(conteudo, nome, camada)
    if frame is None:
        return meta
    meta['localizacao'] = localizacao(frame)
    return {'id': f'local:{uuid4().hex}', 'nome': meta['nome_camada'], 'origem': 'local',
            'origem_geometria': 'memoria', 'crs_arquivo': meta['crs'], 'campos': meta['campos'],
            'metadados_local': meta,
            'geojson': json.loads(frame.to_crs(4326).to_json(default=_json_safe))}


def restaurar(payload):
    texto = payload.get('conteudo_base64', '')
    if len(texto) > (MAX_ARQUIVO + 2) // 3 * 4:
        raise ValueError('A entrada local excede o limite de 16 MB.')
    try:
        conteudo = base64.b64decode(texto, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError('Conteúdo da entrada local inválido.') from exc
    frame, meta = ler(conteudo, payload.get('nome'), payload.get('camada'))
    if frame is None:
        raise ValueError('Escolha a camada do arquivo antes de executar.')
    return frame, meta
