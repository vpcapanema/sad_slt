import csv
import io
import zipfile
from contextlib import contextmanager
from types import SimpleNamespace

import pytest

from scripts.completar_setores_2022 import (
    COLUNAS_NASCIMENTO, abrir_csv, campos_csv, linhas_sp, unidade,
)


@pytest.mark.parametrize('acquired', [False, True])
def test_carga_mantem_lock_na_mesma_sessao_ate_fechar(monkeypatch, acquired):
    from scripts import completar_setores_2022 as service
    calls = []

    class Connection:
        def execute(self, query):
            calls.append(query)
            return self

        def fetchone(self):
            return {'adquirido': acquired}

    connection = Connection()

    @contextmanager
    def connect(dsn, **kwargs):
        assert dsn == 'teste'
        assert kwargs['autocommit'] is True
        calls.append('abrir')
        try:
            yield connection
        finally:
            calls.append('fechar')

    monkeypatch.setattr(service, 'get_settings', lambda: SimpleNamespace(slt_database_url='teste'))
    monkeypatch.setattr(service.psycopg, 'connect', connect)
    if acquired:
        with service.conexao_exclusiva(True) as conn:
            assert conn is connection
            assert 'fechar' not in calls
        assert calls[-1] == 'fechar'
    else:
        with pytest.raises(RuntimeError, match='Outra carga territorial'):
            with service.conexao_exclusiva(True):
                pytest.fail('Nao deve iniciar outra carga.')
        assert calls[-1] == 'fechar'
    assert any('pg_try_advisory_lock' in query for query in calls)


def test_carga_fecha_sessao_em_erro_e_validacao_nao_trava(monkeypatch):
    from scripts import completar_setores_2022 as service
    calls = []

    class Connection:
        def execute(self, query):
            calls.append(query)

    @contextmanager
    def connect(*args, **kwargs):
        try:
            yield Connection()
        finally:
            calls.append('fechar')

    monkeypatch.setattr(service.psycopg, 'connect', connect)
    monkeypatch.setattr(service, 'get_settings', lambda: SimpleNamespace(slt_database_url='teste'))
    with pytest.raises(ValueError, match='fonte invalida'):
        with service.conexao_exclusiva(False):
            raise ValueError('fonte invalida')
    assert calls == ['SET default_transaction_read_only = on', 'fechar']


@pytest.mark.parametrize('failure', [False, True])
def test_carga_usa_transacoes_por_arquivo_na_mesma_conexao(monkeypatch, tmp_path, failure):
    from scripts import completar_setores_2022 as service
    events = []

    class Connection:
        active = False

        @contextmanager
        def transaction(self):
            assert not self.active
            self.active = True
            events.append('inicio')
            try:
                yield
            except ValueError:
                events.append('rollback')
                raise
            else:
                events.append('commit')
            finally:
                self.active = False

        def execute(self, query):
            assert self.active
            if query.startswith('SELECT cd_setor'):
                return ({'cd_setor': str(number)} for number in range(103319))
            if query.startswith('SELECT id'):
                return [{'id': str(number)} for number in range(12)]
            events.append(query)

    connection = Connection()

    @contextmanager
    def reader(path):
        assert not connection.active
        yield path.stem

    def apply(conn, path, name, *args):
        assert conn is connection and conn.active
        events.append(name)
        if failure and name == 'segundo':
            raise ValueError('fonte invalida')
        return {'conjunto': name}

    monkeypatch.setattr(service, 'FONTES', [('primeiro', 'a.csv', ''), ('segundo', 'b.csv', '')])
    monkeypatch.setattr(service, 'preparar_dicionarios', lambda _: ({}, []))
    monkeypatch.setattr(service, 'baixar', lambda folder, file, _: folder / file)
    monkeypatch.setattr(service, 'abrir_csv', reader)
    monkeypatch.setattr(service, 'campos_csv', lambda content, *_: ('cd', {content: (content, None)}))
    monkeypatch.setattr(service, 'assinatura_malha', lambda _: {'setores': 103319})
    monkeypatch.setattr(service, 'aplicar_fonte', apply)
    monkeypatch.setattr(service, 'materializar_setores', lambda conn: events.append('combinados'))
    args = SimpleNamespace(insumos=tmp_path, aplicar=True, retomar=False, relatorio=None)
    if failure:
        with pytest.raises(ValueError, match='fonte invalida'):
            service.executar(args, connection)
        assert events.count('commit') == 2
        assert events.count('rollback') == 1
        assert 'combinados' not in events
    else:
        service.executar(args, connection)
        assert events.count('commit') == 4
        assert events.count('rollback') == 0
        assert 'combinados' in events
    assert not connection.active


def test_basico_preserva_chaves_existentes_e_adiciona_vagos():
    reader = csv.DictReader(io.StringIO('CD_SETOR;V0001;V0008;V0009\n'), delimiter=';')
    code, fields = campos_csv(reader, 'basico', dict.fromkeys(['V0001', 'V0008', 'V0009']))
    assert code == 'CD_SETOR'
    assert fields == {'V0001': ('v0001', None), 'V0008': ('v0008', None), 'V0009': ('v0009', None)}


def test_basico_aceita_nomes_minusculos_publicados():
    reader = csv.DictReader(io.StringIO('CD_SETOR;v0001;v0008;v0009\n'), delimiter=';')
    _, fields = campos_csv(reader, 'basico', dict.fromkeys(['V0001', 'V0008', 'V0009']))
    assert fields['v0001'] == ('v0001', None)


def test_variavel_sem_dicionario_impede_carga():
    reader = csv.DictReader(io.StringIO('CD_setor;V99999\n'), delimiter=';')
    with pytest.raises(ValueError, match='sem dicionario'):
        campos_csv(reader, 'renda', {})


def test_leitura_streaming_preserva_sigilo_zero_e_ausencia():
    reader = csv.DictReader(io.StringIO(
        'setor;V06001;V06002\n110001505000002;1;2\n350010505000001;0;X\n'
        '350010505000002;.;5\n'), delimiter=';')
    fields = {'V06001': ('V06001', None), 'V06002': ('V06002', None)}
    result = list(linhas_sp(reader, 'setor', fields, {'350010505000001', '350010505000002'}))
    assert result == [
        ('350010505000001', {'V06001': 0, 'V06002': None}, {'V06002': 'X'}),
        ('350010505000002', {'V06001': None, 'V06002': 5}, {'V06001': '.'}),
    ]


@pytest.mark.parametrize('codes', [set(), {'350010505000001'}])
def test_setor_fora_da_malha_ou_repetido_impede_carga(codes):
    reader = csv.DictReader(io.StringIO(
        'setor;V06001\n350010505000001;1\n350010505000001;2\n'), delimiter=';')
    with pytest.raises(ValueError, match='fora da malha ou repetido'):
        list(linhas_sp(reader, 'setor', {'V06001': ('V06001', None)}, codes))


def test_registro_nascimento_preserva_cabecalho_e_universo(tmp_path):
    path = tmp_path / 'nascimento.csv'
    headers = ['Setor Censitário', *COLUNAS_NASCIMENTO]
    path.write_text(';;;;;;;;;;Registro de Nacimento;;;;\n' + ';'.join(headers) +
                    '\n350010505000001;10;30;4;3;0;X;0;0\n', encoding='cp1252')
    with abrir_csv(path) as reader:
        code, fields = campos_csv(reader, 'registro_nascimento', {})
        result = list(linhas_sp(reader, code, fields, {'350010505000001'}))
    assert len(fields) == 8
    assert result[0][1]['registro_nascimento_ate_5'] == 4
    assert result[0][1]['registro_nascimento_sem_registro'] is None
    assert result[0][2] == {'registro_nascimento_sem_registro': 'X'}


def test_zip_nao_escolhe_csv_arbitrario(tmp_path):
    path = tmp_path / 'ambiguo.zip'
    with zipfile.ZipFile(path, 'w') as archive:
        archive.writestr('a.csv', '')
        archive.writestr('b.csv', '')
    with pytest.raises(ValueError, match='ambiguo'):
        with abrir_csv(path):
            pass


@pytest.mark.parametrize('name,key,description,tipo,expected', [
    ('renda', 'V06004', '', '', 'R$'),
    ('renda', 'V06005', '', '', 'R$²'),
    ('entorno_faces', 'V05400', '', '', 'Faces'),
    ('entorno_moradores', 'V05200', '', '', 'Pessoas'),
    ('obitos', 'V01224', 'Existe pessoa falecida no domicilio', 'Mortalidade', 'Domicilios'),
    ('domicilios_indigenas', 'V01501', 'Moradores indígenas no domicílio', 'Domicílio', 'Pessoas'),
    ('pessoas_indigenas', 'V02000', '', 'Pessoas', 'Pessoas'),
    ('basico', 'V0005', '', '', 'moradores/domicilio'),
])
def test_unidades_respeitam_o_universo(name, key, description, tipo, expected):
    assert unidade(name, key, description, tipo) == expected
