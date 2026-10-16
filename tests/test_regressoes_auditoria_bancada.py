"""Regressões da auditoria com arquivos reais e nenhum acesso a serviços oficiais."""
import asyncio
import sqlite3
from contextlib import closing
import geopandas as gpd
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import Point, LineString, MultiPoint, box
from api.services.camada_arquivo import resolver_camada
from api.services.geoespacial_service import GeoespacialService
from api.services.importar_camadas_service import validate_raster, validate_vector


@pytest.fixture(autouse=True)
def no_database(monkeypatch, tmp_path):
    from api import storage_policy
    root = tmp_path / 'storage-sintetico'
    temporary = root / 'temporarios-sicard'
    temporary.mkdir(parents=True)
    monkeypatch.setenv('SICARD_STORAGE_WRITE_DIR', str(root))
    monkeypatch.setenv('SICARD_STORAGE_TEMP_DIR', str(temporary))
    monkeypatch.setattr(storage_policy, 'montagem', lambda path: path == root)
    import psycopg
    def forbidden(*a, **kw):
        raise AssertionError('Este teste não acessa bancos')
    monkeypatch.setattr(psycopg, 'connect', forbidden)


@pytest.fixture
def package(tmp_path):
    path = tmp_path/'multi.gpkg'
    gpd.GeoDataFrame({'valor':[2,6]},geometry=[Point(0,0),Point(1,1)],crs=31983).to_file(path,layer='pontos')
    gpd.GeoDataFrame({'nome':['linha']},geometry=[LineString([(0,0),(3,4)])],crs=31983).to_file(path,layer='linhas')
    gpd.GeoDataFrame({'valor': [5]}, geometry=[box(0, 0, 2, 2)], crs=31983).to_file(path, layer='poligonos')
    gpd.GeoDataFrame({'valor': [8]}, geometry=[MultiPoint([(0, 0), (1, 1)])], crs=31983).to_file(path, layer='multipartes')
    with closing(sqlite3.connect(path)) as conn:
        conn.execute('CREATE TABLE anotacoes (texto TEXT)')
        conn.execute("INSERT INTO anotacoes VALUES ('preservar')")
        conn.commit()
    return path


def test_edicao_preserva_outras_camadas_e_tabelas(package):
    before = {name: gpd.read_file(package, layer=name) for name in ['linhas', 'poligonos', 'multipartes']}
    edited=gpd.read_file(package,layer='pontos');edited.loc[0,'valor']=7
    GeoespacialService._reescrever_arquivo_do_acervo(package,edited,'pontos')
    assert gpd.read_file(package,layer='pontos').valor.tolist()==[7,6]
    for name, frame in before.items():
        assert frame.equals(gpd.read_file(package, layer=name))
    with closing(sqlite3.connect(package)) as conn:
        assert conn.execute('SELECT texto FROM anotacoes').fetchone()==('preservar',)


def test_salvar_atributos_resolve_subcamada(package, monkeypatch):
    from api.repositories import camada_geoespacial_repository as repository
    from api.services import ciclo_vida_arquivos
    geo = GeoespacialService()
    geo._metadados['P'] = {'nome': 'Pontos'}
    monkeypatch.setattr(repository, 'esta_homologada', lambda _: False)
    monkeypatch.setattr(repository, 'substituir_vetor', lambda *a, **kw: kw['gravar_arquivo']())
    monkeypatch.setattr(ciclo_vida_arquivos, 'exigir_editavel', lambda _: None)
    monkeypatch.setattr(geo, '_caminho_arquivo_da_camada', lambda _: package)
    monkeypatch.setattr(geo, 'obter_camada_dados', lambda _: gpd.read_file(package, layer='pontos'))
    before = gpd.read_file(package, layer='linhas')
    result = geo.salvar_edicoes_atributos('P', [{'indice': 0, 'campos': {'valor': 7}}])
    assert result['gravado_em_arquivo']
    assert gpd.read_file(package, layer='pontos').valor.tolist() == [7, 6]
    assert before.equals(gpd.read_file(package, layer='linhas'))


def test_edicao_multicamada_exige_identidade(package):
    before=package.read_bytes()
    with pytest.raises(ValueError,match='subcamada'):
        GeoespacialService._reescrever_arquivo_do_acervo(package,gpd.read_file(package,layer='pontos'))
    assert package.read_bytes()==before


def test_identidade_explicita_legada_e_ambigua(package):
    assert resolver_camada(package,{'nome':'Linhas'})=='linhas'
    assert resolver_camada(package,{'metadados':{'metadados':{'camada_arquivo':'linhas'}}})=='linhas'
    with pytest.raises(ValueError):resolver_camada(package,{'nome':'desconhecida'})
    with pytest.raises(ValueError):resolver_camada(package,{'camada_arquivo':'ausente'})


def test_leitura_fria_da_subcamada(package,monkeypatch):
    geo=GeoespacialService();geo._metadados['L']={'nome':'Linhas'}
    monkeypatch.setattr(geo,'_caminho_arquivo_da_camada',lambda _:package)
    frame=geo._ler_do_acervo('L')
    assert len(frame)==1 and frame.geometry.iloc[0].geom_type=='LineString'


def test_selecao_espacial_nao_e_juncao(monkeypatch):
    geo=GeoespacialService()
    points=gpd.GeoDataFrame({'id':['P1','P2']},geometry=[Point(0,0),Point(1,1)],crs=31983)
    areas=gpd.GeoDataFrame(geometry=[box(0,0,2,2),box(.5,.5,3,3)],crs=31983)
    monkeypatch.setattr(geo,'obter_camada_dados',lambda ident:points if ident=='p' else areas)
    saved=[]
    monkeypatch.setattr(geo,'registrar_camada',lambda frame,*a,**kw:saved.append(frame) or 'result')
    asyncio.run(geo.selecionar_por_localizacao('p','a'))
    assert saved[0].id.tolist()==['P1','P2']
    assert list(saved[0].columns)==list(points.columns)


@pytest.mark.parametrize('dtype,nodata',[
    ('uint8',255), ('uint16',65535), ('int16',-9999),
    ('int32',-9999), ('float32',-9999),
])
@pytest.mark.parametrize('clip',[False,True])
def test_nodata_inteiro_com_e_sem_recorte(tmp_path,dtype,nodata,clip):
    path=tmp_path/'r.tif';data=np.array([[1,nodata],[3,4]],dtype=dtype)
    with rasterio.open(path,'w',driver='GTiff',width=2,height=2,count=1,dtype=dtype,crs=31983,transform=from_origin(500000,7400020,10,10),nodata=nodata) as dst:dst.write(data,1)
    mask=gpd.GeoDataFrame(geometry=[box(500000,7400000,500020,7400020)],crs=31983) if clip else None
    actual,profile,meta=validate_raster(path,target_crs=None,clip_frame=mask)
    assert np.isnan(actual[0,1]) and meta['celulas_validas']==3
    assert np.nansum(actual)==8


def test_lat_long_geograficas_sem_alterar_crs():
    frame=gpd.GeoDataFrame(geometry=[Point(500000,7400000)],crs=31983)
    result,_=validate_vector(frame,target_crs=None,clip_frame=None)
    assert result.crs==frame.crs
    assert result.long.iloc[0]==pytest.approx(-45,abs=1e-7)
    assert result.lat.iloc[0]==pytest.approx(-23.5101947,abs=1e-6)


def test_fallback_selecao_sem_campos_conhecidos(monkeypatch):
    from api.services.geoprocessamento_engine import GeoprocessamentoEngine
    engine=GeoprocessamentoEngine()
    frame=gpd.GeoDataFrame({'audit_id':['P1','P2']},geometry=[Point(0,0),Point(1,1)],crs=31983)
    monkeypatch.setattr(engine,'_layer',lambda _:frame)
    with pytest.raises(ValueError,match='não foram localizadas'):
        engine._apply_selection_scope('OP-28',{'camada_id':'p','processar_sobre':'selecionadas','chaves_selecionadas':['fora'],'atributos_selecionados':[{'fora':'P2'}]})


@pytest.mark.parametrize('operation', ['threshold_raster', 'invert_raster', 'combinar_rasters'])
@pytest.mark.parametrize('cached', [False, True])
def test_nodata_no_percurso_raster_persistido(monkeypatch, operation, cached):
    from api.repositories import camada_geoespacial_repository as repository
    from api.services import geoprocessamento_engine as engine_module
    from rasterio.io import MemoryFile

    geo = GeoespacialService()
    data = np.array([[1, -9999], [3, 9]], dtype='float32')
    profile = {'crs': 'EPSG:31983', 'transform': from_origin(0, 2, 1, 1), 'nodata': -9999}
    geo._metadados['r'] = {'nome': 'Raster sintético'}
    if cached:
        geo._rasters['r'] = data
        geo._raster_profiles['r'] = profile
    with MemoryFile() as memory:
        with memory.open(driver='GTiff', width=2, height=2, count=1, dtype='float32', **profile) as dst:
            dst.write(data, 1)
        content = memory.read()
    monkeypatch.setattr(repository, 'carregar_raster', lambda _: (content, {}))
    monkeypatch.setattr(geo, '_catalogar_persistidas', lambda: None)
    saved = []
    monkeypatch.setattr(repository, 'salvar_raster', lambda **kwargs: saved.append(kwargs) or 'sintetico')
    monkeypatch.setattr(engine_module, 'geo', geo)
    engine = engine_module.GeoprocessamentoEngine()
    if operation == 'combinar_rasters':
        result = asyncio.run(geo.combinar_rasters(['r', 'r'], operador='soma'))
        expected = [[2, np.nan], [6, 18]]
    else:
        result = asyncio.run(getattr(engine, operation)({'raster_id': 'r', 'limiar': 5}))
        expected = [[0, np.nan], [0, 1]] if operation == 'threshold_raster' else [[9, np.nan], [7, 1]]
    actual = geo.obter_raster_dados(result['raster_id'])
    np.testing.assert_allclose(actual, expected, equal_nan=True)
    with MemoryFile(saved[-1]['dados_geotiff']) as memory:
        with memory.open() as dataset:
            reopened = dataset.read(1, masked=True)
            assert reopened.mask[0, 1]
            np.testing.assert_allclose(reopened.filled(np.nan), expected, equal_nan=True)


@pytest.mark.parametrize('data,origin', [
    ([[-1, 1], [2, 3]], (0, 1)),
    ([[np.nan, 1], [2, 3]], (0, 0)),
])
def test_custo_acumulado_rejeita_entrada_invalida(monkeypatch, data, origin):
    from api.services.geoprocessamento_engine import GeoprocessamentoEngine
    engine = GeoprocessamentoEngine()
    monkeypatch.setattr(engine, '_raster', lambda _: np.array(data, dtype=float))
    with pytest.raises(ValueError, match='negativo|origem.*válid'):
        asyncio.run(engine.accumulated_cost({
            'raster_id': 'r', 'origem_linha': origin[0], 'origem_coluna': origin[1],
        }))


def test_validacao_funcao_aninhada_e_ciclos(monkeypatch):
    from api.repositories import modelo_geoprocessamento_repository as repository
    from api.services.geoprocessamento_engine import GeoprocessamentoEngine
    engine = GeoprocessamentoEngine()
    definitions = {
        'invalida': {'passos': [{'algoritmo_id': 'OP-26', 'parametros': {'raster_id': '$r'}}]},
        'a': {'passos': [{'funcao_id': 'b'}]},
        'b': {'passos': [{'funcao_id': 'a'}]},
    }
    monkeypatch.setattr(repository, 'obter', lambda ident, kind: definitions.get(ident))
    errors = engine.validate_steps([{'funcao_id': 'invalida'}])
    assert any('crs_saida' in error for error in errors)
    errors = engine.validate_steps([{'funcao_id': 'a'}])
    assert any('circular' in error.lower() for error in errors)
    with pytest.raises(ValueError, match='circular'):
        asyncio.run(engine.run_steps([{'funcao_id': 'a'}], {}))


@pytest.mark.parametrize('inverted', [False, True])
def test_selecao_espacial_preserva_identidade_posicional(monkeypatch, inverted):
    geo = GeoespacialService()
    points = gpd.GeoDataFrame(
        {'nome': ['dentro', 'fora']}, index=[7, 7],
        geometry=[Point(1, 1), Point(9, 9)], crs=31983,
    )
    areas = gpd.GeoDataFrame(geometry=[box(0, 0, 2, 2), box(0, 0, 3, 3)], crs=31983)
    monkeypatch.setattr(geo, 'obter_camada_dados', lambda ident: points if ident == 'p' else areas)
    saved = []
    monkeypatch.setattr(geo, 'registrar_camada', lambda frame, *a: saved.append(frame) or 'resultado')
    asyncio.run(geo.selecionar_por_localizacao('p', 'a', inverter_selecao=inverted))
    assert saved[0].nome.tolist() == (['fora'] if inverted else ['dentro'])
    assert saved[0].index.tolist() == [7]
    assert list(saved[0].columns) == list(points.columns)


@pytest.mark.parametrize('column,values,keys,attributes', [
    ('id', [1, 1], ['1'], []),
    ('id', [1, 2], ['1', 'ausente'], []),
    ('nome', ['igual', 'igual'], ['tile:9'], [{'nome': 'igual'}]),
])
def test_selecao_recusa_identidade_ambigua_ou_parcial(monkeypatch, column, values, keys, attributes):
    from api.services.geoprocessamento_engine import GeoprocessamentoEngine
    engine = GeoprocessamentoEngine()
    frame = gpd.GeoDataFrame({column: values}, geometry=[Point(0, 0), Point(1, 1)], crs=31983)
    monkeypatch.setattr(engine, '_layer', lambda _: frame)
    with pytest.raises(ValueError, match='ambígu'):
        engine._apply_selection_scope('OP-28', {
            'camada_id': 'p', 'processar_sobre': 'selecionadas',
            'chaves_selecionadas': keys, 'atributos_selecionados': attributes,
        })


def test_custo_acumulado_barreira_e_retomada(monkeypatch):
    from api.services.geoprocessamento_engine import GeoprocessamentoEngine
    engine = GeoprocessamentoEngine()
    profile = {'crs': 'EPSG:31983', 'transform': from_origin(0, 1, 1, 1)}
    engine.profiles['r'] = profile
    monkeypatch.setattr(engine, '_raster', lambda _: np.array([[1, 2, np.nan, 4]], dtype=float))
    saved = []
    monkeypatch.setattr(engine, '_new_raster', lambda data, _: saved.append(data) or 'saida')
    asyncio.run(engine.accumulated_cost({'raster_id': 'r'}))
    np.testing.assert_allclose(saved[0], [[0, 1.5, np.nan, np.nan]], equal_nan=True)
    monkeypatch.setattr(engine, '_raster', lambda _: np.array([[0]], dtype=float))
    asyncio.run(engine.accumulated_cost({'raster_id': 'r'}))
    np.testing.assert_allclose(saved[1], [[0]])


def test_mascara_externa_e_raster_sem_validos(tmp_path):
    path = tmp_path / 'mascara.tif'
    with rasterio.open(
        path, 'w', driver='GTiff', width=2, height=2, count=1, dtype='uint8',
        crs=31983, transform=from_origin(0, 2, 1, 1),
    ) as dst:
        dst.write(np.ones((2, 2), dtype='uint8'), 1)
        dst.write_mask(np.array([[255, 0], [255, 255]], dtype='uint8'))
    data, _, _ = validate_raster(path, target_crs=None, clip_frame=None)
    assert np.isnan(data[0, 1])
    with rasterio.open(path, 'r+') as dst:
        dst.write_mask(np.zeros((2, 2), dtype='uint8'))
    with pytest.raises(ValueError, match='células válidas'):
        validate_raster(path, target_crs=None, clip_frame=None)


def test_seed_e_contrato_de_exportacao(monkeypatch):
    import json
    import re
    from pathlib import Path
    from api.repositories import modelo_geoprocessamento_repository as repository
    from api.services.geoprocessamento_engine import GeoprocessamentoEngine
    sql = Path('database/045_modelos_geoprocessamento.sql').read_text(encoding='utf-8')
    definitions = {
        item['id']: item for item in (
            json.loads(value) for value in re.findall(r"'(\{.*?\})'::jsonb", sql)
        )
    }
    engine = GeoprocessamentoEngine()
    monkeypatch.setattr(repository, 'obter', lambda ident, kind: definitions.get(ident))
    for definition in definitions.values():
        assert engine.validate_steps(definition.get('passos') or definition['itens']) == []


def test_fluxo_valida_recursivamente_e_diagrama_recusa_ciclo(monkeypatch):
    from fastapi import HTTPException
    from api.routers import geoespacial as router
    definition = {'passos': [{'algoritmo_id': 'OP-26', 'parametros': {'raster_id': '$r'}}]}
    monkeypatch.setattr(router.modelo_repo, 'obter', lambda *args: definition)
    with pytest.raises(HTTPException) as exc:
        router._validar_definicao_fluxo({'itens': [{'funcao_id': 'invalida'}]})
    assert 'crs_saida' in str(exc.value.detail)
    with pytest.raises(HTTPException, match='circular'):
        router._validar_diagrama({'diagrama': {
            'nos': [{'id': 'i', 'kind': 'input'}, {'id': 'p', 'kind': 'algorithm'}, {'id': 'o', 'kind': 'output'}],
            'conexoes': [{'from': 'i', 'to': 'p'}, {'from': 'p', 'to': 'p'}, {'from': 'p', 'to': 'o'}],
        }})


def test_recusa_do_banco_nao_altera_arquivo_ou_cache(package, monkeypatch):
    from api.repositories import camada_geoespacial_repository as repository
    from api.services import ciclo_vida_arquivos
    geo = GeoespacialService()
    geo._metadados['P'] = {'nome': 'Pontos'}
    geo._camadas['P'] = gpd.read_file(package, layer='pontos')
    monkeypatch.setattr(repository, 'esta_homologada', lambda _: False)
    monkeypatch.setattr(ciclo_vida_arquivos, 'exigir_editavel', lambda _: None)
    monkeypatch.setattr(geo, '_caminho_arquivo_da_camada', lambda _: package)
    monkeypatch.setattr(geo, 'obter_camada_dados', lambda _: geo._camadas['P'])
    def reject(*args, **kwargs):
        raise RuntimeError('Banco indisponível antes de escrever')
    monkeypatch.setattr(repository, 'substituir_vetor', reject)
    original = package.read_bytes()
    with pytest.raises(RuntimeError, match='Banco indisponível'):
        geo.salvar_edicoes_atributos('P', [{'indice': 0, 'campos': {'valor': 7}}])
    assert package.read_bytes() == original
    assert geo._camadas['P'].valor.tolist() == [2, 6]


def test_falha_na_escrita_preserva_container_e_limpa_temporarios(package, monkeypatch):
    from api import storage_policy
    original = package.read_bytes()
    frame = gpd.read_file(package, layer='pontos')
    def reject(*args, **kwargs):
        raise OSError('Escrita interrompida')
    monkeypatch.setattr(gpd.GeoDataFrame, 'to_file', reject)
    with pytest.raises(OSError, match='Escrita interrompida'):
        GeoespacialService._reescrever_arquivo_do_acervo(package, frame, 'pontos')
    assert package.read_bytes() == original
    assert list(storage_policy.raiz_temporaria().iterdir()) == []


def test_preparo_original_identifica_quatro_subcamadas(package):
    from api.services.bancada_camada_original import Fonte, _abrir
    for name, count in [('pontos', 2), ('linhas', 1), ('poligonos', 1), ('multipartes', 1)]:
        source = Fonte(name, package, str(package), name, name, {}, True)
        dataset, layer = _abrir(source)
        assert layer.GetName() == name
        assert layer.GetFeatureCount() == count
        layer = None
        dataset = None
