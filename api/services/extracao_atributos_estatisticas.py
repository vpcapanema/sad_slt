"""Interseção sem recorte: exatamente um registro por feição original.

A geometria original é usada na saída (EPSG:4674). Correções só afetam cópias
para consulta espacial, sem buffer e sem explodir multipartes. Cada feição da
base contribui uma vez, inclusive quando toca mais de uma parte da entrada.
"""
from __future__ import annotations

from collections import Counter
from numbers import Real

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely

from api.services.extracao_atributos_enriquecimento import (
    CRS_MEDIDA, CRS_SAIDA, DIMENSIONS, NOMES_DIMENSAO, _finalidades, _nome_livre, _texto, _valor,
)
from api.services.extracao_atributos_regras import (
    categoria_binaria, normalizar_entrada, normalizar_estatisticas, normalizar_finalidades,
)

ROTULOS = {'media': 'Média', 'moda': 'Moda', 'mediana': 'Mediana', 'total': 'Total',
           'minimo': 'Mínimo', 'maximo': 'Máximo', 'desvio_padrao': 'Desvio padrão populacional',
           'variancia': 'Variância populacional', 'contagem': 'Contagem de valores preenchidos'}


def agregar(valores, estatistica):
    """Nulos não participam; moda empatada usa a primeira ocorrência da base.

    Sem valores, contagem é zero e demais medidas são nulas. O chamador mantém
    tudo nulo quando não há interseção. Textos não são convertidos em números
    (preserva códigos com zeros à esquerda); só aceitam moda ou contagem.
    """
    valores = [_valor(v) for v in valores]
    valores = [v for v in valores if v is not None]
    if estatistica == 'contagem':
        return len(valores)
    if not valores:
        return None
    if estatistica == 'moda':
        return Counter(valores).most_common(1)[0][0]
    if not all(isinstance(v, Real) and not isinstance(v, bool) for v in valores):
        return None
    numeros = np.asarray(valores, dtype=float)
    if not np.isfinite(numeros).all():
        raise ValueError('A base contém valor numérico infinito; corrija a fonte antes de calcular estatísticas.')
    operacoes = {'media': np.mean, 'mediana': np.median, 'total': np.sum,
                 'minimo': np.min, 'maximo': np.max, 'desvio_padrao': np.std, 'variancia': np.var}
    resultado = float(operacoes[estatistica](numeros))
    if not np.isfinite(resultado):
        raise ValueError('O cálculo estatístico excedeu o limite numérico.')
    return resultado


def _geometrias_trabalho(frame, nome):
    if frame.crs is None:
        raise ValueError(f'{nome}: a camada não tem sistema de referência (CRS).')
    geoms = frame.to_crs(CRS_MEDIDA).geometry.reset_index(drop=True)
    invalidas = pd.Series([g is not None for g in geoms], dtype=bool) & ~geoms.is_valid
    geoms.loc[invalidas] = geoms.loc[invalidas].make_valid()
    return geoms, {'feicoes': len(frame), 'corrigidas_para_consulta': int(invalidas.sum()),
                   'sem_geometria': int((geoms.isna() | geoms.is_empty).sum())}


def enriquecer(entrada=None, categorias=(), nome_entrada='Entrada', progress=lambda mensagem: None,
               entradas=None, finalidades=None):
    categorias = normalizar_estatisticas(list(categorias))
    entradas = entradas if entradas is not None else [{'nome': nome_entrada, 'frame': entrada, 'config': {}}]
    if not entradas or len({e['nome'] for e in entradas}) != len(entradas):
        raise ValueError('Informe entradas com nomes distintos.')
    originais, trabalho, estat_entradas = [], [], []
    usados = {'id_registro', 'camada_origem', 'fid_origem', 'id_origem', 'geometry'}
    nomes_entrada, dicionario = {}, []
    for item in entradas:
        frame = item['frame']
        if frame.empty:
            raise ValueError(f"{item['nome']}: a camada de entrada está vazia.")
        config = normalizar_entrada(item.get('config'))
        if config['filtro'] or config['campos'] is not None:
            raise ValueError('O enriquecimento sem recorte preserva todas as feições e atributos. '
                             'Remova o filtro e a seleção de campos da entrada, ou use o enriquecimento configurável.')
        if config['campo_id'] and config['campo_id'] not in frame.columns:
            raise ValueError(f"{item['nome']}: campo identificador inexistente: {config['campo_id']}.")
        progress(f"Preparando a entrada {item['nome']} sem alterar a geometria original")
        geoms, estat = _geometrias_trabalho(frame, item['nome'])
        trabalho.extend(geoms)
        original = frame.to_crs(CRS_SAIDA).reset_index(drop=True)
        tabela = original.drop(columns=original.geometry.name).copy()
        for campo in tabela.columns:
            if campo not in nomes_entrada:
                nomes_entrada[campo] = _nome_livre(str(campo), usados)
                dicionario.append({'campo': nomes_entrada[campo], 'apelido': None, 'tema': 'Entrada',
                                   'base': ', '.join(e['nome'] for e in entradas), 'campo_origem': campo, 'regra': None})
        tabela = tabela.rename(columns=nomes_entrada)
        tabela['camada_origem'] = item['nome']
        tabela['fid_origem'] = np.arange(len(original))
        tabela['id_origem'] = original[config['campo_id']].map(_texto) if config['campo_id'] else None
        originais.append(gpd.GeoDataFrame(tabela, geometry=original.geometry.values, crs=CRS_SAIDA))
        estat_entradas.append({'nome': item['nome'], 'feicoes_origem': len(frame), 'feicoes_selecionadas': len(frame),
                              'preparacao': estat})
    resultado = gpd.GeoDataFrame(pd.concat(originais, ignore_index=True), crs=CRS_SAIDA)
    geometria_original = resultado.geometry.copy()
    trabalho = gpd.GeoSeries(trabalho, crs=CRS_MEDIDA)
    etapas, bases_info = [], []
    contagens_bases = []
    for categoria in categorias:
        binaria = categoria_binaria(categoria)
        for camada in categoria['camadas']:
            if hasattr(progress,'tarefa'): progress.tarefa(0,len(trabalho))
            progress(f"Cruzando {categoria['nome']} / {camada['nome']}")
            base, regra = camada['frame'].reset_index(drop=True), camada['regra']
            campos = [c for c in base.columns if c != base.geometry.name]
            faltando = set(regra['estatisticas_campos']) - set(campos)
            if faltando:
                raise ValueError(f"{camada['nome']}: campo(s) inexistente(s) nas estatísticas: {', '.join(sorted(faltando))}.")
            geoms, estat = _geometrias_trabalho(base, camada['nome'])
            indice = geoms.sindex
            nomes = {c: _nome_livre(regra['prefixo'] + str(c), usados) for c in campos}
            novas = {nome: [] for nome in nomes.values()}
            contagens = []
            # Consultar e agregar cada lote antes de liberar seus candidatos.
            # Uma feição muito complexa vai sozinha, sem simplificar o original.
            vertices = shapely.get_num_coordinates(trabalho.values)
            inicio = 0
            while inicio < len(trabalho):
                fim = inicio + 1
                carga = int(vertices[inicio])
                while fim < len(trabalho) and fim - inicio < 64 and carga + int(vertices[fim]) <= 200000:
                    carga += int(vertices[fim]); fim += 1
                pares = indice.query(trabalho.iloc[inicio:fim], predicate='intersects')
                correspondencias = [[] for _ in range(fim - inicio)]
                for entrada_pos, base_pos in zip(*pares):
                    correspondencias[int(entrada_pos)].append(int(base_pos))
                correspondencias = [sorted(set(posicoes)) for posicoes in correspondencias]
                contagens.extend(len(p) for p in correspondencias)
                for campo, nome in nomes.items():
                    medida = regra['estatisticas_campos'].get(campo, regra['estatistica'])
                    novas[nome].extend(('Sim' if posicoes else 'Não') if binaria else
                                       agregar(base[campo].iloc[posicoes], medida) if posicoes else None
                                       for posicoes in correspondencias)
                inicio = fim
                if hasattr(progress,'tarefa'): progress.tarefa(fim,len(trabalho))
                progress(f"{camada['nome']}: {fim}/{len(trabalho)} feições analisadas com geometria integral")
            for campo, nome in nomes.items():
                medida = regra['estatisticas_campos'].get(campo, regra['estatistica'])
                dicionario.append({'campo': nome, 'apelido': regra['apelidos'].get(campo), 'tema': categoria['nome'],
                                   'base': camada['nome'], 'campo_origem': campo,
                                   'regra': 'Interseção: Sim/Não' if binaria else ROTULOS[medida] + '; somente feições intersectadas'})
            # Presença também existe nas bases que não possuem nenhum campo de atributos.
            if binaria:
                nome = _nome_livre(regra['prefixo'] + 'intersecao', usados)
                novas[nome] = ['Sim' if n else 'Não' for n in contagens]
                dicionario.append({'campo': nome, 'apelido': f"{camada['nome']} · interseção", 'tema': categoria['nome'],
                                   'base': camada['nome'], 'campo_origem': None, 'regra': 'Interseção: Sim/Não'})
            col_n = _nome_livre(regra['prefixo'] + 'n_feicoes', usados)
            novas[col_n] = contagens
            dicionario.append({'campo': col_n, 'apelido': f"{camada['nome']} · nº de feições intersectadas", 'tema': categoria['nome'],
                               'base': camada['nome'], 'campo_origem': None, 'regra': 'Contagem espacial de feições'})
            resultado = gpd.GeoDataFrame(pd.concat([resultado, pd.DataFrame(novas)], axis=1), crs=CRS_SAIDA)
            etapas.append({'base': camada['nome'], 'papel': 'atributos', 'ligacao': 'localizacao',
                           'multiplicidade': 'binaria' if binaria else 'estatisticas',
                           'estatistica': None if binaria else regra['estatistica'],
                           'registros_com_correspondencia': sum(n > 0 for n in contagens),
                           'registros_com_multiplas_feicoes': sum(n > 1 for n in contagens),
                           'registros_antes': len(resultado), 'registros_depois': len(resultado)})
            contagens_bases.append(contagens)
            bases_info.append({'tema': categoria['nome'], 'nome': camada['nome'], 'preparacao': estat})
    resultado.insert(0, 'id_registro', np.arange(1, len(resultado) + 1))
    fixos = [{'campo': c, 'apelido': None, 'tema': 'Entrada', 'base': nome_entrada, 'campo_origem': None,
              'regra': None} for c in ('id_registro', 'camada_origem', 'fid_origem', 'id_origem')]
    dicionario = fixos + dicionario
    ordem = [d['campo'] for d in dicionario]
    resultado = resultado[[*ordem, resultado.geometry.name]]
    dimensoes = resultado.geometry.map(lambda g: NOMES_DIMENSAO.get(DIMENSIONS.get(g.geom_type) if g is not None else None, 'geometrias'))
    saidas = {nome: resultado.loc[dimensoes == nome].reset_index(drop=True) for nome in dimensoes.unique()}
    preservadas = len(resultado) == sum(len(e['frame']) for e in entradas) and resultado.geometry.to_wkb().equals(geometria_original.to_wkb())
    if not preservadas:
        raise ValueError('A conferência detectou alteração na quantidade ou nas geometrias da entrada.')
    validacao = {'aprovada': True, 'feicoes_entrada': len(resultado), 'registros_saida': len(resultado),
                 'geometrias_preservadas': True}
    for nome, frame in saidas.items():
        validacao[nome] = {'aprovada': True, 'registros': len(frame), 'id_registro_unico': frame.id_registro.is_unique,
                          'feicoes_de_entrada_sem_registro': 0, 'geometrias_preservadas': True}
    rel_camadas = {}
    for nome, frame in saidas.items():
        posicoes = np.flatnonzero((dimensoes == nome).to_numpy())
        rel_camadas[nome] = {'feicoes_entrada': len(frame), 'registros': len(frame), 'etapas': [
            {**e, 'registros_antes': len(frame), 'registros_depois': len(frame),
             'registros_com_correspondencia': sum(contas[i] > 0 for i in posicoes),
             'registros_com_multiplas_feicoes': sum(contas[i] > 1 for i in posicoes)}
            for e, contas in zip(etapas, contagens_bases)]}
    return {'camadas': saidas, 'finalidades': _finalidades(saidas, normalizar_finalidades(finalidades)),
            'dicionario': [{**d, 'camada': nome} for nome in saidas for d in dicionario],
            'relatorio': {'entradas': estat_entradas, 'camadas': rel_camadas,
                          'validacao': validacao, 'bases': bases_info, 'crs_medida': f'EPSG:{CRS_MEDIDA}',
                          'crs_saida': f'EPSG:{CRS_SAIDA}'}}
