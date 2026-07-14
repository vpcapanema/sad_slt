"""Política única para caminhos de arquivos do sistema.

Configurações, entradas e respostas usam sempre caminhos relativos à raiz do
projeto. A resolução para o filesystem ocorre somente no limite de I/O.
"""
from __future__ import annotations

import re
from os import PathLike
from pathlib import Path, PurePosixPath


PROJECT_ROOT = Path(__file__).parent.parent
_WINDOWS_ABSOLUTE = re.compile(r"^[A-Za-z]:[/\\]")


def relative_path(value: str | PathLike[str], *, label: str = "caminho") -> Path:
    """Valida e normaliza um caminho relativo, sem permitir fuga da raiz."""
    raw = str(value).strip()
    if not raw:
        raise ValueError(f"{label.capitalize()} relativo não pode ser vazio")
    if raw.startswith(("/", "\\", "~")) or _WINDOWS_ABSOLUTE.match(raw):
        raise ValueError(f"{label.capitalize()} deve ser relativo à raiz do projeto")

    normalized = PurePosixPath(raw.replace("\\", "/"))
    if normalized.is_absolute() or ".." in normalized.parts:
        raise ValueError(
            f"{label.capitalize()} deve permanecer dentro da raiz do projeto"
        )
    return Path(*normalized.parts)


def project_path(value: str | PathLike[str], *, label: str = "caminho") -> Path:
    """Converte um caminho externo relativo em localização interna de I/O."""
    return PROJECT_ROOT / relative_path(value, label=label)


def relative_file_name(value: str | PathLike[str], *, label: str = "arquivo") -> str:
    """Valida um nome de arquivo, sem aceitar componentes de diretório."""
    path = relative_path(value, label=label)
    if len(path.parts) != 1 or path.name in {".", ""}:
        raise ValueError(f"{label.capitalize()} deve conter somente o nome do arquivo")
    return path.name


def project_relative(value: Path) -> str:
    """Retorna uma localização de I/O no formato público relativo e portátil."""
    try:
        relative = value.relative_to(PROJECT_ROOT)
    except ValueError as exc:
        raise ValueError("Caminho fora da raiz do projeto") from exc
    return relative.as_posix()
