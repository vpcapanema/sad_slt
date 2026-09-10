"""Documenta, reconcilia populacao com UF e empacota os produtos finais."""
from preparar import ROOT,API,get,GROUPS
import pandas as pd
import geopandas as gpd
import json,zipfile,hashlib,xml.etree.ElementTree as ET

if __name__=='__main__':
    audit=json.loads((ROOT/'documentacao/validacao.json').read_text(encoding='utf-8'))
    dic=pd.read_csv(ROOT/'documentacao/dicionario_variaveis.csv')
    df=pd.read_csv(ROOT/'tabelas/01_populacao.csv',dtype={'CD_MUN':str})
    field=dic.loc[(dic.tabela==4714)&(dic.variavel_id==93),'campo'].item()
    url=f'{API}/4714/periodos/2022/variaveis/93?localidades=N3[35]'
    uf=get(url).json()
    (ROOT/'fontes/populacao_uf_validacao.json').write_text(json.dumps({'url':url,'resposta':uf},ensure_ascii=False,indent=2),encoding='utf-8')
    total=float(uf[0]['resultados'][0]['series'][0]['serie']['2022'])
    assert df[field].sum()==total
    audit['populacao_soma_municipios']=int(df[field].sum())
    audit['populacao_uf_ibge']=int(total)
    audit['reconciliacao_populacao']='OK'
    audit['campos_totalmente_sem_valor_numerico']=int((dic.valores_numericos==0).sum())
    (ROOT/'documentacao/validacao.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    catalog=json.loads((ROOT/'fontes/catalogo_municipal.json').read_text(encoding='utf-8'))
    selected={t:g for g,ts in GROUPS.items() for t in ts}
    pd.DataFrame([dict(x,selecionada=int(x['id']) in selected,tema=selected.get(int(x['id']),'')) for x in catalog['agregados']]).to_csv(ROOT/'documentacao/cobertura_catalogo.csv',index=False,encoding='utf-8-sig')
    for layer,subset in dic.groupby('camada'):
        root=ET.Element('qgis',version='3.40',styleCategories='Fields')
        aliases=ET.SubElement(root,'aliases')
        for _,row in subset.iterrows():
            categories='' if pd.isna(row.categorias) else row.categorias
            alias=f"T{row.tabela} | {row.variavel} ({row.unidade}) | {categories}"
            ET.SubElement(aliases,'alias',field=row.campo,name=alias,index=str(list(subset.campo).index(row.campo)+4))
        ET.ElementTree(root).write(ROOT/'shapefiles'/layer/(layer+'.qml'),encoding='utf-8',xml_declaration=True)
    summary=dic.groupby('tema').agg(tabelas=('tabela','nunique'),campos=('campo','size'),camadas=('camada','nunique')).reset_index()
    summary.to_csv(ROOT/'documentacao/resumo_temas.csv',index=False,encoding='utf-8-sig')
    lines=['# Municipios de Sao Paulo — Censo Demografico 2022','',
      f"Base gerada em {audit['executado_em_utc']}. Fontes: IBGE, malha municipal 2022 e SIDRA, periodo 2022.",
      f"**645 municipios; {len(dic):,} campos de dados; 114 tabelas; 18 temas; {len(audit['camadas'])} camadas espaciais.**",'',
      '## Abrir os dados',
      '- QGIS: abra `SP_Censo2022.gpkg` e escolha as camadas tematicas.',
      '- Shapefile: abra o `.shp` na subpasta do tema em `shapefiles/`. Mantenha juntos `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg` e `.qml`.',
      '- A juncao ja esta materializada em cada camada: uma feicao por municipio, chave textual `CD_MUN` com 7 digitos. Nao e necessario fazer novo join.',
      '- `malha_original/` conserva os arquivos originais do IBGE; `fontes/SP_Municipios_2022.zip` conserva o download original.',
      '- `tabelas/` contem os mesmos dados sem geometria, por tema. Codificacao UTF-8, separador virgula, decimal ponto. Ao importar, mantenha CD_MUN como texto.',
      '- `documentacao/dicionario_variaveis.csv` relaciona campo, camada, tabela, variavel, unidade, categorias e divulgacao oficial. Ha uma copia dessa tabela no GeoPackage.',
      '- Os arquivos `.qml` oferecem aliases descritivos dos campos no QGIS. Sao auxiliares; os nomes fisicos dos campos continuam sendo os codigos do dicionario.', '',
      '## Escopo da selecao',
      'Selecao tematica ampla de 114 das '+str(len(catalog['agregados']))+' tabelas do catalogo municipal retornado pela API para 2022. Nao e uma extracao integral de todas as tabelas do Censo. A cobertura, incluindo tabelas nao selecionadas, esta em `documentacao/cobertura_catalogo.csv`.',
      'Foram extraidas todas as variaveis das tabelas selecionadas e todas as categorias de cada classificacao, abrindo uma classificacao de cada vez e mantendo as demais no Total. Quando uma classificacao nao possui Total, suas categorias sao mantidas explicitamente. Nao foram extraidos todos os cruzamentos simultaneos entre sexo, idade, cor/raca e outras dimensoes.',
      'Um campo representa uma combinacao de tabela + variavel + categorias. Portanto, a contagem de campos inclui desdobramentos, totais, percentuais oficiais e indicadores repetidos em tabelas diferentes. Nao corresponde a indicadores conceitualmente distintos.',
      'Os nomes V01000001, por exemplo, sao identificadores de campos da entrega, nao codigos de variaveis do IBGE. Os codigos oficiais constam no dicionario. Partes numeradas de um mesmo tema continuam tendo todos os 645 municipios; a divisao e de colunas, em ate 200 campos censitarios por arquivo.', '',
      '## Cuidados para a analise',
      '- Os resultados do universo e os resultados preliminares da amostra sao identificados pela divulgacao no dicionario. A amostra contem estimativas; preserve essa distincao e consulte as notas oficiais antes de comparacoes.',
      '- Os percentuais sao os publicados pelo IBGE, com os denominadores e recortes das respectivas tabelas. Nenhum percentual foi recalculado nesta entrega.',
      '- Categorias podem conter totais, subtotais e faixas etarias sobrepostas. Nao some todas as colunas indiscriminadamente.',
      '- Favelas, entorno urbano, populacao indigena e quilombola e outros recortes nao representam necessariamente toda a populacao ou todo o territorio do municipio.',
      '- Simbolo SIDRA `-` foi convertido em zero absoluto. `X`, `..`, `...`, faixas alfabeticas e municipios sem registro ficam nulos nos campos numericos; nunca foram imputados como zero.',
      '- `tabelas/*_originais.csv.gz` preserva os valores textuais; `documentacao/ausencias_e_simbolos.csv.gz` distingue os motivos de ausencia. Os JSON originais das consultas tambem estao preservados.',
      '- CRS mantido: '+audit['crs']+'. Geometrias originais preservadas, sem simplificacao ou reparo. Para medir distancias/areas, use um CRS projetado apropriado; AREA_KM2 e atributo original do IBGE.', '',
      '## Temas', '| Tema | Tabelas | Campos | Camadas |','|---|---:|---:|---:|']
    for _,r in summary.iterrows():lines.append(f'| {r.tema} | {r.tabelas} | {r.campos} | {r.camadas} |')
    lines += ['', '## Validacao',
      'Verificadas: 645 chaves unicas e validas, join 1:1, ausencia de codigos estranhos a malha, periodo 2022, nivel municipal, consistencia entre resultados repetidos, releitura dos shapefiles e do GeoPackage, preservacao dos valores numericos, CRS e geometrias dos shapefiles.',
      f'Soma da populacao dos municipios na tabela 4714: {int(total):,}; identica ao total estadual retornado pelo IBGE. Geometrias invalidas na origem: {audit["geometrias_invalidas_origem"]}. Campos integralmente sem valor numerico: {audit["campos_totalmente_sem_valor_numerico"]}.',
      'Resultados detalhados: `documentacao/validacao.json`. Nao foi feita validacao visual no aplicativo QGIS.', '',
      '## Fontes e reproducao',
      '- Malha: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/SP/',
      '- Censo: https://sidra.ibge.gov.br/pesquisa/censo-demografico/demografico-2022/inicial',
      '- API: https://servicodados.ibge.gov.br/api/docs/agregados?versao=3',
      '- Cada URL de consulta esta em `documentacao/consultas.json`; paginas tematicas e metadados foram preservados em `fontes/`.',
      '- Scripts: `preparar.py`, `documentar_fontes.py`, `gerar.py`, `finalizar.py`, nesta ordem. Dependencias utilizadas: requests, pandas, geopandas, numpy e pyogrio. Os scripts reutilizam as fontes baixadas; para uma atualizacao, execute em uma copia limpa para preservar esta entrega.',
      '- O ZIP de entrega contem os produtos e documentacao; as fontes brutas e os scripts permanecem nesta pasta.', '']
    (ROOT/'LEIA_ME.md').write_text('\n'.join(lines),encoding='utf-8')
    package=ROOT/'SP_Censo2022_entrega.zip'
    with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        paths=[ROOT/'LEIA_ME.md',ROOT/'SP_Censo2022.gpkg']
        for folder in ['shapefiles','tabelas','documentacao','malha_original']:paths.extend(p for p in (ROOT/folder).rglob('*') if p.is_file())
        for p in paths:z.write(p,p.relative_to(ROOT))
    with zipfile.ZipFile(package) as z:assert z.testzip() is None
    print('PACOTE',package,'MB',round(package.stat().st_size/1e6,1))
    print(summary.to_string(index=False))
