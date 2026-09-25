"""A listagem não transfere manifestos nem bloqueia outras requisições."""
import asyncio
from contextlib import contextmanager
from threading import Event

from api.services import extracao_atributos as extracao
from api.services import storage_geoespacial as storage
from api.services.geoespacial_service import GeoespacialService


def test_catalogo_exclui_manifestos_e_preserva_camadas_e_referencias(monkeypatch):
    class Connection:
        calls=0
        def execute(self,*args):
            self.calls+=1
            return self
        def fetchall(self):
            return [{'id':'risco','nome':'Risco','conceito':'Descrição'}] if self.calls==1 else [{'recurso_sessao_id':'oculta'}]
    @contextmanager
    def connect():
        yield Connection()
    monkeypatch.setattr(extracao,'get_connection',connect)
    def listar(*,incluir_manifesto):
        assert incluir_manifesto is False
        return [{'recurso_sessao_id':i,'nome':i,'tipo':'vetor','crs':'EPSG:4674','categoria':'importadas',
                 'metadados':{'metadados':{'caminho_arquivo':'pasta/base.gpkg'}}} for i in ['visivel','oculta']]
    monkeypatch.setattr(extracao.repo,'listar',listar)
    monkeypatch.setattr(storage,'camadas_vetoriais',lambda:[])
    result=extracao.catalogo()
    assert [c['id'] for c in result['camadas']]==['visivel']
    assert result['camadas'][0]['arquivo']=='pasta/base.gpkg'
    assert result['categorias'][0]['conceito']=='Descrição'


def test_listagem_lenta_nao_bloqueia_event_loop(monkeypatch):
    service=GeoespacialService()
    release=Event();started=Event()
    def slow():
        started.set()
        release.wait(1)
        service._metadados['camada']={'id':'camada','nome':'Camada'}
    monkeypatch.setattr(service,'_catalogar_persistidas',slow)
    async def check():
        task=asyncio.create_task(service.listar_recursos())
        try:
            for _ in range(50):
                await asyncio.sleep(.01)
                if started.is_set():break
            assert started.is_set()
            assert not task.done(), 'A consulta bloqueou o atendimento das demais requisições'
        finally:
            release.set()
            result=await task
        assert result==[{'id':'camada','nome':'Camada'}]
    asyncio.run(check())
