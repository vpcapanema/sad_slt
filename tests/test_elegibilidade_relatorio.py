from copy import deepcopy
from hashlib import sha256
from io import BytesIO
import json
from types import SimpleNamespace
from zipfile import ZipFile

import geopandas as gpd
import pytest
from pypdf import PdfReader
from shapely.geometry import box, Polygon, LineString
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.services import elegibilidade_relatorio as service
from api.services.arquivos_geoespaciais_memoria import vetor
from api.services.elegibilidade_processamento import serializar


@pytest.fixture
def analise(monkeypatch):
    fontes = [{'id': f'base-{i}', 'nome': f'base_tecnica_{i}', 'papel': 'restricao' if i < 4 else 'risco',
               'campo': f'campo_{i}', 'unidade': 'm²'} for i in range(7)]
    geometria = [box(5000000 + i*20, 7000000, 5000010 + i*20, 7000010) for i in range(63)]
    frame = gpd.GeoDataFrame({'ID_FEICAO': [f'Feição {i}' for i in range(63)],
                             'nome': [f'Demanda {i}' for i in range(63)]}, geometry=geometria, crs=5880)
    for i in range(7):
        frame[f'campo_{i}'] = [None, 0., 0.0000001] + [float(i+1)]*60
    frame['area_total_m2'] = 100.
    feicoes_base = [{'id': f'feicao-{i}', 'base_id': f'base-{i}', 'nome': f'trecho_do_setor_{i}',
                     'tipo': 'feicao', 'papel': fontes[i]['papel'], 'posicao': i, 'campo_nome': 'nome'} for i in range(7)]
    recortes = [{'demanda_pos': pos, 'base_id': f'base-{i}', 'feicao_id': f'feicao-{i}',
                 'area_m2': frame.iloc[pos][f'campo_{i}'],
                 'geometry': LineString([(5000000+pos*20,7000000),(5000000+pos*20,7000010)]) if pos == 1
                 else box(5000000+pos*20,7000000,5000000+pos*20+frame.iloc[pos][f'campo_{i}']/10,7000010)}
                for pos in range(1,63) for i in range(7)]
    nome = 'entrada_tecnica_elegibilidade_territorial.gpkg'
    dados = {}
    resultados = {}
    for i in (1, 2):
        auditoria = {'entrada': {'id': f'entrada-{i}', 'nome': f'entrada_tecnica_{i}'},
                     'campo_id': 'ID_FEICAO', 'feicoes': len(frame), 'campos': fontes,
                     'campo_area_total': 'area_total_m2', 'feicoes_base': feicoes_base,
                     'versao_saida': 2, 'camada_intersecoes': 'intersecoes'}
        conteudo = serializar(frame, auditoria, recortes, nome)[nome]
        arquivo = f'saidas-geoespaciais/saida-{i}/{nome}'
        dados[arquivo] = conteudo
        resultados[f'job-{i}'] = {'arquivo': arquivo, 'sha256': sha256(conteudo).hexdigest(),
            'lote_id': 'lote', 'total_entradas': 2, 'concluido_em': '2026-10-19T15:00:00+00:00',
            'elegibilidade': auditoria}
    consultar_persistido = service.jobs.consultar
    def consultar(ident, dono):
        if ident in resultados:
            if dono != 'autor':
                raise FileNotFoundError('Execução não encontrada.')
            return {'status': 'concluido', 'resultado': deepcopy(resultados[ident])}
        return consultar_persistido(ident, dono)
    monkeypatch.setattr(service.jobs, '_jobs', {})
    monkeypatch.setattr(service.jobs, 'consultar', consultar)
    def baixar(caminho):
        if caminho not in dados:
            raise FileNotFoundError(caminho)
        return dados[caminho]
    monkeypatch.setattr(service.storage_remoto, 'baixar', baixar)
    monkeypatch.setattr(service.storage_remoto, 'enviar_bytes', dados.__setitem__)
    monkeypatch.setattr(service.storage_remoto, 'mover', lambda a, b: dados.__setitem__(b, dados.pop(a)))
    nomes = {f'base-{i}': f'Bacia Hidrográfica do Setor {i}' for i in range(7)}
    nomes.update({f'feicao-{i}': f'Trecho do Setor {i}' for i in range(7)})
    nomes.update({'entrada-1': 'Demandas do Setor Norte', 'entrada-2': 'Demandas do Setor Sul'})
    return resultados, dados, nomes


@pytest.mark.parametrize(('original', 'esperado'), [
    ('áreas de preservação permanente (APP)', 'Áreas de Preservação Permanente (APP)'),
    ('ÁREAS DE RISCO', 'Áreas de Risco'), ('rede do DER em SP', 'Rede do DER em SP'),
    ('Áreas da XYZ', 'Áreas da XYZ'), ('bacia à jusante', 'Bacia à Jusante'),
])
def test_title_case_portugues_e_siglas(original, esperado):
    assert service.titulo(original) == esperado


@pytest.mark.parametrize('nome', ['', 'risco_inundacao', '<script>', 'C:\\arquivo', 'Camada.gpkg'])
def test_alias_bruto_ou_invalido_e_recusado(nome):
    with pytest.raises(ValueError):
        service.titulo(nome)


def test_fontes_dinamicas_revisao_obrigatoria_e_aliases_exatos(analise):
    _, _, nomes = analise
    preparacao = service.preparar(['job-1', 'job-2'], 'autor')
    assert len(preparacao['fontes']) == 16
    assert all('_' not in f['nome'] for f in preparacao['fontes'])
    assert preparacao['previstas'] == preparacao['concluidas'] == 2
    with pytest.raises(ValueError, match='Revise'):
        service.montar(['job-1', 'job-2'], nomes, 'autor', False)
    with pytest.raises(ValueError, match='exatamente'):
        service.montar(['job-1', 'job-2'], {**nomes, 'extra': 'Extra'}, 'autor', True)
    with pytest.raises(ValueError, match='distintos'):
        service.montar(['job-1', 'job-2'], {**nomes, 'base-1': nomes['base-0']}, 'autor', True)


def test_tabela_mapa_e_pdf_completos_sem_nomes_tecnicos(analise):
    _, _, nomes = analise
    modelo, arquivos = service.montar(['job-1', 'job-2'], nomes, 'autor', True)
    assert len(arquivos) == 2 and len({n for n, _ in arquivos}) == 2
    entrada = modelo['entradas'][0]
    assert entrada['feicoes'] == 63 and len(entrada['campos']) == 7
    assert entrada['com_intersecao'] == 62 and entrada['sem_intersecao'] == 1
    assert entrada['linhas'][0]['areas_texto'] == ['—']*7
    assert entrada['linhas'][1]['areas_texto'] == ['0,0']*7
    assert entrada['linhas'][2]['areas_texto'] == ['0,0000001']*7
    assert len(entrada['mapa']['formas']) == 63 + 62*7
    assert not entrada['mapa']['formas'][0]['intersecao']
    assert entrada['mapa']['formas'][1]['intersecao']
    documento = PdfReader(BytesIO(service.pdf(modelo)))
    texto = '\n'.join(p.extract_text() for p in documento.pages)
    assert len(documento.pages) >= 7
    assert 'Feição 62' in texto and '0,0000000000001' in texto
    assert 'km²' in texto and ' ha' in texto and 'Trecho do Setor 6' in texto
    assert 'Bacia Hidrográfica do Setor 6' in texto
    assert 'Demandas do Setor Norte' in texto and 'Demandas do Setor Sul' in texto
    assert 'entrada_tecnica' not in texto and 'base_tecnica' not in texto and 'campo_0' not in texto
    assert 'Metodologia' in texto and 'Mapa-Síntese' in texto
    for pagina in documento.pages:
        assert float(pagina.mediabox.width) == pytest.approx(595.2756, abs=.01)
        assert float(pagina.mediabox.height) == pytest.approx(841.8898, abs=.01)


def test_pacote_persistido_preserva_geometrias_e_aliases(analise):
    _, dados, nomes = analise
    modelo, arquivos = service.montar(['job-1', 'job-2'], nomes, 'autor', True)
    zip_bytes, caminho = service.pacote(modelo, arquivos)
    assert dados[caminho] == zip_bytes and caminho.startswith('saidas-geoespaciais/')
    with ZipFile(BytesIO(zip_bytes)) as pacote:
        assert pacote.testzip() is None
        assert pacote.read('Relatório de Elegibilidade Territorial.pdf').startswith(b'%PDF')
        for nome, conteudo in arquivos:
            assert pacote.read(nome) == conteudo
        manifesto = json.loads(pacote.read('Metadados da Análise.json'))
        assert manifesto['nomes_revisados'] is True
        assert {f['nome'] for f in manifesto['fontes']} == set(nomes.values())
        assert manifesto['arquivos'][0]['sha256'] == sha256(arquivos[0][1]).hexdigest()


def test_nova_analise_reune_camadas_pdf_zip_e_revisoes_sem_sobrescrever(analise, monkeypatch):
    from api.services import hierarquizacao_service
    resultados, dados, nomes = analise
    pasta = service.pasta_saida('lote', 'HIER-001')
    for indice, resultado in enumerate(resultados.values(), 1):
        anterior = resultado['arquivo']
        resultado['arquivo'] = f'{pasta}/demanda_{indice}.gpkg'
        dados[resultado['arquivo']] = dados.pop(anterior)
        resultado['elegibilidade'].update(hierarquizacao='HIER-001', pasta_analise=pasta)
    monkeypatch.setattr(hierarquizacao_service, 'registrar_saida_geoespacial_fase1', lambda *args: None)
    modelo, arquivos = service.montar(['job-1', 'job-2'], nomes, 'autor', True)
    service.salvar_nomes(['job-1', 'job-2'], modelo, 'autor')
    service.registrar_relatorios(['job-1', 'job-2'], modelo, 'autor')
    _, pacote = service.pacote(modelo, arquivos)
    pdf = modelo['relatorios_hierarquizacao'][0]['arquivo']
    assert modelo['pasta_analise'] == pasta
    assert pacote.rsplit('/', 1)[0] == pdf.rsplit('/', 1)[0] == pasta
    assert all(caminho.startswith(pasta + '/') for caminho in dados)
    assert all(service._caminho_revisao(r, 'autor').startswith(pasta + '/revisoes/') for r in resultados.values())
    anteriores = dict(dados)
    service.registrar_relatorios(['job-1', 'job-2'], modelo, 'autor')
    _, novo_pacote = service.pacote(modelo, arquivos)
    assert novo_pacote != pacote and modelo['relatorios_hierarquizacao'][0]['arquivo'] != pdf
    assert all(dados[caminho] == conteudo for caminho, conteudo in anteriores.items())


def test_saida_alterada_impede_resultados_e_exportacao(analise):
    resultados, dados, nomes = analise
    dados[resultados['job-1']['arquivo']] += b'alterado'
    with pytest.raises(ValueError, match='mudou'):
        service.montar(['job-1', 'job-2'], nomes, 'autor', True)


def test_saida_migrada_reutiliza_pasta_fisica_sem_regravar_geopackage(analise):
    resultados, dados, _ = analise
    resultado = resultados['job-1']
    arquivo_antigo = resultado['arquivo']
    pasta = service.pasta_saida('lote-migrado', 'HIER-001')
    resultado['arquivo'] = pasta + '/analise.gpkg'
    original = dados.pop(arquivo_antigo)
    dados[resultado['arquivo']] = original
    resultado['elegibilidade'].pop('pasta_analise', None)
    assert service._pasta_resultados([resultado]) == pasta
    assert service._caminho_revisao(resultado, 'autor').startswith(pasta + '/revisoes/')
    assert dados[resultado['arquivo']] == original


@pytest.mark.parametrize('segunda_hierarquizacao', [None, 'HIER-SUL'])
def test_pdf_automatico_associado_so_a_hierarquizacao_de_origem(analise, monkeypatch, segunda_hierarquizacao):
    from api.services import hierarquizacao_service
    resultados, dados, nomes = analise
    resultados['job-1']['elegibilidade']['hierarquizacao'] = 'HIER-NORTE'
    if segunda_hierarquizacao:
        resultados['job-2']['elegibilidade']['hierarquizacao'] = segunda_hierarquizacao
    chamadas = []
    monkeypatch.setattr(hierarquizacao_service, 'registrar_saida_geoespacial_fase1',
                        lambda *args: chamadas.append(args))
    modelo, _ = service.montar(['job-1', 'job-2'], nomes, 'autor', True)
    service.registrar_relatorios(['job-1', 'job-2'], modelo, 'autor')
    assert len(chamadas) == (2 if segunda_hierarquizacao else 1)
    for i, (codigo, _, _, documento) in enumerate(chamadas):
        assert sha256(dados[documento['arquivo']]).hexdigest() == documento['sha256']
        texto = ' '.join(p.extract_text() for p in PdfReader(BytesIO(dados[documento['arquivo']])).pages)
        presente, ausente = ('Norte', 'Sul') if codigo == 'HIER-NORTE' else ('Sul', 'Norte')
        assert f'Demandas do Setor {presente}' in texto and f'Demandas do Setor {ausente}' not in texto
        assert modelo['relatorios_hierarquizacao'][i]['arquivo'] == documento['arquivo']
    chamadas.clear()
    del resultados['job-1']['elegibilidade']['hierarquizacao']
    resultados['job-2']['elegibilidade'].pop('hierarquizacao', None)
    anteriores = dict(dados)
    service.registrar_relatorios(['job-1', 'job-2'], modelo, 'autor')
    assert not chamadas and dados == anteriores


def test_download_de_relatorio_exige_vinculo_autenticacao_e_assinatura(analise, monkeypatch):
    from api.deps.auth import require_authenticated
    from api.routers.hierarquizacoes import router
    from api.services import hierarquizacao_service
    arquivo = 'saidas-geoespaciais/relatorio.pdf'
    analise[1][arquivo] = b'%PDF-relatorio'
    registro = {'arquivo': analise[0]['job-1']['arquivo'], 'sha256': analise[0]['job-1']['sha256'],
                'relatorio': {'arquivo': arquivo, 'sha256': sha256(analise[1][arquivo]).hexdigest()}}
    monkeypatch.setattr(hierarquizacao_service.repo, 'get_by_codigo',
                        lambda codigo: {'relatorio_fase1': {'analises_geoespaciais': [registro]}})
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_authenticated] = lambda: SimpleNamespace(id='leitor')
    rota = '/ahp/hierarquizacoes/HIER-NORTE/relatorios/fase1/arquivo'
    with TestClient(app) as client:
        resposta = client.get(rota, params={'arquivo': arquivo})
        assert resposta.status_code == 200 and resposta.content == b'%PDF-relatorio'
        assert resposta.headers['content-type'] == 'application/pdf'
        assert 'attachment;' in resposta.headers['content-disposition']
        assert client.get(rota, params={'arquivo': 'saidas-geoespaciais/outro.pdf'}).status_code == 404
        assert client.get(rota.replace('/fase1/', '/fase2/'), params={'arquivo': arquivo}).status_code == 404
        analise[1][arquivo] += b'mudou'
        assert client.get(rota, params={'arquivo': arquivo}).status_code == 422
        from fastapi import HTTPException
        def sem_acesso():
            raise HTTPException(401, 'Autenticação necessária.')
        app.dependency_overrides[require_authenticated] = sem_acesso
        assert client.get(rota, params={'arquivo': arquivo}).status_code == 401


def test_reabrir_geopackage_reutiliza_saida_e_revisao_sem_recalcular(analise):
    resultados, dados, nomes = analise
    arquivo = resultados['job-1']['arquivo']
    reabertura = service.abrir(arquivo, 'autor')
    assert len(reabertura['execucoes']) == 1
    assert reabertura['revisados'] is False
    assert reabertura['concluidas'] == reabertura['previstas'] == 1
    nomes_unicos = {ident: nome for ident, nome in nomes.items() if ident != 'entrada-2'}
    modelo, _ = service.montar(reabertura['execucoes'], nomes_unicos, 'autor', True)
    service.salvar_nomes(reabertura['execucoes'], modelo, 'autor')
    reabertura = service.abrir(arquivo, 'autor')
    assert reabertura['revisados'] is True
    assert {f['id']: f['nome'] for f in reabertura['fontes']} == nomes_unicos
    assert dados[arquivo].startswith(b'SQLite format 3')
    dados[arquivo] += b'alterado'
    with pytest.raises(ValueError, match='mudou'):
        service.montar(reabertura['execucoes'], nomes_unicos, 'autor', True)


def test_reabrir_saida_de_outro_usuario_sem_historico_e_sem_recalcular(analise, monkeypatch):
    resultados, dados, nomes = analise
    arquivo = resultados['job-1']['arquivo']
    original = dados[arquivo]
    def nao_consultar_historico(*args, **kwargs):
        pytest.fail('A reabertura deve ler o GeoPackage, não procurar o histórico do autor.')
    monkeypatch.setattr(service.storage_remoto, 'listar', nao_consultar_historico)
    reabertura = service.abrir(arquivo, 'outro')
    nomes_unicos = {ident: nome for ident, nome in nomes.items() if ident != 'entrada-2'}
    modelo, arquivos = service.montar(reabertura['execucoes'], nomes_unicos, 'outro', True)
    assert len(modelo['entradas'][0]['linhas']) == 63
    assert modelo['entradas'][0]['linhas'][1]['areas'] == [0.] * 7
    assert modelo['entradas'][0]['linhas'][3]['areas'] == [float(i + 1) for i in range(7)]
    assert arquivos[0][1] == dados[arquivo] == original
    assert service.pdf(modelo).startswith(b'%PDF')
    monkeypatch.setattr(service.jobs, '_jobs', {})
    assert service.preparar(reabertura['execucoes'], 'outro')['fontes'] == reabertura['fontes']
    with pytest.raises(FileNotFoundError):
        service.preparar(reabertura['execucoes'], 'autor')


def test_reabrir_saida_compartilhada_nao_bloqueia_ou_sobrescreve_revisao_de_outro(analise):
    resultados, dados, nomes = analise
    arquivo = resultados['job-1']['arquivo']
    nomes_unicos = {ident: nome for ident, nome in nomes.items() if ident != 'entrada-2'}
    modelo, _ = service.montar(['job-1'], nomes_unicos, 'autor', True)
    service.salvar_nomes(['job-1'], modelo, 'autor')
    dados[arquivo + '.nomes.json'] = dados.pop(service._caminho_revisao(resultados['job-1'], 'autor'))
    revisao_autor = dados[arquivo + '.nomes.json']
    assert service.abrir(arquivo, 'autor')['revisados'] is True
    reabertura = service.abrir(arquivo, 'outro')
    assert reabertura['revisados'] is False
    modelo, _ = service.montar(reabertura['execucoes'], nomes_unicos, 'outro', True)
    service.salvar_nomes(reabertura['execucoes'], modelo, 'outro')
    assert service.abrir(arquivo, 'outro')['revisados'] is True
    assert dados[arquivo + '.nomes.json'] == revisao_autor
    assert service.abrir(arquivo, 'autor')['revisados'] is True


def test_rota_reabrir_geopackage_preserva_autorizacao_e_erros(analise, monkeypatch):
    from fastapi import HTTPException
    from api.deps.auth import require_geospatial_access
    from api.routers.extracao_atributos import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    arquivo = analise[0]['job-1']['arquivo']
    rota = '/extracao-atributos/elegibilidade/resultados/abrir'
    with TestClient(app) as client:
        resposta = client.post(rota, json={'arquivo': arquivo})
        assert resposta.status_code == 200
        assert len(resposta.json()['execucoes']) == 1
        assert client.post(rota, json={'arquivo': ''}).status_code == 422
        app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='outro')
        assert client.post(rota, json={'arquivo': arquivo}).status_code == 200
        assert client.post(rota, json={'arquivo': 'saidas-geoespaciais/inexistente.gpkg'}).status_code == 404
        analise[1][arquivo] = b'arquivo corrompido'
        assert client.post(rota, json={'arquivo': arquivo}).status_code == 422
        def sem_acesso():
            raise HTTPException(403, 'Acesso geoespacial não autorizado.')
        app.dependency_overrides[require_geospatial_access] = sem_acesso
        assert client.post(rota, json={'arquivo': arquivo}).status_code == 403


@pytest.mark.parametrize('arquivo', [
    '../saida.gpkg', '/saidas-geoespaciais/saida.gpkg', 'pasta-privada/saida.gpkg',
    'saidas-geoespaciais/../saida.gpkg', 'saidas-geoespaciais/saida.fgb',
    'saidas-geoespaciais\\saida.gpkg', 'saidas-geoespaciais//saida.gpkg',
])
def test_reabrir_recusa_caminho_ou_formato_invalido(analise, arquivo):
    with pytest.raises(ValueError, match='GeoPackage'):
        service.abrir(arquivo, 'outro')


def test_reabrir_recusa_geopackage_sem_metadados_e_nao_grava_referencia(analise):
    _, dados, _ = analise
    arquivo = 'saidas-geoespaciais/nao-elegibilidade.gpkg'
    frame = gpd.GeoDataFrame({'id': [1]}, geometry=[box(0, 0, 1, 1)], crs=5880)
    dados[arquivo] = vetor(frame, 'saida.gpkg', 'GPKG', layer='elegibilidade_territorial')['saida.gpkg']
    anteriores = dict(dados)
    with pytest.raises(ValueError, match='metadados'):
        service.abrir(arquivo, 'outro')
    assert dados == anteriores


@pytest.mark.parametrize(('campo', 'valor'), [
    ('entrada', None), ('campos', [{}]), ('campos', [{'id': 'base', 'nome': 'Base', 'campo': 'a', 'papel': []}]),
    ('feicoes_base', [{}]), ('campo_id', None), ('feicoes', 1), ('versao_saida', 1),
])
def test_reabrir_recusa_metadados_incompativeis_sem_registrar(analise, campo, valor):
    resultados, dados, _ = analise
    arquivo = resultados['job-1']['arquivo']
    auditoria = deepcopy(resultados['job-1']['elegibilidade'])
    auditoria[campo] = valor
    frame = gpd.read_file(BytesIO(dados[arquivo]), engine='pyogrio', layer='elegibilidade_territorial')
    dados[arquivo] = vetor(frame, 'saida.gpkg', 'GPKG', layer='elegibilidade_territorial',
                          layer_metadata={'SICARD_ELEGIBILIDADE': json.dumps(auditoria)})['saida.gpkg']
    anteriores = dict(dados)
    with pytest.raises(ValueError):
        service.abrir(arquivo, 'outro')
    assert dados == anteriores


def test_reabrir_nao_oculta_storage_indisponivel(analise, monkeypatch):
    def falhar(*args, **kwargs):
        raise RuntimeError('Storage indisponível.')
    monkeypatch.setattr(service.storage_remoto, 'baixar', falhar)
    with pytest.raises(RuntimeError, match='Storage indisponível'):
        service.abrir(analise[0]['job-1']['arquivo'], 'outro')


def test_nome_cadastral_nao_e_validado_como_alias_de_arquivo(analise, monkeypatch):
    _, _, nomes = analise
    ler = service._ler
    cadastral = 'PROPOSTA FEPASA - CAMELÓDROMO COMPLEXO DO EIXO FERROVIÁRIO - ASSIS/SP'
    longo = 'Demanda / setor _ especial ' * 10

    def com_nomes(resultado):
        frame, dados = ler(resultado)
        frame.loc[0, 'nome'] = cadastral
        frame.loc[1, 'nome'] = longo
        return frame, dados

    monkeypatch.setattr(service, '_ler', com_nomes)
    modelo, _ = service.montar(['job-1', 'job-2'], nomes, 'autor', True)
    assert modelo['entradas'][0]['linhas'][0]['nome'] == cadastral
    assert modelo['entradas'][0]['linhas'][1]['nome'] == longo
    assert service.pdf(modelo).startswith(b'%PDF')
    with pytest.raises(ValueError, match='nome amigável'):
        service.montar(['job-1', 'job-2'], {**nomes, 'entrada-1': 'Arquivo/indevido'}, 'autor', True)


def test_parcial_identificado_e_lotes_distintos_recusados(analise):
    resultados, _, nomes = analise
    del nomes['entrada-2']
    modelo, _ = service.montar(['job-1'], nomes, 'autor', True)
    texto = ' '.join(p.extract_text() for p in PdfReader(BytesIO(service.pdf(modelo))).pages)
    assert 'RELATÓRIO PARCIAL' in texto
    resultados['job-2']['lote_id'] = 'outro'
    with pytest.raises(ValueError, match='mesma execução'):
        service.preparar(['job-1', 'job-2'], 'autor')
    with pytest.raises(FileNotFoundError):
        service.preparar(['job-1'], 'outro')


def test_painel_usa_geometrias_areas_e_feicoes_do_mesmo_arquivo(analise):
    _, _, nomes = analise
    modelo, _ = service.montar(['job-1','job-2'], nomes, 'autor', True)
    entrada = modelo['entradas'][0]
    assert len(entrada['geometrias']['features']) == 63
    assert len(entrada['intersecoes']['features']) == 62*7
    assert entrada['linhas'][0]['sobreposicoes'] == []
    contato = entrada['linhas'][1]['sobreposicoes'][0]
    assert contato['area_m2'] == contato['percentual'] == 0
    linha = entrada['linhas'][3]
    assert linha['area_total_m2'] == 100
    assert linha['sobreposicoes'][-1]['nome'] == 'Trecho do Setor 6'
    assert linha['sobreposicoes'][-1]['area_m2'] == linha['areas'][-1] == 7.
    assert linha['sobreposicoes'][-1]['percentual'] == pytest.approx(7.)
    assert entrada['geometrias']['features'][3]['properties']['chave'] == linha['chave']


def test_nomes_confirmados_persistem_vinculados_ao_usuario_e_assinatura(analise):
    resultados, dados, nomes = analise
    assert service.preparar(['job-1','job-2'], 'autor')['revisados'] is False
    nomes['feicao-1'] = 'Feição Revisada'
    modelo, _ = service.montar(['job-1','job-2'], nomes, 'autor', True)
    service.salvar_nomes(['job-1','job-2'], modelo, 'autor')
    preparacao = service.preparar(['job-1','job-2'], 'autor')
    assert preparacao['revisados'] is True
    assert next(f for f in preparacao['fontes'] if f['id'] == 'feicao-1')['nome'] == 'Feição Revisada'
    caminho = service._caminho_revisao(resultados['job-1'], 'autor')
    revisao = json.loads(dados[caminho])
    revisao['sha256'] = 'assinatura diferente'
    dados[caminho] = json.dumps(revisao).encode()
    with pytest.raises(ValueError, match='proprietário ou à saída'):
        service.preparar(['job-1','job-2'], 'autor')


def test_nomes_de_feicoes_iguais_nao_unem_classes_e_legado_e_explicito(analise):
    resultados, _, nomes = analise
    nomes['feicao-1'] = nomes['feicao-0']
    modelo, _ = service.montar(['job-1','job-2'], nomes, 'autor', True)
    classes = modelo['entradas'][0]['linhas'][3]['sobreposicoes']
    assert classes[0]['nome'] == classes[1]['nome'] and classes[0]['id'] != classes[1]['id']
    resultados['job-1']['elegibilidade']['versao_saida'] = 1
    with pytest.raises(ValueError, match='Execute novamente'):
        service.montar(['job-1','job-2'], nomes, 'autor', True)


def test_mapa_preserva_aneis_internos():
    poligono = Polygon([(0,0),(10,0),(10,10),(0,10)], [[(2,2),(2,8),(8,8),(8,2)]])
    mapa = service._mapa(gpd.GeoDataFrame(geometry=[poligono], crs=5880), [True])
    assert len(mapa['formas'][0]['aneis']) == 2


def test_processamento_real_alimenta_painel_e_pdf_sem_recalcular(monkeypatch):
    from api.services import elegibilidade_processamento as processamento
    from api.services.controle_processamento import ControleProcessamento
    entrada = gpd.GeoDataFrame({'nome': ['Demanda Norte', 'Demanda Sul']},
        geometry=[box(5000000,7000000,5000010,7000010), box(5000020,7000000,5000030,7000010)], crs=5880)
    base = gpd.GeoDataFrame({'nome': ['Margens do Rio Claro', 'Reserva do Vale Verde']},
        geometry=[box(5000000,7000000,5000008,7000010), box(5000002,7000000,5000010,7000010)], crs=5880)
    recortes = []
    saida, audit = processamento.calcular(entrada, [('restricao','Proteção','base',base)],
                                          ControleProcessamento(), intersecoes=recortes)
    audit['entrada'] = {'id':'entrada','nome':'Demandas'}
    dados = processamento.serializar(saida, audit, recortes, 'saida.gpkg')['saida.gpkg']
    resultado = {'arquivo':'saidas-geoespaciais/saida.gpkg','sha256':sha256(dados).hexdigest(),'elegibilidade':audit}
    monkeypatch.setattr(service.jobs,'consultar',lambda ident,dono: {'status':'concluido','resultado':resultado})
    monkeypatch.setattr(service.storage_remoto,'baixar',lambda caminho: dados)
    nomes = {f['id']:f['nome'] for f in service._fontes([resultado])}
    modelo, arquivos = service.montar(['job'],nomes,'autor',True)
    linha = modelo['entradas'][0]['linhas'][0]
    assert linha['area_total_m2'] == 100 and linha['areas'] == [160.]
    assert [c['area_m2'] for c in linha['sobreposicoes']] == [80.,80.]
    assert sum(c['percentual'] for c in linha['sobreposicoes']) == 160.
    assert modelo['entradas'][0]['linhas'][1]['sobreposicoes'] == []
    assert arquivos[0][1] == dados
    texto = ' '.join(p.extract_text() for p in PdfReader(BytesIO(service.pdf(modelo))).pages)
    assert 'Margens do Rio Claro' in texto and 'Reserva do Vale Verde' in texto
    assert '80,00%' in texto and 'Demanda Sul' in texto
    recortes[0]['area_m2'] = 99.
    adulterado = processamento.serializar(saida,audit,recortes,'saida.gpkg')['saida.gpkg']
    resultado['sha256'] = sha256(adulterado).hexdigest()
    monkeypatch.setattr(service.storage_remoto,'baixar',lambda caminho: adulterado)
    with pytest.raises(ValueError, match='soma das interseções diverge'):
        service.montar(['job'],nomes,'autor',True)


def test_rotas_exportacao_autenticadas_e_revisadas(analise):
    from api.deps.auth import require_geospatial_access
    from api.routers.extracao_atributos import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    _, _, nomes = analise
    payload = {'execucoes': ['job-1','job-2'], 'nomes': nomes, 'revisados': True}
    rota = '/extracao-atributos/elegibilidade/resultados'
    with TestClient(app) as client:
        assert client.post(rota+'/preparar', json={'execucoes': payload['execucoes']}).status_code == 200
        assert client.post(rota+'/visualizar', json={**payload, 'revisados':False}).status_code == 422
        assert client.post(rota+'/visualizar', json=payload).status_code == 200
        resposta = client.post(rota+'/pacote', json=payload)
        assert resposta.status_code == 200 and resposta.headers['content-type'] == 'application/zip'
        assert 'filename*=' in resposta.headers['content-disposition']
        assert 'X-SICARD-Package' in resposta.headers
        app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='outro')
        assert client.post(rota+'/pacote', json=payload).status_code == 404
