"""Dados completos da rosca, lidos das saídas persistidas e restritos ao usuário."""
from tests.territorial_ogr_helpers import calcular_ogr, serializar_fixture
from copy import deepcopy
from hashlib import sha256
from io import BytesIO
import json
from types import SimpleNamespace
from zipfile import ZipFile

import geopandas as gpd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from shapely.geometry import box
from pypdf import PdfReader

from api.services import elegibilidade_processamento as processamento, elegibilidade_relatorio as service
from api.services.controle_processamento import ControleProcessamento


@pytest.fixture
def analise(monkeypatch):
    entrada = gpd.GeoDataFrame({'nome': ['A', 'B', 'Sem interseção']},
                              geometry=[box(0, 0, 10, 10), box(20, 0, 30, 10), box(40, 0, 50, 10)], crs=5880)
    grade = gpd.GeoDataFrame({'nome': ['Mesmo nome', 'Mesmo nome'], 'fav_territorial_classe': ['Alta', 'Baixa'],
                             'fav_territorial': [.8, .2], 'fav_territorial_dim': [.7, .3]},
                            geometry=[box(0, 0, 5, 10), box(20, 0, 24, 10)], crs=5880)
    rede = gpd.GeoDataFrame({'nome': ['Contato'], 'fav_rede_dim': [0.0], 'fav_rede_classe': ['Muito baixa'],
                            'fav_rede': [.9]}, geometry=[box(10, 0, 11, 10)], crs=5880)
    for frame in (entrada, grade, rede):
        frame.geometry = frame.geometry.translate(xoff=5000000, yoff=7000000)
    resultados, arquivos = {}, {}
    for numero in (1, 2):
        recortes = []
        saida, auditoria = calcular_ogr(entrada, [('grade', 'Grade', 'g', grade), ('rede', 'Rede', 'r', rede)],
            ControleProcessamento(), intersecoes=recortes, analise='favorabilidade')
        auditoria['entrada'] = {'id': f'entrada-{numero}', 'nome': f'Entrada {numero}'}
        conteudo = serializar_fixture(saida, auditoria, recortes, 'f2.gpkg', analise='favorabilidade')['f2.gpkg']
        arquivo = f'saidas-geoespaciais/f2-{numero}.gpkg'
        resultados[f'job-{numero}'] = {'arquivo': arquivo, 'sha256': sha256(conteudo).hexdigest(),
                                     'lote_id': 'lote', 'total_entradas': 2, 'favorabilidade': auditoria}
        arquivos[arquivo] = conteudo
    consultar_original = service.jobs.consultar
    def consultar(ident, dono, *, analise='elegibilidade'):
        if ident not in resultados:
            return consultar_original(ident, dono, analise=analise)
        assert analise == 'favorabilidade'
        if dono != 'autor' or ident not in resultados:
            raise FileNotFoundError('Execução não encontrada.')
        return {'status': 'concluido', 'resultado': deepcopy(resultados[ident])}
    monkeypatch.setattr(service.jobs, 'consultar', consultar)
    def baixar(caminho):
        if caminho not in arquivos:
            raise FileNotFoundError(caminho)
        return arquivos[caminho]
    monkeypatch.setattr(service.storage_remoto, 'baixar', baixar)
    monkeypatch.setattr(service.storage_remoto, 'enviar_bytes', arquivos.__setitem__)
    monkeypatch.setattr(service.storage_remoto, 'mover', lambda a, b: arquivos.__setitem__(b, arquivos.pop(a)))
    monkeypatch.setattr(service.jobs, '_jobs', {})
    return resultados, arquivos


def test_todas_entradas_demandas_e_feicoes_sem_agrupar_nomes(analise, monkeypatch):
    def sem_geometrias(*args, **kwargs):
        pytest.fail('A consulta de atributos não precisa reprojetar ou transmitir geometrias.')
    monkeypatch.setattr(service, 'reproject', sem_geometrias)
    resposta = service.sobreposicoes_favorabilidade(['job-1', 'job-2'], 'autor')
    assert resposta['concluidas'] == resposta['previstas'] == 2
    assert len(resposta['entradas']) == 2
    for entrada in resposta['entradas']:
        assert 'geometrias' not in entrada and 'intersecoes' not in entrada
        assert len(entrada['linhas']) == 3
        a, b, vazia = entrada['linhas']
        assert [c['area_m2'] for c in a['sobreposicoes']] == [50, 0]
        assert [c['area_m2'] for c in b['sobreposicoes']] == [40]
        assert vazia['sobreposicoes'] == []
        assert a['sobreposicoes'][0]['nome'] == b['sobreposicoes'][0]['nome']
        assert a['sobreposicoes'][0]['id'] != b['sobreposicoes'][0]['id']
        assert a['sobreposicoes'][1]['percentual'] == 0
        assert a['sobreposicoes'][0]['favorabilidade']['indice'] == .7
        assert a['sobreposicoes'][0]['favorabilidade']['indice_original'] == .8
        assert a['sobreposicoes'][1]['favorabilidade']['indice_original'] == .9
        assert b['sobreposicoes'][0]['favorabilidade']['indice'] == .3
        assert a['sobreposicoes'][0]['favorabilidade']['classe'] == 'Alta'
        assert a['sobreposicoes'][1]['favorabilidade']['indice'] == 0
    assert sum(c['area_m2'] for e in resposta['entradas'] for l in e['linhas'] for c in l['sobreposicoes']) == 180


def test_saidas_parciais_explicitam_quantidade_e_nao_inventam_valores(analise):
    resposta = service.sobreposicoes_favorabilidade(['job-1'], 'autor')
    assert resposta['concluidas'] == 1 and resposta['previstas'] == 2
    assert len(resposta['entradas']) == 1


def test_saida_alterada_nao_produz_grafico_divergente(analise):
    resultados, arquivos = analise
    arquivos[resultados['job-1']['arquivo']] += b'alterado'
    with pytest.raises(ValueError, match='mudou'):
        service.sobreposicoes_favorabilidade(['job-1'], 'autor')


def test_usuario_lote_e_duplicacao_conferidos(analise):
    with pytest.raises(FileNotFoundError):
        service.sobreposicoes_favorabilidade(['job-1'], 'outro')
    with pytest.raises(ValueError, match='sem repetições'):
        service.sobreposicoes_favorabilidade(['job-1', 'job-1'], 'autor')
    analise[0]['job-2']['lote_id'] = 'outro'
    with pytest.raises(ValueError, match='mesma execução'):
        service.sobreposicoes_favorabilidade(['job-1', 'job-2'], 'autor')


def test_rota_autenticada_e_erros_explicitos(analise):
    from api.deps.auth import require_geospatial_access
    from api.routers.extracao_atributos import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    rota = '/extracao-atributos/favorabilidade/resultados/sobreposicoes'
    with TestClient(app) as client:
        assert client.post(rota, json={'execucoes': ['job-1', 'job-2']}).status_code == 200
        assert client.post(rota, json={'execucoes': []}).status_code == 422
        assert client.post(rota, json={'execucoes': ['inexistente']}).status_code == 404
        app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='outro')
        assert client.post(rota, json={'execucoes': ['job-1']}).status_code == 404
        app.dependency_overrides.clear()
        assert client.post(rota, json={'execucoes': ['job-1']}).status_code in {401, 403}


def test_painel_completo_nomes_pdf_e_pacote_preservam_fragmentos(analise):
    resultados, arquivos_storage = analise
    preparo = service.preparar(['job-1', 'job-2'], 'autor', analise='favorabilidade')
    assert not preparo['revisados']
    nomes = {f['id']: f['nome'] for f in preparo['fontes']}
    nomes['entrada-1'], nomes['entrada-2'] = 'Demandas Norte', 'Demandas Sul'
    with pytest.raises(ValueError, match='Revise'):
        service.montar(['job-1'], nomes, 'autor', False, analise='favorabilidade')
    modelo, arquivos = service.montar(['job-1', 'job-2'], nomes, 'autor', True, analise='favorabilidade')
    assert modelo['analise'] == 'favorabilidade'
    assert 'favorabilidade-territorial' in modelo['pasta_analise']
    assert 'sem agregá-los' in modelo['metodologia']
    entrada = modelo['entradas'][0]
    assert entrada['feicoes'] == 3 and entrada['com_intersecao'] == 2 and entrada['sem_intersecao'] == 1
    assert len(entrada['geometrias']['features']) == 3
    assert len(entrada['intersecoes']['features']) == 3
    assert sorted(f['properties']['indice_favorabilidade'] for f in entrada['intersecoes']['features']) == [0, .3, .7]
    superficies = [f for f in entrada['mapa']['formas'] if 'cor' in f]
    assert {f['cor'] for f in superficies} == {
        service.cor_favorabilidade(.7), service.cor_favorabilidade(0), service.cor_favorabilidade(.3)}
    assert all(f['sem_borda'] for f in superficies if f['tipo'] == 'Polygon')
    assert any(f['tipo'] == 'LineString' and not f.get('sem_borda') for f in superficies)
    assert entrada['linhas'][0]['areas'] == [50, 0]
    assert entrada['linhas'][2]['areas'] == [None, None]
    assert {c['papel'] for c in entrada['campos']} == {'grade', 'rede'}
    service.salvar_nomes(['job-1', 'job-2'], modelo, 'autor', analise='favorabilidade')
    assert service.preparar(['job-1', 'job-2'], 'autor', analise='favorabilidade')['revisados']
    documento = service.pdf(modelo)
    texto = '\n'.join(p.extract_text() for p in PdfReader(BytesIO(documento)).pages)
    assert 'Relatório de Favorabilidade Territorial' in texto
    assert 'Favorabilidade de Grade' in texto and 'Favorabilidade de Rede' in texto
    assert 'Demandas Sul' in texto and 'Demanda' in texto
    assert 'Relatório de Elegibilidade' not in texto and 'Restrição' not in texto and 'Risco' not in texto
    assert 'fav_territorial_dim' in texto and 'fav_rede_dim' in texto
    assert 'Alta' in texto and 'Muito Baixa' in texto and '0,70' in texto and '0,00' in texto
    assert 'Área Sobreposta' not in texto and 'km²' not in texto
    pacote, caminho = service.pacote(modelo, arquivos)
    assert arquivos_storage[caminho] == pacote
    with ZipFile(BytesIO(pacote)) as zipado:
        assert zipado.testzip() is None
        assert zipado.read('Relatório de Favorabilidade Territorial.pdf').startswith(b'%PDF')
        assert json.loads(zipado.read('Metadados da Análise.json'))['analise'] == 'favorabilidade'
        for indice, (nome, dados) in enumerate(arquivos, 1):
            assert zipado.read(nome) == arquivos_storage[resultados[f'job-{indice}']['arquivo']]
            recortes = gpd.read_file(BytesIO(dados), layer='intersecoes')
            assert 'classe' in ' '.join(recortes.columns)
            assert 'fav_territorial_dim' in ' '.join(recortes.columns)


def test_reabrir_saida_e_namespace_separado_da_elegibilidade(analise):
    resultados, arquivos = analise
    abertura = service.abrir(resultados['job-1']['arquivo'], 'outro', analise='favorabilidade')
    assert len(abertura['execucoes']) == 1
    ident = abertura['execucoes'][0]
    assert service.jobs.consultar(ident, 'outro', analise='favorabilidade')['status'] == 'concluido'
    with pytest.raises(FileNotFoundError):
        service.jobs.consultar(ident, 'outro')
    nomes = {f['id']: f['nome'] for f in abertura['fontes']}
    modelo, _ = service.montar([ident], nomes, 'outro', True, analise='favorabilidade')
    service.salvar_nomes([ident], modelo, 'outro', analise='favorabilidade')
    assert service.abrir(resultados['job-1']['arquivo'], 'outro', analise='favorabilidade')['revisados']
    assert not service.abrir(resultados['job-1']['arquivo'], 'terceiro', analise='favorabilidade')['revisados']
    with pytest.raises(ValueError, match='GeoPackage'):
        service.abrir('../saida.gpkg', 'outro', analise='favorabilidade')
    assert any('execucoes-favorabilidade/' in path for path in arquivos)


def test_rotas_completas_e_revisao_obrigatoria_sem_registrar_fase1(analise, monkeypatch):
    from api.deps.auth import require_geospatial_access
    from api.routers.extracao_atributos import router
    monkeypatch.setattr(service, 'registrar_relatorios', lambda *args: pytest.fail('Não deve registrar relatório de Fase 1.'))
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    rota = '/extracao-atributos/favorabilidade/resultados'
    with TestClient(app) as client:
        preparo = client.post(rota + '/preparar', json={'execucoes': ['job-1']})
        assert preparo.status_code == 200
        payload = {'execucoes': ['job-1'], 'nomes': {f['id']: f['nome'] for f in preparo.json()['fontes']},
                   'revisados': False}
        assert client.post(rota + '/visualizar', json=payload).status_code == 422
        payload['revisados'] = True
        resultado = client.post(rota + '/visualizar', json=payload)
        assert resultado.status_code == 200
        assert resultado.json()['concluidas'] == 1 and resultado.json()['previstas'] == 2
        assert 'relatorios_hierarquizacao' not in resultado.json()
        assert client.post(rota + '/pacote', json=payload).headers['content-type'] == 'application/zip'
        assert client.post(rota + '/abrir', json={'arquivo': analise[0]['job-1']['arquivo']}).status_code == 200
        app.dependency_overrides.clear()
        for acao in ('preparar', 'visualizar', 'pacote', 'abrir'):
            assert client.post(rota + '/' + acao, json=payload).status_code in {401, 403}


def test_painel_recusa_saida_alterada_e_usuario_divergente(analise):
    resultados, arquivos = analise
    fontes = service.preparar(['job-1'], 'autor', analise='favorabilidade')['fontes']
    nomes = {f['id']: f['nome'] for f in fontes}
    with pytest.raises(FileNotFoundError):
        service.montar(['job-1'], nomes, 'outro', True, analise='favorabilidade')
    arquivos[resultados['job-1']['arquivo']] += b'alterado'
    with pytest.raises(ValueError, match='mudou'):
        service.montar(['job-1'], nomes, 'autor', True, analise='favorabilidade')


def test_reabertura_recusa_geopackage_de_outra_modalidade(analise):
    resultados, arquivos = analise
    arquivo = resultados['job-1']['arquivo']
    with pytest.raises(ValueError, match='elegibilidade'):
        service.abrir(arquivo, 'autor')


@pytest.mark.parametrize('valor,estado,esperado', [
    (0, 'valido', 0), (1, 'valido', 1), (.71345678, 'valido', .71345678),
    (None, 'nulo', None), (-.1, 'invalido', None), (1.01, 'invalido', None),
    (True, 'invalido', None), ('0.8', 'invalido', None), (float('inf'), 'invalido', None),
    (float('nan'), 'invalido', None),
])
def test_indice_original_sem_area_como_fallback(valor, estado, esperado):
    resultado = service._favorabilidade(
        {'indice': valor, 'classe': 'Classe não padronizada', 'area_m2': 9999},
        'grade', {'fav_territorial_dim': 'indice', 'fav_territorial_classe': 'classe'})
    assert resultado['indice'] == esperado
    assert resultado['estado_indice'] == estado
    assert resultado['classe'] == 'Classe não padronizada'
    assert resultado['campo_indice'] == 'fav_territorial_dim'
    assert resultado['campo_classe'] == 'fav_territorial_classe'


def test_campos_ausentes_nao_usam_media_simples_ou_classe_inferida():
    resultado = service._favorabilidade(
        {'fav_rede': .9, 'area_m2': 100, 'classe': 'Alta'}, 'rede',
        {'fav_rede': 'fav_rede', 'classe': 'classe'})
    assert resultado['indice'] is None and resultado['estado_indice'] == 'ausente'
    assert resultado['indice_original'] == .9 and resultado['estado_original'] == 'valido'
    assert resultado['classe'] is None and resultado['estado_classe'] == 'ausente'
    assert service.cor_favorabilidade(None) == '#808080'
    assert service.cor_favorabilidade(0) == '#440154'
    assert service.cor_favorabilidade(1) == '#fde725'
    assert service.cor_favorabilidade(.3125) == '#35628b'

@pytest.mark.parametrize('valor,estado', [(2.5, 'valido'), (0, 'valido'), (-3, 'valido'),
                                        (None, 'nulo'), (True, 'invalido'), ('0.4', 'invalido'),
                                        (float('inf'), 'invalido'), (float('nan'), 'invalido')])
def test_indice_nao_dimensionado_preserva_escala_original(valor, estado):
    resultado = service._favorabilidade({'v': valor}, 'grade', {'fav_territorial': 'v'})
    assert resultado['estado_original'] == estado
    assert resultado['indice_original'] == (valor if estado == 'valido' else None)
    assert resultado['indice'] is None


def test_base_integral_atual_tem_origem_explicita_e_nao_altera_historico(analise, monkeypatch):
    frame = gpd.GeoDataFrame({'nome': ['Fora das demandas', 'Outra feição'],
                             'fav_territorial': [20., 40.], 'fav_territorial_dim': [.1, .9],
                             'fav_territorial_classe': ['Baixa', 'Alta']},
                            geometry=[box(5000000, 7000000, 5000100, 7000100),
                                      box(5000200, 7000200, 5000300, 7000300)], crs=5880)
    chamadas = []
    def carregar(ident):
        chamadas.append(ident)
        from tests.territorial_ogr_helpers import camada
        return camada(frame), {}, None
    monkeypatch.setattr(service.extracao_preparacao, 'carregar', carregar)
    anteriores = deepcopy(analise)
    dados = service.superficie_favorabilidade('job-1', 'g', 'autor')
    assert chamadas == ['g']
    assert 'atual' in dados['origem'] and dados['consultado_em']
    feicoes = dados['geometrias']['features']
    assert len(feicoes) == 2
    assert feicoes[0]['properties']['favorabilidade']['indice_original'] == 20
    assert feicoes[0]['properties']['favorabilidade']['indice'] == .1
    assert feicoes[0]['properties']['nome'] == 'Fora das demandas'
    assert feicoes[0]['geometry']['coordinates'][0][0][0] != 5000000
    assert analise == anteriores
    with pytest.raises(FileNotFoundError):
        service.superficie_favorabilidade('job-1', 'g', 'outro')
    with pytest.raises(ValueError, match='não pertence'):
        service.superficie_favorabilidade('job-1', 'arbitraria', 'autor')
    assert chamadas == ['g'], 'Fontes não vinculadas jamais são consultadas.'


def test_rota_base_integral_restrita_e_falhas_explicitas(analise, monkeypatch):
    from api.deps.auth import require_geospatial_access
    from api.routers.extracao_atributos import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    def indisponivel(ident):
        raise FileNotFoundError('Fonte original indisponível.')
    monkeypatch.setattr(service.extracao_preparacao, 'carregar', indisponivel)
    with TestClient(app) as client:
        rota = '/extracao-atributos/favorabilidade/resultados/superficie'
        assert client.post(rota, json={'execucao':'job-1', 'base_id':'g'}).status_code == 404
        assert client.post(rota, json={'execucao':'job-1', 'base_id':'outra'}).status_code == 422
        assert client.post(rota, json={'execucao':'job-1'}).status_code == 422
        app.dependency_overrides.clear()
        assert client.post(rota, json={'execucao':'job-1', 'base_id':'g'}).status_code in {401, 403}


def test_classe_vazia_nao_e_reclassificada():
    resultado = service._favorabilidade(
        {'i': 1, 'c': '  '}, 'rede', {'fav_rede_dim': 'i', 'fav_rede_classe': 'c'})
    assert resultado['indice'] == 1
    assert resultado['estado_classe'] == 'nulo' and resultado['classe'] == '  '


@pytest.mark.parametrize('indice,formatado', [
    (0, '0,00'), (1, '1,00'), (.7, '0,70'), (.706, '0,71'), (.704, '0,70'),
    (.005, '0,01'), (.995, '1,00'),
])
def test_indice_pdf_duas_casas_sem_alterar_valor(indice, formatado):
    valor = {'indice': indice, 'estado_indice': 'valido'}
    assert service._indice_pdf(valor) == formatado
    assert valor['indice'] == indice


@pytest.mark.parametrize('classe', ['MUITO BAIXA', 'muito baixa', 'mUiTo bAiXa'])
def test_classe_pdf_title_case_sem_reclassificar(classe):
    valor = {'classe': classe, 'estado_classe': 'valido'}
    assert service._classe_pdf(valor) == 'Muito Baixa'
    assert valor['classe'] == classe


def test_coluna_declarada_inexistente_impede_apresentacao(analise):
    resultados, arquivos = analise
    resultado = resultados['job-1']
    dados = arquivos[resultado['arquivo']]
    frame = gpd.read_file(BytesIO(dados), layer='favorabilidade_territorial')
    auditoria = resultado['favorabilidade']
    nomes = {f['id']: f['nome'] for f in service.preparar(['job-1'], 'autor', analise='favorabilidade')['fontes']}
    auditoria['atributos_superficies'][0]['campos']['fav_territorial_dim'] = 'coluna_ausente'
    with pytest.raises(ValueError, match='atributo preservado fav_territorial_dim'):
        service._painel(frame, dados, auditoria, nomes, service._linhas(frame, auditoria),
                        analise='favorabilidade')


def test_fragmentos_divergentes_da_mesma_feicao_nao_sao_agregados(analise):
    resultados, arquivos = analise
    resultado = resultados['job-1']
    original = arquivos[resultado['arquivo']]
    frame = gpd.read_file(BytesIO(original), layer='favorabilidade_territorial')
    recortes = gpd.read_file(BytesIO(original), layer='intersecoes').to_dict('records')
    campo = resultado['favorabilidade']['atributos_superficies'][0]['campos']['fav_territorial_dim']
    primeiro = next(r for r in recortes if r['base_id'] == 'g')
    primeiro['area_m2'] /= 2
    recortes.append({**primeiro, campo: .99})
    alterado = serializar_fixture(frame, resultado['favorabilidade'], recortes, 'teste.gpkg',
                                        analise='favorabilidade')['teste.gpkg']
    resultado['sha256'] = sha256(alterado).hexdigest()
    arquivos[resultado['arquivo']] = alterado
    nomes = {f['id']: f['nome'] for f in service.preparar(['job-1'], 'autor', analise='favorabilidade')['fontes']}
    with pytest.raises(ValueError, match='divergentes'):
        service.montar(['job-1'], nomes, 'autor', True, analise='favorabilidade')
