"""Regressões nativas, inclusive execução com leitores pandas bloqueados."""
from pathlib import Path
from zipfile import ZipFile
from contextlib import nullcontext
from types import SimpleNamespace

import pytest
from osgeo import ogr, gdal

from api.services import analise_territorial_ogr as nativo
from api.services import elegibilidade_processamento as service
from api.services.controle_processamento import ControleProcessamento


def poligono(x=0):
    return ogr.CreateGeometryFromWkt(f'POLYGON (({x} 0,{x+10} 0,{x+10} 10,{x} 10,{x} 0))')


def arquivo(path, dados):
    ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    layer = nativo.gravar_camada(ds, 'dados', dados)
    layer = ds = None


def fonte():
    return nativo.Camada(
        [nativo.campo('id_original', ogr.OFTInteger64), nativo.campo('nome', ogr.OFTString),
         nativo.campo('valor', ogr.OFTReal), nativo.campo('ativo', ogr.OFTInteger, ogr.OFSTBoolean),
         nativo.campo('data', ogr.OFTDate)],
        [{'id_original': 2**60+1, 'nome': '', 'valor': None, 'ativo': 1, 'data': '2026/10/23'},
         {'id_original': 2**60+3, 'nome': None, 'valor': .1234567890123456, 'ativo': None, 'data': None}],
        [poligono(), poligono(20)], nativo.referencia(5880))


def test_execucao_nativa_com_pandas_geopandas_e_pyogrio_bloqueados(tmp_path, monkeypatch):
    entrada = fonte()
    arquivo(tmp_path/'entrada.gpkg', entrada)
    arquivo(tmp_path/'base.gpkg', entrada)
    import pandas as pd
    import geopandas as gpd
    import pyogrio

    def proibido(*args, **kwargs):
        raise AssertionError('O processamento territorial chamou pandas/GeoPandas/pyogrio')

    monkeypatch.setattr(pd, 'DataFrame', proibido)
    monkeypatch.setattr(pd, 'Series', proibido)
    monkeypatch.setattr(gpd, 'GeoDataFrame', proibido)
    monkeypatch.setattr(gpd, 'GeoSeries', proibido)
    monkeypatch.setattr(gpd, 'read_file', proibido)
    monkeypatch.setattr(pyogrio, 'read_dataframe', proibido)
    monkeypatch.setattr(pyogrio, 'read_info', proibido)
    monkeypatch.setattr(service.storage, 'resolver', lambda p: tmp_path/Path(p).name)
    monkeypatch.setattr(service.saidas_storage, 'garantir_pasta', lambda p: None)
    salvos = {}

    def registrar(nome, conteudos, *args, **kwargs):
        salvos.update(conteudos)
        resumo = nativo.resumo_vetor(Path(nome), conteudos)
        assert resumo['feicoes'] == 2 and resumo['crs'] == 'EPSG:5880'
        return {'caminho': nome}

    monkeypatch.setattr(service.ciclo, 'registrar_exportacao_memoria', registrar)
    monkeypatch.setattr(service, 'descritor_original', lambda *args: {})
    result = service.executar({
        'entrada': {'id': 'storage:saidas-geoespaciais/entrada.gpkg::dados', 'nome': 'Entrada'},
        'grade': [{'id': 'storage:saidas-geoespaciais/base.gpkg::dados', 'nome': 'Base'}], 'rede': []},
        ControleProcessamento(), analise='favorabilidade')
    persistida = nativo.ler(salvos[result['nome']], 'favorabilidade_territorial')
    assert [r['id_original'] for r in persistida.registros] == [2**60+1, 2**60+3]
    assert [r['nome'] for r in persistida.registros] == ['', None]
    assert [r['fg_base'] for r in persistida.registros] == [100., 100.]
    assert [g.ExportToIsoWkb() for g in persistida.geometrias] == [g.ExportToIsoWkb() for g in entrada.geometrias]
    recortes = nativo.ler(salvos[result['nome']], 'intersecoes')
    assert recortes.registros[0]['fg_base__id_original'] == 2**60+1
    assert recortes.registros[0]['fg_base__valor'] is None
    assert recortes.registros[1]['fg_base__valor'] == .1234567890123456


def test_leitura_de_pacote_preserva_esquema_e_nulos(tmp_path, monkeypatch):
    path = tmp_path/'base.gpkg'
    arquivo(path, fonte())
    pacote = tmp_path/'base.zip'
    with ZipFile(pacote, 'w') as zipado:
        zipado.writestr('base.gpkg', path.read_bytes())
    monkeypatch.setattr(service.storage, 'resolver', lambda p: pacote)
    dados = service._carregar({'id': 'storage:base-geoespacial/base.zip', 'nome': 'Base'})
    nativo.conferir(fonte(), dados)


def test_fids_nao_sequenciais_nao_alteram_vinculos():
    ds = ogr.GetDriverByName('Memory').CreateDataSource('')
    layer = nativo.gravar_camada(ds, 'base', fonte())
    feature = layer.GetFeature(0)
    layer.DeleteFeature(0)
    feature.SetFID(900)
    layer.CreateFeature(feature)
    base = nativo.ler_camada(layer)
    recortes = []
    saida, _ = service.calcular(fonte(), [('grade', 'Base', 'base', base)], ControleProcessamento(),
                               intersecoes=recortes, analise='favorabilidade')
    assert [r['fg_base'] for r in saida.registros] == [100., 100.]
    for r in recortes:
        assert r['fg_base__id_original'] == fonte().registros[r['demanda_pos']]['id_original']
    feature = layer = ds = None


def test_temporarios_liberados_apos_falha_de_gravacao(monkeypatch):
    saida, audit = service.calcular(fonte(), [], ControleProcessamento(), analise='favorabilidade')
    antes = set(gdal.ReadDir('/vsimem') or [])
    def falhar(*args, **kwargs):
        raise RuntimeError('Falha de escrita simulada')
    monkeypatch.setattr(nativo, 'gravar_camada', falhar)
    with pytest.raises(RuntimeError, match='simulada'):
        service.serializar(saida, audit, [], 'erro.gpkg', analise='favorabilidade')
    assert set(gdal.ReadDir('/vsimem') or []) == antes


def test_postgis_wkb_e_atributos_esparsos_sem_dataframe(monkeypatch):
    from api.repositories import camada_geoespacial_repository as repo
    from api.db import connection
    registro = {'tipo': 'vetor', 'id': 'base', 'crs': 'EPSG:4674'}
    rows = [{'propriedades': {'codigo': 2**60+1, 'nome': 'A', 'ativo': True},
             'wkb': poligono().ExportToWkb()},
            {'propriedades': {'codigo': 2**60+3}, 'wkb': poligono(20).ExportToWkb()}]
    conn = SimpleNamespace(execute=lambda *args: SimpleNamespace(fetchall=lambda: rows))
    monkeypatch.setattr(connection, 'get_connection', lambda: nullcontext(conn))
    monkeypatch.setattr(repo, '_find_layer', lambda *args: ('importadas', registro))
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda *args: pytest.fail('Leitor DataFrame acionado'))
    dados = nativo.carregar_referencia('base')
    assert dados.registros[0]['codigo'] == 2**60+1
    assert dados.registros[1].get('nome') is None
    assert dados.campos[0]['tipo'] == ogr.OFTInteger64
    assert dados.campos[2]['subtipo'] == ogr.OFSTBoolean
    saida, audit = service.calcular(dados, [('grade', 'Base', 'base', dados)], ControleProcessamento(),
                                   intersecoes=(recortes := []), analise='favorabilidade')
    arquivo = service.serializar(saida, audit, recortes, 'postgis.gpkg', analise='favorabilidade')
    assert nativo.ler(arquivo['postgis.gpkg'], 'intersecoes').registros[1]['fg_base__nome'] is None


def test_arquivo_registrado_seleciona_camada_explicita(tmp_path, monkeypatch):
    from api.repositories import camada_geoespacial_repository as repo
    from api.db import connection
    from api import path_policy
    path = tmp_path/'base.gpkg'
    ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    layer = nativo.gravar_camada(ds, 'errada', fonte())
    correta = fonte()
    correta.registros[0]['nome'] = 'Camada certa'
    layer = nativo.gravar_camada(ds, 'correta', correta)
    layer = ds = None
    registro = {'tipo': 'vetor', 'id': 'base', 'camada_arquivo': 'correta',
                'metadados': {'caminho_arquivo': 'base.gpkg'}}
    monkeypatch.setattr(connection, 'get_connection', lambda: nullcontext(None))
    monkeypatch.setattr(repo, '_find_layer', lambda *args: ('importadas', registro))
    monkeypatch.setattr(path_policy, 'project_path', lambda p: path)
    assert nativo.carregar_referencia('base').registros[0]['nome'] == 'Camada certa'
    registro['camada_arquivo'] = 'inexistente'
    with pytest.raises(ValueError, match='subcamada'):
        nativo.carregar_referencia('base')
