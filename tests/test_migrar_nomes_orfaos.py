"""Ausências anteriores não autorizam reparo, consolidação ou identidade presumida."""
from contextlib import contextmanager
from datetime import datetime, timezone
from io import BytesIO
import json
import os
from pathlib import Path
import shutil
from types import SimpleNamespace
from uuid import uuid4
from zipfile import ZipFile

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
        shutil.rmtree('\\\\?\\' + str(pasta) if os.name == 'nt' else pasta)


@pytest.fixture
def root_revisoes(root):
    return Path('\\\\?\\' + str(root)) if os.name == 'nt' else root


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


def pacote_legado(root, *, companheiro=True, metadata_catalogo=True, nomes=None,
                  manifesto_companheiro=None, alterar_metadata=None):
    base = 'municipios_sp_f95a4c0c_teste_dani'
    caminho = PASTA + '/' + base + '_a9673a8303db.zip'
    relatorio = PASTA + '/' + base + '_metadados_baaf09ed1029.json'
    manifesto = {'format': 'fgb', 'municipalities': 645, 'attributes': [{'id': 'indicador'}]}
    buffer = BytesIO()
    with ZipFile(buffer, 'w') as archive:
        archive.writestr(base + '.fgb', b'camada sintetica')
        archive.writestr(base + '_metadados.json', json.dumps(manifesto))
    dados = buffer.getvalue()
    gravar(root, caminho, dados)
    registros = [registro(
        caminho, validacao={'pacote_municipal': True},
        recurso_origem='camada_d61b7dbf9c464471994069ea64db7f0b',
        parametros={'format': 'fgb', 'plugin': 'municipal-layer'},
        componentes=[{'caminho': caminho, 'sha256': engine.assinatura(dados)}])]
    if companheiro:
        conteudo = json.dumps(manifesto if manifesto_companheiro is None else manifesto_companheiro).encode()
        gravar(root, relatorio, conteudo)
        registros.append({**registros[0], 'registro_id': 'relatorio',
                          'caminho': relatorio, 'validacao': {'tipo': 'metadados_municipais'},
                          'componentes': [{'caminho': relatorio, 'sha256': engine.assinatura(conteudo)}]})
    metadata = {'execucao_id': registros[0]['execucao_id'], 'base_arquivos': base}
    if metadata_catalogo:
        metadata['manifesto'] = manifesto
    metadata.update(alterar_metadata or {})
    nomes = ['Teste Dani'] if nomes is None else nomes

    class CatalogoMunicipal(Banco):
        def execute(self, query, *args):
            if 'SELECT nome,metadados' in query:
                recurso = registros[0]['recurso_origem']
                assert args == ((recurso, recurso),)
                return Consulta([{'nome': nome, 'metadados': metadata} for nome in nomes])
            return super().execute(query, *args)
    return caminho, registros, CatalogoMunicipal(registros)


@pytest.mark.parametrize('companheiro,metadata_catalogo', [(True, True), (False, True), (True, False)])
def test_pacote_legado_usa_nome_humano_do_recurso_e_manifesto_comprovado(
        root, companheiro, metadata_catalogo):
    caminho, registros, banco = pacote_legado(
        root, companheiro=companheiro, metadata_catalogo=metadata_catalogo)
    mapa, originais, _ = planejar(root, banco)
    assert mapa[caminho].endswith('/Pacote Teste Dani.zip')
    assert 'f95a4c0c' not in mapa[caminho] and 'a9673a8303db' not in mapa[caminho]
    assert len(originais) == len(registros)
    assert root.joinpath(*caminho.split('/')).read_bytes() == originais[caminho]


@pytest.mark.parametrize('nomes', [
    [], ['Teste Dani', 'Outro nome'], ['Teste Dani', 'Teste Dani'],
    ['d61b7dbf9c464471994069ea64db7f0b'],
])
def test_pacote_sem_nome_univoco_no_catalogo_nao_usa_basename(root, nomes):
    _, _, banco = pacote_legado(root, nomes=nomes)
    with pytest.raises(ValueError, match='não verificáveis'):
        planejar(root, banco)


def test_pacote_sem_correspondencia_manifesto_nao_usa_so_nome_catalogo(root):
    _, _, banco = pacote_legado(root, companheiro=False, metadata_catalogo=False)
    with pytest.raises(ValueError, match='não verificáveis'):
        planejar(root, banco)


@pytest.mark.parametrize('campo,valor', [
    ('recurso_origem', 'camada_outro_recurso'),
    ('execucao_id', 'outra-execucao'),
])
def test_pacote_nao_usa_companheiro_de_outro_recurso_ou_execucao(root, campo, valor):
    _, registros, banco = pacote_legado(root, metadata_catalogo=False)
    registros[1][campo] = valor
    with pytest.raises(ValueError, match='não verificáveis'):
        planejar(root, banco)


@pytest.mark.parametrize('metadata', [
    {'execucao_id': 'outra-execucao'},
    {'base_arquivos': 'outra-base'},
    {'manifesto': {'format': 'gpkg'}},
])
def test_pacote_divergente_do_recurso_nao_e_migrado(root, metadata):
    _, _, banco = pacote_legado(root, alterar_metadata=metadata)
    with pytest.raises(ValueError, match='diverge'):
        planejar(root, banco)


def test_pacote_divergente_do_relatorio_nao_e_migrado(root):
    _, _, banco = pacote_legado(root, manifesto_companheiro={'format': 'gpkg'})
    with pytest.raises(ValueError, match='diverge do relatório municipal'):
        planejar(root, banco)


def test_pacote_continua_exigindo_hash_do_catalogo(root):
    _, registros, banco = pacote_legado(root)
    registros[0]['componentes'][0]['sha256'] = '0' * 64
    with pytest.raises(ValueError, match='Integridade do componente diverge'):
        planejar(root, banco)


def test_caminho_invalido_ausente_nao_pode_ser_ignorado(root):
    with pytest.raises(ValueError, match='inválido'):
        planejar(root, Banco([registro('../fora.gpkg')]))


PROCESSAMENTO = 'saidas-geoespaciais/analises-avulsas/processamento/'


def test_produtos_exploratorios_legiveis_sao_apenas_inventariados(root, capsys):
    rasters = 'favorabilidade-rede-raster-200m-20261027T215337Z/'
    rede = 'tomtom-rede-completa-20261027T205730Z/'
    caminhos = [
        rasters + 'superficie_favorabilidade_rede_' + papel + '_200m.tif'
        for papel in ('mascara_sem_indice', 'distancia_metros', 'indice_final',
                      'pertinencia_fuzzy', 'trecho_origem')
    ] + [
        rasters + 'metadados_validacao.json',
        'tomtom-recuperacao-20261027T205152Z/observacoes_tomtom.json',
    ] + [rede + nome for nome in (
        'favorabilidade_rede_trechos_20261027.gpkg', 'observacoes_tomtom.json',
        'analise_espacial_vdm_286.csv', 'analise_espacial_vdm_resumo.json',
        'diagnostico_vdm_286_trechos.csv', 'diagnostico_vdm_resumo.json', 'resumo_validacao.json')]
    originais = {PROCESSAMENTO + p: b'conteudo exploratorio sintetico' for p in caminhos}
    for caminho, dados in originais.items():
        gravar(root, caminho, dados)
    plano = planejar(root, Banco([]))
    assert plano[0] == plano[2] == {}
    assert plano[1] == originais
    assert plano.pendencias_preexistentes == []
    assert len(plano.arquivos_sem_vinculo_preservados) == len(caminhos) == 14
    for item in plano.arquivos_sem_vinculo_preservados:
        dados = originais[item['caminho']]
        assert item['sha256'] == engine.assinatura(dados)
        assert item['tamanho_bytes'] == len(dados)
        assert root.joinpath(*item['caminho'].split('/')).read_bytes() == dados
    assert len(capsys.readouterr().err.splitlines()) == len(caminhos)


@pytest.mark.parametrize('caminho', [
    'tomtom-rede/observacoes_12345678123456781234567812345678.json',
    'tomtom-rede/12345678-1234-5678-1234-567812345678.gpkg',
    'tomtom-rede/observacoes_baaf09ed1029.json',
    'tomtom-rede_a9673a83/observacoes.json',
    '12345678123456781234567812345678/observacoes.json',
])
def test_arquivo_sem_vinculo_com_uuid_ou_hash_continua_bloqueado(root, caminho):
    gravar(root, PROCESSAMENTO + caminho)
    with pytest.raises(ValueError, match='sem vínculo verificável'):
        planejar(root, Banco([]))


def test_documento_uuid_desconhecido_nao_ganha_identidade_em_analise_catalogada(root):
    camada = PASTA + '/camada.gpkg'
    gravar(root, camada)
    gravar(root, PASTA + '/12345678123456781234567812345678.pdf')
    r = registro(camada, recurso_origem='camada:1', validacao={'nome': 'Camada'})
    with pytest.raises(ValueError, match='sem nome/identidade verificáveis'):
        planejar(root, Banco([r]))


def test_preservados_nao_sao_parseados_nem_remapeados():
    antigo, novo = PASTA + '/antigo.gpkg', PASTA + '/Camada.gpkg'
    json_valido = PROCESSAMENTO + 'rede/metadados_validacao.json'
    json_grande = PROCESSAMENTO + 'rede/observacoes_tomtom.json'
    zip_externo = PROCESSAMENTO + 'rede/produto_externo.zip'
    originais = {
        antigo: b'camada',
        json_valido: json.dumps({'arquivo': antigo}).encode(),
        json_grande: b'nao interpretar documentos externos',
        zip_externo: b'nao abrir pacotes externos',
    }
    preservados = {json_valido, json_grande, zip_externo}
    novos, remapear = engine.transformar_jsons(originais, {antigo: novo}, preservar=preservados)
    assert novos == originais
    assert remapear.texto(antigo) == novo


@pytest.mark.parametrize('mapa,preferidas', [
    ({'original': 'preservado'}, {}), ({'preservado': 'novo'}, {}),
    ({}, {'preservado': b'alterado'}),
])
def test_preservados_nao_podem_ser_destinos_origens_ou_versoes(mapa, preferidas):
    with pytest.raises(ValueError, match='Arquivo preservado não pode participar'):
        engine.transformar_jsons({'preservado': b'original'}, mapa, preferidas, preservar={'preservado'})


def criar_revisao(root, principal, conteudo, *, dono='autor-sintetico', demandas=False, alterar=None):
    pasta = str(Path(principal).parent).replace('\\', '/')
    caminho = (pasta + '/revisoes/' + engine.assinatura(dono.encode()) + '/'
               + engine.assinatura(principal.encode()) + ('.demandas.json' if demandas else '.json'))
    documento = {'dono': dono, 'sha256': engine.assinatura(conteudo),
                 'nomes': {'0': 'Demanda Revista'} if demandas else {'fonte:1': 'Fonte Revista'}}
    documento.update(alterar or {})
    dados = json.dumps(documento, ensure_ascii=False).encode()
    gravar(root, caminho, dados)
    return caminho, dados


def test_doze_contextos_revisoes_preservam_so_orfa_e_remapeiam_onze_presentes(root_revisoes):
    from api.services import elegibilidade_relatorio as produtor
    root = root_revisoes
    registros, revisoes = [], []
    for indice in range(12):
        if indice == 0:
            pasta = ('saidas-geoespaciais/analises-avulsas/elegibilidade-territorial/'
                     'elegibilidade_territorial_e965e7b4f7aa58499a151f107d733856')
        else:
            codigo = 'HIER-20261019-183457-93E7' if indice <= 9 else 'HIER-20261103-120000-AAAA'
            fase = 'fase-1' if indice % 2 else 'fase-2'
            pasta = (f'saidas-geoespaciais/hierarquizacoes/{codigo}/{fase}/'
                     f'analise_{indice:032x}')
        principal = pasta + '/resultado.gpkg'
        conteudo = f'conteudo sintetico {indice}'.encode()
        dono = f'autor-sintetico-{indice}'
        revisao, dados = criar_revisao(root, principal, conteudo, dono=dono)
        revisoes.append((principal, revisao, dados, dono))
        if indice:
            gravar(root, principal, conteudo)
            registros.append(registro(principal, recurso_origem=f'camada:{indice}',
                                      validacao={'nome': f'Camada {indice}'}))
    plano = planejar(root, Banco(registros))
    mapa, originais, preferidas = plano
    preservados = plano.arquivos_sem_vinculo_preservados
    assert len(preservados) == 1
    assert preservados[0]['caminho'] == revisoes[0][1]
    assert preservados[0]['motivo'] == 'revisao_privada_historica_sem_resultado_presente'
    assert len(mapa) == 22
    for principal, revisao, dados, dono in revisoes[1:]:
        esperado = produtor._caminho_revisao(
            {'arquivo': mapa[principal], 'elegibilidade': {}}, dono)
        assert mapa[revisao] == esperado
        assert esperado.endswith('/' + engine.assinatura(mapa[principal].encode()) + '.json')
        assert root.joinpath(*revisao.split('/')).read_bytes() == dados
    novos, _ = engine.transformar_jsons(
        originais, mapa, preferidas, preservar={p['caminho'] for p in preservados})
    assert novos[revisoes[0][1]] == revisoes[0][2]
    assert set(plano.pendencias_preexistentes) == set()


@pytest.mark.parametrize('alterar', [
    {'dono': 'outro-autor'}, {'dono': 1}, {'sha256': 'invalido'}, {'sha256': None},
    {'nomes': []}, {'nomes': {'fonte': 123}}, {'campo_inesperado': True},
])
def test_revisao_hash_sem_conteudo_valido_nao_e_liberada(root_revisoes, alterar):
    root = root_revisoes
    principal = PASTA + '/resultado.gpkg'
    criar_revisao(root, principal, b'ausente', alterar=alterar)
    with pytest.raises(ValueError, match='Conteúdo de revisão privada inválido'):
        planejar(root, Banco([]))


def test_estrutura_privada_invalida_nao_libera_json_hash(root_revisoes):
    root = root_revisoes
    gravar(root, PASTA + '/revisoes/qualquer/' + 'a' * 64 + '.json', b'{}')
    with pytest.raises(ValueError, match='Estrutura de revisão privada inválida'):
        planejar(root, Banco([]))


def test_revisao_de_conteudo_antigo_no_mesmo_caminho_nao_e_reatribuida(root_revisoes):
    root = root_revisoes
    principal = PASTA + '/resultado.gpkg'
    gravar(root, principal, b'resultado atual')
    revisao, dados = criar_revisao(root, principal, b'conteudo anterior')
    plano = planejar(root, Banco([
        registro(principal, recurso_origem='camada:1', validacao={'nome': 'Camada'})]))
    assert principal in plano[0] and revisao not in plano[0]
    assert plano.arquivos_sem_vinculo_preservados[0]['motivo'] == (
        'revisao_privada_historica_resultado_divergente')
    assert root.joinpath(*revisao.split('/')).read_bytes() == dados


def test_revisao_demandas_recalcula_caminho_conforme_produtor(root_revisoes):
    from api.services import elegibilidade_relatorio as produtor
    root = root_revisoes
    principal = PASTA + '/resultado.gpkg'
    gravar(root, principal, b'conteudo')
    revisao, _ = criar_revisao(root, principal, b'conteudo', demandas=True)
    plano = planejar(root, Banco([
        registro(principal, recurso_origem='camada:1', validacao={'nome': 'Camada'})]))
    esperado = produtor._caminho_nomes_demandas(
        {'arquivo': plano[0][principal], 'elegibilidade': {}}, 'autor-sintetico')
    assert plano[0][revisao] == esperado


def test_consolidacao_nao_apaga_duplicados_orfaos():
    a = registro(PASTA + '/ausente.gpkg')
    b = {**a, 'id': 'outro'}
    assert consolidar_catalogo(Banco([a, b]), {'presente.gpkg': 'Camada.gpkg'}) == ({}, [])


@pytest.mark.parametrize('preservado', [False, True])
def test_manifesto_persiste_inventarios_mesmo_sem_movimentos(root, monkeypatch, capsys, preservado):
    caminho = PASTA + '/ausente.gpkg'
    if preservado:
        caminho = PROCESSAMENTO + 'tomtom-rede/observacoes_tomtom.json'
        gravar(root, caminho, b'nao interpretar documento externo')
    plano = planejar(root, Banco([] if preservado else [registro(caminho)]))
    antes = sorted(p.relative_to(root) for p in root.rglob('*') if p.is_file())
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
    monkeypatch.setattr(engine, 'alteracoes_banco', lambda *args: [] if preservado else [alteracao_orfa])
    engine.executar(False, planejador=lambda *args: plano)
    assert comandos == ['rollback']
    assert sorted(p.relative_to(root) for p in root.rglob('*') if p.is_file()) == antes
    engine.executar(True, planejador=lambda *args: plano)
    manifestos = list(root.rglob('manifesto.json'))
    assert len(manifestos) == 1
    manifesto = json.loads(manifestos[0].read_text(encoding='utf-8'))
    assert manifesto['estado'] == 'concluida'
    assert manifesto['pendencias_preexistentes'] == plano.pendencias_preexistentes
    assert manifesto['arquivos_sem_vinculo_preservados'] == plano.arquivos_sem_vinculo_preservados
    assert manifesto['mapa'] == {} and manifesto['banco'] == []
    assert comandos == ['rollback', 'commit']
    if preservado:
        assert root.joinpath(*caminho.split('/')).read_bytes() == b'nao interpretar documento externo'
    else:
        assert not root.joinpath(*caminho.split('/')).exists()
