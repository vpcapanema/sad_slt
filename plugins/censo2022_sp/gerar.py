"""Extracao municipal oficial, recortes marginais, join 1:1 e exportacao GIS."""
from preparar import ROOT, API, GROUPS, metadata, get
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlencode
from datetime import datetime, timezone
import json, gzip, hashlib, math, sqlite3
import pandas as pd
import geopandas as gpd
import numpy as np

def jobs(t):
    m=metadata(t); cs=m['classificacoes']; result=[]
    # Cada dimensao aberta com as demais no Total. Sem Total: manter todas.
    base={c['id']:[x['id'] for x in c['categorias'] if x['nome']=='Total'] or [x['id'] for x in c['categorias']] for c in cs}
    for active in cs or [None]:
        sel={k:list(v) for k,v in base.items()}
        if active: sel[active['id']]=[x['id'] for x in active['categorias']]
        selections=[sel]
        if active:
            k=active['id']
            other=math.prod(len(v) for cid,v in sel.items() if cid!=k)
            chunk=max(1,40000//(645*len(m['variaveis'])*other))
            selections=[dict(sel,**{}) for _ in range(0,len(sel[k]),chunk)]
            for s,start in zip(selections,range(0,len(sel[k]),chunk)): s[k]=sel[k][start:start+chunk]
        for s in selections:
            params={'localidades':'N6[N3[35]]'}
            if s: params['classificacao']='|'.join(f'{k}[{",".join(map(str,v))}]' for k,v in s.items())
            url=f'{API}/{t}/periodos/2022/variaveis/all?'+urlencode(params)
            if url not in result: result.append(url)
    return result

def fetch(job):
    t,url=job; key=hashlib.sha256(url.encode()).hexdigest()[:16]
    p=ROOT/'fontes/dados'/f'{t}_{key}.json.gz'
    if p.exists():
        with gzip.open(p,'rt',encoding='utf-8') as f: data=json.load(f)
    else:
        data=get(url).json()
        if not isinstance(data,list) or not data or 'id' not in data[0]: raise ValueError(str(data)[:300])
        with gzip.open(p,'wt',encoding='utf-8') as f: json.dump(data,f,ensure_ascii=False)
    return t,url,str(p.relative_to(ROOT)),data

def main():
    for p in ['fontes/dados','tabelas','shapefiles','documentacao']: (ROOT/p).mkdir(exist_ok=True)
    geo=gpd.read_file(next((ROOT/'malha_original').glob('*.shp')))
    geo['CD_MUN']=geo.CD_MUN.astype(str)
    assert len(geo)==645 and geo.CD_MUN.is_unique and geo.CD_MUN.str.fullmatch('35[0-9]{5}').all()
    assert geo.geometry.notna().all() and not geo.geometry.is_empty.any()
    codes=set(geo.CD_MUN); columns={}; definitions={}; source_log=[]; failures=[]
    todo=[(t,u) for ts in GROUPS.values() for t in ts for u in jobs(t)]
    print(f'Consultas: {len(todo)}; tabelas: {sum(map(len,GROUPS.values()))}',flush=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures={pool.submit(fetch,j):j for j in todo}
        for i,f in enumerate(as_completed(futures),1):
            t,u=futures[f]
            try:
                t,url,path,data=f.result(); source_log.append({'tabela':t,'url':url,'arquivo':path})
                for var in data:
                    for res in var['resultados']:
                        cats=[]; labels=[]
                        for c in res['classificacoes']:
                            assert len(c['categoria'])==1
                            cid,label=next(iter(c['categoria'].items()))
                            cats.append((str(c['id']),str(cid))); labels.append(c['nome']+': '+label)
                        key=(t,str(var['id']),tuple(sorted(cats)))
                        values={}
                        for s in res['series']:
                            code=str(s['localidade']['id'])
                            assert code in codes, (t,code)
                            assert s['localidade']['nivel']['id']=='N6'
                            assert code not in values
                            if '2022' in s['serie']: values[code]=s['serie']['2022']
                        if key in columns:
                            assert columns[key]==values, f'Resultados inconsistentes {key}'
                        else:
                            columns[key]=values
                            definitions[key]={'tabela':t,'variavel_id':var['id'],'variavel':var['variavel'],'unidade':var['unidade'],'categorias':' | '.join(labels),'categorias_ids':json.dumps(cats),'fonte':metadata(t)['URL']}
            except Exception as e:
                failures.append({'tabela':t,'url':u,'erro':str(e)})
                print('FALHA',t,str(e)[:200],flush=True)
            if i%10==0 or i==len(todo): print(f'{i}/{len(todo)} consultas; {len(columns)} campos',flush=True)
    (ROOT/'documentacao/consultas.json').write_text(json.dumps(source_log,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'documentacao/falhas.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2),encoding='utf-8')
    if failures: raise RuntimeError('Ha consultas com falha; execute novamente para tentar completar o cache.')
    pages=json.loads((ROOT/'documentacao/divulgacoes.json').read_text(encoding='utf-8'))
    dictionary=[]; checks=[]; specials=[]
    for group,ts in GROUPS.items():
        keys=sorted(k for k in columns if k[0] in ts)
        vals={}; rawvals={}
        for idx,key in enumerate(keys,1):
            field=f'V{int(group[:2]):02d}{idx:06d}'
            raw=pd.Series(columns[key],dtype='string').reindex(geo.CD_MUN)
            numeric=pd.to_numeric(raw.replace({'-':'0'}),errors='coerce').astype(float)
            vals[field]=numeric.to_numpy(); rawvals[field]=raw.to_numpy()
            d=dict(definitions[key],tema=group,campo=field,municipios_com_registro=int(raw.notna().sum()),valores_numericos=int(numeric.notna().sum()))
            publications=[p for p in pages if key[0] in p['tabelas']]
            d['divulgacao']=' | '.join(p['titulo'] for p in publications)
            d['fonte_divulgacao']=' | '.join(p['url'] for p in publications)
            dictionary.append(d)
            for code,v in raw.items():
                if pd.isna(v) or (v!='-' and pd.isna(pd.to_numeric(v,errors='coerce'))):
                    specials.append({'CD_MUN':code,'campo':field,'valor_original':None if pd.isna(v) else v,'motivo':'municipio_sem_registro' if pd.isna(v) else 'simbolo_sidra'})
        df=pd.DataFrame(vals,index=geo.CD_MUN).reset_index()
        rawdf=pd.DataFrame(rawvals,index=geo.CD_MUN).reset_index()
        rawdf.to_csv(ROOT/'tabelas'/f'{group}_originais.csv.gz',index=False,encoding='utf-8-sig',compression='gzip')
        df.to_csv(ROOT/'tabelas'/f'{group}.csv',index=False,encoding='utf-8-sig')
        for part,start in enumerate(range(0,len(vals),200),1):
            fields=list(vals)[start:start+200]; name=f'{group}_{part:02d}'
            joined=geo[['CD_MUN','NM_MUN','SIGLA_UF','AREA_KM2','geometry']].merge(df[['CD_MUN']+fields],on='CD_MUN',how='left',validate='one_to_one')
            joined=joined[['CD_MUN','NM_MUN','SIGLA_UF','AREA_KM2']+fields+['geometry']]
            assert len(joined)==645 and joined.CD_MUN.is_unique
            dest=ROOT/'shapefiles'/name;dest.mkdir(exist_ok=True)
            joined.to_file(dest/f'{name}.shp',driver='ESRI Shapefile',encoding='UTF-8',index=False)
            joined.to_file(ROOT/'SP_Censo2022.gpkg',layer=name,driver='GPKG',index=False)
            reread=gpd.read_file(dest/f'{name}.shp')
            assert list(reread.columns)==list(joined.columns)
            assert list(reread.CD_MUN)==list(joined.CD_MUN)
            np.testing.assert_allclose(reread[fields].to_numpy(),joined[fields].to_numpy(),equal_nan=True,rtol=1e-12,atol=1e-10)
            assert reread.crs==geo.crs and reread.geometry.equals(joined.geometry)
            checks.append({'camada':name,'municipios':len(joined),'campos_censo':len(fields),'join':'1:1 por CD_MUN','leitura_shapefile':'OK'})
            for d in dictionary:
                if d['campo'] in fields: d['camada']=name
        print(f'Exportado {group}: {len(keys)} campos',flush=True)
    dic=pd.DataFrame(dictionary)
    dic.to_csv(ROOT/'documentacao/dicionario_variaveis.csv',index=False,encoding='utf-8-sig')
    pd.DataFrame(specials).to_csv(ROOT/'documentacao/ausencias_e_simbolos.csv.gz',index=False,encoding='utf-8-sig',compression='gzip')
    with sqlite3.connect(ROOT/'SP_Censo2022.gpkg') as con:
        dic.to_sql('dicionario_variaveis',con,if_exists='replace',index=False)
    for check in checks:
        reread=gpd.read_file(ROOT/'SP_Censo2022.gpkg',layer=check['camada'])
        assert len(reread)==645 and reread.CD_MUN.is_unique and reread.crs==geo.crs
        shp=gpd.read_file(ROOT/'shapefiles'/check['camada']/(check['camada']+'.shp'))
        fields=dic.loc[dic.camada==check['camada'],'campo'].tolist()
        np.testing.assert_allclose(reread[fields].to_numpy(),shp[fields].to_numpy(),equal_nan=True,rtol=1e-12,atol=1e-10)
        check['leitura_geopackage']='OK'
    audit={'executado_em_utc':datetime.now(timezone.utc).isoformat(),'municipios':645,'crs':str(geo.crs),'geometrias_invalidas_origem':int((~geo.is_valid).sum()),'tabelas':sum(map(len,GROUPS.values())),'temas':len(GROUPS),'campos':len(dictionary),'consultas':len(source_log),'falhas':failures,'camadas':checks}
    (ROOT/'documentacao/validacao.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in audit.items() if k!='camadas'},ensure_ascii=False),flush=True)

if __name__=='__main__': main()
