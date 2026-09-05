"""A legenda de graduado/categorizado mostra qual atributo está simbolizado.

Sem isso, a paleta de cores aparece no painel de camadas sem dizer de onde
vem — o usuário via as cores mas não o campo que elas representam.
"""
from __future__ import annotations

from pathlib import Path

JS = Path("geoespacial/geoprocessamento.js").read_text(encoding="utf-8")
CSS = Path("assets/css/geoprocessamento.css").read_text(encoding="utf-8")


def test_funcao_de_campo_da_legenda_existe():
    assert "function legendField(renderer)" in JS
    assert "renderer?.campo" in JS.split("function legendField", 1)[1][:200]


def test_categorizado_e_graduado_mostram_o_campo_antes_dos_itens():
    trecho = JS.split("function layerLegend(layer){", 1)[1].split("\n  }", 1)[0]
    for ramo in trecho.split('if(renderer?.tipo==="'):
        if ramo.startswith("categorizado") or ramo.startswith("graduado"):
            assert "legendField(renderer)}${items}" in ramo, (
                "o campo precisa vir antes dos itens da legenda: " + ramo[:120]
            )


def test_simbolo_unico_nao_ganha_rotulo_de_campo():
    """Símbolo único não tem `renderer.campo` — nada a mostrar ali."""
    trecho = JS.split("function layerLegend(layer){", 1)[1].split("\n  }", 1)[0]
    cauda = trecho.rsplit("return `<div class=\"layer-legend layer-legend--single\"", 1)[0]
    assert "legendField" not in trecho.rsplit("layer-legend--single", 1)[-1]


def test_estilo_do_rotulo_de_campo_existe():
    assert ".layer-legend-field{" in CSS
