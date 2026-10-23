"""Storage, prévia e bancada devem concordar sem passar por DataFrames."""
import builtins
from hashlib import sha256
from zipfile import ZipFile

import pytest
from osgeo import ogr

from api.services import analise_territorial_ogr as nativo
from api.services import fluxo_camadas_ogr as fluxo
from api.services import extracao_preparacao as previa
from api.services import bancada_camada_original as bancada
from api.services import elegibilidade_preparacao as demandas
from api.services import storage_geoespacial as storage


@pytest.mark.usefixtures('storage_sintetico')
@pytest.mark.parametrize('compactado', [False, True])
def test_storage_previa_bancada_preservam_fids_e_atributos_sem_dataframes(tmp_path, monkeypatch, compactado):
    pasta = tmp_path / 'base-geoespacial'
    pasta.mkdir()
    path = pasta / 'dados.gpkg'
    dados = nativo.Camada(
        [nativo.campo('codigo', ogr.OFTString), nativo.campo('numero', ogr.OFTInteger64)],
        [{'codigo': '001', 'numero': 9007199254740993}, {'codigo': None, 'numero': None}],
        [ogr.CreateGeometryFromWkt('POINT(-47 -23)'), ogr.CreateGeometryFromWkt('POINT(-47.1 -23.1)')],
        nativo.referencia(4674), fids=[7, 118])
    path.write_bytes(nativo.serializar(dados, 'dados', preservar_fids=True))
    camada = 'dados'
    if compactado:
        pacote = pasta / 'dados.zip'
        with ZipFile(pacote, 'w') as z:
            z.write(path, 'dados.gpkg')
        path = pacote
        from api.services.pacote_geoespacial_memoria import componentes, abrir
        with abrir(componentes(path.read_bytes(), path.name, 32*1024*1024)) as (opcoes, _, _):
            camada = opcoes[0]['chave']
    assinatura = sha256(path.read_bytes()).digest()
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: tmp_path)
    monkeypatch.setattr(previa, 'sem_montagem', lambda: False)
    destino = tmp_path / 'previa'
    destino.mkdir()
    monkeypatch.setattr(previa, '_pasta', lambda _: destino)
    monkeypatch.setattr(fluxo, 'localizacao', lambda _: {'status': 'indisponivel'})
    original_import = builtins.__import__

    def importar(nome, *args, **kwargs):
        if nome.split('.')[0] in {'pandas', 'geopandas', 'shapely', 'pyproj', 'numpy', 'fiona', 'pyogrio'}:
            raise AssertionError(f'O fluxo recorreu à biblioteca legada: {nome}')
        return original_import(nome, *args, **kwargs)

    monkeypatch.setattr(builtins, '__import__', importar)
    arquivo = f'base-geoespacial/{path.name}'
    ident = f'storage:{arquivo}::{camada}'
    carregada = nativo.carregar_referencia(ident)
    nativo.conferir(dados, carregada)
    assert carregada.fids == [7, 118]
    descritor = previa.preparar(ident, 'autor')
    assert 'tiles_token' not in descritor
    assert not list(destino.iterdir())
    assert '/storage/camada/tiles/' in descritor['tiles_url']
    original = bancada.preparar(ident, arquivo)
    linhas = bancada.ler_tabela(ident, arquivo, original['revisao'], 0, 10)['linhas']
    assert [r['id'] for r in linhas] == ['7', '118']
    normalizada, _ = demandas.normalizar_frame(carregada)
    assert normalizada.registros == dados.registros
    assert normalizada.fids == dados.fids
    assert all(g.GetDimension() == 2 for g in normalizada.geometrias)
    assert sha256(path.read_bytes()).digest() == assinatura


@pytest.mark.usefixtures('storage_sintetico')
def test_previa_storage_nao_materializa_dados_nem_calcula_medidas(tmp_path, monkeypatch):
    path = tmp_path / 'base.gpkg'
    dados = nativo.Camada([], [{}], [ogr.CreateGeometryFromWkt('POINT(-47 -23)')], nativo.referencia(4674))
    path.write_bytes(nativo.serializar(dados, 'base'))
    monkeypatch.setattr(storage, 'resolver', lambda _: path)
    def proibido(*args, **kwargs):
        pytest.fail('A abertura da prévia não deve varrer ou copiar a base inteira.')
    for modulo, nome in [(nativo, 'ler_camada'), (nativo, 'carregar_referencia'),
                         (fluxo, 'descrever'), (fluxo, 'localizacao'), (previa, 'representar')]:
        monkeypatch.setattr(modulo, nome, proibido)
    resultado = previa.preparar('storage:base-geoespacial/base.gpkg::base', 'autor')
    assert resultado['feicoes'] == 1
    assert resultado['escopo_validacao'] == 'visualizacao'
    assert resultado['revisao'] == resultado['revisao_fonte']


def test_medidas_geodesicas_incluem_buracos_e_nao_somam_perimetro_como_linha():
    poligono = ogr.CreateGeometryFromWkt(
        'POLYGON((-48 -23,-47 -23,-47 -22,-48 -22,-48 -23),'
        '(-47.8 -22.8,-47.8 -22.2,-47.2 -22.2,-47.2 -22.8,-47.8 -22.8))')
    linha = ogr.CreateGeometryFromWkt('LINESTRING(-48 -23,-47 -23)')
    dados = nativo.Camada([], [{}, {}], [poligono, linha], nativo.referencia(4326))
    area, comprimento = fluxo.medidas_geodesicas(dados)
    assert 7.28e9 < area < 7.30e9
    assert comprimento == pytest.approx(102522.337, abs=.1)


def test_localizacao_filtra_candidatos_no_banco_e_intersecta_com_ogr(monkeypatch):
    from contextlib import contextmanager
    from api.db import connection
    consultas = []
    dentro = ogr.CreateGeometryFromWkt('POLYGON((-48 -24,-46 -24,-46 -22,-48 -22,-48 -24))')
    fora = ogr.CreateGeometryFromWkt('POLYGON((-48 -24,-46 -24,-46 -23.5,-48 -24))')

    class Conexao:
        def execute(self, sql, parametros):
            consultas.append((sql, parametros))
            return self

        def fetchall(self):
            return [{'cd_mun': str(i), 'nm_mun': f'Município {i}', 'sigla_uf': 'SP',
                     'wkb': bytes(g.ExportToWkb())} for i, g in enumerate([dentro, fora])]

    @contextmanager
    def conectar():
        yield Conexao()

    monkeypatch.setattr(connection, 'get_connection', conectar)
    dados = nativo.Camada([], [{}], [ogr.CreateGeometryFromWkt('POINT(-47 -23)')], nativo.referencia(4674))
    resultado = fluxo.localizacao(dados)
    assert [m['cd_mun'] for m in resultado['municipios']] == ['0']
    assert 'WHERE geom &&' in consultas[0][0]
    assert ogr.CreateGeometryFromWkb(consultas[0][1][0]).GetGeometryCount() == 1
