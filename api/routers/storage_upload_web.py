"""Ponte autenticada para o modal nativo do storage usado na subseção 1.2."""
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, Response
from starlette.concurrency import run_in_threadpool

from api.deps.auth import require_authenticated
from api.services import storage_upload_web as service
from api.services.session_service import SessionUser

def require_storage_upload(user: SessionUser = Depends(require_authenticated)):
    if user.tipo_usuario.strip().upper() not in {'ANALISTA', 'GESTOR', 'ADMIN'}:
        raise HTTPException(403, 'Seu perfil SICARD não tem permissão para enviar camadas de base. O envio exige perfil Analista, Gestor ou Admin.')
    return user


router = APIRouter(prefix='/storage-upload', dependencies=[Depends(require_storage_upload)])
HEADERS = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
           'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN'}


def origem(request):
    origin = request.headers.get('origin')
    if request.headers.get('sec-fetch-site') == 'cross-site' or (origin and urlsplit(origin).netloc != request.headers.get('host')):
        raise HTTPException(403, 'Abra o envio a partir do SICARD.')


@router.post('/sessoes')
async def abrir(request: Request, user: SessionUser = Depends(require_storage_upload)):
    origem(request)
    chave = await service.criar(user.id)
    return {'sessao': chave, 'pasta': service.PASTA}


@router.get('/sessoes/{chave}/resultado')
async def resultado(chave: str, user: SessionUser = Depends(require_storage_upload)):
    sessao = service.obter(chave, user.id)
    if sessao.enviando:
        raise HTTPException(409, 'Aguarde o término do envio.')
    dados = await run_in_threadpool(service.resultados, sessao)
    return dados


@router.delete('/sessoes/{chave}')
async def fechar(chave: str, request: Request, user: SessionUser = Depends(require_storage_upload)):
    origem(request)
    sessao = service.obter(chave, user.id)
    if sessao.enviando:
        raise HTTPException(409, 'Aguarde o término do envio.')
    service.sessoes.pop(chave, None)
    await sessao.client.aclose()
    return Response(status_code=204)


@router.api_route('/sessoes/{chave}/cliente/{rota:path}', methods=['GET', 'POST'])
async def cliente(chave: str, rota: str, request: Request, user: SessionUser = Depends(require_storage_upload)):
    sessao = service.obter(chave, user.id)
    origem(request)
    caminho = service.validar_rota(rota, request.method, request.query_params)
    if rota == 'web/client/files':
        # O recarregamento final nativo é o sinal de conclusão, sem alterar uploadFiles.
        if sessao.arquivos:
            return HTMLResponse('<!doctype html><meta charset="utf-8"><p>Envio concluído. Preparando camadas…</p>'
                                '<script>parent.postMessage({tipo:"sicard-storage-concluido"},location.origin)</script>', headers=HEADERS)
        prefix = '/sicard' if request.scope.get('root_path', '').startswith('/sicard') or request.headers.get('x-forwarded-prefix') == '/sicard' else ''
        # SubpathRewriteMiddleware conserva o prefixo no root_path.
        proxy = f'{prefix}/api/geoespacial/extracao-atributos/storage-upload/sessoes/{chave}/cliente'
        script = f'{prefix}/restrict/geoespacial/extracao-atributos/storage-upload-ponte.js'
        return HTMLResponse(service.pagina_integrada(sessao, proxy, script), headers=HEADERS)
    upload = rota == 'web/client/file'
    if upload:
        sessao.enviando += 1
    try:
        headers = {k: v for k, v in request.headers.items()
                   if k.lower() in {'content-type', 'content-length', 'x-csrf-token', 'x-sftpgo-mtime'}}
        resposta = await sessao.client.request(request.method, sessao.raiz + '/' + rota,
            params=list(request.query_params.multi_items()), headers=headers,
            content=request.stream() if request.method == 'POST' else None)
        if upload and resposta.status_code == 201 and caminho not in sessao.arquivos:
            sessao.arquivos.append(caminho)
        if resposta.is_redirect:
            raise HTTPException(401, 'A sessão do storage expirou. Reabra o envio.')
        tipo = resposta.headers.get('content-type', 'application/octet-stream')
        # Arquivos enviados nunca são servidos nesta origem. Somente assets estáticos
        # do SFTPGo e respostas JSON das operações explicitamente permitidas.
        return Response(resposta.content, status_code=resposta.status_code,
                        headers={**HEADERS, 'Content-Type': tipo})
    except httpx.HTTPError as exc:
        raise HTTPException(502, 'A conexão com o storage foi interrompida. Confira o resultado antes de reenviar.') from exc
    finally:
        if upload:
            sessao.enviando -= 1
