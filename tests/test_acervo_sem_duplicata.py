"""Toda camada mora numa pasta de grupo; nenhuma solta na raiz da categoria.

Sem essa regra o acervo acumulou a MESMA camada em dois lugares — solta em
`vetor/` e dentro de `vetor/<GRUPO>/`. Doze delas eram idênticas byte a byte, e
nada no sistema apontava a duplicação: o casamento entre registro e arquivo caía
em ambiguidade, e escolher "a camada certa" virava adivinhação por nome.
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from api.services import geospatial_upload_storage as storage

BASE = Path("data/geoespacial/uploads/datastorage")
CATEGORIAS = ("vetor", "raster")


def test_pasta_ausente_cai_numa_pasta_visivel():
    assert storage.pasta_segura(None) == storage.PASTA_PADRAO
    assert storage.pasta_segura("   ") == storage.PASTA_PADRAO
    assert storage.pasta_segura("RESTRIÇÃO") == "RESTRIÇÃO"


def test_pasta_nunca_e_vazia():
    """Devolver None colocaria a camada na raiz da categoria — a origem do problema."""
    for entrada in (None, "", "  ", "RISCO"):
        assert storage.pasta_segura(entrada), f"pasta vazia para {entrada!r}"


@pytest.mark.parametrize("travessia", ["..", ".", "a/b", "a\\b"])
def test_pasta_recusa_travessia(travessia):
    with pytest.raises(ValueError, match="inválido"):
        storage.pasta_segura(travessia)


def test_upload_publica_dentro_de_uma_pasta(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "project_path", lambda valor, **_: tmp_path / valor)
    conteudo = b"GeoPackage fixture"
    resultado = storage.store_upload("camada.gpkg", conteudo)
    assert resultado.original_path.parent.name == storage.PASTA_PADRAO, (
        "sem pasta escolhida a camada vai para a pasta padrão, nunca para a raiz"
    )


@pytest.mark.skipif(not BASE.exists(), reason="acervo ausente neste ambiente")
def test_acervo_nao_tem_camada_solta_na_raiz():
    soltas = []
    for categoria in CATEGORIAS:
        pasta = BASE / categoria
        if not pasta.is_dir():
            continue
        for item in sorted(os.listdir(pasta)):
            caminho = pasta / item
            if caminho.is_dir() and item.endswith(".contents"):
                soltas.append(f"{categoria}/{item}")
    assert not soltas, (
        "camada solta na raiz da categoria — mova para uma pasta: "
        + "; ".join(soltas)
    )


def test_upload_respeita_a_pasta_escolhida(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "project_path", lambda valor, **_: tmp_path / valor)
    preparado = storage.prepare_upload("camada.gpkg", b"GeoPackage fixture")
    resultado = storage.commit_prepared(preparado, "MINHA PASTA")
    assert resultado.original_path.parent.name == "MINHA PASTA"


def test_interface_permite_escolher_ou_criar_pasta():
    """O campo é <input list>: sugere as existentes sem impedir um nome novo."""
    pagina = Path("templates/paginas/geoespacial/visualizador-inputs.html").read_text(
        encoding="utf-8"
    )
    assert 'id="import-pasta"' in pagina
    assert 'list="import-pastas-existentes"' in pagina
    assert "<datalist id=\"import-pastas-existentes\">" in pagina

    script = Path("geoespacial/geoespacial-visualizador-inputs.js").read_text(
        encoding="utf-8"
    )
    assert 'data.append("pasta", pasta)' in script, "a pasta escolhida deve ser enviada"
    assert "preencherPastasExistentes" in script


def test_backend_nomeia_o_conceito_como_pasta():
    """`grupo` era ambíguo: o mesmo termo nomeia o grupo da UC no SNUC."""
    import inspect

    assinatura = inspect.signature(storage.commit_prepared)
    assert "pasta" in assinatura.parameters
    assert "grupo" not in assinatura.parameters
