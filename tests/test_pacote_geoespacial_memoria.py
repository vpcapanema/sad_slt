"""Pacotes reais, aninhamento, inventário misto e leitura sem persistência."""
import base64
import bz2
import gzip
import io
import json
import lzma
import tarfile
from types import SimpleNamespace
from zipfile import ZipFile

import geopandas as gpd
import py7zr
import pytest
from osgeo import gdal, ogr, osr
from shapely.geometry import Point

from api.services import extracao_entrada_local as local
from api.services import pacote_geoespacial_memoria as pacote

GEO = json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','properties':{'valor':7},
            'geometry':{'type':'Point','coordinates':[-46.63,-23.55]}}]}).encode()


def zipar(itens):
    stream = io.BytesIO()
    with ZipFile(stream, 'w') as z:
        for nome, dados in itens.items(): z.writestr(nome, dados)
    return stream.getvalue()


@pytest.mark.parametrize('ext', ['zip','7z','tar','tgz','tbz2','txz','gz','bz2','xz'])
def test_formatos_compactados_reais(ext):
    stream = io.BytesIO()
    if ext=='zip': data=zipar({'p.geojson':GEO})
    elif ext=='7z':
        with py7zr.SevenZipFile(stream, 'w') as z:z.writestr(GEO, 'p.geojson')
        data=stream.getvalue()
    elif ext in ['gz','bz2','xz']:
        data={'gz':gzip,'bz2':bz2,'xz':lzma}[ext].compress(GEO)
    else:
        with tarfile.open(fileobj=stream,mode={'tar':'w','tgz':'w:gz','tbz2':'w:bz2','txz':'w:xz'}[ext]) as z:
            info=tarfile.TarInfo('p.geojson');info.size=len(GEO);z.addfile(info,io.BytesIO(GEO))
        data=stream.getvalue()
    frame,meta=local.ler(data, f'p.geojson.{ext}')
    assert len(frame)==1 and frame.iloc[0]['valor']==7


def test_aninhado_7z_zip_multiplos_gpkg_e_raster(tmp_path):
    itens={}
    for nome in ['primeiro','segundo']:
        path=tmp_path/f'{nome}.gpkg'
        for layer in ['a','b']:
            gpd.GeoDataFrame({'valor':[1]},geometry=[Point(-46,-23)],crs=4326).to_file(path,layer=layer,driver='GPKG')
        itens[path.name]=path.read_bytes()
    stream=io.BytesIO()
    with py7zr.SevenZipFile(stream,'w') as z:z.writestr(zipar(itens),'interior.zip')
    data=zipar({'dados.7z':stream.getvalue()})
    frame,meta=local.ler(data,'externo.zip')
    assert frame is None and len(meta['camadas'])==4
    assert {c['nome'] for c in meta['camadas']}=={'a','b'}
    for c in meta['camadas']:
        frame,selecionada=local.ler(data,'externo.zip',c['chave'])
        assert len(frame)==1 and 'dados.7z.contents/interior.zip.contents/' in selecionada['componente']


def raster(path, driver='GTiff'):
    ds=gdal.GetDriverByName(driver).Create(str(path),8,8,1,gdal.GDT_Byte)
    ds.SetGeoTransform([-47,0.01,0,-23,0,-0.01])
    srs=osr.SpatialReference();srs.ImportFromEPSG(4326);ds.SetProjection(srs.ExportToWkt())
    ds.GetRasterBand(1).Fill(25);ds.GetRasterBand(1).SetNoDataValue(0);ds=None
    return path.read_bytes()


def test_pacote_misto_vetor_raster_e_previa_pixels(tmp_path,monkeypatch):
    monkeypatch.setattr(local,'localizacao',lambda frame:{'ufs':['SP']})
    data=zipar({'vetor.geojson':GEO,'matriz.tif':raster(tmp_path/'r.tif')})
    _,meta=local.ler(data,'misto.zip')
    assert {c['tipo'] for c in meta['camadas']}=={'vetor','raster'}
    chave=next(c['chave'] for c in meta['camadas'] if c['tipo']=='raster')
    antes=set(gdal.ReadDir('/vsimem') or [])
    result=local.previa(data,'misto.zip',chave)
    assert result['tipo']=='raster' and not result['compativel_extracao']
    assert result['metadados_local']['largura']==8
    assert result['imagem'].startswith('data:image/png;base64,')
    assert result['metadados_local']['bandas'][0]['nodata']==0
    assert set(gdal.ReadDir('/vsimem') or [])==antes
    with pytest.raises(ValueError,match='vetorial'):
        local.restaurar({'nome':'misto.zip','camada':chave,'conteudo_base64':base64.b64encode(data).decode()})


def test_geopackage_com_vetor_e_raster(tmp_path,monkeypatch):
    monkeypatch.setattr(local,'localizacao',lambda frame:{})
    origem=tmp_path/'r.tif';raster(origem)
    path=tmp_path/'misto.gpkg'
    ds=gdal.Translate(str(path),str(origem),format='GPKG',creationOptions=['RASTER_TABLE=imagem']);ds=None
    gpd.GeoDataFrame({'valor':[1]},geometry=[Point(-46,-23)],crs=4326).to_file(path,layer='pontos',driver='GPKG')
    _,meta=local.ler(path.read_bytes(),path.name)
    assert {c['tipo'] for c in meta['camadas']}=={'vetor','raster'}


def test_file_geodatabase_todas_feature_classes(tmp_path):
    root=tmp_path/'acervo.gdb'
    ds=ogr.GetDriverByName('OpenFileGDB').CreateDataSource(str(root))
    srs=osr.SpatialReference();srs.ImportFromEPSG(4326)
    for nome in ['municipios','setores']:
        layer=ds.CreateLayer(nome,srs=srs,geom_type=ogr.wkbPoint)
        f=ogr.Feature(layer.GetLayerDefn());geom=ogr.CreateGeometryFromWkt('POINT (-46 -23)');f.SetGeometry(geom);layer.CreateFeature(f)
        f=layer=None
    ds=None
    data=zipar({str(p.relative_to(tmp_path)):p.read_bytes() for p in root.rglob('*') if p.is_file()})
    _,meta=local.ler(data,'gdb.zip')
    assert {c['nome'] for c in meta['camadas']}=={'municipios','setores'}
    frame,_=local.ler(data,'gdb.zip',meta['camadas'][0]['chave'])
    assert len(frame)==1


def test_limite_global_profundidade_links_e_duplicados(monkeypatch):
    data=GEO
    for _ in range(6):data=zipar({'interno.zip':data})
    with pytest.raises(ValueError,match='níveis'):local.ler(data,'raiz.zip')
    with pytest.raises(ValueError,match='descompactados'):
        pacote.componentes(zipar({'interno.zip':zipar({'p.geojson':GEO})}),'r.zip',len(GEO)+50)
    stream=io.BytesIO()
    with tarfile.open(fileobj=stream,mode='w') as z:
        info=tarfile.TarInfo('link');info.type=tarfile.SYMTYPE;info.linkname='/etc/passwd';z.addfile(info)
    with pytest.raises(ValueError,match='link'):local.ler(stream.getvalue(),'r.tar')


def test_base_local_revalidada_e_passada_em_memoria(monkeypatch):
    from api.services import extracao_atributos as service
    monkeypatch.setattr(service,'catalogo',lambda:{'camadas':[{'id':'e','nome':'Entrada'}],'categorias':[{'id':'social','nome':'Social'}]})
    gravado=[];tarefas=[]
    monkeypatch.setattr(service.ciclo,'iniciar',lambda *args:gravado.append(args) or 'exec-local')
    monkeypatch.setattr(service._pool,'submit',lambda *args:tarefas.append(args))
    arquivo={'nome':'base.geojson','conteudo_base64':base64.b64encode(GEO).decode()}
    service.iniciar({'input_id':'e','operacao':'estatisticas','categorias':[{'id':'social','camadas':['local:base']}],
                     'bases_locais':{'local:base':arquivo}},SimpleNamespace(id='usuario'))
    assert 'conteudo_base64' not in json.dumps(gravado[0][1])
    assert len(tarefas[0][4]['local:base'])==1


def test_rar_real_sem_compressao():
    # Fixture RAR4 stored: cabeçalhos e CRCs válidos, conteúdo GeoJSON conhecido.
    import struct
    import zlib
    def bloco(tipo,flags,corpo):
        header=struct.pack('<BHH',tipo,flags,7+len(corpo))+corpo
        return struct.pack('<H',zlib.crc32(header)&0xffff)+header
    nome=b'p.geojson'
    data=(b'Rar!\x1a\x07\x00'+bloco(0x73,0,b'\x00'*6)
          +bloco(0x74,0x8000,struct.pack('<LLBLLBBHL',len(GEO),len(GEO),3,zlib.crc32(GEO),0,20,0x30,len(nome),0o100644)+nome)
          +GEO+bloco(0x7b,0,b''))
    frame,meta=local.ler(data,'p.rar')
    assert len(frame)==1 and frame.iloc[0]['valor']==7
