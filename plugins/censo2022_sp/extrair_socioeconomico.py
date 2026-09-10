"""Extrai uma camada socioeconomica unica a partir da entrega censitaria validada."""
from pathlib import Path
from datetime import datetime, timezone
import json
import xml.etree.ElementTree as ET
import pandas as pd
import geopandas as gpd
import numpy as np

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'socioeconomico'
TEMAS=['05_educacao','06_renda','07_trabalho','08_habitacao_internet','04_saneamento']

def main():
    OUT.mkdir(exist_ok=True)
    dictionary=pd.read_csv(ROOT/'camada_unica/dicionario_campos.csv',keep_default_na=False)
    chosen=pd.concat([dictionary.loc[dictionary.tema==t].sort_values('ordem_atributo') for t in TEMAS],ignore_index=True)
    assert chosen.campo.is_unique and not chosen.empty
    fields=chosen.campo.tolist()
    base=['CD_MUN','NM_MUN','SIGLA_UF','AREA_KM2']
    source=gpd.read_file(ROOT/'camada_unica/SP_Censo2022_completo.fgb',columns=base+fields)
    source=source[base+fields+['geometry']]
    assert len(source)==645 and source.CD_MUN.is_unique
    assert source.CD_MUN.str.fullmatch('35[0-9]{5}').all()
    # Conferencia independente com as tabelas tematicas de origem.
    for t in TEMAS:
        sub=chosen.loc[chosen.tema==t]
        original=pd.read_csv(ROOT/'tabelas'/f'{t}.csv',dtype={'CD_MUN':str}).set_index('CD_MUN').reindex(source.CD_MUN)
        np.testing.assert_allclose(source[sub.campo].to_numpy(),original[sub.campo_original].to_numpy(),rtol=0,atol=0,equal_nan=True)
    target=OUT/'SP_Socioeconomico_Censo2022.fgb'
    source.to_file(target,driver='FlatGeobuf',index=False,layer_options={'SPATIAL_INDEX':'NO'})
    actual=gpd.read_file(target)
    assert actual.columns.tolist()==source.columns.tolist()
    assert actual.CD_MUN.tolist()==source.CD_MUN.tolist()
    assert actual.NM_MUN.tolist()==source.NM_MUN.tolist()
    np.testing.assert_allclose(actual[fields].to_numpy(),source[fields].to_numpy(),rtol=0,atol=0,equal_nan=True)
    assert actual.geometry.equals(source.geometry) and actual.crs==source.crs
    chosen['ordem_atributo']=range(5,5+len(chosen))
    chosen.to_csv(OUT/'dicionario_campos.csv',index=False,encoding='utf-8-sig')
    summary=chosen.groupby('tema',sort=False).agg(tabelas=('tabela','nunique'),campos=('campo','size')).reset_index()
    summary.to_csv(OUT/'resumo_temas.csv',index=False,encoding='utf-8-sig')
    q=ET.Element('qgis',styleCategories='Fields')
    aliases=ET.SubElement(q,'aliases')
    for r in chosen.itertuples():
        ET.SubElement(aliases,'alias',field=r.campo,index=str(r.ordem_atributo-1),name=f'{r.tema[3:]} | T{r.tabela} | {r.variavel} ({r.unidade}) | {r.categorias}')
    ET.ElementTree(q).write(target.with_suffix('.qml'),encoding='utf-8',xml_declaration=True)
    audit={'gerado_em_utc':datetime.now(timezone.utc).isoformat(),'municipios':len(actual),'campos_censitarios':len(fields),'atributos_totais':len(actual.columns)-1,'tabelas':int(chosen.tabela.nunique()),'temas_na_ordem':TEMAS,'crs':str(actual.crs),'campos_integralmente_nulos':int(actual[fields].isna().all().sum()),'releitura_e_ordem_dos_campos':'OK','valores_e_nulos_contra_tabelas_originais':'OK','valores_e_nulos_apos_exportacao':'OK','chaves_1_por_municipio':'OK','geometrias_e_crs':'OK','validacao_visual_qgis':False}
    (OUT/'validacao.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    lines=['# Dados socioeconômicos — municípios de São Paulo, Censo 2022','',
      f'Uma camada FlatGeobuf (.fgb), com {len(actual)} municípios, {len(fields)} campos censitários e {chosen.tabela.nunique()} tabelas de origem. O join por CD_MUN já está materializado.','',
      'Abra `SP_Socioeconomico_Censo2022.fgb` como camada vetorial. Na tabela de atributos, os campos estão lado a lado na ordem: educação, renda, trabalho, habitação/internet e saneamento. Dentro de cada tema, seguem a ordem das tabelas de origem. As quatro primeiras colunas são CD_MUN, NM_MUN, SIGLA_UF e AREA_KM2.','',
      'Este arquivo é um recorte dos dados do Censo 2022 já baixados do IBGE na entrega anterior. Não inclui fontes adicionais, PIB municipal, IDHM, Cadastro Único ou indicadores de outros anos. A escolha destes cinco temas define o recorte socioeconômico desta entrega.','',
      '`dicionario_campos.csv` identifica cada campo, ordem, variável, unidade, categorias, tabela e divulgação oficial. `resumo_temas.csv` apresenta a cobertura. O .qml contém aliases auxiliares; a ordem temática está gravada no próprio .fgb.','',
      'Os campos incluem totais, desdobramentos e percentuais publicados. Não representam indicadores todos distintos. Não some totais com subtotais ou categorias sobrepostas. Preserve a diferença entre resultados do universo e estimativas preliminares da amostra, identificados no dicionário. Percentuais mantêm o denominador da tabela oficial.','',
      'Valores ausentes e sigilosos permanecem nulos. O símbolo SIDRA "-" corresponde a zero absoluto e já havia sido convertido em zero na entrega original. Nenhum indicador foi recalculado e nenhum dado foi imputado.','',
      'Validação: 645 códigos municipais únicos, correspondência exata com as tabelas de origem, ordem dos campos, valores e nulos após exportação, geometrias e CRS EPSG:4674. Não foi realizada inspeção visual no QGIS. Detalhes em `validacao.json`.','',
      'Fontes: IBGE/SIDRA, Censo Demográfico 2022; malha municipal IBGE 2022. URLs específicas estão no dicionário. Dados brutos, consultas e notas completas permanecem na pasta anterior: `../fontes/`, `../documentacao/` e `../LEIA_ME.md`.','']
    (OUT/'LEIA_ME.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps(audit,ensure_ascii=False))
    print('Arquivo:',target,'MB:',round(target.stat().st_size/1e6,2))

if __name__=='__main__':main()
