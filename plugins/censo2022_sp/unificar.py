"""Reune todos os campos em uma camada, ordenados por tema e tabela."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET
import pandas as pd
import geopandas as gpd
import numpy as np
from shapely.geometry import MultiPolygon

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'camada_unica'

def main():
    OUT.mkdir(exist_ok=True)
    dic=pd.read_csv(ROOT/'documentacao/dicionario_variaveis.csv',keep_default_na=False)
    dic=dic.sort_values(['tema','campo'],kind='stable').reset_index(drop=True)
    geo=gpd.read_file(next((ROOT/'malha_original').glob('*.shp'))).set_index('CD_MUN')
    tables=[]
    for tema,sub in dic.groupby('tema',sort=True):
        df=pd.read_csv(ROOT/'tabelas'/f'{tema}.csv',dtype={'CD_MUN':str}).set_index('CD_MUN')
        assert df.index.is_unique and set(df.index)==set(geo.index)
        assert list(df.columns)==sub.campo.tolist()
        tables.append(df.reindex(geo.index))
    values=pd.concat(tables,axis=1)
    assert values.columns.is_unique and len(values.columns)==6159
    renamed={r.campo:r.tema[3:]+'_'+r.campo for r in dic.itertuples()}
    values=values.rename(columns=renamed)
    joined=gpd.GeoDataFrame(pd.concat([geo.drop(columns='geometry'),values,geo[['geometry']]],axis=1),geometry='geometry',crs=geo.crs).reset_index()
    target=OUT/'SP_Censo2022_completo.fgb'
    joined.to_file(target,driver='FlatGeobuf',index=False,layer_options={'SPATIAL_INDEX':'NO'})
    check=gpd.read_file(target)
    assert list(check.columns)==list(joined.columns)
    assert check.CD_MUN.tolist()==joined.CD_MUN.tolist()
    np.testing.assert_allclose(check[values.columns].to_numpy(),joined[values.columns].to_numpy(),rtol=0,atol=0,equal_nan=True)
    normalized=joined.geometry.map(lambda g: MultiPolygon([g]) if g.geom_type=='Polygon' else g)
    assert all(a.equals_exact(b,0) for a,b in zip(check.geometry,normalized)) and check.crs==joined.crs
    dic=dic.rename(columns={'campo':'campo_original','camada':'camada_anterior'})
    dic.insert(0,'ordem_atributo',range(5,5+len(dic)))
    dic.insert(1,'campo',dic.campo_original.map(renamed))
    dic.to_csv(OUT/'dicionario_campos.csv',index=False,encoding='utf-8-sig')
    q=ET.Element('qgis',styleCategories='Fields')
    aliases=ET.SubElement(q,'aliases')
    for r in dic.itertuples():
        ET.SubElement(aliases,'alias',field=r.campo,index=str(r.ordem_atributo-1),name=f'{r.tema[3:]} | T{r.tabela} | {r.variavel} ({r.unidade}) | {r.categorias}')
    ET.ElementTree(q).write(OUT/'SP_Censo2022_completo.qml',encoding='utf-8',xml_declaration=True)
    audit={'arquivo':target.name,'municipios':len(check),'campos_censo':len(values.columns),'atributos_totais':len(check.columns)-1,'ordem':'CD_MUN, NM_MUN, SIGLA_UF, AREA_KM2, campos por tema e tabela','temas':dic.tema.drop_duplicates().tolist(),'crs':str(check.crs),'verificacoes':{'ordem_colunas':'OK','codigos_municipais':'OK','valores_e_nulos_sem_diferencas':'OK','geometrias_preservadas':'OK','crs_preservado':'OK'},'validacao_visual_qgis':False}
    (OUT/'validacao.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'LEIA_ME.md').write_text('''# Camada unica — Censo 2022, municipios de Sao Paulo

Abra `SP_Censo2022_completo.fgb` como camada vetorial. Todos os 645 municipios e os 6.159 campos censitarios estao na mesma camada e na mesma tabela de atributos, sem necessidade de joins.

As quatro primeiras colunas identificam o municipio e a area original. Em seguida, os campos estao lado a lado por tema e, dentro do tema, por tabela de origem. Os prefixos dos nomes identificam os temas. `dicionario_campos.csv` informa a ordem exata, a descricao, a unidade, as categorias e as fontes de cada campo.

O arquivo e FlatGeobuf (.fgb), nao ESRI Shapefile (.shp). Foi utilizado para preservar todos os 6.159 campos numa unica camada, sem exceder as limitacoes do DBF do shapefile. Os arquivos anteriores foram preservados.

O arquivo .qml fornece aliases auxiliares para QGIS; a ordem tematica ja esta fisicamente gravada no .fgb e independe dele. Nao houve validacao visual no QGIS. A releitura pelo GDAL/GeoPandas confirmou os valores, nulos, ordem das colunas, codigos, coordenadas e CRS, sem diferencas. Poligonos simples foram representados como MultiPolygon de uma parte para uniformizar o tipo geometrico, sem alterar limites ou coordenadas.

O conteudo e a selecao de 114 tabelas sao os mesmos da entrega anterior. Permanecem as distincoes entre universo e amostra, os 46 campos integralmente nulos e os cuidados com totais/subtotais e categorias sobrepostas. Consulte tambem `../LEIA_ME.md` para as notas completas.
''',encoding='utf-8')
    print(json.dumps(audit,ensure_ascii=False))
    print('Tamanho MB:',round(target.stat().st_size/1e6,2))

if __name__=='__main__':main()
