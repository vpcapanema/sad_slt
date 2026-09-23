"""Escrita no storage do SICARD pela API REST do SFTPGo (contêiner sicard_storage).

Na VM o storage é montado somente leitura dentro da aplicação; gravar nele é
papel do SFTPGo. A API de usuário é publicada pelo Nginx em
/sicard/storage-api/user/ (.deploy/nginx/sicard-subpath.conf), então o envio
chega ao storage da VM tanto do servidor da VM quanto de um servidor local.

Configuração (.env):
  SICARD_STORAGE_API_URL          padrão https://56.125.163.194/sicard/storage-api
  SICARD_STORAGE_API_USER         usuário do SFTPGo usado pela aplicação
  SICARD_STORAGE_API_PASSWORD     senha desse usuário
  SICARD_STORAGE_API_VERIFY_TLS   "false" desliga a verificação do certificado
"""
from __future__ import annotations

import os
import threading
import time
from pathlib import Path
from typing import Any

import httpx

URL_PADRAO = "https://56.125.163.194/sicard/storage-api"
# Bit de diretório do FileMode do Go, como o SFTPGo devolve em DirEntry.mode.
_MODO_DIRETORIO = 2147483648
# O token do SFTPGo vale 20 minutos; renovar antes evita expirar no meio do envio.
_VALIDADE_TOKEN_S = 10 * 60

_token: dict[str, Any] = {"valor": None, "expira": 0.0, "chave": None}
_trava = threading.Lock()


class StorageIndisponivel(RuntimeError):
    """O storage não pôde ser alcançado ou recusou a operação."""


def _config() -> tuple[str, str, str, bool]:
    url = os.getenv("SICARD_STORAGE_API_URL", URL_PADRAO).strip().rstrip("/")
    usuario = os.getenv("SICARD_STORAGE_API_USER", "").strip()
    senha = os.getenv("SICARD_STORAGE_API_PASSWORD", "")
    verificar = os.getenv("SICARD_STORAGE_API_VERIFY_TLS", "true").strip().lower() != "false"
    return url, usuario, senha, verificar


def configurado() -> bool:
    _, usuario, senha, _ = _config()
    return bool(usuario and senha)


def _cliente() -> httpx.Client:
    url, _, _, verificar = _config()
    return httpx.Client(base_url=url, verify=verificar,
                        timeout=httpx.Timeout(30.0, read=300.0, write=300.0))


def _mensagem(resposta: httpx.Response) -> str:
    try:
        corpo = resposta.json()
    except ValueError:
        return resposta.text[:200] or f"HTTP {resposta.status_code}"
    return str(corpo.get("message") or corpo.get("error") or f"HTTP {resposta.status_code}")


def _obter_token(cliente: httpx.Client, renovar: bool = False) -> str:
    url, usuario, senha, _ = _config()
    if not usuario or not senha:
        raise StorageIndisponivel(
            "Envio ao storage não configurado: defina SICARD_STORAGE_API_USER e "
            "SICARD_STORAGE_API_PASSWORD no .env.")
    chave = (url, usuario)
    with _trava:
        if not renovar and _token["valor"] and _token["chave"] == chave and time.monotonic() < _token["expira"]:
            return str(_token["valor"])
        try:
            resposta = cliente.get("/user/token", auth=(usuario, senha))
        except httpx.HTTPError as exc:
            raise StorageIndisponivel(f"Storage inacessível: {exc}") from exc
        if resposta.status_code == 401:
            raise StorageIndisponivel("O storage recusou o usuário ou a senha configurados.")
        if resposta.status_code != 200:
            raise StorageIndisponivel(f"O storage recusou a autenticação: {_mensagem(resposta)}")
        valor = resposta.json().get("access_token")
        if not valor:
            raise StorageIndisponivel("O storage não devolveu token de acesso.")
        _token.update(valor=valor, expira=time.monotonic() + _VALIDADE_TOKEN_S, chave=chave)
        return str(valor)


def _pedir(cliente: httpx.Client, metodo: str, rota: str, **kwargs: Any) -> httpx.Response:
    headers = dict(kwargs.pop("headers", {}))
    for tentativa in (0, 1):
        token = _obter_token(cliente, renovar=bool(tentativa))
        # Token recusado no meio do caminho: o corpo já foi lido e volta ao início.
        if tentativa and hasattr(kwargs.get("content"), "seek"):
            kwargs["content"].seek(0)
        try:
            resposta = cliente.request(metodo, rota, headers={**headers, "Authorization": f"Bearer {token}"}, **kwargs)
        except httpx.HTTPError as exc:
            raise StorageIndisponivel(f"Storage inacessível: {exc}") from exc
        if resposta.status_code != 401:
            return resposta
    return resposta


def _absoluto(caminho: str) -> str:
    return "/" + str(caminho).strip().strip("/")


def listar(pasta: str) -> list[dict[str, Any]]:
    """Conteúdo de uma pasta do storage; pasta inexistente devolve lista vazia."""
    with _cliente() as cliente:
        resposta = _pedir(cliente, "GET", "/user/dirs", params={"path": _absoluto(pasta)})
    if resposta.status_code == 404:
        return []
    if resposta.status_code != 200:
        raise StorageIndisponivel(f"Não foi possível ler {pasta} no storage: {_mensagem(resposta)}")
    return [{"nome": item.get("name"), "pasta": bool(int(item.get("mode") or 0) & _MODO_DIRETORIO)}
            for item in resposta.json() or []]


def enviar(destino: str, origem: Path) -> None:
    """Grava `origem` em `destino` (caminho do arquivo no storage), criando as pastas."""
    with _cliente() as cliente, origem.open("rb") as fluxo:
        resposta = _pedir(cliente, "POST", "/user/files/upload",
                          params={"path": _absoluto(destino), "mkdir_parents": "true"},
                          content=fluxo)
    if resposta.status_code not in (200, 201):
        raise StorageIndisponivel(f"O storage recusou {Path(destino).name}: {_mensagem(resposta)}")


def criar_pasta(caminho: str) -> None:
    with _cliente() as cliente:
        resposta = _pedir(cliente, "POST", "/user/dirs", params={"path": _absoluto(caminho)})
    if resposta.status_code not in (200, 201):
        raise StorageIndisponivel(f"O storage recusou criar {caminho}: {_mensagem(resposta)}")


def mover(origem: str, destino: str) -> None:
    """Renomeia (move) um arquivo ou pasta dentro do storage."""
    with _cliente() as cliente:
        resposta = _pedir(cliente, "POST", "/user/file-actions/move",
                          params={"path": _absoluto(origem), "target": _absoluto(destino)})
    if resposta.status_code not in (200, 201):
        raise StorageIndisponivel(f"O storage recusou renomear {origem}: {_mensagem(resposta)}")


def apagar_pasta(caminho: str) -> None:
    """Apaga a pasta com o que houver dentro: quem chama confere antes que está vazia."""
    with _cliente() as cliente:
        resposta = _pedir(cliente, "DELETE", "/user/dirs", params={"path": _absoluto(caminho)})
    if resposta.status_code not in (200, 204):
        raise StorageIndisponivel(f"O storage recusou excluir {caminho}: {_mensagem(resposta)}")
