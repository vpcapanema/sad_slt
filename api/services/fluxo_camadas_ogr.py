"""Validação e metadados comuns entre storage, prévia e bancada, sem DataFrames."""
import json
import re
import unicodedata
from pathlib import Path

from osgeo import ogr, gdal
from api.services import analise_territorial_ogr as dados_ogr

TIPOS = {ogr.wkbPoint: 'Point', ogr.wkbMultiPoint: 'MultiPoint', ogr.wkbLineString: 'LineString',
         ogr.wkbMultiLineString: 'MultiLineString', ogr.wkbPolygon: 'Polygon',
         ogr.wkbMultiPolygon: 'MultiPolygon', ogr.wkbGeometryCollection: 'GeometryCollection'}


def tipo(g):
    return TIPOS.get(ogr.GT_Flatten(g.GetGeometryType()), g.GetGeometryName()) if g is not None else None


def vertices(g):
    return 0 if g is None else g.GetPointCount() + sum(vertices(g.GetGeometryRef(i)) for i in range(g.GetGeometryCount()))


def validar(dados, max_feicoes=None, *, permitir_sem_geometria=False):
    if dados.crs is None:
        raise ValueError('A camada não informa seu CRS. Inclua o .prj ou defina o CRS no arquivo.')
    if not len(dados) or max_feicoes is not None and len(dados) > max_feicoes:
        raise ValueError('A camada está vazia ou excede o limite de feições.')
    if len(dados.registros) != len(dados.geometrias):
        raise ValueError('Quantidade de geometrias e atributos divergente.')
    nomes = [c['nome'].casefold() for c in dados.campos]
    if len(nomes) > 2000 or len(set(nomes)) != len(nomes):
        raise ValueError('A camada deve ter até 2000 campos, sem nomes repetidos.')
    invalidas = 0
    vazias = 0
    for pos, g in enumerate(dados.geometrias):
        fid = dados.fids[pos] if dados.fids else pos
        if g is None or g.IsEmpty() or not vertices(g):
            if permitir_sem_geometria:
                vazias += 1
                continue
            raise ValueError(f'Feição {pos+1} (FID/índice {fid}) sem geometria utilizável. Nenhum registro foi descartado.')
        dados_ogr._coordenadas(g, bool(dados.crs.IsGeographic()))
        if not g.IsValid():
            invalidas += 1
            reparada = g.MakeValid()
            if reparada is None or reparada.IsEmpty() or not vertices(reparada):
                raise ValueError(f'Feição {pos+1} sem geometria utilizável. Nenhum registro foi descartado.')
    mapa = dados_ogr.reproject(dados, 4326)
    avisos = ([f'{invalidas} geometria(s) inválida(s). O original é preservado para análise; confira antes de executar.']
              if invalidas else [])
    if vazias:
        avisos.append(f'{vazias} feição(ões) sem geometria: disponíveis na tabela, não aptas ao processamento.')
    return mapa, avisos


def limites(dados):
    envelopes = [g.GetEnvelope() for g in dados.geometrias if g is not None and not g.IsEmpty()]
    return [min(e[0] for e in envelopes), min(e[2] for e in envelopes),
            max(e[1] for e in envelopes), max(e[3] for e in envelopes)] if envelopes else None


def geojson(dados):
    mapa = dados_ogr.reproject(dados, 4326)
    return {'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'id': str(dados.fids[i] if dados.fids else i),
         'properties': registro, 'geometry': json.loads(g.ExportToJson()) if g is not None else None}
        for i, (registro, g) in enumerate(zip(mapa.registros, mapa.geometrias))]}


def identificacao(dados, fid_nativo=None):
    campos = []
    for c in dados.campos:
        nome = c['nome']
        valores = [r.get(nome) for r in dados.registros if r.get(nome) is not None and str(r[nome]).strip()]
        distintos = len(set(map(str, valores)))
        normal = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode().lower()
        nativo = bool(re.fullmatch(r'(fid|object_?id|ogc_fid|oid|slt_fid_origem)', normal)) or nome == fid_nativo
        campos.append({'nome': nome, 'preenchidos': len(valores), 'distintos': distintos,
                       'repetidos': len(valores)-distintos, 'nulos': len(dados)-len(valores),
                       'amostra': valores[:4], 'id_feicao': nativo,
                       'candidato_demanda': bool(re.search(r'demanda|projeto|empreendimento|intervencao|codigo|cod_|^id$', normal)) and not nativo})
    candidatos = sorted((c for c in campos if c['candidato_demanda'] and not c['nulos']),
                        key=lambda c: (not bool(re.search('demanda|projeto', c['nome'], re.I)), c['nome']))
    return {'total': len(dados), 'campos': campos, 'fid_nativo': fid_nativo,
            'sugestao': candidatos[0]['nome'] if candidatos else '__feicao__', 'completa': True}


def partes(g):
    if g is None or g.IsEmpty():
        return
    if ogr.GT_Flatten(g.GetGeometryType()) in (ogr.wkbGeometryCollection, ogr.wkbMultiPolygon,
                                               ogr.wkbMultiLineString, ogr.wkbMultiPoint):
        for i in range(g.GetGeometryCount()):
            yield from partes(g.GetGeometryRef(i))
    else:
        yield g


def descrever(dados, *, arquivo=None, formato=None, componente=None, consultar_localizacao=True,
              permitir_sem_geometria=False):
    mapa, avisos = validar(dados, permitir_sem_geometria=permitir_sem_geometria)
    srs = dados.crs
    autoridade, codigo = srs.GetAuthorityName(None), srs.GetAuthorityCode(None)
    meta = {'feicoes': len(dados), 'vertices': sum(vertices(g) for g in dados.geometrias),
            'tipos_geometria': sorted({tipo(g) for g in dados.geometrias if g is not None}),
            'campos': [{'nome': c['nome'], 'tipo': ogr.GetFieldTypeName(c['tipo'])} for c in dados.campos],
            'campos_total': len(dados.campos), 'componente': componente or dados.fonte.get('componente'),
            'formato': formato or dados.fonte.get('formato'),
            'crs': f'{autoridade}:{codigo}' if codigo else srs.ExportToWkt(),
            'crs_nome': srs.GetName(), 'crs_wkt': srs.ExportToWkt(),
            'unidade': srs.GetAngularUnitsName() if srs.IsGeographic() else srs.GetLinearUnitsName(),
            'limites_wgs84': limites(mapa), 'avisos': avisos,
            'identificacao': identificacao(dados)}
    area, comprimento = medidas_geodesicas(mapa)
    meta.update(area_km2=area/1e6, comprimento_km=comprimento/1000,
                crs_medicao='EPSG:4326', metodo_medicao='GDAL/OGR SQL: medidas geodésicas WGS84')
    if arquivo:
        meta['bytes'] = arquivo.stat().st_size
        meta['bytes_descompactados'] = dados.fonte.get('bytes_descompactados', meta['bytes'])
    if consultar_localizacao:
        meta['localizacao'] = localizacao(dados)
    return meta


def medidas_geodesicas(mapa):
    """OGR SQL/SpatiaLite mantém medidas no elipsoide também no GDAL 3.8."""
    ds = gdal.GetDriverByName('Memory').Create('', 0, 0, 0, gdal.GDT_Unknown)
    layer = ds.CreateLayer('medidas', dados_ogr.referencia(4326), ogr.wkbUnknown)
    resultado = None
    try:
        for g in mapa.geometrias:
            for p in partes(g):
                if p.IsValid() and p.GetDimension() in (1, 2):
                    feature = ogr.Feature(layer.GetLayerDefn())
                    feature.SetGeometry(p)
                    if layer.CreateFeature(feature) != 0:
                        raise ValueError('GDAL não conseguiu preparar as medidas da camada.')
        resultado = ds.ExecuteSQL(
            'SELECT SUM(CASE WHEN ST_Dimension(geometry)=2 THEN ST_Area(geometry,1) ELSE 0 END), '
            'SUM(CASE WHEN ST_Dimension(geometry)=1 THEN GeodesicLength(geometry) ELSE 0 END) '
            'FROM medidas', dialect='SQLITE')
        if resultado is None:
            raise ValueError('GDAL sem suporte às medidas geodésicas OGR SQL.')
        registro = resultado.GetNextFeature()
        return float(registro.GetField(0) or 0), float(registro.GetField(1) or 0)
    finally:
        if resultado is not None:
            ds.ReleaseResultSet(resultado)
        layer = ds = None


def localizacao(dados):
    geog = dados_ogr.reproject(dados, 4674)
    geometria = ogr.Geometry(ogr.wkbGeometryCollection)
    for g in geog.geometrias:
        geometria.AddGeometry(g if g.IsValid() else g.MakeValid())
    resultado = {'fonte': 'UFs: malha do acervo SICARD; municípios: IBGE 2022',
                 'cobertura': 'UFs: Brasil; municípios: Estado de São Paulo',
                 'municipios': [], 'ufs': [], 'status': 'consultado'}
    ds = layer = None
    try:
        from api.path_policy import project_path
        ds = gdal.OpenEx(str(project_path('database/geo/raw/uf/uf.shp')), gdal.OF_VECTOR)
        if ds is None:
            raise ValueError('Malha de UFs indisponível.')
        layer = ds.GetLayer(0)
        estados = dados_ogr.reproject(dados_ogr.ler_camada(layer), 4674)
        resultado['ufs'] = sorted({r['sigla'] for r, g in zip(estados.registros, estados.geometrias)
                                    if g is not None and g.Intersects(geometria)})
    except Exception:
        resultado['aviso_ufs'] = 'Malha nacional de UFs indisponível; consulta municipal cobre somente SP.'
    finally:
        layer = ds = None
    try:
        from api.db.connection import get_connection
        # O índice do banco limita o transporte aos candidatos do envelope;
        # a interseção exata é avaliada pelo OGR abaixo.
        with get_connection() as conn:
            rows = conn.execute('SELECT cd_mun, nm_mun, sigla_uf, ST_AsBinary(geom) AS wkb '
                                'FROM base_municipal.municipio '
                                'WHERE geom && ST_GeomFromWKB(%s::bytea,4674) ORDER BY nm_mun',
                                (bytes(geometria.ExportToWkb()),)).fetchall()
        for r in rows:
            g = ogr.CreateGeometryFromWkb(bytes(r['wkb'])) if r['wkb'] else None
            if g is not None and g.Intersects(geometria):
                resultado['municipios'].append({k: r[k] for k in ('cd_mun', 'nm_mun', 'sigla_uf')})
        resultado['ufs'] = sorted(set(resultado['ufs']) | {r['sigla_uf'] for r in resultado['municipios']})
        resultado['aviso'] = 'Municípios intersectados pela geometria; a consulta municipal cobre somente SP.'
    except Exception:
        resultado.update(status='parcial' if resultado['ufs'] else 'indisponivel',
                         aviso='Consulta municipal indisponível; o arquivo foi validado.')
    return resultado


def abrir_arquivo(path, camada=None):
    """Mesmo leitor para arquivos simples e subcamadas de pacotes; mantém os FIDs."""
    from api.services.pacote_geoespacial_memoria import COMPACTADOS, componentes, abrir
    if Path(str(getattr(path, 'name', path))).suffix.lower() not in COMPACTADOS:
        ds = gdal.OpenEx(str(path), gdal.OF_VECTOR | gdal.OF_READONLY,
                         allowed_drivers=['GPKG', 'ESRI Shapefile', 'GeoJSON', 'FlatGeobuf',
                                          'KML', 'LIBKML', 'GML'])
        if ds is None:
            raise ValueError('GDAL não conseguiu abrir a fonte vetorial.')
        layer = ds.GetLayerByName(camada) if camada else (ds.GetLayer(0) if ds.GetLayerCount() == 1 else None)
        if layer is None:
            raise ValueError('Selecione uma camada vetorial válida no arquivo.')
        return ds, layer
    if hasattr(path, 'read_bytes'):
        if path.stat().st_size > 16*1024*1024:
            raise ValueError('O pacote excede o limite de leitura em memória de 16 MB.')
        raw = path.read_bytes()
    else:
        handle = gdal.VSIFOpenL(str(path), 'rb')
        if handle is None:
            raise ValueError('GDAL não conseguiu abrir o pacote.')
        try:
            raw = bytes(gdal.VSIFReadL(1, 16*1024*1024+1, handle))
        finally:
            gdal.VSIFCloseL(handle)
        if len(raw) > 16*1024*1024:
            raise ValueError('O pacote excede o limite de leitura em memória de 16 MB.')
    arquivos = componentes(raw, getattr(path, 'name', Path(str(path)).name), 32*1024*1024)
    with abrir(arquivos) as (opcoes, _, _raiz):
        candidatos = [o for o in opcoes if o['tipo'] == 'vetor' and (not camada or o['chave'] == camada)]
        if len(candidatos) != 1:
            raise ValueError('Selecione uma camada vetorial válida dentro do pacote.')
        dados = dados_ogr.ler_camada(candidatos[0]['layer'])
        memoria = gdal.GetDriverByName('Memory').Create('', 0, 0, 0, gdal.GDT_Unknown)
        layer = dados_ogr.gravar_camada(memoria, 'camada', dados, preservar_fids=True)
        memoria.SetMetadataItem('SICARD_FONTE_PACOTE', json.dumps({
            'bytes_descompactados': sum(map(len, arquivos.values())),
            'formato': candidatos[0]['formato'], 'componente': candidatos[0]['arquivo']}))
        return memoria, layer
