from types import SimpleNamespace
from threading import Event
from time import sleep
import pytest
from api.services.controle_processamento import ControleProcessamento,ProcessamentoCancelado


def test_porcentagens_observadas_e_eventos_sequenciais():
    c=ControleProcessamento()
    assert c.snapshot()['progresso_tarefa'] is None
    c.fase(1,'Lendo entrada');c.tarefa(3,10)
    assert c.snapshot()['progresso_tarefa']==30
    assert c.snapshot()['percentual']==0
    c.fase(2,'Analisando');c.tarefa(7,10)
    s=c.snapshot()
    assert s['percentual']==33 and s['progresso_tarefa']==70
    assert [e['sequencia'] for e in s['etapas']]==[1,2]
    c.encerrar('concluido')
    assert c.snapshot()['percentual']==100


def test_cancelamento_antes_da_gravacao_e_rejeicao_apos_commit_iniciar():
    c=ControleProcessamento();c.cancelar()
    with pytest.raises(ProcessamentoCancelado):c.fase(3,'Gravando',cancelavel=False)
    c=ControleProcessamento();c.fase(3,'Gravando',cancelavel=False)
    with pytest.raises(ValueError):c.cancelar()
    assert not c.snapshot()['cancelamento_solicitado']


def test_cancelar_job_municipal_isolamento_e_nenhuma_publicacao(monkeypatch):
    from api.services import municipal_jobs as jobs
    entrou=Event();liberar=Event();publicados=[]
    def gerar(categoria,payload,nome,user,controle):
        controle.fase(1,'Lendo municípios');entrou.set();liberar.wait(3)
        controle.verificar();publicados.append(True)
        return b'',{'id':'camada'}
    monkeypatch.setattr(jobs.municipal_layer,'gerar',gerar)
    user=SimpleNamespace(id='autor');outro=SimpleNamespace(id='outro')
    job=jobs.iniciar('social',{'attributes':['a'],'format':'fgb'},user)
    assert entrou.wait(2)
    with pytest.raises(LookupError):jobs.cancelar(job['id'],outro)
    jobs.cancelar(job['id'],user);liberar.set()
    for _ in range(100):
        if jobs.consultar(job['id'],user)['status']=='cancelado':break
        sleep(.01)
    assert jobs.consultar(job['id'],user)['status']=='cancelado'
    assert not publicados
    with pytest.raises(ValueError):jobs.pacote(job['id'],user)


def test_ogr_informa_fracao_real_e_respeita_cancelamento():
    import geopandas as gpd
    from shapely.geometry import box
    from api.services.geoespacial_service import _overlay_ogr
    a=gpd.GeoDataFrame({'id':[1,2]},geometry=[box(0,0,10,10),box(5,5,15,15)],crs=5880)
    b=gpd.GeoDataFrame({'base':[1]},geometry=[box(0,0,20,20)],crs=5880)
    eventos=[]
    resultado=_overlay_ogr(a,b,'intersection',progresso=lambda feitas,total:eventos.append(feitas/total))
    assert len(resultado)==2 and eventos and eventos[-1]==1
    def parar(feitas,total):
        raise ProcessamentoCancelado('Interrompido antes de persistir')
    with pytest.raises(ProcessamentoCancelado):_overlay_ogr(a,b,'intersection',progresso=parar)


def test_cancelar_extracao_impede_leitura_e_gravacao(monkeypatch):
    from api.services import extracao_atributos as extracao
    ident='00000000-0000-0000-0000-000000000009'
    c=ControleProcessamento();c.cancelar();extracao._controles[ident]=c
    finais=[]
    monkeypatch.setattr(extracao.ciclo,'finalizar',lambda ident,**kwargs:finais.append(kwargs))
    extracao._execute(ident,{})
    assert c.snapshot()['status']=='cancelado'
    assert finais and 'cancelado' in finais[0]['erro']


def test_cancelamento_extracao_exige_autorizacao(monkeypatch):
    from api.services import extracao_atributos as extracao
    ident='00000000-0000-0000-0000-000000000010'
    c=ControleProcessamento();extracao._controles[ident]=c
    def negar(*args,**kwargs):raise LookupError('Não pertence à sessão')
    monkeypatch.setattr(extracao,'consultar',negar)
    with pytest.raises(LookupError):extracao.cancelar(ident,SimpleNamespace(id='outro'))
    assert not c.solicitado
