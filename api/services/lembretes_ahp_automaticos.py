"""Executa a agenda de lembretes sem depender de uma tela aberta."""
import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import logging
from threading import Event

from fastapi import FastAPI
from psycopg.errors import UndefinedColumn, UndefinedTable

from api.services import email_service, lembretes_ahp

logger = logging.getLogger(__name__)
_INTERVALO = 30


def executar(parar: Event, base: str) -> None:
    while not parar.is_set():
        try:
            config = email_service._config(exigir_ativo=False)
            if config.habilitado and not config.campos_ausentes():
                lembretes_ahp.processar(parar, base, str(config.remetente).rsplit("@", 1)[1])
        except (UndefinedTable, UndefinedColumn):
            logger.error("A agenda de lembretes requer as migrações 188 e 190. A consulta será repetida.")
        except Exception as exc:
            logger.error("Falha na rotina de lembretes AHP (%s). Nova tentativa em %ss.",
                         type(exc).__name__, _INTERVALO)
        if parar.wait(_INTERVALO):
            return


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    base = lembretes_ahp.base_publica()
    if not base:
        yield
        return
    parar = Event()
    tarefa = asyncio.create_task(asyncio.to_thread(executar, parar, base))
    try:
        yield
    finally:
        parar.set()
        await tarefa
