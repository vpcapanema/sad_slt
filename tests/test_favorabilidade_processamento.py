"""Interseções da Fase 2 sem agregação dos atributos das superfícies."""
import json
from io import BytesIO
from types import SimpleNamespace

import geopandas as gpd
import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from shapely.geometry import box, LineString

from api.services import elegibilidade_processamento as service
from api.services.controle_processamento import ControleProcessamento, ProcessamentoCancelado


def frame(geometrias, **atributos):
    return gpd.GeoDataFrame(atributos, geometry=geometrias, crs=5880)


def calcular(entrada, bases):
    recortes = []
    saida, auditoria = service.calcular(entrada, bases, ControleProcessamento(),
                                       intersecoes=recortes, analise='favorabilidade')
    return saida, auditoria, recortes


def test_areas_independentes_preservam_classes_indices_e_inteiros_exatos():
    entrada = frame([box(0, 0, 10, 10), box(20, 0, 30, 10)], codigo=['A', 'B'])
    grade = frame([box(0, 0, 8, 10), box(2, 0, 10, 10)],
                  classe=['Alta', 'Baixa'], indice=[.9, .2], indice_dim=[.7, .4],
                  normalizado=[.8, None], identificador=[2**60 + 1, 2**60 + 3])
    rede = frame([box(20, 0, 25, 10)], classe=['Média'], indice=[.5])
    originais = [f.copy() for f in (entrada, grade, rede)]
    saida, auditoria, recortes = calcular(entrada, [
        ('grade', 'Superfície', 'grade', grade), ('rede', 'Superfície', 'rede', rede)])
    assert saida.fg_superficie.iloc[0] == 160  # Soma sem união das sobreposições.
    assert saida.fr_superficie.iloc[1] == 50  # Não intersecta o resultado da grade.
    assert pd.isna(saida.fg_superficie.iloc[1]) and pd.isna(saida.fr_superficie.iloc[0])
    assert auditoria['indices_agregados'] is False
    assert all(f.equals(original) for f, original in zip((entrada, grade, rede), originais))
    dados = service.serializar(saida, auditoria, recortes, 'f2.gpkg', analise='favorabilidade')['f2.gpkg']
    principal = gpd.read_file(BytesIO(dados), layer='favorabilidade_territorial')
    persistidos = gpd.read_file(BytesIO(dados), layer='intersecoes')
    assert principal[entrada.columns].equals(entrada)
    mapa_grade, mapa_rede = [base['campos'] for base in auditoria['atributos_superficies']]
    assert set(mapa_grade) == set(grade.columns) - {'geometry'}
    assert persistidos[mapa_grade['classe']].iloc[:2].tolist() == ['Alta', 'Baixa']
    assert persistidos[mapa_grade['indice']].iloc[:2].tolist() == [.9, .2]
    assert persistidos[mapa_grade['indice_dim']].iloc[:2].tolist() == [.7, .4]
    import sqlite3
    with sqlite3.connect(':memory:') as db:
        db.deserialize(dados)
        valores = db.execute(f'SELECT "{mapa_grade["identificador"]}" FROM intersecoes').fetchall()
    assert valores == [(2**60 + 1,), (2**60 + 3,), (None,)]
    assert pd.isna(persistidos[mapa_grade['normalizado']].iloc[1])
    assert pd.isna(persistidos[mapa_grade['classe']].iloc[2])
    assert persistidos[mapa_rede['classe']].iloc[2] == 'Média'
    from pyogrio import read_info
    meta = read_info(BytesIO(dados), layer='favorabilidade_territorial')['layer_metadata']
    assert json.loads(meta['SICARD_FAVORABILIDADE'])['atributos_superficies'] == auditoria['atributos_superficies']
    assert 'SICARD_ELEGIBILIDADE' not in meta


def test_colisoes_entre_bases_e_campos_tecnicos_nao_perdem_atributos():
    entrada = frame([box(0, 0, 10, 10)], fg_app=['original'])
    base = frame([box(0, 0, 5, 10)], demanda_pos=[77], base_id=['original'], area_m2=[999])
    saida, auditoria, recortes = calcular(entrada, [('grade', 'APP', 'a', base), ('grade', 'APP', 'b', base)])
    assert saida.fg_app.iloc[0] == 'original'
    assert saida.fg_app_2.iloc[0] == saida.fg_app_3.iloc[0] == 50
    destinos = [campo for b in auditoria['atributos_superficies'] for campo in b['campos'].values()]
    assert len(destinos) == len(set(destinos)) == 6
    assert recortes[0]['demanda_pos'] == 0 and recortes[0]['area_m2'] == 50
    assert recortes[0][auditoria['atributos_superficies'][0]['campos']['area_m2']] == 999


@pytest.mark.parametrize('base', [frame([]), frame([box(100, 100, 110, 110)], classe=['Fora'])])
def test_sem_intersecoes_preserva_entrada_e_esquema_vazio(base):
    entrada = frame([box(0, 0, 10, 10)], codigo=['A'])
    saida, auditoria, recortes = calcular(entrada, [('grade', 'Grade', 'g', base)])
    assert saida.fg_grade.isna().all()
    dados = service.serializar(saida, auditoria, recortes, 'vazio.gpkg', analise='favorabilidade')['vazio.gpkg']
    reabertos = gpd.read_file(BytesIO(dados), layer='intersecoes')
    assert reabertos.empty
    for destino in auditoria['atributos_superficies'][0]['campos'].values():
        assert destino in reabertos.columns


def test_contato_sem_area_e_cancelamento():
    entrada = frame([box(0, 0, 10, 10)])
    saida, _, recortes = calcular(entrada, [('rede', 'Rede', 'r', frame([box(10, 0, 11, 10)], classe=['Contato']))])
    assert saida.fr_rede.iloc[0] == recortes[0]['area_m2'] == 0
    controle = ControleProcessamento()
    controle.cancelar()
    with pytest.raises(ProcessamentoCancelado):
        service.calcular(entrada, [], controle, analise='favorabilidade')


def test_base_linear_rejeitada_explicitamente():
    with pytest.raises(ValueError, match='somente superfícies poligonais'):
        calcular(frame([box(0, 0, 10, 10)]), [
            ('rede', 'Rede linear', 'r', frame([LineString([(0, 0), (10, 10)])]))])


def test_execucao_persiste_em_fase2_com_descritor_real(storage_sintetico, monkeypatch):
    root = storage_sintetico
    entrada = frame([box(5000000, 7000000, 5000010, 7000010)], codigo=['A'])
    base = entrada.assign(classe='Alta', indice_normalizado=.75)
    monkeypatch.setattr(service.storage, 'diretorio_storage', lambda: root)
    monkeypatch.setattr(service, '_carregar', lambda ref: entrada if ref['id'] == 'entrada' else base)
    monkeypatch.setattr(service.saidas_storage, 'garantir_pasta',
                        lambda pasta: (root / pasta).mkdir(parents=True, exist_ok=True))
    def registrar(nome, conteudos, recurso, tipo, *, pasta_saida):
        (root / pasta_saida / nome).write_bytes(conteudos[nome])
        return {'caminho': f'{pasta_saida}/{nome}'}
    monkeypatch.setattr(service.ciclo, 'registrar_exportacao_memoria', registrar)
    resultado = service.executar({'entrada': {'id': 'entrada', 'nome': 'Demandas'},
                                 'grade': [{'id': 'g', 'nome': 'Grade'}], 'rede': []},
                                ControleProcessamento(), analise='favorabilidade')
    assert '/analises-avulsas/favorabilidade-territorial/' in resultado['arquivo']
    assert resultado['id'] == f"storage:{resultado['arquivo']}::favorabilidade_territorial"
    assert resultado['feicoes'] == 1 and resultado['representacao'] == 'tiles'
    assert resultado['favorabilidade']['indices_agregados'] is False
    assert 'elegibilidade' not in resultado
    assert '/HIER-TESTE/fase-2/' in service.pasta_saida('lote', 'HIER-TESTE', analise='favorabilidade')


def test_rotas_fixam_modalidade_validam_papeis_e_respeitam_acesso(monkeypatch):
    from api.routers.extracao_atributos import router
    from api.deps.auth import require_geospatial_access
    from api.services import elegibilidade_jobs as jobs, elegibilidade_preparacao as prep
    chamadas = []
    def resposta(*args, **kwargs):
        chamadas.append((args, kwargs))
        return {'id': 'job', 'status': 'executando'}
    for funcao in ('iniciar', 'consultar', 'cancelar'):
        monkeypatch.setattr(jobs, funcao, resposta)
    for funcao in ('preparar_demanda', 'preparar_hierarquizacao'):
        monkeypatch.setattr(prep, funcao, resposta)
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    with TestClient(app) as client:
        rota = '/extracao-atributos/favorabilidade'
        payload = {'entrada': {'id': 'e', 'nome': 'Entrada'}, 'grade': [{'id': 'g', 'nome': 'Grade'}]}
        assert client.post(rota + '/execucoes', json={**payload, 'analise': 'elegibilidade'}).status_code == 202
        assert client.get(rota + '/execucoes/job').status_code == 200
        assert client.post(rota + '/execucoes/job/cancelar').status_code == 200
        assert client.post(rota + '/preparar-demanda', json={'id': 'e'}).status_code == 200
        assert client.post(rota + '/preparar-hierarquizacao', json={'codigo': 'H', 'demandas': ['e']}).status_code == 200
        assert len(chamadas) == 5 and all(kwargs['analise'] == 'favorabilidade' for _, kwargs in chamadas)
        assert client.post(rota + '/execucoes', json={**payload, 'rede': payload['grade']}).status_code == 422
        assert client.post(rota + '/execucoes', json={**payload, 'grade': []}).status_code == 422
        assert client.post(rota + '/execucoes', json={**payload, 'entrada': payload['grade'][0]}).status_code == 422
        def ausente(*args, **kwargs):
            raise FileNotFoundError('Execução não encontrada.')
        monkeypatch.setattr(jobs, 'consultar', ausente)
        assert client.get(rota + '/execucoes/job').status_code == 404
        app.dependency_overrides.clear()
        assert client.post(rota + '/execucoes', json=payload).status_code in {401, 403}


def test_entrada_obsoleta_rejeitada_antes_da_normalizacao(tmp_path, monkeypatch):
    from api.services import elegibilidade_preparacao as prep
    arquivo = tmp_path / 'entrada.gpkg'
    arquivo.write_bytes(b'arquivo alterado')
    monkeypatch.setattr(prep.storage, 'resolver', lambda caminho: arquivo)
    with pytest.raises(ValueError, match='mudou após o envio'):
        prep.preparar_demanda('storage:base-geoespacial/entrada.gpkg', 'autor',
                             analise='favorabilidade', revisao='1-2')
