"""Geometrias sintéticas somente nos testes; motor GDAL/OGR real."""
import json
from uuid import uuid4

import geopandas as gpd
import pytest
from shapely.geometry import LineString, Point, box

from api.services.extracao_atributos_analise import analisar

X,Y=5000000,7000000
def frame(geometries,**columns):
    return gpd.GeoDataFrame(columns,geometry=geometries,crs=5880)

def group(*bases):
    return [{'id':'risco','nome':'Risco','conceito':'Categoria de teste','camadas':[
        {'id':str(i),'nome':f'Base {i}','frame':f} for i,f in enumerate(bases)]}]

def test_linha_extrai_atributos_e_nao_soma_bases_sobrepostas():
    source=frame([LineString([(X,Y),(X+100,Y)])],demanda=['Ferrovia'])
    base=frame([box(X+10,Y-10,X+60,Y+10)],nome=['Área de teste'])
    result,output=analisar(source,group(base,base))
    assert result['resumo']['percentual']==pytest.approx(50,abs=.0001)
    assert result['categorias'][0]['resumo']['medida_unica_si']==pytest.approx(50,abs=.0001)
    assert len(output)==2
    row=result['categorias'][0]['camadas'][0]['ocorrencias'][0]
    assert row['atributos']['nome']=='Área de teste'
    assert row['atributos_input']['demanda']=='Ferrovia'

def test_toque_pontual_nao_aparece_em_resultados_de_linha():
    source=frame([LineString([(X,Y),(X+100,Y)])])
    base=frame([box(X+100,Y,X+110,Y+10)])
    result,output=analisar(source,group(base))
    assert result['resumo']['ocorrencias']==0
    assert result['resumo']['percentual']==0
    assert output.empty

def test_poligono_unidades_area_e_toque_de_borda():
    source=frame([box(X,Y,X+100,Y+100)])
    base=frame([box(X+50,Y,X+150,Y+100)])
    result,_=analisar(source,group(base))
    assert result['resumo']['medida_unica_si']==pytest.approx(5000,abs=.01)
    assert result['resumo']['percentual']==pytest.approx(50,abs=.001)

def test_pontos_dentro_fora_e_limite_sem_medidas():
    source=frame([Point(X+5,Y+5),Point(X+20,Y+20),Point(X,Y)])
    result,_=analisar(source,group(frame([box(X,Y,X+10,Y+10)])))
    layer=result['categorias'][0]['camadas'][0]
    assert layer['estatisticas']=={'pontos_dentro':2,'pontos_fora':1}
    assert sorted(r['dentro'] for r in layer['ocorrencias'])==[False,True,True]
    assert all('medida_si' not in r for r in layer['ocorrencias'])

def test_identity_preserva_exterior_sem_contar_como_extracao():
    source=frame([LineString([(X,Y),(X+100,Y)])])
    result,output=analisar(source,group(frame([box(X+25,Y-10,X+75,Y+10)])),'identity')
    assert result['resumo']['percentual']==pytest.approx(50,abs=.001)
    assert output.externo.fillna(False).any()

def test_estatisticas_incluem_feicoes_nao_atingidas():
    source=frame([LineString([(X,Y),(X+100,Y)]),LineString([(X,Y+100),(X+100,Y+100)])])
    result,_=analisar(source,group(frame([box(X-1,Y-10,X+50,Y+10)])))
    s=result['categorias'][0]['estatisticas']
    assert s['n']==2
    assert s['media']==pytest.approx(25,abs=.001)
    assert s['desvio_padrao']==pytest.approx(25,abs=.001)

def test_sem_crs_nao_e_aceito():
    with pytest.raises(ValueError,match='CRS'):
        analisar(gpd.GeoDataFrame(geometry=[Point(0,0)]),[])

def completed():
    source=frame([LineString([(X,Y),(X+100,Y)])],nome=['Demanda ferroviária'])
    result,_=analisar(source,group(frame([box(X+25,Y-10,X+75,Y+10)],nome=['Área contaminada'],formula=['=1+1'])))
    result.update(id=str(uuid4()),input_nome='Teste de relatório - demanda ferroviária',criado_em='2026-09-09',motor='GDAL/OGR',gdal='verificado em teste')
    return result

def completed_com_tabela():
    from api.services.extracao_atributos_saida import montar
    source=frame([LineString([(X,Y),(X+100,Y)])],nome=['Demanda ferroviária'])
    result,longa=analisar(source,group(frame([box(X+25,Y-10,X+75,Y+10)],nome=['Área contaminada'],formula=['=1+1'])))
    result.update(id=str(uuid4()),input_nome='Teste de relatório - demanda ferroviária',criado_em='2026-09-09',motor='GDAL/OGR',gdal='verificado em teste')
    tabela,result['tabela_saida']=montar(result,longa,source)
    return result,tabela

def test_tabela_de_saida_prefixa_categoria_e_camada_e_mede_pela_dimensao():
    from api.services.extracao_atributos_saida import montar
    source=frame([box(X,Y,X+100,Y+100)],demanda=['Área da demanda'])
    result,longa=analisar(source,group(frame([box(X+50,Y,X+150,Y+100)],nome=['Base A'])))
    tabela,estrutura=montar(result,longa,source)
    assert list(tabela.columns[:5])==['id_intersecao','categoria','camada_base','fid_entrada','demanda']
    assert tabela.loc[0,'risco__base_0__nome']=='Base A'
    assert tabela.loc[0,'risco__base_0__area_ha']==pytest.approx(0.5)
    assert estrutura['grupos'][0]['campos']==['risco__base_0__fid_base','risco__base_0__nome','risco__base_0__area_ha','risco__base_0__perc_entrada']
    source=frame([LineString([(X,Y),(X+100,Y)])])
    result,longa=analisar(source,group(frame([box(X+10,Y-10,X+60,Y+10)])))
    tabela,_=montar(result,longa,source)
    assert tabela.loc[0,'risco__base_0__comprimento_km']==pytest.approx(0.05)
    source=frame([Point(X+5,Y+5),Point(X+20,Y+20)])
    result,longa=analisar(source,group(frame([box(X,Y,X+10,Y+10)],nome=['Área'])))
    tabela,estrutura=montar(result,longa,source)
    assert estrutura['fixos']==['id_ponto','fid_entrada'] and len(tabela)==2, 'uma linha por ponto'
    assert list(tabela['risco__base_0__presenca'])==['sim','não']
    assert tabela.loc[0,'risco__base_0__nome']=='Área'

def test_arquivos_saem_da_tabela_de_saida_e_protegem_formulas(tmp_path):
    from api.services import extracao_atributos_exportacao as exports
    from pypdf import PdfReader
    from openpyxl import load_workbook
    result,tabela=completed_com_tabela()
    from api.services import extracao_atributos_relatorios as relatorios
    relatorios.pdf_processamento(result,tabela,_processamento(result,tabela),tmp_path/'processamento.pdf',[])
    exports.escrever_csv(tabela,tmp_path/'tabela.csv')
    exports.escrever_xlsx(tabela,result['tabela_saida'],tmp_path/'tabela.xlsx')
    text=' '.join(p.extract_text() for p in PdfReader(tmp_path/'processamento.pdf').pages)
    for trecho in ['Tabela de atributos da geometria de saída','Por categoria','Por camada base','Área contaminada',
                   'Resultados técnicos','medida_unica_si']:
        assert trecho in text, 'a análise em tabelas vai para o relatório de processamento: '+trecho
    conteudo=(tmp_path/'tabela.csv').read_text(encoding='utf-8-sig')
    assert conteudo.splitlines()[0].startswith('id_intersecao;categoria;camada_base;fid_entrada;nome;risco__base_0__fid_base')
    assert "'=1+1" in conteudo and '0,05' in conteudo
    sheet=load_workbook(tmp_path/'tabela.xlsx')['Tabela de atributos']
    assert sheet['A1'].value=='Identificação' and 'Risco' in [c.value for c in sheet[1]]
    assert 'Base 0' in [c.value for c in sheet[2]] and 'risco__base_0__comprimento_km' in [c.value for c in sheet[3]]
    assert exports.safe('=1+1')=="'=1+1"
    assert len(exports.celula_xlsx('x'*40000))==exports.LIMITE_CELULA_XLSX, 'célula longa é cortada, não derruba o pacote'

def _processamento(result,saida,nome='Extração de teste — ferrovia'):
    return {'execucao_id':result['id'],'nome_saida':nome,'responsavel':'teste','operacao':'intersection',
            'opcoes':{'promover_multipartes':True},'iniciado_em':'2026-09-14T12:00:00+00:00',
            'finalizado_em':'2026-09-14T12:00:05+00:00','duracao_segundos':5.0,
            'entrada':{'id':'storage:base-geoespacial/vetor/x.gpkg::x','nome':'Demanda ferroviária','origem':'storage',
                       'arquivo':'base-geoespacial/vetor/x.gpkg','feicoes':1,'crs':'EPSG:5880','tamanho_bytes':1000,
                       'modificado_em':'2026-09-14T11:00:00+00:00','sha256':'a'*64},
            'bases':[{'categoria':'Risco','nome':'Base 0','arquivo':'base-geoespacial/vetor/b.gpkg','feicoes':1,
                      'tamanho_bytes':2000,'modificado_em':'2026-09-14T11:00:00+00:00','sha256':'b'*64}],
            'saida':{'camada_resultado_id':'camada_teste','feicoes':len(saida),'ocorrencias':1,'camadas_intersectadas':1},
            'etapas':[{'em':'2026-09-14T12:00:01+00:00','mensagem':'Carregando entrada e bases'}],
            'ambiente':{'Motor':'GDAL/OGR'}}

@pytest.mark.parametrize('com_ocorrencia',[True,False])
def test_pacote_leva_geometria_relatorios_e_tabelas(tmp_path,com_ocorrencia):
    import io, zipfile
    from hashlib import sha256
    import pyogrio
    from pypdf import PdfReader
    from api.services.extracao_atributos_pacote import montar_pacote
    from api.services.extracao_atributos_saida import montar
    source=frame([LineString([(X,Y),(X+100,Y)])],nome=['Demanda ferroviária'])
    base=box(X+25,Y-10,X+75,Y+10) if com_ocorrencia else box(X+100,Y,X+110,Y+10)
    result,longa=analisar(source,group(frame([base],nome=['Área contaminada'])))
    result.update(id=str(uuid4()),input_nome='Demanda ferroviária',criado_em='2026-09-14',gdal='teste')
    tabela,result['tabela_saida']=montar(result,longa,source)
    bases=[('Risco','Área contaminada',frame([base],nome=['Área contaminada']))]
    pacote,nome,manifesto=montar_pacote(result,tabela,source,_processamento(result,tabela),bases=bases,
                                        mapa_base=False,intersecoes=longa)
    assert nome=='extracao_de_teste_ferrovia.zip'
    assert [item['chave'] for item in manifesto]==['gpkg','pdf_processamento','pdf_analitico','xlsx','csv']
    with zipfile.ZipFile(io.BytesIO(pacote)) as arquivo:
        assert arquivo.namelist()==[item['nome'] for item in manifesto]
        for item in manifesto:
            assert sha256(arquivo.read(item['nome'])).hexdigest()==item['sha256']
        conteudo_processamento=arquivo.read(manifesto[1]['nome'])
        texto=' '.join(p.extract_text() for p in PdfReader(io.BytesIO(conteudo_processamento)).pages)
        (tmp_path/'r.gpkg').write_bytes(arquivo.read(manifesto[0]['nome']))
        analitico=PdfReader(io.BytesIO(arquivo.read(manifesto[2]['nome'])))
    assert 'Relatório de processamento' in texto and 'Carregando entrada e bases' in texto and 'Base 0' in texto
    assert 'execucao_id' in texto and 'promover_multipartes' in texto, 'cabeçalho do processamento com nomes brutos'
    from reportlab.lib.pagesizes import A4
    for relatorio in (PdfReader(io.BytesIO(conteudo_processamento)),analitico):
        largura,altura=(float(v) for v in relatorio.pages[0].mediabox.upper_right)
        assert (round(largura),round(altura))==(round(A4[0]),round(A4[1])), 'A4 retrato'
    texto_analitico=' '.join(p.extract_text() for p in analitico.pages)
    for trecho in ['Relatório analítico','Promover a multipartes','Resumo executivo','Mapa de localização',
                   'O que se pode concluir','Dicionário de aliases','Feição da entrada']:
        assert trecho in texto_analitico, trecho
    assert 'promover_multipartes' not in texto_analitico.split('Dicionário de aliases')[0], 'analítico usa aliases'
    assert any(p.images for p in analitico.pages), 'o relatório analítico traz o mapa de localização'
    assert {nome for nome,_ in pyogrio.list_layers(tmp_path/'r.gpkg')}=={'resultado','entrada'}
    info=pyogrio.read_info(tmp_path/'r.gpkg',layer='resultado')
    assert info['features']==len(tabela) and info['crs']=='EPSG:4674'
    assert 'risco__base_0__comprimento_km' in list(info['fields'])
    assert pyogrio.read_info(tmp_path/'r.gpkg',layer='entrada')['features']==1


def test_api_rejeita_sem_sessao():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.extracao_atributos import router
    app=FastAPI();app.include_router(router)
    with TestClient(app) as client:
        assert client.get('/extracao-atributos/catalogo').status_code==401
        assert client.get('/extracao-atributos/execucoes').status_code==401
        assert client.post('/extracao-atributos/execucoes',json={}).status_code==401
        ident='00000000-0000-0000-0000-000000000000'
        assert client.patch(f'/extracao-atributos/execucoes/{ident}',json={'nome_saida':'x'}).status_code==401
        assert client.delete(f'/extracao-atributos/execucoes/{ident}').status_code==401
        assert client.get(f'/extracao-atributos/execucoes/{ident}/pacote').status_code==401
        assert client.get(f'/extracao-atributos/execucoes/{ident}/relatorios/analitico').status_code==401
    from api.services.extracao_atributos import FORMATOS_PACOTE
    assert FORMATOS_PACOTE==('zip','pdf_processamento','pdf_analitico'), 'componentes do pacote não são baixados avulsos'


def test_indice_de_extracoes_e_o_destino_do_card_e_leva_a_nova_extracao():
    from fastapi.testclient import TestClient
    from api.server import app
    client=TestClient(app)
    indice=client.get('/restrict/geoespacial/extracoes-atributos/')
    assert indice.status_code==200
    assert 'class="standard-section-action-row"' in indice.text and 'Nova extração' in indice.text
    assert 'href="/restrict/geoespacial/extracao-atributos/"' in indice.text
    assert 'class="admin-table ea-indice-tabela"' in indice.text and 'mad-filter--composite' in indice.text
    assert indice.text.index('class="col-select"') < indice.text.index('>Ação</th>') < indice.text.index('Data da extração')
    for botao in ['ea-indice-bulk-edit','ea-indice-bulk-cancel','ea-indice-bulk-save','ea-indice-bulk-delete']:
        assert f'id="{botao}"' in indice.text, botao
    assert 'ea-indice-arquivo' not in indice.text, 'sem seletor de arquivos: só o pacote é baixado'
    central=client.get('/restrict/geoespacial/').text
    assert 'href="/restrict/geoespacial/extracoes-atributos/" class="card-extracao-de-atributos' in central


def test_visualizador_de_camadas_aponta_para_a_tabela_de_extracoes():
    from fastapi.testclient import TestClient
    from api.server import app
    pagina=TestClient(app).get('/restrict/geoespacial/visualizador-camadas/')
    assert pagina.status_code==200
    assert 'href="/restrict/geoespacial/extracoes-atributos/"' in pagina.text
    assert 'geoespacial-visualizador-camadas.js' in pagina.text
    assert '/restrict/geoespacial/visualizador-bases-geoespaciais/' not in pagina.text.split('geo-sidebar-mini-nav',1)[1].split('</nav>',1)[0]


def test_aliases_usam_biblioteca_dicionario_e_regra_automatica():
    from api.services import extracao_atributos_aliases as aliases
    storage='storage:base-geoespacial/vetor/terras_indigenas_sp.gpkg::terras_indigenas_sp'
    assert aliases.camada(storage,'terras_indigenas_sp')['origem']==aliases.ORIGEM_BIBLIOTECA
    ucs=aliases.camada(None,'ucs_protecao_integral_sp')
    assert ucs['nome']=='Unidades de Conservação de Proteção Integral' and ucs['campo_nome']=='nome_uc'
    assert aliases.camada(None,'camada_desconhecida')['origem']==aliases.ORIGEM_AUTOMATICA
    estrutura={'entrada':['demanda'],'grupos':[{'prefixo':'ambiental__ucs_protecao_integral_sp__',
        'camada_id':'storage:base-geoespacial/vetor/ucs_protecao_integral_sp.gpkg::ucs_protecao_integral_sp',
        'camada':'ucs_protecao_integral_sp'}]}
    assert aliases.campo('ambiental__ucs_protecao_integral_sp__nome_uc',estrutura)==('Nome da UC',aliases.ORIGEM_DICIONARIO)
    assert aliases.campo('ambiental__ucs_protecao_integral_sp__area_ha',estrutura)[0]=='Área atingida (ha)'
    assert aliases.campo('ambiental__ucs_protecao_integral_sp__co_gestor',estrutura)[1]==aliases.ORIGEM_AUTOMATICA
    assert aliases.opcao('pretestar_continencia')=='Pré-testar continência'


def test_json_de_aliases_cobre_campos_existentes_das_bases():
    import json
    from pathlib import Path
    dados=json.loads(Path('config/geoespacial/aliases_extracao_atributos.json').read_text(encoding='utf-8'))
    for chave,camada in dados['camadas'].items():
        assert camada.get('campo_nome') in camada['campos'], f'{chave}: o campo de nome precisa ter alias'
