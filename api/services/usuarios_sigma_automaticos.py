"""Sincronização periódica de usuários, vinculada ao ciclo de vida da API."""
from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from threading import Event, Lock

from fastapi import FastAPI

from api.config import get_usuarios_sync_settings
from api.services.usuarios_sigma_sync import sincronizar

logger = logging.getLogger(__name__)
_guard = Lock()
_estado: dict[str, object] = {
    "ativa": False, "erro": "", "ultima_sincronizacao": None,
    "intervalo_segundos": 60, "usuarios_sigma": None, "ciclos_concluidos": 0,
}


def estado() -> dict[str, object]:
    with _guard:
        return dict(_estado)


def _atualizar(**valores: object) -> None:
    with _guard:
        _estado.update(valores)


def executar(parar: Event) -> None:
    intervalo = 60
    try:
        while not parar.is_set():
            try:
                config = get_usuarios_sync_settings()
                if not config.habilitado:
                    _atualizar(erro="")
                    return
                intervalo = config.intervalo
                _atualizar(ativa=True, intervalo_segundos=intervalo)
                resultado = sincronizar()
                _atualizar(
                    erro="", ultima_sincronizacao=datetime.now(timezone.utc).isoformat(),
                    usuarios_sigma=resultado['usuarios_sigma'],
                    ciclos_concluidos=int(estado()['ciclos_concluidos']) + 1,
                )
                logger.info("Usuários SIGMA sincronizados; total=%s novos=%s ausentes_desativados=%s",
                            resultado['usuarios_sigma'], resultado['novos'], resultado['ausentes_desativados'])
            except Exception as exc:
                # Mensagens de banco podem conter DSNs ou dados de registros.
                _atualizar(erro="Falha na sincronização de usuários. Uma nova tentativa será realizada.")
                logger.error("Sincronização de usuários falhou; tipo=%s; nova tentativa em %ss",
                             type(exc).__name__, intervalo)
            if parar.wait(intervalo):
                return
    finally:
        _atualizar(ativa=False)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    parar = Event()
    tarefa = asyncio.create_task(asyncio.to_thread(executar, parar))
    try:
        yield
    finally:
        parar.set()
        await tarefa
