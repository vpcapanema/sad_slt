"""Coleta periódica de DSN/MDN, independente de páginas abertas e sem envio SMTP."""
from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from threading import Event, Lock

from fastapi import FastAPI

from api.repositories import email_convites_repository as repo
from api.services import email_confirmacoes
from api.services.email_service import FalhaEmail, _config

logger = logging.getLogger(__name__)
_guard = Lock()
_estado: dict[str, object] = {
    "ativa": False, "erro": "", "ultima_coleta": None, "intervalo_segundos": 30,
}


def estado() -> dict[str, object]:
    with _guard:
        return dict(_estado)


def _atualizar(**valores: object) -> None:
    with _guard:
        _estado.update(valores)


def executar(parar: Event) -> None:
    intervalo = 30
    while not parar.is_set():
        try:
            config = _config(exigir_ativo=False)
            if not (config.habilitado and config.imap_habilitado and config.confirmacoes_automaticas):
                _atualizar(ativa=False, erro="")
                logger.info("Coleta automática de confirmações desativada pela configuração.")
                return
            intervalo = config.confirmacoes_intervalo
            _atualizar(ativa=True, intervalo_segundos=intervalo)
            with repo.bloquear_coleta() as adquirido:
                if adquirido and not parar.is_set():
                    consultados = email_confirmacoes.coletar_automaticamente(parar.is_set)
                    if not parar.is_set():
                        _atualizar(erro="", ultima_coleta=datetime.now(timezone.utc).isoformat())
                        logger.info("Coleta automática concluída; relatórios_consultados=%s", consultados)
        except Exception as exc:
            # A rotina deve sobreviver a falhas de infraestrutura, sem ocultá-las.
            mensagem = str(exc) if isinstance(exc, FalhaEmail) else (
                "Falha na coleta automática de confirmações. Uma nova tentativa será realizada."
            )
            _atualizar(erro=mensagem)
            logger.error("Coleta automática falhou; tipo=%s codigo=%s; nova tentativa em %ss",
                         type(exc).__name__, getattr(exc, "codigo", ""), intervalo)
        if parar.wait(intervalo):
            return


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    parar = Event()
    tarefa = asyncio.create_task(asyncio.to_thread(executar, parar))
    try:
        yield
    finally:
        parar.set()
        await tarefa
        _atualizar(ativa=False)
