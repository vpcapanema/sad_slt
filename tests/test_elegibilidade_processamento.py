import json
from io import BytesIO
from types import SimpleNamespace
from concurrent.futures import Future

import geopandas as gpd
import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from osgeo import ogr
from shapely.geometry import box

from api.services import elegibilidade_processamento as service
from api.services.controle_processamento import ControleProcessamento, ProcessamentoCancelado
from api.services.arquivos_geoespaciais_memoria import ler_vetor, vetor


def frame(geometrias, **atributos):
    return gpd.GeoDataFrame(atributos, geometry=geometrias, crs=5880)


def fonte():
    return frame([box(0, 0, 10, 10), box(20, 0, 30, 10), box(40, 0, 50, 10)],
                 ID_FEICAO=['A', 'B', 'C'], nome=['Um', 'Dois', 'Três'], valor=[4., None, 7.])


def test_intersecoes_independentes_soma_sem_uniao_null_e_preservacao():
    entrada = fonte()
    entrada.index = [118, 300, 901]
    antes = entrada.copy()
    bases = [
        ('restricao', 'APP', 'app', frame([box(0, 0, 8, 10), box(2, 0, 10, 10)])),
        ('restricao', 'Terra Indígena', 'ti', frame([box(20, 0, 25, 10)])),
        ('risco', 'Inundação', 'inund', frame([box(5, 0, 10, 10)])),
    ]
    saida, auditoria = service.calcular(entrada, bases, ControleProcessamento())
    assert saida.loc[118, 're_app'] == 160  # Soma de dois fragmentos de 80, não união de 100.
    assert saida.loc[300, 're_ti'] == 50  # Não depende da interseção anterior.
    assert saida.loc[118, 'ri_inund'] == 50
    assert saida.loc[901, ['re_app', 're_ti', 'ri_inund']].isna().all()
    assert pd.isna(saida.loc[300, 're_app'])
    assert saida[entrada.columns].equals(antes)
    assert entrada.equals(antes)
    assert auditoria['unidade'] == 'm²'


def test_contato_sem_area_zero_e_ausencia_null():
    entrada = fonte()
    saida, _ = service.calcular(entrada, [
        ('restricao', 'APP', 'app', frame([box(10, 0, 11, 10)])),
    ], ControleProcessamento())
    assert saida.loc[0, 're_app'] == 0
    assert pd.isna(saida.loc[1, 're_app'])


def test_intersecoes_persistidas_por_feicao_sem_agrupar_nomes_iguais():
    entrada = fonte()
    entrada['area_total_m2'] = 'atributo original'
    recortes = []
    saida, auditoria = service.calcular(entrada, [
        ('restricao', 'APP', 'base-a', frame([box(0,0,8,10), box(2,0,10,10)], nome=['Mesmo Nome','Mesmo Nome'])),
        ('risco', 'Contato', 'base-b', frame([box(10,0,11,10)], nome=['Limite']))],
        ControleProcessamento(), intersecoes=recortes)
    assert saida.area_total_m2.tolist() == ['atributo original']*3
    assert saida[auditoria['campo_area_total']].tolist() == [100.]*3
    assert saida.re_app.iloc[0] == 160.
    assert len({r['feicao_id'] for r in recortes}) == 3
    assert [r['area_m2'] for r in recortes] == [80.,80.,0.]
    assert recortes[2]['geometry'].geom_type in {'LineString','MultiLineString'}
    assert [f['nome'] for f in auditoria['feicoes_base']] == ['Mesmo Nome','Mesmo Nome','Limite']
    dados = service.serializar(saida, auditoria, recortes, 'teste.gpkg')
    persistidos = gpd.read_file(BytesIO(dados['teste.gpkg']), engine='pyogrio', layer='intersecoes')
    assert persistidos.area_m2.tolist() == [80.,80.,0.]
    assert persistidos.demanda_pos.tolist() == [0,0,0]


def test_saida_sem_intersecoes_possui_camada_vazia_e_entrada_completa():
    recortes = []
    saida, auditoria = service.calcular(fonte(), [
        ('risco', 'Distante', 'base', frame([box(1000,1000,1010,1010)]))],
        ControleProcessamento(), intersecoes=recortes)
    dados = service.serializar(saida, auditoria, recortes, 'vazia.gpkg')
    assert gpd.read_file(BytesIO(dados['vazia.gpkg']), engine='pyogrio', layer='intersecoes').empty
    assert len(gpd.read_file(BytesIO(dados['vazia.gpkg']), engine='pyogrio', layer='elegibilidade_territorial')) == 3


def test_identificador_tecnico_e_colisoes_nao_sobrescrevem_atributos():
    entrada = fonte().drop(columns='ID_FEICAO')
    entrada['re_app'] = 'original'
    saida, _ = service.calcular(entrada, [
        ('restricao', 'APP', 'a', frame([box(0, 0, 5, 10)])),
        ('restricao', 'APP', 'b', frame([box(5, 0, 10, 10)])),
    ], ControleProcessamento())
    assert saida.ID_FEICAO.tolist() == [1, 2, 3]
    assert saida.re_app.tolist() == ['original'] * 3
    assert saida.re_app_2.iloc[0] == saida.re_app_3.iloc[0] == 50


@pytest.mark.parametrize('ids', [['A', 'A', 'B'], ['A', None, 'B']])
def test_id_existente_invalido_interrompe(ids):
    entrada = fonte()
    entrada.ID_FEICAO = ids
    with pytest.raises(ValueError, match='único e não nulo'):
        service.calcular(entrada, [], ControleProcessamento())


def test_base_vazia_preserva_todas_as_feicoes_com_null():
    saida, _ = service.calcular(fonte(), [('risco', 'Erosão', 'eros', frame([]))], ControleProcessamento())
    assert len(saida) == 3 and saida.ri_eros.isna().all()


def test_calculo_metrico_preserva_geometria_e_crs_geografico():
    entrada = frame([box(5000000, 7000000, 5000010, 7000010)], codigo=['A'])
    geografica = service.ogr.reproject(entrada, 4674)
    saida, _ = service.calcular(geografica, [('risco', 'Incêndio', 'inc', entrada)], ControleProcessamento())
    assert saida.ri_inc.iloc[0] == pytest.approx(100, abs=.001)
    assert saida.geometry.to_wkb().equals(geografica.geometry.to_wkb())
    assert saida.crs == geografica.crs


def test_cancelamento_antes_das_intersecoes():
    controle = ControleProcessamento()
    controle.cancelar()
    with pytest.raises(ProcessamentoCancelado):
        service.calcular(fonte(), [], controle)


def test_erro_ogr_nao_vira_null_e_libera_temporarios(monkeypatch):
    fechado = []
    class Overlay:
        def __init__(self, *args, **kwargs):
            pass
        def records(self, *args, **kwargs):
            raise ValueError('Erro OGR simulado')
        def close(self):
            fechado.append(True)
    monkeypatch.setattr(service.ogr, 'LayerOverlay', Overlay)
    with pytest.raises(ValueError, match='Erro OGR'):
        service.calcular(fonte(), [('risco', 'APP', 'a', fonte())], ControleProcessamento())
    assert fechado == [True]


@pytest.mark.parametrize('codigo', [None, 'HIER-TESTE'])
def test_saida_real_gpkg_nome_exato_null_geometrias_e_metadados(monkeypatch, codigo):
    entrada = fonte()
    base = frame([box(0, 0, 5, 10)])
    gravados = []
    entrada_id = 'storage:saidas-geoespaciais/demandas.gpkg::demandas' if codigo else 'entrada'
    monkeypatch.setattr(service, '_carregar', lambda ref: entrada if ref['id'] == entrada_id else base)
    if codigo:
        dados = vetor(entrada, 'demandas.gpkg', 'GPKG', layer='demandas',
                      layer_metadata={'SICARD_NORMALIZACAO': json.dumps({'origem': {'hierarquizacao': codigo}})})
        monkeypatch.setattr(service.storage_remoto, 'baixar', lambda caminho: dados['demandas.gpkg'])
    monkeypatch.setattr(service.storage_remoto, 'listar', lambda *a, **k: [])
    monkeypatch.setattr(service.storage_remoto, 'criar_pasta', lambda pasta: None)
    def registrar(nome, conteudos, recurso, tipo, *, pasta_saida):
        gravados.append((nome, conteudos, pasta_saida))
        return {'caminho': f'{pasta_saida}/{nome}'}
    monkeypatch.setattr(service.ciclo, 'registrar_exportacao_memoria', registrar)
    monkeypatch.setattr(service, 'descritor_original', lambda ident, arquivo: {
        'id': ident, 'arquivo': arquivo, 'revisao': '123', 'feicoes': 3, 'campos': []})
    controle = ControleProcessamento()
    resultado = service.executar({'entrada': {'id': entrada_id, 'nome': 'Projetos.gpkg'}, 'hierarquizacao': codigo,
                                 'restricao': [{'id': 'app', 'nome': 'APP'}], 'risco': []}, controle)
    nome, conteudos, pasta = gravados[0]
    assert nome == resultado['nome'] == 'Projetos_elegibilidade_territorial.gpkg'
    assert resultado['arquivo'] == f'{pasta}/{nome}'
    reaberta = ler_vetor(conteudos, nome)
    assert len(reaberta) == 3 and reaberta.re_app.iloc[0] == 50
    assert reaberta.re_app.iloc[1:].isna().all()
    assert reaberta.geometry.to_wkb().equals(entrada.geometry.to_wkb())
    pd.testing.assert_frame_equal(reaberta[entrada.columns], entrada)
    assert controle.cancelavel is False
    auditoria = resultado['elegibilidade']
    assert auditoria.get('hierarquizacao') == codigo
    persistida = json.loads(service.read_info(BytesIO(conteudos[nome]), layer='elegibilidade_territorial')
                            ['layer_metadata']['SICARD_ELEGIBILIDADE'])
    assert persistida.get('hierarquizacao') == codigo
    if not codigo:
        assert 'hierarquizacao' not in auditoria


@pytest.mark.parametrize('normalizacao', [
    {'origem': {'id': 'camada-avulsa'}}, {'origem': {'hierarquizacao': 'OUTRA'}}, [], None,
])
def test_entrada_avulsa_nao_pode_declarar_outra_hierarquizacao(monkeypatch, normalizacao):
    monkeypatch.setattr(service, '_carregar', lambda ref: fonte())
    monkeypatch.setattr(service.storage_remoto, 'baixar', lambda caminho: b'')
    monkeypatch.setattr(service, 'read_info', lambda *args, **kwargs: {
        'layer_metadata': {'SICARD_NORMALIZACAO': json.dumps(normalizacao)}})
    with pytest.raises(ValueError, match='não foi preparada'):
        service.executar({'entrada': {'id': 'storage:saidas-geoespaciais/a.gpkg::demandas', 'nome': 'A'},
                          'hierarquizacao': 'HIER-TESTE', 'restricao': [], 'risco': []}, ControleProcessamento())


def test_revisao_alterada_impede_leitura(monkeypatch):
    monkeypatch.setattr(service.storage, 'resolver', lambda path: SimpleNamespace(
        stat=lambda: SimpleNamespace(st_mtime_ns=2, st_size=100)))
    with pytest.raises(ValueError, match='mudou'):
        service._carregar({'id': 'storage:base-geoespacial/a.gpkg', 'nome': 'A', 'revisao': '1-100'})


def test_arquivo_persistido_reabre_com_descritor_real_da_bancada(storage_sintetico, monkeypatch):
    root = storage_sintetico
    (root / 'saidas-geoespaciais').mkdir()
    monkeypatch.setattr(service.storage, 'diretorio_storage', lambda: root)
    entrada = frame([box(5000000, 7000000, 5000010, 7000010)], nome=['A'])
    monkeypatch.setattr(service, '_carregar', lambda ref: entrada.copy())
    monkeypatch.setattr(service.storage_remoto, 'listar', lambda *a, **k: [])
    monkeypatch.setattr(service.storage_remoto, 'criar_pasta', lambda pasta: (root / pasta).mkdir())
    def registrar(nome, conteudos, recurso, tipo, *, pasta_saida):
        (root / pasta_saida / nome).write_bytes(conteudos[nome])
        return {'caminho': f'{pasta_saida}/{nome}'}
    monkeypatch.setattr(service.ciclo, 'registrar_exportacao_memoria', registrar)
    resultado = service.executar({'entrada': {'id': 'entrada', 'nome': 'Demandas'},
        'restricao': [], 'risco': [{'id': 'base', 'nome': 'Inundação'}]}, ControleProcessamento())
    assert resultado['feicoes'] == 1 and resultado['representacao'] == 'tiles'
    assert resultado['arquivo'].endswith('/Demandas_elegibilidade_territorial.gpkg')
    assert resultado['id'] == f"storage:{resultado['arquivo']}::elegibilidade_territorial"
    assert len(resultado['bounds']) == 4
    assert {campo['nome'] for campo in resultado['campos']} == {'nome', 'ID_FEICAO', 'ri_inund', 'area_total_m2'}
    dataset = ogr.Open(str(root / resultado['arquivo']))
    auditoria = json.loads(dataset.GetLayerByName('elegibilidade_territorial').GetMetadata()['SICARD_ELEGIBILIDADE'])
    dataset = None
    assert auditoria['crs_calculo'] == 'EPSG:5880'
    assert auditoria['campos'][0]['campo'] == 'ri_inund'
    from api.services.bancada_arquivos import carregar_para_execucao
    original = carregar_para_execucao(resultado['arquivo'], resultado['revisao'], resultado['id'])['frame']
    assert original.ri_inund.iloc[0] == 100 and original.nome.iloc[0] == 'A'


@pytest.fixture
def jobs_compartilhados(monkeypatch):
    from contextlib import nullcontext
    from api.services import elegibilidade_jobs as jobs
    arquivos = {}

    def baixar(caminho):
        if caminho not in arquivos:
            raise FileNotFoundError(caminho)
        return arquivos[caminho]

    monkeypatch.setattr(jobs.storage_remoto, 'baixar', baixar)
    monkeypatch.setattr(jobs.storage_remoto, 'enviar_bytes', arquivos.__setitem__)
    monkeypatch.setattr(jobs.storage_remoto, 'mover', lambda origem, destino: arquivos.__setitem__(destino, arquivos.pop(origem)))
    monkeypatch.setattr(jobs, 'bloquear_arquivo', lambda caminho: nullcontext())
    return arquivos


def test_job_cancelado_e_erro_explicito(monkeypatch, caplog, jobs_compartilhados):
    from api.services import elegibilidade_jobs as jobs
    tarefas = []
    monkeypatch.setattr(jobs, '_jobs', {})
    monkeypatch.setattr(jobs, '_pool', SimpleNamespace(submit=tarefas.append))
    payload = {'entrada': {'id': 'entrada', 'nome': 'A'}, 'restricao': [], 'risco': []}
    inicial = jobs.iniciar(payload, 'autor')
    jobs.cancelar(inicial['id'], 'autor')
    tarefas.pop()()
    assert jobs.consultar(inicial['id'], 'autor')['status'] == 'cancelado'
    def falhar(*args):
        raise ValueError('GDAL: interseção inválida')
    monkeypatch.setattr(jobs, 'executar', falhar)
    inicial = jobs.iniciar(payload, 'autor')
    tarefas.pop()()
    final = jobs.consultar(inicial['id'], 'autor')
    assert final['status'] == 'erro' and final['resultado'] is None
    assert final['erro'] == 'GDAL: interseção inválida'
    assert 'Falha na execução de elegibilidade' in caplog.text


def test_rotas_jobs_privados_e_validacao(monkeypatch, jobs_compartilhados):
    from api.services import elegibilidade_jobs as jobs
    from api.routers.extracao_atributos import router
    from api.deps.auth import require_geospatial_access
    class Pool:
        def submit(self, fn):
            fn()
            return Future()
    monkeypatch.setattr(jobs, '_jobs', {})
    monkeypatch.setattr(jobs, '_pool', Pool())
    monkeypatch.setattr(jobs, 'executar', lambda *args: {'nome': 'A_elegibilidade_territorial.gpkg'})
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    with TestClient(app) as client:
        payload = {'entrada': {'id': 'entrada', 'nome': 'A'}, 'restricao': [{'id': 'base', 'nome': 'APP'}]}
        resposta = client.post('/extracao-atributos/elegibilidade/execucoes', json=payload)
        assert resposta.status_code == 202
        job = resposta.json()
        assert job['status'] == 'concluido' and job['resultado']['nome'].endswith('.gpkg')
        path = f"/extracao-atributos/elegibilidade/execucoes/{job['id']}"
        assert client.get(path).status_code == 200
        assert client.post(path + '/cancelar').status_code == 409
        app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='outro')
        assert client.get(path).status_code == 404
        assert client.post(path + '/cancelar').status_code == 404
        assert client.post('/extracao-atributos/elegibilidade/execucoes',
                           json={**payload, 'risco': payload['restricao']}).status_code == 422
        assert client.post('/extracao-atributos/elegibilidade/execucoes',
                           json={**payload, 'restricao': []}).status_code == 422


def test_lote_longo_com_mais_de_trinta_entradas_preserva_resultados(monkeypatch, jobs_compartilhados):
    from api.services import elegibilidade_jobs as jobs
    clock = [100.]
    monkeypatch.setattr(jobs, 'monotonic', lambda: clock[0])
    monkeypatch.setattr(jobs, '_jobs', {})
    monkeypatch.setattr(jobs, '_pool', SimpleNamespace(submit=lambda fn: fn()))
    monkeypatch.setattr(jobs, 'executar', lambda *args: {'nome': 'Saída'})
    ids = []
    for i in range(35):
        clock[0] += 120
        resultado = jobs.iniciar({'entrada': {'id': str(i), 'nome': 'Entrada'},
                                 'lote_id': 'lote-longo', 'total_entradas': 35}, 'autor')
        ids.append(resultado['id'])
    assert len(ids) == 35
    assert jobs.consultar(ids[0], 'autor')['status'] == 'concluido'
    jobs.iniciar({'entrada': {'id': 'novo', 'nome': 'Entrada'}}, 'outro')
    assert jobs.consultar(ids[0], 'autor')['status'] == 'concluido'
