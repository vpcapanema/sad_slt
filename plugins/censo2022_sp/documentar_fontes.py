"""Preserva paginas tematicas do SIDRA e vincula tabelas as divulgacoes."""
from preparar import ROOT,get,GROUPS
from concurrent.futures import ThreadPoolExecutor
import re,json,html

if __name__=='__main__':
    rooturl='https://sidra.ibge.gov.br'
    initial=get(rooturl+'/pesquisa/censo-demografico/demografico-2022/inicial').text
    links=sorted(set(re.findall(r'href=[\"\']([^\"\']*demografico-2022[^\"\']*)',initial)))
    out=ROOT/'fontes/paginas_sidra';out.mkdir(exist_ok=True)
    def run(link):
        text=get(rooturl+link).text
        (out/(link.rsplit('/',1)[-1]+'.html')).write_text(text,encoding='utf-8')
        heading=re.findall(r'<h3[^>]*>(.*?)</h3>',text,re.S)
        title=' | '.join(html.unescape(re.sub('<[^>]+>','',x)).strip() for x in heading)
        return {'url':rooturl+link,'titulo':title,'tabelas':sorted(set(map(int,re.findall(r'href="/tabela/(\d+)"',text))))}
    with ThreadPoolExecutor(max_workers=4) as pool: pages=list(pool.map(run,links))
    (ROOT/'documentacao/divulgacoes.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf-8')
    for group,ts in GROUPS.items():
        for t in ts:
            found=[p['titulo'] for p in pages if t in p['tabelas']]
            if not found:print('SEM DIVULGACAO',t)
    print('Paginas preservadas:',len(pages))
