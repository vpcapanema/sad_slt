"""Republicação real dos serviços sobre Storage e transação sintéticos."""
from contextlib import contextmanager
from copy import deepcopy
from hashlib import sha256
import json
import re
from threading import RLock
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor

import pytest

from api.services import ciclo_vida_arquivos as ciclo, elegibilidade_jobs as jobs
from api.services import republicacao_storage as republicacao, saidas_storage, storage_remoto


@pytest.fixture
def ambiente(monkeypatch, tmp_path):
    arquivos, tabelas, locks = {}, {}, {}
    falhas = {'commit': False, 'storage': None, 'update': False, 'escritas': []}
    confirmacoes = []

    def baixar(path):
        if path not in arquivos:
            raise FileNotFoundError(path)
        return arquivos[path]

    def enviar(path, dados):
        falhas['escritas'].append(path)
        arquivos[path] = dados
        if falhas['storage'] == path:
            falhas['storage'] = None
            raise RuntimeError('Falha Storage após escrita')

    class Consulta:
        rowcount = 1
        def __init__(self, linhas):
            self.linhas = linhas
        def fetchone(self):
            return next(iter(self.linhas), None)
        def fetchall(self):
            return deepcopy(self.linhas)

    class Banco:
        def execute(self, query, params=()):
            query = query if isinstance(query, str) else query.as_string()
            if 'hierarquizacao_portfolio FOR SHARE' in query:
                return Consulta(tabelas.get(('hierarquizacao_demandas', 'hierarquizacao_portfolio'), []))
            if 'INSERT INTO geoprocessamento.arquivo_exportado' in query:
                ident, execution, recurso, caminho, componentes, validacao = params
                registros = tabelas.setdefault(('geoprocessamento', 'arquivo_exportado'), [])
                atual = next((r for r in registros if r['caminho'] == caminho), None)
                novo = dict(id=ident, execucao_id=execution, recurso_origem=recurso,
                            caminho=caminho, componentes=componentes.obj, validacao=validacao.obj)
                if atual is None:
                    registros.append(novo)
                    atual = novo
                else:
                    novo['id'] = atual['id']
                    atual.update(novo)
                return Consulta([{'id': atual['id']}])
            if 'pg_try_advisory_lock' in query:
                return Consulta([{'adquirido': True}])
            if 'pg_advisory_unlock' in query:
                return Consulta([])
            tabela = re.search(r'(?:FROM|UPDATE) "([^"]+)"\."([^"]+)"', query)
            if tabela:
                chave = tabela.group(1), tabela.group(2)
                if query.startswith('SELECT'):
                    return Consulta(tabelas.get(chave, []))
                if query.startswith('UPDATE'):
                    if falhas['update']:
                        raise RuntimeError('Falha SQL antes commit')
                    campos = re.findall(r'"([^"]+)"=%s', query)
                    for row in tabelas[chave]:
                        if row[campos[-1]] == params[-1]:
                            for campo, valor in zip(campos[:-1], params[:-1]):
                                row[campo] = deepcopy(valor.obj if hasattr(valor, 'obj') else valor)
                            return Consulta([])
            raise AssertionError('SQL sintético não reconhecido: ' + query)

    banco = Banco()
    @contextmanager
    def atomic(conn=None):
        antes = deepcopy(tabelas)
        try:
            yield banco
            if falhas['commit']:
                raise RuntimeError('Falha COMMIT explícita')
            confirmacoes.append(True)
        except Exception:
            tabelas.clear()
            tabelas.update(antes)
            raise

    @contextmanager
    def conexao():
        yield banco

    @contextmanager
    def bloquear(path):
        lock = locks.setdefault(path.casefold(), RLock())
        if not lock.acquire(blocking=False):
            raise ValueError('Publicação concorrente')
        try:
            yield
        finally:
            lock.release()

    def colunas(conn):
        tipos = {}
        for tabela, registros in tabelas.items():
            if registros:
                tipos[tabela] = {k: 'jsonb' if isinstance(v, (dict, list)) else
                                'bigint' if isinstance(v, int) else 'text'
                                for k, v in registros[0].items()}
        return tipos, {t: ['codigo' if 'codigo' in rs[0] else 'id']
                       for t, rs in tabelas.items() if rs}

    monkeypatch.setattr(republicacao, 'atomic_connection', atomic)
    monkeypatch.setattr(republicacao, 'colunas_operacionais', colunas)
    monkeypatch.setattr(republicacao, 'jsons_operacionais',
                        lambda: iter(p for p in list(arquivos) if p.startswith(republicacao.CONFIG)))
    monkeypatch.setattr(saidas_storage, 'bloquear_arquivo', bloquear)
    monkeypatch.setattr(storage_remoto, 'baixar', baixar)
    monkeypatch.setattr(storage_remoto, 'enviar_bytes', enviar)
    monkeypatch.setattr(storage_remoto, 'enviar', lambda p, a: enviar(p, a.read_bytes()))
    monkeypatch.setattr(storage_remoto, 'apagar_arquivo', lambda p: arquivos.pop(p, None))
    monkeypatch.setattr(ciclo, 'get_connection', conexao)
    monkeypatch.setattr(ciclo, 'iniciar', lambda *args: str(uuid4()))
    monkeypatch.setattr(ciclo, 'finalizar', lambda *args, **kwargs: None)
    monkeypatch.setattr(ciclo, 'registrar_uso', lambda *args: None)

    def publicar(dados, recurso='elemento-1', nome='Resumo.json', tipo='relatorio'):
        pasta = tmp_path / uuid4().hex
        pasta.mkdir()
        fonte = pasta / nome
        fonte.write_bytes(dados)
        retorno = ciclo.registrar_exportacao(fonte, recurso, tipo,
                                             pasta_saida='saidas-geoespaciais/Minha análise')
        return retorno

    return arquivos, tabelas, falhas, publicar, confirmacoes, locks


def preparar_referencias(ambiente, monkeypatch):
    arquivos, tabelas, _, publicar, _, _ = ambiente
    original = b'{"valor":"A"}'
    publicacao = publicar(original)
    path = publicacao['caminho']
    ref = {'arquivo': path, 'sha256': sha256(original).hexdigest(), 'tamanho_bytes': len(original)}
    ident = 'a' * 32
    jobpath = jobs._caminho(ident, 'dono')
    job = {'id': ident, 'dono': 'dono', 'status': 'concluido', 'resultado': deepcopy(ref),
           'logs': [deepcopy(ref)]}
    arquivos[jobpath] = json.dumps(job).encode()
    config = republicacao.CONFIG + '/analise.json'
    arquivos[config] = json.dumps({'entradas': [deepcopy(ref)],
                                  'job': {'arquivo': jobpath, 'sha256': sha256(arquivos[jobpath]).hexdigest()}}).encode()
    tabelas['geoprocessamento', 'arquivo_resultado'] = [
        {'id': 'resultado', 'caminho': path, 'sha256': ref['sha256'], 'tamanho_bytes': len(original)}]
    tabelas['hierarquizacao_demandas', 'hierarquizacao_portfolio'] = [
        {'codigo': 'HIER-001', 'status': 'calculada',
         'dados_hierarquizacao': {'relatorio': deepcopy(ref), 'logs': [deepcopy(ref)]}}]
    monkeypatch.setattr(jobs, '_jobs', {
        ident: {'id': ident, 'dono': 'dono', 'analise': 'elegibilidade',
                'estado': {'status': 'concluido'}, 'resultado': deepcopy(ref)}})
    return path, ident, jobpath, config, ref


def test_republicar_B_atualiza_job_antigo_configs_banco_e_preserva_logs_e_homonimos(ambiente, monkeypatch):
    arquivos, tabelas, _, publicar, _, _ = ambiente
    path, ident, jobpath, config, anterior = preparar_referencias(ambiente, monkeypatch)
    distinto = publicar(b'{"valor":"A"}', recurso='elemento-distinto')['caminho']
    arquivos[config] = json.dumps({'entradas': [anterior, {'arquivo': distinto, 'sha256': anterior['sha256']}],
                                 'job': {'arquivo': jobpath, 'sha256': sha256(arquivos[jobpath]).hexdigest()}}).encode()
    outro_id = next(r['id'] for r in tabelas['geoprocessamento', 'arquivo_exportado'] if r['caminho'] == distinto)
    antes_distinto = deepcopy(next(r for r in tabelas['geoprocessamento', 'arquivo_exportado'] if r['id'] == outro_id))
    tabelas['geo', 'referencias_auxiliares'] = [{
        'id': 'aux', 'pacote_caminho': path, 'pacote_sha256': anterior['sha256'],
        'pacote_tamanho_bytes': anterior['tamanho_bytes'], 'relatorio': json.dumps(anterior)}]
    novo = b'{"valor":"B mais extenso"}'
    assert publicar(novo)['caminho'] == path
    reaberto = jobs.consultar(ident, 'dono')
    assert saidas_storage.conferir(reaberto['resultado']['arquivo'], reaberto['resultado']['sha256']) == novo
    assert reaberto['resultado']['tamanho_bytes'] == len(novo)
    assert json.loads(arquivos[jobpath])['logs'] == [anterior]
    configuracao = json.loads(arquivos[config])
    assert configuracao['entradas'][0]['sha256'] == sha256(novo).hexdigest()
    assert configuracao['entradas'][1]['sha256'] == anterior['sha256']
    assert configuracao['job']['sha256'] == sha256(arquivos[jobpath]).hexdigest()
    assert arquivos[distinto] == b'{"valor":"A"}'
    assert next(r for r in tabelas['geoprocessamento', 'arquivo_exportado'] if r['id'] == outro_id) == antes_distinto
    resultado = tabelas['geoprocessamento', 'arquivo_resultado'][0]
    assert resultado['sha256'] == sha256(novo).hexdigest()
    componentes = next(r['componentes'] for r in tabelas['geoprocessamento', 'arquivo_exportado'] if r['caminho'] == path)
    assert componentes[0]['sha256'] == sha256(novo).hexdigest()
    hierarquia = tabelas['hierarquizacao_demandas', 'hierarquizacao_portfolio'][0]['dados_hierarquizacao']
    assert hierarquia['relatorio']['sha256'] == sha256(novo).hexdigest()
    assert hierarquia['logs'] == [anterior]
    auxiliar = tabelas['geo', 'referencias_auxiliares'][0]
    assert auxiliar['pacote_sha256'] == sha256(novo).hexdigest()
    assert auxiliar['pacote_tamanho_bytes'] == len(novo)
    assert json.loads(auxiliar['relatorio'])['sha256'] == sha256(novo).hexdigest()


@pytest.mark.parametrize('falha', ['storage', 'update', 'commit'])
def test_falha_restaura_todos_bytes_referencias_e_nao_confirma(ambiente, monkeypatch, falha, tmp_path):
    arquivos, tabelas, falhas, publicar, confirmacoes, _ = ambiente
    _, ident, _, config, anterior = preparar_referencias(ambiente, monkeypatch)
    antes_arquivos, antes_banco = deepcopy(arquivos), deepcopy(tabelas)
    total = len(confirmacoes)
    falhas[falha] = config if falha == 'storage' else True
    with pytest.raises(RuntimeError, match='Falha'):
        publicar(b'{"valor":"B"}')
    assert arquivos == antes_arquivos
    assert tabelas == antes_banco
    assert len(confirmacoes) == total
    assert jobs.consultar(ident, 'dono')['resultado'] == anterior
    assert [p.read_bytes() for p in tmp_path.rglob('Resumo.json')] == [b'{"valor":"B"}']


def test_homologacao_bloqueia_republicacao_sem_mudar_bytes_ou_referencias(ambiente, monkeypatch):
    arquivos, tabelas, falhas, publicar, _, _ = ambiente
    preparar_referencias(ambiente, monkeypatch)
    tabelas['hierarquizacao_demandas', 'hierarquizacao_portfolio'][0]['status'] = 'homologada'
    antes = deepcopy(arquivos), deepcopy(tabelas)
    escritas = len(falhas['escritas'])
    with pytest.raises(ValueError, match='homologado'):
        publicar(b'{"valor":"B"}')
    assert (arquivos, tabelas) == antes
    assert len(falhas['escritas']) == escritas


def test_publicacao_concorrente_e_bloqueada_sem_escrita(ambiente, monkeypatch):
    arquivos, tabelas, _, publicar, _, locks = ambiente
    preparar_referencias(ambiente, monkeypatch)
    antes = deepcopy(arquivos), deepcopy(tabelas)
    with locks[republicacao.CHAVE.casefold()]:
        with ThreadPoolExecutor(max_workers=1) as pool:
            futuro = pool.submit(publicar, b'{"valor":"B"}')
            with pytest.raises(ValueError, match='concorrente'):
                futuro.result(timeout=5)
    assert (arquivos, tabelas) == antes


def test_job_antigo_reabre_geopackage_B_com_estrutura_e_metadados_B(ambiente, monkeypatch):
    import geopandas as gpd
    from shapely.geometry import box
    from tests.territorial_ogr_helpers import calcular_ogr
    from api.services import elegibilidade_processamento, elegibilidade_relatorio
    from api.services.controle_processamento import ControleProcessamento
    arquivos, _, _, publicar, _, _ = ambiente

    def pacote(total):
        entrada = gpd.GeoDataFrame({'nome': [f'Demanda {i}' for i in range(total)]},
                                  geometry=[box(i * 10, 0, i * 10 + 5, 5) for i in range(total)], crs=31983)
        base = gpd.GeoDataFrame(geometry=[box(0, 0, 100, 100)], crs=31983)
        recortes = []
        saida, audit = calcular_ogr(entrada, [('risco', 'Risco', 'base-1', base)],
                                    ControleProcessamento(), intersecoes=recortes)
        audit['entrada'] = {'id': 'origem', 'nome': 'Demandas'}
        dados = elegibilidade_processamento.serializar(saida, audit, recortes, 'Demandas.gpkg')['Demandas.gpkg']
        return dados, audit

    a, auditoria = pacote(1)
    path = publicar(a, nome='Demandas.gpkg', tipo='vetor')['caminho']
    ident = 'b' * 32
    jobpath = jobs._caminho(ident, 'dono')
    arquivos[jobpath] = json.dumps({
        'id': ident, 'dono': 'dono', 'status': 'concluido',
        'resultado': {'arquivo': path, 'sha256': sha256(a).hexdigest(),
                      'elegibilidade': auditoria, 'feicoes': 1, 'geojson': {'conteudo': 'A'}}}).encode()
    monkeypatch.setattr(jobs, '_jobs', {})
    b, _ = pacote(2)
    publicar(b, nome='Demandas.gpkg', tipo='vetor')
    resultado = jobs.consultar(ident, 'dono')['resultado']
    reaberta, dados = elegibilidade_relatorio._ler(resultado)
    assert len(reaberta) == resultado['feicoes'] == resultado['elegibilidade']['feicoes'] == 2
    assert dados == b
    assert 'geojson' not in resultado


def test_revisoes_de_nomes_tambem_recebem_assinatura_B(ambiente, monkeypatch):
    arquivos, _, _, publicar, _, _ = ambiente
    path, _, _, _, ref = preparar_referencias(ambiente, monkeypatch)
    revisao = (path.rsplit('/', 1)[0] + '/revisoes/' + sha256(b'dono').hexdigest()
               + '/' + sha256(path.encode()).hexdigest() + '.json')
    arquivos[revisao] = json.dumps({'dono': 'dono', 'sha256': ref['sha256'],
                                   'nomes': {'base-1': 'Nome revisado'}}).encode()
    monkeypatch.setattr(republicacao, 'jsons_operacionais', lambda: iter(list(arquivos)))
    publicar(b'{"valor":"B"}')
    assert json.loads(arquivos[revisao]) == {
        'dono': 'dono', 'sha256': sha256(b'{"valor":"B"}').hexdigest(),
        'nomes': {'base-1': 'Nome revisado'}}


def test_configuracao_agregacao_continua_carregavel_com_assinatura_B(ambiente, monkeypatch):
    from api.services import agregacao_favorabilidade as agregacao
    arquivos, _, _, publicar, _, _ = ambiente
    path, _, _, _, ref = preparar_referencias(ambiente, monkeypatch)
    config = agregacao._caminho([ref], 'dono')
    arquivos[config] = json.dumps({'dono': 'dono', 'configuracao': {'medida': 'media', 'percentil': None},
                                  'arquivos': [ref]}).encode()
    publicar(b'{"valor":"B"}')
    b = {'arquivo': path, 'sha256': sha256(b'{"valor":"B"}').hexdigest()}
    assert agregacao.carregar([b], 'dono') == {'medida': 'media', 'percentil': None}


def test_execucao_ativa_bloqueia_republicacao_e_restaura_tudo(ambiente, monkeypatch):
    arquivos, tabelas, _, publicar, _, _ = ambiente
    _, _, jobpath, _, _ = preparar_referencias(ambiente, monkeypatch)
    doc = json.loads(arquivos[jobpath])
    doc['status'] = 'executando'
    arquivos[jobpath] = json.dumps(doc).encode()
    antes = deepcopy(arquivos), deepcopy(tabelas)
    with pytest.raises(ValueError, match='execução ainda ativa'):
        publicar(b'{"valor":"B"}')
    assert (arquivos, tabelas) == antes


def test_agregacao_legada_opaca_bloqueia_em_vez_de_perder_configuracao(ambiente, monkeypatch):
    arquivos, tabelas, _, publicar, _, _ = ambiente
    preparar_referencias(ambiente, monkeypatch)
    arquivos[republicacao.CONFIG + '/favorabilidade-agregacao/dono/legada.json'] = b'{"configuracao":{"medida":"media"}}'
    monkeypatch.setattr(republicacao, 'metadados_arquivo', lambda *args: {'favorabilidade': {'versao_saida': 2}})
    antes = deepcopy(arquivos), deepcopy(tabelas)
    with pytest.raises(ValueError, match='agregação legada'):
        publicar(b'{"valor":"B"}')
    assert (arquivos, tabelas) == antes


def test_erro_de_limpeza_apos_commit_explica_confirmacao_sem_simular_rollback(ambiente, monkeypatch):
    arquivos, tabelas, _, _, confirmacoes, _ = ambiente
    path, _, _, _, _ = preparar_referencias(ambiente, monkeypatch)
    total = len(confirmacoes)
    def falhar_limpeza():
        raise OSError('Arquivo temporário ocupado')
    with pytest.raises(RuntimeError, match='Publicação confirmada'):
        with republicacao.publicacao():
            saidas_storage.enviar_conteudo(path, b'{"valor":"B"}')
            republicacao.apos_confirmar(falhar_limpeza)
    assert arquivos[path] == b'{"valor":"B"}'
    assert len(confirmacoes) == total + 1
    assert tabelas['geoprocessamento', 'arquivo_resultado'][0]['sha256'] == sha256(b'{"valor":"B"}').hexdigest()
