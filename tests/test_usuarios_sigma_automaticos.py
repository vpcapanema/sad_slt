import asyncio
from contextlib import asynccontextmanager
from threading import Event
from unittest.mock import Mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from api.config import UsuariosSyncSettings, get_usuarios_sync_settings
from api.deps.auth import require_authenticated
from api.routers.admin_tabelas import router
from api.services import usuarios_sigma_automaticos as rotina
from api.services.session_service import SessionUser


class Relogio(Event):
    def __init__(self, ciclos=1):
        super().__init__()
        self.ciclos = ciclos
        self.esperas = []

    def wait(self, timeout=None):
        self.esperas.append(timeout)
        if len(self.esperas) >= self.ciclos:
            self.set()
        return self.is_set()


@pytest.fixture
def sincronizacao(monkeypatch):
    monkeypatch.setattr(rotina, 'get_usuarios_sync_settings', lambda: UsuariosSyncSettings())
    monkeypatch.setattr(rotina, '_estado', {
        'ativa': False, 'erro': '', 'ultima_sincronizacao': None,
        'intervalo_segundos': 60, 'usuarios_sigma': None, 'ciclos_concluidos': 0,
    })
    sincronizar = Mock(return_value=dict(usuarios_sigma=25, novos=0, ausentes_desativados=0))
    monkeypatch.setattr(rotina, 'sincronizar', sincronizar)
    return sincronizar


def test_inicia_imediatamente_e_repete_a_cada_minuto(sincronizacao):
    parar = Relogio(ciclos=2)
    rotina.executar(parar)
    assert sincronizacao.call_count == 2
    assert parar.esperas == [60, 60]
    assert rotina.estado()['ciclos_concluidos'] == 2
    assert rotina.estado()['usuarios_sigma'] == 25
    assert rotina.estado()['ultima_sincronizacao']
    assert rotina.estado()['ativa'] is False


def test_falha_na_origem_tenta_novamente_sem_expor_dados(sincronizacao, caplog):
    sincronizacao.side_effect = [OSError('dsn-privado-e-credenciais'), sincronizacao.return_value]
    rotina.executar(Relogio(ciclos=2))
    assert sincronizacao.call_count == 2
    assert rotina.estado()['ciclos_concluidos'] == 1
    assert rotina.estado()['erro'] == ''
    assert 'OSError' in caplog.text
    assert 'dsn-privado-e-credenciais' not in caplog.text
    sincronizacao.side_effect = OSError('dsn-privado-e-credenciais')
    rotina.executar(Relogio())
    assert 'nova tentativa' in rotina.estado()['erro']
    assert 'dsn-privado-e-credenciais' not in str(rotina.estado())


def test_desativacao_nao_consulta_bancos(sincronizacao, monkeypatch):
    monkeypatch.setattr(rotina, 'get_usuarios_sync_settings', lambda: UsuariosSyncSettings(habilitado=False))
    rotina.executar(Relogio())
    sincronizacao.assert_not_called()
    assert rotina.estado()['ativa'] is False


def test_parada_aguarda_rotina_e_interrompe_espera(sincronizacao, monkeypatch):
    iniciou, terminou = Event(), Event()

    def executar(parar):
        iniciou.set()
        assert parar.wait(5)
        terminou.set()

    monkeypatch.setattr(rotina, 'executar', executar)

    async def validar():
        async with rotina.lifespan(FastAPI()):
            assert await asyncio.to_thread(iniciou.wait, 5)
            assert not terminou.is_set()
        assert terminou.is_set()

    asyncio.run(validar())


def test_configuracao_padrao_e_limites(monkeypatch):
    monkeypatch.delenv('SICARD_USUARIOS_SYNC_ENABLED', raising=False)
    monkeypatch.delenv('SICARD_USUARIOS_SYNC_INTERVAL_SECONDS', raising=False)
    assert get_usuarios_sync_settings() == UsuariosSyncSettings(habilitado=True, intervalo=60)
    monkeypatch.setenv('SICARD_USUARIOS_SYNC_ENABLED', 'false')
    assert get_usuarios_sync_settings().habilitado is False
    for valor in ('0', '9', '3601', 'invalido'):
        monkeypatch.setenv('SICARD_USUARIOS_SYNC_INTERVAL_SECONDS', valor)
        with pytest.raises(ValidationError):
            get_usuarios_sync_settings()


@pytest.mark.parametrize('perfil,status', [(None, 401), ('VISUALIZADOR', 200), ('ADMIN', 200)])
def test_estado_consultavel_conforme_politica(sincronizacao, perfil, status):
    app = FastAPI()
    app.include_router(router, prefix='/api')
    if perfil:
        app.dependency_overrides[require_authenticated] = lambda: SessionUser(
            id='teste', email='teste@example.com', username='teste', nome='Teste', tipo_usuario=perfil)
    response = TestClient(app).get('/api/admin/usuarios/sincronizacao')
    assert response.status_code == status
    if status == 200:
        assert response.headers['cache-control'] == 'no-store'
        assert response.json() == rotina.estado()
    sincronizacao.assert_not_called()


def test_ciclo_do_servidor_preserva_as_duas_rotinas(monkeypatch, storage_sintetico):
    from api import server

    eventos = []

    @asynccontextmanager
    async def emails(app):
        eventos.append('email-iniciou')
        try:
            yield
        finally:
            eventos.append('email-parou')

    @asynccontextmanager
    async def usuarios(app):
        eventos.append('usuarios-iniciou')
        try:
            yield
        finally:
            eventos.append('usuarios-parou')

    monkeypatch.setattr(server, 'email_lifespan', emails)
    monkeypatch.setattr(server, 'usuarios_lifespan', usuarios)

    async def validar():
        async with server.lifespan(server.app):
            assert eventos == ['email-iniciou', 'usuarios-iniciou']

    asyncio.run(validar())
    assert eventos == ['email-iniciou', 'usuarios-iniciou', 'usuarios-parou', 'email-parou']
