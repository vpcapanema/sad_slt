from contextlib import nullcontext
from copy import deepcopy

import pytest

from api.services import registro_fases_geoespaciais as service
from api.services import agregacao_favorabilidade


@pytest.fixture(params=['elegibilidade', 'favorabilidade'])
def contexto(request, monkeypatch):
    analise = request.param
    row = {'codigo': 'H', 'status': 'em_julgamento', 'dados_hierarquizacao': {
        'cabecalho_grupo': {'fases_a_executar': [1, 2]},
        'objetos': [{'cabecalho_objeto': {'codigo': 'D1'}}]}}
    resultados = [{'arquivo': 'resultado.gpkg', 'sha256': 'abc', 'total_entradas': 1,
                   analise: {'hierarquizacao': 'H'}}]
    chamadas = []
    monkeypatch.setattr(service, 'atomic_connection', nullcontext)
    monkeypatch.setattr(service.hier.repo, 'get_by_codigo', lambda *a, **k: deepcopy(row))
    monkeypatch.setattr(service.hier.repo, 'update', lambda c, d: row.update(deepcopy(d)))
    monkeypatch.setattr(service.relatorios, '_selecionar', lambda ids, dono, **k: resultados)
    monkeypatch.setattr(service.relatorios, 'resumo_por_demanda', lambda *a, **k: [{'codigo_demanda': 'D1', 'sobreposicoes': []}])
    monkeypatch.setattr(agregacao_favorabilidade, 'carregar', lambda *a: {'medida': 'media', 'percentil': None})
    monkeypatch.setattr(service.relatorios, 'montar', lambda *a, **k: ({}, []))
    monkeypatch.setattr(service.relatorios, 'registrar_relatorios', lambda *a, **k: None)
    monkeypatch.setattr(service.hier, 'registrar_resultado_por_demanda',
                        lambda *a, **k: chamadas.append((a, k)) or {'registrado': True})
    monkeypatch.setattr(service.hier, 'registrar_saida_geoespacial', lambda *a: chamadas.append(a))
    monkeypatch.setattr(service.hier, 'atualizar_nomes_resultado', lambda *a: chamadas.append(a))
    def registrar(**kw):
        return service.registrar(['job'], 'autor', analise=analise, nomes={}, revisados=True,
                                 agregacao={'medida': 'media', 'percentil': None}, **kw)
    return registrar, row, resultados, chamadas


def test_previa_nao_grava_confirmacao_grava_uma_vez(contexto):
    registrar, row, _, chamadas = contexto
    previa = registrar()
    assert not previa['registrado'] and not chamadas
    assert registrar(versao=previa['versao'])['registrado']
    assert len(chamadas) == 3
    assert registrar(versao=previa['versao'])['ja_registrado']
    assert len(chamadas) == 3


def test_rejeita_alteracao_apos_confirmacao(contexto):
    registrar, row, _, chamadas = contexto
    previa = registrar()
    row['nome'] = 'Alterada por outro usuário'
    with pytest.raises(ValueError, match='foi alterada'):
        registrar(versao=previa['versao'])
    assert not chamadas


@pytest.mark.parametrize('alteracao', ['homologada', 'demanda', 'parcial', 'desvinculada'])
def test_recusa_saida_inadequada_sem_gravar(contexto, alteracao):
    registrar, row, resultados, chamadas = contexto
    if alteracao == 'homologada':
        row['status'] = 'homologada'
    elif alteracao == 'demanda':
        row['dados_hierarquizacao']['objetos'].append({'cabecalho_objeto': {'codigo': 'D2'}})
    elif alteracao == 'parcial':
        resultados[0]['total_entradas'] = 2
    else:
        for chave in ('elegibilidade', 'favorabilidade'):
            if chave in resultados[0]:
                resultados[0][chave]['hierarquizacao'] = None
    with pytest.raises(ValueError):
        registrar()
    assert not chamadas


def test_saida_corrompida_nao_grava(contexto, monkeypatch):
    registrar, _, _, chamadas = contexto
    def falhar(*a, **k):
        raise ValueError('Assinatura divergente')
    monkeypatch.setattr(service.relatorios, 'resumo_por_demanda', falhar)
    with pytest.raises(ValueError, match='Assinatura'):
        registrar()
    assert not chamadas


def test_fase2_exige_medida_salva(contexto, monkeypatch):
    registrar, _, resultados, chamadas = contexto
    if 'favorabilidade' not in resultados[0]:
        return
    monkeypatch.setattr(agregacao_favorabilidade, 'carregar', lambda *a: None)
    with pytest.raises(ValueError, match='salve a medida'):
        registrar()
    assert not chamadas
