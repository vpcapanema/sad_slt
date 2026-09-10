"""Integração opt-in: dados sintéticos em transação revertida; storage temporário.

SLT_TEST_CICLO_BANCO=1 habilita no banco configurado após a migration 105.
"""
from contextlib import contextmanager
import os
from uuid import uuid4

import geopandas as gpd
import psycopg
from psycopg.rows import dict_row
import pytest
from shapely.geometry import Point

from api.config import get_settings
from api.repositories import camada_geoespacial_repository as repo
from api.services import ciclo_vida_arquivos as ciclo

pytestmark = pytest.mark.skipif(os.getenv('SLT_TEST_CICLO_BANCO') != '1', reason='Integração opt-in com rollback')


@pytest.fixture
def database(monkeypatch, tmp_path):
    conn = psycopg.connect(get_settings().slt_database_url, row_factory=dict_row, connect_timeout=5)
    class Transaction:
        def execute(self, *args, **kwargs): return conn.execute(*args, **kwargs)
        def cursor(self): return conn.cursor()
        def commit(self): pass  # Mantém TODAS as escritas na transação de teste.
    @contextmanager
    def connection():
        yield Transaction()
    monkeypatch.setattr(ciclo, 'get_connection', connection)
    monkeypatch.setattr(repo, 'get_connection', connection)
    monkeypatch.setattr(ciclo, 'project_path', lambda p: tmp_path / p)
    try:
        yield conn, tmp_path
    finally:
        conn.rollback()
        conn.close()


def make_result():
    resource = 'teste_ciclo_' + uuid4().hex
    execution = ciclo.iniciar('teste_sintetico', {}, 'pytest_rollback')
    token = ciclo.execucao_atual.set(execution)
    try:
        repo.salvar_vetor(recurso_id=resource,nome='Teste sintético - rollback',origem='OP-TESTE',
                          gdf=gpd.GeoDataFrame({'valor':[7]},geometry=[Point(-46,-23)],crs=4674),metadados={})
    finally:
        ciclo.execucao_atual.reset(token)


    return resource, execution


def test_extracao_persiste_recupera_e_exporta_com_proprietario(database,monkeypatch):
    from types import SimpleNamespace
    from shapely.geometry import box
    from api.services import extracao_atributos as service
    from api.services import extracao_atributos_exportacao as exports
    conn, root = database
    monkeypatch.setattr(service,'get_connection',repo.get_connection)
    monkeypatch.setattr(exports,'get_connection',repo.get_connection)
    monkeypatch.setattr(service,'project_path',lambda p:root/p)
    monkeypatch.setattr(exports,'project_path',lambda p:root/p)
    source, _ = make_result()
    base_execution=ciclo.iniciar('teste_sintetico',{},'pytest_rollback')
    token=ciclo.execucao_atual.set(base_execution)
    try:
        base=service.geo.registrar_camada(gpd.GeoDataFrame({'nome':['Base sintética']},geometry=[box(-47,-24,-45,-22)],crs=4674),'Base teste','OP-TESTE')
    finally:
        ciclo.execucao_atual.reset(token)
    monkeypatch.setattr(service,'catalogo',lambda:{'categorias':[{'id':'teste','nome':'Teste','conceito':'Teste com rollback'}],
        'camadas':[{'id':source,'nome':'Entrada'},{'id':base,'nome':'Base'}]})
    class Immediate:
        def submit(self,fn,*args):fn(*args)
    monkeypatch.setattr(service,'_pool',Immediate())
    user=SimpleNamespace(id='pytest_rollback')
    job=service.iniciar({'input_id':source,'operacao':'intersection','categorias':[{'id':'teste','camadas':[base]}]},user)
    state=service.consultar(job['id'],user,completo=True)
    assert state['status']=='concluido',state
    result=state['resultado']
    assert result['categorias'][0]['camadas'][0]['ocorrencias'][0]['atributos']['nome']=='Base sintética'
    artifact=conn.execute('SELECT * FROM geoprocessamento.arquivo_resultado WHERE execucao_id=%s',(job['id'],)).fetchone()
    assert artifact['estado']=='resultado'
    assert exports.exportar(result,'gpkg').is_file()
    assert exports.exportar(result,'pdf').is_file()
    with pytest.raises(LookupError):service.consultar(job['id'],SimpleNamespace(id='outro_usuario'),completo=True)


def test_publicacao_imutavel_sem_duplicar(database):
    conn, root = database
    resource, execution = make_result()
    ciclo.finalizar(execution)
    before = conn.execute('SELECT * FROM geoprocessamento.arquivo_resultado WHERE execucao_id=%s',(execution,)).fetchone()
    assert before['estado'] == 'resultado'
    result = ciclo.publicar(resource,'pytest_rollback')
    assert result['estado'] == 'acervo'
    assert result['arquivo'] == before['caminho']
    assert len(list(root.rglob('*.gpkg'))) == 1
    with pytest.raises(ValueError, match='imutável'):
        ciclo.exigir_editavel(resource)
    assert ciclo.publicar(resource,'outro_usuario') == result
    assert conn.execute('SELECT publicado_por FROM geoprocessamento.arquivo_resultado WHERE id=%s',(before['id'],)).fetchone()['publicado_por'] == 'pytest_rollback'


def test_retencao_desativada_previa_e_remocao(database):
    conn, root = database
    resource, execution = make_result()
    ciclo.finalizar(execution,temporario=True)
    conn.execute("UPDATE geoprocessamento.execucao_arquivo SET finalizado_em=now()-interval '40 days' WHERE id=%s",(execution,))
    ciclo.politica(None,'pytest',salvar=True)
    assert ciclo.limpar('pytest')['quantidade'] == 0
    ciclo.politica(30,'pytest',salvar=True)
    preview = ciclo.limpar('pytest')
    assert preview['quantidade'] == 1
    assert (root / preview['arquivos'][0]).is_file()
    result = ciclo.limpar('pytest',executar=True)
    assert result['quantidade'] == 1
    assert not (root / preview['arquivos'][0]).exists()
    assert conn.execute('SELECT 1 FROM geoprocessamento.camada_processada WHERE recurso_sessao_id=%s',(resource,)).fetchone()
    assert ciclo.limpar('pytest',executar=True)['quantidade'] == 0


@pytest.mark.parametrize('usage',['entrada','relatorio','homologacao'])
def test_retencao_preserva_referenciados(database,usage):
    conn, root = database
    resource, execution = make_result()
    ciclo.finalizar(execution,temporario=True)
    conn.execute("UPDATE geoprocessamento.execucao_arquivo SET finalizado_em=now()-interval '40 days' WHERE id=%s",(execution,))
    ciclo.registrar_uso(conn,resource,usage,'teste_rollback')
    ciclo.politica(1,'pytest',salvar=True)
    assert ciclo.limpar('pytest',executar=True)['quantidade'] == 0
    assert len(list(root.rglob('*.gpkg'))) == 1


def test_entrada_conserva_id_e_hash(database):
    conn, _ = database
    resource, execution = make_result()
    ciclo.finalizar(execution)
    consumer = ciclo.iniciar('teste_consumidor',{'camada_id':resource},'pytest')
    snapshot = conn.execute('SELECT entradas FROM geoprocessamento.execucao_arquivo WHERE id=%s',(consumer,)).fetchone()['entradas'][0]
    output = conn.execute('SELECT * FROM geoprocessamento.arquivo_resultado WHERE execucao_id=%s',(execution,)).fetchone()
    assert snapshot['arquivo_id'] == str(output['id'])
    assert snapshot['sha256'] == output['sha256']


@pytest.mark.parametrize('state',['executando','resultado','acervo'])
def test_retencao_preserva_execucao_ativa_e_definitivos(database,state):
    conn, root = database
    resource, execution = make_result()
    if state != 'executando':
        ciclo.finalizar(execution)
    if state == 'acervo':
        ciclo.publicar(resource,'pytest')
    conn.execute("UPDATE geoprocessamento.execucao_arquivo SET finalizado_em=now()-interval '40 days' WHERE id=%s",(execution,))
    ciclo.politica(1,'pytest',salvar=True)
    assert ciclo.limpar('pytest',executar=True)['quantidade'] == 0
    assert len(list(root.rglob('*.gpkg'))) == 1


def test_retencao_nao_remove_arquivo_divergente(database):
    conn, root = database
    resource, execution = make_result()
    ciclo.finalizar(execution,temporario=True)
    conn.execute("UPDATE geoprocessamento.execucao_arquivo SET finalizado_em=now()-interval '40 days' WHERE id=%s",(execution,))
    path = next(root.rglob('*.gpkg'))
    path.write_bytes(b'conteudo divergente de teste')
    ciclo.politica(1,'pytest',salvar=True)
    assert ciclo.limpar('pytest',executar=True)['quantidade'] == 0
    assert path.exists()


def test_falha_na_validacao_nao_confirma_saida(database,monkeypatch):
    conn, root = database
    execution = ciclo.iniciar('teste_falha',{},'pytest')
    token = ciclo.execucao_atual.set(execution)
    def fail(*args): raise ValueError('Falha de validação simulada')
    monkeypatch.setattr(ciclo,'validar_vetor',fail)
    try:
        with pytest.raises(ValueError):
            repo.salvar_vetor(recurso_id='teste_'+uuid4().hex,nome='Teste',origem='OP-TESTE',
                gdf=gpd.GeoDataFrame(geometry=[Point(1,2)],crs=4674),metadados={})
        assert not conn.execute('SELECT 1 FROM geoprocessamento.arquivo_resultado WHERE execucao_id=%s',(execution,)).fetchone()
        assert not list(root.rglob('*.gpkg'))
    finally:
        ciclo.execucao_atual.reset(token)
