"""Canal de acompanhamento: estado atual publicado pelo worker, sem polling de logs."""
import asyncio
import json
from threading import Lock
from dataclasses import dataclass
from typing import Any

from starlette.responses import StreamingResponse

CAMPOS = ('id','status','etapa','etapa_atual','tarefa_id','percentual','progresso_geral',
          'progresso_tarefa','atividade','detalhe','concluidas','total','unidade','cancelavel','cancelamento_solicitado','erro')
FINAIS = {'concluido','erro','cancelado'}


@dataclass(eq=False)
class _Ouvinte:
    loop: Any
    fila: asyncio.Queue
    pendente: bool = False


class CanalProgresso:
    def __init__(self):
        self.lock = Lock()
        self.atual = {}
        self.versao = 0
        self.ouvintes = set()

    def publicar(self, estado):
        resumo = {k:estado[k] for k in CAMPOS if k in estado}
        with self.lock:
            if resumo == self.atual:
                return
            self.atual = resumo
            self.versao += 1
            for ouvinte in tuple(self.ouvintes):
                if not ouvinte.pendente:
                    ouvinte.pendente = True
                    try:
                        ouvinte.loop.call_soon_threadsafe(self._entregar, ouvinte)
                    except RuntimeError:
                        self.ouvintes.discard(ouvinte)

    def _entregar(self, ouvinte):
        queue = ouvinte.fila
        with self.lock:
            ouvinte.pendente = False
            if ouvinte not in self.ouvintes:
                return
            item = (self.versao, dict(self.atual))
        if queue.full():
            queue.get_nowait()
        queue.put_nowait(item)

    async def eventos(self, ident):
        queue = asyncio.Queue(maxsize=1)
        ouvinte = _Ouvinte(asyncio.get_running_loop(), queue)
        with self.lock:
            self.ouvintes.add(ouvinte)
            inicial = (self.versao, dict(self.atual))
        queue.put_nowait(inicial)
        try:
            yield 'retry: 2000\n\n'
            while True:
                try:
                    versao, data = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ': keepalive\n\n'
                    continue
                data['id'] = str(ident)
                yield f'id: {versao}\nevent: progresso\ndata: {json.dumps(data, ensure_ascii=False, allow_nan=False)}\n\n'
                if data.get('status') in FINAIS:
                    break
        finally:
            with self.lock:
                self.ouvintes.discard(ouvinte)


def resposta(canal, ident):
    return StreamingResponse(canal.eventos(ident), media_type='text/event-stream',
        headers={'Cache-Control':'no-store, no-transform', 'X-Accel-Buffering':'no'})
