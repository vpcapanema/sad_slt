"""Contrato do exportador SICARD com uma malha isolada de três municípios."""
from contextlib import contextmanager
import csv
import io
import json
import zipfile

import geopandas as gpd
import pandas as pd
import pytest
from openpyxl import load_workbook
from shapely.geometry import MultiPolygon, Polygon

from api.services import base_municipal as dados
from api.routers.municipal_layer import Selecao


@pytest.fixture
def inputs(monkeypatch):
    frame=gpd.GeoDataFrame({'CD_MUN':['3500001','3500002','3500003'],
        'NM_MUN':['Um','Dois','Três'],'SIGLA_UF':['SP']*3,'AREA_KM2':[1.,2.,3.]},
        geometry=[MultiPolygon([Polygon([(x,0.12345678901234567),(x+1,0),(x+1,1),(x,0.12345678901234567)])]) for x in range(3)],crs=4674).set_index('CD_MUN')
    items=[dict(id=f,field=f,label='Indicador '+f,source='Fonte de teste',theme='economia',year=2022,
                unit='unidade',url='https://example.test',detail='{}',coverage=1 if f=='parcial' else 0)
           for f in ['parcial','vazio']]
    rows=[dict(atributo_id='parcial',municipios=['3500001','3500002','3599999'],valores=[0,None,10])]
    class Connection:
        def execute(self,*args): return self
        def fetchall(self): return rows
    @contextmanager
    def connection(): yield Connection()
    monkeypatch.setattr(dados,'malha',lambda:frame.copy())
    monkeypatch.setattr(dados,'catalog',lambda:items)
    monkeypatch.setattr(dados,'get_connection',connection)
    monkeypatch.setenv('SLT_MUNICIPAL_ORCAMENTO_MB','99999')
    return items,frame


@pytest.mark.parametrize('fmt',['fgb','gpkg','shp','geojson'])
def test_package_preserves_universe_and_blank_values(inputs,tmp_path,fmt):
    items,source=inputs
    payload=Selecao(attributes=[i['id'] for i in items],format=fmt).model_dump()
    package=dados.export_layer(payload)
    with zipfile.ZipFile(io.BytesIO(package)) as z:
        assert z.testzip() is None
        z.extractall(tmp_path)
        names=set(z.namelist())
    base=dados.PREFIXO
    manifest=json.loads((tmp_path/f'{base}_metadados.json').read_text())
    assert set(manifest['arquivos'])==names
    assert manifest['join']['feicoes_entrada']==manifest['join']['feicoes_saida']==3
    assert manifest['join']['campos']['vazio']['sem_valor']==3
    assert manifest['join']['campos']['parcial']['sem_observacao']==1
    layer=gpd.read_file(tmp_path/f'{base}.{fmt}').set_index('CD_MUN').sort_index()
    assert len(layer)==len(source)
    assert layer.geometry.geom_equals(source.geometry).all()
    fields={i['field']:i['export_field'] for i in manifest['attributes']}
    assert layer[fields['vazio']].isna().all()
    assert layer.loc['3500001',fields['parcial']]==0
    assert layer.loc[['3500002','3500003'],fields['parcial']].isna().all()
    for ext,sep in [('csv',','),('txt','\t')]:
        table=pd.read_csv(tmp_path/f'{base}_atributos.{ext}',sep=sep,dtype={'CD_MUN':str}).set_index('CD_MUN').sort_index()
        assert list(table.columns)==list(layer.drop(columns='geometry').columns)
        assert table[fields['vazio']].isna().all()
        assert list(table.index)==list(source.index)
        assert table.loc['3500001',fields['parcial']]==0
    wb=load_workbook(tmp_path/f'{base}_atributos.xlsx',read_only=True)
    rows=list(wb.active.iter_rows(max_col=len(layer.columns),values_only=True));wb.close()
    assert len(rows)==4
    assert {r[0] for r in rows[1:]}==set(source.index)
    index=rows[0].index(fields['vazio'])
    assert all(r[index] is None for r in rows[1:])
    with (tmp_path/f'{base}_dicionario.csv').open(encoding='utf-8-sig') as f: glossary=list(csv.DictReader(f))
    assert {r['campo_exportado'] for r in glossary}==set(layer.columns)-{'geometry'}|{'CD_MUN'}
    assert all(r['campo_bruto'] and r['alias'] for r in glossary)
    report=(tmp_path/f'{base}_relatorio_join.txt').read_text()
    assert 'Feições de entrada: 3; feições de saída: 3' in report
    if fmt=='shp': assert {f'{base}{e}' for e in ['.shp','.shx','.dbf','.prj','.cpg']}<=names
