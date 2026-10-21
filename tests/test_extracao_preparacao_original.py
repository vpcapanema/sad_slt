import json
import math
from pathlib import Path

import geopandas as gpd
import pytest
from shapely.geometry import Point, box
from osgeo import ogr

from api.services import extracao_preparacao as preparo, extracao_entrada_local as local


@pytest.fixture
def isolado(monkeypatch, tmp_path_factory):
    from api import path_policy
    tmp_path = tmp_path_factory.mktemp('prep')
    monkeypatch.setattr(path_policy, 'project_path', lambda caminho: tmp_path / caminho)
    monkeypatch.setattr(preparo, 'sem_montagem', lambda: False)
    monkeypatch.setattr(local, 'localizacao', lambda frame: {'status': 'consultado'})

    def negar(*args, **kwargs):
        pytest.fail('O fluxo original não deve converter geometrias para GeoJSON')

    monkeypatch.setattr(gpd.GeoDataFrame, 'to_json', negar)
    monkeypatch.setattr(local, '_representacao_mapa', negar)
    return tmp_path


def frame():
    return gpd.GeoDataFrame({'codigo': ['001'], 'valor': [7]}, geometry=[Point(-46.123456789123, -23.1)], crs=4674)


def test_catalogo_valida_sem_geojson_e_preserva_original(monkeypatch, isolado):
    from api.repositories import camada_geoespacial_repository as repo
    original = frame()
    geom = original.geometry.iloc[0]
    assert isinstance(geom, Point)
    antes = geom.wkb
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda ident: (original, {'nome': 'Original'}))
    result = preparo.preparar('base', 'autor')
    assert result['status_validacao'] == 'valida'
    assert result['representacao'] == 'tiles' and 'geojson' not in result
    geometria_depois = original.geometry.iloc[0]
    assert isinstance(geometria_depois, Point)
    assert geometria_depois.wkb == antes
    assert original.iloc[0]['codigo'] == '001'
    metadados_local = result.get('metadados_local')
    assert isinstance(metadados_local, dict)
    identificacao = metadados_local.get('identificacao')
    assert identificacao is not None
    assert identificacao.get('completa') is True
    assert metadados_local.get('feicoes') == 1
    path = next(isolado.rglob('*.gpkg'))
    ds = ogr.Open(str(path))
    assert bytes(ds.GetLayer(0).GetNextFeature().GetGeometryRef().ExportToWkb()) == antes
    z = 6
    x = int((-46.123456789123 + 180) / 360 * 2**z)
    y = int((1 - math.asinh(math.tan(math.radians(-23.1))) / math.pi) / 2 * 2**z)
    assert preparo.tile(result['tiles_token'], 'autor', z, x, y)
    with pytest.raises(FileNotFoundError):
        preparo.tile(result['tiles_token'], 'outro', z, x, y)


def test_local_usa_validacao_comum_sem_geojson(isolado):
    content = json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'codigo': '001'}, 'geometry': {'type': 'Point', 'coordinates': [-46.1, -23.1]}}]}).encode()
    result = local.previa(content, 'original.geojson', dono_tiles='autor')
    assert result['resumo']['validas'] == 1
    assert 'geojson' not in result['entrada']
    layer = result['camadas'][0]
    assert layer['representacao'] == 'tiles' and 'geojson' not in layer
    assert layer['metadados_local']['identificacao']['completa']


def test_crs_ausente_impede_previa(monkeypatch, isolado):
    from api.repositories import camada_geoespacial_repository as repo
    invalid = frame()
    invalid.crs = None  # type: ignore[assignment]
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda ident: (invalid, {'nome': 'Inválida'}))
    with pytest.raises(ValueError, match='coordenadas'):
        preparo.preparar('base', 'autor')
    assert not list(isolado.rglob('*.gpkg'))


def test_limite_de_upload_nao_restringe_base_cadastrada(monkeypatch, isolado):
    from api.repositories import camada_geoespacial_repository as repo
    original = frame()
    validar = local.validar
    monkeypatch.setattr(local, 'validar', lambda frame, max_feicoes=0: validar(frame, max_feicoes=max_feicoes))
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda ident: (original, {'nome': 'Base'}))
    assert preparo.preparar('base', 'autor')['feicoes'] == 1
    with pytest.raises(ValueError, match='entre 1'):
        validar(original, max_feicoes=0)


def test_preparacao_storage_preenche_tamanho_componente_e_formato(monkeypatch, isolado):
    from api.services import storage_geoespacial
    path = isolado / 'origem.gpkg'
    frame().to_file(path, layer='demandas_reais', driver='GPKG', engine='pyogrio')
    monkeypatch.setattr(storage_geoespacial, 'resolver', lambda _: path)
    result = preparo.preparar('storage:base-geoespacial/origem.gpkg::demandas_reais', 'autor')
    meta = result['metadados_local']
    assert meta['bytes'] == path.stat().st_size
    assert meta['bytes_descompactados'] == path.stat().st_size
    assert meta['componente'] == 'demandas_reais'
    assert meta['formato'] == 'GPKG'
    assert meta['vertices'] == 1


def test_revisao_fonte_storage_independe_do_token_da_previa(monkeypatch, isolado):
    from api.services import storage_geoespacial, elegibilidade_processamento
    path = isolado / 'municipios.gpkg'
    frame().to_file(path, layer='municipios', driver='GPKG', engine='pyogrio')
    monkeypatch.setattr(storage_geoespacial, 'resolver', lambda _: path)
    ident = 'storage:base-geoespacial/municipios.gpkg::municipios'
    descritor = preparo.preparar(ident, 'autor')
    estado = path.stat()
    assert descritor['revisao'] == descritor['tiles_token']
    with pytest.raises(ValueError, match='mudou após o envio'):
        elegibilidade_processamento._carregar({'id': ident, 'nome': 'municipios', 'revisao': descritor['revisao']})
    assert descritor['revisao_fonte'] == f'{estado.st_mtime_ns}-{estado.st_size}'
    carregada = elegibilidade_processamento._carregar({
        'id': ident, 'nome': 'municipios', 'revisao': descritor['revisao_fonte'],
    })
    assert carregada.codigo.tolist() == ['001']
    assert carregada.geometry.iloc[0].wkb == frame().geometry.iloc[0].wkb


def test_modificacao_real_apos_previa_continua_bloqueando_calculo(monkeypatch, isolado):
    import os
    from api.services import storage_geoespacial, elegibilidade_processamento
    path = isolado / 'municipios.gpkg'
    frame().to_file(path, layer='municipios', driver='GPKG', engine='pyogrio')
    monkeypatch.setattr(storage_geoespacial, 'resolver', lambda _: path)
    ident = 'storage:base-geoespacial/municipios.gpkg::municipios'
    descritor = preparo.preparar(ident, 'autor')
    estado = path.stat()
    os.utime(path, ns=(estado.st_atime_ns, estado.st_mtime_ns + 2_000_000_000))
    with pytest.raises(ValueError, match='mudou após o envio'):
        elegibilidade_processamento._carregar({'id': ident, 'nome': 'municipios', 'revisao': descritor['revisao_fonte']})


def test_mudanca_durante_preparacao_nao_retorna_descritor_valido(monkeypatch, isolado):
    import os
    from api.services import storage_geoespacial
    path = isolado / 'municipios.gpkg'
    frame().to_file(path, layer='municipios', driver='GPKG', engine='pyogrio')
    monkeypatch.setattr(storage_geoespacial, 'resolver', lambda _: path)
    representar_original = preparo.representar
    def representar(*args, **kwargs):
        descritor = representar_original(*args, **kwargs)
        estado = path.stat()
        os.utime(path, ns=(estado.st_atime_ns, estado.st_mtime_ns + 2_000_000_000))
        return descritor
    monkeypatch.setattr(preparo, 'representar', representar)
    with pytest.raises(ValueError, match='mudou durante a preparação'):
        preparo.preparar('storage:base-geoespacial/municipios.gpkg::municipios', 'autor')


def test_previa_real_alimenta_execucao_favorabilidade_sem_falso_arquivo_alterado(monkeypatch, isolado, storage_sintetico):
    from api.services import storage_geoespacial as storage, elegibilidade_processamento as processamento
    from api.services.controle_processamento import ControleProcessamento
    root = storage_sintetico
    (root / 'base-geoespacial').mkdir()
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: root)
    entrada = gpd.GeoDataFrame({'codigo': ['D1']}, geometry=[box(5000000, 7000000, 5000010, 7000010)], crs=5880)
    municipios = gpd.GeoDataFrame({'classe': ['Alta'], 'indice_normalizado': [.8]},
                                geometry=[box(5000000, 7000000, 5000005, 7000010)], crs=5880)
    for nome, original in [('entrada', entrada), ('municipios', municipios)]:
        original.to_file(root / 'base-geoespacial' / f'{nome}.gpkg', layer=nome, driver='GPKG', engine='pyogrio')
    descritores = [preparo.preparar(f'storage:base-geoespacial/{nome}.gpkg::{nome}', 'autor')
                   for nome in ('entrada', 'municipios')]
    monkeypatch.setattr(processamento.saidas_storage, 'garantir_pasta',
                        lambda pasta: (root / pasta).mkdir(parents=True, exist_ok=True))
    def registrar(nome, conteudos, recurso, tipo, *, pasta_saida):
        (root / pasta_saida / nome).write_bytes(conteudos[nome])
        return {'caminho': f'{pasta_saida}/{nome}'}
    monkeypatch.setattr(processamento.ciclo, 'registrar_exportacao_memoria', registrar)
    refs = [{'id': c['id'], 'nome': c['nome'], 'revisao': c['revisao_fonte']} for c in descritores]
    resultado = processamento.executar({'entrada': refs[0], 'grade': [refs[1]], 'rede': []},
                                      ControleProcessamento(), analise='favorabilidade')
    saida = gpd.read_file(root / resultado['arquivo'], layer='favorabilidade_territorial')
    assert resultado['feicoes'] == 1
    assert saida.fg_municipios.iloc[0] == 50
    recortes = gpd.read_file(root / resultado['arquivo'], layer='intersecoes')
    campos = resultado['favorabilidade']['atributos_superficies'][0]['campos']
    assert recortes[campos['classe']].tolist() == ['Alta']
    assert recortes[campos['indice_normalizado']].tolist() == [.8]


def test_pacote_preserva_bytes_reais_e_consulta_localizacao(monkeypatch, isolado):
    import zipfile
    from api.services import storage_geoespacial, storage_pacotes
    content = json.dumps({'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'properties': {'codigo': '001'},
         'geometry': {'type': 'Point', 'coordinates': [-47, -23]}},
    ]}).encode()
    path = isolado / 'pacote.zip'
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('pontos.geojson', content)
    relative = 'base-geoespacial/pacote.zip'
    monkeypatch.setattr(storage_geoespacial, 'resolver', lambda _: path)
    ident = storage_pacotes.inventario(path, relative)[0]['id']
    meta = preparo.preparar(ident, 'autor')['metadados_local']
    assert meta['bytes'] == path.stat().st_size
    assert meta['bytes_descompactados'] == len(content)
    assert meta['formato'] == 'GeoJSON'
    assert meta['componente']
    assert meta['localizacao']['status'] == 'consultado'
