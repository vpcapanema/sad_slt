"""Nomes amigáveis de camadas e campos para o relatório analítico da extração.

Ordem de resolução do nome de uma camada: o nome da biblioteca de critérios
(config/geoespacial/biblioteca_criterios_risco_restricao.json), pelo identificador
igual ao nome do arquivo; o nome do dicionário da extração
(config/geoespacial/aliases_extracao_atributos.json); a regra automática. Campos
seguem o dicionário e, na falta dele, a regra automática. O relatório de
processamento não passa por aqui: usa os nomes brutos.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

CONFIG = Path(__file__).resolve().parents[2] / 'config' / 'geoespacial'
DICIONARIO = CONFIG / 'aliases_extracao_atributos.json'
BIBLIOTECA = CONFIG / 'biblioteca_criterios_risco_restricao.json'
ORIGEM_DICIONARIO = 'dicionário da extração'
ORIGEM_BIBLIOTECA = 'biblioteca de critérios'
ORIGEM_AUTOMATICA = 'regra automática'


@lru_cache(maxsize=1)
def _dicionario() -> dict:
    return json.loads(DICIONARIO.read_text(encoding='utf-8'))


@lru_cache(maxsize=1)
def _biblioteca() -> dict:
    dados = json.loads(BIBLIOTECA.read_text(encoding='utf-8'))
    return {c['id']: c for c in dados.get('criterios', [])}


def automatico(valor) -> str:
    """Regra de importar_camadas_service._friendly_layer_alias, sem o title-case: siglas ficam como estão."""
    texto = Path(str(valor)).stem if str(valor).lower().endswith(('.gpkg', '.shp', '.geojson')) else str(valor)
    texto = re.sub(r'(?<=[a-zà-öø-ÿ0-9])(?=[A-ZÀ-ÖØ-Þ])', ' ', texto)
    texto = re.sub(r'(?<=[A-ZÀ-ÖØ-Þ])(?=[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ])', ' ', texto)
    texto = re.sub(r'[_\-.]+', ' ', texto)
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto[:1].upper() + texto[1:] if texto else 'Campo'


def chave_camada(camada_id, nome) -> str:
    """Nome do arquivo sem extensão para camadas do storage; o nome registrado para as do banco."""
    ident = str(camada_id or '')
    if ident.startswith('storage:'):
        caminho, _, camada = ident[len('storage:'):].partition('::')
        return camada or Path(caminho).stem
    return str(nome or ident)


def camada(camada_id, nome) -> dict:
    """{chave, nome, fonte, campo_nome, campos, origem} de uma camada base ou de entrada."""
    chave = chave_camada(camada_id, nome)
    item = _dicionario()['camadas'].get(chave, {})
    criterio = _biblioteca().get(chave)
    if criterio:
        rotulo, fonte, origem = criterio['nome'], criterio.get('fonte'), ORIGEM_BIBLIOTECA
    elif item.get('nome'):
        rotulo, fonte, origem = item['nome'], item.get('fonte'), ORIGEM_DICIONARIO
    else:
        rotulo, fonte, origem = automatico(nome or chave), item.get('fonte'), ORIGEM_AUTOMATICA
    return {'chave': chave, 'nome': rotulo, 'fonte': fonte, 'campo_nome': item.get('campo_nome'),
            'campos': item.get('campos', {}), 'origem': origem}


def nome_camada(camada_id, nome) -> str:
    return camada(camada_id, nome)['nome']


def opcao(chave: str) -> str:
    return _dicionario()['opcoes'].get(chave, automatico(chave))


def campo(nome: str, estrutura: dict, entrada: tuple | None = None) -> tuple[str, str]:
    """(alias, origem) de uma coluna da tabela de saída."""
    fixos = _dicionario()['campos_fixos']
    if nome in fixos:
        return fixos[nome], ORIGEM_DICIONARIO
    for grupo in estrutura.get('grupos', []):
        prefixo = grupo['prefixo']
        if not nome.startswith(prefixo):
            continue
        bruto = nome[len(prefixo):]
        if bruto in fixos:
            return fixos[bruto], ORIGEM_DICIONARIO
        if bruto.startswith('base_') and bruto[5:] in camada(grupo['camada_id'], grupo['camada'])['campos']:
            bruto = bruto[5:]
        campos = camada(grupo['camada_id'], grupo['camada'])['campos']
        return (campos[bruto], ORIGEM_DICIONARIO) if bruto in campos else (automatico(bruto), ORIGEM_AUTOMATICA)
    if entrada and nome in estrutura.get('entrada', []):
        bruto = nome[len('entrada_'):] if nome.startswith('entrada_') else nome
        campos = camada(*entrada)['campos']
        if bruto in campos:
            return campos[bruto], ORIGEM_DICIONARIO
    return automatico(nome), ORIGEM_AUTOMATICA


def dicionario(colunas, estrutura: dict, entrada: tuple | None = None) -> list[tuple[str, str, str]]:
    """[(campo bruto, alias, origem)] na ordem das colunas: o apêndice do relatório analítico."""
    return [(nome, *campo(nome, estrutura, entrada)) for nome in colunas]
