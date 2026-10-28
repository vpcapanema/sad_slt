"""Catalogo e camada setorial derivados dos agregados oficiais, sem desagregacao."""
from __future__ import annotations

import ast
from functools import lru_cache
import json
import sys

import geopandas as gpd
import pandas as pd

from api.db.connection import get_connection
from api.services import base_municipal as municipal
from api.services.catalogo_setorial_on_demand import carregar_atributos, recalcular_combinados
from api.path_policy import project_path

MUNICIPIOS = 103319  # Contrato legado do componente; a API expoe tambem featureCount.
CRS = municipal.CRS
ANO_MALHA = 2022
PREFIXO = 'setores_sp_2022'
ORIGEM_MALHA = 'IBGE - Setores censitarios de Sao Paulo (2022)'
CAMPOS_FIXOS = {
    'CD_SETOR': ('Codigo do setor (IBGE)', 'Codigo oficial de quinze digitos, como texto.'),
    **municipal.CAMPOS_FIXOS,
    'PARTES': ('Partes do setor', 'Numero de partes oficiais reunidas, sem dissolucao topologica.'),
}
CAMPOS_FIXOS['AREA_KM2'] = ('Area do setor (km2)', 'Soma das areas das partes oficiais do setor.')


@lru_cache(maxsize=1)
def _catalog_metadata():
    return json.loads(project_path('config/catalogo-setorial-on-demand.json').read_text(encoding='utf-8'))


def catalog():
    metadata = _catalog_metadata()
    with get_connection() as conn:
        rows = conn.execute('''SELECT id,fonte AS source,ano AS year,tema AS theme,campo AS field,
            rotulo AS label,unidade AS unit,url,detalhe AS detail,cobertura AS coverage,
            chave,origem AS origin FROM base_territorial.atributo_setorial
            ORDER BY fonte COLLATE "C",ano DESC,tema COLLATE "C",campo COLLATE "C"''').fetchall()
    persisted = {row['id']: dict(row) for row in rows}
    result = []
    for item in metadata['atributos_setoriais']:
        stored = persisted.pop(item['id'], None)
        if stored:
            item = {**item, 'coverage': stored['coverage'], 'carregado': bool(stored['detail'].get('sha256')),
                    'detail': json.dumps({**item['detalhe'], **stored['detail']}, ensure_ascii=False)}
        else:
            item = {**item, 'coverage': None, 'carregado': False,
                    'detail': json.dumps(item['detalhe'], ensure_ascii=False)}
        item['source'] = item['fonte']
        item['year'] = item['ano']
        item['theme'] = item['tema']
        item['field'] = item['campo']
        item['label'] = item['rotulo']
        item['unit'] = item['unidade']
        item['origin'] = item['origem']
        item['loaded'] = item['carregado']
        result.append(item)
    for row in persisted.values():
        item = row
        if item['origin'] == 'combinados':
            item['producer'] = item['source']
            item['source'] = 'IBGE / Censo 2022 - setores'
        item['detail'] = json.dumps(item['detail'], ensure_ascii=False)
        item['loaded'] = True
        result.append(item)
    if len([item for item in result if item['origin'] == 'originais']) != 3519:
        raise ValueError('Metadados do catalogo setorial incompletos.')
    return result


def selection(ids):
    if not isinstance(ids, list) or not ids or len(ids) > 6500 or any(not isinstance(i, str) for i in ids):
        raise ValueError('Selecione entre 1 e 6500 atributos.')
    if len(set(ids)) != len(ids):
        raise ValueError('Atributos repetidos na selecao.')
    items = {item['id']: item for item in catalog()}
    if any(ident not in items for ident in ids):
        raise ValueError('Atributo nao encontrado no catalogo setorial.')
    return sorted((items[ident] for ident in ids), key=lambda i: (i['source'], i['theme'], i['year'], i['field']))


def layer(items, controle=None, *, limit=None):
    requested_originals = [item for item in items if item['origin'] == 'originais']
    requested_combined = [item for item in items if item['origin'] == 'combinados']
    if requested_originals or requested_combined:
        metadata = _catalog_metadata()['atributos_setoriais']
        originals_by_id = {item['id']: item for item in metadata if item['origem'] == 'originais'}
        originals_by_key = {item['chave']: item for item in originals_by_id.values()}
        required = {}
        for item in requested_originals:
            catalog_item = originals_by_id.get(item['id'])
            if catalog_item:
                required[catalog_item['id']] = catalog_item
        for item in requested_combined:
            detail = json.loads(item['detail']) if isinstance(item['detail'], str) else item['detail']
            names = {
                node.id for node in ast.walk(ast.parse(detail['formula'], mode='eval'))
                if isinstance(node, ast.Name) and node.id != 'area_km2'
            }
            for name in names:
                catalog_item = originals_by_key.get(name)
                if catalog_item is None:
                    raise ValueError(f'Insumo setorial não catalogado para {item["field"]}: {name}.')
                required[catalog_item['id']] = catalog_item
        with get_connection() as conn:
            loaded_ids = {
                row['id'] for row in conn.execute('''SELECT id FROM base_territorial.atributo_setorial
                    WHERE id=ANY(%s) AND detalhe->>'sha256' IS NOT NULL''', (list(required),))
            } if required else set()
        requested_by_dataset = {}
        for ident, item in required.items():
            if ident not in loaded_ids:
                requested_by_dataset.setdefault(item['detalhe']['conjunto'], set()).add(item['chave'])
        if requested_by_dataset:
            carregar_atributos(requested_by_dataset)
        if requested_combined:
            recalcular_combinados({item['chave'] for item in requested_combined})
    keys_original = [item['chave'] for item in items if item['origin'] == 'originais']
    keys_combined = [item['chave'] for item in items if item['origin'] == 'combinados']
    with get_connection() as conn:
        rows = conn.execute('''SELECT s.cd_setor,s.cd_mun,m.nm_mun,s.area_km2,s.partes,
            ST_AsBinary(s.geom) AS geom,
            (SELECT jsonb_object_agg(k,v) FROM jsonb_each(s.valores) e(k,v) WHERE k=ANY(%s)) AS originais,
            (SELECT jsonb_object_agg(k,v) FROM jsonb_each(s.combinados) e(k,v) WHERE k=ANY(%s)) AS combinados
            FROM base_territorial.setor s JOIN base_municipal.municipio m ON s.cd_mun=m.cd_mun
            ORDER BY s.cd_setor LIMIT %s''', (keys_original, keys_combined, limit)).fetchall()
    if limit is None and len(rows) != MUNICIPIOS:
        raise ValueError('Malha setorial incompleta; confira a preparacao do banco.')
    frame = gpd.GeoDataFrame({
        'CD_SETOR': [r['cd_setor'] for r in rows], 'CD_MUN': [r['cd_mun'] for r in rows],
        'NM_MUN': [r['nm_mun'] for r in rows], 'SIGLA_UF': ['SP'] * len(rows),
        'AREA_KM2': [r['area_km2'] for r in rows], 'PARTES': [r['partes'] for r in rows],
    }, geometry=gpd.GeoSeries.from_wkb([bytes(r['geom']) for r in rows]), crs=CRS).set_index('CD_SETOR')
    columns = {}
    for index, item in enumerate(items, 1):
        if controle:
            controle.mensagem(f"Preparando indicador setorial {index} de {len(items)}: {item['label']}")
            controle.tarefa(index, len(items))
        columns[item['field']] = pd.Series(
            [(r[item['origin']] or {}).get(item['chave']) for r in rows], index=frame.index, dtype='float64')
    return municipal.export_support.join_attributes(frame, columns, key='CD_SETOR')


def conferir_capacidade(quantos):
    budget = municipal.orcamento_mb()
    # A geometria estadual e os arquivos auxiliares sao muito maiores que a malha municipal.
    required = 700 + quantos * 4
    if budget is not None and required > budget:
        raise ValueError(f'A camada setorial precisa de aproximadamente {required} MB; '
                         f'o servidor tem {budget} MB livres. Reduza os atributos ou aguarde recursos.')


def export_layer(payload, base=PREFIXO, controle=None):
    return municipal.export_layer(payload, base, controle, backend=sys.modules[__name__])


dicionario = municipal.dicionario
