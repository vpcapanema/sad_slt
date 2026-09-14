"""Tabela de atributos da geometria de saída da extração de atributos.

Entrada de linha ou polígono: uma linha por interseção. Entrada de pontos: uma
linha por ponto, com presença ou ausência em cada camada base. Os campos da
entrada mantêm o nome original, como numa ferramenta de interseção; os campos
da base e as medidas levam o prefixo ``categoria__camada__``:

* polígono: ``<prefixo>area_ha`` e ``<prefixo>perc_entrada``;
* linha: ``<prefixo>comprimento_km`` e ``<prefixo>perc_entrada``;
* ponto: ``<prefixo>presenca`` (sim/não).

A tabela é a geometria gravada no banco e no GeoPackage, e é dela que saem o
CSV, o XLSX e o relatório analítico.
"""
from __future__ import annotations

import json

import geopandas as gpd
import pandas as pd

from api.repositories.camada_geoespacial_repository import _json_safe
from api.services.ciclo_vida_arquivos import apelido
from api.services.extracao_atributos_analise import prepare

MEDIDAS = {2: ('area_ha', 'perc_entrada'), 1: ('comprimento_km', 'perc_entrada'), 0: ('presenca',)}


def _valor(valor):
    valor = _json_safe(valor)
    return json.dumps(valor, ensure_ascii=False) if isinstance(valor, (dict, list)) else valor


def _grupos(result: dict) -> list[dict]:
    """Uma entrada por categoria e camada base, na ordem da análise, com os nomes dos campos."""
    dimensao, grupos, usados = result['dimensao_input'], [], set()
    for categoria in result['categorias']:
        for camada in categoria['camadas']:
            base = f"{apelido(categoria['id'], 40) or 'categoria'}__{apelido(camada['nome'], 60) or 'camada'}"
            prefixo, conta = f'{base}__', 2
            while prefixo in usados:
                prefixo, conta = f'{base}_{conta}__', conta + 1
            usados.add(prefixo)
            medidas = [prefixo + medida for medida in MEDIDAS[dimensao]]
            reservados = {prefixo + 'fid_base', *medidas}
            nomes, campos_base = {}, []
            for ocorrencia in camada['ocorrencias']:
                for chave in ocorrencia.get('atributos') or {}:
                    if chave in nomes:
                        continue
                    nome = prefixo + str(chave)
                    if nome in reservados:
                        nome = f'{prefixo}base_{chave}'
                    nomes[chave] = nome
                    campos_base.append(nome)
            grupos.append({'categoria_id': categoria['id'], 'categoria': categoria['nome'],
                           'camada_id': camada['id'], 'camada': camada['nome'], 'prefixo': prefixo,
                           'campos': [prefixo + 'fid_base', *campos_base, *medidas], '_nomes': nomes})
    return grupos


def _campos_entrada(entrada, reservados: set[str]) -> dict:
    nomes = {}
    for coluna in entrada.columns:
        if coluna == entrada.geometry.name:
            continue
        nome = str(coluna)
        # Nome da entrada que colide com um campo fixo ou imita um prefixo de base.
        if nome in reservados or '__' in nome:
            nome = f'entrada_{nome}'
        nomes[coluna] = nome
    return nomes


def montar(result: dict, intersecoes, entrada) -> tuple[gpd.GeoDataFrame, dict]:
    """(tabela em EPSG:5880, estrutura dos campos para agrupar no XLSX e nos relatórios)."""
    dimensao = result['dimensao_input']
    grupos = _grupos(result)
    fixos = ['id_ponto', 'fid_entrada'] if dimensao == 0 else ['id_intersecao', 'categoria', 'camada_base', 'fid_entrada']
    nomes_entrada = _campos_entrada(entrada, set(fixos))
    por_camada = {(g['categoria_id'], g['camada_id']): g for g in grupos}
    linhas, geometrias = [], []

    if dimensao == 0:
        # Os ids da análise são a ordem dos pontos depois de individualizar multipartes.
        pontos = prepare(entrada, 'Entrada')[0].to_crs(5880).explode(index_parts=False).reset_index(drop=True)
        presentes = {}
        for categoria in result['categorias']:
            for camada in categoria['camadas']:
                grupo = por_camada[(categoria['id'], camada['id'])]
                for ocorrencia in camada['ocorrencias']:
                    if ocorrencia.get('dentro'):
                        presentes.setdefault((grupo['prefixo'], int(ocorrencia['input_id'])), ocorrencia)
        for indice, (_, ponto) in enumerate(pontos.iterrows()):
            linha = {'id_ponto': indice + 1, 'fid_entrada': indice}
            for coluna, nome in nomes_entrada.items():
                linha[nome] = _valor(ponto[coluna])
            for grupo in grupos:
                prefixo, ocorrencia = grupo['prefixo'], presentes.get((grupo['prefixo'], indice))
                linha[prefixo + 'presenca'] = 'sim' if ocorrencia else 'não'
                if ocorrencia:
                    linha[prefixo + 'fid_base'] = int(ocorrencia['feicao_base_id'])
                    for chave, valor in (ocorrencia.get('atributos') or {}).items():
                        linha[grupo['_nomes'].get(chave, prefixo + str(chave))] = _valor(valor)
            linhas.append(linha)
            geometrias.append(ponto.geometry)
    else:
        colunas = set(intersecoes.columns)
        for indice, (_, registro) in enumerate(intersecoes.iterrows(), start=1):
            externo = 'externo' in colunas and bool(registro['externo'])
            grupo = None if externo else por_camada.get((registro['categoria_id'], registro['camada_base_id']))
            linha = {'id_intersecao': indice, 'categoria': grupo['categoria'] if grupo else 'Fora das bases',
                     'camada_base': grupo['camada'] if grupo else None, 'fid_entrada': int(registro['input_id'])}
            atributos_entrada = registro['atributos_input'] if isinstance(registro['atributos_input'], dict) else {}
            for chave, valor in atributos_entrada.items():
                linha[nomes_entrada.get(chave, f'entrada_{chave}')] = _valor(valor)
            if grupo:
                prefixo = grupo['prefixo']
                linha[prefixo + 'fid_base'] = int(registro['feicao_base_id'])
                atributos = registro['atributos'] if isinstance(registro['atributos'], dict) else {}
                for chave, valor in atributos.items():
                    linha[grupo['_nomes'].get(chave, prefixo + str(chave))] = _valor(valor)
                medida = float(registro['medida_si'])
                if dimensao == 2:
                    linha[prefixo + 'area_ha'] = medida / 10000
                else:
                    linha[prefixo + 'comprimento_km'] = medida / 1000
                linha[prefixo + 'perc_entrada'] = float(registro['percentual'])
            linhas.append(linha)
            geometrias.append(registro.geometry)

    campos_entrada = list(dict.fromkeys(nomes_entrada.values()))
    ordem = [*fixos, *campos_entrada]
    for grupo in grupos:
        ordem += [campo for campo in grupo['campos'] if campo not in ordem]
    ordem += list(dict.fromkeys(chave for linha in linhas for chave in linha if chave not in ordem))
    tabela = gpd.GeoDataFrame(pd.DataFrame(linhas, columns=ordem),
                              geometry=gpd.GeoSeries(geometrias, crs=5880), crs=5880)
    # Colunas esparsas viram float no pandas (66.0). Como numa ferramenta de interseção, campo
    # inteiro continua inteiro: identificadores e todo campo cujos valores são só inteiros.
    for coluna in ordem:
        valores = [linha[coluna] for linha in linhas if linha.get(coluna) is not None]
        if valores and all(isinstance(v, int) and not isinstance(v, bool) for v in valores):
            tabela[coluna] = tabela[coluna].astype('Int64')
    estrutura = {'dimensao': dimensao, 'fixos': fixos, 'entrada': campos_entrada,
                 'grupos': [{chave: valor for chave, valor in g.items() if chave != '_nomes'} for g in grupos]}
    return tabela, estrutura
