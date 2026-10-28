"""Estrutura comum, síntese numérica e mapas completos das duas fases."""
from io import BytesIO
from copy import deepcopy
import json

import geopandas as gpd
import numpy as np
import pytest
from osgeo import gdal
from PIL import Image, ImageColor
from pypdf import PdfReader
from shapely.geometry import box, Polygon

from api.services import cartografia_relatorio_fases as mapas, relatorio_fases_pdf as pdf
from api.services import analise_territorial_ogr as nativo
from tests.territorial_ogr_helpers import camada


@pytest.fixture
def fontes(tmp_path, monkeypatch):
    limite = box(5000000, 7000000, 5001000, 7000700)
    grade = camada(gpd.GeoDataFrame({'fav_territorial_dim': [0, 1]},
        geometry=[box(4999900, 7000000, 5000500, 7000700), box(5000500, 7000000, 5001200, 7000700)], crs=5880))
    rede = camada(gpd.GeoDataFrame({'fav_rede_dim': [.2]},
        geometry=[box(5000000, 7000000, 5001000, 7000300)], crs=5880))
    fronteira = camada(gpd.GeoDataFrame(geometry=[limite], crs=5880))
    fontes = {mapas.LIMITE_SP: fronteira, 'grade': grade, 'rede': rede}
    monkeypatch.setattr(mapas.nativo, 'carregar_referencia', lambda ident: fontes[ident])
    fonte_raster = tmp_path / 'rede.tif'
    ds = gdal.GetDriverByName('GTiff').Create(str(fonte_raster), 2, 2, 1, gdal.GDT_Float64)
    ds.SetProjection(nativo.referencia(5880).ExportToWkt())
    ds.SetGeoTransform((5000000, 500, 0, 7000700, 0, -350))
    ds.GetRasterBand(1).SetNoDataValue(-9999)
    ds.GetRasterBand(1).WriteArray(np.array([[0, .8], [.4, -9999]]))
    ds.Close()
    monkeypatch.setattr(mapas.storage, 'resolver', lambda _: fonte_raster)
    demanda = nativo.reproject(camada(gpd.GeoDataFrame(
        geometry=[box(5000100, 7000100, 5000150, 7000150)], crs=5880)), 4326).geometrias[0]
    entrada = {'id': 'job', 'nome': 'Demandas demonstrativas', 'feicoes': 1,
               'concluido_em': '2026-10-27T20:00:00+00:00',
               'campos': [{'id': 'grade', 'nome': 'Superfície municipal', 'papel': 'grade'},
                          {'id': 'rede', 'nome': 'Superfície de rede', 'papel': 'rede'}],
               'linhas': [{'chave': '0', 'id': 'D1', 'nome': 'Demanda A', 'area_total_m2': 2500,
                           'sobreposicoes': [], 'areas': [None, None],
                           'rasters': [{'papel': 'rede', 'indice': .6, 'cobertura_percentual': 75}]}],
               'geometrias': {'type': 'FeatureCollection', 'features': [
                   {'type': 'Feature', 'geometry': json.loads(demanda.ExportToJson()), 'properties': {'chave': '0'}}]}}
    return limite, entrada, fonte_raster, fontes


def pixel(mapa, x, y):
    gt = mapa['geotransformacao']
    imagem = Image.open(BytesIO(mapa['png']))
    return imagem.getpixel((int((x - gt[0]) / gt[1]), int((gt[3] - y) / -gt[5])))


def test_fase2_tres_mapas_completos_legendas_zero_e_nodata(fontes):
    limite, entrada, _, _ = fontes
    entrada['campos'][1] = {'id': 'storage:superficies-indices/rede.tif', 'nome': 'Rede raster', 'papel': 'rede', 'tipo': 'raster'}
    conjunto = mapas.preparar(entrada, 'favorabilidade', limite)
    assert [m['tipo'] for m in conjunto] == ['demandas', 'grade', 'rede']
    assert all(m['rotulos'][0]['numero'] == 1 for m in conjunto)
    grade, rede = conjunto[1:]
    # Pontos longe da demanda ainda exibem a superfície de origem.
    assert pixel(grade, 5000300, 7000500) == ImageColor.getrgb(mapas.VIRIDIS[0])
    assert pixel(grade, 5000800, 7000500) == ImageColor.getrgb(mapas.VIRIDIS[-1])
    assert pixel(rede, 5000300, 7000500) == ImageColor.getrgb(mapas.VIRIDIS[0])
    assert pixel(rede, 5000800, 7000100) == ImageColor.getrgb(mapas.SEM_DADOS)
    assert pixel(grade, 4999950, 7000500) == (255, 255, 255)  # Fora de SP é recortado.
    assert any('Sem dados' in nome for nome, _ in rede['legenda'])
    assert 'não apenas' in rede['interpretacao']


def test_fase1_um_mapa_bases_todas_camadas_com_cores_distintas(fontes):
    limite, entrada, _, _ = fontes
    entrada['campos'][0]['papel'] = 'restricao'
    entrada['campos'][1]['papel'] = 'risco'
    conjunto = mapas.preparar(entrada, 'elegibilidade', limite)
    assert [m['tipo'] for m in conjunto] == ['demandas', 'bases']
    assert len(conjunto[1]['legenda']) == 2
    assert len({cor for _, cor in conjunto[1]['legenda']}) == 2
    assert 'Restrição' in conjunto[1]['legenda'][0][0]
    assert 'Risco' in conjunto[1]['legenda'][1][0]
    assert pixel(conjunto[1], 5000800, 7000500) != (255, 255, 255)
    assert pixel(conjunto[1], 4999950, 7000500) == (255, 255, 255)
    assert len(set(mapas.cores_camadas([{'id': str(i)} for i in range(40)]).values())) == 40


def test_fonte_alterada_e_fonte_indisponivel_impedem_mapa(fontes):
    limite, entrada, _, _ = fontes
    entrada['campos'][0].update(id='storage:superficies-indices/grade.tif', tipo='raster', revisao_fonte='antiga')
    with pytest.raises(ValueError, match='mudou'):
        mapas.preparar(entrada, 'favorabilidade', limite)
    entrada['campos'][0] = {'id': 'inexistente', 'nome': 'Ausente', 'papel': 'grade'}
    with pytest.raises(KeyError):
        mapas.preparar(entrada, 'favorabilidade', limite)


def test_reparo_cartografico_e_explicito_sem_modificar_fonte(fontes):
    limite, entrada, _, catalogo = fontes
    invalida = Polygon([(5000000, 7000000), (5000800, 7000600),
                        (5000000, 7000600), (5000800, 7000000), (5000000, 7000000)])
    catalogo['grade'] = camada(gpd.GeoDataFrame({'fav_territorial_dim': [.4]},
                                              geometry=[invalida], crs=5880))
    antes = bytes(catalogo['grade'].geometrias[0].ExportToWkb())
    conjunto = mapas.preparar(entrada, 'favorabilidade', limite)
    assert any('1 geometria(s) reparada(s)' in fonte for fonte in conjunto[1]['fontes'])
    assert bytes(catalogo['grade'].geometrias[0].ExportToWkb()) == antes


def test_indices_salvos_raster_fixo_vetor_sem_media_inventada(fontes):
    _, entrada, _, _ = fontes
    linha = entrada['linhas'][0]
    linha['sobreposicoes'] = [{'papel': 'grade', 'favorabilidade': {'indice': v, 'estado_indice': 'valido'}} for v in (.2, .8)]
    antes = deepcopy(entrada)
    sem_config = pdf.resultados_favorabilidade(entrada, None)[0]
    assert sem_config['grade']['indice'] is None
    assert sem_config['grade']['metodo'] == 'Agregação não definida'
    assert sem_config['rede']['indice'] == .6
    salvo = pdf.resultados_favorabilidade(entrada, {'medida': 'maximo', 'percentil': None})[0]
    assert salvo['grade']['indice'] == .8 and salvo['rede']['indice'] == .6
    assert entrada == antes


def test_pdf_contextualiza_indices_antes_de_mapas_e_tres_imagens(fontes, monkeypatch):
    from api.services import criterios_relatorio_fases
    limite, entrada, _, _ = fontes
    monkeypatch.setattr(mapas, 'limite_sp', lambda: limite)
    monkeypatch.setattr(criterios_relatorio_fases, 'descrever', lambda campos, **kwargs: [
        {'id': 'grade', 'nome': 'Critérios da superfície municipal',
         'criterios': [{'nome': 'Critério vinculado', 'descricao': 'Descrição comprovada da fonte'}], 'avisos': []}])
    modelo = {'analise': 'favorabilidade', 'gerado_em': '2026-10-27T22:00:00+00:00',
              'concluidas': 1, 'previstas': 1, 'entradas': [entrada], 'metodologia': 'Método auditado',
              'agregacao': {'medida': 'media', 'percentil': None}}
    dados = pdf.documento(modelo)
    leitor = PdfReader(BytesIO(dados))
    texto = '\n'.join(p.extract_text() for p in leitor.pages)
    assert texto.index('Objetivo:') < texto.index('2 — Resultados por demanda') < texto.index('4 — Localização')
    assert '0,60' in texto and '75,00%' in texto
    assert 'Critério vinculado: Descrição comprovada da fonte' in texto
    assert 'Fase 2' in texto and 'Demanda A' in texto
    assert 'Superfície de favorabilidade territorial de grade' in texto
    assert 'Superfície de favorabilidade de rede' in texto
    assert 'EPSG:5880' in texto and 'Zero é válido' in texto
    assert sum(len(p.images) for p in leitor.pages) == 4  # Marca institucional e três mapas.


@pytest.mark.parametrize('analise', ['elegibilidade', 'favorabilidade'])
def test_slogan_institucional_nos_dois_relatorios(fontes, monkeypatch, analise):
    limite, entrada, _, _ = fontes
    monkeypatch.setattr(mapas, 'limite_sp', lambda: limite)
    if analise == 'elegibilidade':
        entrada['campos'][0]['papel'] = 'restricao'
        entrada['campos'][1]['papel'] = 'risco'
    modelo = {'analise': analise, 'gerado_em': '2026-10-27T23:00:00+00:00',
              'concluidas': 1, 'previstas': 1, 'entradas': [entrada],
              'metodologia': 'Método auditado', 'agregacao': None}
    leitor = PdfReader(BytesIO(pdf.documento(modelo)))
    texto = ' '.join(leitor.pages[0].extract_text().split())
    assert ('Inteligência territorial para apoiar as decisões da '
            'Subsecretaria de Logística e Transporte (SLT)') in texto
    assert texto.index('Transporte (SLT)') < texto.index('1 — Identificação')
    assert 'Emitido em' in texto
    assert texto.index('Sistema Inteligente') < texto.index('Relatório de')
    assert 'à Implantação/Execução de Demandas de Logística e Transportes' in texto


def test_legenda_em_duas_colunas_reproduz_texturas_das_camadas_extensas(fontes):
    limite, entrada, _, _ = fontes
    entrada['campos'][0]['papel'] = 'restricao'
    entrada['campos'][1]['papel'] = 'risco'
    mapa = mapas.preparar(entrada, 'elegibilidade', limite)[1]
    assert all(s['textura'] in mapas.TEXTURAS for s in mapa['simbolos'])
    legenda = pdf._legenda(pdf.estilo._estilos(), mapa)
    assert len(legenda._cellvalues[0]) == 2
    for pos, titulo in enumerate(('Restrições', 'Riscos')):
        coluna = legenda._cellvalues[0][pos]
        assert coluna._cellvalues[0][0].getPlainText() == titulo
        amostra = coluna._cellvalues[1][0]
        assert isinstance(amostra, pdf.AmostraLegenda)
        assert amostra.textura in mapas.TEXTURAS
    imagem = np.array(mapas.amostra_simbolo('#176878', 'cruzada'))
    assert len(np.unique(imagem.reshape(-1, 3), axis=0)) > 2


def test_textos_em_topicos_justificados_sem_perder_conteudo():
    e = pdf.estilo._estilos()
    blocos = pdf._organizar_topicos([pdf.estilo._p(
        e, 'Primeiro tópico. Segundo tópico; mantém a informação.')], e)
    assert len(blocos) == 2
    assert [b.getPlainText() for b in blocos] == [
        'Primeiro tópico.', 'Segundo tópico; mantém a informação.']
    assert all(b.style.alignment == pdf.TA_JUSTIFY and b.bulletText == '•' for b in blocos)


def test_cards_usam_paleta_de_restricao_risco_e_livre():
    from api.services import elegibilidade_sintese
    fichas = [{'situacao': s} for s in elegibilidade_sintese.ORDEM_SITUACOES]
    tabela = pdf._cards_situacao(pdf.estilo._estilos(), fichas)
    for pos, situacao in enumerate(('restricao', 'risco', 'ambas', 'livre'), 1):
        valor = tabela._cellvalues[0][pos][0]
        assert valor.style.textColor == pdf.colors.HexColor(elegibilidade_sintese.CORES_SITUACAO[situacao])
