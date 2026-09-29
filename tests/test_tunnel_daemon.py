"""Garantias do supervisor autônomo do túnel: instância única e registro enxuto.

Nada aqui abre túnel, toca a VM ou consulta banco: o que se verifica é a decisão
de não subir um segundo supervisor e o limite do arquivo de registro.
"""
from __future__ import annotations

import os

import pytest

from scripts import tunnel_daemon as daemon


@pytest.fixture
def lock(tmp_path, monkeypatch):
    caminho = tmp_path / "database-tunnel-daemon.local.pid"
    monkeypatch.setattr(daemon, "LOCK", caminho)
    return caminho


def test_sem_registro_anterior_nao_ha_outra_instancia(lock):
    assert daemon._outra_instancia() is None


def test_registro_do_proprio_processo_nao_conta_como_outra_instancia(lock, monkeypatch):
    lock.write_text(str(os.getpid()), encoding="ascii")
    monkeypatch.setattr(daemon, "_processo_vivo", lambda pid: True)
    assert daemon._outra_instancia() is None


def test_registro_corrompido_e_tratado_como_ausencia(lock):
    lock.write_text("nao-e-um-pid", encoding="ascii")
    assert daemon._outra_instancia() is None


def test_pid_de_processo_encerrado_libera_o_posto(lock, monkeypatch):
    lock.write_text("424242", encoding="ascii")
    monkeypatch.setattr(daemon, "_processo_vivo", lambda pid: False)
    assert daemon._outra_instancia() is None


def test_supervisor_vivo_impede_segunda_instancia(lock, monkeypatch):
    lock.write_text("424242", encoding="ascii")
    monkeypatch.setattr(daemon, "_processo_vivo", lambda pid: True)
    assert daemon._outra_instancia() == 424242


def test_registro_longo_preserva_apenas_a_cauda(tmp_path, monkeypatch, capsys):
    caminho = tmp_path / "database-tunnel-daemon.local.log"
    caminho.write_text("linha antiga\n" * 3000, encoding="utf-8")
    monkeypatch.setattr(daemon, "LOG", caminho)
    monkeypatch.setattr(daemon, "LOG_LIMIT_BYTES", 100)

    daemon._registrar("Túnel do banco restabelecido.")

    linhas = caminho.read_text(encoding="utf-8").splitlines()
    assert len(linhas) == 2001
    assert linhas[-1].endswith("Túnel do banco restabelecido.")
    assert "Túnel do banco restabelecido." in capsys.readouterr().out
