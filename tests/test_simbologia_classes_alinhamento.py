"""Painel de simbologia — cabeçalho e alinhamento da grade de classes.

Sem cabeçalho, o usuário via cor/intervalo/rótulo lado a lado sem saber o que
cada coluna significa. E sem largura fixa nas células do intervalo, uma linha
com "0" e outra com "82.895,2" deslocavam o resto da linha, então nada
alinhava verticalmente entre as classes.
"""
from __future__ import annotations

from pathlib import Path

JS = Path("geoespacial/geoprocessamento.js").read_text(encoding="utf-8")
CSS = Path("assets/css/geoprocessamento.css").read_text(encoding="utf-8")


def _corpo(nome_funcao: str) -> str:
    return JS.split(f"function {nome_funcao}(layerId){{", 1)[1].split("\n  }", 1)[0]


def test_graduado_tem_cabecalho_explicando_cor_intervalo_e_rotulo():
    corpo = _corpo("renderGraduatedBody")
    assert "sym-class-header" in corpo
    assert ">Cor<" in corpo
    assert ">De<" in corpo
    assert "Até" in corpo
    assert "Rótulo" in corpo


def test_categorizado_tem_cabecalho_explicando_cor_rotulo_e_contagem():
    corpo = _corpo("renderCategorizedBody")
    assert "sym-class-header" in corpo
    assert ">Cor<" in corpo
    assert "Rótulo" in corpo
    assert "Feições" in corpo


def test_linhas_de_classe_tem_modificador_por_tipo():
    """Cor/intervalo/rótulo (graduado) e cor/rótulo/contagem (categorizado) têm
    formas diferentes — precisam de classes CSS distintas para alinhar cada
    uma com o próprio layout, não um layout genérico só."""
    assert "sym-class-row sym-class-row--grad" in _corpo("renderGraduatedBody")
    assert "sym-class-row sym-class-row--cat" in _corpo("renderCategorizedBody")


def test_celulas_do_intervalo_tem_largura_fixa():
    bloco = CSS.split(".sym-class-range{", 1)[1]
    assert "flex:0 0 auto;width:158px" in CSS.split(".sym-class-range{", 1)[1][:80]
    assert ".sym-class-range>:nth-child(1){flex:0 0 56px" in CSS
    assert ".sym-class-range>:nth-child(3){flex:0 0 82px" in CSS


def test_cabecalho_reusa_as_mesmas_larguras_da_linha_de_dados():
    """O cabeçalho não duplica a lógica de coluna — herda das mesmas classes
    (.sym-class-row--grad/--cat) que a linha de dados usa, então não pode
    haver seletor de largura fixa isolado só para o cabeçalho que divirja."""
    assert "sym-class-header.sym-class-row--grad" in CSS
    assert "sym-class-header.sym-class-row--cat" in CSS
