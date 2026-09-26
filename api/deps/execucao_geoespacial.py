"""Rastreia operações HTTP diretas; jobs possuem contexto próprio no worker."""
from fastapi import Depends, Request
from starlette.concurrency import run_in_threadpool

from api.deps.auth import require_geospatial_access
from api.services import ciclo_vida_arquivos as ciclo
from api.services.session_service import SessionUser


async def rastrear_execucao(request: Request, user: SessionUser = Depends(require_geospatial_access)):
    path = request.url.path
    active = request.method == 'POST' and (
        '/operacoes/' in path or
        (path.endswith('/executar') and any(s in path for s in ('/algoritmos/', '/funcoes/', '/fluxos/')))
    )
    if not active:
        yield
        return
    parameters = dict(request.query_params)
    if 'application/json' in request.headers.get('content-type', ''):
        body = await request.json()
        if isinstance(body, dict):
            parameters.update(body)
    ident = await run_in_threadpool(ciclo.iniciar, path, parameters, str(user.id))
    token = ciclo.execucao_atual.set(ident)
    try:
        yield
    except Exception as exc:
        await run_in_threadpool(ciclo.finalizar, ident, erro=type(exc).__name__)
        raise
    else:
        await run_in_threadpool(ciclo.finalizar, ident, temporario=parameters.get('destino') == 'memoria')
    finally:
        ciclo.execucao_atual.reset(token)
