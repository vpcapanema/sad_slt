from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import PurePosixPath
from uuid import uuid4
import geopandas as gpd
import pytest
from shapely.geometry import Point
from api.services import saidas_storage as saidas, storage_remoto, ciclo_vida_arquivos as ciclo


@pytest.mark.parametrize(('codigo', 'fase', 'exportacao', 'raiz'), [
    (None, None, False, 'saidas-geoespaciais/analises-avulsas/gerador-territorial/'),
    (None, None, True, 'saidas-geoespaciais/exportacoes/'),
    ('HIER-001', 'fase-1', False, 'saidas-geoespaciais/hierarquizacoes/HIER-001/fase-1/'),
    ('HIER-001', 'fase-2', False, 'saidas-geoespaciais/hierarquizacoes/HIER-001/fase-2/'),
    ('HIER-001', 'fase-3', False, 'saidas-geoespaciais/hierarquizacoes/HIER-001/fase-3/'),
    ('HIER-001', 'consolidado', False, 'saidas-geoespaciais/hierarquizacoes/HIER-001/consolidado/'),
])
def test_pasta_por_contexto_nome_data_e_identificador(codigo, fase, exportacao, raiz):
    ident = uuid4()
    pasta = saidas.pasta_analise(
        'Gerador territorial', 'Análise São Paulo', str(ident),
        quando=datetime(2026, 10, 20, 15, 30, tzinfo=timezone.utc),
        hierarquizacao=codigo, fase=fase, exportacao=exportacao)
    assert pasta == f'{raiz}20261020T153000Z_analise_sao_paulo_{ident.hex}'
    assert saidas.validar(pasta + '/resultado.gpkg') == pasta + '/resultado.gpkg'
    assert saidas.pasta_analise('x', 'Mesmo nome', str(uuid4())) != saidas.pasta_analise('x', 'Mesmo nome', str(uuid4()))


@pytest.mark.parametrize(('codigo', 'fase'), [('HIER/001', 'fase-1'), ('..', 'fase-1'),
    ('HIER-001', None), ('HIER-001', 'fase-4'), (None, 'fase-1')])
def test_organizacao_recusa_contexto_invalido(codigo, fase):
    with pytest.raises(ValueError):
        saidas.pasta_analise('ferramenta', 'nome', str(uuid4()), hierarquizacao=codigo, fase=fase)


def test_destinos_reconstroem_mesma_pasta_pelo_registro_persistido(monkeypatch):
    from api.db import connection
    ident = str(uuid4())
    registro = {'operacao': 'gerar_camada_municipal', 'parametros': {'nome_saida': 'Índices sociais'},
                'iniciado_em': datetime(2026, 10, 20, 15, 0, tzinfo=timezone.utc)}
    class Connection:
        def execute(self, sql, params):
            assert params == (ident,)
            return self
        def fetchone(self):
            return registro
    @contextmanager
    def conectar():
        yield Connection()
    monkeypatch.setattr(connection, 'get_connection', conectar)
    paths = [saidas.destino(ident, grupo, nome) for grupo, nome in [
        ('camadas', 'camada.gpkg'), ('relatorios', 'metadados.json'), ('pacotes', 'camada.zip')]]
    assert len({str(PurePosixPath(path).parent) for path in paths}) == 1
    assert all(path.startswith('saidas-geoespaciais/analises-avulsas/gerador-camadas-territoriais/20261020T150000Z_indices_sociais_') for path in paths)
    registro['operacao'] = 'exportacao_direta'
    assert saidas.destino(ident, 'camadas', 'exportado.gpkg').startswith('saidas-geoespaciais/exportacoes/')
    with pytest.raises(ValueError, match='não corresponde'):
        saidas.enviar_bytes(str(uuid4()), 'camadas', 'camada.gpkg', b'nao enviar', caminho=paths[0])


def test_execucao_ausente_nao_inventa_destino():
    class Connection:
        def execute(self, *args):
            return self
        def fetchone(self):
            return None
    with pytest.raises(ValueError, match='Execução não encontrada'):
        saidas.pasta_execucao(str(uuid4()), conn=Connection())


def test_migration_139_registrada_no_aplicador():
    from pathlib import Path
    script = Path('scripts/apply-database.ps1').read_text(encoding='utf-8')
    assert script.count('"139_centralizar_destinos_saidas_storage.sql"') == 2
    assert "139: saidas por contexto; destinos legados preservados" in script


def test_leitura_legada_continua_valida(remoto, storage_sintetico):
    from hashlib import sha256
    path = f'saidas-geoespaciais/execucoes/{uuid4()}/camadas/antigo.gpkg'
    storage_remoto.enviar_bytes(path, b'original')
    checksum = sha256(b'original').hexdigest()
    assert saidas.validar(path) == path
    assert saidas.conferir(path, checksum) == b'original'
    with saidas.materializar(path, checksum) as local:
        assert local.read_bytes() == b'original'
    assert (remoto / path).read_bytes() == b'original'


def test_criacao_de_pastas_organizadas_e_idempotente(remoto):
    (remoto / saidas.RAIZ).mkdir()
    pasta = saidas.pasta_analise('ferramenta', 'Analise', str(uuid4()))
    assert saidas.garantir_pasta(pasta) == pasta
    assert (remoto / pasta).is_dir()
    (remoto / pasta / 'preservado.txt').write_text('original', encoding='utf-8')
    assert saidas.garantir_pasta(pasta) == pasta
    assert (remoto / pasta / 'preservado.txt').read_text(encoding='utf-8') == 'original'


def test_pasta_criada_por_outro_worker_e_reconhecida(remoto, monkeypatch):
    (remoto / saidas.RAIZ).mkdir()
    criar = storage_remoto.criar_pasta
    def concorrer(caminho):
        criar(caminho)
        raise storage_remoto.StorageIndisponivel('Pasta já criada por outro worker.')
    monkeypatch.setattr(storage_remoto, 'criar_pasta', concorrer)
    pasta = saidas.pasta_analise('ferramenta', 'nome', str(uuid4()))
    assert saidas.garantir_pasta(pasta) == pasta
    assert (remoto / pasta).is_dir()


def test_falha_no_storage_nao_e_ocultada_ao_preparar_pasta(monkeypatch):
    def falhar(*args, **kwargs):
        raise storage_remoto.StorageIndisponivel('Storage indisponível.')
    monkeypatch.setattr(storage_remoto, 'listar', falhar)
    with pytest.raises(storage_remoto.StorageIndisponivel, match='indisponível'):
        saidas.garantir_pasta('saidas-geoespaciais/analises-avulsas')


@pytest.fixture
def remoto(monkeypatch,tmp_path,execucoes_sinteticas):
    def enviar_bytes(caminho, dados):
        target = tmp_path / caminho
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(dados)
    def enviar(caminho,arquivo):
        target=tmp_path/caminho
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(arquivo.read_bytes())
    monkeypatch.setattr(storage_remoto,'enviar',enviar)
    monkeypatch.setattr(storage_remoto,'enviar_bytes',enviar_bytes)
    monkeypatch.setattr(storage_remoto,'baixar',lambda caminho:(tmp_path/caminho).read_bytes())
    monkeypatch.setattr(storage_remoto,'apagar_arquivo',lambda caminho:(tmp_path/caminho).unlink())
    def listar(caminho, estrito=False):
        path = tmp_path / caminho
        if not path.is_dir():
            if estrito:
                raise FileNotFoundError(caminho)
            return []
        return [{'nome': p.name, 'pasta': p.is_dir()} for p in path.iterdir()]
    monkeypatch.setattr(storage_remoto, 'listar', listar)
    monkeypatch.setattr(storage_remoto, 'criar_pasta', lambda caminho: (tmp_path / caminho).mkdir())
    return tmp_path


@pytest.mark.parametrize('caminho',['/saidas-geoespaciais/a','saidas-geoespaciais/../base-geoespacial/test.gpkg',
    'base-geoespacial/test.gpkg','saidas-geoespaciais/execucoes/invalido/camadas/test.gpkg',
    f'saidas-geoespaciais/execucoes/{uuid4()}/outro/test.gpkg'])
def test_recusa_destinos_fora_da_regra(caminho):
    with pytest.raises(ValueError): saidas.validar(caminho)


def test_hash_divergente_remove_somente_novo_arquivo(remoto,monkeypatch):
    preserved=remoto/'preservar.gpkg'
    preserved.write_bytes(b'original')
    monkeypatch.setattr(storage_remoto,'baixar',lambda caminho:b'truncado')
    with pytest.raises(ValueError,match='diverge'):
        saidas.enviar_bytes(str(uuid4()),'camadas','novo.gpkg',b'original')
    assert [p for p in remoto.rglob('*') if p.is_file()]==[preserved]


def test_companheiros_shapefile_mantem_nome_e_reabrem(remoto,monkeypatch,tmp_path):
    frame=gpd.GeoDataFrame({'nome':['São Paulo']},geometry=[Point(-46,-23)],crs=4674)
    folder=tmp_path/'temporario'
    folder.mkdir()
    path=folder/'exemplo.shp'
    frame.to_file(path,engine='pyogrio',index=False)
    execution=str(uuid4())
    monkeypatch.setattr(ciclo,'iniciar',lambda *args:execution)
    monkeypatch.setattr(ciclo,'finalizar',lambda *args:None)
    monkeypatch.setattr(ciclo,'registrar_uso',lambda *args:None)
    class Connection:
        def execute(self,*args): pass
        def commit(self): pass
    @contextmanager
    def connection(): yield Connection()
    monkeypatch.setattr(ciclo,'get_connection',connection)
    result=ciclo.registrar_exportacao(path,'entrada_teste','vetor')
    stems={PurePosixPath(item['caminho']).stem for item in result['componentes']}
    assert len(stems)==1
    assert result['caminho'].startswith('saidas-geoespaciais/analises-avulsas/')
    assert len({str(PurePosixPath(item['caminho']).parent) for item in result['componentes']}) == 1
    restored=gpd.read_file(remoto/result['caminho'],engine='pyogrio')
    assert restored.nome.tolist()==frame.nome.tolist()
    assert restored.geometry.iloc[0].equals_exact(frame.geometry.iloc[0],0)
    assert not folder.exists()


def test_preview_raster_preserva_nodata_e_nao_altera_arquivo(remoto):
    import base64
    from hashlib import sha256
    from io import BytesIO
    import numpy as np
    from PIL import Image
    from rasterio.io import MemoryFile
    from rasterio.transform import from_origin
    with MemoryFile() as memory:
        with memory.open(driver='GTiff',height=2,width=2,count=1,dtype='float32',
                         crs=4326,transform=from_origin(-46,-23,.01,.01),nodata=-9999) as raster:
            raster.write(np.array([[0,1],[2,-9999]],dtype='float32'),1)
        content=memory.read()
    file=saidas.enviar_bytes(str(uuid4()),'camadas','raster.tif',content)
    preview=saidas.preview_raster(file['caminho'],file['sha256'])
    image=Image.open(BytesIO(base64.b64decode(preview['image'].split(',',1)[1])))
    assert image.size==(2,2) and image.getpixel((1,1))[3]==0
    assert preview['min']==0 and preview['max']==2
    assert sha256((remoto/file['caminho']).read_bytes()).hexdigest()==file['sha256']


def test_download_pacote_nao_permite_outro_proprietario(monkeypatch, execucoes_sinteticas):
    from types import SimpleNamespace
    from fastapi import HTTPException
    from api.routers.geoespacial import baixar_saida_geoespacial
    from api.repositories import saidas_geoespaciais_repository as catalogo
    monkeypatch.setattr(catalogo,'referencia',lambda caminho:{'sha256':'hash','privado':True,'responsavel':'dono'})
    def fail(*args):raise AssertionError('Não deve baixar conteúdo privado.')
    monkeypatch.setattr(saidas,'conferir',fail)
    path=saidas.destino(str(uuid4()),'pacotes','saida.zip')
    with pytest.raises(HTTPException) as error:
        baixar_saida_geoespacial(path,SimpleNamespace(id='outro',tipo_usuario='USUARIO'))
    assert error.value.status_code==404


def test_falha_no_registro_exportacao_remove_apenas_o_envio_novo(remoto,monkeypatch,tmp_path):
    source=tmp_path/'temporario'/'saida.gpkg'
    source.parent.mkdir()
    frame=gpd.GeoDataFrame(geometry=[Point(-46,-23)],crs=4674)
    frame.to_file(source,engine='pyogrio',index=False)
    execution=str(uuid4())
    monkeypatch.setattr(ciclo,'iniciar',lambda *args:execution)
    monkeypatch.setattr(ciclo,'finalizar',lambda *args,**kwargs:None)
    class Connection:
        def execute(self,*args):raise RuntimeError('Falha de registro simulada.')
    @contextmanager
    def connection():yield Connection()
    monkeypatch.setattr(ciclo,'get_connection',connection)
    with pytest.raises(RuntimeError,match='registro'):
        ciclo.registrar_exportacao(source,'entrada','vetor')
    assert source.is_file()
    assert not any(p.is_file() for p in (remoto/saidas.RAIZ).rglob('*'))


@pytest.mark.parametrize('caminho', [
    'base-geoespacial/pasta', '/saidas-geoespaciais', 'saidas-geoespaciais/../base',
    'saidas-geoespaciais//pasta', 'saidas-geoespaciais/.oculta',
    'saidas-geoespaciais/pasta\\outra', 'saidas-geoespaciais/pasta/',
])
def test_explorador_saida_recusa_fuga_da_raiz(caminho):
    with pytest.raises(ValueError):
        saidas.pasta_exportacao(caminho)


def test_explorador_saida_lista_cria_e_nao_altera_raizes_upload(remoto):
    from api.services.pastas_storage import caminho_valido
    (remoto / saidas.RAIZ).mkdir()
    created = saidas.criar_pasta(saidas.RAIZ, 'Meu projeto')
    assert created['caminho'] == 'saidas-geoespaciais/Meu projeto'
    assert saidas.listar_pastas()['pastas'] == [dict(created, raiz=False)]
    assert saidas.listar_pastas(created['caminho'])['arquivos'] == []
    with pytest.raises(FileExistsError):
        saidas.criar_pasta(saidas.RAIZ, 'Meu projeto')
    with pytest.raises(ValueError):
        caminho_valido(created['caminho'])
    with pytest.raises(FileNotFoundError):
        saidas.listar_pastas('saidas-geoespaciais/ausente')


@pytest.fixture
def exportacao_selecionada(remoto, monkeypatch, storage_sintetico):
    from api.services.geoespacial_service import geoespacial_service as geo
    folder = remoto / 'saidas-geoespaciais' / 'Projeto do usuário'
    folder.mkdir(parents=True)
    inserts = []
    class Connection:
        def execute(self, sql, params=()):
            if 'INSERT INTO geoprocessamento.arquivo_exportado' in sql:
                inserts.append(params)
            return self
        def fetchone(self):
            return {'adquirido': True}
        def commit(self):
            pass
    @contextmanager
    def connection():
        yield Connection()
    monkeypatch.setattr(ciclo, 'get_connection', connection)
    monkeypatch.setattr(ciclo, 'iniciar', lambda *args: str(uuid4()))
    monkeypatch.setattr(ciclo, 'finalizar', lambda *args, **kwargs: None)
    monkeypatch.setattr(ciclo, 'registrar_uso', lambda *args: None)
    monkeypatch.setattr(geo, '_catalogar_persistidas', lambda: None)
    monkeypatch.setattr(geo, '_camadas', {})
    monkeypatch.setattr(geo, '_rasters', {})
    monkeypatch.setattr(geo, '_metadados', {})
    monkeypatch.setattr(geo, '_raster_profiles', {})
    return geo, folder, inserts


@pytest.mark.parametrize('formato,extensao', [
    ('gpkg', 'gpkg'), ('geojson', 'geojson'), ('shapefile', 'shp'), ('geotiff', 'tif'),
])
def test_salvar_no_destino_escolhido_reabre_e_recusa_sobrescrita(exportacao_selecionada, formato, extensao):
    import asyncio
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    geo, folder, inserts = exportacao_selecionada
    raster = formato == 'geotiff'
    if raster:
        geo._rasters['entrada'] = np.array([[1, 2], [3, np.nan]], dtype='float32')
        geo._raster_profiles['entrada'] = dict(crs='EPSG:4326', transform=from_origin(-46, -23, .01, .01))
    else:
        geo._camadas['entrada'] = gpd.GeoDataFrame({'valor': [7]}, geometry=[Point(-46, -23)], crs=4326)
    geo._metadados['entrada'] = {'tipo': 'raster' if raster else 'vetorial'}
    relative = 'saidas-geoespaciais/Projeto do usuário'
    result = asyncio.run(geo.salvar_camada('entrada', relative, f'Minha saída.{extensao}', 'auto', formato))
    assert result['caminho'] == f'{relative}/Minha saída.{extensao}'
    assert inserts[0][3] == result['caminho']
    path = folder / f'Minha saída.{extensao}'
    before = {p.name: p.read_bytes() for p in folder.iterdir()}
    if raster:
        with rasterio.open(path) as source:
            assert source.crs.to_epsg() == 4326
            np.testing.assert_allclose(source.read(1), geo._rasters['entrada'], equal_nan=True)
    else:
        frame = gpd.read_file(path, engine='pyogrio')
        assert frame.valor.tolist() == [7]
        assert frame.crs.to_epsg() == 4326
        assert frame.geometry.iloc[0].equals_exact(geo._camadas['entrada'].geometry.iloc[0], 0)
    with pytest.raises(FileExistsError, match='outro nome'):
        asyncio.run(geo.salvar_camada('entrada', relative, f'Minha saída.{extensao}', 'auto', formato))
    assert {p.name: p.read_bytes() for p in folder.iterdir()} == before
    assert len(inserts) == 1


def test_gravacoes_concorrentes_na_mesma_pasta_sao_recusadas(exportacao_selecionada, monkeypatch, tmp_path):
    class Connection:
        def execute(self, *args):
            return self
        def fetchone(self):
            return {'adquirido': False}
    @contextmanager
    def connection():
        yield Connection()
    monkeypatch.setattr(ciclo, 'get_connection', connection)
    with pytest.raises(ValueError, match='Outra saída'):
        ciclo.registrar_exportacao(tmp_path / 'nao-enviado.gpkg', 'entrada', 'vetor',
                                  pasta_saida='saidas-geoespaciais/Projeto do usuário')


def test_relatorio_json_segue_destino_nome_e_catalogo(exportacao_selecionada):
    geo, folder, inserts = exportacao_selecionada
    result = ciclo.exportar_relatorio({'valido': True, 'erros': []},
                                     'saidas-geoespaciais/Projeto do usuário', 'Diagnóstico', 'entrada')
    import json
    assert result['caminho'] == 'saidas-geoespaciais/Projeto do usuário/Diagnóstico.json'
    assert json.loads((folder / 'Diagnóstico.json').read_text(encoding='utf-8')) == {'valido': True, 'erros': []}
    assert inserts[0][5].obj['reaberto_json'] is True


@pytest.mark.parametrize('formato,extensao', [('GeoPackage', 'gpkg'), ('GeoJSON', 'geojson'), ('Shapefile', 'shp')])
def test_op03_completa_grava_reabre_e_reprocessa_pasta_selecionada(exportacao_selecionada, monkeypatch, remoto, formato, extensao):
    from types import SimpleNamespace
    from api.services import bancada_arquivos as bancada, storage_geoespacial as storage
    geo, folder, inserts = exportacao_selecionada
    source_path = remoto / 'base-geoespacial' / 'entrada.gpkg'
    source_path.parent.mkdir()
    frame = gpd.GeoDataFrame({'valor': [7]}, geometry=[Point(-46, -23)], crs=4326)
    frame.to_file(source_path, layer='entrada', engine='pyogrio')
    original = source_path.read_bytes()
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: remoto)
    def registrar(frame, *args, **kwargs):
        ident = 'resultado_' + uuid4().hex
        geo._camadas[ident] = frame.copy()
        geo._metadados[ident] = {'tipo': 'vetorial'}
        return ident
    monkeypatch.setattr(geo, 'registrar_camada', registrar)
    source = bancada.abrir('base-geoespacial/entrada.gpkg')
    for index in range(2):
        params = dict(camada_id=source['id'], destino='storage',
                      pasta_saida='saidas-geoespaciais/Projeto do usuário',
                      nome_saida=f'Reprojeção.v{index}', formato_saida=formato,
                      crs_saida='entrada', crs_destino='EPSG:3857')
        result = bancada.executar('OP-03', params,
                                 {source['id']: {'arquivo': source['arquivo'], 'revisao': source['revisao']}},
                                 SimpleNamespace(id='teste'))
        source = result['camada']
        assert source['arquivo'] == f"saidas-geoespaciais/Projeto do usuário/Reprojeção.v{index}.{extensao}"
        assert source['geojson']['features'][0]['properties']['valor'] == 7
        assert source['geojson']['features'][0]['geometry']['coordinates'] == pytest.approx([-46, -23])
        reread = bancada.carregar_para_execucao(source['arquivo'], source['revisao'])
        assert reread['frame'].crs.to_epsg() == 3857
    assert len(inserts) == 2
    assert source_path.read_bytes() == original
