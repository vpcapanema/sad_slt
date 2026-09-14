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

def test_arquivos_reproduzem_resultado_e_protegem_formulas(tmp_path):
    from api.services import extracao_atributos_exportacao as exports
    from pypdf import PdfReader
    from openpyxl import load_workbook
    result=completed()
    exports.pdf(result,tmp_path/'analitico.pdf')
    exports.escrever_csv(result,tmp_path/'ocorrencias.csv')
    exports.escrever_xlsx(result,tmp_path/'ocorrencias.xlsx')
    text=' '.join(p.extract_text() for p in PdfReader(tmp_path/'analitico.pdf').pages)
    assert 'Área contaminada' in text and 'km' in text and 'Categoria de teste' in text
    book=load_workbook(tmp_path/'ocorrencias.xlsx');assert 'Estatísticas' in book.sheetnames
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
    source=frame([LineString([(X,Y),(X+100,Y)])],nome=['Demanda ferroviária'])
    base=box(X+25,Y-10,X+75,Y+10) if com_ocorrencia else box(X+100,Y,X+110,Y+10)
    result,saida=analisar(source,group(frame([base],nome=['Área contaminada'])))
    result.update(id=str(uuid4()),input_nome='Demanda ferroviária',criado_em='2026-09-14',gdal='teste')
    pacote,nome,manifesto=montar_pacote(result,saida,source,_processamento(result,saida))
    assert nome=='extracao_de_teste_ferrovia.zip'
    assert [item['chave'] for item in manifesto]==['gpkg','pdf_processamento','pdf_analitico','xlsx','csv']
    with zipfile.ZipFile(io.BytesIO(pacote)) as arquivo:
        assert arquivo.namelist()==[item['nome'] for item in manifesto]
        for item in manifesto:
            assert sha256(arquivo.read(item['nome'])).hexdigest()==item['sha256']
        texto=' '.join(p.extract_text() for p in PdfReader(io.BytesIO(arquivo.read(manifesto[1]['nome']))).pages)
        (tmp_path/'r.gpkg').write_bytes(arquivo.read(manifesto[0]['nome']))
    assert 'Relatório de processamento' in texto and 'Carregando entrada e bases' in texto and 'Base 0' in texto
    assert {nome for nome,_ in pyogrio.list_layers(tmp_path/'r.gpkg')}=={'resultado','entrada'}
    info=pyogrio.read_info(tmp_path/'r.gpkg',layer='resultado')
    assert info['features']==len(saida) and info['crs']=='EPSG:4674'
    assert pyogrio.read_info(tmp_path/'r.gpkg',layer='entrada')['features']==1

def test_api_rejeita_sem_sessao():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.extracao_atributos import router
    app=FastAPI();app.include_router(router)
    with TestClient(app) as client:
        assert client.get('/extracao-atributos/catalogo').status_code==401
        assert client.post('/extracao-atributos/execucoes',json={}).status_code==401
