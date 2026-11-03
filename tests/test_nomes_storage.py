from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from io import BytesIO
import json
from zipfile import ZipFile
from contextlib import contextmanager
from types import SimpleNamespace

import pytest

from api.services.nomes_storage import reservar as reservar_real
from api.services import saidas_storage, storage_remoto
from scripts.migrar_nomes_storage import planejar, consolidar_catalogo
from scripts.migrar_destinos_storage import transformar_jsons, Remapeamento


class Consulta:
    def __init__(self, linhas):
        self.linhas = linhas

    def fetchone(self):
        return next(iter(self.linhas), None)

    def fetchall(self):
        return self.linhas

    def __iter__(self):
        return iter(self.linhas)


def test_reservar_real_separa_homonimos_e_reutiliza_identidade(monkeypatch):
    class Banco:
        def __init__(self):
            self.reservas = {}
            self.locks = 0

        def execute(self, query, params):
            if 'pg_advisory_xact_lock' in query:
                self.locks += 1
                return Consulta([])
            if query.startswith('INSERT'):
                escopo, ident, nome = params
                self.reservas[escopo, ident] = nome
                return Consulta([])
            escopo = params[0]
            return Consulta([{'nome': nome} for (p, ident), nome in self.reservas.items()
                             if p == escopo and (len(params) == 1 or ident == params[1])])
    banco = Banco()
    monkeypatch.setattr(storage_remoto, 'listar', lambda *a, **k: [{'nome': 'Camada', 'pasta': False}])
    assert reservar_real('escopo', 'elemento-1', 'Camada', conn=banco) == 'Camada_2'
    assert reservar_real('escopo', 'elemento-2', 'camada', conn=banco) == 'camada_3'
    assert reservar_real('escopo', 'elemento-1', 'Outro título', conn=banco) == 'Camada_2'
    assert reservar_real('outro', 'elemento-1', 'Camada', conn=banco) == 'Camada_2'
    assert banco.locks == 4


@pytest.mark.parametrize('nome', ['../a', 'a/b', 'a\\b', '', '..'])
def test_reserva_recusa_nome_invalido(nome):
    with pytest.raises(ValueError):
        reservar_real('escopo', 'elemento', nome, conn=object())


def test_falha_integridade_restaura_arquivo_anterior(monkeypatch):
    path = 'saidas-geoespaciais/exportacoes/analise/Resumo.pdf'
    arquivos = {path: b'anterior'}
    monkeypatch.setattr(storage_remoto, 'baixar', lambda p: arquivos[p])
    monkeypatch.setattr(storage_remoto, 'enviar_bytes', lambda p, d: arquivos.__setitem__(p, d))
    monkeypatch.setattr(saidas_storage, 'conferir', lambda *a: (_ for _ in ()).throw(ValueError('hash')))
    with pytest.raises(ValueError, match='hash'):
        saidas_storage.enviar_conteudo(path, b'novo')
    assert arquivos[path] == b'anterior'


def registro(caminho, recurso, data, nome='Camada'):
    return {'caminho': caminho, 'componentes': [{'caminho': caminho}],
            'validacao': {'nome': nome}, 'recurso_origem': recurso,
            'execucao_id': '12345678-1234-5678-1234-567812345678',
            'parametros': {}, 'iniciado_em': data, 'operacao': 'teste'}


def catalogo(registros):
    class Banco:
        def execute(self, query, *args):
            if 'arquivo_resultado' in query or 'extracao_atributos' in query or 'nome_storage' in query:
                return Consulta([])
            return Consulta(registros)
    return Banco()


def gravar(root, caminho, dados):
    path = root / caminho
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(dados)


def test_migracao_consolida_so_mesma_identidade_e_data_e_remapeia_hash(tmp_path):
    pasta = 'saidas-geoespaciais/analises-avulsas/ferramenta/analise_12345678123456781234567812345678'
    a, b, c = [pasta + '/' + p + '.gpkg' for p in ('antigo', 'novo', 'homonimo')]
    for caminho, dados in [(a, b'antes'), (b, b'vigente'), (c, b'outro')]:
        gravar(tmp_path, caminho, dados)
    hoje = datetime.now(timezone.utc)
    banco = catalogo([registro(a, 'id-1', hoje - timedelta(days=1)),
                      registro(b, 'id-1', hoje), registro(c, 'id-2', hoje)])
    mapa, originais, preferidas = planejar(tmp_path, banco)
    assert mapa[a] == mapa[b]
    assert mapa[c] != mapa[a]
    assert mapa[b].endswith('/Camada.gpkg')
    assert mapa[c].endswith('/Camada_2.gpkg')
    novos, remapear = transformar_jsons(originais, mapa, preferidas)
    assert novos[a] == novos[b] == b'vigente'
    assert remapear.valor({'arquivo': a, 'sha256': sha256(b'antes').hexdigest()}) == {
        'arquivo': mapa[a], 'sha256': sha256(b'vigente').hexdigest()}
    assert (tmp_path / a).read_bytes() == b'antes'


def test_migracao_bloqueia_data_empatada_conteudo_divergente(tmp_path):
    pasta = 'saidas-geoespaciais/exportacoes/analise_12345678123456781234567812345678'
    a, b = pasta + '/a.gpkg', pasta + '/b.gpkg'
    gravar(tmp_path, a, b'a')
    gravar(tmp_path, b, b'b')
    hoje = datetime.now(timezone.utc)
    with pytest.raises(ValueError, match='empatada'):
        planejar(tmp_path, catalogo([registro(a, 'mesmo', hoje), registro(b, 'mesmo', hoje)]))


def test_migracao_bloqueia_arquivo_sem_catalogo(tmp_path):
    gravar(tmp_path, 'saidas-geoespaciais/desconhecido.gpkg', b'original')
    with pytest.raises(ValueError, match='sem vínculo verificável'):
        planejar(tmp_path, catalogo([]))


def test_consolidacao_preserva_id_vigente_e_remapeia_apenas_referencia_operacional():
    hoje = datetime.now(timezone.utc)
    registros = [
        {'id': 'antigo', 'caminho': 'antes.gpkg', 'data_execucao': hoje - timedelta(days=1),
         'criado_em': hoje - timedelta(days=1), 'recurso_origem': 'elemento'},
        {'id': 'vigente', 'caminho': 'depois.gpkg', 'data_execucao': hoje,
         'criado_em': hoje, 'recurso_origem': 'elemento'},
    ]
    aliases, exclusoes = consolidar_catalogo(catalogo(registros),
                                           {'antes.gpkg': 'Camada.gpkg', 'depois.gpkg': 'Camada.gpkg'})
    assert aliases == {'antigo': 'vigente'}
    assert [r['id'] for r in exclusoes] == ['antigo']
    dados = {'exportacao': {'arquivo_exportado_id': 'antigo'},
             'execucao_id': 'antigo', 'logs': [{'arquivo_exportado_id': 'antigo'}]}
    assert Remapeamento({}, ids=aliases).valor(dados) == {
        'exportacao': {'arquivo_exportado_id': 'vigente'}, 'execucao_id': 'antigo',
        'logs': [{'arquivo_exportado_id': 'antigo'}]}


def test_migracao_zip_atualiza_referencias_e_assinaturas_sem_alterar_payload():
    buffer = BytesIO()
    with ZipFile(buffer, 'w') as pacote:
        pacote.writestr('manifesto.json', json.dumps({'arquivo': 'antigo.gpkg',
                                                    'sha256': sha256(b'antigo').hexdigest()}))
        pacote.writestr('Camada.gpkg', b'payload')
    originais = {'antigo.gpkg': b'antigo', 'pacote.zip': buffer.getvalue()}
    novos, _ = transformar_jsons(originais, {'antigo.gpkg': 'Camada.gpkg'},
                                 {'antigo.gpkg': b'vigente'})
    with ZipFile(BytesIO(novos['pacote.zip'])) as pacote:
        manifesto = json.loads(pacote.read('manifesto.json'))
        assert manifesto == {'arquivo': 'Camada.gpkg', 'sha256': sha256(b'vigente').hexdigest()}
        assert pacote.read('Camada.gpkg') == b'payload'


def test_planejamento_repetido_nao_reorganiza_nomes_ja_reservados(tmp_path, nomes_storage_sinteticos):
    antes = 'saidas-geoespaciais/exportacoes/analise_12345678123456781234567812345678/antigo.gpkg'
    gravar(tmp_path, antes, b'original')
    r = registro(antes, 'elemento', datetime.now(timezone.utc))
    mapa, _, _ = planejar(tmp_path, catalogo([r]))
    depois = mapa[antes]
    gravar(tmp_path, depois, b'original')
    (tmp_path / antes).unlink()
    r = {**r, 'caminho': depois, 'componentes': [{'caminho': depois}]}
    class Banco:
        def execute(self, query, params=()):
            if 'SELECT identidade' in query:
                escopo, nome = params
                return Consulta([{'identidade': ident} for (p, ident), n in nomes_storage_sinteticos.items()
                                 if p == escopo and n == nome])
            return catalogo([r]).execute(query, params)
    novamente, _, _ = planejar(tmp_path, Banco())
    assert novamente == {}


def test_simulacao_nao_grava_arquivos_nem_confirma_transacao(tmp_path, monkeypatch):
    from scripts import migrar_destinos_storage as engine
    origem = 'saidas-geoespaciais/antigo.gpkg'
    gravar(tmp_path, origem, b'original')
    class Banco:
        rollback_executado = False
        def execute(self, *args):
            return Consulta([{'adquirido': True}])
        def rollback(self):
            self.rollback_executado = True
        def commit(self):
            raise AssertionError('Simulação não pode confirmar a transação.')
    banco = Banco()
    @contextmanager
    def conectar(*args, **kwargs):
        yield banco
    def proibido(*args, **kwargs):
        raise AssertionError('Simulação não pode gravar no Storage.')
    monkeypatch.setattr(engine, 'raiz_escrita', lambda: tmp_path)
    monkeypatch.setattr(engine, 'get_settings', lambda: SimpleNamespace(slt_database_url='sintetico'))
    monkeypatch.setattr(engine.psycopg, 'connect', conectar)
    monkeypatch.setattr(engine, 'alteracoes_banco', lambda *args: [])
    monkeypatch.setattr(engine, 'gravar', proibido)
    monkeypatch.setattr(storage_remoto, 'enviar_bytes', proibido)
    monkeypatch.setattr(storage_remoto, 'enviar', proibido)
    monkeypatch.setattr(storage_remoto, 'apagar_arquivo', proibido)
    engine.executar(False, planejador=lambda *args: (
        {origem: 'saidas-geoespaciais/Camada.gpkg'}, {origem: b'original'}, {}))
    assert banco.rollback_executado
    assert (tmp_path / origem).read_bytes() == b'original'
    assert not (tmp_path / 'saidas-geoespaciais' / 'Camada.gpkg').exists()


def test_aplicacao_sintetica_consolida_antes_da_unique_e_remove_so_fontes_conferidas(tmp_path, monkeypatch):
    from scripts import migrar_destinos_storage as engine
    a, b, alvo = ['saidas-geoespaciais/' + n for n in ('antes.gpkg', 'depois.gpkg', 'Camada.gpkg')]
    gravar(tmp_path, a, b'antes')
    gravar(tmp_path, b, b'vigente')
    comandos = []
    class Banco:
        def execute(self, query, params=()):
            query = query if isinstance(query, str) else query.as_string()
            comandos.append(query)
            resposta = Consulta([{'adquirido': True}])
            resposta.rowcount = 1
            return resposta
        def commit(self):
            comandos.append('COMMIT')
        def rollback(self):
            comandos.append('ROLLBACK')
    @contextmanager
    def conectar(*args, **kwargs):
        yield Banco()
    atualizacoes = [
        {'tabela': ('geoprocessamento', 'arquivo_exportado'), 'chaves': {'id': ident},
         'antes': {'caminho': origem}, 'depois': {'caminho': alvo}, 'tipos': {'caminho': 'text'}}
        for ident, origem in [('antigo', a), ('vigente', b)]
    ]
    chamadas = []
    def alteracoes(*args):
        chamadas.append(True)
        return atualizacoes if len(chamadas) == 1 else []
    publicados = []
    def publicar(root, relativo, dados, **kwargs):
        path = root / relativo
        if kwargs.get('exclusivo') and path.exists():
            raise FileExistsError(relativo)
        gravar(root, relativo, dados)
        publicados.append(relativo)
    def conferir(arquivos):
        for caminho, dados in arquivos.items():
            assert (tmp_path / caminho).read_bytes() == dados
    monkeypatch.setattr(engine, 'raiz_escrita', lambda: tmp_path)
    monkeypatch.setattr(engine, 'get_settings', lambda: SimpleNamespace(slt_database_url='sintetico'))
    monkeypatch.setattr(engine.psycopg, 'connect', conectar)
    monkeypatch.setattr(engine, 'alteracoes_banco', alteracoes)
    monkeypatch.setattr(engine, 'gravar', publicar)
    monkeypatch.setattr(engine, 'conferir_api', conferir)
    engine.executar(True, planejador=lambda *args: (
        {a: alvo, b: alvo}, {a: b'antes', b: b'vigente'}, {a: b'vigente', b: b'vigente'}),
        consolidar=lambda *args: ({'antigo': 'vigente'}, [{'id': 'antigo', 'caminho': a}]))
    assert (tmp_path / alvo).read_bytes() == b'vigente'
    assert not (tmp_path / a).exists() and not (tmp_path / b).exists()
    assert publicados.count(alvo) == 1
    exclusao = next(i for i, sql in enumerate(comandos) if sql.startswith('DELETE'))
    atualizacao = next(i for i, sql in enumerate(comandos) if sql.startswith('UPDATE'))
    assert exclusao < atualizacao < comandos.index('COMMIT')
    assert len([sql for sql in comandos if sql.startswith('UPDATE')]) == 1
