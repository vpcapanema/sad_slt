"""Demandas poligonais integrais para a bancada, sem modificar suas fontes."""
from __future__ import annotations

import json
from collections import Counter

import geopandas as gpd
import pandas as pd
from fastapi import HTTPException
from shapely.geometry import GeometryCollection, mapping, shape

from api.services import extracao_preparacao as previa
from api.services import normalizacao_demanda as regra
from api.services import ciclo_vida_arquivos as ciclo
from api.services import storage_geoespacial as storage
from api.services.arquivos_geoespaciais_memoria import vetor, ler_vetor
from api.services.extracao_entrada_local import validar
from api.services.metadados_previa import descrever_vetor

TIPOS = {'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'}


def parametros() -> dict:
    return {
        'buffer_ponto_m': regra.BUFFER_PONTO_M,
        'buffer_linha_m': regra.BUFFER_LINHA_M,
        'segmentos_quadrante': regra.SEGMENTOS_QUADRANTE,
        'crs_metrico': f'EPSG:{regra.CRS_METRICO}',
        'crs_saida': f'EPSG:{regra.CRS_CADASTRAL}',
        'reparo': 'MakeValid', 'consolidacao': 'UnionCascaded por feição',
        'colecoes': 'Normalização recursiva de todos os componentes, reunidos na mesma feição',
    }


def normalizar_frame(frame: gpd.GeoDataFrame) -> tuple[gpd.GeoDataFrame, dict]:
    validar(frame, max_feicoes=None)
    crs = frame.crs
    if crs is None:
        raise ValueError('A camada de demandas não informa seu CRS.')
    geometrias = []
    tipos = Counter(frame.geometry.geom_type)
    componentes_colecoes = Counter()
    for pos, (fid, geometria) in enumerate(frame.geometry.items(), 1):
        if geometria.geom_type not in TIPOS:
            raise ValueError(f'Feição {pos} (FID/índice {fid}): tipo {geometria.geom_type} não aceito como demanda. Nenhum registro foi descartado.')
        try:
            resultado = shape(regra.normalizar(mapping(geometria), crs_origem=crs.to_wkt()))
        except HTTPException as exc:
            raise ValueError(f'Feição {pos} (FID/índice {fid}): {exc.detail}') from exc
        if resultado.geom_type not in {'Polygon', 'MultiPolygon'} or resultado.is_empty or not resultado.is_valid:
            raise ValueError(f'Feição {pos} (FID/índice {fid}): a normalização não produziu um polígono válido.')
        geometrias.append(resultado)
        if isinstance(geometria, GeometryCollection):
            pendentes = list(geometria.geoms)
            while pendentes:
                componente = pendentes.pop()
                if isinstance(componente, GeometryCollection):
                    pendentes.extend(componente.geoms)
                else:
                    componentes_colecoes[componente.geom_type] += 1
    resultado = frame.copy()
    resultado = resultado.set_geometry(gpd.GeoSeries(geometrias, index=frame.index, crs=regra.CRS_CADASTRAL))
    validar(resultado, max_feicoes=None)
    return resultado, {
        **parametros(), 'feicoes': len(frame), 'tipos_origem': dict(tipos),
        'pontos_convertidos': tipos['Point'] + tipos['MultiPoint'],
        'linhas_convertidas': tipos['LineString'] + tipos['MultiLineString'],
        'poligonos_sem_buffer': tipos['Polygon'] + tipos['MultiPolygon'],
        'colecoes_convertidas': tipos['GeometryCollection'],
        'componentes_colecoes': dict(componentes_colecoes),
    }


def _carregar_demanda(ident: str, atributos: dict | None = None) -> tuple[gpd.GeoDataFrame, str, dict]:
    origem: dict = {'id': ident}
    if ident.startswith('cadastro:'):
        from api.repositories.cadastro_geometria_repository import exportar_original, TipoCadastro
        from typing import cast
        partes = ident.split(':', 2)
        if len(partes) != 3 or partes[1] not in {'plano', 'programa', 'projeto'} or not partes[2]:
            raise ValueError('Referência de demanda cadastrada inválida.')
        original = exportar_original(cast(TipoCadastro, partes[1]), partes[2])
        crs = original['crs']['properties']['name']
        frame = gpd.GeoDataFrame.from_features(original['features'], crs=crs)
        nome = partes[2]
        for campo, valor in (atributos or {}).items():
            if campo not in frame.columns:
                frame[campo] = [json.dumps(valor, ensure_ascii=False, allow_nan=False) if isinstance(valor, (dict, list)) else valor] * len(frame)
    else:
        if atributos:
            raise ValueError('Atributos adicionais só são aceitos para demandas de hierarquizações.')
        if ident.startswith('storage:'):
            origem.update(storage.impressao_digital(ident))
        frame, nome, arquivo = previa.carregar(ident)
        origem['arquivo'] = arquivo
        if ident.startswith('storage:') and storage.impressao_digital(ident) != {k: v for k, v in origem.items() if k != 'id'}:
            raise ValueError('O arquivo de origem mudou durante a leitura. Atualize a prévia e tente novamente.')
    if not isinstance(frame, gpd.GeoDataFrame):
        raise ValueError('A fonte não contém uma camada vetorial de demandas.')
    return frame, nome, origem


def preparar_demanda(ident: str, dono: str, atributos: dict | None = None) -> dict:
    frame, nome, origem = _carregar_demanda(ident, atributos)
    campo_fid = 'slt_fid_origem'
    while campo_fid in frame.columns:
        campo_fid += '_'
    frame = frame.copy()
    frame[campo_fid] = frame.index
    normalizada, auditoria = normalizar_frame(frame)
    auditoria['origem'] = origem
    auditoria['campo_fid_origem'] = campo_fid
    return _gravar_demanda(normalizada, auditoria, ident, nome, dono)


def preparar_hierarquizacao(codigo: str, demandas: list[str], dono: str) -> dict:
    from api.services.hierarquizacao_service import obter_hierarquizacao

    dados = obter_hierarquizacao(codigo).model_dump(mode='json')
    objetos = dados['dados_hierarquizacao'].get('objetos', dados['objetos'])
    tipo = dados['tipo_demanda']
    if not objetos:
        raise ValueError('A hierarquização não contém demandas.')
    if tipo not in {'plano', 'programa', 'projeto'}:
        raise ValueError('Tipo de demanda não reconhecido.')
    cabecalhos = [objeto.get('cabecalho_objeto', objeto) for objeto in objetos]
    if any(not cab.get('codigo') for cab in cabecalhos):
        raise ValueError('Há demanda sem código; confira o cadastro da hierarquização.')
    referencias = [f"cadastro:{tipo}:{cab['codigo']}" for cab in cabecalhos]
    if len(set(referencias)) != len(referencias):
        raise ValueError('A hierarquização contém demandas repetidas.')
    if len(demandas) != len(referencias) or set(demandas) != set(referencias):
        raise ValueError('Envie todas as demandas da hierarquização. Atualize a seleção e marque todas na prévia.')
    fontes = []
    for ident, cab, objeto in zip(referencias, cabecalhos, objetos):
        frame, _, origem = _carregar_demanda(ident, {
            **cab, 'hierarquizacao': codigo, 'objeto_hierarquizacao': objeto,
        })
        validar(frame, max_feicoes=None)
        fontes.append((frame, origem, cab['codigo']))
    campos = {campo.lower() for frame, _, _ in fontes for campo in frame.columns}
    rastreio = {}
    for campo in ('slt_fid_origem', 'slt_camada_origem', 'slt_codigo_demanda'):
        livre = campo
        while livre.lower() in campos:
            livre += '_'
        campos.add(livre.lower())
        rastreio[campo] = livre
    frames = []
    origens = []
    for frame, origem, codigo_demanda in fontes:
        frame = frame.copy()
        frame[rastreio['slt_fid_origem']] = frame.index
        frame[rastreio['slt_camada_origem']] = origem['id']
        frame[rastreio['slt_codigo_demanda']] = codigo_demanda
        normalizada, auditoria = normalizar_frame(frame)
        frames.append(normalizada)
        origens.append({**origem, 'normalizacao': auditoria})
    normalizada = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry='geometry', crs=regra.CRS_CADASTRAL)
    ident = f'hierarquizacao:{codigo}'
    auditoria = {
        **parametros(), 'feicoes': len(normalizada),
        'origem': {'id': ident, 'hierarquizacao': codigo, 'camadas': origens},
        'campo_fid_origem': rastreio['slt_fid_origem'],
        'campo_camada_origem': rastreio['slt_camada_origem'],
        'campo_codigo_demanda': rastreio['slt_codigo_demanda'],
        'total_demandas': len(fontes),
    }
    for campo in ('pontos_convertidos', 'linhas_convertidas', 'poligonos_sem_buffer', 'colecoes_convertidas'):
        auditoria[campo] = sum(origem['normalizacao'][campo] for origem in origens)
    for campo in ('tipos_origem', 'componentes_colecoes'):
        contagens = Counter()
        for origem in origens:
            contagens.update(origem['normalizacao'][campo])
        auditoria[campo] = dict(contagens)
    return _gravar_demanda(normalizada, auditoria, ident, f"{codigo} — {dados['nome']}", dono)


def _gravar_demanda(normalizada: gpd.GeoDataFrame, auditoria: dict, ident: str, nome: str, dono: str) -> dict:
    for campo in normalizada.columns:
        if campo != normalizada.geometry.name and normalizada[campo].dtype == 'object':
            normalizada[campo] = normalizada[campo].map(
                lambda valor: json.dumps(valor, ensure_ascii=False, allow_nan=False) if isinstance(valor, (dict, list)) else valor)
    nome_arquivo = 'demandas_normalizadas.gpkg'
    conteudos = vetor(normalizada, nome_arquivo, 'GPKG', layer='demandas',
                      layer_metadata={'SICARD_NORMALIZACAO': json.dumps(auditoria, ensure_ascii=False, allow_nan=False)})
    reaberta = ler_vetor(conteudos, nome_arquivo)
    validar(reaberta, max_feicoes=None)
    if (len(reaberta) != len(normalizada) or reaberta.crs is None or reaberta.crs.to_epsg() != regra.CRS_CADASTRAL
            or set(reaberta.columns) != set(normalizada.columns)
            or not reaberta.geometry.geom_type.isin(['Polygon', 'MultiPolygon']).all()
            or not all(original.equals(gravada) for original, gravada in zip(normalizada.geometry, reaberta.geometry))):
        raise ValueError('O arquivo derivado não preservou todas as demandas poligonais.')
    try:
        pd.testing.assert_frame_equal(
            reaberta.drop(columns=reaberta.geometry.name).reset_index(drop=True),
            normalizada.drop(columns=normalizada.geometry.name).reset_index(drop=True),
            check_dtype=False, check_exact=True)
    except AssertionError as exc:
        raise ValueError('O arquivo derivado não preservou os atributos das demandas. Nenhuma camada foi enviada à bancada.') from exc
    meta = descrever_vetor(reaberta, formato='GPKG', componente='demandas')
    meta['normalizacao_demanda'] = auditoria
    meta['avisos'].append('Demanda normalizada segundo a regra cadastral. O arquivo de origem não foi alterado; os cálculos devem usar este arquivo derivado integral.')
    if auditoria['colecoes_convertidas']:
        meta['avisos'].append(f"{auditoria['colecoes_convertidas']} coleção(ões) geométrica(s) normalizada(s) componente a componente e reunida(s) por feição, preservando os atributos e identificadores originais.")
    representacao = previa.representar(reaberta, meta, dono)
    exportacao = ciclo.registrar_exportacao_memoria(nome_arquivo, conteudos, ident, 'vetor')
    caminho = exportacao['caminho']
    estado = storage.resolver(caminho).stat()
    return {
        **representacao, 'id': f'storage:{caminho}::demandas', 'nome': nome,
        'arquivo': caminho, 'camada': 'demandas', 'origem_geometria': 'storage',
        'revisao': f'{estado.st_mtime_ns}-{estado.st_size}',
        'tipo': 'vetor', 'normalizacao_demanda': auditoria,
    }
