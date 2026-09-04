"""Cruza as chamadas HTTP do frontend com as rotas realmente registradas.

O frontend não tem build step: uma URL escrita à mão em um cliente JS só falha
em runtime, na página do usuário. Este teste fecha essa lacuna comparando cada
literal ``/api/...`` dos arquivos JS com o contrato publicado no OpenAPI.
"""
from __future__ import annotations

import re
from pathlib import Path

from fastapi.testclient import TestClient

from api.server import app

JS_ROOTS = (
    Path("assets/js"),
    Path("ahp/js"),
    Path("hierarquizacao/js"),
    Path("geoespacial"),
    Path("admin"),
    Path("cadastro"),
    Path("painel"),
)

# Literal /api/... até o primeiro caractere que encerra a string ou inicia
# uma query string.
API_LITERAL = re.compile(r"""['"`](/api/[^'"`\s?]*)""")

# `${...}` vira um segmento livre; o mesmo curinga usado para `{param}`.
TEMPLATE_SLOT = re.compile(r"\$\{[^}]*\}?")
PATH_PARAM = re.compile(r"\{[^}]+\}")


def _registered_paths() -> set[str]:
    paths = TestClient(app).get("/openapi.json").json()["paths"]
    return {PATH_PARAM.sub("*", path).rstrip("/") for path in paths if path.startswith("/api")}


def _js_files() -> list[Path]:
    return sorted(path for root in JS_ROOTS for path in root.rglob("*.js"))


def _called_paths() -> dict[str, set[str]]:
    chamadas: dict[str, set[str]] = {}
    for path in _js_files():
        for bruto in API_LITERAL.findall(path.read_text(encoding="utf-8")):
            url = TEMPLATE_SLOT.sub("*", bruto).rstrip("*").rstrip("/")
            if url:
                chamadas.setdefault(url, set()).add(path.as_posix())
    return chamadas


def _prefixo_de(url: str, rota: str) -> bool:
    """A chamada monta o restante do caminho dinamicamente, segmento a segmento."""
    segmentos_url = url.split("/")
    segmentos_rota = rota.split("/")
    if len(segmentos_url) >= len(segmentos_rota):
        return False
    return all(
        rota_seg in ("*", url_seg)
        for url_seg, rota_seg in zip(segmentos_url, segmentos_rota)
    )


def _atendida(url: str, registradas: set[str]) -> bool:
    for rota in registradas:
        if re.fullmatch(re.escape(rota).replace(r"\*", "[^/]+"), url):
            return True
        if _prefixo_de(url, rota):
            return True
    return False


def test_frontend_only_calls_registered_api_routes() -> None:
    registradas = _registered_paths()
    assert registradas, "OpenAPI não expôs nenhuma rota /api"

    orfas = {
        url: sorted(arquivos)
        for url, arquivos in _called_paths().items()
        if not _atendida(url, registradas)
    }
    assert not orfas, f"URLs sem rota correspondente: {orfas}"


# Espelha os mounts declarados em api/server.py, na mesma ordem de precedência
# (o mais específico primeiro).
MOUNTS = (
    ("/public/assets", "assets"),
    ("/public/cadastro", "cadastro"),
    ("/public/painel", "painel"),
    ("/public/documentacao", "documentacao"),
    ("/public/transparencia", "transparencia"),
    ("/restrict/assets", "assets"),
    ("/restrict/hierarquizacao", "hierarquizacao"),
    ("/restrict/ahp", "ahp"),
    ("/restrict/geoespacial", "geoespacial"),
    ("/assets", "assets"),
    ("/data", "data"),
    ("/restrict", "admin"),
)

# Arquivos servidos por rota dedicada em api/server.py, fora dos mounts.
ROTAS_DEDICADAS = (
    "assets/js/navbar.js",
    "assets/js/admin-api.js",
    "admin/login.js",
)

ASSET_ROOTS = (
    Path("assets/js"),
    Path("assets/css"),
    Path("ahp"),
    Path("hierarquizacao"),
    Path("geoespacial"),
    Path("admin"),
    Path("cadastro"),
    Path("painel"),
)

CSS_IMPORT = re.compile(r"""@import\s+url\(["']?([^"')]+)""")


def _para_disco(url: str) -> Path | None:
    limpa = url.split("?")[0].split("#")[0]
    if not Path(limpa).suffix:
        return None  # É uma rota de página, não um arquivo estático.
    for prefixo, diretorio in MOUNTS:
        if limpa.startswith(f"{prefixo}/"):
            return Path(diretorio) / limpa[len(prefixo) + 1 :]
    return None


def _referencias_dos_templates() -> dict[str, list[str]]:
    referencias: dict[str, list[str]] = {}
    for template in sorted(Path("templates").rglob("*.html")):
        conteudo = template.read_text(encoding="utf-8")
        for url in re.findall(r'(?:src|href)="(/[^"]+)"', conteudo):
            referencias.setdefault(url, []).append(template.as_posix())
    return referencias


def test_static_assets_referenced_by_templates_exist() -> None:
    """Cada src/href de módulo servido por mount precisa existir em disco."""
    ausentes = {
        url: templates
        for url, templates in _referencias_dos_templates().items()
        if (destino := _para_disco(url)) is not None and not destino.is_file()
    }
    assert not ausentes, f"Referências estáticas quebradas: {ausentes}"


def test_no_orphan_stylesheets_or_scripts() -> None:
    """Impede que JS/CSS sem consumidor volte a se acumular nos módulos.

    Um arquivo é alcançável quando algum template o referencia, quando uma rota
    dedicada o serve, ou quando um CSS alcançável o traz por ``@import``. Ao
    remover a última referência de um arquivo, remova também o arquivo.
    """
    alcancaveis: set[str] = set()
    fila = [
        destino.as_posix()
        for url in _referencias_dos_templates()
        if (destino := _para_disco(url)) is not None
    ]
    fila.extend(ROTAS_DEDICADAS)

    while fila:
        atual = Path(fila.pop())
        if atual.as_posix() in alcancaveis:
            continue
        alcancaveis.add(atual.as_posix())
        if atual.suffix == ".css" and atual.is_file():
            conteudo = atual.read_text(encoding="utf-8")
            fila.extend((atual.parent / imp).as_posix() for imp in CSS_IMPORT.findall(conteudo))

    orfaos = sorted(
        caminho.as_posix()
        for raiz in ASSET_ROOTS
        for caminho in raiz.rglob("*")
        if caminho.suffix in {".js", ".css"}
        and "vendor" not in caminho.parts
        and caminho.as_posix() not in alcancaveis
    )
    assert not orfaos, f"JS/CSS sem consumidor: {orfaos}"
