"""O upload valida o conjunto inteiro, mantém falhas visíveis e executa todas as feições válidas."""
import base64
import io
from zipfile import ZipFile

import geopandas as gpd
import pytest
from osgeo import gdal
from shapely.geometry import Point
from api.services import extracao_entrada_local as local


def gpkg(tmp_path, com_invalida=False):
    arquivo=tmp_path/'multicamadas.gpkg'
    for i in range(3):
        frame=gpd.GeoDataFrame({'codigo':[f'{i:03d}'], f'atributo_{i}':[i]},geometry=[Point(-46-i/10,-23-i/10)],crs=4326)
        frame.to_file(arquivo,layer=f'camada_{i}',driver='GPKG')
    if com_invalida:
        frame=gpd.GeoDataFrame({'nome':['Sem referência']},geometry=[Point(1000,1000)])
        frame.to_file(arquivo,layer='sem_crs',driver='GPKG')
    return arquivo.read_bytes()


@pytest.fixture(autouse=True)
def sem_consulta_banco(monkeypatch):
    monkeypatch.setattr(local,'localizacao',lambda frame:{'ufs':['SP'],'municipios':[],'status':'consultado'})


def test_tres_camadas_juntas_sem_escolha_preserva_todas_feicoes(tmp_path):
    data=gpkg(tmp_path)
    antes=set(gdal.ReadDir('/vsimem') or [])
    result=local.previa(data,'multicamadas.gpkg')
    assert result['resumo']=={'total':3,'validas':3,'invalidas':0,'vetores':3,'rasters':0}
    assert {c['nome'] for c in result['camadas']}=={'camada_0','camada_1','camada_2'}
    assert all(c['geojson']['features'] and c['status_validacao']=='valida' for c in result['camadas'])
    assert len(result['entrada']['geojson']['features'])==3
    frame,meta=local.restaurar({'nome':'multicamadas.gpkg','conteudo_base64':base64.b64encode(data).decode()})
    assert len(frame)==3 and frame.codigo.tolist()==['000','001','002']
    assert frame.geometry.to_wkt().tolist()==['POINT (-46 -23)','POINT (-46.1 -23.1)','POINT (-46.2 -23.2)']
    assert frame[meta['campo_origem']].nunique()==3
    assert all(c in frame.columns for c in ['atributo_0','atributo_1','atributo_2'])
    assert set(gdal.ReadDir('/vsimem') or [])==antes


def test_falha_de_uma_camada_nao_oculta_as_outras(tmp_path):
    data=gpkg(tmp_path,True)
    result=local.previa(data,'multicamadas.gpkg')
    assert result['resumo']['validas']==3 and result['resumo']['invalidas']==1
    erro=next(c for c in result['camadas'] if c['status_validacao']=='invalida')
    assert erro['nome']=='sem_crs' and 'CRS' in erro['erro'] and 'geojson' not in erro
    assert len(result['entrada']['geojson']['features'])==3
    frame,_=local.restaurar({'nome':'multicamadas.gpkg','conteudo_base64':base64.b64encode(data).decode()})
    assert len(frame)==3


def test_componentes_ilegíveis_aparecem_no_grupo_de_invalidas(tmp_path):
    stream=io.BytesIO()
    with ZipFile(stream,'w') as z:
        z.writestr('camadas.gpkg',gpkg(tmp_path));z.writestr('quebrado.gpkg',b'bad');z.writestr('incompleto.shp',b'bad')
    result=local.previa(stream.getvalue(),'pacote.zip')
    assert result['resumo']['total']==5 and result['resumo']['invalidas']==2
    assert {c['nome'] for c in result['camadas'] if c['status_validacao']=='invalida'}=={'quebrado','incompleto'}


def test_todas_invalidas_retorna_diagnostico_sem_entrada():
    result=local.previa(b'bad','quebrado.gpkg')
    assert result['resumo']['invalidas']==1 and result['entrada'] is None


def test_limite_e_cumulativo_e_camadas_excedentes_ficam_visiveis(tmp_path,monkeypatch):
    data=gpkg(tmp_path)
    monkeypatch.setattr(local,'MAX_FEICOES',2)
    result=local.previa(data,'multicamadas.gpkg')
    assert result['resumo']['validas']==2 and result['resumo']['invalidas']==1
    assert 'conjunto ultrapassa' in result['camadas'][2]['erro']
    assert len(result['entrada']['geojson']['features'])==2


def test_api_entrega_validacao_completa_de_uma_so_vez(tmp_path):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from types import SimpleNamespace
    from api.routers.extracao_atributos import router
    from api.deps.auth import require_geospatial_access
    app=FastAPI();app.include_router(router)
    app.dependency_overrides[require_geospatial_access]=lambda:SimpleNamespace(id='teste')
    with TestClient(app) as client:
        r=client.post('/extracao-atributos/entrada-local?nome=camadas.gpkg',content=gpkg(tmp_path,True))
        assert r.status_code==200 and r.headers['cache-control']=='no-store'
        assert r.json()['resumo']['total']==4
        assert len(r.json()['entrada']['geojson']['features'])==3


def test_execucao_recebe_todas_as_camadas_sem_salvar_arquivo_original(tmp_path,monkeypatch):
    from types import SimpleNamespace
    from api.services import extracao_atributos as service
    data=gpkg(tmp_path,True)
    tarefas=[];persistidos=[]
    monkeypatch.setattr(service,'catalogo',lambda:{'camadas':[{'id':'base','nome':'Base'}],'categorias':[{'id':'social','nome':'Social'}]})
    monkeypatch.setattr(service.ciclo,'iniciar',lambda *args:persistidos.append(args[1]) or 'teste')
    monkeypatch.setattr(service._pool,'submit',lambda *args:tarefas.append(args))
    service.iniciar({'input_id':'local:lote','operacao':'estatisticas',
                     'categorias':[{'id':'social','camadas':['base']}],
                     'arquivo_local':{'nome':'camadas.gpkg','conteudo_base64':base64.b64encode(data).decode()}},SimpleNamespace(id='usuario'))
    assert len(tarefas[0][3])==3
    assert persistidos[0]['entrada_local']['camadas_total']==3
    assert len(persistidos[0]['entrada_local']['camadas_origem'])==3
    assert 'conteudo_base64' not in str(persistidos)


def test_zip_com_varios_geopackages_e_subpacotes(tmp_path):
    dados=gpkg(tmp_path)
    interior=io.BytesIO()
    with ZipFile(interior,'w') as z:z.writestr('outro.gpkg',dados)
    exterior=io.BytesIO()
    with ZipFile(exterior,'w') as z:
        z.writestr('primeiro.gpkg',dados);z.writestr('sub.zip',interior.getvalue())
    result=local.previa(exterior.getvalue(),'pacote.zip')
    assert result['resumo']['vetores']==6 and len(result['entrada']['geojson']['features'])==6
    assert len({i['chave'] for i in result['camadas']})==6


def test_multiplos_rasters_sao_validados_e_desenhados_independentemente(tmp_path):
    from osgeo import osr
    stream=io.BytesIO()
    with ZipFile(stream,'w') as z:
        for i in range(2):
            # Nome preview.tif também não pode colidir com a miniatura interna.
            nome='preview.tif' if i==0 else 'segundo.tif'
            path=tmp_path/nome
            ds=gdal.GetDriverByName('GTiff').Create(str(path),8,8,1,gdal.GDT_Byte)
            ds.SetGeoTransform([-47+i,0.01,0,-23,0,-0.01])
            crs=osr.SpatialReference();crs.ImportFromEPSG(4326);ds.SetProjection(crs.ExportToWkt())
            ds.GetRasterBand(1).Fill(25+i);ds=None
            z.writestr(nome,path.read_bytes())
    result=local.previa(stream.getvalue(),'rasters.zip')
    assert result['resumo']['validas']==2 and result['resumo']['rasters']==2
    assert result['entrada'] is None
    assert all(c['imagem'].startswith('data:image/png;base64,') for c in result['camadas'])
    assert result['camadas'][0]['metadados_local']['limites_wgs84']!=result['camadas'][1]['metadados_local']['limites_wgs84']
