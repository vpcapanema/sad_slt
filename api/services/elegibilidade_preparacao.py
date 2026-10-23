"""Demandas poligonais integrais para a bancada, sem modificar suas fontes."""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from uuid import uuid4

from osgeo import ogr
from api.services import analise_territorial_ogr as nativo
from api.services import fluxo_camadas_ogr as fluxo
from fastapi import HTTPException

from api.services import extracao_preparacao as previa
from api.services import normalizacao_demanda as regra
from api.services import ciclo_vida_arquivos as ciclo
from api.services import storage_geoespacial as storage
from api.services.fluxo_camadas_ogr import validar
from api.services.fluxo_camadas_ogr import descrever as descrever_vetor

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


def normalizar_frame(frame: nativo.Camada) -> tuple[nativo.Camada, dict]:
    validar(frame, max_feicoes=None)
    crs = frame.crs
    if crs is None:
        raise ValueError('A camada de demandas não informa seu CRS.')
    geometrias = []
    tipos = Counter(fluxo.tipo(g) for g in frame.geometrias)
    componentes_colecoes = Counter()
    for pos, (fid, geometria) in enumerate(zip(frame.fids or range(len(frame)), frame.geometrias), 1):
        if fluxo.tipo(geometria) not in TIPOS:
            raise ValueError(f'Feição {pos} (FID/índice {fid}): tipo {fluxo.tipo(geometria)} não aceito como demanda. Nenhum registro foi descartado.')
        try:
            resultado = regra.normalizar_ogr(geometria, crs_origem=crs.ExportToWkt())
        except HTTPException as exc:
            raise ValueError(f'Feição {pos} (FID/índice {fid}): {exc.detail}') from exc
        if fluxo.tipo(resultado) not in {'Polygon', 'MultiPolygon'} or resultado.IsEmpty() or not resultado.IsValid():
            raise ValueError(f'Feição {pos} (FID/índice {fid}): a normalização não produziu um polígono válido.')
        geometrias.append(resultado)
        if fluxo.tipo(geometria) == 'GeometryCollection':
            pendentes = [geometria.GetGeometryRef(i) for i in range(geometria.GetGeometryCount())]
            while pendentes:
                componente = pendentes.pop()
                if fluxo.tipo(componente) == 'GeometryCollection':
                    pendentes.extend(componente.GetGeometryRef(i) for i in range(componente.GetGeometryCount()))
                else:
                    componentes_colecoes[fluxo.tipo(componente)] += 1
    resultado = frame.copiar()
    resultado.geometrias = geometrias
    resultado.crs = nativo.referencia(regra.CRS_CADASTRAL)
    validar(resultado, max_feicoes=None)
    return resultado, {
        **parametros(), 'feicoes': len(frame), 'tipos_origem': dict(tipos),
        'pontos_convertidos': tipos['Point'] + tipos['MultiPoint'],
        'linhas_convertidas': tipos['LineString'] + tipos['MultiLineString'],
        'poligonos_sem_buffer': tipos['Polygon'] + tipos['MultiPolygon'],
        'colecoes_convertidas': tipos['GeometryCollection'],
        'componentes_colecoes': dict(componentes_colecoes),
    }


def _carregar_demanda(ident: str, atributos: dict | None = None, *,
                      revisao: str | None = None) -> tuple[nativo.Camada, str, dict]:
    origem: dict = {'id': ident}
    if ident.startswith('cadastro:'):
        from api.repositories.cadastro_geometria_repository import exportar_original, TipoCadastro
        from typing import cast
        partes = ident.split(':', 2)
        if len(partes) != 3 or partes[1] not in {'plano', 'programa', 'projeto'} or not partes[2]:
            raise ValueError('Referência de demanda cadastrada inválida.')
        original = exportar_original(cast(TipoCadastro, partes[1]), partes[2])
        crs = original['crs']['properties']['name']
        frame = nativo.de_geojson(original, crs=crs)
        nome = partes[2]
        for campo, valor in (atributos or {}).items():
            if campo not in {c['nome'] for c in frame.campos}:
                registros = [{campo: valor} for _ in frame.registros]
                spec = nativo.campos_registros(registros)[0]
                frame.campos.append(spec)
                for registro, novo in zip(frame.registros, registros):
                    registro.update(novo)
    else:
        if atributos:
            raise ValueError('Atributos adicionais só são aceitos para demandas de hierarquizações.')
        if ident.startswith('storage:'):
            if revisao is not None:
                caminho, _ = storage.separar_id(ident)
                estado = storage.resolver(caminho).stat()
                if revisao != f'{estado.st_mtime_ns}-{estado.st_size}':
                    raise ValueError('O arquivo de entrada mudou após o envio à bancada. Atualize a prévia e tente novamente.')
            origem.update(storage.impressao_digital(ident))
        frame, nome, arquivo = previa.carregar(ident)
        origem['arquivo'] = arquivo
        if ident.startswith('storage:') and storage.impressao_digital(ident) != {k: v for k, v in origem.items() if k != 'id'}:
            raise ValueError('O arquivo de origem mudou durante a leitura. Atualize a prévia e tente novamente.')
    if not isinstance(frame, nativo.Camada):
        raise ValueError('A fonte não contém uma camada vetorial de demandas.')
    return frame, nome, origem


def preparar_demanda(ident: str, dono: str, atributos: dict | None = None, *,
                     analise: str = 'elegibilidade', revisao: str | None = None) -> dict:
    frame, nome, origem = (_carregar_demanda(ident, atributos, revisao=revisao) if revisao is not None
                          else _carregar_demanda(ident, atributos))
    campo_fid = 'slt_fid_origem'
    while campo_fid in {c['nome'] for c in frame.campos}:
        campo_fid += '_'
    frame = frame.copiar()
    frame.adicionar(campo_fid, ogr.OFTInteger64, frame.fids or range(len(frame)))
    normalizada, auditoria = normalizar_frame(frame)
    auditoria['origem'] = origem
    auditoria['campo_fid_origem'] = campo_fid
    return _gravar_demanda(normalizada, auditoria, ident, nome, dono, analise=analise)


def preparar_hierarquizacao(codigo: str, demandas: list[str], dono: str, *,
                            analise: str = 'elegibilidade') -> dict:
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
    campos = {campo['nome'].lower() for frame, _, _ in fontes for campo in frame.campos}
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
        frame = frame.copiar()
        frame.adicionar(rastreio['slt_fid_origem'], ogr.OFTInteger64, frame.fids or range(len(frame)))
        frame.adicionar(rastreio['slt_camada_origem'], ogr.OFTString, [origem['id']]*len(frame))
        frame.adicionar(rastreio['slt_codigo_demanda'], ogr.OFTString, [codigo_demanda]*len(frame))
        normalizada, auditoria = normalizar_frame(frame)
        frames.append(normalizada)
        origens.append({**origem, 'normalizacao': auditoria})
    normalizada = nativo.juntar(frames)
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
    return _gravar_demanda(normalizada, auditoria, ident, f"{codigo} — {dados['nome']}", dono, analise=analise)


def _gravar_demanda(normalizada: nativo.Camada, auditoria: dict, ident: str, nome: str, dono: str, *,
                    analise: str = 'elegibilidade') -> dict:
    nome_arquivo = 'demandas_normalizadas.gpkg'
    normalizada.metadados['SICARD_NORMALIZACAO'] = json.dumps(auditoria, ensure_ascii=False, allow_nan=False)
    conteudos = {nome_arquivo: nativo.serializar(normalizada, 'demandas')}
    reaberta = nativo.ler(conteudos[nome_arquivo], 'demandas')
    validar(reaberta, max_feicoes=None)
    nativo.conferir(normalizada, reaberta)
    meta = descrever_vetor(reaberta, formato='GPKG', componente='demandas')
    meta['normalizacao_demanda'] = auditoria
    meta['avisos'].append('Demanda normalizada segundo a regra cadastral. O arquivo de origem não foi alterado; os cálculos devem usar este arquivo derivado integral.')
    if auditoria['colecoes_convertidas']:
        meta['avisos'].append(f"{auditoria['colecoes_convertidas']} coleção(ões) geométrica(s) normalizada(s) componente a componente e reunida(s) por feição, preservando os atributos e identificadores originais.")
    representacao = previa.representar(reaberta, meta, dono)
    from api.services import saidas_storage
    codigo = auditoria['origem'].get('hierarquizacao')
    fase = {'elegibilidade': 'fase-1', 'favorabilidade': 'fase-2'}[analise]
    pasta = saidas_storage.pasta_analise(
        f'{analise}-territorial', 'preparacao-demandas', str(uuid4()),
        quando=datetime.now(timezone.utc), hierarquizacao=codigo, fase=fase if codigo else None)
    saidas_storage.garantir_pasta(pasta)
    exportacao = ciclo.registrar_exportacao_memoria(nome_arquivo, conteudos, ident, 'vetor', pasta_saida=pasta)
    caminho = exportacao['caminho']
    estado = storage.resolver(caminho).stat()
    return {
        **representacao, 'id': f'storage:{caminho}::demandas', 'nome': nome,
        'arquivo': caminho, 'camada': 'demandas', 'origem_geometria': 'storage',
        'revisao': f'{estado.st_mtime_ns}-{estado.st_size}',
        'tipo': 'vetor', 'normalizacao_demanda': auditoria,
    }
