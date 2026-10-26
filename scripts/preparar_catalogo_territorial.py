"""Carga aditiva e transacional dos catalogos territoriais, sem substituir originais.

Uso: python scripts/preparar_catalogo_territorial.py --insumos DIRETORIO [--aplicar]
Sem --aplicar valida o dicionario, sem escrita no banco.
Auditoria: python scripts/preparar_catalogo_territorial.py --conferir --inventario INVENTARIO --relatorio ARQUIVO
Aplicar antes database/143_catalogo_territorial.sql.
"""
from __future__ import annotations

import argparse
import ast
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
import math
from pathlib import Path
import sys
import unicodedata
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
import requests

from api.config import get_settings
from api.services.variaveis_combinadas import calcular
from scripts.fontes_setoriais_2022 import BASE, DICIONARIO, FONTES as FONTES_COMPLETAS, url_fonte

LAYER = '0a66703c-59b1-4b6a-9377-00ba020d1963'
FONTES = {
    'demografia': ('Agregados_por_setores_demografia_BR.zip', list(range(1006, 1042)), '01_populacao'),
    'alfabetizacao': ('Agregados_por_setores_alfabetizacao_BR.zip',
                     list(range(644, 657)) + list(range(748, 761)), '05_educacao'),
    'domicilio1': ('Agregados_por_setores_caracteristicas_domicilio1_BR_20261021.zip',
                   list(range(1, 90)), '03_domicilios'),
    'domicilio2': ('Agregados_por_setores_caracteristicas_domicilio2_BR_20250417.zip',
                   list(range(111, 119)) + list(range(199, 202)) + list(range(232, 239))
                   + list(range(309, 317)) + list(range(397, 403)) + [463, 464, 494, 495], '04_saneamento'),
}


def identificador(campo):
    return hashlib.sha256(campo.encode()).hexdigest()[:20]


def registrar_definicao(conn, codigo, territorialidade, definicao):
    result = conn.execute('''INSERT INTO base_territorial.variavel_combinada
        (codigo,territorialidade,versao,definicao) VALUES (%s,%s,1,%s)
        ON CONFLICT (codigo,territorialidade,versao) DO UPDATE SET calculado_em=now()
        WHERE base_territorial.variavel_combinada.definicao=EXCLUDED.definicao
        RETURNING codigo''', (codigo, territorialidade, Jsonb(definicao))).fetchone()
    if result is None:
        raise ValueError(f'A definicao de {codigo} mudou. Incremente sua versao antes de recalcular.')


def numero(raw):
    raw = raw.strip()
    if raw in ('', 'X', 'x', '.', '..', '...', '-'):
        return None
    value = float(raw.replace(',', '.'))
    if not math.isfinite(value) or value < 0:
        raise ValueError(f'Valor setorial invalido: {raw!r}.')
    return value


def unidade_setorial(fonte, descricao):
    text = unicodedata.normalize('NFKD', descricao).encode('ascii', 'ignore').decode().lower()
    if fonte in ('demografia', 'alfabetizacao') or 'quantidade de' in text or 'pessoas de sexo' in text:
        return 'Pessoas'
    if text.startswith('unidades de habitacao'):
        return 'Unidades de habitacao'
    return 'Domicilios'


def obter(folder, name, url):
    path = folder / name
    if not path.exists():
        response = requests.get(url, timeout=(10, 180))
        response.raise_for_status()
        path.write_bytes(response.content)
    return path


def dicionario(path):
    book = pd.ExcelFile(path)
    result = {}
    for sheet in (book.sheet_names[0], book.sheet_names[2]):
        frame = pd.read_excel(book, sheet_name=sheet).fillna('')
        for row in frame.itertuples(index=False, name=None):
            key, description = row[-2:]
            if key in result:
                raise ValueError(f'Variavel repetida no dicionario: {key}.')
            result[str(key)] = str(description)
    return result


def ler_zip(path, fields, codes):
    values, signals = {}, {}
    with zipfile.ZipFile(path) as archive:
        members = [n for n in archive.namelist() if n.lower().endswith('.csv')]
        if len(members) != 1:
            raise ValueError(f'CSV ambiguo no arquivo {path.name}.')
        with archive.open(members[0]) as stream:
            reader = csv.DictReader(io.TextIOWrapper(stream, encoding='utf-8-sig'), delimiter=';')
            code_key = next((k for k in reader.fieldnames if k.lower() in ('cd_setor', 'setor')), None)
            if not code_key or not set(fields).issubset(reader.fieldnames):
                raise ValueError(f'Cabecalho incompativel: {path.name}.')
            for row in reader:
                code = row[code_key].strip()
                if not code.startswith('35'):
                    continue
                if code not in codes:
                    raise ValueError(f'Setor SP fora da malha: {code}, arquivo {path.name}.')
                if code in values:
                    raise ValueError(f'Setor repetido: {code}, arquivo {path.name}.')
                values[code] = {key: numero(row[key]) for key in fields}
                signals[code] = {key: row[key] for key in fields if values[code][key] is None}
    return values, signals


def registrar_fonte(conn, path, url):
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    conn.execute('''INSERT INTO base_territorial.procedencia(url,sha256,bytes)
        VALUES (%s,%s,%s) ON CONFLICT (url,sha256) DO NOTHING''', (url, digest, path.stat().st_size))
    return digest


def salvar_atributo(conn, key, description, theme, unit, url, origin='originais', detail=None):
    field = f"setor_{'sicard_' if origin == 'combinados' else ''}{key}_2022"
    table = 'combinados' if origin == 'combinados' else 'valores'
    coverage = conn.execute(
        f"SELECT count(*) AS n FROM base_territorial.setor WHERE ({table}->>%s) IS NOT NULL", (key,)
    ).fetchone()['n']
    metadata = {'origem_valor': origin, 'campo_original': key,
                'definicao': description, 'dicionario': BASE + DICIONARIO, **(detail or {})}
    conn.execute('''INSERT INTO base_territorial.atributo_setorial
        (id,campo,chave,origem,fonte,ano,tema,rotulo,unidade,url,detalhe,cobertura)
        VALUES (%s,%s,%s,%s,%s,2022,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (id) DO UPDATE SET rotulo=EXCLUDED.rotulo,detalhe=EXCLUDED.detalhe,
        cobertura=EXCLUDED.cobertura,url=EXCLUDED.url,unidade=EXCLUDED.unidade''',
        (identificador(field), field, key, origin,
         'SICARD / IBGE Censo 2022' if origin == 'combinados' else 'IBGE / Censo 2022 - setores',
         theme, description, unit, url, Jsonb(metadata), coverage))


def preparar_malha(conn, descriptions):
    divergences = conn.execute('''SELECT count(*) AS n FROM (
        SELECT propriedades->>'cd_setor' FROM geoprocessamento.camada_importada_feicao
        WHERE camada_id=%s GROUP BY propriedades->>'cd_setor'
        HAVING count(DISTINCT jsonb_build_array(propriedades->'v0001',propriedades->'v0002',
          propriedades->'v0003',propriedades->'v0004',propriedades->'v0005',
          propriedades->'v0006',propriedades->'v0007')) <> 1) t''', (LAYER,)).fetchone()['n']
    if divergences:
        raise ValueError('Medidas diferentes nas partes do mesmo setor.')
    conn.execute('''INSERT INTO base_territorial.setor(cd_setor,cd_mun,area_km2,partes,geom,valores)
        SELECT propriedades->>'cd_setor', min(propriedades->>'cd_mun'),
          sum((propriedades->>'area_km2')::float8), count(*),
          ST_Multi(ST_CollectionExtract(ST_Collect(geom ORDER BY ordem),3)),
          jsonb_build_object(
            'v0001',min((propriedades->>'v0001')::float8),
            'v0002',min((propriedades->>'v0002')::float8),
            'v0003',min((propriedades->>'v0003')::float8),
            'v0004',min((propriedades->>'v0004')::float8),
            'v0005',min((propriedades->>'v0005')::float8),
            'v0006',min((propriedades->>'v0006')::float8),
            'v0007',min((propriedades->>'v0007')::float8))
        FROM geoprocessamento.camada_importada_feicao WHERE camada_id=%s
        GROUP BY propriedades->>'cd_setor'
        ON CONFLICT (cd_setor) DO NOTHING''', (LAYER,))
    count = conn.execute('SELECT count(*) AS n FROM base_territorial.setor').fetchone()['n']
    if count != 103319:
        raise ValueError(f'Malha incompleta ou versao inesperada: {count} setores.')
    source = BASE + 'malha_com_atributos/setores/gpkg/UF/SP/SP_setores_CD2022.gpkg'
    for number in range(1, 8):
        key = f'v{number:04d}'
        salvar_atributo(conn, key, descriptions[key.upper()], '01_populacao' if number == 1 else '03_domicilios',
                        '%' if number == 6 else 'moradores/domicilio' if number == 5 else 'Pessoas' if number == 1 else 'Domicilios',
                        source, detail={'nota': 'Medidas oficiais contadas uma vez por CD_SETOR; v0006 e indicador de qualidade da imputacao, nao vulnerabilidade.'})


def carregar_setores(conn, folder, descriptions):
    preparar_malha(conn, descriptions)
    codes = {r['cd_setor'] for r in conn.execute('SELECT cd_setor FROM base_territorial.setor')}
    conn.execute('CREATE TEMP TABLE entrada_setorial (codigo text PRIMARY KEY,valores jsonb,sinais jsonb) ON COMMIT DROP')
    for name, (file, numbers, theme) in FONTES.items():
        url = BASE + 'Agregados_por_Setor_csv/' + file
        path = obter(folder, file, url)
        fields = [f'V{n:05d}' for n in numbers]
        if not set(fields).issubset(descriptions):
            raise ValueError('Campo inexistente no dicionario oficial.')
        values, signals = ler_zip(path, fields, codes)
        if not values:
            raise ValueError(f'Nenhum setor paulista em {file}.')
        # Ausencia de linha tambem fica explicitamente nula na nova fonte.
        conn.execute('TRUNCATE entrada_setorial')
        with conn.cursor().copy('COPY entrada_setorial(codigo,valores,sinais) FROM STDIN') as copy:
            copy.set_types(['text', 'jsonb', 'jsonb'])
            for code in sorted(codes):
                copy.write_row((code, Jsonb(values.get(code, dict.fromkeys(fields))), Jsonb(signals.get(code, {}))))
        conn.execute('''UPDATE base_territorial.setor s SET valores=s.valores || e.valores,
            sinais=(s.sinais - %s::text[]) || e.sinais
            FROM entrada_setorial e WHERE s.cd_setor=e.codigo''', (fields,))
        digest = registrar_fonte(conn, path, url)
        for key in fields:
            description = descriptions[key]
            unit = unidade_setorial(name, description)
            salvar_atributo(conn, key, description, theme, unit, url,
                            detail={'sha256': digest, 'registros_fonte_sp': len(values),
                                    'nota': 'Universo setorial; simbolos nao numericos preservados separadamente, sem preencher por zero.'})
        print(f'{name}: {len(fields)} atributos, {len(values)} setores na fonte.', flush=True)


def materializar_municipios(conn, matrix):
    definitions = [r for r in matrix['indicadores']
                   if r['territorialidade'] == 'municipio' and r['grupo'] == 'Valores combinados']
    needed = sorted({node.id for d in definitions for node in ast.walk(ast.parse(d['formula'], mode='eval'))
                     if isinstance(node, ast.Name)})
    rows = conn.execute('''SELECT a.campo,a.id,a.tema,a.unidade,o.cd_mun,o.valor
        FROM base_municipal.atributo a JOIN base_municipal.observacao o ON o.atributo_id=a.id
        WHERE a.campo=ANY(%s)''', (needed,)).fetchall()
    by_code, metadata = {}, {}
    for row in rows:
        by_code.setdefault(row['cd_mun'], {})[row['campo']] = row['valor']
        metadata[row['campo']] = row
    if set(metadata) != set(needed) or len(by_code) != 645:
        raise ValueError('Insumos municipais incompletos.')
    for definition in definitions:
        code = definition['codigo']
        field = f"sicard_{code}_{definition['periodo'].replace('-', '_')}"
        ident = identificador(field)
        formula = definition['formula']
        refs = sorted({node.id for node in ast.walk(ast.parse(formula, mode='eval')) if isinstance(node, ast.Name)})
        calculated = [(ident, municipality, calcular(formula, values)) for municipality, values in sorted(by_code.items())]
        coverage = sum(value is not None for _, _, value in calculated)
        detail = {**definition, 'origem_valor': 'combinados', 'formula': formula, 'versao': 1,
                  'campos_origem': refs, 'atributos_origem': [metadata[key]['id'] for key in refs],
                  'definicao': definition['universo'], 'nota': definition['observacoes'],
                  'homologado_hierarquizacao': False}
        registrar_definicao(conn, code, 'municipios', detail)
        conn.execute('''INSERT INTO base_municipal.atributo
            (id,fonte,ano,tema,campo,rotulo,unidade,url,detalhe,cobertura)
            VALUES (%s,'SICARD / Variaveis combinadas',%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO UPDATE SET detalhe=EXCLUDED.detalhe,cobertura=EXCLUDED.cobertura''',
            (ident, int(definition['periodo'][-4:]), metadata[refs[0]]['tema'], field,
             definition['indicador'], definition['unidade'], definition['fontes'][0], Jsonb(detail), coverage))
        conn.cursor().executemany('''INSERT INTO base_municipal.observacao(atributo_id,cd_mun,valor)
            VALUES (%s,%s,%s) ON CONFLICT (atributo_id,cd_mun) DO UPDATE SET valor=EXCLUDED.valor''', calculated)
        print(f'{code}: {coverage}/645.', flush=True)


def materializar_setores(conn):
    definitions = [
        ('densidade_populacao', 'Densidade demografica setorial', 'v0001 / area_km2', 'habitantes/km2', '01_populacao'),
        ('densidade_domicilios', 'Densidade de domicilios particulares ocupados', 'v0007 / area_km2', 'domicilios/km2', '03_domicilios'),
        ('ocupacao_domicilios', 'Domicilios particulares ocupados (%)', '100 * v0007 / v0003', '%', '03_domicilios'),
        ('domicilios_coletivos', 'Domicilios coletivos no total de domicilios (%)', '100 * v0004 / v0002', '%', '03_domicilios'),
        ('sem_rede_agua', 'Domicilios sem ligacao a rede geral de agua (%)', '100 * V00464 / V00001', '%', '04_saneamento'),
        ('sem_sanitario', 'Domicilios sem banheiro nem sanitario (%)', '100 * V00238 / V00001', '%', '04_saneamento'),
        ('fossa_rudimentar', 'Domicilios com fossa rudimentar ou buraco (%)', '100 * V00312 / V00001', '%', '04_saneamento'),
        ('sem_coleta', 'Domicilios com destinos do lixo distintos da coleta (%)', '100 * (V00399 + V00400 + V00401 + V00402) / V00001', '%', '04_saneamento'),
        ('criancas_0_14', 'Populacao de 0 a 14 anos (%)', '100 * (V01031 + V01032 + V01033) / V01006', '%', '01_populacao'),
    ]
    ages = ' + '.join(f'V{n:05d}' for n in range(644, 657))
    literate = ' + '.join(f'V{n:05d}' for n in range(748, 761))
    definitions.append(('analfabetismo_15_mais', 'Pessoas nao alfabetizadas de 15 anos ou mais (%)',
                        f'100 * (({ages}) - ({literate})) / ({ages})', '%', '05_educacao'))
    needed = sorted({node.id for _, _, formula, _, _ in definitions
                     for node in ast.walk(ast.parse(formula, mode='eval'))
                     if isinstance(node, ast.Name) and node.id != 'area_km2'})
    conn.execute('CREATE TEMP TABLE calculos_setoriais (codigo text PRIMARY KEY,valores jsonb) ON COMMIT DROP')
    with conn.cursor(name='setores_para_calculo') as cursor:
        cursor.execute('''SELECT cd_setor,area_km2,
            (SELECT jsonb_object_agg(k,s.valores->k) FROM unnest(%s::text[]) e(k)) AS valores
            FROM base_territorial.setor s ORDER BY cd_setor''', (needed,))
        while rows := cursor.fetchmany(1000):
            with conn.cursor().copy('COPY calculos_setoriais(codigo,valores) FROM STDIN') as copy:
                copy.set_types(['text', 'jsonb'])
                for row in rows:
                    values = {**row['valores'], 'area_km2': row['area_km2']}
                    result = {code: calcular(formula, values) for code, _, formula, _, _ in definitions}
                    copy.write_row((row['cd_setor'], Jsonb(result)))
    conn.execute('''UPDATE base_territorial.setor s SET combinados=s.combinados || c.valores
        FROM calculos_setoriais c WHERE c.codigo=s.cd_setor''')
    for code, label, formula, unit, theme in definitions:
        detail = {'formula': formula, 'versao': 1, 'homologado_hierarquizacao': False,
                  'nota': 'Dados setoriais oficiais, sem desagregacao municipal. Nulos propagados; denominador nao positivo resulta nulo. Sem normalizacao 0-1. Densidades extremas exigem auditoria; ocupacao nao e vacancia; rede de agua nao equivale a adequacao rural.'}
        registrar_definicao(conn, code, 'setores_2022', {'rotulo': label, **detail})
        salvar_atributo(conn, code, label, theme, unit, BASE, 'combinados', detail)


def validar_inventario(attributes, inventory):
    if (inventory.get('referencia') != 2022 or inventory.get('malha_preservada') is not True
            or inventory.get('campos_originais') != 3519):
        raise ValueError('Inventario completo de 2022 e preservacao da malha nao comprovados.')
    sources = inventory.get('conjuntos', [])
    expected = {name: url_fonte(name, file) for name, file, _ in FONTES_COMPLETAS}
    if len(sources) != len(expected) or {item['conjunto'] for item in sources} != set(expected):
        raise ValueError('Inventario deve conter exatamente os 18 conjuntos oficiais.')
    originals = [item for item in attributes if item['origem'] == 'originais']
    combined = [item for item in attributes if item['origem'] == 'combinados']
    if (len(originals) != 3519 or len(combined) != 10 or len(attributes) != 3529
            or len({item['chave'] for item in originals}) != 3519):
        raise ValueError('Catalogo setorial incompleto ou com chaves repetidas.')
    if {item['detalhe'].get('conjunto') for item in originals} != set(expected):
        raise ValueError('Conjuntos persistidos divergem do escopo oficial.')
    for source in sources:
        name = source['conjunto']
        entries = [item for item in originals if item['detalhe'].get('conjunto') == name]
        coverage = source['coberturas']
        if (source['campos'] != len(coverage) or len(entries) != len(coverage)
                or {item['chave'] for item in entries} != set(coverage)):
            raise ValueError(f'Campos persistidos divergem do inventario: {name}.')
        if (source['url'] != expected[name] or len(source['sha256']) != 64
                or any(char not in '0123456789abcdef' for char in source['sha256'])
                or not isinstance(source.get('setores'), int) or not 0 < source['setores'] <= 103319
                or not isinstance(source.get('sigilos_x'), int) or source['sigilos_x'] < 0):
            raise ValueError(f'Procedencia ou metadados incompletos no inventario: {name}.')
        for item in entries:
            detail = item['detalhe']
            if (item['cobertura'] != coverage[item['chave']] or item['url'] != source['url']
                    or detail.get('sha256') != source['sha256']
                    or detail.get('registros_fonte_sp') != source['setores']
                    or detail.get('sigilos_x_conjunto') != source['sigilos_x']):
                raise ValueError(f'Atributo diverge do inventario: {item["campo"]}.')
    return {'completa': True, 'conjuntos': len(sources), 'originais': len(originals),
            'combinados': len(combined)}


def conferir(conn, inventory):
    from api.services import base_municipal, base_setorial

    sectors = dict(conn.execute('''SELECT count(*) AS setores,sum(partes) AS partes,
        count(*) FILTER(WHERE NOT ST_IsValid(geom)) AS geometrias_invalidas
        FROM base_territorial.setor''').fetchone())
    if sectors['setores'] != 103319 or sectors['partes'] != 103620:
        raise ValueError('Contagem setorial diverge da malha oficial conferida.')
    attributes = [dict(row) for row in conn.execute('SELECT * FROM base_territorial.atributo_setorial ORDER BY origem,tema,campo')]
    completeness = validar_inventario(attributes, inventory)
    signature = dict(conn.execute('''SELECT count(*) AS setores,sum(partes) AS partes,
        md5(string_agg(md5(ST_AsEWKB(geom)::text),'' ORDER BY cd_setor)) AS geometria_md5_controle
        FROM base_territorial.setor''').fetchone())
    if signature != inventory.get('assinatura_malha'):
        raise ValueError('Assinatura da malha diverge do inventario da carga.')
    counts = {}
    codes = [row['cd_setor'] for row in conn.execute(
        'SELECT cd_setor FROM base_territorial.setor ORDER BY cd_setor')]
    for origin, column in [('originais', 'valores'), ('combinados', 'combinados')]:
        for offset in range(0, len(codes), 2000):
            batch = codes[offset:offset + 2000]
            for row in conn.execute(f'''SELECT k,count(*) AS n FROM base_territorial.setor
                CROSS JOIN LATERAL jsonb_each({column}) e(k,v)
                WHERE cd_setor BETWEEN %s AND %s AND v <> 'null'::jsonb GROUP BY k''',
                (batch[0], batch[-1])):
                key = (origin, row['k'])
                counts[key] = counts.get(key, 0) + row['n']
    for item in attributes:
        if item['cobertura'] != counts.get((item['origem'], item['chave']), 0):
            raise ValueError(f"Cobertura divergente em {item['campo']}.")
    sources = [dict(row) for row in conn.execute('''SELECT detalhe->>'conjunto' AS conjunto,
        url,count(*) AS campos,max((detalhe->>'registros_fonte_sp')::int) AS setores,
        max((detalhe->>'sigilos_x_conjunto')::bigint) AS sigilos_x
        FROM base_territorial.atributo_setorial
        WHERE origem='originais' AND detalhe ? 'conjunto'
        GROUP BY detalhe->>'conjunto',url ORDER BY detalhe->>'conjunto' ''')]
    municipal = [dict(row) for row in conn.execute('''SELECT a.campo,a.cobertura,count(o.valor) AS conferida
        FROM base_municipal.atributo a LEFT JOIN base_municipal.observacao o ON o.atributo_id=a.id
        WHERE a.detalhe->>'origem_valor'='combinados' GROUP BY a.id ORDER BY a.campo''')]
    if len(municipal) != 18 or any(row['cobertura'] != row['conferida'] for row in municipal):
        raise ValueError('Catalogo combinado municipal incompleto ou cobertura divergente.')
    income_fields = ['renda_V06000310_2022', 'renda_V06000311_2022', 'renda_V06000320_2022',
                     'renda_V06000309_2022', 'sicard_baixa_renda_meio_sm_2022']
    income_rows = conn.execute('''SELECT o.cd_mun,jsonb_object_agg(a.campo,o.valor) AS valores
        FROM base_municipal.observacao o JOIN base_municipal.atributo a ON a.id=o.atributo_id
        WHERE a.campo=ANY(%s) GROUP BY o.cd_mun''', (income_fields,)).fetchall()
    if len(income_rows) != 645:
        raise ValueError('Universo incompleto na verificacao dos percentuais de baixa renda.')
    for row in income_rows:
        values = row['valores']
        expected = calcular('100 * (renda_V06000310_2022 + renda_V06000311_2022 + renda_V06000320_2022) / renda_V06000309_2022', values)
        actual = values.get(income_fields[-1])
        if expected is None or actual is None or not math.isclose(expected, actual, rel_tol=1e-12):
            raise ValueError(f"Percentual de baixa renda divergente das contagens: {row['cd_mun']}.")
    provenance = [dict(row) for row in conn.execute(
        'SELECT url,sha256,bytes,importado_em::text FROM base_territorial.procedencia ORDER BY url')]
    # Usa os mesmos contratos da pagina, alem de conferir as tabelas persistidas.
    assert len(base_setorial.catalog()) == len(attributes)
    assert len([a for a in base_municipal.catalog() if a['origin'] == 'combinados']) == len(municipal)
    return {
        'conferido_em': datetime.now(timezone.utc).isoformat(),
        'situacao': 'Carga aplicada e cobertura conferida; nao implica homologacao para hierarquizacao.',
        'completude': completeness,
        'geometria': sectors, 'atributos_setoriais': attributes,
        'conjuntos_setoriais': sources,
        'combinados_municipais': municipal, 'procedencia': provenance,
        'baixa_renda': '645 percentuais persistidos conferidos contra as contagens oficiais, sem somar percentuais arredondados.',
        'inventario_carga': inventory,
        'reproducao': 'scripts/preparar_catalogo_territorial.py --conferir --inventario config/catalogo-territorial-incorporado.json --relatorio config/catalogo-territorial-incorporado.json',
        'politica_nulos': 'Simbolos X mantidos em sinais; nao preencher lacunas nem distribuir observacoes municipais pelos setores.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--insumos', type=Path)
    parser.add_argument('--aplicar', action='store_true')
    parser.add_argument('--conferir', action='store_true')
    parser.add_argument('--inventario', type=Path,
                        help='Inventario da carga completa ou relatorio certificado que o incorpora.')
    parser.add_argument('--relatorio', type=Path)
    args = parser.parse_args()
    if args.conferir:
        if args.aplicar:
            parser.error('--conferir nao pode ser combinado com --aplicar.')
        if args.inventario is None:
            parser.error('--conferir exige --inventario para comprovar o escopo completo.')
        inventory = json.loads(args.inventario.read_text(encoding='utf-8'))
        inventory = inventory.get('inventario_carga', inventory)
        with psycopg.connect(get_settings().slt_database_url, connect_timeout=7, row_factory=dict_row) as conn:
            conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
            conn.execute("SET LOCAL statement_timeout='600s'")
            report = conferir(conn, inventory)
        if args.relatorio:
            args.relatorio.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"Conferencia concluida: {len(report['atributos_setoriais'])} atributos setoriais; "
              f"{len(report['combinados_municipais'])} combinados municipais.")
        return
    if args.insumos is None:
        parser.error('Informe --insumos para preparar os dados ou --conferir para auditar.')
    args.insumos.mkdir(parents=True, exist_ok=True)
    dictionary = obter(args.insumos, DICIONARIO, BASE + DICIONARIO)
    descriptions = dicionario(dictionary)
    matrix = json.loads((ROOT / 'config' / 'documentacao-camadas-territoriais.json').read_text(encoding='utf-8'))
    with psycopg.connect(get_settings().slt_database_url, connect_timeout=7, row_factory=dict_row) as conn:
        if not args.aplicar:
            conn.execute('SET TRANSACTION READ ONLY')
        conn.execute("SET LOCAL statement_timeout='180s'")
        conn.execute("SET LOCAL lock_timeout='5s'")
        if args.aplicar:
            conn.execute("SELECT pg_advisory_xact_lock(hashtext('sicard-catalogo-territorial'))")
        if args.aplicar:
            materializar_municipios(conn, matrix)
            registrar_fonte(conn, dictionary, BASE + DICIONARIO)
            carregar_setores(conn, args.insumos, descriptions)
            materializar_setores(conn)
            for table in ('base_territorial.setor', 'base_territorial.atributo_setorial', 'base_municipal.atributo'):
                conn.execute(f'ANALYZE {table}')
            print('Carga validada. Confirmando transacao.', flush=True)
        else:
            print(f'Dicionario validado: {len(descriptions)} campos; nenhuma escrita executada.')


if __name__ == '__main__':
    main()
