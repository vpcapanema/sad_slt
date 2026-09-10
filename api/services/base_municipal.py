"""Base municipal de São Paulo lida do schema base_municipal.

Substitui a leitura do SQLite e do GeoPackage que acompanhavam o pacote
municipal-layer. As funções mantêm as assinaturas e os contratos que o
gerador de camadas e sua interface React já consumiam: o catálogo entrega
``detail`` como texto JSON, a exportação devolve um ZIP com camada,
dicionário e metadados, e ausência de valor permanece nula.
"""
from __future__ import annotations

import csv
import io
import json
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd
import pandas as pd

from api.db.connection import get_connection

MUNICIPIOS = 645
CRS = 'EPSG:4674'
ANO_MALHA = 2022
ORIGEM_MALHA = 'IBGE · Malha municipal 2022 · São Paulo'
LIMITES = {'fgb': 6500, 'gpkg': 1900, 'shp': 250}
DRIVERS = {'fgb': 'FlatGeobuf', 'gpkg': 'GPKG', 'shp': 'ESRI Shapefile'}


def catalog() -> list[dict]:
    """Catálogo completo de atributos, na ordem apresentada pela interface."""
    with get_connection() as conn:
        rows = conn.execute('''SELECT id, fonte AS source, ano AS year, tema AS theme, campo AS field,
            rotulo AS label, unidade AS unit, url, detalhe AS detail, cobertura AS coverage
            FROM base_municipal.atributo
            -- Collation binária reproduz a ordem que a interface já apresentava.
            ORDER BY fonte COLLATE "C", ano DESC, tema COLLATE "C", campo COLLATE "C"''').fetchall()
    items = []
    for row in rows:
        item = dict(row)
        detail = item['detail'] or {}
        multiplier = detail.get('multiplicador')
        if multiplier not in (None, '', 1, 1.0):
            item['unit'] = f"{item['unit']} × {float(multiplier):g}"
        # A interface faz JSON.parse deste campo; entregar texto, não objeto.
        item['detail'] = json.dumps(detail, ensure_ascii=False)
        items.append(item)
    return items


def selection(ids) -> list[dict]:
    if not isinstance(ids, list) or not ids or len(ids) > 6500 or any(not isinstance(i, str) for i in ids):
        raise ValueError('Selecione entre 1 e 6500 atributos.')
    if len(set(ids)) != len(ids):
        raise ValueError('Atributos repetidos na seleção.')
    todos = {a['id']: a for a in catalog()}
    if any(i not in todos for i in ids):
        raise ValueError('Atributo não encontrado no catálogo.')
    return sorted((todos[i] for i in ids), key=lambda a: (a['source'], a['theme'], a['year'], a['field']))


def malha() -> gpd.GeoDataFrame:
    """Malha municipal indexada pelo código do IBGE."""
    with get_connection() as conn:
        rows = conn.execute('''SELECT cd_mun, nm_mun, sigla_uf, area_km2, ST_AsBinary(geom) AS geom
            FROM base_municipal.municipio ORDER BY cd_mun''').fetchall()
    if len(rows) != MUNICIPIOS:
        raise ValueError(f'A malha municipal deve conter {MUNICIPIOS} municípios. '
                         'Carregue base_municipal com scripts/carregar_base_municipal.py.')
    frame = gpd.GeoDataFrame(
        {'CD_MUN': [r['cd_mun'] for r in rows],
         'NM_MUN': [r['nm_mun'] for r in rows],
         'SIGLA_UF': [r['sigla_uf'] for r in rows],
         'AREA_KM2': [r['area_km2'] for r in rows]},
        geometry=gpd.GeoSeries.from_wkb([bytes(r['geom']) for r in rows]), crs=CRS)
    return frame.set_index('CD_MUN')


def layer(items: list[dict]) -> gpd.GeoDataFrame:
    """Malha acrescida de uma coluna por atributo, alinhada pelo código municipal."""
    frame = malha()
    columns: dict[str, pd.Series] = {}
    if items:
        with get_connection() as conn:
            rows = conn.execute('''SELECT atributo_id, array_agg(cd_mun ORDER BY cd_mun) AS municipios,
                array_agg(valor ORDER BY cd_mun) AS valores FROM base_municipal.observacao
                WHERE atributo_id = ANY(%s) GROUP BY atributo_id''', ([i['id'] for i in items],)).fetchall()
        series = {r['atributo_id']: pd.Series(r['valores'], index=r['municipios'], dtype='float64')
                  for r in rows}
        for item in items:
            columns[item['field']] = series.get(item['id'], pd.Series(dtype='float64'))
    frame = frame.join(pd.DataFrame(columns)).reset_index()
    return gpd.GeoDataFrame(frame, geometry='geometry', crs=CRS)


def export_layer(payload: dict) -> bytes:
    """Gera o ZIP com camada, dicionário e metadados, sem simplificar geometria."""
    items = selection(payload.get('attributes'))
    fmt = payload.get('format', 'fgb')
    if fmt not in LIMITES:
        raise ValueError('Formato inválido.')
    if len(items) > LIMITES[fmt]:
        raise ValueError(f'Este formato permite até {LIMITES[fmt]} atributos nesta aplicação. Use FlatGeobuf.')
    frame = layer(items)
    fields = {i['field']: (f'A{n:06d}' if fmt == 'shp' else i['field']) for n, i in enumerate(items, 1)}
    frame = frame.rename(columns=fields)
    manifest = {'municipalities': len(frame), 'crs': CRS, 'geometry_year': ANO_MALHA,
                'geometry_source': ORIGEM_MALHA, 'format': fmt,
                'attributes': [{**i, 'export_field': fields[i['field']]} for i in items],
                'notes': ['Ausência de valor permanece nula; zero é preservado.',
                          'Campos agrupados por fonte, tema e ano. Nenhum join externo é necessário.',
                          'Anos dos indicadores não alteram a malha de referência de 2022.']}
    with tempfile.TemporaryDirectory(prefix='base-municipal-') as temp:
        folder = Path(temp)
        output = folder / f'municipios_sp.{fmt}'
        frame.to_file(output, driver=DRIVERS[fmt], encoding='UTF-8', index=False)
        (folder / 'metadados.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
        with (folder / 'dicionario.csv').open('w', encoding='utf-8-sig', newline='') as arquivo:
            writer = csv.DictWriter(arquivo, fieldnames=['campo', 'indicador', 'fonte', 'ano', 'tema',
                                                         'unidade', 'url', 'municipios_com_valor'])
            writer.writeheader()
            for i in items:
                writer.writerow(dict(zip(writer.fieldnames, [fields[i['field']], i['label'], i['source'],
                                                             i['year'], i['theme'], i['unit'], i['url'],
                                                             i['coverage']])))
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            for arquivo in folder.iterdir():
                archive.write(arquivo, arquivo.name)
        return buffer.getvalue()
