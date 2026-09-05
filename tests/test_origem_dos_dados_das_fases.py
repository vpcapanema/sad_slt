"""De onde cada página de hierarquização lê e para onde ela escreve.

A camada sobe pela página de cadastro/upload, é gravada no acervo
(`datastorage/<categoria>/<pasta>`) e a homologação a materializa em
`data/geoespacial/biblioteca_canonica/<modulo_consumidor>/`. É esse último
diretório que as Fases 1 e 2 leem — e o `modulo_consumidor` é o que decide em
qual das duas a camada aparece. Estes testes travam essa correspondência: foi
onde ela estava quebrada (a Fase 2 pedia `modulo=ambos`, que exclui as camadas
publicadas como `fase2`, e as duas páginas de upload publicavam em `fase1`).
"""
from __future__ import annotations

from pathlib import Path

from api.repositories.camada_geoespacial_repository import (
    _CANONICAL_ROOT,
    listar_biblioteca_canonica_arquivos,
)

FASE1_JS = Path("hierarquizacao/js/fases.js").read_text(encoding="utf-8")
FASE2_JS = Path("hierarquizacao/js/fase2.js").read_text(encoding="utf-8")
UPLOAD_HTML = Path("templates/paginas/hierarquizacao/cadastro-upload-camada.html").read_text(encoding="utf-8")
UPLOAD_JS = Path("assets/js/paginas/cadastro-upload-camada.js").read_text(encoding="utf-8")


def test_cada_fase_le_a_biblioteca_do_proprio_modulo():
    """O backend já devolve as camadas de "ambos" junto; pedir "ambos" filtra o resto fora."""
    assert "biblioteca-canonica/arquivos?modulo=fase1" in FASE1_JS
    assert "biblioteca-canonica/arquivos?modulo=fase2" in FASE2_JS
    assert "biblioteca-canonica/arquivos?modulo=ambos" not in FASE2_JS


def test_upload_publica_para_a_fase_da_propria_pagina():
    """As duas páginas usam o mesmo template: sem isto, ambas publicavam em fase1."""
    assert '<option value="fase1" {% if modulo == "fase1" %}selected{% endif %}>' in UPLOAD_HTML
    assert '<option value="fase2" {% if modulo == "fase2" %}selected{% endif %}>' in UPLOAD_HTML


def test_upload_separa_pasta_do_acervo_de_modulo_consumidor():
    """`pasta` organiza o arquivo bruto; `modulo_consumidor` decide a visibilidade na fase."""
    assert 'raiz.dataset.modulo === "fase1" ? "RESTRIÇÃO" : "FAVORABILIDADE"' in UPLOAD_JS
    assert 'dados.get("modulo_consumidor") || raiz.dataset.modulo' in UPLOAD_JS


def test_arquivo_sem_homologacao_nao_vira_opcao_selecionavel():
    corpo = FASE1_JS.split("function opcaoDaBiblioteca(camada, extra", 1)[1].split("\n  }", 1)[0]
    assert "if (!camada.id)" in corpo
    assert "disabled" in corpo
    assert "sem homologação registrada" in corpo


def test_biblioteca_canonica_e_o_diretorio_que_as_fases_leem():
    assert _CANONICAL_ROOT == "data/geoespacial/biblioteca_canonica"
    # Não depende de haver camada publicada: só garante que a listagem responde
    # a partir desse diretório sem estourar quando ele está vazio.
    assert isinstance(listar_biblioteca_canonica_arquivos("fase1"), list)
