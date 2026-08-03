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

# Destino único, canônico, para toda saída geoprocessada.
GEO_OUTPUTS_DIR = "data/geoespacial/outputs"

# Categorias reconhecidas dentro do destino único; cada uma vira uma subpasta.
GEO_OUTPUT_CATEGORIES: tuple[str, ...] = ("vetor", "raster", "geodatabase")

# Extensão canônica -> categoria. Fonte da verdade para roteamento e validação.
_EXTENSION_TO_CATEGORY: dict[str, str] = {
    # vetor
    ".gpkg": "vetor",
    ".geojson": "vetor",
    ".json": "vetor",
    ".shp": "vetor",
    ".kml": "vetor",
    ".fgb": "vetor",
    # raster
    ".tif": "raster",
    ".tiff": "raster",
    ".geotiff": "raster",
    ".img": "raster",
    # geodatabase (containers)
    ".gdb": "geodatabase",
    ".gpkg.gdb": "geodatabase",
}


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


def geo_outputs_dir() -> Path:
    """Diretório absoluto onde toda saída geoprocessada deve ser gravada."""
    caminho = PROJECT_ROOT / GEO_OUTPUTS_DIR
    caminho.mkdir(parents=True, exist_ok=True)
    for categoria in GEO_OUTPUT_CATEGORIES:
        (caminho / categoria).mkdir(parents=True, exist_ok=True)
    return caminho


def categoria_por_extensao(nome_arquivo: str) -> str:
    """Retorna a categoria canônica (`vetor`/`raster`/`geodatabase`) para a extensão."""
    nome = str(nome_arquivo).strip().lower()
    if not nome:
        raise ValueError("Nome de arquivo vazio para classificação")
    # Casa primeiro sufixo composto (ex.: .gpkg.gdb) para não colidir com .gpkg.
    for extensao, categoria in _EXTENSION_TO_CATEGORY.items():
        if extensao.count(".") > 1 and nome.endswith(extensao):
            return categoria
    ext = Path(nome).suffix
    categoria = _EXTENSION_TO_CATEGORY.get(ext)
    if categoria is None:
        aceitas = ", ".join(sorted(_EXTENSION_TO_CATEGORY))
        raise ValueError(
            f"Extensão '{ext or '(sem extensão)'}' não reconhecida; "
            f"formatos aceitos: {aceitas}"
        )
    return categoria


def validar_categoria_compativel(nome_arquivo: str, categoria_dado: str) -> str:
    """Aborta se a extensão do arquivo não corresponder à categoria do dado.

    ``categoria_dado`` é ``'vetor'``, ``'raster'`` ou ``'geodatabase'`` — sempre
    determinada a partir da natureza do recurso em memória, não do que o cliente
    solicitou. Retorna a categoria (sempre igual à derivada da extensão) para
    uso subsequente no roteamento.
    """
    categoria_arquivo = categoria_por_extensao(nome_arquivo)
    if categoria_dado not in GEO_OUTPUT_CATEGORIES:
        raise ValueError(
            f"Categoria de dado '{categoria_dado}' inválida; "
            f"esperado: {', '.join(GEO_OUTPUT_CATEGORIES)}"
        )
    if categoria_arquivo != categoria_dado:
        raise ValueError(
            f"Formato de saída '{Path(nome_arquivo).suffix}' pertence à "
            f"categoria '{categoria_arquivo}', mas o dado é '{categoria_dado}'. "
            "Corrija a extensão do arquivo ou a categoria antes de salvar."
        )
    return categoria_arquivo


def geo_output_path(
    nome_arquivo: str,
    *,
    categoria: str | None = None,
    label: str = "arquivo",
) -> Path:
    """Resolve o caminho de saída dentro da subpasta correta do destino único.

    Se ``categoria`` for informada, valida contra a extensão (raise em conflito).
    Se omitida, a subpasta é inferida da extensão.
    """
    nome = relative_file_name(nome_arquivo, label=label)
    if categoria is None:
        categoria_final = categoria_por_extensao(nome)
    else:
        categoria_final = validar_categoria_compativel(nome, categoria)
    return geo_outputs_dir() / categoria_final / nome
