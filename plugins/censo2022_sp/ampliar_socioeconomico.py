"""Integra indicadores oficiais de desenvolvimento, economia e Censo por CD_MUN."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import requests,json,re,html,zipfile
import xml.etree.ElementTree as ET
import pandas as pd
import geopandas as gpd
import numpy as np

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'socioeconomico_desenvolvimento'
PESQ='https://servicodados.ibge.gov.br/api/v1/pesquisas'
IPEA='https://www.ipeadata.gov.br/api/odata4'
ADH={
 'idh':['ADH_IDHM','ADH_IDHM_E','ADH_IDHM_L','ADH_IDHM_R'],
 'pobreza_desigualdade':['ADH_GINI','ADH_THEIL','ADH_PIND','ADH_PMPOB','ADH_PPOB','ADH_PREN10RICOS','ADH_PREN40','ADH_R1040','ADH_RDPC','ADH_RDPC1','ADH_RDPC2','ADH_RDPC3','ADH_RDPC4','ADH_RDPC5','ADH_RDPC10'],
 'desenvolvimento_humano':['ADH_ESPVIDA','ADH_FECTOT','ADH_MORT1','ADH_MORT5','ADH_RAZDEP','ADH_SOBRE40','ADH_SOBRE60']}
ECON={46997:'pib_mil_reais',47001:'pib_per_capita_reais',47004:'vab_total_mil_reais',47006:'vab_agropecuaria_mil_reais',47007:'vab_industria_mil_reais',47008:'vab_servicos_mil_reais',47009:'vab_administracao_mil_reais',47022:'impostos_mil_reais'}

def fetch(name,url):
    path=OUT/'fontes'/f'{name}.json'
    if path.exists():return json.loads(path.read_text(encoding='utf-8'))
    for attempt in range(3):
        try:
            r=requests.get(url,timeout=90);r.raise_for_status();data=r.json()
            if isinstance(data,dict) and 'statusCode' in data:raise ValueError(str(data))
            path.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8');return data
        except requests.RequestException:
            if attempt==2:raise

def flatten(nodes,parents=()):
    result={}
    for n in nodes:
        labels=parents+(n['indicador'],)
        if n.get('classe')=='I':result[n['id']]=dict(n,descricao=' / '.join(labels))
        result.update(flatten(n.get('children',[]),labels))
    return result

def main():
    (OUT/'fontes').mkdir(parents=True,exist_ok=True)
    census=gpd.read_file(ROOT/'socioeconomico/SP_Socioeconomico_Censo2022.fgb').set_index('CD_MUN')
    codes=list(census.index);mapping={c[:6]:c for c in codes}
    assert len(mapping)==645 and len(codes)==645
    pd.DataFrame({'codigo_fonte_6':list(mapping),'CD_MUN':list(mapping.values())}).to_csv(OUT/'correspondencia_codigos.csv',index=False)
    meta_ipea=fetch('ipeadata_metadados',IPEA+'/Metadados')
    im={x['SERCODIGO']:x for x in meta_ipea['value']}
    research=fetch('ibge_pesquisas',PESQ)
    configurations=[(38,2023,[46997,47001],'economia'),(38,2022,[46997,47001],'economia'),(38,2021,list(ECON),'economia'),(19,2024,None,'empresas_emprego'),(21,2025,None,'financas_publicas'),(40,2025,None,'ideb')]
    jobs=[];definitions={}
    for group,series in ADH.items():
        for s in series:jobs.append(('ipea',group,s,f"{IPEA}/Metadados('{s}')/Valores"))
    for p,y,ids,group in configurations:
        m=fetch(f'ibge_{p}_{y}_metadados',f'{PESQ}/{p}/periodos/{y}/indicadores')
        fm=flatten(m);definitions[(p,y)]=fm
        ids=ids or list(fm)
        for start in range(0,len(codes),100):
            local='|'.join(c[:6] for c in codes[start:start+100])
            indicators='|'.join(map(str,ids))
            url=f'{PESQ}/{p}/periodos/{y}/indicadores/{indicators}/resultados/{local}'
            jobs.append(('ibge',group,(p,y,start),url))
    values={};details={};manifest=[];raw_records=[]
    def run(j):
        kind,group,key,url=j
        name=('ipea_'+key) if kind=='ipea' else 'ibge_'+'_'.join(map(str,key))
        return j,name,fetch(name,url)
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i,f in enumerate(as_completed([pool.submit(run,j) for j in jobs]),1):
            (kind,group,key,url),name,data=f.result()
            manifest.append({'arquivo':f'fontes/{name}.json','url':url})
            if kind=='ipea':
                assert not data.get('@odata.nextLink'), 'Paginacao Ipea inesperada'
                m=im[key]
                for r in data['value']:
                    code=str(r['TERCODIGO']);year=int(r['VALDATA'][:4])
                    if r['NIVNOME']!='Municípios' or code not in mapping.values() or year!=2010:continue
                    field=f'{group}_{key.removeprefix("ADH_").lower()}_{year}'
                    assert code not in values.setdefault(field,{})
                    values[field][code]=r['VALVALOR']
                    details[field]={'tema':group,'campo':field,'ano':year,'indicador':m['SERNOME'],'unidade':m['UNINOME'],'multiplicador':m['MULNOME'],'fonte':'Ipeadata / '+m['FNTNOME'],'codigo_indicador':key,'url_fonte':url,'definicao':html.unescape(re.sub('<[^>]+>',' ',m['SERCOMENTARIO'])),'nota':'Referencia historica de 2010; nao e um indicador de 2022.'}
            else:
                p,y,start=key;md=definitions[(p,y)]
                for indicator in data:
                    iid=indicator['id']
                    assert iid in md,(p,iid)
                    m=md[iid];unit=m.get('unidade',{})
                    field=f'economia_{ECON[iid]}_{y}' if p==38 else f'{group}_i{iid}_{y}'
                    period=next(r for r in research if r['id']==p)
                    period_note=next((r for r in period['periodos'] if r['periodo']==str(y)),{})
                    details[field]={'tema':group,'campo':field,'ano':y,'indicador':m['descricao'],'unidade':unit.get('id','indice'),'multiplicador':unit.get('multiplicador',1),'fonte':'IBGE / '+period['nome'],'codigo_indicador':iid,'url_fonte':f'{PESQ}/{p}/periodos/{y}/indicadores/{iid}/resultados/350010','definicao':m['descricao'],'nota':json.dumps({'periodo':period_note,'indicador':m.get('nota',[])},ensure_ascii=False)}
                    bucket=values.setdefault(field,{})
                    for r in indicator.get('res',[]):
                        code=mapping.get(str(r['localidade']))
                        assert code is not None,r['localidade']
                        assert code not in bucket,(field,code)
                        raw=r['res'].get(str(y));bucket[code]=raw
                        raw_records.append({'CD_MUN':code,'campo':field,'valor_original':raw,'nota_original':json.dumps(r.get('notas',{}),ensure_ascii=False)})
            if i%10==0 or i==len(jobs):print('Consultas adicionais',i,'/',len(jobs),flush=True)
    # Nunca converter simbolos da API Pesquisas em zero sem interpretacao especifica.
    nums={k:pd.to_numeric(pd.Series(v).reindex(codes),errors='coerce') for k,v in values.items()}
    excluded=[k for k,v in nums.items() if v.notna().sum()==0]
    order=['idh','pobreza_desigualdade','desenvolvimento_humano','economia','empresas_emprego','financas_publicas','ideb']
    fields=sorted([k for k in nums if k not in excluded],key=lambda k:(order.index(details[k]['tema']),str(details[k]['codigo_indicador']),details[k]['ano']))
    added=pd.DataFrame({k:nums[k] for k in fields},index=pd.Index(codes,name='CD_MUN'))
    assert added['idh_idhm_2010'].notna().sum()==645
    assert added.loc['3548807','idh_idhm_2010']==0.862
    assert added.loc['3550308','idh_idhm_2010']==0.805
    assert added.loc['3500600','idh_idhm_2010']==0.854
    for k in fields:
        if details[k]['tema']=='idh':assert added[k].dropna().between(0,1).all()
    cd=pd.read_csv(ROOT/'socioeconomico/dicionario_campos.csv',keep_default_na=False)
    census_fields=cd.campo.tolist()
    rename={k:k+'_2022' for k in census_fields}
    result=gpd.GeoDataFrame(pd.concat([census[['NM_MUN','SIGLA_UF','AREA_KM2']],added,census[census_fields].rename(columns=rename),census[['geometry']]],axis=1),geometry='geometry',crs=census.crs).reset_index()
    target=OUT/'SP_Socioeconomico_Desenvolvimento.fgb'
    result.to_file(target,driver='FlatGeobuf',index=False,layer_options={'SPATIAL_INDEX':'NO'})
    reread=gpd.read_file(target)
    assert result.columns.tolist()==reread.columns.tolist() and result.CD_MUN.tolist()==reread.CD_MUN.tolist()
    allfields=fields+list(rename.values())
    np.testing.assert_allclose(result[allfields].to_numpy(),reread[allfields].to_numpy(),equal_nan=True,rtol=0,atol=0)
    assert result.geometry.equals(reread.geometry) and result.crs==reread.crs
    records=[details[k]|{'municipios_com_valor':int(added[k].notna().sum())} for k in fields]
    for r in cd.to_dict('records'):
        records.append({'campo':rename[r['campo']],'tema':r['tema'],'ano':2022,'indicador':r['variavel'],'unidade':r['unidade'],'multiplicador':1,'fonte':'IBGE / Censo 2022 / '+r['divulgacao'],'codigo_indicador':r['variavel_id'],'url_fonte':r['fonte'],'definicao':r['categorias'],'nota':f"Tabela {r['tabela']}; {r['divulgacao']}",'municipios_com_valor':r['valores_numericos']})
    dictionary=pd.DataFrame(records);dictionary.insert(0,'ordem_atributo',range(5,5+len(dictionary)))
    dictionary.to_csv(OUT/'dicionario_campos.csv',index=False,encoding='utf-8-sig')
    added.reset_index().to_csv(OUT/'indicadores_adicionais.csv',index=False,encoding='utf-8-sig')
    pd.DataFrame(raw_records).to_csv(OUT/'valores_originais_ibge.csv.gz',index=False,encoding='utf-8-sig',compression='gzip')
    (OUT/'consultas.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    q=ET.Element('qgis',styleCategories='Fields');aliases=ET.SubElement(q,'aliases')
    for r in dictionary.itertuples():ET.SubElement(aliases,'alias',field=r.campo,index=str(r.ordem_atributo-1),name=f'{r.ano} | {r.indicador} | {r.definicao}')
    ET.ElementTree(q).write(target.with_suffix('.qml'),encoding='utf-8',xml_declaration=True)
    summary=dictionary.groupby(['tema','ano'],sort=False).agg(campos=('campo','size'),min_municipios_com_valor=('municipios_com_valor','min'),max_municipios_com_valor=('municipios_com_valor','max')).reset_index()
    summary.to_csv(OUT/'resumo_temas.csv',index=False,encoding='utf-8-sig')
    audit={'gerado_em_utc':datetime.now(timezone.utc).isoformat(),'municipios':645,'campos_adicionais':len(fields),'campos_censo':len(census_fields),'campos_total':len(allfields),'atributos_total':len(allfields)+4,'join_por_codigo':'OK 1:1','codigo_ibge_6_para_7':'Correspondencia bijetiva baseada na malha original, 645 codigos','valores_nulos_ordem_geometrias_crs':'OK na releitura','idhm_controle_pnud_tres_municipios':'OK','campos_excluidos_sem_valores':excluded,'validacao_visual_qgis':False}
    (OUT/'validacao.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    text=['# São Paulo — dados socioeconômicos e desenvolvimento','',f'Abra `SP_Socioeconomico_Desenvolvimento.fgb`: uma camada, 645 municípios, {len(allfields)} campos de indicadores, mais quatro atributos da malha.','',
      'Os campos estão juntos por tema: IDHM; pobreza e desigualdade; desenvolvimento humano; PIB e estrutura econômica; empresas e emprego; finanças públicas; IDEB; e os cinco grupos socioeconômicos do Censo 2022. O ano faz parte de todos os nomes dos indicadores.','',
      '**Esta é uma base multitemporal, não uma fotografia de um único ano.** IDHM e indicadores do Atlas usam 2010; PIB e PIB per capita usam 2023 e 2022, com estrutura setorial de 2021; Cadastro Central de Empresas usa 2024; finanças públicas e IDEB usam 2025, conforme períodos retornados pela API oficial na coleta. Censo: 2022.','',
      'O IDHM inclui os componentes educação, longevidade e renda. Gini, Theil, pobreza, renda per capita e os demais indicadores históricos preservam as definições do Atlas, inclusive as linhas monetárias e os preços de 2010. Não interprete esses indicadores históricos como condições atuais.','',
      'PIB per capita mede produção econômica por habitante, não renda domiciliar. Os valores de PIB, valor adicionado e impostos estão em MIL REAIS; não foram multiplicados. Outras unidades e multiplicadores estão no dicionário. Valores de anos diferentes não foram deflacionados.','',
      'Os totais e subtotais oficiais foram preservados. Não somar total com componentes. O emprego do Cadastro Central de Empresas tem universo e referência diferentes da ocupação medida no Censo. As notas por indicador, período e origem estão no dicionário e nos JSON preservados.','',
      'Nas fontes adicionais, ausências e símbolos não numéricos permanecem nulos, sem imputação. Os valores textuais da API IBGE são preservados em `valores_originais_ibge.csv.gz`. Indicadores integralmente sem dados numéricos foram excluídos e listados em `validacao.json`. Na parcela do Censo mantém-se o tratamento anterior: o símbolo SIDRA "-" como zero absoluto.','',
      'A API de Pesquisas do IBGE retorna códigos de seis dígitos. Eles foram associados de maneira unívoca aos códigos de sete dígitos da malha, sem correspondência por nomes. O Ipeadata fornece códigos municipais de sete dígitos. Veja `correspondencia_codigos.csv`. Geometria e CRS SIRGAS 2000, EPSG:4674, mantidos da camada validada.','',
      'A API do IVS consultada no Ipeadata não retornou nível municipal. IVS não foi incluído nem substituído por valores estaduais.','',
      'Validação: 645 chaves únicas, cobertura por indicador, igualdade exata de valores/nulos e ordem após exportação, geometrias e CRS. IDHM de São Caetano do Sul, São Paulo e Águas de São Pedro conferido com a tabela pública do PNUD (https://www.undp.org/pt/brazil/idhm-municipios-2010). Não houve inspeção visual no QGIS.','',
      '`dicionario_campos.csv`: descrição, ano, unidade, fonte, notas e posição de cada campo. `indicadores_adicionais.csv`: somente os novos indicadores, sem geometria. `fontes/` e `consultas.json`: respostas e URLs de origem. O arquivo .qml oferece aliases auxiliares. As fontes brutas do Censo permanecem em `../fontes/`.','',
      '## Cobertura','', '| Tema | Ano | Campos | Municípios com valor (mín.–máx.) |','|---|---:|---:|---:|']
    for r in summary.itertuples():text.append(f'| {r.tema} | {r.ano} | {r.campos} | {r.min_municipios_com_valor}–{r.max_municipios_com_valor} |')
    (OUT/'LEIA_ME.md').write_text('\n'.join(text)+'\n',encoding='utf-8')
    print(json.dumps(audit,ensure_ascii=False),flush=True)
    print(summary.to_string(index=False),flush=True)

if __name__=='__main__':main()
