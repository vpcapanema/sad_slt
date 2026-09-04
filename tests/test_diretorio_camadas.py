"""O inventário de camadas reconhece o que está registrado e não inventa categoria.

Dois defeitos que se somavam na página de insumos geoespaciais:

1. o cruzamento arquivo↔registro usava só `arquivo_original` (a PASTA do
   pacote), enquanto a varredura lista também o dataset de dentro dela — com
   `caminho_arquivo` vazio no catálogo, tudo aparecia como não registrado;
2. a varredura ainda percorria `geodatabase`, categoria que deixou de existir
   quando `.gpkg` passou a ser classificado como vetor pelas duas portas.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from api.path_policy import GEO_OUTPUT_CATEGORIES

RAIZ = Path("data/geoespacial/uploads/datastorage")


def test_categorias_varridas_sao_as_canonicas():
    """A varredura segue path_policy — não uma lista própria que envelhece."""
    fonte = Path("api/routers/geoespacial.py").read_text(encoding="utf-8")
    assert 'for category in GEO_OUTPUT_CATEGORIES:' in fonte
    assert '("vetor", "raster", "geodatabase")' not in fonte
    assert "geodatabase" not in GEO_OUTPUT_CATEGORIES


def test_cruzamento_considera_os_dois_campos_de_caminho():
    fonte = Path("api/routers/geoespacial.py").read_text(encoding="utf-8")
    assert "def caminhos_do_registro" in fonte
    trecho = fonte.split("def caminhos_do_registro")[1][:900]
    for campo in ("caminho_arquivo", "arquivo_original"):
        assert campo in trecho, f"o cruzamento deve considerar {campo}"


def test_pasta_do_pacote_casa_com_o_registro_do_dataset():
    """O dataset mora dentro de `…zip.contents/`; a pasta tem de casar também."""
    fonte = Path("api/routers/geoespacial.py").read_text(encoding="utf-8")
    assert '".contents/" in caminho' in fonte


@pytest.mark.skipif(not RAIZ.exists(), reason="acervo ausente neste ambiente")
def test_acervo_nao_tem_categoria_morta():
    presentes = {
        item.name for item in RAIZ.iterdir()
        if item.is_dir() and not item.name.startswith(".")
    }
    invalidas = presentes - set(GEO_OUTPUT_CATEGORIES)
    assert not invalidas, (
        "categoria fora da política de caminhos — arquivo ali fica invisível "
        f"para toda varredura: {sorted(invalidas)}"
    )


def test_script_de_layout_legado_foi_removido():
    """Ele normalizava arquivos soltos na raiz da categoria, hoje proibidos."""
    assert not Path("scripts/normalizar_camadas_existentes.py").exists()
