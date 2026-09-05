"""Modo de edição de atributos na Bancada — lado do front-end.

Trava o botão de editar por camada, a tabela virando editável, e o par
salvar/descartar — sem reconstruir o painel inteiro a cada tecla (mesma lição
do debounce da simbologia: o campo usa `onchange`, não `oninput`).
"""
from __future__ import annotations

from pathlib import Path

JS = Path("geoespacial/geoprocessamento.js").read_text(encoding="utf-8")
CSS = Path("assets/css/geoprocessamento.css").read_text(encoding="utf-8")


def test_botao_de_editar_existe_na_arvore_de_camadas():
    assert 'data-edit-layer="${layer.id}"' in JS
    assert "toggleLayerEditing(editBtn.dataset.editLayer)" in JS


def test_toggle_liga_desliga_e_recusa_camada_homologada():
    corpo = JS.split("async function toggleLayerEditing(layerId){", 1)[1].split("\n  }", 1)[0]
    assert "state.editingLayers.delete(layerId)" in corpo
    assert "state.editingLayers.add(layerId)" in corpo
    assert "body.homologada" in corpo
    assert "somente leitura" in corpo


def test_linha_sem_indice_ou_valor_complexo_fica_somente_leitura():
    """Seleção ainda não presente na página buscada não tem `_indice`; valor
    complexo (dict/lista) não pode virar texto livre sem risco de corromper."""
    corpo = JS.split("const celula=(row,column)=>{", 1)[1].split("\n    };", 1)[0]
    assert "row._indice!=null" in corpo
    assert 'typeof row[column]!=="object"' in corpo


def test_edicao_usa_onchange_nao_oninput():
    """onchange só dispara ao confirmar (blur/Enter) — oninput dispararia a
    cada tecla, reconstruindo estado a cada caractere digitado."""
    assert "$$('[data-edit-row]').forEach(input=>input.onchange=" in JS
    assert "$$('[data-edit-row]').forEach(input=>input.oninput=" not in JS


def test_salvar_e_descartar_estao_ligados_ao_endpoint_correto():
    assert "salvarEdicoesDeAtributo" in JS
    assert "descartarEdicoesDeAtributo" in JS
    corpo = JS.split("async function salvarEdicoesDeAtributo(layerId){", 1)[1].split("\n  }", 1)[0]
    assert "/camadas/${layerId}/atributos/salvar" in corpo
    assert "gravado_em_arquivo" in corpo


def test_desligar_edicao_descarta_pendencias_sem_perguntar():
    """Mesma UX simples do Cancelar da simbologia: some sem confirmação."""
    corpo = JS.split("async function toggleLayerEditing(layerId){", 1)[1].split("\n  }", 1)[0]
    assert "delete state.attributeEdits[layerId]" in corpo


def test_pencil_tem_estilo_de_ligado_desligado():
    assert ".layer-edit.active{color:" in CSS
    assert ".attribute-cell-editavel input{" in CSS
