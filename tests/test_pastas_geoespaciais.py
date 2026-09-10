"""Criação real em diretório temporário; nenhuma alteração no storage de uso."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.services import pastas_geoespaciais as service
from api.routers.extracao_atributos import router
from api.services.session_service import SessionUser, cookie_name, create_token


@pytest.fixture
def storage(tmp_path,monkeypatch):
    for area in ['uploads/datastorage','biblioteca_canonica','outputs']:
        (tmp_path/area).mkdir(parents=True)
    monkeypatch.setattr(service,'project_path',lambda p:tmp_path)
    return tmp_path


@pytest.mark.parametrize('area',['uploads/datastorage','biblioteca_canonica','outputs'])
def test_cria_nas_tres_areas_sem_sobrescrever(storage,area):
    result=service.criar_pasta(area,'Estudos territoriais')
    assert (storage/result['caminho']).is_dir()
    with pytest.raises(FileExistsError):service.criar_pasta(area,'Estudos territoriais')


@pytest.mark.parametrize('name',['../fora','a/b','a\\b','.staging','CON','a:teste','x.',' pasta',''])
def test_nome_invalido(storage,name):
    with pytest.raises(ValueError):service.criar_pasta('outputs',name)


@pytest.mark.parametrize('path',['','../fora','local','tests','uploads','outputs/../../fora','outputs/.staging'])
def test_destino_invalido(storage,path):
    with pytest.raises(ValueError):service.criar_pasta(path,'Nova')


def test_api_permissoes_e_conflito(storage):
    app=FastAPI();app.include_router(router)
    client=TestClient(app)
    payload={'caminho':'outputs','nome':'Nova'}
    assert client.post('/extracao-atributos/pastas',json=payload).status_code==401
    def login(profile):
        client.cookies.set(cookie_name(),create_token(SessionUser(id='00000000-0000-0000-0000-000000000010',email='teste@example.org',username='teste_'+profile.lower(),nome='Teste',tipo_usuario=profile)))
    login('VISUALIZADOR')
    assert client.post('/extracao-atributos/pastas',json=payload).status_code==403
    login('OPERADOR')
    assert client.post('/extracao-atributos/pastas',json=payload).status_code==201
    assert client.post('/extracao-atributos/pastas',json=payload).status_code==409
    assert client.post('/extracao-atributos/pastas',json={'caminho':'outputs/inexistente','nome':'Nova'}).status_code==404


def test_renomear_pasta_vazia_e_preservar_conteudo(storage):
    service.criar_pasta('outputs','Antes')
    result=service.renomear_pasta('outputs/Antes','Depois')
    assert result['caminho']=='outputs/Depois'
    assert not (storage/'outputs/Antes').exists()
    (storage/'outputs/Depois/camada.gpkg').write_bytes(b'teste')
    with pytest.raises(ValueError,match='vazias'):
        service.renomear_pasta('outputs/Depois','Outra')
    assert (storage/'outputs/Depois/camada.gpkg').read_bytes()==b'teste'


@pytest.mark.parametrize('path',['outputs','uploads/datastorage','biblioteca_canonica','outputs/../local','outputs/.staging'])
def test_renomear_recusa_raizes_e_travessia(storage,path):
    with pytest.raises(ValueError):service.renomear_pasta(path,'Outro')
