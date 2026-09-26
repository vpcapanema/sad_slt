"""Leitura de entrada local exclusivamente em RAM, sem cadastro ou cache de arquivos.

O navegador conserva o arquivo original e o reenvia na execução. GDAL usa
/vsimem durante a leitura; assim os dois workers HTTP não dependem de estado
compartilhado nem de arquivos temporários em disco.
"""
from __future__ import annotations

import base64
import binascii
import json
import logging
from hashlib import sha256
from pathlib import PurePosixPath
from uuid import uuid4

import geopandas as gpd
import numpy as np
import shapely
from osgeo import gdal
from pyproj import CRS

from api.db.connection import get_connection
from api.repositories.camada_geoespacial_repository import _json_safe

MAX_ARQUIVO = 16 * 1024 * 1024
MAX_DESCOMPACTADO = 32 * 1024 * 1024
MAX_FEICOES = 50000
MAX_VERTICES_PREVIA = 100000
LOTE_VALIDACAO = 256
_log = logging.getLogger(__name__)


def _nome(nome):
    nome = str(nome or '').replace('\\', '/').split('/')[-1]
    if not nome or len(nome) > 200 or any(ord(c) < 32 for c in nome):
        raise ValueError('Nome de arquivo inválido.')
    return nome


def _componentes(conteudo, nome):
    from api.services.pacote_geoespacial_memoria import componentes, COMPACTADOS, VETORES, RASTERS
    ext = PurePosixPath(nome).suffix.lower()
    if ext == '.shp':
        raise ValueError('Envie o Shapefile em ZIP, RAR ou 7z, incluindo .shp, .shx, .dbf e .prj.')
    if ext not in {*COMPACTADOS, *VETORES, *RASTERS}:
        raise ValueError('Use GeoPackage, GeoJSON, File Geodatabase compactada, vetor ou raster compatível; pacotes ZIP, RAR, 7z, TAR, GZ, BZ2 e XZ.')
    return componentes(conteudo, nome, MAX_DESCOMPACTADO)


def _coordenadas_validas(geometrias, geograficas=False):
    total = 0
    for inicio in range(0, len(geometrias), LOTE_VALIDACAO):
        coords = shapely.get_coordinates(geometrias.iloc[inicio:inicio + LOTE_VALIDACAO].values)
        total += len(coords)
        if not np.isfinite(coords).all():
            return False
        if geograficas and (np.any(np.abs(coords[:, 0]) > 180) or np.any(np.abs(coords[:, 1]) > 90)):
            return False
    return total > 0


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
    if not _coordenadas_validas(geometrias):
        raise ValueError('A camada não contém coordenadas válidas para visualização.')
    mapa = frame.to_crs(4326)
    if not _coordenadas_validas(mapa.geometry, geograficas=True):
        raise ValueError('As coordenadas não correspondem ao CRS declarado no arquivo.')
    invalidas = int(sum(g is not None and not g.is_empty and not g.is_valid for g in geometrias))
    vazias = int(sum(g is None or g.is_empty for g in geometrias))
    avisos = []
    if invalidas:
        avisos.append(f'{invalidas} geometria(s) inválida(s). O original é preservado para análise; confira antes de executar e use as opções de correção do algoritmo.')
    if vazias:
        avisos.append(f'{vazias} feição(ões) sem geometria visível; seus registros foram mantidos.')
    return mapa, avisos


def ler(conteudo: bytes, nome: str, camada: str | None = None):
    from pyproj.exceptions import ProjError
    try:
        return _ler(conteudo, nome, camada)
    except (RuntimeError, ProjError, UnicodeError) as exc:
        raise ValueError('Não foi possível ler a camada. Verifique integridade, codificação e sistema de coordenadas (CRS).') from exc


def _ler(conteudo: bytes, nome: str, camada: str | None = None):
    """Devolve escolhas de camada ou (frame, metadados). Nunca escreve no disco."""
    nome = _nome(nome)
    if not conteudo or len(conteudo) > MAX_ARQUIVO:
        raise ValueError('Envie um arquivo não vazio de até 16 MB.')
    componentes = _componentes(conteudo, nome)
    from api.services.pacote_geoespacial_memoria import abrir, inventario
    with abrir(componentes) as (opcoes, avisos_pacote, raiz):
        lista = inventario(opcoes)
        if len(opcoes) > 1 and not camada:
            return None, {'camadas': lista, 'avisos': avisos_pacote}
        escolha = next((o for o in opcoes if o['chave'] == camada), None) if camada else opcoes[0]
        if escolha is None:
            raise ValueError('A camada escolhida não existe neste arquivo.')
        if escolha['tipo'] == 'raster':
            return None, _previa_raster(escolha, nome, conteudo, componentes, avisos_pacote, raiz)
        return _ler_vetor(escolha, nome, conteudo, componentes, avisos_pacote)


def _ler_vetor(escolha, nome, conteudo, componentes, avisos_pacote, progresso=None):
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
    fid_campo = 'slt_fid_origem'
    while fid_campo in campos:
        fid_campo += '_'
    campos.append(fid_campo)
    tipos.append('Integer64')
    registros, geometrias = [], []
    vertices = 0
    total_leitura = layer.GetFeatureCount() if progresso else 0
    for feature in layer:
        if progresso and len(registros) % LOTE_VALIDACAO == 0:
            progresso(len(registros), total_leitura)
        if len(registros) >= MAX_FEICOES:
            raise ValueError('A entrada excede o limite de 50 mil feições.')
        registros.append({**{c: feature.GetField(i) for i,c in enumerate(campos[:-1])}, fid_campo:feature.GetFID()})
        geom = feature.GetGeometryRef()
        geometria_lida = shapely.from_wkb(bytes(geom.ExportToWkb())) if geom is not None else None
        vertices += int(shapely.get_num_coordinates(geometria_lida))
        geometrias.append(geometria_lida)
    if progresso: progresso(len(registros), total_leitura)
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
            'nome_camada': escolha['nome'], 'formato': escolha['formato'], 'tipo': 'vetor',
            'bytes': len(conteudo), 'bytes_descompactados': sum(map(len, componentes.values())),
            'sha256': sha256(conteudo).hexdigest(), 'vertices': vertices, 'feicoes': len(frame), 'campos_total': len(campos),
            'tipos_geometria': sorted(set(frame.geom_type.dropna())), 'crs': crs.to_string(),
            'crs_nome': crs.name, 'crs_wkt': crs.to_wkt(),
            'unidade': crs.axis_info[0].unit_name if crs.axis_info else None,
            'limites_wgs84': mapa.total_bounds.tolist(), 'avisos': avisos_pacote + avisos,
            'campos': [{'nome': c, 'tipo': t} for c,t in zip(campos, tipos)]}
    from api.services.extracao_identificacao import inspecionar
    meta['identificacao'] = inspecionar(frame, fid_campo)
    return frame, meta

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


def _representacao_mapa(frame, limite):
    """Reduz somente uma cópia em WGS84. Nunca usada pelos algoritmos de análise."""
    mapa = frame.to_crs(4326).copy()
    originais = mapa.geometry.values
    total = int(shapely.get_num_coordinates(originais).sum())
    # Não eliminar registros para cumprir o orçamento de desenho.
    limite = max(limite, 5 * len(frame))
    metodo = 'original'
    tolerancia = 0.0
    if total > limite:
        oeste, sul, leste, norte = mapa.total_bounds
        tolerancia = max(leste - oeste, norte - sul, 1e-6) / max(4096, limite * 2)
        for _ in range(14):
            try:
                geometrias = shapely.simplify(originais, tolerancia, preserve_topology=True)
            except shapely.errors.GEOSException:
                mapa.geometry = shapely.envelope(originais)
                metodo = 'limites'
                break
            if int(shapely.get_num_coordinates(geometrias).sum()) <= limite:
                mapa.geometry = geometrias
                metodo = 'simplificada'
                break
            tolerancia *= 2
        else:
            # MultiPoint ou ilhas/anéis irredutíveis: limites de cada feição,
            # explicitamente identificados como aproximação, sem invalidar o original.
            mapa.geometry = shapely.envelope(originais)
            metodo = 'limites'
    return json.loads(mapa.to_json(default=_json_safe)), {
        'metodo': metodo, 'vertices_originais': total,
        'vertices_exibidos': int(shapely.get_num_coordinates(mapa.geometry.values).sum()),
        'tolerancia_graus': tolerancia if metodo == 'simplificada' else None,
    }


def _camada_previa(frame, meta, limite=MAX_VERTICES_PREVIA):
    meta['localizacao'] = localizacao(frame)
    geojson, detalhe = _representacao_mapa(frame, limite)
    meta['previa'] = detalhe
    resultado = {'id': f'local:{uuid4().hex}', 'nome': meta['nome_camada'], 'origem': 'local',
            'tipo': 'vetor', 'origem_geometria': 'memoria', 'crs_arquivo': meta['crs'], 'campos': meta['campos'],
            'metadados_local': meta, 'geojson': geojson}
    if detalhe['metodo'] != 'original':
        resumo, info = _representacao_mapa(frame, max(1, limite // 10))
        resultado['geojson_resumido'] = resumo
        meta['previa']['nivel_resumido'] = info
        meta['avisos'].append('Prévia aproximada: o mapa alterna o nível de detalhe conforme o zoom. '
                             'A análise usa todas as coordenadas e atributos do arquivo original. '
                             + ('A representação usa os limites das feições.' if detalhe['metodo'] == 'limites' else ''))
    return resultado


def _lote(conteudo, nome, com_previa=True, selecionadas=None, progresso=None):
    """Abre uma vez, valida todas e isola falhas sem descartar as outras camadas."""
    from api.services.pacote_geoespacial_memoria import abrir
    from pyproj.exceptions import ProjError
    nome = _nome(nome)
    if not conteudo or len(conteudo) > MAX_ARQUIVO:
        raise ValueError('Envie um arquivo não vazio de até 16 MB.')
    componentes = _componentes(conteudo, nome)
    itens, vetores = [], []
    feicoes = 0
    campos_conjunto = set()
    with abrir(componentes, incluir_invalidas=True) as (opcoes, avisos, raiz):
        if selecionadas is not None:
            chaves = {opcao['chave'] for opcao in opcoes}
            if not set(selecionadas) <= chaves:
                raise ValueError('Uma camada da bancada não existe no arquivo enviado.')
            opcoes = [opcao for opcao in opcoes if opcao['chave'] in selecionadas]
        limite_previa = max(1, MAX_VERTICES_PREVIA // max(1, sum(o['tipo'] == 'vetor' for o in opcoes)))
        for indice, escolha in enumerate(opcoes):
            if progresso: progresso(indice, len(opcoes), f"Validando {escolha['nome']} ({indice+1}/{len(opcoes)})")
            item = {k: v for k, v in escolha.items() if k not in ('layer', 'raster')}
            try:
                if escolha.get('erro'):
                    raise ValueError(escolha['erro'])
                if escolha['tipo'] == 'raster':
                    previa = _previa_raster(escolha, nome, conteudo, componentes, [], raiz) if com_previa else None
                    if previa:
                        item.update(previa)
                        if not previa.get('geojson'):
                            raise ValueError('Raster sem CRS ou georreferenciamento válido para o mapa.')
                else:
                    frame, meta = _ler_vetor(escolha, nome, conteudo, componentes, [],
                        (lambda feitas, total: progresso(indice, len(opcoes), f"Lendo feições de {escolha['nome']}: {feitas}/{total if total >= 0 else '?'}", feitas/total*100 if total > 0 else None)) if progresso else None)
                    if progresso: progresso(indice, len(opcoes), f"Preparando prévia e metadados de {escolha['nome']}")
                    if feicoes + len(frame) > MAX_FEICOES:
                        raise ValueError('O conjunto ultrapassa 50 mil feições. Esta camada não foi incluída; divida o arquivo para processar o restante.')
                    novos_campos = set(frame.columns) - {frame.geometry.name}
                    if len(campos_conjunto | novos_campos) > 1999:
                        raise ValueError('O conjunto ultrapassa 1999 atributos mais o campo de origem. Esta camada não foi incluída.')
                    # Compatibilidade das camadas no CRS comum também faz parte da validação.
                    if vetores:
                        frame_comum = frame.to_crs(vetores[0][0].crs)
                        if not _coordenadas_validas(frame_comum.geometry):
                            raise ValueError('Não foi possível transformar esta camada para o CRS comum da entrada.')
                    if com_previa:
                        item.update(_camada_previa(frame, meta, limite_previa))
                    else:
                        item['metadados_local'] = meta
                    campos_conjunto |= novos_campos
                    feicoes += len(frame)
                    vetores.append((frame, meta))
                item['status_validacao'] = 'valida'
            except (ValueError, RuntimeError, ProjError, UnicodeError) as exc:
                item.update(status_validacao='invalida', erro=('CRS ausente ou inválido: não foi possível transformar as coordenadas.' if isinstance(exc, ProjError) else str(exc) or 'Falha ao validar a camada.'))
                item.pop('geojson', None); item.pop('imagem', None)
            itens.append(item)
            if progresso: progresso(indice+1, len(opcoes), f"{escolha['nome']}: {'validada' if item['status_validacao'] == 'valida' else 'não validada'}")
    return itens, vetores, avisos


def _agrupar_vetores(vetores, nome):
    """Uma entrada lógica contém todas as feições válidas, com origem identificada."""
    if not vetores:
        return None, None
    if len(vetores) == 1:
        frame, meta = vetores[0]
        frame.attrs['sicard_partes'] = [{'chave':meta['camada'], 'nome':meta['nome_camada'], 'campos':list(frame.columns)}]
        return frame, meta
    import pandas as pd
    campos = set().union(*(set(f.columns) - {f.geometry.name} for f, _ in vetores))
    origem = 'slt_camada_origem'
    while origem in campos:
        origem += '_'
    geometria = '__geometria_local__'
    while geometria in campos or geometria == origem:
        geometria += '_'
    frames = []
    crs = vetores[0][0].crs
    for frame, meta in vetores:
        frame = frame.to_crs(crs).copy()
        if frame.geometry.name != geometria:
            frame = frame.rename_geometry(geometria)
        frame[origem] = meta['camada']
        frames.append(frame)
    conjunto = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry=geometria, crs=crs)
    meta = {**vetores[0][1], 'nome_camada': nome, 'camada': None, 'componente': nome,
            'vertices': sum(m['vertices'] for _,m in vetores), 'feicoes': len(conjunto), 'camadas_total': len(vetores), 'campo_origem': origem,
            'area_km2': sum(m['area_km2'] for _,m in vetores),
            'comprimento_km': sum(m['comprimento_km'] for _,m in vetores),
            'campos_total': len(conjunto.columns)-1,
            'campos': [{'nome': c, 'tipo': str(conjunto[c].dtype)} for c in conjunto.columns if c != geometria],
            'tipos_geometria': sorted(set(conjunto.geom_type.dropna())),
            'limites_wgs84': conjunto.to_crs(4326).total_bounds.tolist(),
            'camadas_origem': [{'camada': m['camada'], 'nome': m['nome_camada'], 'crs': m['crs'], 'feicoes': len(f)} for f,m in vetores]}
    conjunto.attrs['sicard_campo_origem'] = origem
    conjunto.attrs['sicard_partes'] = [{'chave':m['camada'], 'nome':m['nome_camada'], 'campos':[c for c in f.columns if c != f.geometry.name]} for f,m in vetores]
    return conjunto, meta


def previa(conteudo, nome, camada=None, progresso=None):
    # Compatibilidade com execuções antigas que identificam uma camada individual.
    if camada:
        frame, meta = ler(conteudo, nome, camada)
        return _camada_previa(frame, meta) if frame is not None else meta
    itens, vetores, avisos = _lote(conteudo, nome, progresso=progresso)
    frame, meta = _agrupar_vetores(vetores, nome)
    entrada = None
    if frame is not None:
        entrada = {'id': f'local:{uuid4().hex}', 'nome': meta['nome_camada'], 'origem': 'local',
                   'tipo': 'vetor', 'origem_geometria': 'memoria', 'crs_arquivo': meta['crs'],
                   'campos': meta['campos'], 'metadados_local': meta,
                   'geojson': {'type': 'FeatureCollection', 'features': [
                       {**f, 'properties': {**f['properties'], **({meta['campo_origem']: item['chave']} if meta.get('campo_origem') else {})}}
                       for item in itens if item.get('tipo') == 'vetor' and item.get('status_validacao') == 'valida'
                       for f in item['geojson']['features']]}}
    validas = sum(i['status_validacao'] == 'valida' for i in itens)
    return {'arquivo': nome, 'camadas': itens, 'entrada': entrada, 'avisos': avisos,
            'resumo': {'total': len(itens), 'validas': validas, 'invalidas': len(itens)-validas,
                       'vetores': len(vetores), 'rasters': sum(i['tipo']=='raster' and i['status_validacao']=='valida' for i in itens)}}


def restaurar(payload):
    texto = payload.get('conteudo_base64', '')
    if len(texto) > (MAX_ARQUIVO + 2) // 3 * 4:
        raise ValueError('A entrada local excede o limite de 16 MB.')
    try:
        conteudo = base64.b64decode(texto, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError('Conteúdo da entrada local inválido.') from exc
    selecionadas = payload.get('camadas')
    if selecionadas is not None:
        if (not isinstance(selecionadas, list) or not selecionadas
                or any(not isinstance(c, str) or not c or len(c) > 1000 for c in selecionadas)
                or len(set(selecionadas)) != len(selecionadas)):
            raise ValueError('Informe as camadas de entrada presentes na bancada, sem repetições.')
        if payload.get('camada'):
            raise ValueError('Informe uma camada ou uma lista de camadas, não ambas.')
    if payload.get('camada'):
        frame, meta = ler(conteudo, payload.get('nome'), payload['camada'])
    else:
        itens, vetores, _ = _lote(conteudo, payload.get('nome'), com_previa=False, selecionadas=selecionadas)
        if selecionadas is not None and any(i['status_validacao'] != 'valida' or i['tipo'] != 'vetor' for i in itens):
            raise ValueError('Uma camada da bancada não é um vetor válido. Valide novamente o arquivo antes de executar.')
        frame, meta = _agrupar_vetores(vetores, payload.get('nome'))
    if frame is None:
        raise ValueError('Escolha uma camada vetorial: os algoritmos de extração atuais não processam rasters.')
    return frame, meta


def _previa_raster(escolha, nome, conteudo, componentes, avisos, raiz):
    """Inspeciona bandas e pixels sem converter a matriz em feições de análise."""
    raster = escolha['raster']
    wkt = raster.GetProjection()
    crs = CRS.from_wkt(wkt) if wkt else None
    transform = raster.GetGeoTransform(can_return_null=True)
    bandas = [{'banda': i, 'tipo': gdal.GetDataTypeName(raster.GetRasterBand(i).DataType),
               'nodata': _json_safe(raster.GetRasterBand(i).GetNoDataValue())}
              for i in range(1, raster.RasterCount + 1)]
    meta = dict(arquivo=nome, componente=escolha['arquivo'], camada=escolha['chave'],
                nome_camada=escolha['nome'], formato=escolha['formato'], tipo='raster',
                bytes=len(conteudo), bytes_descompactados=sum(map(len, componentes.values())),
                largura=raster.RasterXSize, altura=raster.RasterYSize, bandas=bandas,
                crs=crs.to_string() if crs else None, crs_nome=crs.name if crs else None,
                resolucao=list(transform[1::4]) if transform else None,
                avisos=list(avisos), sha256=sha256(conteudo).hexdigest())
    resultado = {'tipo': 'raster', 'compativel_extracao': False, 'metadados_local': meta,
                 'mensagem': 'Raster identificado. Os algoritmos desta página exigem camadas vetoriais; não convertemos pixels em feições automaticamente.'}
    if crs and transform:
        from shapely.geometry import Polygon
        corners = [gdal.ApplyGeoTransform(transform, x, y) for x,y in
                   [(0,0),(raster.RasterXSize,0),(raster.RasterXSize,raster.RasterYSize),(0,raster.RasterYSize)]]
        frame = gpd.GeoDataFrame(geometry=[Polygon(corners)], crs=crs)
        mapa = frame.to_crs(4326)
        if not np.isfinite(mapa.total_bounds).all():
            raise ValueError('Extensão ou CRS inválido no raster.')
        meta['limites_wgs84'] = mapa.total_bounds.tolist()
        meta['localizacao'] = localizacao(frame)
        resultado['geojson'] = json.loads(mapa.to_json())
        # Miniatura limitada a 512x512; nenhuma leitura integral da matriz.
        preview = png = None
        caminho_previa = f'{raiz}/previa-{uuid4().hex}'
        try:
            preview = gdal.Warp(caminho_previa+'.tif', raster, format='GTiff', dstSRS='EPSG:4326',
                                width=512, height=512, resampleAlg='near', warpMemoryLimit=16)
            if preview:
                pngpath = caminho_previa+'.png'
                bands = [1,2,3] if preview.RasterCount >= 3 else [1]
                png = gdal.Translate(pngpath, preview, format='PNG', outputType=gdal.GDT_Byte,
                                     bandList=bands, scaleParams=[[]])
                png = None
                f = gdal.VSIFOpenL(pngpath, 'rb')
                try:
                    raw = gdal.VSIFReadL(1, gdal.VSIStatL(pngpath).size, f)
                    resultado['imagem'] = 'data:image/png;base64,' + base64.b64encode(raw).decode()
                finally:
                    gdal.VSIFCloseL(f)
        except RuntimeError:
            meta['avisos'].append('Miniatura indisponível; exibindo a extensão geográfica do raster.')
        finally:
            preview = png = None
    else:
        meta['avisos'].append('Raster sem CRS ou georreferenciamento: a localização e a miniatura no mapa não puderam ser confirmadas.')
    return resultado
