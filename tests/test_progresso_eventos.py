import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest
from api.services.progresso_eventos import CanalProgresso, resposta
from api.services.controle_processamento import ControleProcessamento


def dado(evento):
    return json.loads(evento.split('data: ',1)[1])


def test_worker_publica_sem_polling_e_remove_assinante():
    async def check():
        c=ControleProcessamento()
        stream=c.eventos.eventos('job')
        assert 'retry:' in await anext(stream)
        assert dado(await anext(stream))['status']=='executando'
        # Publicação feita por outra thread, como nos workers reais.
        await asyncio.to_thread(c.mensagem,'Lendo base')
        atual=dado(await asyncio.wait_for(anext(stream),1))
        assert atual['etapa']=='Lendo base' and atual['progresso_tarefa'] is None
        await asyncio.to_thread(c.tarefa,3,4)
        assert dado(await asyncio.wait_for(anext(stream),1))['progresso_tarefa']==75
        c.mensagem('Gravando saída')
        assert dado(await anext(stream))['progresso_tarefa'] is None
        c.encerrar('concluido')
        assert dado(await anext(stream))['status']=='concluido'
        with pytest.raises(StopAsyncIteration):await anext(stream)
        assert not c.eventos.ouvintes
    asyncio.run(check())


def test_reconexao_recebe_estado_atual_fila_limitada_e_desconexao_limpa():
    async def check():
        c=CanalProgresso();c.publicar({'status':'executando','etapa':'Primeira'})
        stream=c.eventos('x');await anext(stream);await anext(stream)
        for i in range(1000):c.publicar({'status':'executando','etapa':str(i),'resultado':{'privado':'não transmitir'}})
        item=dado(await anext(stream))
        assert item['etapa']=='999' and 'resultado' not in item
        await stream.aclose();assert not c.ouvintes
        novo=c.eventos('x');await anext(novo)
        assert dado(await anext(novo))['etapa']=='999'
        await novo.aclose();assert not c.ouvintes
    asyncio.run(check())


def test_stream_preserva_autorizacao_da_extracao(monkeypatch):
    from api.services import extracao_atributos as service
    ident=uuid4();c=ControleProcessamento();monkeypatch.setitem(service._controles,str(ident),c)
    def negar(*a,**k):raise LookupError('Não pertence à sessão')
    monkeypatch.setattr(service,'consultar',negar)
    with pytest.raises(LookupError):service.eventos_progresso(ident,object())
    assert not c.eventos.ouvintes
    monkeypatch.setattr(service,'consultar',lambda *a:{'status':'executando'})
    assert service.eventos_progresso(ident,object()) is c.eventos


def test_rota_sse_autenticada_e_sem_buffer(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers import extracao_atributos as routes
    from api.deps.auth import require_geospatial_access
    app=FastAPI();app.include_router(routes.router)
    canal=CanalProgresso();canal.publicar({'status':'concluido'})
    monkeypatch.setattr(routes.service,'eventos_progresso',lambda *args:canal)
    with TestClient(app) as client:
        path=f'/extracao-atributos/execucoes/{uuid4()}/eventos'
        assert client.get(path).status_code==401
        app.dependency_overrides[require_geospatial_access]=lambda:SimpleNamespace(id='teste')
        r=client.get(path)
        assert r.status_code==200 and r.headers['content-type'].startswith('text/event-stream')
        assert r.headers['x-accel-buffering']=='no' and 'no-transform' in r.headers['cache-control']
        assert 'event: progresso' in r.text


def test_jobs_genericos_publicam_inicio_e_termino(monkeypatch):
    from api.services.geoprocessamento_jobs import GeoprocessamentoJobs
    jobs=GeoprocessamentoJobs();ident=jobs._new('teste',['a','b'])
    assert jobs.get(ident)['eventos_url'].endswith('/eventos')
    jobs._start(ident,'Lendo camada')
    assert jobs.eventos(ident).atual['etapa_atual']=='Lendo camada'
    jobs._advance(ident,'Camada lida')
    assert jobs.eventos(ident).atual['etapa_atual'] is None
    assert jobs.eventos(ident).atual['progresso_tarefa']==100
