"""Modo enriquecimento da extração de atributos.

Implementa as etapas 3 e 4 de documentacao/geoespacial/FLUXO_CRUZAMENTO_ESPACIAL_CONFIGURAVEL.md:
um registro por feição de entrada (ou por trecho dela dentro da unidade de recorte),
enriquecido base a base conforme a regra de cada base
(api/services/extracao_atributos_regras.py). O modo sobreposição (uma linha por
pedaço de interseção) continua em extracao_atributos_analise.

Decisões:

* Medidas e geometria de trabalho em EPSG:5880; saída em EPSG:4674.
* Geometria inválida é corrigida (``make_valid``) e mantém só as partes da dimensão
  da feição; o que colapsa sem medida é descartado e contado.
* A unidade de recorte entrega seus atributos pela própria interseção. Não há
  junção espacial com ela depois do corte: o trecho termina na divisa e tocaria
  a unidade vizinha.
* Partes da entrada fora de todas as unidades viram trechos com os campos da
  unidade vazios; nada da entrada se perde.
* "primeira" é a feição de menor posição na base (determinística); "maior
  sobreposição" usa extensão (linhas) ou área (polígonos) em comum e, sem medida
  (pontos), cai na primeira. Na ligação por atributo não há sobreposição: vale a
  primeira.
* Ligação por atributo compara as chaves como texto sem espaços nas pontas, para
  que 3550308 e "3550308" se encontrem.
"""
from __future__ import annotations

from collections import defaultdict

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely

from api.repositories.camada_geoespacial_repository import _json_safe
from api.services.extracao_atributos_analise import DIMENSIONS
from api.services.extracao_atributos_regras import validar_conjunto

CRS_MEDIDA = 5880
CRS_SAIDA = 4674
PREDICADOS = {'intersecta': 'intersects', 'contem': 'contains', 'esta_dentro': 'within'}
NOMES_DIMENSAO = {0: 'pontos', 1: 'linhas', 2: 'poligonos'}
SUFIXOS_DIMENSAO = {0: 'pto', 1: 'lin', 2: 'pol'}
_FID = '__ea_fid'
_REG = '__ea_reg'


# ------------------------------------------------------------------ geometria

def _dimensao(geometria):
    return None if geometria is None or geometria.is_empty else DIMENSIONS.get(geometria.geom_type)


def _partes(geometria):
    """Partes simples, abrindo coleções aninhadas."""
    if geometria is None or geometria.is_empty:
        return []
    if geometria.geom_type in ('GeometryCollection', 'MultiPoint', 'MultiLineString', 'MultiPolygon'):
        return [parte for sub in geometria.geoms for parte in _partes(sub)]
    return [geometria]


def _na_dimensao(geometria, dimensao):
    partes = [p for p in _partes(geometria) if DIMENSIONS.get(p.geom_type) == dimensao]
    if not partes:
        return None
    if dimensao == 0:
        return shapely.MultiPoint(partes) if len(partes) > 1 else partes[0]
    if dimensao == 1:
        return shapely.MultiLineString(partes) if len(partes) > 1 else partes[0]
    return shapely.union_all(partes)


def medida(geometria, dimensao):
    if dimensao == 0 or geometria is None or geometria.is_empty:
        return 0.0
    partes = [p for p in _partes(geometria) if DIMENSIONS.get(p.geom_type) == dimensao]
    return float(sum(p.length for p in partes)) if dimensao == 1 else float(sum(p.area for p in partes))


def preparar(frame, nome, corrigir=True, separar=True, buffer_m=None):
    """Camada em EPSG:5880 separada por dimensão: ({dimensão: gdf}, estatísticas).

    Cada gdf leva ``__ea_fid`` com a posição original da feição na camada.
    """
    if frame.crs is None:
        raise ValueError(f'{nome}: a camada não tem sistema de referência (CRS).')
    dados = frame.to_crs(CRS_MEDIDA).reset_index(drop=True)
    geometria = dados.geometry.name
    dados[_FID] = np.arange(len(dados))
    estat = {'feicoes': len(dados), 'sem_geometria': 0, 'corrigidas': 0, 'colapsadas': 0}
    vazias = dados.geometry.isna() | dados.geometry.is_empty
    estat['sem_geometria'] = int(vazias.sum())
    dados = dados[~vazias]
    invalidas = ~dados.geometry.is_valid
    if invalidas.any():
        if not corrigir:
            raise ValueError(f'{nome}: há {int(invalidas.sum())} geometria(s) inválida(s) e a correção está desligada.')
        estat['corrigidas'] = int(invalidas.sum())
    linhas = []
    for _, feicao in dados.iterrows():
        geom = feicao[geometria]
        dimensao_original = _dimensao(geom)
        if not geom.is_valid:
            geom = shapely.make_valid(geom)
        if buffer_m:
            geom = geom.buffer(buffer_m, quad_segs=16)
        por_dimensao = defaultdict(list)
        for parte in _partes(geom):
            por_dimensao[DIMENSIONS.get(parte.geom_type)].append(parte)
        if not buffer_m and dimensao_original is not None and not separar:
            por_dimensao = {dimensao_original: por_dimensao.get(dimensao_original, [])}
        guardou = False
        for dimensao, partes in por_dimensao.items():
            if dimensao is None or not partes:
                continue
            junta = _na_dimensao(shapely.GeometryCollection(partes), dimensao)
            if junta is None or (dimensao > 0 and medida(junta, dimensao) <= 0):
                continue
            linhas.append({**feicao.drop(geometria).to_dict(), '__ea_dim': dimensao, geometria: junta})
            guardou = True
        if not guardou:
            estat['colapsadas'] += 1
    if not linhas:
        raise ValueError(f'{nome}: nenhuma geometria utilizável depois da preparação.')
    tabela = gpd.GeoDataFrame(linhas, geometry=geometria, crs=CRS_MEDIDA)
    dimensoes = sorted(tabela['__ea_dim'].unique())
    if not separar and len(dimensoes) > 1:
        raise ValueError(f'{nome}: mistura pontos, linhas e polígonos; ative a separação por tipo de geometria.')
    saida = {int(d): tabela[tabela['__ea_dim'] == d].drop(columns='__ea_dim').reset_index(drop=True) for d in dimensoes}
    estat['por_dimensao'] = {NOMES_DIMENSAO[d]: len(g) for d, g in saida.items()}
    return saida, estat


# ------------------------------------------------------------------ nomes e dicionário

def _campos_da_base(frame, regra, nome):
    disponiveis = [c for c in frame.columns if c not in (frame.geometry.name, _FID)]
    if regra['campos'] is None:
        return disponiveis
    faltando = [c for c in regra['campos'] if c not in disponiveis]
    if faltando:
        raise ValueError(f'{nome}: campo(s) inexistente(s) na base: {", ".join(faltando)}.')
    return list(regra['campos'])


def _nome_livre(nome, usados):
    candidato, conta = nome, 2
    while candidato.lower() in usados:
        candidato, conta = f'{nome}_{conta}', conta + 1
    usados.add(candidato.lower())
    return candidato


def _valor(valor):
    valor = _json_safe(valor)
    if isinstance(valor, (dict, list)):
        import json
        return json.dumps(valor, ensure_ascii=False)
    return valor


def _descricao_regra(regra):
    if regra['ligacao'] == 'atributo':
        ligacao = f"atributo ({regra['chave_entrada']} = {regra['chave_base']})"
    else:
        ligacao = f"localização ({regra['predicado']})"
    return f"{ligacao}; multiplicidade: {regra['multiplicidade']}"


# ------------------------------------------------------------------ recorte

def recortar(registros, dimensao, unidade, regra, nome_base, usados, dicionario, tema):
    """Divide os registros nos limites da unidade; atributos da unidade vêm da interseção."""
    campos = _campos_da_base(unidade, regra, nome_base)
    prefixo = regra['prefixo']
    nomes = {campo: _nome_livre(prefixo + str(campo), usados) for campo in campos}
    col_fid = _nome_livre(prefixo + 'fid_base', usados)
    col_n = _nome_livre(prefixo + 'n_feicoes', usados)
    for campo in campos:
        dicionario.append({'campo': nomes[campo], 'apelido': regra['apelidos'].get(campo), 'tema': tema,
                           'base': nome_base, 'campo_origem': campo, 'regra': 'unidade de recorte'})
    dicionario.append({'campo': col_fid, 'apelido': f'{nome_base} · posição da feição', 'tema': tema,
                       'base': nome_base, 'campo_origem': None, 'regra': 'unidade de recorte'})
    dicionario.append({'campo': col_n, 'apelido': f'{nome_base} · nº de unidades tocadas', 'tema': tema,
                       'base': nome_base, 'campo_origem': None, 'regra': 'unidade de recorte'})
    geometria = registros.geometry.name
    unidades = unidade.reset_index(drop=True)
    indice = unidades.sindex
    linhas = []
    for _, registro in registros.iterrows():
        geom = registro[geometria]
        candidatos = sorted(indice.query(geom, predicate='intersects'), key=lambda i: unidades.iloc[i][_FID])
        base = registro.drop(geometria).to_dict()
        if dimensao == 0:
            # Ponto na divisa toca duas unidades: fica a primeira, e a contagem registra.
            escolhido = unidades.iloc[candidatos[0]] if candidatos else None
            linha = {**base, col_n: len(candidatos), geometria: geom}
            if escolhido is not None:
                linha[col_fid] = int(escolhido[_FID])
                linha.update({nomes[c]: _valor(escolhido[c]) for c in campos})
            linhas.append(linha)
            continue
        restante = geom
        for i in candidatos:
            unidade_i = unidades.iloc[i]
            parte = _na_dimensao(shapely.intersection(geom, unidade_i.geometry), dimensao)
            if parte is None or medida(parte, dimensao) <= 0:
                continue
            linhas.append({**base, col_fid: int(unidade_i[_FID]), col_n: 1,
                           **{nomes[c]: _valor(unidade_i[c]) for c in campos}, geometria: parte})
            restante = shapely.difference(restante, unidade_i.geometry)
        fora = _na_dimensao(restante, dimensao)
        if fora is not None and medida(fora, dimensao) > 1e-6:
            linhas.append({**base, col_n: 0, geometria: fora})
    tabela = gpd.GeoDataFrame(linhas, geometry=geometria, crs=CRS_MEDIDA)
    for coluna in [col_fid, col_n, *nomes.values()]:
        if coluna not in tabela.columns:
            tabela[coluna] = None
    return tabela.reset_index(drop=True), {
        'base': nome_base, 'papel': 'recorte', 'registros_antes': len(registros), 'registros_depois': len(tabela),
        'fora_das_unidades': int((tabela[col_n] == 0).sum()), 'coluna_fid': col_fid}


# ------------------------------------------------------------------ enriquecimento

def _pares_localizacao(registros, dimensao, base, dimensao_base, predicado):
    """[(índice do registro, índice na base, medida em comum)] ordenados."""
    esquerda = gpd.GeoDataFrame({_REG: np.arange(len(registros))}, geometry=registros.geometry.values, crs=CRS_MEDIDA)
    direita = gpd.GeoDataFrame({'__pos': np.arange(len(base))}, geometry=base.geometry.values, crs=CRS_MEDIDA)
    pares = gpd.sjoin(esquerda, direita, how='inner', predicate=PREDICADOS[predicado])
    if pares.empty:
        return []
    dim_comum = min(dimensao, dimensao_base)
    geoms_reg = registros.geometry.values[pares[_REG].to_numpy()]
    geoms_base = base.geometry.values[pares['__pos'].to_numpy()]
    if dim_comum == 0:
        medidas = np.zeros(len(pares))
    else:
        comum = shapely.intersection(np.asarray(geoms_reg), np.asarray(geoms_base))
        medidas = np.array([medida(g, dim_comum) for g in comum])
    return list(zip(pares[_REG].to_numpy(), pares['__pos'].to_numpy(), medidas))


def _pares_atributo(registros, base, regra, nome_base):
    chave_e, chave_b = regra['chave_entrada'], regra['chave_base']
    if chave_e not in registros.columns:
        raise ValueError(f'{nome_base}: a chave da entrada {chave_e} não existe nos registros.')
    if chave_b not in base.columns:
        raise ValueError(f'{nome_base}: a chave da base {chave_b} não existe na base.')

    def texto(valor):
        return None if valor is None or (isinstance(valor, float) and np.isnan(valor)) else str(valor).strip()

    por_chave = defaultdict(list)
    for pos, valor in enumerate(base[chave_b]):
        chave = texto(valor)
        if chave:
            por_chave[chave].append(pos)
    return [(reg, pos, 0.0) for reg, valor in enumerate(registros[chave_e])
            for pos in por_chave.get(texto(valor), [])]


def enriquecer_base(registros, dimensao, base, dimensao_base, regra, nome_base, usados, dicionario, tema):
    campos = _campos_da_base(base, regra, nome_base)
    prefixo = regra['prefixo']
    multiplicidade = regra['multiplicidade']
    if regra['ligacao'] == 'atributo':
        pares = _pares_atributo(registros, base, regra, nome_base)
        if multiplicidade == 'maior_sobreposicao':
            multiplicidade = 'primeira'
    else:
        pares = _pares_localizacao(registros, dimensao, base, dimensao_base, regra['predicado'])
    nomes = {campo: _nome_livre(prefixo + str(campo), usados) for campo in campos}
    col_n = _nome_livre(prefixo + 'n_feicoes', usados)
    col_fid = None if multiplicidade == 'resumo' else _nome_livre(prefixo + 'fid_base', usados)
    col_medida = (_nome_livre(prefixo + ('comprimento_comum_m' if min(dimensao, dimensao_base) == 1 else 'area_comum_m2'), usados)
                  if multiplicidade == 'maior_sobreposicao' and regra['ligacao'] == 'localizacao'
                  and min(dimensao, dimensao_base) > 0 else None)
    descricao = _descricao_regra({**regra, 'multiplicidade': multiplicidade})
    for campo in campos:
        dicionario.append({'campo': nomes[campo], 'apelido': regra['apelidos'].get(campo), 'tema': tema,
                           'base': nome_base, 'campo_origem': campo, 'regra': descricao})
    extras = [(col_n, f'{nome_base} · nº de feições tocadas'), (col_fid, f'{nome_base} · posição da feição escolhida'),
              (col_medida, f'{nome_base} · medida em comum com a feição escolhida')]
    for coluna, apelido in extras:
        if coluna:
            dicionario.append({'campo': coluna, 'apelido': apelido, 'tema': tema, 'base': nome_base,
                               'campo_origem': None, 'regra': descricao})

    candidatos = defaultdict(list)
    for reg, pos, valor_medida in pares:
        candidatos[int(reg)].append((int(base.iloc[int(pos)][_FID]), int(pos), float(valor_medida)))
    geometria = registros.geometry.name
    linhas = []
    com, multiplos = 0, 0
    for reg, (_, registro) in enumerate(registros.iterrows()):
        lista = sorted(candidatos.get(reg, []))  # ordem da feição na base
        com += bool(lista)
        multiplos += len(lista) > 1
        linha = {**registro.to_dict(), col_n: len(lista)}
        if not lista:
            linhas.append(linha)
            continue
        if multiplicidade == 'todas':
            for fid, pos, _ in lista:
                feicao = base.iloc[pos]
                linhas.append({**linha, col_fid: fid, **{nomes[c]: _valor(feicao[c]) for c in campos}})
            continue
        if multiplicidade == 'resumo':
            feicoes = [base.iloc[pos] for _, pos, _ in lista]
            for campo in campos:
                valores = [feicao[campo] for feicao in feicoes if not pd.isna(feicao[campo])]
                numericos = [v for v in valores if isinstance(v, (int, float, np.number)) and not isinstance(v, bool)]
                if valores and len(numericos) == len(valores):
                    linha[nomes[campo]] = float(sum(numericos))
                else:
                    linha[nomes[campo]] = ' | '.join(dict.fromkeys(str(_valor(v)) for v in valores)) or None
            linhas.append(linha)
            continue
        if multiplicidade == 'maior_sobreposicao':
            escolhido = max(lista, key=lambda item: (item[2], -item[0]))
        else:
            escolhido = lista[0]
        fid, pos, valor_medida = escolhido
        feicao = base.iloc[pos]
        linha.update({col_fid: fid, **{nomes[c]: _valor(feicao[c]) for c in campos}})
        if col_medida:
            linha[col_medida] = valor_medida
        linhas.append(linha)
    tabela = gpd.GeoDataFrame(linhas, geometry=geometria, crs=CRS_MEDIDA)
    for coluna in [col_n, col_fid, col_medida, *nomes.values()]:
        if coluna and coluna not in tabela.columns:
            tabela[coluna] = None
    return tabela.reset_index(drop=True), {
        'base': nome_base, 'papel': 'atributos', 'ligacao': regra['ligacao'], 'multiplicidade': multiplicidade,
        'registros_com_correspondencia': com, 'registros_com_multiplas_feicoes': multiplos,
        'registros_antes': len(registros), 'registros_depois': len(tabela),
        'coluna_fid': col_fid, 'predicado': regra['predicado'] if regra['ligacao'] == 'localizacao' else None}


# ------------------------------------------------------------------ orquestração

_POS = '__ea_pos'
_ID = '__ea_id'
_ORIGEM = '__ea_camada'
TOLERANCIA_MEDIDA = 1e-3  # m (linhas) ou m² (polígonos): resíduo numérico aceito nas conferências


def _texto(valor):
    if valor is None or (isinstance(valor, float) and np.isnan(valor)):
        return None
    try:
        if pd.isna(valor):
            return None
    except (TypeError, ValueError):
        pass
    texto = str(valor).strip()
    return texto or None


def filtrar_entrada(frame, config, nome):
    """Aplica identificador, filtro e campos de uma entrada. Guarda posição original e identificador."""
    config = config or {}
    dados = frame.reset_index(drop=True)
    dados[_POS] = np.arange(len(dados))
    campo_id = config.get('campo_id')
    if campo_id and campo_id not in dados.columns:
        raise ValueError(f'{nome}: campo identificador inexistente: {campo_id}.')
    dados[_ID] = dados[campo_id].map(_texto) if campo_id else None
    filtro = config.get('filtro')
    if filtro:
        if filtro['campo'] not in dados.columns:
            raise ValueError(f"{nome}: campo do filtro inexistente: {filtro['campo']}.")
        valores = dados[filtro['campo']].map(_texto)
        operador = filtro['operador']
        if operador == 'preenchido':
            mascara = valores.notna()
        elif operador == 'igual':
            mascara = valores == _texto(filtro['valor'])
        elif operador == 'diferente':
            mascara = valores != _texto(filtro['valor'])
        else:
            mascara = valores.isin({_texto(v) for v in filtro['valor']})
        dados = dados[mascara.fillna(False).astype(bool)]
    campos = config.get('campos')
    if campos is not None:
        faltando = [c for c in campos if c not in frame.columns]
        if faltando:
            raise ValueError(f'{nome}: campo(s) inexistente(s) na entrada: {", ".join(faltando)}.')
        dados = dados[[*campos, _POS, _ID, dados.geometry.name]]
    if dados.empty:
        raise ValueError(f'{nome}: nenhuma feição restou depois do filtro.')
    ids = dados[_ID].dropna()
    return dados, {'feicoes_origem': len(frame), 'feicoes_selecionadas': len(dados), 'campo_id': campo_id,
                   'filtro': filtro, 'id_origem_repetidos': int(ids.duplicated().sum())}


def _conferir(registros, dimensao, referencia, recorte, conferencias):
    """Etapa 5 do fluxo: confere o resultado por caminhos independentes do enriquecimento."""
    geometria = registros.geometry.name
    resultado = {'registros': len(registros), 'id_registro_unico': bool(registros['id_registro'].is_unique)}
    esperadas = {(o, int(p)) for o, p in zip(referencia['camada_origem'], referencia['fid_origem'])}
    presentes = {(o, int(p)) for o, p in zip(registros['camada_origem'], registros['fid_origem'])}
    resultado['feicoes_de_entrada_sem_registro'] = len(esperadas - presentes)
    if recorte is not None:
        unidades, coluna = recorte
        geom_unidade = {int(f): g for f, g in zip(unidades[_FID], unidades.geometry)}
        fora = 0
        for fid, geom in zip(registros[coluna], registros[geometria]):
            if fid is None or pd.isna(fid):
                continue
            unidade = geom_unidade[int(fid)]
            if dimensao == 0:
                fora += not unidade.intersects(geom)
            else:
                fora += medida(shapely.difference(geom, unidade), dimensao) > TOLERANCIA_MEDIDA
        resultado['trechos_fora_da_propria_unidade'] = int(fora)
        if dimensao:
            originais = {(o, int(p)): medida(g, dimensao) for o, p, g in
                         zip(referencia['camada_origem'], referencia['fid_origem'], referencia.geometry)}
            somas, vistos = defaultdict(float), set()
            # "todas" duplica registros depois do corte: cada trecho entra uma vez na soma.
            for o, p, fid, geom in zip(registros['camada_origem'], registros['fid_origem'],
                                       registros[coluna], registros[geometria]):
                chave = (o, int(p), None if fid is None or pd.isna(fid) else int(fid), geom.wkb)
                if chave in vistos:
                    continue
                vistos.add(chave)
                somas[(o, int(p))] += medida(geom, dimensao)
            resultado['feicoes_com_soma_de_trechos_divergente'] = int(sum(
                abs(somas.get(k, 0.0) - v) > max(TOLERANCIA_MEDIDA, v * 1e-6) for k, v in originais.items()))
    bases = []
    for base, dimensao_base, info in conferencias:
        indice = base.sindex
        fids = base[_FID].to_numpy()
        divergencias = 0
        for geom, escolhido in zip(registros[geometria], registros[info['coluna_fid']]):
            candidatos = indice.query(geom, predicate=PREDICADOS[info['predicado']])
            if not len(candidatos):
                esperado = None
            elif info['multiplicidade'] == 'primeira':
                esperado = int(min(fids[i] for i in candidatos))
            else:
                dim_comum = min(dimensao, dimensao_base)
                medidas = [(medida(shapely.intersection(geom, base.geometry.values[i]), dim_comum) if dim_comum else 0.0,
                            -int(fids[i])) for i in candidatos]
                esperado = -max(medidas)[1]
            atual = None if escolhido is None or pd.isna(escolhido) else int(escolhido)
            divergencias += atual != esperado
        bases.append({'base': info['base'], 'multiplicidade': info['multiplicidade'],
                      'registros_conferidos': len(registros), 'divergencias': int(divergencias)})
    resultado['multiplicidade_conferida'] = bases
    resultado['aprovada'] = bool(resultado['id_registro_unico'] and not resultado['feicoes_de_entrada_sem_registro']
                                 and not resultado.get('trechos_fora_da_propria_unidade')
                                 and not resultado.get('feicoes_com_soma_de_trechos_divergente')
                                 and not any(b['divergencias'] for b in bases))
    return resultado


def _finalidades(saidas, finalidades):
    fixos = ['id_registro', 'camada_origem', 'fid_origem', 'id_origem']
    todos = {c for frame in saidas.values() for c in frame.columns}
    resultado = {}
    for item in finalidades:
        faltando = [c for c in item['campos'] if c not in todos]
        if faltando:
            raise ValueError(f"Finalidade {item['nome']}: campo(s) inexistente(s) na saída: {', '.join(faltando)}.")
        camadas = {}
        for nome, frame in saidas.items():
            colunas = list(dict.fromkeys([*fixos, *[c for c in item['campos'] if c in frame.columns]]))
            camadas[nome] = gpd.GeoDataFrame(frame[colunas], geometry=frame.geometry, crs=frame.crs)
        resultado[item['chave']] = {'nome': item['nome'], 'campos': item['campos'], 'camadas': camadas}
    return resultado


def enriquecer(entrada=None, categorias=(), nome_entrada='Entrada', progress=lambda mensagem: None,
               entradas=None, finalidades=None):
    """Executa o modo enriquecimento.

    ``entradas``: [{nome, frame, config: {campo_id, filtro, campos}}]; sem ela, usa
    ``entrada`` com ``nome_entrada``. ``categorias``: [{id, nome, camadas: [{id, nome,
    frame, regra}]}], na ordem de processamento. ``finalidades``: [{nome, campos}].
    Devolve {'camadas': {'pontos'|'linhas'|'poligonos': gdf EPSG:4674}, 'finalidades',
    'dicionario', 'relatorio'}; a conferência fica em relatorio['validacao'].
    """
    from api.services.extracao_atributos_regras import normalizar_entrada, normalizar_finalidades
    categorias = validar_conjunto(list(categorias))
    finalidades = normalizar_finalidades(finalidades)
    if entradas is None:
        entradas = [{'nome': nome_entrada, 'frame': entrada, 'config': {}}]
    if not entradas:
        raise ValueError('Informe ao menos uma camada de entrada.')
    if len({item['nome'] for item in entradas}) != len(entradas):
        raise ValueError('Camadas de entrada com o mesmo nome: renomeie antes de executar.')

    por_dimensao, estat_entradas, campos_uniao = defaultdict(list), [], []
    for item in entradas:
        progress(f"Preparando a entrada {item['nome']}")
        config = normalizar_entrada(item.get('config'))
        dados, estat = filtrar_entrada(item['frame'], config, item['nome'])
        campos_uniao.extend(c for c in dados.columns
                            if c not in (dados.geometry.name, _POS, _ID) and c not in campos_uniao)
        partes, estat_prep = preparar(dados, item['nome'])
        estat_entradas.append({'nome': item['nome'], **estat, 'preparacao': estat_prep})
        for dimensao, frame in partes.items():
            por_dimensao[dimensao].append(frame.drop(columns=_FID).assign(**{_ORIGEM: item['nome']}))

    bases_preparadas = []
    recorte = None
    for categoria in categorias:
        for camada in categoria['camadas']:
            regra = camada['regra']
            progress(f"Preparando a base {categoria['nome']} / {camada['nome']}")
            prep = regra['preparacao']
            partes, estat = preparar(camada['frame'], camada['nome'], corrigir=prep['corrigir_geometrias'],
                                     separar=prep['separar_por_tipo'], buffer_m=prep['buffer_m'])
            item = {'tema': categoria['nome'], 'nome': camada['nome'], 'regra': regra, 'partes': partes,
                    'preparacao': estat}
            if regra['papel'] == 'recorte':
                if set(partes) != {2}:
                    raise ValueError(f"{camada['nome']}: a unidade de recorte precisa ser uma camada de polígonos.")
                recorte = item
            else:
                bases_preparadas.append(item)

    nome_entradas = ', '.join(item['nome'] for item in entradas)
    saidas, relatorio_camadas, validacao = {}, {}, {}
    dicionario_geral = []
    for dimensao in sorted(por_dimensao):
        nome_dim = NOMES_DIMENSAO[dimensao]
        entrada_dim = gpd.GeoDataFrame(pd.concat(por_dimensao[dimensao], ignore_index=True), crs=CRS_MEDIDA)
        usados = {'id_registro', 'camada_origem', 'fid_origem', 'id_origem'}
        fixos = [('id_registro', 'Identificador do registro'), ('camada_origem', 'Camada de entrada de origem'),
                 ('fid_origem', 'Posição da feição na camada de entrada'),
                 ('id_origem', 'Identificador da feição de origem')]
        dicionario = [{'campo': campo, 'apelido': apelido, 'tema': 'Entrada', 'base': nome_entradas,
                       'campo_origem': None, 'regra': None} for campo, apelido in fixos]
        # Campos da entrada primeiro; os campos internos viram camada_origem, fid_origem e
        # id_origem depois, senão um campo da entrada com esses nomes seria renomeado junto.
        renomear = {}
        for campo in campos_uniao:
            if campo not in entrada_dim.columns:
                continue
            novo = _nome_livre(str(campo), usados)
            renomear[campo] = novo
            dicionario.append({'campo': novo, 'apelido': None, 'tema': 'Entrada', 'base': nome_entradas,
                               'campo_origem': campo, 'regra': None})
        registros = entrada_dim.rename(columns=renomear).rename(
            columns={_ORIGEM: 'camada_origem', _POS: 'fid_origem', _ID: 'id_origem'})
        referencia = registros[['camada_origem', 'fid_origem', registros.geometry.name]].copy()
        etapas, conferencias, recorte_conferencia = [], [], None
        if recorte:
            progress(f"Recortando {nome_dim} pela unidade {recorte['nome']}")
            registros, info = recortar(registros, dimensao, recorte['partes'][2], recorte['regra'], recorte['nome'],
                                       usados, dicionario, recorte['tema'])
            etapas.append(info)
            recorte_conferencia = (recorte['partes'][2], info['coluna_fid'])
        for base in bases_preparadas:
            for dimensao_base, frame in base['partes'].items():
                nome_base = (base['nome'] if len(base['partes']) == 1
                             else f"{base['nome']} [{SUFIXOS_DIMENSAO[dimensao_base]}]")
                regra = base['regra']
                if len(base['partes']) > 1:
                    regra = {**regra, 'prefixo': f"{regra['prefixo']}{SUFIXOS_DIMENSAO[dimensao_base]}_"}
                progress(f"Enriquecendo {nome_dim}: {base['tema']} / {nome_base}")
                registros, info = enriquecer_base(registros, dimensao, frame, dimensao_base, regra, nome_base,
                                                  usados, dicionario, base['tema'])
                etapas.append(info)
                if info['predicado'] and info['multiplicidade'] in ('maior_sobreposicao', 'primeira'):
                    conferencias.append((frame, dimensao_base, info))
        registros = registros.reset_index(drop=True)
        registros.insert(0, 'id_registro', np.arange(1, len(registros) + 1))
        progress(f'Conferindo {nome_dim}')
        validacao[nome_dim] = _conferir(registros, dimensao, referencia, recorte_conferencia, conferencias)
        ordem = [d['campo'] for d in dicionario if d['campo'] in registros.columns]
        registros = gpd.GeoDataFrame(registros[ordem], geometry=registros.geometry, crs=CRS_MEDIDA).to_crs(CRS_SAIDA)
        saidas[nome_dim] = registros
        relatorio_camadas[nome_dim] = {'feicoes_entrada': len(entrada_dim), 'registros': len(registros),
                                       'etapas': [{k: v for k, v in e.items() if k not in ('coluna_fid', 'predicado')}
                                                  for e in etapas]}
        dicionario_geral.extend({**d, 'camada': nome_dim} for d in dicionario)
    validacao['id_origem_repetidos'] = {e['nome']: e['id_origem_repetidos'] for e in estat_entradas}
    validacao['aprovada'] = all(v['aprovada'] for v in validacao.values() if isinstance(v, dict) and 'aprovada' in v)
    return {'camadas': saidas, 'finalidades': _finalidades(saidas, finalidades), 'dicionario': dicionario_geral,
            'relatorio': {'entradas': estat_entradas, 'camadas': relatorio_camadas, 'validacao': validacao,
                          'bases': [{'tema': b['tema'], 'nome': b['nome'], 'preparacao': b['preparacao']}
                                    for b in bases_preparadas + ([recorte] if recorte else [])],
                          'finalidades': [{'nome': f['nome'], 'campos': f['campos']} for f in finalidades],
                          'crs_medida': f'EPSG:{CRS_MEDIDA}', 'crs_saida': f'EPSG:{CRS_SAIDA}'}}
