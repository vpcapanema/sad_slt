"""Jobs da leitura de PDFs do SEI.

Ler um PDF (texto, OCR, campos) leva de segundos a minutos. A rota devolve o
job na hora e a página consulta `obter()`, que traz cada passo real do
extrator na ordem em que aconteceu. Os jobs vivem só em memória: servem ao
acompanhamento na tela; o resultado da leitura é gravado pelo próprio serviço.
"""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Callable
from uuid import uuid4

from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError

# progresso(mensagem, nivel="info"); nivel "aviso" marca um passo com ressalva.
Progresso = Callable[..., None]
RETENCAO_SEGUNDOS = 3600


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat()


class SeiJobs:
    def __init__(self) -> None:
        self._jobs: dict[str, dict[str, Any]] = {}
        self._encerrados: dict[str, float] = {}
        self._lock = Lock()
        # OCR é CPU pesada: dois PDFs por vez, para não congelar a VM.
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="sei-job")

    def criar(self, tipo: str, tarefa: Callable[[Progresso], Any]) -> dict[str, Any]:
        """Enfileira `tarefa(progresso)` e devolve o job já registrado."""
        self._limpar()
        job_id = f"sei_{uuid4().hex}"
        with self._lock:
            self._jobs[job_id] = {
                "id": job_id, "tipo": tipo, "status": "executando", "logs": [],
                "resultado": None, "erro": None, "erro_status": None,
                "iniciado_em": _agora(), "concluido_em": None,
            }
        self._executor.submit(self._executar, job_id, tarefa)
        return self.obter(job_id) or {}

    def obter(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return deepcopy(job) if job else None

    def _registrar(self, job_id: str, mensagem: str, nivel: str = "info") -> None:
        with self._lock:
            logs = self._jobs[job_id]["logs"]
            logs.append({"sequencia": len(logs) + 1, "instante": _agora(), "nivel": nivel, "mensagem": mensagem})

    def _encerrar(self, job_id: str, **campos: Any) -> None:
        with self._lock:
            self._jobs[job_id].update(concluido_em=_agora(), **campos)
            self._encerrados[job_id] = time.monotonic()

    def _falhar(self, job_id: str, status: int, mensagem: str) -> None:
        self._registrar(job_id, mensagem, "erro")
        self._encerrar(job_id, status="erro", erro=mensagem, erro_status=status)

    def _executar(self, job_id: str, tarefa: Callable[[Progresso], Any]) -> None:
        def progresso(mensagem: str, nivel: str = "info") -> None:
            self._registrar(job_id, mensagem, nivel)

        try:
            resultado = tarefa(progresso)
        except DemandaValidationError as exc:
            self._falhar(job_id, 422, str(exc))
        except DemandaNotFoundError as exc:
            self._falhar(job_id, 404, str(exc))
        except DatabaseUnavailableError:
            self._falhar(job_id, 503, "O armazenamento dos documentos está indisponível. Tente novamente.")
        except Exception as exc:  # noqa: BLE001 — qualquer falha precisa chegar à tela, com o tipo
            self._falhar(job_id, 500, f"Falha inesperada na leitura: {type(exc).__name__}: {exc}")
        else:
            self._encerrar(job_id, status="concluido", resultado=resultado)

    def _limpar(self) -> None:
        limite = time.monotonic() - RETENCAO_SEGUNDOS
        with self._lock:
            for job_id in [j for j, fim in self._encerrados.items() if fim < limite]:
                self._encerrados.pop(job_id, None)
                self._jobs.pop(job_id, None)


sei_jobs = SeiJobs()
