import pytest
from fastapi import HTTPException
from api.services.conferencia_geometria import emitir_confirmacao,validar_confirmacao
from api.services import substituicao_geometria as svc
from contextlib import contextmanager

@pytest.mark.parametrize("changed",["arquivo","usuario","tipo","codigo"])
def test_confirmacao_vinculada_ao_arquivo_sessao_e_demanda(changed):
    token=emitir_confirmacao(b"original","user","projeto","COD")
    args=[b"original","user","projeto","COD"]
    args[["arquivo","usuario","tipo","codigo"].index(changed)]=b"outro" if changed=="arquivo" else "outro"
    with pytest.raises(HTTPException):validar_confirmacao(token,*args)

def test_confirmacao_valida():
    token=emitir_confirmacao(b"original","user","plano","COD")
    validar_confirmacao(token,b"original","user","plano","COD")

@pytest.mark.parametrize("tipo",["plano","programa","projeto"])
def test_substituicao_preserva_autorias_de_decisao_e_criacao(monkeypatch,tipo):
    calls=[]
    class Conn:
        def execute(self,sql,params):
            calls.append((sql,params));return self
        def fetchone(self):return {"id":"ID","srid":4674}
    @contextmanager
    def connection():yield Conn()
    monkeypatch.setattr(svc,"get_connection",connection)
    monkeypatch.setattr(svc,"insert_upload",lambda *args,**kw:calls.append(("historico",kw)))
    svc.substituir(tipo,"COD",{"type":"Point","coordinates":[-46.63,-23.55]}, {},"00000000-0000-0000-0000-000000000010")
    sql,params=calls[-1]
    assert "atualizado_por=" in sql
    assert "criado_por=" not in sql and "aprovado_por=" not in sql and "reprovado_por=" not in sql
    assert ("geometria_tipo=" in sql)==(tipo=="projeto")
    assert calls[-2][1]["alvo"]==tipo

@pytest.mark.parametrize("coordinates,allowed",[
    ([-45.5,-25.0],True), ([-46.3,-24.1],True),
    ([-42.5,-23.5],False), ([-47.8,-26.0],False), ([-47.88,-15.79],False),
])
def test_recorte_marinho_sp_aceita_sp_e_exclui_outros_estados(monkeypatch,coordinates,allowed):
    from api.services import conferencia_geometria as check
    monkeypatch.setattr(check,"municipios_metricos",lambda:())
    result=check.conferir({"type":"Point","coordinates":coordinates})
    assert result['permitido'] is allowed
    assert result['situacao']==('marinha' if allowed else 'fora_abrangencia')
    assert 'revisao_marinha' not in str(result)

def test_poligono_parcialmente_fora_nao_e_aceito(monkeypatch):
    from api.services import conferencia_geometria as check
    monkeypatch.setattr(check,"municipios_metricos",lambda:())
    result=check.conferir({'type':'Polygon','coordinates':[[[-45.5,-25],[-42.5,-25],[-42.5,-23.5],[-45.5,-25]]]})
    assert result['permitido'] is False

def test_token_adulterado_nao_autoriza_upload():
    token=emitir_confirmacao(b'original','user','plano','COD')
    with pytest.raises(HTTPException):validar_confirmacao(token+'x',b'original','user','plano','COD')

def test_token_expirado_nao_autoriza_upload(monkeypatch):
    from api.services import conferencia_geometria as check
    monkeypatch.setattr(check.time,'time',lambda:1)
    token=emitir_confirmacao(b'original','user','plano','COD')
    monkeypatch.setattr(check.time,'time',lambda:10000)
    with pytest.raises(HTTPException):validar_confirmacao(token,b'original','user','plano','COD')

@pytest.mark.parametrize('tipo',['plano','programa','projeto'])
def test_endpoints_exigem_conferencia_do_mesmo_arquivo_antes_do_processamento(monkeypatch,tipo):
    import json
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers import geometria as router
    from api.deps.auth import require_operator
    from api.services.session_service import SessionUser
    app=FastAPI();app.include_router(router.router)
    user=SessionUser(id='00000000-0000-0000-0000-000000000010',email='teste@example.org',username='teste',nome='Teste',tipo_usuario='ANALISTA')
    app.dependency_overrides[require_operator]=lambda:user
    monkeypatch.setattr(router,'conferir',lambda geom:{'permitido':True,'situacao':'marinha','mensagem':'Confirma?'})
    calls=[]
    monkeypatch.setattr(router,'substituir',lambda *args:(calls.append(args),{'codigo':'COD','tipo':tipo})[1])
    client=TestClient(app)
    content=json.dumps({'type':'Feature','properties':{},'geometry':{'type':'Point','coordinates':[-45.5,-25]}}).encode()
    files={'file':('mar.geojson',content,'application/geo+json')}
    check=client.post(f'/geometria/conferir/{tipo}/COD',files=files)
    assert check.status_code==200
    token=check.json()['confirmacao']
    assert not calls
    invalid=client.post(f'/geometria/substituir/{tipo}/COD',data={'confirmacao':token},files={'file':('outro.geojson',content+b' ','application/geo+json')})
    assert invalid.status_code==422 and not calls
    result=client.post(f'/geometria/substituir/{tipo}/COD',data={'confirmacao':token},files=files)
    assert result.status_code==200 and len(calls)==1
    assert calls[0][0]==tipo and calls[0][-1]==user.id
    assert calls[0][3]['conteudo_binario']==content

def test_endpoints_nao_admitem_upload_sem_sessao():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.geometria import router
    app=FastAPI();app.include_router(router)
    client=TestClient(app)
    result=client.post('/geometria/conferir/projeto/COD',files={'file':('x.geojson',b'{}','application/json')})
    assert result.status_code==401
