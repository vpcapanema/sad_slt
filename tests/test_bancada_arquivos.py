from copy import deepcopy
from types import SimpleNamespace

import pytest
from osgeo import ogr, osr

from api.services import bancada_arquivos as service
from api.services import visualizacao_arquivo as reader


@pytest.fixture
def source(tmp_path, monkeypatch):
    from api.services import extracao_entrada_local
    monkeypatch.setattr(extracao_entrada_local, 'localizacao', lambda _: {'status':'consultado','ufs':['SP'],'municipios':[]})
    relative = 'data/geoespacial/outputs/origem.gpkg'
    path = tmp_path / relative
    path.parent.mkdir(parents=True)
    dataset = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    crs = osr.SpatialReference()
    crs.ImportFromEPSG(3857)
    layer = dataset.CreateLayer('area', crs, ogr.wkbPolygon)
    layer.CreateField(ogr.FieldDefn('nome', ogr.OFTString))
    feature = ogr.Feature(layer.GetLayerDefn())
    feature.SetField('nome', 'Original')
    feature.SetGeometry(ogr.CreateGeometryFromWkt('POLYGON ((0 0,1000 0,1000 1000,0 1000,0 0))'))
    layer.CreateFeature(feature)
    dataset = None
    monkeypatch.setattr(reader, 'project_path', lambda value: tmp_path / value)
    monkeypatch.setattr(reader, 'camadas_dos_arquivos', lambda paths: [{'id': 'original', 'nome': 'Área'}])
    return reader.ler_arquivo(relative), path


def test_geometria_e_atributo_editados_preservam_crs(source):
    original, path = source
    assert original['metadados_local']['componente']=='area'
    assert original['metadados_local']['vertices']==5
    assert original['metadados_local']['bytes']==path.stat().st_size
    before = path.read_bytes()
    edited = deepcopy(original['geojson'])
    edited['features'][0]['properties']['nome'] = 'Editada'
    edited['features'][0]['geometry']['coordinates'][0][1][0] *= 2
    frame = service.frame_editado(original, edited)
    assert frame.crs.to_epsg() == 3857
    assert frame.iloc[0]['nome'] == 'Editada'
    assert frame.geometry.iloc[0].area == pytest.approx(1500000)
    assert path.read_bytes() == before


def test_detecta_alteracao_concorrente(source):
    original, path = source
    ds = ogr.Open(str(path), 1)
    layer = ds.GetLayer(0)
    feature = layer.GetNextFeature()
    feature.SetField('nome', 'Outra edição')
    layer.SetFeature(feature)
    ds = None
    with pytest.raises(ValueError, match='mudou'):
        service.abrir(original['arquivo'], original['revisao'])


@pytest.mark.parametrize('case', ['duplicate', 'fields', 'invalid'])
def test_rejeita_edicao_invalida(source, case):
    original, _ = source
    edited = deepcopy(original['geojson'])
    if case == 'duplicate':
        edited['features'] *= 2
    elif case == 'fields':
        edited['features'][0]['properties']['novo'] = 'não previsto'
    else:
        edited['features'][0]['geometry']['coordinates'] = [[[0,0],[1,1],[1,0],[0,1],[0,0]]]
    with pytest.raises(ValueError):
        service.frame_editado(original, edited)


def test_algoritmo_reusa_motor_com_arquivo_e_limpa_cache_temporario(source, monkeypatch):
    original, _ = source
    frames = []
    monkeypatch.setattr(service.ciclo, 'iniciar', lambda *a: 'execucao-teste')
    monkeypatch.setattr(service.ciclo, 'finalizar', lambda *a, **k: None)
    monkeypatch.setattr(service.geo, '_camadas', {})
    monkeypatch.setattr(service.geo, '_metadados', {})
    def register(frame, *args, **kwargs):
        frames.append(frame.copy())
        return 'resultado'
    monkeypatch.setattr(service.geo, 'registrar_camada', register)
    result = service.executar('OP-28', {'camada_id': 'original'},
                             {'original': {'arquivo': original['arquivo'], 'revisao': original['revisao']}}, SimpleNamespace(id='teste'))
    assert result['resultado']['camada_id'] == 'resultado'
    assert frames[0].geometry.iloc[0].x == pytest.approx(500)
    assert frames[0].geometry.iloc[0].y == pytest.approx(500)
    assert service.geo._camadas == {}


def preparar_gravacao_no_original(monkeypatch, original, path):
    monkeypatch.setattr(service, 'project_path', lambda _: path)
    monkeypatch.setattr(service.geo, '_metadados', {original['id']: {'caminho_arquivo': original['arquivo']}})
    monkeypatch.setattr(service.geo, '_camadas', {})
    def substituir(ident, frame, metadata, *, arquivo_editado, gravar_arquivo):
        assert ident == original['id']
        assert arquivo_editado == path
        gravar_arquivo()
    monkeypatch.setattr(service.repo, 'substituir_vetor', substituir)
    monkeypatch.setattr(service.geo, 'registrar_camada', lambda *a, **k: pytest.fail('Não deve criar uma camada'))


def test_salva_no_original_sem_copia_e_mantem_identidade(source, monkeypatch):
    original, path = source
    before = path.read_bytes()
    calls = []
    monkeypatch.setattr(service.ciclo, 'iniciar', lambda *args: calls.append(args) or 'execucao-teste')
    monkeypatch.setattr(service.ciclo, 'finalizar', lambda *a, **k: None)
    preparar_gravacao_no_original(monkeypatch, original, path)
    edited = deepcopy(original['geojson'])
    edited['features'][0]['properties']['nome'] = 'Editada no original'
    result = service.salvar(original['arquivo'], original['revisao'], edited, 'Nome ignorado', SimpleNamespace(id='teste'))
    assert result['arquivo'] == original['arquivo']
    assert result['id'] == original['id']
    assert result['nome'] == original['nome']
    assert result['revisao'] != original['revisao']
    assert result['geojson']['features'][0]['properties']['nome'] == 'Editada no original'
    assert calls[0][1]['camada_id'] == 'original'
    assert path.read_bytes() != before
    assert list(path.parent.iterdir()) == [path], 'Nenhuma cópia, backup ou temporário residual'
    with pytest.raises(ValueError, match='mudou'):
        service.salvar(original['arquivo'], original['revisao'], edited, '', SimpleNamespace(id='teste'))
    edited['features'][0]['properties']['nome'] = 'Segunda edição'
    again = service.salvar(result['arquivo'], result['revisao'], edited, '', SimpleNamespace(id='teste'))
    assert again['geojson']['features'][0]['properties']['nome'] == 'Segunda edição'


def test_endpoints_exigem_sessao():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.bancada_arquivos import router
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        assert client.post('/bancada-arquivos/salvar', json={}).status_code == 401
        assert client.post('/bancada-arquivos/executar', json={}).status_code == 401


def test_consulta_arquivo_preserva_ids_e_original(source):
    original,path=source
    before=path.read_bytes()
    result=service.consultar(original['arquivo'],original['revisao'],'nome == "Original"')
    assert result['total']==1
    assert result['geojson']['features'][0]['id']==str(original['geojson']['features'][0]['id'])
    assert path.read_bytes()==before


def test_consulta_sem_correspondencia_e_expressao_invalida(source):
    original,_=source
    assert service.consultar(original['arquivo'],original['revisao'],'nome == "Ausente"')['total']==0
    with pytest.raises(ValueError):
        service.consultar(original['arquivo'],original['revisao'],'nome.mean()')


def test_operacao_mistura_arquivo_e_camada_do_catalogo(source,monkeypatch):
    import geopandas as gpd
    from shapely.geometry import box
    original,_=source
    monkeypatch.setattr(service.ciclo,'iniciar',lambda *a:'teste-misto')
    monkeypatch.setattr(service.ciclo,'finalizar',lambda *a,**kw:None)
    monkeypatch.setattr(service.geo,'_camadas',{})
    monkeypatch.setattr(service.geo,'_metadados',{})
    mask=gpd.GeoDataFrame(geometry=[box(0,0,500,1000)],crs=3857)
    frames=[]
    monkeypatch.setattr(service.geo,'obter_camada_dados',lambda ident:mask if ident=='mascara' else service.geo._camadas[ident])
    monkeypatch.setattr(service.geo,'registrar_camada',lambda frame,*a,**kw:frames.append(frame.copy()) or 'saida')
    result=service.executar('OP-33',{'camada_id':'original','camada_mascara_id':'mascara'},
                            {'original':{'arquivo':original['arquivo'],'revisao':original['revisao']}},SimpleNamespace(id='teste'))
    assert result['resultado']['camada_id']=='saida'
    assert frames[0].geometry.iloc[0].area==pytest.approx(500000)
    assert not service.geo._camadas and not service.geo._metadados


@pytest.mark.parametrize('json_subtype', [ogr.OFSTNone, ogr.OFSTJSON])
def test_excluir_nulos_e_salvar_preserva_booleanos_e_json(source, monkeypatch, json_subtype):
    import json
    original, path = source
    ds = ogr.Open(str(path), 1)
    layer = ds.GetLayer(0)
    for name, kind, subtype in [('ativo', ogr.OFTInteger, ogr.OFSTBoolean),
                                ('valores', ogr.OFTString, json_subtype)]:
        field = ogr.FieldDefn(name, kind)
        field.SetSubType(subtype)
        layer.CreateField(field)
    for name, active, values in [(None, True, '["remover"]'), ('Manter', False, '["a",null]')]:
        feature = ogr.Feature(layer.GetLayerDefn())
        if name is not None:
            feature.SetField('nome', name)
        feature.SetField('ativo', int(active))
        feature.SetField('valores', values)
        feature.SetGeometry(ogr.CreateGeometryFromWkt('POLYGON ((0 0,1000 0,1000 1000,0 1000,0 0))'))
        layer.CreateFeature(feature)
    ds = None
    original = reader.ler_arquivo(original['arquivo'])
    before = path.read_bytes()
    edited = deepcopy(original['geojson'])
    edited['features'] = [f for f in edited['features'] if f['properties']['nome'] is not None]
    remaining = next(f for f in edited['features'] if f['properties']['nome'] == 'Manter')
    assert remaining['properties']['ativo'] is False
    assert remaining['properties']['valores'] == ['a', None]
    monkeypatch.setattr(service.ciclo, 'iniciar', lambda *args: 'teste-exclusao')
    monkeypatch.setattr(service.ciclo, 'finalizar', lambda *a, **k: None)
    preparar_gravacao_no_original(monkeypatch, original, path)
    result = service.salvar(original['arquivo'], original['revisao'], edited, 'Sem nulos', SimpleNamespace(id='teste'))
    assert len(result['geojson']['features']) == 2
    assert {f['id'] for f in result['geojson']['features']} == {f['id'] for f in edited['features']}
    saved = next(f for f in result['geojson']['features'] if f['properties']['nome'] == 'Manter')
    assert saved['properties']['ativo'] is False
    assert saved['properties']['valores'] == ['a', None]
    assert path.read_bytes() != before
    assert result['arquivo'] == original['arquivo']
    assert list(path.parent.iterdir()) == [path]
    assert remaining['properties']['valores'] == ['a', None], 'Não altera o payload recebido'
