"""Leitura da banda original e recorte de células, sem reamostragem."""
from contextlib import contextmanager
from dataclasses import dataclass
import math
import json
from pathlib import PurePosixPath

from osgeo import gdal, ogr, osr

from api.services import analise_territorial_ogr as nativo, storage_geoespacial as storage
from api.services.normalizacao_demanda import CRS_METRICO


@dataclass(frozen=True)
class SuperficieRaster:
    id: str
    revisao: str | None = None

    @contextmanager
    def abrir(self):
        caminho, camada = storage.separar_id(self.id)
        if camada is not None or PurePosixPath(caminho).suffix.lower() not in storage.EXTENSOES_RASTER:
            raise ValueError('Selecione um arquivo raster do Storage, sem subcamada.')
        arquivo = storage.resolver(caminho)
        def conferir():
            estado = storage.resolver(caminho).stat()
            atual = f'{estado.st_mtime_ns}-{estado.st_size}'
            if self.revisao and atual != self.revisao:
                raise ValueError('O raster mudou após o envio à bancada. Prepare-o novamente.')
            return atual
        revisao = conferir()
        dataset = gdal.OpenEx(str(arquivo), gdal.OF_RASTER | gdal.OF_READONLY)
        if dataset is None:
            raise ValueError('Não foi possível abrir o raster original.')
        try:
            if dataset.RasterCount != 1:
                raise ValueError('A superfície de favorabilidade deve ter uma única banda de índices entre 0 e 1.')
            if not dataset.GetProjection():
                raise ValueError('A superfície raster não possui CRS.')
            transformacao = dataset.GetGeoTransform(can_return_null=True)
            if (transformacao is None or not all(math.isfinite(v) for v in transformacao)
                    or gdal.InvGeoTransform(transformacao) is None):
                raise ValueError('A superfície raster não possui transformação espacial invertível.')
            banda = dataset.GetRasterBand(1)
            if gdal.DataTypeIsComplex(banda.DataType):
                raise ValueError('A superfície raster deve conter índices reais, não complexos.')
            if banda.GetScale() not in (None, 1) or banda.GetOffset() not in (None, 0):
                raise ValueError('Use uma banda com índices físicos de 0 a 1, sem escala ou deslocamento.')
            # Os produtos auxiliares SICARD não são superfícies finais de favorabilidade.
            nome = PurePosixPath(caminho).stem.casefold()
            auxiliares = ('_distancia_metros_', '_pertinencia_fuzzy_', '_trecho_origem_', '_mascara_sem_indice_')
            if nome.startswith('superficie_favorabilidade_rede_') and any(funcao in nome for funcao in auxiliares):
                raise ValueError('Selecione o raster indice_final, não distância, pertinência, origem ou máscara auxiliar.')
            yield dataset, revisao
            conferir()
        finally:
            dataset.Close()


def preparar(ident: str, revisao: str | None = None) -> dict:
    fonte = SuperficieRaster(ident, revisao)
    with fonte.abrir() as (dataset, revisao):
        banda = dataset.GetRasterBand(1)
        texto = dataset.GetMetadataItem('SICARD_METODOLOGIA')
        try:
            metodologia = json.loads(texto) if texto else None
        except json.JSONDecodeError as exc:
            raise ValueError('Metadados de metodologia do raster são inválidos.') from exc
        if metodologia is not None and not isinstance(metodologia, dict):
            raise ValueError('Metadados de metodologia do raster devem ser um objeto.')
        return {'revisao_fonte': revisao, 'banda': 1, 'crs_raster': dataset.GetProjection(),
                'nodata': str(banda.GetNoDataValue()), 'transformacao': list(dataset.GetGeoTransform()),
                'largura': dataset.RasterXSize, 'altura': dataset.RasterYSize,
                'metrica': 'media_ponderada_area', 'metodologia_origem': metodologia,
                'validacao': 'Domínio 0–1 conferido nas células recortadas durante o cálculo.'}


def resumir(itens, area_total: float) -> dict:
    validos = []
    for valor, area in itens:
        if not math.isfinite(area) or area < 0:
            raise ValueError('Área de célula inválida para a média ponderada.')
        if valor is None:
            continue
        if not math.isfinite(valor) or not 0 <= valor <= 1:
            raise ValueError('A superfície raster contém índice fora do domínio de 0 a 1.')
        if area > 0:
            validos.append((valor, area))
    area = math.fsum(a for _, a in validos)
    if not math.isfinite(area_total) or area_total <= 0 or area > area_total * (1 + 1e-8):
        raise ValueError('A cobertura raster diverge da área da demanda.')
    return {'indice': math.fsum(v * a for v, a in validos) / area if area else None,
            'area_valida_m2': area, 'cobertura_percentual': min(100., area / area_total * 100),
            'area_sem_dados_m2': max(0., area_total - area), 'celulas_validas': len(validos),
            'metrica': 'media_ponderada_area'}


def celulas(fonte: SuperficieRaster, demandas: nativo.Camada, controle):
    """Janela por demanda, lida linha a linha; bordas pesadas pela interseção real."""
    with fonte.abrir() as (dataset, _):
        crs = nativo.referencia(dataset.GetProjection())
        metrica = nativo.referencia(CRS_METRICO)
        converter = None if crs.IsSame(metrica) else osr.CoordinateTransformation(crs, metrica)
        inversa = gdal.InvGeoTransform(dataset.GetGeoTransform())
        gt = dataset.GetGeoTransform()
        banda = dataset.GetRasterBand(1)
        mascara = banda.GetMaskBand()
        nodata = banda.GetNoDataValue()
        for pos, demanda in enumerate(demandas.geometrias):
            controle.verificar()
            controle.mensagem(f'Recortar células originais da demanda {pos + 1} de {len(demandas)}')
            janela = demanda.Clone()
            xmin, xmax, ymin, ymax = janela.GetEnvelope()
            if converter is not None:
                janela.Segmentize(max(xmax - xmin, ymax - ymin) / 256)
                if janela.Transform(osr.CoordinateTransformation(metrica, crs)) != 0:
                    raise ValueError('Não foi possível transformar a demanda para o CRS raster.')
            xmin, xmax, ymin, ymax = janela.GetEnvelope()
            cantos = [gdal.ApplyGeoTransform(inversa, x, y)
                      for x in (xmin, xmax) for y in (ymin, ymax)]
            c0 = max(0, math.floor(min(p[0] for p in cantos)))
            c1 = min(dataset.RasterXSize, math.ceil(max(p[0] for p in cantos)))
            r0 = max(0, math.floor(min(p[1] for p in cantos)))
            r1 = min(dataset.RasterYSize, math.ceil(max(p[1] for p in cantos)))
            if c0 >= c1 or r0 >= r1:
                continue
            for linha in range(r0, r1):
                controle.verificar()
                valores = banda.ReadAsArray(c0, linha, c1 - c0, 1)
                validos = mascara.ReadAsArray(c0, linha, c1 - c0, 1)
                if valores is None or validos is None:
                    raise ValueError('Falha ao ler células do raster original.')
                for deslocamento in range(c1 - c0):
                    if deslocamento % 256 == 0:
                        controle.verificar()
                    coluna = c0 + deslocamento
                    anel = ogr.Geometry(ogr.wkbLinearRing)
                    for x, y in ((coluna, linha), (coluna + 1, linha),
                                 (coluna + 1, linha + 1), (coluna, linha + 1), (coluna, linha)):
                        anel.AddPoint_2D(*gdal.ApplyGeoTransform(gt, x, y))
                    pixel = ogr.Geometry(ogr.wkbPolygon)
                    pixel.AddGeometry(anel)
                    if converter is not None:
                        pixel.Segmentize(max(math.hypot(gt[1], gt[4]), math.hypot(gt[2], gt[5])) / 16)
                        if pixel.Transform(converter) != 0:
                            raise ValueError('Não foi possível transformar a célula para EPSG:5880.')
                    if not demanda.Intersects(pixel):
                        continue
                    recorte = demanda.Intersection(pixel)
                    if recorte is None:
                        raise ValueError('Não foi possível recortar uma célula raster.')
                    area = nativo.area(recorte)
                    if area <= 0:
                        continue
                    valor = float(valores[0, deslocamento])
                    if not validos[0, deslocamento] or (nodata is not None and
                            (valor == nodata or math.isnan(valor) and math.isnan(nodata))):
                        continue
                    if not math.isfinite(valor) or not 0 <= valor <= 1:
                        raise ValueError(f'Índice raster inválido na linha {linha + 1}, coluna {coluna + 1}: exige valor entre 0 e 1.')
                    yield pos, linha, coluna, valor, area, recorte, dataset.RasterXSize
