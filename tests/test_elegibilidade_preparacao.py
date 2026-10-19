import json
from hashlib import sha256
from types import SimpleNamespace
from uuid import uuid4

import geopandas as gpd
import pandas as pd
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from osgeo import ogr
from shapely.geometry import Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection

from api.services import elegibilidade_preparacao as service
from api.services import extracao_preparacao as previa, extracao_entrada_local as local
from api.services import storage_geoespacial as storage


@pytest.fixture
def isolado(storage_sintetico, monkeypatch, tmp_path):
    root = storage_sintetico
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: root)
    monkeypatch.setattr(previa, 'sem_montagem', lambda: False)
    from api import path_policy
    monkeypatch.setattr(path_policy, 'project_path', lambda caminho: tmp_path / caminho)
    monkeypatch.setattr(local, 'localizacao', lambda frame: {'status': 'consultado'})
    gravados = []

    def registrar(nome, conteudos, ident, tipo):
        caminho = f'saidas-geoespaciais/execucoes/{uuid4()}/camadas/{nome}'
        path = root / caminho
        path.parent.mkdir(parents=True)
        path.write_bytes(conteudos[nome])
        gravados.append({'origem': ident, 'arquivo': path, 'tipo': tipo})
        return {'caminho': caminho}

    monkeypatch.setattr(service.ciclo, 'registrar_exportacao_memoria', registrar)
    return root, gravados


def camada(geometrias, crs=4326):
    return gpd.GeoDataFrame({'codigo': [f'D-{i}' for i in range(len(geometrias))],
                            'valor': list(range(len(geometrias)))}, geometry=geometrias, crs=crs)


def tipos():
    polygon = Polygon([(-46.6, -23.5), (-46.59, -23.5), (-46.59, -23.49), (-46.6, -23.5)])
    return [Point(-46.6, -23.5), MultiPoint([(-46.6, -23.5), (-46.58, -23.5)]),
            LineString([(-46.6, -23.5), (-46.59, -23.5)]),
            MultiLineString([[(-46.6, -23.5), (-46.59, -23.5)], [(-46.58, -23.5), (-46.57, -23.5)]]),
            polygon, MultiPolygon([polygon])]


def test_conversoes_reais_preservam_registros_campos_e_parametros():
    original = camada(tipos(), crs=4674)
    antes = original.copy()
    resultado, auditoria = service.normalizar_frame(original)
    assert resultado.crs.to_epsg() == 4674
    assert resultado.geometry.is_valid.all()
    assert resultado.geometry.geom_type.isin(['Polygon', 'MultiPolygon']).all()
    assert resultado[['codigo', 'valor']].equals(original[['codigo', 'valor']])
    assert original.equals(antes)
    assert auditoria['pontos_convertidos'] == auditoria['linhas_convertidas'] == auditoria['poligonos_sem_buffer'] == 2
    assert auditoria['feicoes'] == 6
    metrica = resultado.to_crs(5880)
    fonte = original.to_crs(5880)
    ponto = fonte.geometry.iloc[0]
    distancias = [Point(x, y).distance(ponto) for x, y in metrica.geometry.iloc[0].exterior.coords]
    assert min(distancias) == pytest.approx(50, abs=.01)
    assert max(distancias) == pytest.approx(50, abs=.01)
    assert len(distancias) == 32 * 4 + 1
    linha = fonte.geometry.iloc[2]
    centro = linha.interpolate(.5, normalized=True)
    assert metrica.geometry.iloc[2].boundary.distance(centro) == pytest.approx(25, abs=.01)
    assert metrica.geometry.iloc[4].symmetric_difference(fonte.geometry.iloc[4]).area < .001
    assert auditoria['crs_metrico'] == 'EPSG:5880'


def test_crs_projetado_e_poligonos_nao_recebem_novo_buffer():
    original = camada([Point(-46.6, -23.5)]).to_crs(31983)
    primeira, _ = service.normalizar_frame(original)
    segunda, auditoria = service.normalizar_frame(primeira)
    assert segunda.geometry.iloc[0].equals_exact(primeira.geometry.iloc[0], 1e-10)
    assert auditoria['pontos_convertidos'] == 0
    assert auditoria['poligonos_sem_buffer'] == 1


@pytest.mark.parametrize('geometria', [None, Point(), GeometryCollection()])
def test_sem_descartes_silenciosos(geometria):
    with pytest.raises(ValueError, match='feição|Feição'):
        service.normalizar_frame(camada([Point(-46.6, -23.5), geometria]))


def test_sem_crs_e_coordenadas_incompativeis():
    original = camada([Point(-46.6, -23.5)])
    original.crs = None
    with pytest.raises(ValueError, match='coordenadas'):
        service.normalizar_frame(original)
    with pytest.raises(ValueError, match='CRS'):
        service.normalizar_frame(camada([Point(300000, 7400000)]))


def test_reparo_de_poligono_invalido():
    cruzado = Polygon([(-46.6, -23.5), (-46.59, -23.49), (-46.6, -23.49), (-46.59, -23.5), (-46.6, -23.5)])
    resultado, auditoria = service.normalizar_frame(camada([cruzado]))
    assert resultado.geometry.is_valid.all()
    assert resultado.geometry.iloc[0].geom_type in {'Polygon', 'MultiPolygon'}
    assert auditoria['poligonos_sem_buffer'] == 1


def test_entrada_3d_e_normalizada_em_2d():
    resultado, _ = service.normalizar_frame(camada([Point(-46.6, -23.5, 100)]))
    assert not resultado.geometry.iloc[0].has_z
    assert resultado.geometry.iloc[0].is_valid


def test_colecao_na_feicao_115_preserva_fid_atributos_e_componentes():
    colecao = GeometryCollection([
        Point(-46.6, -23.5),
        GeometryCollection([
            LineString([(-46.59, -23.5), (-46.58, -23.5)]),
            Polygon([(-46.57, -23.5), (-46.56, -23.5), (-46.56, -23.49), (-46.57, -23.5)]),
        ]),
    ])
    original = camada([Point(-46.7, -23.5)] * 114 + [colecao])
    original.index = list(range(114)) + [118]
    antes = original.copy()
    resultado, auditoria = service.normalizar_frame(original)
    assert len(resultado) == 115 and resultado.index[-1] == 118
    assert resultado.iloc[-1]['codigo'] == 'D-114'
    assert resultado[['codigo', 'valor']].equals(original[['codigo', 'valor']])
    assert original.equals(antes)
    assert resultado.geometry.iloc[-1].geom_type == 'MultiPolygon'
    assert len(resultado.geometry.iloc[-1].geoms) == 3
    assert auditoria['colecoes_convertidas'] == 1
    assert auditoria['componentes_colecoes'] == {'Point': 1, 'LineString': 1, 'Polygon': 1}


def test_componente_vazio_identifica_feicao_fid_e_caminho():
    geometria = GeometryCollection([
        Point(-46.6, -23.5),
        GeometryCollection([Point(-46.59, -23.5), Polygon()]),
    ])
    original = camada([geometria])
    original.index = [118]
    with pytest.raises(ValueError, match=r'Feição 1 \(FID/índice 118\).*componente 2 > componente 2.*vazia'):
        service.normalizar_frame(original)


def test_colecao_gera_arquivo_poligonal_integral_para_calculos(isolado):
    root, gravados = isolado
    arquivo = root / 'base-geoespacial' / 'colecao.gpkg'
    arquivo.parent.mkdir()
    original = camada([GeometryCollection(tipos())])
    original.to_file(arquivo, layer='entrada', driver='GPKG', engine='pyogrio')
    antes = sha256(arquivo.read_bytes()).hexdigest()
    resposta = service.preparar_demanda('storage:base-geoespacial/colecao.gpkg::entrada', 'autor')
    from api.services.bancada_arquivos import carregar_para_execucao
    frame = carregar_para_execucao(resposta['arquivo'], resposta['revisao'], resposta['id'])['frame']
    assert len(frame) == 1 and frame.iloc[0]['codigo'] == 'D-0'
    assert frame.geometry.iloc[0].geom_type in {'Polygon', 'MultiPolygon'} and frame.geometry.iloc[0].is_valid
    esperado, _ = service.normalizar_frame(original)
    assert frame.geometry.iloc[0].equals(esperado.geometry.iloc[0])
    assert frame[resposta['normalizacao_demanda']['campo_fid_origem']].tolist() == [1]
    assert resposta['normalizacao_demanda']['colecoes_convertidas'] == 1
    assert set(resposta['normalizacao_demanda']['componentes_colecoes']) == {g.geom_type for g in tipos()}
    ds = ogr.Open(str(gravados[0]['arquivo']))
    auditoria = json.loads(ds.GetLayerByName('demandas').GetMetadata()['SICARD_NORMALIZACAO'])
    assert auditoria['colecoes_convertidas'] == 1 and sum(auditoria['componentes_colecoes'].values()) == 6
    assert sha256(arquivo.read_bytes()).hexdigest() == antes


@pytest.mark.parametrize('ident', ['cadastro:inexistente:D-1', 'cadastro:projeto:', 'cadastro:projeto'])
def test_referencia_cadastral_invalida_nao_consulta_banco(ident, monkeypatch):
    from api.repositories import cadastro_geometria_repository as repo

    def negar(*args):
        pytest.fail('Uma referência inválida não pode consultar o banco.')

    monkeypatch.setattr(repo, 'exportar_original', negar)
    with pytest.raises(ValueError, match='Referência'):
        service.preparar_demanda(ident, 'autor')


def test_arquivo_integral_derivado_e_lido_pelos_calculos(isolado):
    root, gravados = isolado
    original = root / 'base-geoespacial' / 'demandas.gpkg'
    original.parent.mkdir()
    fonte = camada(tipos(), crs=4674)
    fonte.to_file(original, layer='entrada', driver='GPKG', engine='pyogrio')
    antes = sha256(original.read_bytes()).hexdigest()
    ident = 'storage:base-geoespacial/demandas.gpkg::entrada'
    resposta = service.preparar_demanda(ident, 'autor')
    assert len(gravados) == 1 and gravados[0]['origem'] == ident
    assert resposta['id'] == f"storage:{resposta['arquivo']}::demandas"
    assert resposta['representacao'] == 'tiles' and 'geojson' not in resposta
    assert resposta['normalizacao_demanda']['feicoes'] == 6
    assert resposta['metadados_local']['normalizacao_demanda']['origem']['sha256'] == antes
    assert resposta['metadados_local']['tipos_geometria']
    assert set(resposta['metadados_local']['tipos_geometria']) <= {'MultiPolygon', 'Polygon'}
    assert sha256(original.read_bytes()).hexdigest() == antes
    ds = ogr.Open(str(gravados[0]['arquivo']))
    metadata = ds.GetLayerByName('demandas').GetMetadata()
    assert json.loads(metadata['SICARD_NORMALIZACAO'])['origem']['id'] == ident
    from api.services.bancada_arquivos import carregar_para_execucao
    executavel = carregar_para_execucao(resposta['arquivo'], resposta['revisao'], resposta['id'])
    frame = executavel['frame']
    assert len(frame) == 6 and frame['codigo'].tolist() == fonte['codigo'].tolist()
    assert frame.geometry.geom_type.isin(['Polygon', 'MultiPolygon']).all()
    assert executavel['arquivo'] == resposta['arquivo']
    assert frame[resposta['normalizacao_demanda']['campo_fid_origem']].tolist() == list(range(1, 7))
    metrica = frame.to_crs(5880)
    linha = fonte.to_crs(5880).geometry.iloc[2]
    assert metrica.geometry.iloc[2].boundary.distance(linha.interpolate(.5, normalized=True)) == pytest.approx(25, abs=.01)


def test_hierarquizacao_usa_geometria_oficial_e_preserva_atributos(isolado, monkeypatch):
    from api.repositories import cadastro_geometria_repository as repo
    chamadas = []

    def oficial(tipo, codigo):
        chamadas.append((tipo, codigo))
        return {'type': 'FeatureCollection', 'crs': {'properties': {'name': 'EPSG:4674'}},
                'features': [{'type': 'Feature', 'properties': {'codigo': codigo},
                              'geometry': {'type': 'Point', 'coordinates': [-46.6, -23.5]}}]}

    monkeypatch.setattr(repo, 'exportar_original', oficial)
    resposta = service.preparar_demanda('cadastro:projeto:D-1', 'autor', {'hierarquizacao': 'H-1', 'objeto_hierarquizacao': {'atributos': {'teste': 42}}})
    assert chamadas == [('projeto', 'D-1')]
    arquivo = isolado[1][0]['arquivo']
    frame = gpd.read_file(arquivo, engine='pyogrio')
    assert frame.iloc[0]['hierarquizacao'] == 'H-1'
    assert json.loads(frame.iloc[0]['objeto_hierarquizacao'])['atributos']['teste'] == 42
    assert resposta['normalizacao_demanda']['pontos_convertidos'] == 1


def test_falha_na_validacao_nao_grava_arquivo(isolado, monkeypatch):
    monkeypatch.setattr(previa, 'carregar', lambda ident: (camada([None]), 'Inválida', None))
    with pytest.raises(ValueError):
        service.preparar_demanda('catalogo', 'autor')
    assert not isolado[1]


@pytest.fixture
def hierarquizacao_oficial(monkeypatch):
    from api.repositories import cadastro_geometria_repository as repo
    from api.services import hierarquizacao_service as hier
    objetos = [
        {'cabecalho_objeto': {'codigo': 'D-1', 'nome': 'Pontos e linhas', 'atributos': {'teste': 42}}},
        {'cabecalho_objeto': {'codigo': 'D-2', 'nome': 'Polígono', 'prioridade': 2}},
    ]
    dados = {'codigo': 'H-1', 'nome': 'Grupo oficial', 'tipo_demanda': 'projeto',
             'objetos': [], 'dados_hierarquizacao': {'objetos': objetos}}
    geometrias = {
        'D-1': camada([Point(-46.6, -23.5), LineString([(-46.6, -23.5), (-46.59, -23.5)])], crs=4674),
        'D-2': camada([tipos()[4]], crs=4326).to_crs(31983),
    }
    chamadas = []

    def oficial(tipo, codigo):
        chamadas.append((tipo, codigo))
        original = geometrias[codigo]
        return {**json.loads(original.to_json()), 'crs': {'properties': {'name': original.crs.to_string()}}}

    monkeypatch.setattr(hier, 'obter_hierarquizacao', lambda codigo: SimpleNamespace(model_dump=lambda **kwargs: dados))
    monkeypatch.setattr(repo, 'exportar_original', oficial)
    return dados, geometrias, chamadas


def test_hierarquizacao_gera_um_geopackage_uma_camada_todas_as_feicoes(isolado, hierarquizacao_oficial):
    dados, originais, chamadas = hierarquizacao_oficial
    antes = {codigo: frame.copy() for codigo, frame in originais.items()}
    resposta = service.preparar_hierarquizacao('H-1', ['cadastro:projeto:D-2', 'cadastro:projeto:D-1'], 'autor')
    assert chamadas == [('projeto', 'D-1'), ('projeto', 'D-2')]
    assert len(isolado[1]) == 1 and isolado[1][0]['origem'] == 'hierarquizacao:H-1'
    arquivo = isolado[1][0]['arquivo']
    ds = ogr.Open(str(arquivo))
    assert ds.GetLayerCount() == 1 and ds.GetLayer(0).GetName() == 'demandas'
    assert ds.GetLayer(0).GetFeatureCount() == 3
    auditoria = json.loads(ds.GetLayer(0).GetMetadata()['SICARD_NORMALIZACAO'])
    assert auditoria == resposta['normalizacao_demanda']
    assert auditoria['total_demandas'] == 2 and auditoria['feicoes'] == 3
    assert auditoria['pontos_convertidos'] == auditoria['linhas_convertidas'] == auditoria['poligonos_sem_buffer'] == 1
    assert [origem['id'] for origem in auditoria['origem']['camadas']] == ['cadastro:projeto:D-1', 'cadastro:projeto:D-2']
    assert auditoria['origem']['hierarquizacao'] == 'H-1'
    from api.services.bancada_arquivos import carregar_para_execucao
    frame = carregar_para_execucao(resposta['arquivo'], resposta['revisao'], resposta['id'])['frame']
    assert resposta['arquivo'].endswith('.gpkg') and resposta['camada'] == 'demandas'
    assert resposta['id'] == f"storage:{resposta['arquivo']}::demandas"
    assert frame.crs.to_epsg() == 4674 and len(frame) == 3
    assert frame.geometry.is_valid.all() and frame.geometry.geom_type.isin(['Polygon', 'MultiPolygon']).all()
    assert frame[auditoria['campo_codigo_demanda']].tolist() == ['D-1', 'D-1', 'D-2']
    assert frame[auditoria['campo_fid_origem']].tolist() == [0, 1, 0]
    assert frame[auditoria['campo_camada_origem']].tolist() == ['cadastro:projeto:D-1'] * 2 + ['cadastro:projeto:D-2']
    assert frame['valor'].tolist() == [0, 1, 0]
    assert frame['hierarquizacao'].tolist() == ['H-1'] * 3
    assert [json.loads(valor) for valor in frame['objeto_hierarquizacao']] == [dados['dados_hierarquizacao']['objetos'][0]] * 2 + [dados['dados_hierarquizacao']['objetos'][1]]
    assert json.loads(frame.iloc[0]['atributos']) == {'teste': 42}
    assert pd.isna(frame.iloc[2]['atributos'])
    assert frame.iloc[2]['prioridade'] == 2
    for codigo, original in originais.items():
        assert original.equals(antes[codigo])
        esperado, _ = service.normalizar_frame(original)
        selecionadas = frame[frame[auditoria['campo_codigo_demanda']] == codigo]
        assert all(a.equals(b) for a, b in zip(selecionadas.geometry, esperado.geometry))


@pytest.mark.parametrize('referencias', [
    [], ['cadastro:projeto:D-1'],
    ['cadastro:projeto:D-1', 'cadastro:projeto:D-1'],
    ['cadastro:projeto:D-1', 'cadastro:projeto:FORA-DO-GRUPO'],
])
def test_hierarquizacao_recusa_grupo_incompleto_duplicado_ou_estranho(isolado, hierarquizacao_oficial, referencias):
    with pytest.raises(ValueError, match='todas as demandas'):
        service.preparar_hierarquizacao('H-1', referencias, 'autor')
    assert not isolado[1] and not hierarquizacao_oficial[2]


def test_hierarquizacao_sem_objetos_ou_com_codigos_invalidos(isolado, hierarquizacao_oficial):
    dados = hierarquizacao_oficial[0]
    objetos = dados['dados_hierarquizacao']['objetos']
    dados['dados_hierarquizacao']['objetos'] = []
    with pytest.raises(ValueError, match='não contém demandas'):
        service.preparar_hierarquizacao('H-1', ['cadastro:projeto:D-1'], 'autor')
    dados['dados_hierarquizacao']['objetos'] = objetos
    objetos[1]['cabecalho_objeto']['codigo'] = ''
    with pytest.raises(ValueError, match='sem código'):
        service.preparar_hierarquizacao('H-1', ['cadastro:projeto:D-1'], 'autor')
    objetos[1]['cabecalho_objeto']['codigo'] = 'D-1'
    with pytest.raises(ValueError, match='repetidas'):
        service.preparar_hierarquizacao('H-1', ['cadastro:projeto:D-1'], 'autor')
    assert not isolado[1]


def test_hierarquizacao_sem_geometria_na_segunda_fonte_nao_grava_parcial(isolado, hierarquizacao_oficial):
    hierarquizacao_oficial[1]['D-2'].geometry = [None]
    with pytest.raises(ValueError, match='Feição|feição'):
        service.preparar_hierarquizacao('H-1', ['cadastro:projeto:D-1', 'cadastro:projeto:D-2'], 'autor')
    assert not isolado[1]


def test_hierarquizacao_nao_sobrescreve_campos_de_rastreio_existentes(isolado, hierarquizacao_oficial):
    fonte = hierarquizacao_oficial[1]['D-1']
    for campo in ('slt_fid_origem', 'slt_camada_origem', 'slt_codigo_demanda'):
        fonte[campo] = 'legado'
    resposta = service.preparar_hierarquizacao('H-1', ['cadastro:projeto:D-1', 'cadastro:projeto:D-2'], 'autor')
    frame = gpd.read_file(isolado[1][0]['arquivo'], layer='demandas', engine='pyogrio')
    assert frame.iloc[0]['slt_fid_origem'] == 'legado'
    assert frame['slt_fid_origem_'].tolist() == [0, 1, 0]
    assert resposta['normalizacao_demanda']['campo_camada_origem'] == 'slt_camada_origem_'


def test_hierarquizacao_recusa_perda_de_registros_antes_de_gravar(isolado, hierarquizacao_oficial, monkeypatch):
    ler = service.ler_vetor
    monkeypatch.setattr(service, 'ler_vetor', lambda *args: ler(*args).iloc[:1])
    with pytest.raises(ValueError, match='todas as demandas'):
        service.preparar_hierarquizacao('H-1', ['cadastro:projeto:D-1', 'cadastro:projeto:D-2'], 'autor')
    assert not isolado[1]


def test_sem_montagem_gera_previa_remota_sem_disco_local(isolado, monkeypatch):
    from api.services import storage_remoto
    arquivos = {}
    monkeypatch.setattr(previa, 'sem_montagem', lambda: True)
    monkeypatch.setattr(previa, 'carregar', lambda ident: (camada([Point(-46.6, -23.5)]), 'Ponto', None))

    def negar_pasta(*args):
        pytest.fail('A preparação sem montagem não pode criar prévia no disco local.')

    monkeypatch.setattr(previa, '_pasta', negar_pasta)
    monkeypatch.setattr(storage_remoto, 'listar', lambda *args, **kwargs: [])
    monkeypatch.setattr(storage_remoto, 'enviar_bytes', lambda caminho, dados: arquivos.update({caminho: dados}))
    monkeypatch.setattr(storage_remoto, 'baixar', lambda caminho: arquivos[caminho])
    resposta = service.preparar_demanda('catalogo', 'autor')
    assert resposta['normalizacao_demanda']['pontos_convertidos'] == 1
    assert resposta['arquivo'].startswith('saidas-geoespaciais/')
    assert len(arquivos) == 1
    assert next(iter(arquivos)).startswith('temporarios-sicard/extracao-atributos/previas/')
    assert resposta['tiles_token'] in next(iter(arquivos))


def test_arquivo_alterado_e_recusado_sem_gravar_derivado(isolado, monkeypatch):
    revisoes = iter([{'arquivo': 'base-geoespacial/fonte.gpkg', 'sha256': 'antes'},
                     {'arquivo': 'base-geoespacial/fonte.gpkg', 'sha256': 'depois'}])
    monkeypatch.setattr(storage, 'impressao_digital', lambda ident: next(revisoes))
    monkeypatch.setattr(previa, 'carregar', lambda ident: (camada([Point(-46.6, -23.5)]), 'Ponto', 'base-geoespacial/fonte.gpkg'))
    with pytest.raises(ValueError, match='mudou durante'):
        service.preparar_demanda('storage:base-geoespacial/fonte.gpkg', 'autor')
    assert not isolado[1]


def test_perda_de_atributo_no_arquivo_e_recusada(isolado, monkeypatch):
    monkeypatch.setattr(previa, 'carregar', lambda ident: (camada([Point(-46.6, -23.5)]), 'Ponto', None))
    ler = service.ler_vetor

    def adulterar(*args):
        frame = ler(*args)
        frame['codigo'] = 'adulterado'
        return frame

    monkeypatch.setattr(service, 'ler_vetor', adulterar)
    with pytest.raises(ValueError, match='atributos'):
        service.preparar_demanda('catalogo', 'autor')
    assert not isolado[1]


def test_rotas_autenticadas_e_parametros_compartilhados(monkeypatch):
    from api.routers.extracao_atributos import router
    from api.deps.auth import require_geospatial_access
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    client = TestClient(app)
    assert client.get('/extracao-atributos/elegibilidade/parametros').json() == service.parametros()
    monkeypatch.setattr(service, 'preparar_demanda', lambda ident, dono, atributos: {'id': ident, 'dono': dono})
    assert client.post('/extracao-atributos/elegibilidade/preparar-demanda', json={'id': 'entrada'}).json() == {'id': 'entrada', 'dono': 'autor'}
    assert client.post('/extracao-atributos/elegibilidade/preparar-demanda', json={'id': ''}).status_code == 422
    assert client.post('/extracao-atributos/elegibilidade/preparar-demanda', json={'id': 'entrada', 'atributos': {'grande': 'x' * 100001}}).status_code == 422

    def falha(*args):
        raise ValueError('Geometria recusada.')

    monkeypatch.setattr(service, 'preparar_demanda', falha)
    resposta = client.post('/extracao-atributos/elegibilidade/preparar-demanda', json={'id': 'entrada'})
    assert resposta.status_code == 422 and resposta.json()['detail'] == 'Geometria recusada.'


def test_rota_preparar_hierarquizacao_autenticada_e_erros_explicitos(monkeypatch):
    from api.routers.extracao_atributos import router
    from api.deps.auth import require_geospatial_access
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    client = TestClient(app)
    rota = '/extracao-atributos/elegibilidade/preparar-hierarquizacao'
    payload = {'codigo': 'H-1', 'demandas': ['cadastro:projeto:D-1']}
    monkeypatch.setattr(service, 'preparar_hierarquizacao',
                        lambda codigo, demandas, dono: {'codigo': codigo, 'demandas': demandas, 'dono': dono})
    assert client.post(rota, json=payload).json() == {**payload, 'dono': 'autor'}
    assert client.post(rota, json={**payload, 'demandas': []}).status_code == 422
    assert client.post(rota, json={**payload, 'codigo': ''}).status_code == 422

    def falhar(*args):
        raise ValueError('Grupo incompleto.')

    monkeypatch.setattr(service, 'preparar_hierarquizacao', falhar)
    resposta = client.post(rota, json=payload)
    assert resposta.status_code == 422 and resposta.json()['detail'] == 'Grupo incompleto.'

    def indisponivel(*args):
        raise FileNotFoundError('Geometria indisponível.')

    monkeypatch.setattr(service, 'preparar_hierarquizacao', indisponivel)
    assert client.post(rota, json=payload).status_code == 404
    def sem_sessao():
        raise HTTPException(401, 'Sessão necessária.')

    app.dependency_overrides[require_geospatial_access] = sem_sessao
    assert client.post(rota, json=payload).status_code == 401
