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


def _instante(valor: Any) -> float:
    """`last_modified` do SFTPGo (ISO 8601) em epoch; 0.0 quando ausente."""
    from datetime import datetime

    try:
        return datetime.fromisoformat(str(valor).replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return 0.0


def listar(pasta: str, estrito: bool = False) -> list[dict[str, Any]]:
    """Conteúdo de uma pasta do storage; pasta inexistente devolve lista vazia.

    Com `estrito`, a pasta inexistente vira FileNotFoundError — o que distingue
    a pasta que não existe daquela que existe e está vazia.
    """
    with _cliente() as cliente:
        resposta = _pedir(cliente, "GET", "/user/dirs", params={"path": _absoluto(pasta)})
    if resposta.status_code == 404:
        if estrito:
            raise FileNotFoundError(pasta)
        return []
    if resposta.status_code != 200:
        raise StorageIndisponivel(f"Não foi possível ler {pasta} no storage: {_mensagem(resposta)}")
    return [{"nome": item.get("name"), "pasta": bool(int(item.get("mode") or 0) & _MODO_DIRETORIO),
             "tamanho": int(item.get("size") or 0),
             "modificado": _instante(item.get("last_modified"))}
            for item in resposta.json() or []]


def endereco_vsi(caminho: str) -> str:
    """Arquivo do storage como caminho /vsicurl, lido pelo GDAL sem cópia local.

    O GDAL busca por HTTP Range apenas os trechos de que precisa e resolve
    sozinho os acompanhantes de um .shp trocando a extensão nesta mesma URL.
    """
    from urllib.parse import quote

    url, _, _, _ = _config()
    return f"/vsicurl/{url}/user/files?path={quote(_absoluto(caminho))}"


def preparar_gdal() -> None:
    """Credencial e ajustes que o /vsicurl precisa para falar com o SFTPGo."""
    from osgeo import gdal

    with _cliente() as cliente:
        token = _obter_token(cliente)
    _, _, _, verificar = _config()
    ajustes = {
        "GDAL_HTTP_HEADERS": f"Authorization: Bearer {token}",
        "GDAL_HTTP_UNSAFESSL": "NO" if verificar else "YES",
        # O SFTPGo não responde HEAD em /user/files; o tamanho vem do próprio GET.
        "CPL_VSIL_CURL_USE_HEAD": "NO",
        # Sem listagem de diretório por HTTP, o GDAL pede cada acompanhante direto.
        "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
    }
    for chave, valor in ajustes.items():
        gdal.SetConfigOption(chave, valor)
        # O pyogrio carrega a própria cópia do GDAL: só o ambiente alcança as duas.
        os.environ[chave] = valor


def baixar(caminho: str) -> bytes:
    """Conteúdo de um arquivo do storage; arquivo inexistente vira FileNotFoundError."""
    with _cliente() as cliente:
        resposta = _pedir(cliente, "GET", "/user/files", params={"path": _absoluto(caminho)})
    if resposta.status_code == 404:
        raise FileNotFoundError(caminho)
    if resposta.status_code != 200:
        raise StorageIndisponivel(f"Não foi possível ler {caminho} no storage: {_mensagem(resposta)}")
    return resposta.content


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


def apagar_arquivo(caminho: str) -> None:
    """Remove um arquivo pelo caminho exato (por exemplo, um índice obsoleto)."""
    with _cliente() as cliente:
        resposta = _pedir(cliente, "DELETE", "/user/files", params={"path": _absoluto(caminho)})
    if resposta.status_code not in (200, 204, 404):
        raise StorageIndisponivel(f"O storage recusou remover {Path(caminho).name}: {_mensagem(resposta)}")


def copiar_para(caminho: str, destino) -> str:
    """Copia por blocos para um stream, sem manter o arquivo inteiro na memória."""
    from hashlib import sha256
    resumo = sha256()
    with _cliente() as cliente:
        for tentativa in (0,1):
            token=_obter_token(cliente,renovar=bool(tentativa))
            try:
                with cliente.stream("GET","/user/files",params={"path":_absoluto(caminho)},
                                    headers={"Authorization":f"Bearer {token}"}) as resposta:
                    if resposta.status_code==401 and not tentativa:
                        continue
                    if resposta.status_code==404:
                        raise FileNotFoundError("Arquivo não encontrado no Storage")
                    if resposta.status_code!=200:
                        resposta.read()
                        raise StorageIndisponivel(f"Falha no download: {_mensagem(resposta)}")
                    for bloco in resposta.iter_bytes(1024*1024):
                        resumo.update(bloco)
                        destino.write(bloco)
                    return resumo.hexdigest()
            except httpx.HTTPError as exc:
                raise StorageIndisponivel("Não foi possível concluir a leitura do Storage") from exc
    raise StorageIndisponivel("O Storage recusou a autenticação")
