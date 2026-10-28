"""Comunicação das páginas efetivamente servidas, sem processamento ou banco."""
import re

import pytest
from fastapi.testclient import TestClient

from api.server import app


@pytest.mark.parametrize(("fase", "raiz", "titulo", "prefixo"), [
    (1, "cinco-resultados_elegibilidade_v2", "Resultados da Elegibilidade Territorial", "ev2"),
    (2, "ev-resultados", "Resultados da Favorabilidade Territorial", "ev-resultados"),
])
def test_paginas_atuais_com_cinco_secoes_e_resultados_acessiveis(fase, raiz, titulo, prefixo):
    resposta = TestClient(app).get(f"/restrict/hierarquizacao/fase-{fase}/")
    assert resposta.status_code == 200
    html = resposta.text
    assert re.findall(r'<span class="(?:ahp-subsection-num|ea-number)">(\d)</span>', html) == list("12345")
    assert f'id="{raiz}"' in html and f">{titulo}</h2>" in html
    resultados = html.split(f'id="{raiz}"', 1)[1]
    for numero in ("5.1", "5.2", "5.3", "5.4"):
        assert f"{numero} —" in resultados
    assert "Consulte os resultados de uma análise" in resultados
    assert "GeoPackage" in resultados and "SHA-256" in resultados
    assert f'id="{prefixo}-status" class="ea-hint" role="status" aria-live="polite"' in resultados
    assert f'id="{prefixo}-download" type="button" disabled' in resultados
    for controle in ("abrir", "tentar", "aliases", "revisados", "mostrar", "conteudo", "entrada"):
        assert f'id="{prefixo}-{controle}"' in resultados
    ids = re.findall(r'\bid="([^"]+)"', html)
    assert len(ids) == len(set(ids))
    assert html.count("<iframe ") == 1
    assert 'src="/restrict/geoespacial/bancada/"' in html
    if fase == 1:
        assert "não constitui critério multicritério" in resultados
        assert "Demandas com restrição não constam desta tabela" in resultados
        assert "não executa a fase seguinte" in resultados
        for texto in ("preservam a precisão numérica", "contato sem área permanece zero",
                      "Editar as tabelas não atualiza o SICARD", "PDF, camadas, tabelas e guia"):
            assert texto in resultados
    else:
        assert "Zero válido é mantido" in resultados
        assert "Campo ausente, valor nulo e índice inválido" in resultados
        assert "Nenhum desses arquivos reproduz as estatísticas exploratórias" in resultados
        for texto in ("Excel e CSV", "duas casas decimais", "as tabelas preservam a precisão",
                      "Editar as tabelas não atualiza o SICARD", "preservando o pacote original"):
            assert texto in resultados
        assert "Fase 3" in resultados
