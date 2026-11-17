"""Exemplo didático da Fase 3; nenhuma rodada ou dado oficial é consultado."""
from api.schemas.hierarquizacao import HierarquizacaoFase3ExecutarSchema
from api.services.hierarquizacao_service import _normalizar

CRITERIOS_EXEMPLO = (
    {"nome_coluna": "prazo", "criterio": "Prazo", "tipo_dado": "numerico", "direcao": "menor_melhor", "peso": .4},
    {"nome_coluna": "atendimento", "criterio": "Atendimento", "tipo_dado": "numerico", "direcao": "maior_melhor", "peso": .3},
    {"nome_coluna": "maturidade", "criterio": "Maturidade", "tipo_dado": "ordinal", "direcao": "maior_melhor", "peso": .3,
     "mapeamento": {"1": 1, "2": 2, "3": 3}},
)
VALORES_EXEMPLO = (
    {"nome": "Exemplo A", "prazo": 12, "atendimento": 80, "maturidade": 1, "rede": .6, "territorio": .7},
    {"nome": "Exemplo B", "prazo": 24, "atendimento": 60, "maturidade": 3, "rede": .8, "territorio": .5},
    {"nome": "Exemplo C", "prazo": 18, "atendimento": 100, "maturidade": 2, "rede": .4, "territorio": .9},
)


def montar_contexto():
    normalizados = [_normalizar([linha[c['nome_coluna']] for linha in VALORES_EXEMPLO], c)[0]
                    for c in CRITERIOS_EXEMPLO]
    exemplos = []
    for i, dados in enumerate(VALORES_EXEMPLO):
        valores = [coluna[str(i)] for coluna in normalizados]
        contribuicoes = [n * c['peso'] for n, c in zip(valores, CRITERIOS_EXEMPLO)]
        prioridade = sum(contribuicoes)
        exemplos.append({**dados, 'normalizados': valores, 'contribuicoes': contribuicoes, 'prioridade': prioridade,
                         'simples': (dados['rede'] + dados['territorio'] + prioridade) / 3,
                         'ponderada': dados['rede'] * .5 + dados['territorio'] * .2 + prioridade * .3})
    for campo in ('prioridade', 'simples', 'ponderada'):
        for posicao, exemplo in enumerate(sorted(exemplos, key=lambda e: e[campo], reverse=True), 1):
            exemplo['posicao_' + campo] = posicao
    return {'exemplos': exemplos, 'criterios_exemplo': CRITERIOS_EXEMPLO,
            'completude_inicial': int(HierarquizacaoFase3ExecutarSchema(criterios=[]).completude_minima * 100)}
