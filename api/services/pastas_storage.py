"""Pastas do storage do SICARD para o explorador do upload: listar, criar,
renomear e excluir, sempre no storage da VM (storage_remoto).

Regras:
- só dentro das pastas publicadas (RAIZES); as próprias raízes não mudam;
- renomear e excluir só pasta vazia. A API do SFTPGo apaga a pasta com tudo o que
  houver dentro, e renomear pasta com arquivos quebraria os caminhos já gravados
  nas extrações (impressão digital de cada camada usada);
- nada é sobrescrito: nome já usado na mesma pasta é recusado.

Num servidor local, a cópia do storage em data/storage acompanha a operação para
o explorador de camadas continuar igual ao storage. Na VM a pasta é o próprio
storage, montado somente leitura, e nada é copiado.
"""
from __future__ import annotations

import os
import re
from pathlib import PurePosixPath
from typing import Any

from api.services import storage_remoto
from api.services.storage_geoespacial import RAIZES, diretorio_storage

_RESERVADOS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_NOMES_WINDOWS = re.compile(r"(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?", re.I)


def nome_valido(nome: str) -> str:
    texto = str(nome or "")
    if (not texto or texto != texto.strip() or texto.startswith(".") or texto.endswith(".")
            or len(texto) > 120 or _RESERVADOS.search(texto) or _NOMES_WINDOWS.fullmatch(texto)):
        raise ValueError("Informe um nome de pasta válido, sem barras nem caracteres reservados.")
    return texto


def caminho_valido(caminho: str | None) -> str:
    """`raiz/sub/...` dentro de uma pasta publicada; devolve normalizado."""
    partes = [p for p in str(caminho or "").replace("\\", "/").split("/") if p]
    if not partes or partes[0] not in RAIZES:
        raise ValueError(f"A pasta deve estar dentro de {' ou '.join(RAIZES)}.")
    for parte in partes[1:]:
        nome_valido(parte)
    return "/".join(partes)


def _alteravel(caminho: str) -> str:
    caminho = caminho_valido(caminho)
    if caminho in RAIZES:
        raise ValueError("As pastas principais do storage não podem ser renomeadas nem excluídas.")
    return caminho


def _conteudo(caminho: str) -> list[dict[str, Any]]:
    return storage_remoto.listar(caminho)


def _exigir_vazia(caminho: str, acao: str) -> None:
    if _conteudo(caminho):
        raise ValueError(f"Só é possível {acao} pasta vazia. Esta pasta tem arquivos ou subpastas, "
                         "e os caminhos deles precisam ser preservados.")


def _exigir_livre(pai: str, nome: str) -> None:
    if nome in {item["nome"] for item in _conteudo(pai)}:
        raise FileExistsError(f"Já existe “{nome}” em {pai}.")


def _local(caminho: str):
    base = diretorio_storage()
    if not base.is_dir() or not os.access(base, os.W_OK):
        return None
    return base.joinpath(*PurePosixPath(caminho).parts)


def listar(caminho: str | None = None) -> dict[str, Any]:
    """Raiz: as pastas publicadas. Dentro delas: subpastas e arquivos (só para contexto)."""
    if not str(caminho or "").strip("/ "):
        return {"caminho": "", "pastas": [{"nome": r, "caminho": r, "raiz": True} for r in RAIZES],
                "arquivos": []}
    caminho = caminho_valido(caminho)
    itens = _conteudo(caminho)
    pastas = sorted((i["nome"] for i in itens if i["pasta"]), key=str.casefold)
    arquivos = sorted((i["nome"] for i in itens if not i["pasta"]), key=str.casefold)
    return {"caminho": caminho,
            "pastas": [{"nome": n, "caminho": f"{caminho}/{n}", "raiz": False} for n in pastas],
            "arquivos": arquivos}


def criar(pai: str, nome: str) -> dict[str, Any]:
    pai = caminho_valido(pai)
    nome = nome_valido(nome)
    _exigir_livre(pai, nome)
    novo = f"{pai}/{nome}"
    storage_remoto.criar_pasta(novo)
    local = _local(novo)
    if local is not None:
        local.mkdir(parents=True, exist_ok=True)
    return {"nome": nome, "caminho": novo}


def renomear(caminho: str, nome: str) -> dict[str, Any]:
    caminho = _alteravel(caminho)
    nome = nome_valido(nome)
    pai = caminho.rsplit("/", 1)[0]
    _exigir_vazia(caminho, "renomear")
    _exigir_livre(pai, nome)
    novo = f"{pai}/{nome}"
    storage_remoto.mover(caminho, novo)
    antigo_local, novo_local = _local(caminho), _local(novo)
    if antigo_local is not None and antigo_local.is_dir() and not any(antigo_local.iterdir()):
        antigo_local.rename(novo_local)
    return {"nome": nome, "caminho": novo}


def excluir(caminho: str) -> dict[str, Any]:
    caminho = _alteravel(caminho)
    _exigir_vazia(caminho, "excluir")
    storage_remoto.apagar_pasta(caminho)
    local = _local(caminho)
    if local is not None and local.is_dir() and not any(local.iterdir()):
        local.rmdir()
    return {"caminho": caminho}
