"""Integração restrita com o cliente web nativo SFTPGo, sem alterar seu upload.

Cookies do usuário técnico ficam exclusivamente no servidor. Cada janela tem
sessão própria, vinculada ao usuário SICARD, como os jobs (worker único da VM).
Não disponibiliza o painel administrativo, downloads ou operações de exclusão.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import html
import re
import secrets
import time
from urllib.parse import urlsplit, unquote

import httpx
from fastapi import HTTPException
from api.services import storage_remoto

PASTA = 'base-geoespacial'
TTL = 2 * 60 * 60


@dataclass
class Sessao:
    usuario: str
    client: httpx.AsyncClient
    raiz: str
    pagina: str
    expira: float
    arquivos: list[str] = field(default_factory=list)
    enviando: int = 0


sessoes: dict[str, Sessao] = {}


async def criar(usuario: str) -> str:
    for chave, sessao in list(sessoes.items()):
        if not sessao.enviando and sessao.expira < time.monotonic():
            sessoes.pop(chave, None)
            await sessao.client.aclose()
    if sum(s.usuario == usuario for s in sessoes.values()) >= 3:
        raise HTTPException(409, 'Feche uma janela de envio antes de abrir outra.')
    url, nome, senha, tls = storage_remoto._config()
    if nome != 'sicard' or not senha:
        raise HTTPException(503, 'O acesso técnico sicard ao storage não está configurado no servidor.')
    raiz = url.removesuffix('/storage-api') + '/storage'
    client = httpx.AsyncClient(verify=tls, follow_redirects=False,
                              timeout=httpx.Timeout(30, read=300, write=300))
    try:
        login = await client.get(raiz + '/web/client/login')
        token = re.search(r'name="_form_token" value="([^"]+)"', login.text)
        if login.status_code != 200 or not token:
            raise ValueError('login')
        resposta = await client.post(raiz + '/web/client/login', data={
            'username': nome, 'password': senha, '_form_token': html.unescape(token[1]),
        })
        if resposta.status_code != 302:
            raise ValueError('autenticação')
        pagina = await client.get(raiz + '/web/client/files', params={'path': '/' + PASTA})
        if pagina.status_code != 200 or 'function uploadFiles(files)' not in pagina.text:
            raise ValueError('cliente incompatível')
    except Exception as exc:
        await client.aclose()
        raise HTTPException(502, 'Não foi possível abrir o upload do storage. Verifique a conexão e o acesso da conta sicard.') from exc
    chave = secrets.token_urlsafe(24)
    sessoes[chave] = Sessao(usuario, client, raiz, pagina.text, time.monotonic() + TTL)
    return chave


def obter(chave: str, usuario: str) -> Sessao:
    sessao = sessoes.get(chave)
    if not sessao or sessao.usuario != usuario or sessao.expira < time.monotonic():
        raise HTTPException(404, 'Janela de upload expirada. Abra novamente Enviar nova camada base.')
    sessao.expira = time.monotonic() + TTL
    return sessao


def caminho_permitido(valor: str) -> str:
    # Não normalizar antes de conferir: traversal e barras alternativas são recusados.
    # O cliente web usa parâmetros de caminho escapados. Conferir também
    # sequências duplamente escapadas antes de encaminhá-las ao SFTPGo.
    decodificado=unquote(valor)
    if decodificado != valor:
        if unquote(decodificado) != decodificado:
            raise HTTPException(400, 'Destino de upload inválido.')
        caminho_permitido(decodificado)
    partes = valor.strip('/').split('/')
    if not partes or partes[0] != PASTA or any(p in ('', '.', '..') for p in partes) or any(c in valor for c in ('\\', '\x00', '\r', '\n')):
        raise HTTPException(400, 'Destino de upload inválido.')
    return '/'.join(partes)


def validar_rota(rota: str, metodo: str, parametros) -> str | None:
    if rota.startswith('static/') and metodo == 'GET':
        if any(p in ('', '.', '..') for p in rota.split('/')) or '\\' in rota:
            raise HTTPException(400, 'Recurso inválido.')
        return None
    permitidas = {'GET': {'web/client/files', 'web/client/dirs', 'web/client/ping'},
                  'POST': {'web/client/file', 'web/client/exist'}}
    if rota not in permitidas.get(metodo, set()):
        raise HTTPException(403, 'Operação indisponível nesta janela de upload.')
    if rota.endswith('/ping'):
        return None
    caminho = caminho_permitido(parametros.get('path', '/' + PASTA))
    if rota.endswith('/file') and caminho == PASTA:
        raise HTTPException(400, 'Selecione um arquivo para enviar.')
    if rota.endswith('/exist') and parametros.get('op') != 'upload':
        raise HTTPException(403, 'Somente a conferência do upload é permitida.')
    return caminho


def pagina_integrada(sessao: Sessao, proxy: str, script: str) -> str:
    original = urlsplit(sessao.raiz).path
    pagina = sessao.pagina.replace(original.replace('/', '\\/'), proxy.replace('/', '\\/'))
    pagina = pagina.replace(original, proxy)
    # O código nativo (incluindo uploadFiles, Dropzone e checagem de duplicatas)
    # permanece intacto. Apenas URLs de transporte e apresentação são adaptadas.
    ponte = f'<script src="{html.escape(script, quote=True)}"></script>'
    return pagina.replace('</body>', ponte + '</body>')


def resultados(sessao: Sessao):
    from api.services import storage_geoespacial as storage
    # O upload nativo pode preservar mtime e tamanho ao sobrescrever. Reabrir
    # o inventário após o envio evita usar metadados antigos nesse caso.
    storage._camadas_do_arquivo.cache_clear()
    storage._inventario_pacote.cache_clear()
    camadas, avisos = [], []
    for relativo in sessao.arquivos:
        try:
            for tentativa in range(6):
                try:
                    arquivo = storage.resolver(relativo)
                    break
                except FileNotFoundError:
                    if tentativa == 5:
                        raise
                    time.sleep(1)  # o mount HTTP renova listagens a cada 5 segundos.
            itens = storage._itens_do_arquivo(arquivo, relativo)
            for camada in itens:
                if camada.get('erro'):
                    avisos.append(f"{relativo}: {camada['erro']}")
                elif camada.get('tipo') != 'vetor':
                    avisos.append(f'{relativo}: arquivo salvo; os algoritmos da extração exigem bases vetoriais.')
                elif not camada.get('crs'):
                    avisos.append(f"{camada['nome']}: arquivo salvo, mas a camada não informa o CRS.")
                else:
                    camadas.append({**camada, 'origem': 'storage', 'origem_geometria': 'storage'})
        except ValueError as exc:
            avisos.append(f'{relativo}: {exc}')
        except (OSError, RuntimeError):
            avisos.append(f'{relativo}: arquivo enviado, mas ainda não pôde ser lido como camada. Tente novamente a leitura.')
    return {'arquivos': list(sessao.arquivos), 'camadas': camadas, 'avisos': avisos, 'pasta': PASTA}
