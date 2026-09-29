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


def test_job_publica_etapas_e_resultado_sem_modal_geral(monkeypatch):
    from time import monotonic, sleep
    from types import SimpleNamespace
    from api.services import bancada_arquivos as service
    from api.services.geoprocessamento_jobs import geoprocessamento_jobs as jobs
    from api.services import geoprocessamento_relatorio
    def executar(op, params, files, user, progress=None):
        progress('Lendo arquivo teste: 4 feições')
        progress('Executando Buffer')
        progress('Preparando resultado')
        return {'execucao_id':'teste','resultado':{'camada_id':'saida'}}
    monkeypatch.setattr(service,'executar',executar)
    monkeypatch.setattr(geoprocessamento_relatorio,'salvar',lambda snapshot:[])
    job=service.iniciar_execucao('OP-01',{}, {},SimpleNamespace(id='teste'))
    deadline=monotonic()+3
    while job['status'] not in ('concluido','erro') and monotonic()<deadline:
        sleep(.01)
        job=jobs.get(job['id'])
    assert job['status']=='concluido'
    assert job['resultado']['execucao_id']=='teste'
    assert [item['mensagem'] for item in job['logs']][:3]==['Lendo arquivo teste: 4 feições','Executando Buffer','Preparando resultado']
    assert job['percentual']==100


def _gravar_fids(path, fids):
    ds = ogr.Open(str(path), 1)
    layer = ds.GetLayer(0)
    layer.DeleteFeature(layer.GetNextFeature().GetFID())
    for fid, nome in fids:
        feature = ogr.Feature(layer.GetLayerDefn())
        feature.SetFID(fid)
        feature.SetField('nome', nome)
        feature.SetGeometry(ogr.CreateGeometryFromWkt('POLYGON ((0 0,1000 0,1000 1000,0 1000,0 0))'))
        layer.CreateFeature(feature)
    ds = None


def _proibir_leitura_de_mapa(monkeypatch):
    from api.services import storage_geoespacial as storage
    def falhar(*args, **kwargs):
        pytest.fail('A execução não deve gerar GeoJSON de mapa para as entradas')
    monkeypatch.setattr(service, 'ler_arquivo', falhar)
    monkeypatch.setattr(reader, 'ler_arquivo', falhar)
    monkeypatch.setattr(storage, 'ler_para_mapa', falhar)
    monkeypatch.setattr(service, 'abrir', falhar)


def _preparar_execucao(monkeypatch):
    monkeypatch.setattr(service.ciclo, 'iniciar', lambda *args: 'teste')
    monkeypatch.setattr(service.ciclo, 'finalizar', lambda *args, **kwargs: None)
    monkeypatch.setattr(service.geo, '_camadas', {})
    monkeypatch.setattr(service.geo, '_metadados', {})
    frames = []
    def register(frame, *args, **kwargs):
        frames.append(frame.copy())
        return 'resultado'
    monkeypatch.setattr(service.geo, 'registrar_camada', register)
    return frames


def test_processar_selecao_e_filtro_de_arquivo_preserva_fids(source, monkeypatch):
    original, path = source
    _gravar_fids(path, [(71, 'Original'), (92, 'Outra')])
    original = reader.ler_arquivo(original['arquivo'])
    other = next(f for f in original['geojson']['features'] if f['id'] == '92')
    before = path.read_bytes()
    _proibir_leitura_de_mapa(monkeypatch)
    frames = _preparar_execucao(monkeypatch)
    result = service.executar('OP-28', {
        'camada_id': original['id'], 'processar_sobre': 'selecionadas',
        'chaves_selecionadas': ['92'], 'atributos_selecionados': [{'__gp_feature': other}],
        'filtros_camadas': {original['id']: "nome == 'Outra'"},
    }, {original['id']: {'arquivo': original['arquivo'], 'revisao': original['revisao']}}, SimpleNamespace(id='teste'))
    assert result['resultado']['camada_id'] == 'resultado'
    assert frames[0]['nome'].tolist() == ['Outra']
    assert path.read_bytes() == before
    assert service.geo._camadas == {}


def test_carga_de_execucao_preserva_fids_e_crs_sem_geojson(source, monkeypatch):
    original, path = source
    _gravar_fids(path, [(71, 'Original'), (92, 'Outra')])
    revisao = reader.ler_arquivo(original['arquivo'])['revisao']
    _proibir_leitura_de_mapa(monkeypatch)
    loaded = service.carregar_para_execucao(original['arquivo'], revisao)
    assert loaded['id'] == original['id']
    assert loaded['revisao'] == revisao
    assert loaded['frame'].index.tolist() == ['71', '92']
    assert loaded['frame'].crs.to_epsg() == 3857
    assert loaded['frame'].geometry.iloc[0].area == pytest.approx(1000000)
    assert 'slt_fid_origem' not in loaded['frame'].columns


def test_execucao_rejeita_revisao_obsoleta_de_arquivo(source, monkeypatch):
    original, path = source
    _gravar_fids(path, [(3, 'Alterada depois da abertura')])
    _proibir_leitura_de_mapa(monkeypatch)
    _preparar_execucao(monkeypatch)
    monkeypatch.setattr(service.ciclo, 'iniciar', lambda *a: pytest.fail('Não deve iniciar execução'))
    with pytest.raises(ValueError, match='mudou'):
        service.executar('OP-28', {'camada_id': original['id']},
                         {original['id']: {'arquivo': original['arquivo'], 'revisao': original['revisao']}},
                         SimpleNamespace(id='teste'))
    assert service.geo._camadas == {}


@pytest.fixture
def storage_source(tmp_path, monkeypatch):
    from api.services import storage_geoespacial as storage
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: tmp_path)
    path = tmp_path / 'base-geoespacial' / 'teste.gpkg'
    path.parent.mkdir(parents=True)
    dataset = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    crs = osr.SpatialReference()
    crs.ImportFromEPSG(3857)
    layer = dataset.CreateLayer('area', crs, ogr.wkbPolygon)
    layer.CreateField(ogr.FieldDefn('nome', ogr.OFTString))
    for fid, x in [(5, 0), (9, 5000)]:
        feature = ogr.Feature(layer.GetLayerDefn())
        feature.SetFID(fid)
        feature.SetField('nome', f'fid-{fid}')
        feature.SetGeometry(ogr.CreateGeometryFromWkt(
            f'POLYGON (({x} 0,{x + 1000} 0,{x + 1000} 1000,{x} 1000,{x} 0))'))
        layer.CreateFeature(feature)
    dataset = None
    stat = path.stat()
    return 'base-geoespacial/teste.gpkg', f'{stat.st_mtime_ns}-{stat.st_size}', path


def test_execucao_storage_le_original_sem_ler_para_mapa(storage_source, monkeypatch):
    arquivo, revisao, path = storage_source
    ident = 'storage:' + arquivo
    before = path.read_bytes()
    _proibir_leitura_de_mapa(monkeypatch)
    frames = _preparar_execucao(monkeypatch)
    captured = {}
    from api.services.geoprocessamento_engine import geoprocessamento_engine
    engine_execute = geoprocessamento_engine.execute
    async def spy(operacao, params, **kwargs):
        frame = service.geo._camadas[params['camada_id']]
        captured.update(index=frame.index.tolist(), epsg=frame.crs.to_epsg(),
                        area=frame.geometry.area.tolist())
        return await engine_execute(operacao, params, **kwargs)
    monkeypatch.setattr(geoprocessamento_engine, 'execute', spy)
    result = service.executar('OP-28', {'camada_id': ident},
                              {ident: {'arquivo': arquivo, 'revisao': revisao}}, SimpleNamespace(id='teste'))
    assert result['resultado']['camada_id'] == 'resultado'
    assert captured['index'] == ['5', '9']
    assert captured['epsg'] == 3857
    assert captured['area'] == pytest.approx([1000000, 1000000])
    assert len(frames[0]) == 2
    assert path.read_bytes() == before
    assert service.geo._camadas == {} and service.geo._metadados == {}


def test_execucao_storage_3d_em_31983_preserva_z_crs_e_fids(tmp_path, monkeypatch):
    from api.services import storage_geoespacial as storage
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: tmp_path)
    path = tmp_path / 'base-geoespacial' / 'relevo.gpkg'
    path.parent.mkdir(parents=True)
    dataset = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    crs = osr.SpatialReference()
    crs.ImportFromEPSG(31983)
    layer = dataset.CreateLayer('curvas', crs, ogr.wkbPolygon25D)
    for fid, x, z in [(4, 330000, 710.5), (11, 331000, 815.25)]:
        feature = ogr.Feature(layer.GetLayerDefn())
        feature.SetFID(fid)
        feature.SetGeometry(ogr.CreateGeometryFromWkt(
            f'POLYGON Z (({x} 7390000 {z},{x + 100} 7390000 {z},{x + 100} 7390100 {z},{x} 7390000 {z}))'))
        layer.CreateFeature(feature)
    dataset = None
    stat = path.stat()
    arquivo, revisao = 'base-geoespacial/relevo.gpkg', f'{stat.st_mtime_ns}-{stat.st_size}'
    ident = 'storage:' + arquivo
    before = path.read_bytes()
    _proibir_leitura_de_mapa(monkeypatch)
    monkeypatch.setattr(storage, 'carregar_gdf', lambda *a: pytest.fail('Não deve reprojetar nem forçar 2D'))
    _preparar_execucao(monkeypatch)
    captured = {}
    from api.services.geoprocessamento_engine import geoprocessamento_engine
    engine_execute = geoprocessamento_engine.execute
    async def spy(operacao, params, **kwargs):
        frame = service.geo._camadas[params['camada_id']]
        captured.update(index=frame.index.tolist(), epsg=frame.crs.to_epsg(),
                        z=frame.geometry.has_z.tolist(),
                        cotas=[geom.exterior.coords[0][2] for geom in frame.geometry],
                        x=[geom.exterior.coords[0][0] for geom in frame.geometry],
                        crs=service.geo._metadados[params['camada_id']]['crs'])
        return await engine_execute(operacao, params, **kwargs)
    monkeypatch.setattr(geoprocessamento_engine, 'execute', spy)
    service.executar('OP-28', {'camada_id': ident},
                     {ident: {'arquivo': arquivo, 'revisao': revisao}}, SimpleNamespace(id='teste'))
    assert captured['index'] == ['4', '11']
    assert captured['epsg'] == 31983 and '31983' in captured['crs']
    assert captured['z'] == [True, True]
    assert captured['cotas'] == [710.5, 815.25]
    assert captured['x'] == [330000, 331000]
    assert path.read_bytes() == before
    assert service.geo._camadas == {} and service.geo._metadados == {}

@pytest.mark.parametrize('case', ['revisao', 'identificador'])
def test_execucao_storage_rejeita_revisao_e_identificador(storage_source, monkeypatch, case):
    arquivo, revisao, _ = storage_source
    ident = 'storage:' + arquivo
    if case == 'revisao':
        revisao, message = 'revisao-antiga', 'mudou'
    else:
        ident, message = 'storage:base-geoespacial/outro.gpkg', 'não corresponde'
    _proibir_leitura_de_mapa(monkeypatch)
    _preparar_execucao(monkeypatch)
    monkeypatch.setattr(service.ciclo, 'iniciar', lambda *a: pytest.fail('Não deve iniciar execução'))
    with pytest.raises(ValueError, match=message):
        service.executar('OP-28', {'camada_id': ident},
                         {ident: {'arquivo': arquivo, 'revisao': revisao}}, SimpleNamespace(id='teste'))
    assert service.geo._camadas == {}
