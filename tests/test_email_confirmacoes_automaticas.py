import asyncio
from contextlib import contextmanager
from threading import Event
from unittest.mock import MagicMock

from fastapi import FastAPI
from pydantic import ValidationError
import pytest

from api.config import EmailSettings, get_email_settings
from api.repositories import email_convites_repository as repo
from api.services import email_confirmacoes_automaticas as rotina


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
def coleta(monkeypatch):
    config = EmailSettings(habilitado=True, imap_habilitado=True, confirmacoes_intervalo=5)
    monkeypatch.setattr(rotina, "_config", lambda **_: config)
    monkeypatch.setattr(rotina, "_estado", {
        "ativa": False, "erro": "", "ultima_coleta": None, "intervalo_segundos": 30,
    })
    em_execucao = []

    @contextmanager
    def bloquear():
        assert not em_execucao, "Ciclos não podem se sobrepor"
        em_execucao.append(True)
        try:
            yield True
        finally:
            em_execucao.clear()

    monkeypatch.setattr(repo, "bloquear_coleta", bloquear)
    consultar = MagicMock(return_value=2)
    monkeypatch.setattr(rotina.email_confirmacoes, "coletar_automaticamente", consultar)
    return consultar


def test_coleta_inicia_sem_pagina_aberta_e_repete_sem_sobrepor(coleta):
    parar = Relogio(ciclos=2)
    rotina.executar(parar)
    assert coleta.call_count == 2
    assert parar.esperas == [5, 5]
    assert rotina.estado()["ultima_coleta"]
    assert rotina.estado()["erro"] == ""


def test_falha_e_recuperacao_sem_expor_resposta_do_provedor(coleta, caplog):
    coleta.side_effect = [OSError("resposta-privada"), 1]
    rotina.executar(Relogio(ciclos=2))
    assert coleta.call_count == 2
    assert "OSError" in caplog.text
    assert "resposta-privada" not in caplog.text
    assert rotina.estado()["ultima_coleta"]
    assert rotina.estado()["erro"] == ""
    coleta.side_effect = OSError("resposta-privada")
    rotina.executar(Relogio())
    assert "nova tentativa" in str(rotina.estado()["erro"]).lower()
    assert "resposta-privada" not in str(rotina.estado())


def test_outro_processo_com_bloqueio_impede_consulta(coleta, monkeypatch):
    @contextmanager
    def ocupado():
        yield False

    monkeypatch.setattr(repo, "bloquear_coleta", ocupado)
    rotina.executar(Relogio())
    coleta.assert_not_called()
    assert rotina.estado()["ultima_coleta"] is None


def test_rotina_desativada_nao_consulta_banco_ou_imap(coleta, monkeypatch):
    monkeypatch.setattr(rotina, "_config", lambda **_: EmailSettings())
    bloquear = MagicMock()
    monkeypatch.setattr(repo, "bloquear_coleta", bloquear)
    rotina.executar(Relogio())
    bloquear.assert_not_called()
    coleta.assert_not_called()
    assert rotina.estado()["ativa"] is False


def test_encerramento_interrompe_espera_e_aguarda_coleta(coleta, monkeypatch):
    iniciou, encerrou = Event(), Event()

    def executar(parar):
        iniciou.set()
        assert parar.wait(5)
        encerrou.set()

    monkeypatch.setattr(rotina, "executar", executar)

    async def validar():
        async with rotina.lifespan(FastAPI()):
            assert await asyncio.to_thread(iniciou.wait, 5)
            assert not encerrou.is_set()
        assert encerrou.is_set()
        assert rotina.estado()["ativa"] is False

    asyncio.run(validar())


def test_configuracao_automatica_tem_limites_e_pode_ser_desativada(monkeypatch):
    monkeypatch.setenv("SICARD_EMAIL_CONFIRMATIONS_AUTO_ENABLED", "true")
    monkeypatch.delenv("SICARD_EMAIL_CONFIRMATIONS_INTERVAL_SECONDS", raising=False)
    assert get_email_settings().confirmacoes_automaticas is True
    assert get_email_settings().confirmacoes_intervalo == 30
    for valor in ("0", "4", "3601", "invalido"):
        monkeypatch.setenv("SICARD_EMAIL_CONFIRMATIONS_INTERVAL_SECONDS", valor)
        with pytest.raises(ValidationError):
            get_email_settings()


def test_bloqueio_global_libera_sessao_apos_falha(monkeypatch):
    conn = MagicMock()
    conn.execute.return_value.fetchone.return_value = {"adquirido": True}

    @contextmanager
    def conexao():
        yield conn

    monkeypatch.setattr(repo, "get_connection", conexao)
    with pytest.raises(RuntimeError, match="falha-sintetica"):
        with repo.bloquear_coleta() as adquirido:
            assert adquirido
            raise RuntimeError("falha-sintetica")
    assert "pg_try_advisory_lock" in conn.execute.call_args_list[0].args[0]
    assert "pg_advisory_unlock" in conn.execute.call_args_list[-1].args[0]
    conn.commit.assert_called_once()


def test_bloqueio_nao_libera_lock_de_outro_processo(monkeypatch):
    conn = MagicMock()
    conn.execute.return_value.fetchone.return_value = {"adquirido": False}

    @contextmanager
    def conexao():
        yield conn

    monkeypatch.setattr(repo, "get_connection", conexao)
    with repo.bloquear_coleta() as adquirido:
        assert not adquirido
    assert conn.execute.call_count == 1


def test_falha_no_unlock_descarta_conexao_do_pool(monkeypatch):
    conn = MagicMock()
    conn.execute.return_value.fetchone.return_value = {"adquirido": True}

    @contextmanager
    def conexao():
        yield conn

    monkeypatch.setattr(repo, "get_connection", conexao)
    with pytest.raises(OSError):
        with repo.bloquear_coleta():
            conn.execute.side_effect = OSError("falha-sintetica")
    conn.close.assert_called_once()
