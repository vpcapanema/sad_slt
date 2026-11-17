"""Documentação pública baseada no fluxo e no cálculo efetivos da Fase 3."""
from copy import deepcopy
from pathlib import Path
import re

import pytest
from fastapi.testclient import TestClient

from api.server import app
from api.schemas.hierarquizacao import HierarquizacaoFase3ExecutarSchema, HierarquizacaoSinteseSchema
from api.services import hierarquizacao_service as motor
from api.services.documentacao_priorizacao import CRITERIOS_EXEMPLO, VALORES_EXEMPLO, montar_contexto

ROTA = '/public/documentacao/priorizacao-atributos/'
ANTIGO = 'MODULO_FASE3_ATRIBUTOS_PROJETO_AJUSTE.md'


@pytest.mark.parametrize('prefixo', ['', '/sicard'])
def test_pagina_publica_completa_sem_markdown(prefixo):
    client = TestClient(app)
    resposta = client.get(ROTA, headers={'X-Forwarded-Prefix': prefixo} if prefixo else {})
    assert resposta.status_code == 200
    html = resposta.text
    assert 'text/html' in resposta.headers['content-type']
    assert 'data-navegacao="publica"' in html
    assert 'class="cabecalho-glossario standard-page-hero"' in html
    assert html.count('class="secao-priorizacao glossario-grupo"') == 12
    assert html.count('<math ') == html.count('<math display="block" aria-label=') == 8
    assert html.count('class="priorizacao-figura"') == 3
    assert 'exemplos seguintes utilizam três objetos hipotéticos' in html
    assert 'não apresenta um seletor para redefinir o tratamento externo' in html
    assert 'a composição atual não produz índice geral' in html
    assert prefixo + '/assets/js/documentacao-tabelas.js' in html
    assert ANTIGO not in html
    conteudo = html.split('id="priorizacao-conteudo"', 1)[1].split('</main>', 1)[0]
    assert 3500 < len(re.sub('<[^>]+>', ' ', conteudo).split()) < 6500
    for arquivo in re.findall(r'(?:src|href)="(' + re.escape(prefixo) + r'/assets/images/documentacao/priorizacao-atributos/[^"]+)"', html):
        assert client.get(arquivo.removeprefix(prefixo)).status_code == 200


@pytest.mark.parametrize('raiz', ['/documentos/hierarquizacao/', '/public/documentacao/hierarquizacao/'])
def test_especificacao_antiga_removida(raiz):
    assert TestClient(app).get(raiz + ANTIGO).status_code == 404
    assert not Path('documentacao/hierarquizacao', ANTIGO).exists()


@pytest.mark.parametrize('raiz', ['/documentos/hierarquizacao/', '/public/documentacao/hierarquizacao/'])
def test_espinha_dorsal_encaminha_para_html(raiz):
    resposta = TestClient(app).get(raiz + 'ESPINHA_DORSAL_SISTEMA_HIERARQUIZACAO.md',
                                 headers={'X-Forwarded-Prefix': '/sicard'}, follow_redirects=False)
    assert resposta.status_code == 308
    assert resposta.headers['location'] == '/sicard/public/documentacao/processo-hierarquizacao/'


def test_cards_e_referencias_nao_apresentam_especificacao_retirada():
    for arquivo in ('documentacao/index.html','documentacao/visao-geral.html','documentacao/glossario.html','admin/index.html'):
        html = Path('templates/paginas', arquivo).read_text(encoding='utf-8')
        assert ANTIGO not in html
        assert 'Especificação da priorização' not in html
        assert ROTA in html


def test_exemplo_e_sintese_correspondem_ao_motor_real_sem_persistencia(monkeypatch):
    from tests.test_hierarquizacao_service import _db_row, _dados
    dados = _dados([1, 2, 3], [{c['nome_coluna']: e[c['nome_coluna']] for c in CRITERIOS_EXEMPLO}
                              for e in VALORES_EXEMPLO])
    row = _db_row(dados)
    monkeypatch.setattr(motor.repo, 'get_by_codigo', lambda _: deepcopy(row))
    monkeypatch.setattr(motor.repo, 'update', lambda *a, **kw: pytest.fail('Exemplo não pode gravar'))
    previa = motor.executar_fase_3('HIER-TESTE', HierarquizacaoFase3ExecutarSchema(
        criterios=list(CRITERIOS_EXEMPLO), fonte_pesos='manual', ponderacao='abrangente'), persistir=False)
    exemplos = montar_contexto()['exemplos']
    objetos = previa.dados_hierarquizacao['objetos']
    assert [o['hierarquizacao']['fase_3']['score_fase3'] for o in objetos] == pytest.approx([e['prioridade'] for e in exemplos])
    assert [e['prioridade'] for e in exemplos] == pytest.approx([.55, .30, .65])
    for obj, e in zip(objetos, exemplos):
        obj['hierarquizacao']['fase_2'].update(indice_favorabilidade_rede=e['rede'], indice_favorabilidade_grade=e['territorio'])
    row['dados_hierarquizacao'] = previa.dados_hierarquizacao
    for campo, payload in [('simples', HierarquizacaoSinteseSchema()),
        ('ponderada', HierarquizacaoSinteseSchema(operador='media_ponderada', peso_rede=.5, peso_grade=.2, peso_prioridade=.3))]:
        resultado = motor.sintetizar('HIER-TESTE', payload, persistir=False)
        sinteses = [o['hierarquizacao']['sintese'] for o in resultado.dados_hierarquizacao['objetos']]
        assert [s['score_final'] for s in sinteses] == pytest.approx([e[campo] for e in exemplos])
        assert [s['posicao_final'] for s in sinteses] == [e['posicao_' + campo] for e in exemplos]
