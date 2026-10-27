"""Medida escolhida para cada dimensão da Fase 2, salva antes do registro oficial."""
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
import json
import math

from api.services import elegibilidade_relatorio as relatorios, storage_remoto

MEDIDAS = {'media', 'mediana', 'moda', 'amplitude', 'variancia', 'desvio', 'cv', 'iqr',
           'minimo', 'q1', 'q2', 'q3', 'maximo', 'percentil'}


def configurar(medida, percentil=None):
    if medida not in MEDIDAS:
        raise ValueError('Escolha uma medida estatística para obter um valor único por demanda e dimensão.')
    if medida == 'percentil' and (not isinstance(percentil, (int, float)) or
                                not math.isfinite(percentil) or not 0 <= percentil <= 100):
        raise ValueError('Informe um percentil entre 0 e 100.')
    return {'medida': medida, 'percentil': percentil if medida == 'percentil' else None}


def calcular(valores, configuracao):
    config = configurar(**configuracao)
    if any(type(v) not in (float, int) or not math.isfinite(v) or not 0 <= v <= 1 for v in valores):
        raise ValueError('A agregação exige índices válidos entre 0 e 1.')
    if not valores:
        return None
    ordem = sorted(valores)
    def quantil(p):
        posicao = (len(ordem) - 1) * p
        inicio = math.floor(posicao)
        return ordem[inicio] + (ordem[min(inicio + 1, len(ordem) - 1)] - ordem[inicio]) * (posicao - inicio)
    media = sum(ordem) / len(ordem)
    variancia = sum((v - media) ** 2 for v in ordem) / len(ordem)
    medida = config['medida']
    if medida == 'moda':
        frequencias = Counter(ordem)
        maior = max(frequencias.values())
        modas = [v for v, n in frequencias.items() if n == maior]
        if len(modas) != 1:
            raise ValueError('A moda não fornece um valor único. Escolha outra medida e salve novamente.')
        return modas[0]
    if medida == 'cv':
        if media == 0:
            raise ValueError('O coeficiente de variação é indefinido quando a média é zero. Escolha outra medida.')
        return math.sqrt(variancia) / media * 100
    return {'media': lambda: media, 'mediana': lambda: quantil(.5), 'q2': lambda: quantil(.5),
            'amplitude': lambda: ordem[-1] - ordem[0], 'variancia': lambda: variancia,
            'desvio': lambda: math.sqrt(variancia), 'iqr': lambda: quantil(.75) - quantil(.25),
            'minimo': lambda: ordem[0], 'maximo': lambda: ordem[-1], 'q1': lambda: quantil(.25),
            'q3': lambda: quantil(.75), 'percentil': lambda: quantil(config['percentil'] / 100)}[medida]()


def valores_linha(linha, config):
    return {papel: calcular([s['favorabilidade']['indice'] for s in linha['sobreposicoes']
                            if s['papel'] == papel and s['favorabilidade']['estado_indice'] == 'valido'], config)
            for papel in ('grade', 'rede')}


def _caminho(resultados, dono):
    identidade = json.dumps(sorted((r['arquivo'], r['sha256']) for r in resultados)).encode()
    usuario = sha256(str(dono).encode()).hexdigest()
    return f'aplicacao/data/geoespacial/configuracoes/favorabilidade-agregacao/{usuario}/{sha256(identidade).hexdigest()}.json'


def carregar(resultados, dono):
    try:
        salvo = json.loads(storage_remoto.baixar(_caminho(resultados, dono)))
    except FileNotFoundError:
        return None
    if salvo.get('dono') != str(dono):
        raise ValueError('A medida salva não pertence ao responsável desta análise.')
    return configurar(**salvo['configuracao'])


def salvar(identificadores, dono, medida, percentil=None):
    config = configurar(medida, percentil)
    resultados = relatorios._selecionar(identificadores, dono, analise='favorabilidade')
    for resultado in resultados:
        for linha in relatorios.resumo_por_demanda(resultado, dono, analise='favorabilidade'):
            valores_linha(linha, config)
    dados = json.dumps({'dono': str(dono), 'configuracao': config,
                        'salvo_em': datetime.now(timezone.utc).isoformat()}, allow_nan=False).encode()
    caminho = _caminho(resultados, dono)
    storage_remoto.enviar_bytes(caminho, dados)
    if storage_remoto.baixar(caminho) != dados:
        raise ValueError('Não foi possível confirmar o salvamento da medida. Tente novamente.')
    return {'configuracao': config}
