from pathlib import Path

import pytest

from scripts.local_vm_tunnel import (
    LOCAL_DATABASE_PORT,
    VM_DATABASE_PORT,
    VM_HOST,
    VM_HOST_KEY,
    VmDatabaseTunnel,
)


class _CicloUnico:
    """Event de mentira: libera o monitor por um ciclo e depois encerra."""

    def __init__(self, ciclos: int = 1) -> None:
        self.restantes = ciclos

    def wait(self, timeout=None) -> bool:
        if self.restantes:
            self.restantes -= 1
            return False
        return True


class _ProcessoVivo:
    returncode = None

    def poll(self):
        return None


def test_tunnel_is_loopback_only_and_pins_vm_host_key(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    tunnel = VmDatabaseTunnel(tmp_path)
    args = tunnel.arguments()
    assert args[args.index("-L") + 1] == f"127.0.0.1:{LOCAL_DATABASE_PORT}:127.0.0.1:{VM_DATABASE_PORT}"
    assert args[args.index("-hostkey") + 1] == VM_HOST_KEY
    assert args[-1] == f"ubuntu@{VM_HOST}"
    assert "-batch" in args and "-N" in args


def test_occupied_port_that_is_not_the_official_databases_is_not_replaced(tmp_path, monkeypatch):
    tunnel = VmDatabaseTunnel(tmp_path)
    monkeypatch.setattr(tunnel, "_port_open", lambda: True)
    monkeypatch.setattr(tunnel, "validate", lambda: (_ for _ in ()).throw(RuntimeError("wrong target")))
    with pytest.raises(RuntimeError, match=f"porta {LOCAL_DATABASE_PORT} está ocupada"):
        tunnel.ensure()
    assert tunnel.process is None


def test_missing_plink_fails_before_any_connection(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    tunnel = VmDatabaseTunnel(tmp_path)
    monkeypatch.setattr(tunnel, "_port_open", lambda: False)
    with pytest.raises(RuntimeError, match="Plink oficial ausente"):
        tunnel.ensure()


def _registra_pid(root: Path, pid: str) -> Path:
    (root / ".deploy").mkdir(exist_ok=True)
    registro = root / ".deploy/database-tunnel-windows.local.pid"
    registro.write_text(pid, encoding="ascii")
    return registro


def test_stale_own_tunnel_is_reclaimed_before_reconnecting(tmp_path, monkeypatch):
    """Queda de rede deixa o plink ouvindo sem sessão SSH; a tarefa se recupera sozinha."""
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    registro = _registra_pid(tmp_path, "4321")
    tunnel = VmDatabaseTunnel(tmp_path, lambda message: None)
    aberta = iter([True, False])
    monkeypatch.setattr(tunnel, "_port_open", lambda: next(aberta, False))
    monkeypatch.setattr(tunnel, "validate", lambda: (_ for _ in ()).throw(RuntimeError("sem resposta")))
    monkeypatch.setattr(tunnel, "_listening_pid", lambda: 4321)
    monkeypatch.setattr(tunnel, "_is_plink", lambda pid: True)
    encerrados: list[int] = []
    monkeypatch.setattr("scripts.local_vm_tunnel.os.kill", lambda pid, sig: encerrados.append(pid))
    with pytest.raises(RuntimeError, match="Plink oficial ausente"):
        tunnel.ensure()
    assert encerrados == [4321]
    assert not registro.exists()


def test_unknown_occupant_is_never_terminated(tmp_path, monkeypatch):
    """Só o PID registrado pela própria tarefa pode ser encerrado."""
    _registra_pid(tmp_path, "4321")
    tunnel = VmDatabaseTunnel(tmp_path, lambda message: None)
    monkeypatch.setattr(tunnel, "_port_open", lambda: True)
    monkeypatch.setattr(tunnel, "validate", lambda: (_ for _ in ()).throw(RuntimeError("sem resposta")))
    monkeypatch.setattr(tunnel, "_listening_pid", lambda: 9999)

    def nunca(pid, sig):
        raise AssertionError("processo de terceiro não pode ser encerrado")

    monkeypatch.setattr("scripts.local_vm_tunnel.os.kill", nunca)
    with pytest.raises(RuntimeError, match=f"porta {LOCAL_DATABASE_PORT} está ocupada"):
        tunnel.ensure()
    assert tunnel.process is None


def test_recorded_pid_that_is_not_plink_is_preserved(tmp_path, monkeypatch):
    """O PID pode ter sido reciclado pelo sistema para outro programa."""
    _registra_pid(tmp_path, "4321")
    tunnel = VmDatabaseTunnel(tmp_path, lambda message: None)
    monkeypatch.setattr(tunnel, "_port_open", lambda: True)
    monkeypatch.setattr(tunnel, "validate", lambda: (_ for _ in ()).throw(RuntimeError("sem resposta")))
    monkeypatch.setattr(tunnel, "_listening_pid", lambda: 4321)
    monkeypatch.setattr(tunnel, "_is_plink", lambda pid: False)

    def nunca(pid, sig):
        raise AssertionError("PID reciclado não pode ser encerrado")

    monkeypatch.setattr("scripts.local_vm_tunnel.os.kill", nunca)
    with pytest.raises(RuntimeError, match=f"porta {LOCAL_DATABASE_PORT} está ocupada"):
        tunnel.ensure()


def test_monitor_refaz_tunel_quando_processo_vive_mas_sessao_morreu(tmp_path, monkeypatch):
    """A regressão que derrubava o ambiente: plink de pé, sessão SSH morta.

    O monitor antigo só olhava `poll()`, via o processo vivo e seguia em frente
    para sempre — o banco ficava inalcançável até alguém reiniciar a tarefa.
    """
    tunnel = VmDatabaseTunnel(tmp_path, lambda mensagem: None)
    tunnel.process = _ProcessoVivo()
    monkeypatch.setattr(tunnel, "_ping", lambda: False)
    eventos: list[str] = []
    monkeypatch.setattr(tunnel, "stop", lambda: eventos.append("stop"))
    monkeypatch.setattr(tunnel, "ensure", lambda: eventos.append("ensure") or {})
    tunnel.monitor(_CicloUnico(), intervalo=0)
    assert eventos == ["stop", "ensure"]


def test_monitor_nao_mexe_em_tunel_saudavel(tmp_path, monkeypatch):
    tunnel = VmDatabaseTunnel(tmp_path, lambda mensagem: None)
    tunnel.process = _ProcessoVivo()
    monkeypatch.setattr(tunnel, "_ping", lambda: True)

    def nunca_derruba():
        raise AssertionError("túnel saudável não pode ser derrubado")

    monkeypatch.setattr(tunnel, "stop", nunca_derruba)
    monkeypatch.setattr(tunnel, "ensure", nunca_derruba)
    tunnel.monitor(_CicloUnico(ciclos=3), intervalo=0)


def test_monitor_insiste_quando_a_reconexao_falha(tmp_path):
    """Indisponibilidade da VM não pode matar o monitor: ele tenta de novo."""
    avisos: list[str] = []
    tunnel = VmDatabaseTunnel(tmp_path, avisos.append)
    tunnel._ping = lambda: False
    tunnel.ensure = lambda: (_ for _ in ()).throw(RuntimeError("VM fora do ar"))
    tunnel.monitor(_CicloUnico(ciclos=2), intervalo=0)
    assert len(avisos) == 2
    assert all("Reconexão do banco pendente (RuntimeError)" in aviso for aviso in avisos)


def test_sondagem_lenta_isolada_nao_derruba_o_tunel(tmp_path, monkeypatch):
    """Observado em campo: a suíte ocupava o túnel e o supervisor o refazia.

    A consulta de vida chegava a estourar o limite enquanto o banco atendia os
    testes. Tratar essa demora como queda fazia do próprio supervisor a causa da
    interrupção, de minuto em minuto. Uma falha isolada agora exige confirmação.
    """
    tunnel = VmDatabaseTunnel(tmp_path, lambda mensagem: None)
    tunnel.process = _ProcessoVivo()
    respostas = iter([False, True])
    monkeypatch.setattr(tunnel, "_ping", lambda: next(respostas))

    def nunca_derruba():
        raise AssertionError("demora pontual não é queda de sessão")

    monkeypatch.setattr(tunnel, "stop", nunca_derruba)
    monkeypatch.setattr(tunnel, "ensure", nunca_derruba)
    tunnel.monitor(_CicloUnico(), intervalo=0)
