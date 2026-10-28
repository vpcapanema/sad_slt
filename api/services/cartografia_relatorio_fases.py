"""Cartografia de contexto para os PDFs; nunca recalcula índices das demandas."""
from __future__ import annotations

import colorsys
from io import BytesIO
import math
from numbers import Real

import numpy as np
from osgeo import gdal, ogr
from PIL import Image, ImageColor
from shapely import from_wkb, make_valid
from shapely.geometry import shape

from api.services import analise_territorial_ogr as nativo, storage_geoespacial as storage
from api.services import favorabilidade_raster

LIMITE_SP = 'storage:base-geoespacial/vetor/uf_sp.gpkg'
LARGURA, ALTURA = 1400, 1000
VIRIDIS = ('#440154', '#3b528b', '#21918c', '#5ec962', '#fde725')
SEM_DADOS = '#d1d5db'
TEXTURAS = ('diagonal', 'diagonal_inversa', 'cruzada', 'horizontal', 'pontos')


def _simbolo_rgba(cor, textura, largura, altura):
    y, x = np.indices((altura, largura))
    rgb = np.array(ImageColor.getrgb(cor))
    rgba = np.empty((altura, largura, 4), dtype=np.uint8)
    if textura:
        # Gradação cartográfica, sem significado de intensidade ou gravidade.
        fator = (.17 + .24 * y / max(1, altura - 1))[..., None]
        rgba[:, :, :3] = 255 * (1 - fator) + rgb * fator
        padroes = {
            'diagonal': (x + y) % 14 < 2,
            'diagonal_inversa': (x - y) % 14 < 2,
            'cruzada': ((x + y) % 18 < 2) | ((x - y) % 18 < 2),
            'horizontal': y % 12 < 2,
            'pontos': ((x % 12 - 6) ** 2 + (y % 12 - 6) ** 2) <= 5,
        }
        rgba[padroes[textura], :3] = rgb
        rgba[:, :, 3] = np.where(padroes[textura], 225, 125)
    else:
        rgba[:, :, :3] = rgb
        rgba[:, :, 3] = 180
    return rgba


def amostra_simbolo(cor, textura=None):
    imagem = Image.new('RGBA', (84, 36), 'white')
    imagem.alpha_composite(Image.fromarray(_simbolo_rgba(cor, textura, 84, 36)))
    return imagem.convert('RGB')


def _pintar_simbolo(imagem, mascara, cor, textura):
    rgba = _simbolo_rgba(cor, textura, LARGURA, ALTURA)
    rgba[:, :, 3] = (rgba[:, :, 3].astype(np.uint16) * mascara // 255).astype(np.uint8)
    imagem.alpha_composite(Image.fromarray(rgba))


def cores_camadas(campos):
    """Cores distintas, sem reciclar uma paleta curta entre camadas."""
    return {ident: '#%02x%02x%02x' % tuple(round(v * 255) for v in colorsys.hsv_to_rgb(
        (0.57 + pos * 0.61803398875) % 1, .7, .72))
        for pos, ident in enumerate(sorted({c['id'] for c in campos}))}


def _geometrias(camada):
    return [from_wkb(bytes(g.ExportToWkb())) for g in camada.geometrias]


def limite_sp():
    camada = nativo.carregar_referencia(LIMITE_SP)
    if not isinstance(camada, nativo.Camada) or not len(camada):
        raise ValueError('O limite oficial de São Paulo não contém geometria.')
    camada = nativo.reproject(camada, 5880)
    from shapely import union_all
    limite = union_all(_geometrias(camada))
    if limite.is_empty or not limite.is_valid or limite.area <= 0:
        raise ValueError('O limite oficial de São Paulo é inválido para os mapas.')
    return limite


def _queimar(geometrias, gt, valores=None):
    dataset = gdal.GetDriverByName('MEM').Create('', LARGURA, ALTURA, 1,
                                                gdal.GDT_Float64 if valores is not None else gdal.GDT_Byte)
    dataset.SetGeoTransform(gt)
    dataset.SetProjection(nativo.referencia(5880).ExportToWkt())
    memoria = ogr.GetDriverByName('Memory').CreateDataSource('')
    layer = memoria.CreateLayer('geometrias', nativo.referencia(5880), ogr.wkbUnknown)
    if valores is not None:
        dataset.GetRasterBand(1).Fill(float('nan'))
        layer.CreateField(ogr.FieldDefn('indice', ogr.OFTReal))
    for pos, geom in enumerate(geometrias):
        if geom.is_empty:
            continue
        feature = ogr.Feature(layer.GetLayerDefn())
        feature.SetGeometry(ogr.CreateGeometryFromWkb(geom.wkb))
        if valores is not None:
            feature.SetField('indice', valores[pos])
        if layer.CreateFeature(feature) != 0:
            raise ValueError('Não foi possível preparar a geometria do mapa.')
    if layer.GetFeatureCount():
        opcoes = ['ALL_TOUCHED=TRUE'] + (['ATTRIBUTE=indice'] if valores is not None else [])
        if gdal.RasterizeLayer(dataset, [1], layer, burn_values=[255], options=opcoes) != 0:
            raise ValueError('Falha ao desenhar as geometrias no mapa.')
    resultado = dataset.ReadAsArray()
    dataset.Close()
    return resultado


def _mascara(geometrias, gt):
    return _queimar(geometrias, gt)


def _pintar(imagem, geometrias, gt, cor, opacidade=255):
    mascara = _mascara(geometrias, gt)
    alfa = Image.fromarray((mascara.astype(np.uint16) * opacidade // 255).astype(np.uint8))
    camada = Image.new('RGBA', imagem.size, ImageColor.getrgb(cor) + (0,))
    camada.putalpha(alfa)
    imagem.alpha_composite(camada)


def _revisao(base):
    if not base['id'].startswith('storage:'):
        return None
    caminho, _ = storage.separar_id(base['id'])
    stat = storage.resolver(caminho).stat()
    revisao = f'{stat.st_mtime_ns}-{stat.st_size}'
    esperada = base.get('revisao_fonte') or base.get('raster', {}).get('revisao_fonte')
    if esperada and esperada != revisao:
        raise ValueError(f'{base["nome"]}: a fonte mudou desde o processamento; o mapa não será emitido com outra versão.')
    return revisao


def _vetor(base, limite):
    antes = _revisao(base)
    camada = nativo.carregar_referencia(base['id'])
    if not isinstance(camada, nativo.Camada) or camada.crs is None:
        raise ValueError(f'{base["nome"]}: fonte vetorial com CRS necessária para o mapa completo.')
    camada = nativo.reproject(camada, 5880)
    if _revisao(base) != antes:
        raise ValueError(f'{base["nome"]}: a fonte mudou durante a leitura do mapa.')
    geometrias, registros = [], []
    reparadas = 0
    for geom, registro in zip(_geometrias(camada), camada.registros):
        if not geom.is_valid:
            geom = make_valid(geom)
            reparadas += 1
            if geom.is_empty or not geom.is_valid:
                raise ValueError(f'{base["nome"]}: geometria inválida sem reparação cartográfica utilizável.')
        if geom.intersects(limite):
            geometrias.append(geom.intersection(limite))
            registros.append(registro)
    return geometrias, registros, antes, reparadas


def _cores_indices(valores, validos):
    if np.any(validos & (~np.isfinite(valores) | (valores < 0) | (valores > 1))):
        raise ValueError('A superfície contém índices inválidos no domínio cartográfico de São Paulo (exige 0 a 1).')
    resultado = np.empty((*valores.shape, 4), dtype=np.uint8)
    resultado[:, :, :3] = ImageColor.getrgb(SEM_DADOS)
    resultado[:, :, 3] = 255
    escala = np.where(validos, valores, 0) * (len(VIRIDIS) - 1)
    inicio = np.minimum(escala.astype(int), len(VIRIDIS) - 2)
    fracao = escala - inicio
    cores = np.array([ImageColor.getrgb(c) for c in VIRIDIS])
    rgb = np.floor(cores[inicio] * (1 - fracao[..., None]) + cores[inicio + 1] * fracao[..., None] + .5)
    resultado[validos, :3] = rgb[validos].astype(np.uint8)
    return resultado


def _raster(base, gt, mascara_sp):
    fonte = favorabilidade_raster.SuperficieRaster(base['id'], _revisao(base))
    with fonte.abrir() as (dataset, revisao):
        oeste, resolucao, _, norte, _, passo = gt
        vrt = gdal.Warp('', dataset, format='MEM', dstSRS='EPSG:5880',
                        outputBounds=(oeste, norte + ALTURA * passo, oeste + LARGURA * resolucao, norte),
                        width=LARGURA, height=ALTURA, resampleAlg='near', outputType=gdal.GDT_Float64,
                        dstNodata=float('nan'))
        if vrt is None:
            raise ValueError(f'{base["nome"]}: não foi possível representar a superfície raster completa.')
        valores = vrt.GetRasterBand(1).ReadAsArray()
        validos = (vrt.GetRasterBand(1).GetMaskBand().ReadAsArray() != 0) & (mascara_sp != 0)
        rgba = _cores_indices(valores, validos)
        rgba[:, :, 3] = mascara_sp
        vrt.Close()
        return Image.fromarray(rgba), revisao


def preparar(entrada, analise, limite):
    demandas = [shape(f['geometry']) for f in entrada['geometrias']['features']]
    frame = nativo.Camada([], [{} for _ in demandas],
                          [ogr.CreateGeometryFromWkb(g.wkb) for g in demandas], nativo.referencia(4326))
    demandas = _geometrias(nativo.reproject(frame, 5880))
    xmin, ymin, xmax, ymax = limite.bounds
    for geom in demandas:
        a, b, c, d = geom.bounds
        xmin, ymin, xmax, ymax = min(xmin, a), min(ymin, b), max(xmax, c), max(ymax, d)
    pixel = max((xmax - xmin) / (LARGURA - 100), (ymax - ymin) / (ALTURA - 100))
    if not math.isfinite(pixel) or pixel <= 0:
        raise ValueError('Extensão cartográfica inválida.')
    cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
    gt = (cx - LARGURA * pixel / 2, pixel, 0, cy + ALTURA * pixel / 2, 0, -pixel)
    mascara_sp = _mascara([limite], gt)
    cores = cores_camadas(entrada['campos'])
    mapas = []
    por_chave = {linha['chave']: (pos + 1, linha) for pos, linha in enumerate(entrada['linhas'])}
    rotulos = []
    for feature, geom in zip(entrada['geometrias']['features'], demandas):
        numero, linha = por_chave[feature['properties']['chave']]
        ponto = geom.representative_point()
        rotulos.append({'numero': numero, 'nome': linha['nome'] or f'Demanda {linha["id"]}',
                        'x': (ponto.x - gt[0]) / pixel, 'y': (gt[3] - ponto.y) / pixel})

    def finalizar(imagem, titulo, legenda, fontes, interpretacao, tipo, simbolos=None):
        _pintar(imagem, [limite.boundary], gt, '#455a64')
        _pintar(imagem, [g.boundary for g in demandas], gt, '#111827')
        buffer = BytesIO()
        imagem.convert('RGB').save(buffer, format='PNG')
        mapas.append({'titulo': titulo, 'tipo': tipo, 'png': buffer.getvalue(), 'legenda': legenda,
                      'fontes': fontes, 'interpretacao': interpretacao,
                      'rotulos': rotulos, 'pixel_m': pixel, 'geotransformacao': gt,
                      'limite': LIMITE_SP, 'largura': LARGURA, 'altura': ALTURA,
                      'simbolos': simbolos or []})

    imagem = Image.new('RGBA', (LARGURA, ALTURA), '#ffffff')
    _pintar(imagem, [limite], gt, '#eef3f7')
    _pintar(imagem, demandas, gt, '#123b56')
    finalizar(imagem, 'Mapa de localização das demandas', [('Demandas analisadas', '#123b56')],
              [LIMITE_SP, f'Geometrias preservadas da execução {entrada["id"]}'],
              'Os números localizam as demandas e correspondem à chave de leitura abaixo. '
              'O contorno cinza delimita São Paulo. Marcadores permitem localizar demandas pequenas na escala estadual; '
              'não representam sua área nem seu índice.', 'demandas')
    grupos = [('bases', entrada['campos'])] if analise == 'elegibilidade' else [
        (papel, [b for b in entrada['campos'] if b['papel'] == papel]) for papel in ('grade', 'rede')]
    for papel, bases in grupos:
        imagem = Image.new('RGBA', (LARGURA, ALTURA), '#ffffff')
        _pintar(imagem, [limite], gt, SEM_DADOS if analise == 'favorabilidade' else '#f3f4f6')
        fontes = []
        legenda = []
        simbolos = []
        vetores = {}
        if analise == 'elegibilidade':
            for base in bases:
                vetores[base['id']] = _vetor(base, limite)
            # Desenha primeiro as camadas extensas, para não encobrir as menores.
            bases = sorted(bases, key=lambda b: -sum(g.area for g in vetores[b['id']][0]))
        for base in bases:
            reparadas = 0
            if base.get('tipo') == 'raster':
                raster, revisao = _raster(base, gt, mascara_sp)
                imagem.alpha_composite(raster)
            else:
                geometrias, registros, revisao, reparadas = (
                    vetores[base['id']] if analise == 'elegibilidade' else _vetor(base, limite))
                if analise == 'elegibilidade':
                    mascara = _mascara(geometrias, gt)
                    extensa = np.count_nonzero(mascara) >= .01 * np.count_nonzero(mascara_sp)
                    pos = sorted(cores).index(base['id'])
                    textura = TEXTURAS[pos % len(TEXTURAS)] if extensa else None
                    _pintar_simbolo(imagem, mascara, cores[base['id']], textura)
                    simbolos.append({'nome': base['nome'], 'papel': base['papel'],
                                     'cor': cores[base['id']], 'textura': textura})
                else:
                    campo = 'fav_territorial_dim' if papel == 'grade' else 'fav_rede_dim'
                    # Uma grade de exibição por índice; não representa recortes das demandas.
                    valores = []
                    for registro in registros:
                        nomes = {k.casefold(): k for k in registro}
                        valor = registro.get(nomes.get(campo, ''))
                        if valor is None:
                            valor = float('nan')
                        elif isinstance(valor, bool) or not isinstance(valor, Real) or not math.isfinite(float(valor)) or not 0 <= float(valor) <= 1:
                            raise ValueError(f'{base["nome"]}: índice inválido na superfície cartográfica.')
                        valores.append(float(valor))
                    grade = _queimar(geometrias, gt, valores)
                    rgba = _cores_indices(grade, np.isfinite(grade) & (mascara_sp != 0))
                    rgba[:, :, 3] = np.minimum(_mascara(geometrias, gt), mascara_sp)
                    imagem.alpha_composite(Image.fromarray(rgba))
            fontes.append(f'{base["nome"]}: {base["id"]}; revisão física: {revisao or "não disponível para esta referência"}.')
            if reparadas:
                fontes.append(f'{base["nome"]}: {reparadas} geometria(s) reparada(s) somente para a representação '
                              'cartográfica; fonte, áreas e índices processados não foram alterados.')
            if analise == 'elegibilidade':
                categoria = 'Restrição' if base['papel'] == 'restricao' else 'Risco'
                legenda.append((f'{base["nome"]} — {categoria}', cores[base['id']]))
        if analise == 'elegibilidade':
            titulo = 'Camadas de restrição e risco utilizadas — recorte de São Paulo'
            leitura = ('Cada cor identifica uma camada da legenda, não uma gravidade. As camadas foram recortadas '
                       'ao limite de São Paulo, não às demandas. Sobreposições de cores podem ocorrer; camadas superiores '
                       'podem encobrir inferiores. A ausência visual na escala estadual não comprova ausência de ocorrência. '
                       'A legenda separa restrições e riscos em duas colunas. Camadas que ocupam pelo menos 1% '
                       'da área estadual na grade de exibição recebem gradação e hachuras ou pontilhado; essas '
                       'texturas diferenciam as fontes, sem representar severidade. As maiores são desenhadas primeiro. '
                       'Consulte os resultados por demanda e o GeoPackage para conferir os contatos e as áreas.')
        else:
            titulo = 'Superfície de favorabilidade ' + ('territorial de grade' if papel == 'grade' else 'de rede')
            legenda = [(f'Índice {v:g}'.replace('.', ','), cor) for v, cor in zip((0, .25, .5, .75, 1), VIRIDIS)]
            legenda.append(('Sem dados / sem índice válido', SEM_DADOS))
            leitura = ('A rampa Viridis representa índices de 0 a 1: valores maiores indicam maior favorabilidade '
                       'segundo os critérios da superfície; não são prioridade final ou benefício previsto. '
                       'Zero é válido e aparece em roxo; cinza significa ausência de dados. Demandas aparecem com '
                       'contorno e marcadores numerados. A superfície é mostrada no contexto estadual, não apenas '
                       'nos fragmentos internos às demandas. A grade reduzida do mapa é somente de exibição, '
                       'sem recalcular os índices por demanda.')
            if not bases:
                leitura = 'Nenhuma superfície deste componente foi utilizada nesta execução; não há índice a representar. ' + leitura
        finalizar(imagem, titulo, legenda, fontes or ['Nenhuma base selecionada neste componente.'],
                  leitura, papel, simbolos)
    return mapas
