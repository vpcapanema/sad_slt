"""Supervisor autônomo do túnel Windows → VM para os bancos oficiais do SICARD.

Roda fora do editor: enquanto este processo existir, a porta local dos bancos
permanece atendida, mesmo sem a tarefa do servidor e mesmo depois que ela é
encerrada. É o que permite rodar testes, scripts e a própria aplicação sem
reabrir o túnel a cada vez.

Instale-o no logon com `scripts/install-tunnel-autostart.ps1`.
"""
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / ".deploy/database-tunnel-daemon.local.pid"
LOG = ROOT / ".deploy/database-tunnel-daemon.local.log"
LOG_LIMIT_BYTES = 1_000_000
# Espera entre tentativas de abrir o túnel quando a VM ainda não responde. Curta
# para o ambiente ficar pronto logo após o logon, longa o bastante para não
# martelar a VM enquanto a rede não volta.
RETRY_SECONDS = 20


def _processo_vivo(pid: int) -> bool:
    try:
        saida = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            capture_output=True, text=True, timeout=15,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return False
    return saida.strip().lower().startswith('"python')


def _outra_instancia() -> int | None:
    """PID de um supervisor já em execução, se houver."""
    try:
        pid = int(LOCK.read_text(encoding="ascii").strip())
    except (OSError, ValueError):
        return None
    if pid == os.getpid() or not _processo_vivo(pid):
        return None
    return pid


def _registrar(mensagem: str) -> None:
    linha = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {mensagem}\n"
    try:
        if LOG.exists() and LOG.stat().st_size > LOG_LIMIT_BYTES:
            # Mantém a cauda recente; o histórico antigo não tem valor de
            # diagnóstico e o arquivo cresceria sem limite em uso contínuo.
            LOG.write_text(
                "".join(LOG.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)[-2000:]),
                encoding="utf-8",
            )
        with LOG.open("a", encoding="utf-8") as arquivo:
            arquivo.write(linha)
    except OSError:
        pass
    print(linha, end="", flush=True)


def main() -> int:
    if sys.platform != "win32":
        raise SystemExit("Este supervisor é destinado ao Windows.")
    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT))
    from scripts.local_vm_tunnel import VmDatabaseTunnel

    LOCK.parent.mkdir(parents=True, exist_ok=True)
    existente = _outra_instancia()
    if existente is not None:
        _registrar(f"Supervisor já ativo no processo {existente}; nada a fazer.")
        return 0
    LOCK.write_text(str(os.getpid()), encoding="ascii")
    _registrar(f"Supervisor iniciado no processo {os.getpid()}.")

    tunel = VmDatabaseTunnel(ROOT, _registrar)
    parado = threading.Event()
    try:
        while not parado.is_set():
            try:
                contagens = tunel.ensure()
            except Exception as erro:
                _registrar(
                    f"Túnel indisponível ({type(erro).__name__}: {erro}); "
                    f"nova tentativa em {RETRY_SECONDS}s."
                )
                parado.wait(RETRY_SECONDS)
                continue
            _registrar(
                "Bancos oficiais alcançáveis: "
                f"slt_db ({contagens['slt_db']} projetos), "
                f"SIGMA ({contagens['sigma_pli_qr53']} usuários)."
            )
            # monitor() só retorna quando o evento é sinalizado; qualquer queda
            # é tratada lá dentro, com nova tentativa a cada sondagem.
            tunel.monitor(parado)
    except KeyboardInterrupt:
        _registrar("Encerramento solicitado.")
    finally:
        parado.set()
        tunel.stop()
        if _outra_instancia() is None:
            LOCK.unlink(missing_ok=True)
        _registrar("Supervisor encerrado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
