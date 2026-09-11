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
import re
import json
import unicodedata
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


# ---------------------------------------------------------------------------
# Dicionário de atributos: nome bruto, alias amigável e significado.
#
# O nome exportado sempre começa pelo identificador do tema, para que a tabela
# de atributos seja legível sem consultar o dicionário. Shapefile aceita apenas
# 10 caracteres por campo, então lá o nome vira uma sigla do tema mais um
# sequencial, e o nome por extenso viaja no alias.
# ---------------------------------------------------------------------------
TEMA_LEGIVEL = {
    '01_populacao': 'População', '02_cor_raca': 'Cor ou raça', '03_domicilios': 'Domicílios',
    '04_saneamento': 'Saneamento', '05_educacao': 'Educação', '06_renda': 'Renda',
    '07_trabalho': 'Trabalho', '08_habitacao_internet': 'Habitação e internet',
    '09_entorno_urbano': 'Entorno urbano', '10_indigenas': 'Indígenas',
    '11_quilombolas': 'Quilombolas', '12_deficiencia_autismo': 'Deficiência e autismo',
    '13_migracao': 'Migração', '14_familias_fecundidade': 'Famílias e fecundidade',
    '15_religiao': 'Religião', '16_deslocamentos': 'Deslocamentos',
    '17_favelas': 'Favelas e comunidades urbanas', '18_registro_obitos': 'Registro de óbitos',
    'desenvolvimento_humano': 'Desenvolvimento humano',
    'desenvolvimento_municipal': 'Desenvolvimento municipal', 'economia': 'Economia',
    'empresas_emprego': 'Empresas e emprego', 'financas_publicas': 'Finanças públicas',
    'ideb': 'IDEB', 'idh': 'IDH', 'pobreza_desigualdade': 'Pobreza e desigualdade',
}
CAMPOS_FIXOS = {'CD_MUN': ('Código do município (IBGE)', 'Código de sete dígitos do município no IBGE.'),
                'NM_MUN': ('Nome do município', 'Nome oficial do município.'),
                'SIGLA_UF': ('Unidade da federação', 'Sigla da unidade da federação.'),
                'AREA_KM2': ('Área do município (km²)', 'Área oficial do município em quilômetros quadrados.')}


def tema_legivel(tema: str) -> str:
    if tema in TEMA_LEGIVEL:
        return TEMA_LEGIVEL[tema]
    texto = re.sub(r'^\d+_', '', str(tema)).replace('_', ' ').strip()
    return texto[:1].upper() + texto[1:] if texto else 'Sem tema'


def sigla_tema(tema: str) -> str:
    """Sigla de três letras usada no nome curto do Shapefile."""
    base = re.sub(r'[^A-Za-z]', '', unicodedata.normalize('NFKD', tema_legivel(tema))
                  .encode('ascii', 'ignore').decode()).upper()
    return (base[:3] or 'ATR').ljust(3, 'X')


def alias_de(item: dict) -> str:
    """Identificador do tema mais o nome do atributo, com o ano quando faz sentido."""
    rotulo = str(item.get('label') or item.get('field') or '').strip()
    ano = str(item.get('year') or '').strip()
    alias = f"{tema_legivel(item.get('theme'))} · {rotulo}"
    if ano and ano not in alias:
        alias = f'{alias} ({ano})'
    return alias[:250]


def significado_de(item: dict) -> str:
    """Definição da variável como a fonte publica, com unidade e categorias."""
    try:
        detalhe = json.loads(item.get('detail') or '{}')
    except ValueError:
        detalhe = {}
    partes = [detalhe.get('definicao') or detalhe.get('variavel') or item.get('label') or '']
    if detalhe.get('categorias'):
        partes.append(f"Recorte: {detalhe['categorias']}")
    if item.get('unit'):
        partes.append(f"Unidade: {item['unit']}")
    nota = str(detalhe.get('nota') or '').strip()
    # Algumas fontes guardam um JSON inteiro em "nota"; isso nao e significado.
    if nota and not nota.startswith(('{', '[')) and len(nota) <= 300:
        partes.append(nota)
    if detalhe.get('divulgacao'):
        partes.append(f"Divulgação: {detalhe['divulgacao']}")
    return ' · '.join(parte for parte in (str(p).strip() for p in partes) if parte)[:600]


def nomes_exportados(items: list[dict], fmt: str) -> dict[str, str]:
    """Nome de cada campo no arquivo, sempre iniciado pelo identificador do tema."""
    if fmt != 'shp':
        return {item['field']: item['field'] for item in items}
    nomes, usados = {}, set()
    for ordem, item in enumerate(items, 1):
        curto = f'{sigla_tema(item.get("theme"))}{ordem:05d}'[:10]
        while curto in usados:                      # Sequencial garante unicidade.
            ordem += 1
            curto = f'{sigla_tema(item.get("theme"))}{ordem:05d}'[:10]
        usados.add(curto)
        nomes[item['field']] = curto
    return nomes


def dicionario(items: list[dict], fmt: str) -> list[dict]:
    """Uma linha por atributo exportado, na ordem em que entram na tabela."""
    nomes = nomes_exportados(items, fmt)
    return [{'campo_exportado': nomes[item['field']], 'campo_bruto': item['field'],
             'alias': alias_de(item), 'significado': significado_de(item),
             'fonte': item.get('source'), 'tema': tema_legivel(item.get('theme')),
             'tema_bruto': item.get('theme'), 'ano': item.get('year'),
             'unidade': item.get('unit'), 'url': item.get('url'),
             'municipios_com_valor': item.get('coverage')} for item in items]


def aplicar_aliases(caminho: Path, entradas: list[dict]) -> bool:
    """Grava o alias no próprio arquivo quando o formato suporta (GeoPackage)."""
    from osgeo import gdal, ogr
    alias = {e['campo_exportado']: e['alias'] for e in entradas}
    alias.update({campo: rotulo for campo, (rotulo, _) in CAMPOS_FIXOS.items()})
    conjunto = gdal.OpenEx(str(caminho), gdal.OF_VECTOR | gdal.OF_UPDATE)
    if conjunto is None:
        return False
    try:
        camada = conjunto.GetLayer(0)
        definicao = camada.GetLayerDefn()
        for indice in range(definicao.GetFieldCount()):
            atual = definicao.GetFieldDefn(indice)
            rotulo = alias.get(atual.GetName())
            if not rotulo:
                continue
            novo = ogr.FieldDefn(atual.GetName(), atual.GetType())
            novo.SetAlternativeName(rotulo)
            camada.AlterFieldDefn(indice, novo, ogr.ALTER_ALTERNATIVE_NAME_FLAG)
        return True
    finally:
        conjunto = None


def estilo_qgis(entradas: list[dict]) -> str:
    """QML só com os aliases: Shapefile e FlatGeobuf não guardam alias no arquivo."""
    from xml.sax.saxutils import quoteattr
    linhas = [f'    <alias field={quoteattr(campo)} index="{indice}" name={quoteattr(rotulo)}/>'
              for indice, (campo, rotulo) in enumerate(
                  [(campo, rotulo) for campo, (rotulo, _) in CAMPOS_FIXOS.items()]
                  + [(e['campo_exportado'], e['alias']) for e in entradas])]
    return ('<!DOCTYPE qgis>\n<qgis version="3.34">\n  <aliases>\n'
            + '\n'.join(linhas) + '\n  </aliases>\n</qgis>\n')


def export_layer(payload: dict) -> bytes:
    """Gera o ZIP com camada, dicionário e metadados, sem simplificar geometria."""
    items = selection(payload.get('attributes'))
    fmt = payload.get('format', 'fgb')
    if fmt not in LIMITES:
        raise ValueError('Formato inválido.')
    if len(items) > LIMITES[fmt]:
        raise ValueError(f'Este formato permite até {LIMITES[fmt]} atributos nesta aplicação. Use FlatGeobuf.')
    frame = layer(items)
    entradas = dicionario(items, fmt)
    fields = {e['campo_bruto']: e['campo_exportado'] for e in entradas}
    frame = frame.rename(columns=fields)
    manifest = {'municipalities': len(frame), 'crs': CRS, 'geometry_year': ANO_MALHA,
                'geometry_source': ORIGEM_MALHA, 'format': fmt,
                'attributes': [{**i, 'export_field': fields[i['field']],
                                'alias': alias_de(i), 'significado': significado_de(i)} for i in items],
                'campos_fixos': [{'campo': campo, 'alias': rotulo, 'significado': texto}
                                 for campo, (rotulo, texto) in CAMPOS_FIXOS.items()],
                'aliases': {e['campo_exportado']: e['alias'] for e in entradas},
                'notes': ['Ausência de valor permanece nula; zero é preservado.',
                          'O nome de cada campo começa pelo identificador do tema.',
                          'Shapefile aceita 10 caracteres por campo: lá o nome é a sigla do tema '
                          'mais um sequencial, e o nome por extenso está no alias.',
                          'Anos dos indicadores não alteram a malha de referência de 2022.']}
    with tempfile.TemporaryDirectory(prefix='base-municipal-') as temp:
        folder = Path(temp)
        output = folder / f'municipios_sp.{fmt}'
        frame.to_file(output, driver=DRIVERS[fmt], encoding='UTF-8', index=False)
        manifest['alias_no_arquivo'] = bool(fmt == 'gpkg' and aplicar_aliases(output, entradas))
        (folder / 'municipios_sp.qml').write_text(estilo_qgis(entradas), encoding='utf-8')
        (folder / 'metadados.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
        with (folder / 'dicionario.csv').open('w', encoding='utf-8-sig', newline='') as arquivo:
            writer = csv.DictWriter(arquivo, fieldnames=['campo_exportado', 'alias', 'significado',
                                                         'campo_bruto', 'fonte', 'tema', 'ano',
                                                         'unidade', 'url', 'municipios_com_valor'])
            writer.writeheader()
            for campo, (rotulo, texto) in CAMPOS_FIXOS.items():
                writer.writerow({'campo_exportado': campo, 'alias': rotulo, 'significado': texto,
                                 'campo_bruto': campo, 'fonte': ORIGEM_MALHA, 'tema': 'Malha municipal',
                                 'ano': ANO_MALHA})
            for entrada in entradas:
                writer.writerow({chave: entrada[chave] for chave in writer.fieldnames})
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            for arquivo in folder.iterdir():
                archive.write(arquivo, arquivo.name)
        return buffer.getvalue()
