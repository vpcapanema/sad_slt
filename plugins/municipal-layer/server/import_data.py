"""Importa os arquivos reais existentes; nunca preenche ausência com estimativas."""
import hashlib
import json
from pathlib import Path
import sqlite3
import geopandas as gpd
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'censo2022_sp'
DATA = ROOT / 'data'
SEADE = 'https://repositorio.seade.gov.br/dataset/f714bdee-3f8c-464e-9e45-07a0e444937a/resource/5684399c-2175-4749-8914-babd5c9eaaef/download/arq_ipdm_painel_v2024.csv'

def main():
    DATA.mkdir(exist_ok=True)
    target = DATA / 'catalog.sqlite'
    if target.exists():
        raise SystemExit('Banco já existe. Preserve-o ou mova-o antes de reimportar.')
    shape = gpd.read_file(SOURCE / 'malha_original/SP_Municipios_2022.shp')
    assert len(shape) == 645 and shape.CD_MUN.is_unique and shape.geometry.is_valid.all()
    shape.to_file(DATA / 'municipios.gpkg', layer='municipios', driver='GPKG')
    codes = set(shape.CD_MUN)
    conn = sqlite3.connect(target)
    conn.executescript('''
      CREATE TABLE attributes(id TEXT PRIMARY KEY, source TEXT NOT NULL, year INTEGER NOT NULL,
        theme TEXT NOT NULL, field TEXT NOT NULL UNIQUE, label TEXT NOT NULL, unit TEXT,
        url TEXT, detail TEXT, coverage INTEGER NOT NULL);
      CREATE TABLE observations(attribute_id TEXT NOT NULL REFERENCES attributes(id),
        municipality TEXT NOT NULL, value REAL, PRIMARY KEY(attribute_id,municipality)) WITHOUT ROWID;
      CREATE INDEX catalog_filter ON attributes(source,year,theme);
      CREATE TABLE provenance(path TEXT PRIMARY KEY, sha256 TEXT NOT NULL);
    ''')
    conn.execute('PRAGMA foreign_keys=ON')
    def add(source, year, theme, field, label, unit, url, detail, series):
        series.index = series.index.astype(str)
        assert series.index.is_unique and set(series.index) <= codes
        values = pd.to_numeric(series.reindex(shape.CD_MUN), errors='coerce')
        aid = hashlib.sha256(field.encode()).hexdigest()[:20]
        conn.execute('INSERT INTO attributes VALUES (?,?,?,?,?,?,?,?,?,?)',
                     (aid, source, int(year), theme, field, label, unit, url, detail, int(values.notna().sum())))
        conn.executemany('INSERT INTO observations VALUES (?,?,?)',
                        [(aid, code, None if pd.isna(v) else float(v)) for code, v in values.items()])

    meta = pd.read_csv(SOURCE / 'camada_unica/dicionario_campos.csv').fillna('')
    census = gpd.read_file(SOURCE / 'camada_unica/SP_Censo2022_completo.fgb', ignore_geometry=True).set_index('CD_MUN')
    for r in meta.to_dict('records'):
        add('IBGE · Censo 2022', 2022, r['tema'], r['campo']+'_2022',
            r['variavel'] + (' · '+r['categorias'] if r['categorias'] else ''), r['unidade'], r['fonte'],
            json.dumps(r, ensure_ascii=False), census[r['campo']])
    print(f'Censo: {len(meta)} atributos', flush=True)
    extras = pd.read_csv(SOURCE / 'socioeconomico_desenvolvimento/indicadores_adicionais.csv', dtype={'CD_MUN':str}).set_index('CD_MUN')
    meta = pd.read_csv(SOURCE / 'socioeconomico_desenvolvimento/dicionario_campos.csv').fillna('')
    for r in meta.to_dict('records'):
        if r['campo'] not in extras.columns:
            continue
        add(r['fonte'], r['ano'], r['tema'], r['campo'], r['indicador'], r['unidade'], r['url_fonte'],
            json.dumps(r, ensure_ascii=False), extras[r['campo']])
    raw = DATA / 'seade_ipdm.csv'
    if not raw.exists():
        response = requests.get(SEADE, timeout=120)
        response.raise_for_status()
        raw.write_bytes(response.content)
    seade = pd.read_csv(raw, sep=';', encoding='cp1252', decimal=',', dtype={'cod_ibge':str})
    # Apenas índices sintéticos identificados explicitamente no arquivo oficial.
    mask = (seade.Tipo == 'IPDM') | seade['Indicador 5'].fillna('').str.startswith('Indicador ')
    for (year, theme), group in seade[mask].groupby(['Ano','Tipo']):
        assert len(group) == 645 and group.cod_ibge.is_unique
        add('Seade · IPDM', year, 'desenvolvimento_municipal', f'seade_{theme.lower()}_{year}',
            'IPDM' if theme == 'IPDM' else f'IPDM · {theme}', 'Índice (0 a 1)', SEADE,
            json.dumps({'nota':'IPDM é distinto do IDHM. Ano é o período de referência divulgado pela Seade.', 'fonte':SEADE}, ensure_ascii=False),
            group.set_index('cod_ibge').Valor)
    for path in [raw, SOURCE/'camada_unica/dicionario_campos.csv', SOURCE/'socioeconomico_desenvolvimento/indicadores_adicionais.csv']:
        conn.execute('INSERT INTO provenance VALUES (?,?)', (str(path), hashlib.sha256(path.read_bytes()).hexdigest()))
    conn.commit()
    print({'atributos_periodos': conn.execute('SELECT COUNT(*) FROM attributes').fetchone()[0],
           'observacoes': conn.execute('SELECT COUNT(*) FROM observations').fetchone()[0],
           'integridade': conn.execute('PRAGMA integrity_check').fetchone()[0]}, flush=True)
    conn.close()

if __name__ == '__main__':
    main()
