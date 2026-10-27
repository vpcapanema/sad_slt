from __future__ import annotations

import re
from pathlib import Path

from fastapi.testclient import TestClient

from api.server import app

RAIZ = Path(__file__).resolve().parents[1]
PAGINA = "/restrict/analise-multicriterio/mesa-consolidacao"


def test_mesa_consolidacao_renderiza_e_referencia_assets_existentes() -> None:
    resposta = TestClient(app).get(PAGINA)
    assert resposta.status_code == 200
    html = resposta.text
    for elemento in ("mesa-tabela-julgamentos", "mesa-barra", "mesa-tabela-respostas", "mesa-tabela-pesos",
                     "mesa-tabela-pares", "mesa-tabela-matriz", "mesa-tabela-analises", "mesa-salvar"):
        assert f'id="{elemento}"' in html, elemento
    assert "mesa-consolidacao-demo.js" not in html
    for caminho in re.findall(r'(?:href|src)="(/assets/[^"?]+)', html):
        assert (RAIZ / caminho.lstrip("/")).is_file(), caminho


def test_mesa_consolidacao_demo_so_carrega_com_o_parametro() -> None:
    resposta = TestClient(app).get(PAGINA, params={"demo": "1"})
    assert resposta.status_code == 200
    assert "mesa-consolidacao-demo.js" in resposta.text


def test_central_de_respostas_atual_continua_servida_sem_alteracao() -> None:
    resposta = TestClient(app).get("/restrict/analise-multicriterio/central-respostas")
    assert resposta.status_code == 200
    assert "analise-multicriterio-julgamentos.js" in resposta.text
    assert "mesa-consolidacao" not in resposta.text
