from copy import deepcopy
from io import BytesIO

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pypdf import PdfReader

from api.services import relatorio_fase3_pdf as pdf


@pytest.fixture
def registro():
    return {'codigo': 'HIER-TESTE', 'nome': 'Rodada demonstrativa', 'dados_hierarquizacao': {
        'cabecalho_grupo': {
            'relatorios': {'fase_3': {'executada_em': '2026-10-28T00:00:00+00:00',
                                     'regra_ausentes': 'bloquear', 'completude_minima': .6}},
            'configuracoes': {'fase_3': {'fonte_pesos': 'manual', 'ponderacao': 'abrangente',
                'criterios': [{'criterio': 'Benefício', 'nome_coluna': 'beneficio',
                              'grupo_atributo': 'dinamico', 'peso': 1, 'unidade': 'número',
                              'tipo_dado': 'numerico', 'direcao': 'maior_melhor'}]}}},
        'objetos': [
            {'cabecalho_objeto': {'nome': 'Demanda A', 'codigo': 'D1'},
             'hierarquizacao': {'fase_3': {'executada': True, 'score_fase3': 0,
                 'ranking_fase3': 1, 'grau_completude_fase3': 1, 'pesos_fase3': {'Benefício': 1},
                 'contribuicao_por_criterio': {'Benefício': 0}, 'score_fase3_antes_risco': 0,
                 'fator_penalizacao_risco': 1}}},
            {'cabecalho_objeto': {'nome': 'Demanda B', 'codigo': 'D2'},
             'hierarquizacao': {'fase_3': {'executada': True, 'score_fase3': None,
                 'grau_completude_fase3': 0, 'atributos_ausentes': ['beneficio'],
                 'bloqueada_por_atributo_obrigatorio': True}}},
        ]}}


def test_padrao_institucional_resultados_e_pendencias_sem_recalcular(registro):
    antes = deepcopy(registro)
    dados = pdf.documento(registro)
    leitor = PdfReader(BytesIO(dados))
    texto = ' '.join(' '.join(p.extract_text() for p in leitor.pages).split())
    assert pdf.TITULO in texto
    assert 'Subsecretaria de Logística e Transporte (SLT)' in texto
    assert texto.index('Sistema Inteligente') < texto.index('Relatório de Priorização')
    assert texto.index('2 — Resultados por demanda') < texto.index('4 — Critérios')
    assert '0,0000' in texto and 'Sem índice' in texto and '100,00%' in texto
    assert 'Atributo obrigatório ausente ou inválido' in texto and 'beneficio' in texto
    assert 'Benefício' in texto and 'Preenchimento manual' in texto
    assert 'numerico / maior_melhor / número' in texto
    assert registro == antes
    assert sum(len(p.images) for p in leitor.pages) == 1


@pytest.mark.parametrize('problema', ['sem_execucao', 'desatualizado', 'pendente', 'nao_calculado', 'sem_criterios', 'nan'])
def test_nao_emite_resultado_invalido_ou_desatualizado(registro, problema):
    dados = registro['dados_hierarquizacao']
    if problema == 'sem_execucao':
        dados['cabecalho_grupo']['relatorios'].clear()
    elif problema == 'desatualizado':
        dados['objetos'][0]['hierarquizacao']['fase_3']['desatualizado'] = True
    elif problema == 'pendente':
        dados['objetos'][0]['cabecalho_objeto']['complementacao_atributos'] = {'concluida': False}
    elif problema == 'nao_calculado':
        dados['objetos'][0]['hierarquizacao']['fase_3']['executada'] = False
    elif problema == 'sem_criterios':
        dados['cabecalho_grupo']['configuracoes']['fase_3']['criterios'] = []
    else:
        dados['objetos'][0]['hierarquizacao']['fase_3']['score_fase3'] = float('nan')
    with pytest.raises(ValueError):
        pdf.documento(registro)


def test_servico_bloqueia_criterios_alterados(monkeypatch, registro):
    from api.services import hierarquizacao_service as service
    monkeypatch.setattr(service, '_carregar', lambda _: registro)
    monkeypatch.setattr(service, 'configuracao_fase3_desatualizada', lambda _: True)
    with pytest.raises(ValueError, match='critérios'):
        service.relatorio_pdf_fase3('HIER-TESTE')
    monkeypatch.setattr(service, 'configuracao_fase3_desatualizada', lambda _: False)
    assert service.relatorio_pdf_fase3('HIER-TESTE').startswith(b'%PDF')


def test_rota_pdf_autenticada_e_erro_explicito(monkeypatch, registro):
    from api.deps.auth import require_authenticated
    from api.routers.hierarquizacoes import router
    from api.services import hierarquizacao_service as service
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_authenticated] = lambda: object()
    monkeypatch.setattr(service, 'relatorio_pdf_fase3', lambda _: pdf.documento(registro))
    client = TestClient(app)
    resposta = client.get('/ahp/hierarquizacoes/HIER-TESTE/fases/3/relatorio.pdf')
    assert resposta.status_code == 200 and resposta.content.startswith(b'%PDF')
    assert resposta.headers['content-type'] == 'application/pdf'
    assert resposta.headers['cache-control'] == 'no-store'
    def desatualizado(_):
        raise ValueError('Recalcule a Fase 3.')
    monkeypatch.setattr(service, 'relatorio_pdf_fase3', desatualizado)
    resposta = client.get('/ahp/hierarquizacoes/HIER-TESTE/fases/3/relatorio.pdf')
    assert resposta.status_code == 422 and 'Recalcule' in resposta.json()['detail']
    app.dependency_overrides.clear()
    assert client.get('/ahp/hierarquizacoes/HIER-TESTE/fases/3/relatorio.pdf').status_code in (401, 403)
