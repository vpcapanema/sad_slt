"""Ausências anteriores não autorizam reparo, consolidação ou identidade presumida."""
from contextlib import contextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
from types import SimpleNamespace
from uuid import uuid4

import pytest

from scripts import migrar_destinos_storage as engine
from scripts.migrar_nomes_storage import Plano, consolidar_catalogo, planejar


class Consulta:
    def __init__(self, linhas):
        self.linhas = linhas

    def fetchall(self):
        return self.linhas

    def fetchone(self):
        return next(iter(self.linhas), None)


class Banco:
    def __init__(self, registros):
        self.registros = registros

    def execute(self, query, *args):
        if any(t in query for t in ('arquivo_resultado', 'extracao_atributos', 'nome_storage')):
            return Consulta([])
        return Consulta(self.registros)


@pytest.fixture
def root():
    pasta = Path.cwd() / 'tests' / ('.acervo-orfaos-' + uuid4().hex)
    pasta.mkdir()
    try:
        yield pasta
    finally:
        shutil.rmtree(pasta)


def registro(caminho, **campos):
    return {
        'registro_id': 'orfao', 'id': 'orfao', 'caminho': caminho,
        'componentes': [{'caminho': caminho}], 'validacao': None,
        'recurso_origem': None, 'execucao_id': '12345678-1234-5678-1234-567812345678',
        'parametros': {}, 'iniciado_em': datetime.now(timezone.utc), 'operacao': 'teste',
        **campos,
    }


def gravar(root, caminho, dados=b'original'):
    path = root.joinpath(*caminho.split('/'))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(dados)


PASTA = 'saidas-geoespaciais/exportacoes/analise_12345678123456781234567812345678'


def test_ausencia_integral_inventariada_sem_nome_e_sem_criar_conteudo(root, capsys):
    caminho = PASTA + '/ausente.gpkg'
    plano = planejar(root, Banco([registro(caminho)]))
    assert tuple(plano) == ({}, {}, {})
    assert plano.pendencias_preexistentes == [{
        'tipo': 'referencia_ausente_preexistente', 'tabela': 'arquivo_exportado',
        'registro_id': 'orfao', 'execucao_id': '12345678-1234-5678-1234-567812345678',
        'campo': 'caminho', 'caminho': caminho, 'caminhos_ausentes': [caminho],
        'acao': 'preservado_sem_alteracao; recuperar_da_fonte_ou_backup',
    }]
    assert json.loads(capsys.readouterr().err)['pendencia_preexistente']['caminho'] == caminho
    assert not list(root.iterdir())


def test_orfao_nao_bloqueia_arquivo_presente_identificado(root):
    ausente, presente = PASTA + '/ausente.gpkg', PASTA + '/antigo.gpkg'
    gravar(root, presente)
    plano = planejar(root, Banco([
        registro(ausente),
        registro(presente, registro_id='presente', validacao={'nome': 'Camada'}, recurso_origem='camada:1'),
    ]))
    mapa, originais, _ = plano
    assert mapa[presente].endswith('/Camada.gpkg')
    assert ausente not in mapa and ausente not in originais
    assert len(plano.pendencias_preexistentes) == 1
    assert root.joinpath(*presente.split('/')).read_bytes() == b'original'


@pytest.mark.parametrize('principal_presente', [True, False])
def test_conjunto_parcial_exige_recuperacao(root, principal_presente):
    principal, componente = PASTA + '/camada.shp', PASTA + '/camada.dbf'
    gravar(root, principal if principal_presente else componente)
    r = registro(principal, validacao={'nome': 'Camada'}, recurso_origem='camada:1',
                 componentes=[{'caminho': principal}, {'caminho': componente}])
    with pytest.raises(ValueError, match='[Rr]ecupere'):
        planejar(root, Banco([r]))


def test_orfao_nao_libera_nome_adivinhado_para_arquivo_presente(root):
    presente = PASTA + '/aparenta_nome.gpkg'
    gravar(root, presente)
    with pytest.raises(ValueError, match='não verificáveis'):
        planejar(root, Banco([registro(presente, recurso_origem='camada:1')]))


@pytest.mark.parametrize('camadas', [['Rodovias'], ['Rodovias', 'Ferrovias']])
def test_titulo_gpkg_exige_metadata_interna_univoca(root, camadas):
    from osgeo import ogr
    presente = PASTA + '/nome_fisico_12345678.gpkg'
    path = root.joinpath(*presente.split('/'))
    path.parent.mkdir(parents=True)
    ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    for nome in camadas:
        ds.CreateLayer(nome, geom_type=ogr.wkbPoint)
    ds = None
    r = registro(presente, recurso_origem='camada:1')
    if len(camadas) > 1:
        with pytest.raises(ValueError, match='não verificáveis'):
            planejar(root, Banco([r]))
    else:
        plano = planejar(root, Banco([r]))
        assert plano[0][presente].endswith('/Rodovias.gpkg')


def test_metadata_normalizacao_nao_relaxa_identidade_da_origem(root):
    from osgeo import ogr
    presente = PASTA + '/legado.gpkg'
    path = root.joinpath(*presente.split('/'))
    path.parent.mkdir(parents=True)
    ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    layer = ds.CreateLayer('demandas', geom_type=ogr.wkbPoint)
    layer.SetMetadataItem('SICARD_NORMALIZACAO', json.dumps({'origem': {'id': 'outra'}}))
    layer = ds = None
    with pytest.raises(ValueError, match='Origem da preparação diverge'):
        planejar(root, Banco([registro(presente, recurso_origem='camada:1')]))


def test_orfao_nao_pode_receber_conteudo_de_outro_arquivo(root):
    pasta = 'saidas-geoespaciais/exportacoes/analise'
    ausente, presente = pasta + '/Camada.gpkg', pasta + '/legado.gpkg'
    gravar(root, presente)
    with pytest.raises(ValueError, match='Destino coincide com referência órfã'):
        planejar(root, Banco([
            registro(ausente),
            registro(presente, validacao={'nome': 'Camada'}, recurso_origem='camada:1'),
        ]))


def test_caminho_invalido_ausente_nao_pode_ser_ignorado(root):
    with pytest.raises(ValueError, match='inválido'):
        planejar(root, Banco([registro('../fora.gpkg')]))


def test_consolidacao_nao_apaga_duplicados_orfaos():
    a = registro(PASTA + '/ausente.gpkg')
    b = {**a, 'id': 'outro'}
    assert consolidar_catalogo(Banco([a, b]), {'presente.gpkg': 'Camada.gpkg'}) == ({}, [])


def test_manifesto_persiste_pendencias_mesmo_sem_movimentos(root, monkeypatch, capsys):
    caminho = PASTA + '/ausente.gpkg'
    plano = planejar(root, Banco([registro(caminho)]))
    comandos = []

    class Conexao:
        def execute(self, *args, **kwargs):
            return Consulta([{'adquirido': True}])

        def rollback(self):
            comandos.append('rollback')

        def commit(self):
            comandos.append('commit')

    @contextmanager
    def conectar(*args, **kwargs):
        yield Conexao()

    monkeypatch.setattr(engine, 'raiz_escrita', lambda: root)
    monkeypatch.setattr(engine, 'get_settings', lambda: SimpleNamespace(slt_database_url='sintetico'))
    monkeypatch.setattr(engine.psycopg, 'connect', conectar)
    monkeypatch.setattr(engine, 'gravar', lambda r, p, d, **kw: gravar(r, p, d))
    alteracao_orfa = {
        'tabela': ('geoprocessamento', 'arquivo_exportado'), 'chaves': {'id': 'orfao'},
        'antes': {'validacao': {}}, 'depois': {'validacao': {'nome': 'nao alterar'}},
        'tipos': {'validacao': 'jsonb'},
    }
    monkeypatch.setattr(engine, 'alteracoes_banco', lambda *args: [alteracao_orfa])
    engine.executar(False, planejador=lambda *args: plano)
    assert comandos == ['rollback'] and not list(root.iterdir())
    engine.executar(True, planejador=lambda *args: plano)
    manifestos = list(root.rglob('manifesto.json'))
    assert len(manifestos) == 1
    manifesto = json.loads(manifestos[0].read_text(encoding='utf-8'))
    assert manifesto['estado'] == 'concluida'
    assert manifesto['pendencias_preexistentes'] == plano.pendencias_preexistentes
    assert manifesto['mapa'] == {} and manifesto['banco'] == []
    assert comandos == ['rollback', 'commit']
    assert not root.joinpath(*caminho.split('/')).exists()
