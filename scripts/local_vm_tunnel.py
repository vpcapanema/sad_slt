"""Túnel Windows supervisionado para os bancos oficiais do SICARD na VM."""
from __future__ import annotations

import os
from pathlib import Path
import signal
import socket
import subprocess
import threading
import time
from urllib.parse import urlsplit

from dotenv import dotenv_values


VM_HOST = "56.125.163.194"
VM_SSH_PORT = 22
VM_DATABASE_PORT = 5433
LOCAL_DATABASE_HOST = "127.0.0.1"
# Porta exclusiva do SICARD no Windows. O SIGMA-PLI encaminha a mesma VM na
# 15433; compartilhar a porta faz o segundo projeto a subir ficar com um
# encaminhamento morto e derruba o banco do outro ao encerrar.
LOCAL_DATABASE_PORT = 15434
VM_HOST_KEY = "SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0"
# Sondagem curta o bastante para atravessar o ocioso de NAT/firewall que derruba
# a sessão SSH, e para o servidor voltar antes da próxima ação do usuário.
HEALTH_INTERVAL_SECONDS = 15


class VmDatabaseTunnel:
    def __init__(self, root: Path, reporter=print) -> None:
        self.root = root
        self.report = reporter
        self.process: subprocess.Popen | None = None
        self._stdout = None
        self._stderr = None

    @property
    def plink(self) -> Path:
        return Path(os.environ["LOCALAPPDATA"]) / "SICARD/tools/plink.exe"

    @property
    def key(self) -> Path:
        return self.root / ".deploy/SRV-SISTEMA-30001480.ppk"

    @property
    def pid_file(self) -> Path:
        return self.root / ".deploy/database-tunnel-windows.local.pid"

    def arguments(self) -> list[str]:
        return [
            str(self.plink), "-ssh", "-batch", "-T", "-N", "-P", str(VM_SSH_PORT),
            "-hostkey", VM_HOST_KEY, "-i", str(self.key),
            "-L", f"{LOCAL_DATABASE_HOST}:{LOCAL_DATABASE_PORT}:127.0.0.1:{VM_DATABASE_PORT}",
            "-no-antispoof", f"ubuntu@{VM_HOST}",
        ]

    @staticmethod
    def _port_open() -> bool:
        try:
            with socket.create_connection((LOCAL_DATABASE_HOST, LOCAL_DATABASE_PORT), timeout=1):
                return True
        except OSError:
            return False

    @staticmethod
    def _console(command: list[str]) -> str:
        try:
            return subprocess.run(
                command, capture_output=True, text=True, timeout=15,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            ).stdout
        except (OSError, subprocess.SubprocessError):
            return ""

    @classmethod
    def _listening_pid(cls) -> int | None:
        """PID que mantém o listener local, conforme o netstat do Windows."""
        enderecos = {f"{LOCAL_DATABASE_HOST}:{LOCAL_DATABASE_PORT}", f"[::1]:{LOCAL_DATABASE_PORT}"}
        for linha in cls._console(["netstat", "-ano", "-p", "TCP"]).splitlines():
            campos = linha.split()
            if len(campos) >= 5 and campos[1] in enderecos and campos[3].upper() == "LISTENING":
                try:
                    return int(campos[4])
                except ValueError:
                    return None
        return None

    @classmethod
    def _is_plink(cls, pid: int) -> bool:
        saida = cls._console(["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"])
        return saida.strip().lower().startswith('"plink.exe"')

    def _reclaim_own_tunnel(self) -> bool:
        """Encerra apenas o plink registrado por esta tarefa que ainda detém a porta.

        Uma queda de rede derruba a sessão SSH sem fechar o listener local: o
        plink órfão segue aceitando conexões que nunca chegam ao banco. Só há
        substituição quando o ocupante é, comprovadamente, esse túnel do projeto.
        """
        try:
            registrado = int(self.pid_file.read_text(encoding="ascii").strip())
        except (OSError, ValueError):
            return False
        dono = self._listening_pid()
        if dono is None or dono != registrado or not self._is_plink(dono):
            return False
        try:
            os.kill(dono, signal.SIGTERM)
        except OSError:
            return False
        limite = time.monotonic() + 10
        while time.monotonic() < limite:
            if not self._port_open():
                self.pid_file.unlink(missing_ok=True)
                self.report(f"Túnel anterior ({dono}) estava sem sessão SSH e foi encerrado.")
                return True
            time.sleep(0.4)
        return False

    def validate(self) -> dict[str, int]:
        """Confirma os dois bancos com transação explicitamente read-only."""
        import psycopg

        values = dotenv_values(self.root / ".env")
        targets = {
            "slt_db": (values.get("SLT_DATABASE_URL") or "", "demandas", "projeto"),
            "sigma_pli_qr53": (values.get("SIGMA_DATABASE_URL") or "", "usuarios", "usuario"),
        }
        counts: dict[str, int] = {}
        for expected, (dsn, schema, table) in targets.items():
            parsed = urlsplit(dsn)
            if parsed.hostname != LOCAL_DATABASE_HOST or parsed.port != LOCAL_DATABASE_PORT or parsed.path != f"/{expected}":
                raise RuntimeError(f"{expected} deve usar {LOCAL_DATABASE_HOST}:{LOCAL_DATABASE_PORT}/{expected} no .env")
            with psycopg.connect(dsn, connect_timeout=10, options="-c default_transaction_read_only=on") as connection:
                database, read_only = connection.execute(
                    "SELECT current_database(), current_setting('transaction_read_only')"
                ).fetchone()
                if database != expected or read_only != "on":
                    raise RuntimeError(f"Conexão inesperada ou gravável em {expected}")
                exists = connection.execute(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=%s AND table_name=%s)",
                    (schema, table),
                ).fetchone()[0]
                if not exists:
                    raise RuntimeError(f"Tabela esperada ausente em {expected}: {schema}.{table}")
                counts[expected] = connection.execute(
                    f'SELECT count(*) FROM "{schema}"."{table}"'
                ).fetchone()[0]
        return counts

    def ensure(self) -> dict[str, int]:
        if self._port_open():
            try:
                counts = self.validate()
                self.report(f"Túnel {LOCAL_DATABASE_PORT} existente validado nos bancos oficiais.")
                return counts
            except Exception as error:
                if not self._reclaim_own_tunnel():
                    raise RuntimeError(
                        f"A porta {LOCAL_DATABASE_PORT} está ocupada, mas não leva aos "
                        "bancos oficiais. Encerre o processo conflitante e repita a tarefa."
                    ) from error
        if not self.plink.is_file():
            raise RuntimeError(f"Plink oficial ausente: {self.plink}")
        if not self.key.is_file():
            raise RuntimeError("Chave autorizada da VM ausente em .deploy.")
        deploy = self.root / ".deploy"
        self._stdout = (deploy / "database-tunnel-windows.local.log").open("ab")
        self._stderr = (deploy / "database-tunnel-windows-error.local.log").open("ab")
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        self.process = subprocess.Popen(
            self.arguments(), cwd=self.root, stdin=subprocess.DEVNULL,
            stdout=self._stdout, stderr=self._stderr, creationflags=flags,
        )
        deadline = time.monotonic() + 20
        last_error: Exception | None = None
        port_opened = False
        try:
            while time.monotonic() < deadline:
                if self.process.poll() is not None:
                    raise RuntimeError(f"O túnel da VM encerrou com código {self.process.returncode}.")
                if self._port_open():
                    port_opened = True
                    try:
                        counts = self.validate()
                        self.pid_file.write_text(str(self.process.pid), encoding="ascii")
                        self.report("Túnel direto Windows → VM validado nos bancos oficiais.")
                        return counts
                    except Exception as error:
                        last_error = error
                time.sleep(0.4)
            if not port_opened:
                raise RuntimeError(
                    f"A conexão SSH com {VM_HOST}:{VM_SSH_PORT} não abriu o túnel "
                    f"local {LOCAL_DATABASE_PORT}. Verifique a rede e o log "
                    ".deploy/database-tunnel-windows-error.local.log."
                )
            raise RuntimeError("O túnel abriu, mas os bancos oficiais não responderam.") from last_error
        except Exception:
            self.stop()
            raise

    def _ping(self) -> bool:
        """Consulta mínima pelo túnel, usada como sinal de vida e como keepalive.

        Um plink vivo não prova sessão SSH viva: quando a rede cai, o processo
        continua aceitando conexões na porta local que nunca chegam ao banco. Só o
        tráfego real até o PostgreSQL distingue os dois casos — e, de quebra,
        impede que a sessão seja descartada por ociosidade.
        """
        import psycopg

        dsn = dotenv_values(self.root / ".env").get("SLT_DATABASE_URL") or ""
        if not dsn:
            return False
        try:
            with psycopg.connect(dsn, connect_timeout=10, options="-c default_transaction_read_only=on") as connection:
                connection.execute("SELECT 1")
            return True
        except Exception:
            return False

    def monitor(self, stopped: threading.Event, intervalo: float = HEALTH_INTERVAL_SECONDS) -> None:
        """Mantém o banco alcançável enquanto o servidor local estiver de pé."""
        while not stopped.wait(intervalo):
            if self._ping():
                continue
            # Uma sondagem falha não prova queda. Com a suíte de testes ou uma
            # extração pesada ocupando o túnel, a resposta pode simplesmente
            # demorar mais que o limite — e derrubar aí seria o supervisor
            # causando a interrupção que deveria evitar. Confirma antes de agir.
            if self._ping():
                continue
            if self.process is not None:
                self.report("Sessão SSH do banco caiu; refazendo o túnel.")
                self.stop()
            try:
                self.ensure()
                self.report("Túnel do banco restabelecido.")
            except Exception as error:
                self.report(
                    f"Reconexão do banco pendente ({type(error).__name__}); "
                    f"nova tentativa em {intervalo:.0f}s."
                )

    def _close_files(self) -> None:
        for stream in (self._stdout, self._stderr):
            if stream:
                stream.close()
        self._stdout = self._stderr = None

    def stop(self) -> None:
        process = self.process
        self.process = None
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        if process is not None:
            self.pid_file.unlink(missing_ok=True)
        self._close_files()
