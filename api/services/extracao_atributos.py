"""Catálogo, execução persistida e recuperação das extrações de atributos."""
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from threading import Lock
from uuid import UUID

from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.path_policy import project_path
from api.repositories import camada_geoespacial_repository as repo
from api.services import ciclo_vida_arquivos as ciclo
from api.services.extracao_atributos_analise import analisar
from api.services.geoespacial_service import geoespacial_service as geo

_log = logging.getLogger(__name__)
_pool = ThreadPoolExecutor(max_workers=1,thread_name_prefix='extracao')
_progress = {}
_controles = {}
from api.services.controle_processamento import ControleProcessamento, ProcessamentoCancelado
_lock = Lock()


def caminho_arquivo(row):
    """Caminho relativo registrado da camada; a lista da bancada guarda esta referência."""
    metadata = row.get('metadados') or {}
    nested = metadata.get('metadados') or {}
    valor = metadata.get('caminho_arquivo') or nested.get('caminho_arquivo')
    return str(valor).replace('\\', '/') if valor else None


def camada_para_mapa(ident):
    """A visualização usa a mesma camada integral do banco que a execução."""
    item = repo.carregar_vetor(ident)
    if item is None:
        raise FileNotFoundError('Camada vetorial não encontrada no banco.')
    frame, metadata = item
    if (metadata.get('metadados') or {}).get('origem') == 'municipal-layer':
        from api.services.municipal_layer import carregar_para_extracao
        frame = carregar_para_extracao(ident)
    if frame.crs is None:
        raise ValueError('A camada não informa seu CRS.')
    if frame.empty:
        raise ValueError('A camada não contém feições disponíveis para visualização.')
    from api.services.extracao_entrada_local import _representacao_mapa, MAX_VERTICES_PREVIA
    geojson, detalhe = _representacao_mapa(frame, MAX_VERTICES_PREVIA)
    extra = {}
    if detalhe['metodo'] != 'original':
        extra['geojson_resumido'], _ = _representacao_mapa(frame, MAX_VERTICES_PREVIA // 10)
    return {'id':ident,'nome':metadata['nome'],'representacao_previa':detalhe,**extra,
            'origem_geometria':'arquivo' if (metadata.get('metadados') or {}).get('origem') == 'municipal-layer' else 'banco',
            'crs_arquivo':str(frame.crs),
            'campos':[{'nome':name,'tipo':str(frame[name].dtype)} for name in frame.columns
                      if name != frame.geometry.name],
            'geojson':geojson}


def catalogo():
    with get_connection() as conn:
        categories = [dict(r) for r in conn.execute('''SELECT codigo AS id,nome,conceito
            FROM dominios.categoria_extracao_atributos WHERE ativo ORDER BY ordem,nome''').fetchall()]
        hidden = {r['recurso_sessao_id'] for r in conn.execute('''SELECT c.recurso_sessao_id
            FROM geoprocessamento.arquivo_resultado a JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
            WHERE a.estado IN ('temporario','removido')''').fetchall()}
    layers = [{'id':r['recurso_sessao_id'],'nome':r['nome'],'tipo':'vetor','crs':r['crs'],
               'origem':r['categoria'],'arquivo':caminho_arquivo(r)}
              for r in repo.listar(incluir_manifesto=False) if r['tipo']=='vetor' and r['recurso_sessao_id'] not in hidden]
    # Bases geoespaciais do storage: lidas do arquivo na execução, sem registro no banco.
    from api.services import storage_geoespacial
    try:
        layers += [{'id':c['id'],'nome':c['nome'],'tipo':'vetor','crs':c.get('crs'),
                    'origem':'storage','arquivo':c['arquivo']}
                   for c in storage_geoespacial.camadas_vetoriais()]
    except OSError:
        _log.exception('Storage indisponível ao montar o catálogo da extração')
    return {'categorias':categories,'camadas':layers}


def caminho(ident, pasta=None):
    """Arquivo do resultado. A pasta leva o nome da saida, nao o UUID.

    O nome fica gravado em execucao_arquivo.parametros porque so o identificador
    chega aqui na leitura. Execucoes antigas continuam na pasta com o UUID.
    """
    ident = str(UUID(str(ident)))
    if pasta is None:
        with get_connection() as conn:
            linha = conn.execute("""SELECT parametros->>'pasta_resultado' AS pasta
                FROM geoprocessamento.execucao_arquivo WHERE id=%s""", (ident,)).fetchone()
        pasta = (linha or {}).get('pasta')
    if not pasta:
        return project_path(f'data/geoespacial/outputs/{ident}/extracao.json')
    return project_path(f'data/geoespacial/outputs/{pasta}/extracao.json')


def iniciar(payload, user):
    catalog = catalogo()
    layers = {r['id']:r for r in catalog['camadas']}
    categories = {r['id']:r for r in catalog['categorias']}
    input_id = payload['input_id']
    entrada_local, meta_local = None, None
    entradas_locais = {}
    arquivos_entrada = dict(payload.get('entradas_locais') or {})
    if payload.get('arquivo_local'):
        if not input_id.startswith('local:'):
            raise ValueError('O arquivo local deve corresponder à entrada selecionada.')
        arquivos_entrada[input_id] = payload['arquivo_local']
    ids_entrada = {input_id, *(e['id'] for e in payload.get('entradas') or [])}
    if set(arquivos_entrada) != {i for i in ids_entrada if i.startswith('local:')}:
        raise ValueError('Selecione novamente os arquivos das entradas locais presentes na bancada.')
    bases_locais = {}
    solicitadas = {i for g in payload['categorias'] for i in g['camadas'] if i.startswith('local:')}
    arquivos_bases = payload.get('bases_locais') or {}
    if set(arquivos_bases) != solicitadas:
        raise ValueError('Selecione novamente os arquivos das bases locais.')
    tamanho_total = sum(len(a.get('conteudo_base64', '')) for a in [*arquivos_bases.values(), *arquivos_entrada.values()])
    if tamanho_total > 30 * 1024 * 1024:
        raise ValueError('Os arquivos locais da execução excedem 30 MB codificados. Reduza o conjunto de arquivos.')
    for chave, arquivo in arquivos_entrada.items():
        from api.services.extracao_entrada_local import restaurar
        frame, meta = restaurar(arquivo)
        entradas_locais[chave] = frame
        layers[chave] = {'id': chave, 'nome': arquivo['nome'], 'origem': 'local'}
        if chave == input_id:
            entrada_local, meta_local = frame, meta
    if input_id not in layers:
        raise ValueError('A camada de entrada não está disponível no catálogo vetorial.')
    for chave, arquivo in arquivos_bases.items():
        from api.services.extracao_entrada_local import restaurar
        frame, meta = restaurar(arquivo)
        bases_locais[chave] = frame
        layers[chave] = {'id': chave, 'nome': meta['nome_camada'], 'origem': 'local', 'metadados_local': meta}
    from api.services.extracao_atributos_regras import normalizar_entrada, normalizar_finalidades
    configs = {item['id']: item.get('config') for item in payload.get('entradas') or []}
    if payload['operacao'] not in ('enriquecimento', 'estatisticas') and (len(configs) > 1 or set(configs) - {input_id}
                                                    or payload.get('finalidades')):
        raise ValueError('Várias entradas, configuração de entrada e finalidades só existem no modo enriquecimento.')
    # A entrada principal vem primeiro; as adicionais seguem na ordem informada.
    entradas = []
    for ident in [input_id, *[i for i in configs if i != input_id]]:
        if ident not in layers:
            raise ValueError('Camada de entrada indisponível no catálogo vetorial.')
        entradas.append({'id': ident, 'nome': layers[ident]['nome'], 'config': normalizar_entrada(configs.get(ident))})
    if len({e['nome'] for e in entradas}) != len(entradas):
        raise ValueError('Duas camadas de entrada têm o mesmo nome no catálogo.')
    if payload['operacao'] == 'estatisticas' and any(e['config']['filtro'] or e['config']['campos'] is not None for e in entradas):
        raise ValueError('No modo sem recorte, abra Configurar na entrada e aplique a preservação de todas as feições e campos.')
    ids_entrada = {e['id'] for e in entradas}
    used, selected = set(), []
    for group in payload['categorias']:
        if group['id'] not in categories:
            raise ValueError('Categoria inexistente ou inativa. Atualize o catálogo.')
        if any(c['id']==group['id'] for c in selected):
            raise ValueError('Categoria repetida.')
        bases = []
        for ident in group['camadas']:
            if ident not in layers or ident in ids_entrada or ident in used:
                raise ValueError('Base indisponível, repetida ou igual à entrada.')
            used.add(ident)
            bases.append({**layers[ident],'regra':(group.get('regras') or {}).get(ident)})
        selected.append({**categories[group['id']],'camadas':bases})
    # Regras por base normalizadas e checadas entre bases; ficam registradas nos parâmetros.
    from api.services.extracao_atributos_regras import validar_conjunto
    if payload['operacao'] == 'estatisticas':
        from api.services.extracao_atributos_regras import normalizar_estatisticas
        selected = normalizar_estatisticas(selected)
    else:
        selected = validar_conjunto(selected)
    from api.services.extracao_atributos_analise import OPCOES_PADRAO
    opcoes = {chave: bool((payload.get('opcoes') or {}).get(chave, valor))
              for chave, valor in OPCOES_PADRAO.items()}
    params = {'camada_id':input_id,'camada_ids':sorted(used),'categorias':selected,'responsavel':str(user.id),
              'responsavel_nome':getattr(user,'nome',None),
              'operacao':payload['operacao'],'opcoes':opcoes,'input_nome':layers[input_id]['nome'],
              'nome_saida':str(payload.get('nome_saida') or '').strip()[:200],
              'entradas':entradas,'finalidades':normalizar_finalidades(payload.get('finalidades'))}
    if meta_local is not None:
        params['entrada_local'] = meta_local
    ident = ciclo.iniciar('extracao_atributos',params,str(user.id))
    with _lock:
        encerrados=[chave for chave,valor in _controles.items() if valor.status!='executando']
        for chave in encerrados[:-99]:_controles.pop(chave,None)
        _progress[ident] = [_etapa('Na fila de processamento')]
        _controles[str(ident)] = ControleProcessamento()
    try:
        if entradas_locais:
            _pool.submit(_execute,ident,params,entrada_local,bases_locais,entradas_locais)
        elif bases_locais:
            _pool.submit(_execute,ident,params,entrada_local,bases_locais)
        elif entrada_local is not None:
            _pool.submit(_execute,ident,params,entrada_local)
        else:
            _pool.submit(_execute,ident,params)
    except Exception:
        ciclo.finalizar(ident,erro='Não foi possível iniciar o processamento.')
        raise
    return {'id':ident,'status':'executando',
            'eventos_url':f'/api/geoespacial/extracao-atributos/execucoes/{ident}/eventos'}


LIMITE_ETAPAS = 300


def _etapa(mensagem):
    return {'em': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'mensagem': mensagem}


def _execute(ident, params, entrada_local=None, bases_locais=None, entradas_locais=None):
    token = ciclo.execucao_atual.set(ident)
    with _lock: controle = _controles.setdefault(str(ident), ControleProcessamento())
    def progress(message):
        controle.mensagem(message)
        # O modal de acompanhamento lê esta lista; o corte evita crescer sem limite.
        with _lock:
            etapas = _progress.setdefault(ident, [])
            etapas.append(_etapa(message))
            del etapas[:-LIMITE_ETAPAS]
    progress.tarefa = controle.tarefa
    progress.fase = controle.fase
    inicio = datetime.now(timezone.utc)
    try:
        controle.fase(1, 'Lendo a camada de entrada')
        from api.services.municipal_layer import carregar_para_extracao
        source = entrada_local if entrada_local is not None else carregar_para_extracao(params['camada_id'])
        categories = []
        controle.tarefa(1, 1)
        for categoria in params['categorias']:
            camadas = []
            for base in categoria['camadas']:
                progress(f"Lendo a base {base['nome']}")
                frame = bases_locais[base['id']] if bases_locais and base['id'] in bases_locais else carregar_para_extracao(base['id'])
                camadas.append({**base,'frame':frame})
                controle.tarefa(1, 1)
            categories.append({**categoria,'camadas':camadas})
        controle.fase(2, 'Analisando as relações entre entrada e bases')
        if params['operacao'] in ('enriquecimento', 'estatisticas'):
            _executar_enriquecimento(ident,params,source,categories,progress,inicio,entradas_locais)
            controle.encerrar('concluido')
            return
        result, frame = analisar(source,categories,params['operacao'],progress,params.get('opcoes'))
        from api.services.extracao_intersecoes_territoriais import registrar as registrar_intersecoes
        result['intersecoes_territoriais'] = registrar_intersecoes(
            [{'id':params['camada_id'], 'nome':params['input_nome'], 'frame':source}], categories, progress)
        progress('Montando a tabela de atributos da geometria de saída')
        from api.services.extracao_atributos_saida import montar as montar_tabela_saida
        saida, result['tabela_saida'] = montar_tabela_saida(result,frame,source)
        controle.fase(3, 'Salvando saídas e preparando o pacote', cancelavel=False)
        progress('Gravando a geometria resultante no banco')
        nome_saida = params.get('nome_saida') or f"Extração de {params['input_nome']}"
        # Só no banco: o GeoPackage da saída viaja no pacote, não em data/geoespacial/outputs.
        layer_id = geo.registrar_camada(saida,nome_saida,'OP-05',linhagem=params,gravar_arquivo=False)
        from osgeo import gdal
        result.update(id=ident,camada_resultado_id=layer_id,input_id=params['camada_id'],input_nome=params['input_nome'],
                      criado_em=datetime.now(timezone.utc).isoformat(),gdal=gdal.VersionInfo('RELEASE_NAME'))
        progress('Registrando a procedência da entrada e das bases')
        entrada = _procedencia(params['camada_id'],params['input_nome'],source)
        bases = [{**_procedencia(b['id'],b['nome'],b['frame']),'categoria':c['nome'],'categoria_id':c['id']}
                 for c in categories for b in c['camadas']]
        progress('Gerando o pacote de saída: GeoPackage, relatórios PDF, XLSX e CSV')
        from api.services import extracao_atributos_pacote as pacote_servico
        with _lock: etapas = list(_progress.get(ident) or [])
        fim = datetime.now(timezone.utc)
        processamento = {'execucao_id':ident,'nome_saida':nome_saida,'responsavel':params.get('responsavel'),
                         'responsavel_nome':params.get('responsavel_nome'),
                         'operacao':params['operacao'],'opcoes':params.get('opcoes'),
                         'iniciado_em':inicio.isoformat(),'finalizado_em':fim.isoformat(),
                         'duracao_segundos':(fim-inicio).total_seconds(),'entrada':entrada,'bases':bases,
                         'saida':{'camada_resultado_id':layer_id,'feicoes':len(saida),
                                  'ocorrencias':result['resumo'].get('ocorrencias'),
                                  'camadas_intersectadas':result['resumo'].get('camadas_intersectadas')},
                         'etapas':etapas,'ambiente':pacote_servico.ambiente()}
        pacote, nome_pacote, manifesto = pacote_servico.montar_pacote(
            result,saida,source,processamento,bases=[(c['nome'],b['nome'],b['frame']) for c in categories for b in c['camadas']],
            intersecoes=frame,incluir_entrada=not params.get('entrada_local'))
        progress(f'Pacote gerado: {nome_pacote} ({len(pacote)} bytes)')
        with _lock: etapas = list(_progress.get(ident) or [])
        from hashlib import sha256
        with get_connection() as conn:
            conn.execute('''INSERT INTO geoprocessamento.extracao_atributos
                (execucao_id,nome_saida,operacao,responsavel,entrada,entrada_geojson,bases,camada_resultado_id,
                 relatorio,etapas,pacote,pacote_nome,pacote_sha256,pacote_tamanho_bytes,pacote_arquivos)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
                (ident,nome_saida,params['operacao'],params.get('responsavel'),Jsonb(entrada),
                 Jsonb({'type':'FeatureCollection','features':[]} if params.get('entrada_local') else json.loads(source.to_crs(4674).to_json(default=str))),Jsonb(bases),layer_id,
                 Jsonb(result),Jsonb(etapas),pacote,nome_pacote,sha256(pacote).hexdigest(),len(pacote),Jsonb(manifesto)))
            ciclo.registrar_uso(conn,layer_id,'relatorio',ident)
        ciclo.finalizar(ident)
        controle.encerrar('concluido')
    except ProcessamentoCancelado as exc:
        ciclo.finalizar(ident,erro=str(exc))
        controle.encerrar('cancelado')
    except Exception as exc:
        message = str(exc) if isinstance(exc,ValueError) else 'Falha ao processar ou persistir a análise. Verifique os dados e o serviço.'
        # O texto genérico protege o usuário de detalhe interno, mas sem este
        # log a causa real da falha não ficava registrada em lugar nenhum.
        _log.exception('Extração de atributos %s falhou', ident)
        ciclo.finalizar(ident,erro=message)
        controle.encerrar('erro')
    finally:
        ciclo.execucao_atual.reset(token)
        with _lock: _progress.pop(ident,None)


def _jsonavel(valor):
    """Escalares NumPy e datas viram tipos que o Jsonb aceita."""
    return json.loads(json.dumps(valor, ensure_ascii=False,
                                 default=lambda v: v.item() if hasattr(v, 'item') else str(v)))


def _executar_enriquecimento(ident, params, source, categories, progress, inicio, entradas_locais=None):
    """Persiste os dois modos de enriquecimento e registra qual foi executado."""
    from hashlib import sha256
    import pandas as pd
    from api.services import extracao_atributos_pacote_enriquecimento as pacote_enriquecimento
    if params['operacao'] == 'estatisticas':
        from api.services.extracao_atributos_estatisticas import enriquecer
    else:
        from api.services.extracao_atributos_enriquecimento import enriquecer
    from api.services.extracao_atributos_pacote import ambiente
    from api.services.municipal_layer import carregar_para_extracao
    # A entrada principal já foi carregada; as adicionais são lidas aqui.
    lista = params.get('entradas') or [{'id':params['camada_id'],'nome':params['input_nome'],'config':{}}]
    frames = {**(entradas_locais or {}), params['camada_id']:source}
    entradas = [{**e,'frame':frames.get(e['id']) if e['id'] in frames else carregar_para_extracao(e['id'])}
                for e in lista]
    saida = enriquecer(categorias=categories,progress=progress,entradas=entradas,
                       finalidades=[{'nome':f['nome'],'campos':f['campos']} for f in params.get('finalidades') or []])
    from api.services.extracao_intersecoes_territoriais import registrar as registrar_intersecoes
    intersecoes_territoriais = registrar_intersecoes(entradas, categories, progress)
    nome_saida = params.get('nome_saida') or f"Extração de {params['input_nome']}"
    if hasattr(progress,'fase'):progress.fase(3, 'Salvando saídas e preparando o pacote', cancelavel=False)
    camadas = {}
    for nome, frame in saida['camadas'].items():
        progress(f'Gravando a camada {nome} no banco')
        camadas[nome] = {'camada_resultado_id':geo.registrar_camada(frame,f'{nome_saida} — {nome}','OP-05',
                                                                     linhagem=params,gravar_arquivo=False,
                                                                     preservar_geometrias=params['operacao']=='estatisticas'),
                         'registros':len(frame),'campos':len(frame.columns)-1}
    progress('Registrando a procedência da entrada e das bases')
    entrada = _procedencia(params['camada_id'],params['input_nome'],source)
    entradas_proc = [{**_procedencia(e['id'],e['nome'],e['frame']),'config':e['config']} for e in entradas]
    bases = [{**_procedencia(b['id'],b['nome'],b['frame']),'categoria':c['nome'],'categoria_id':c['id']}
             for c in categories for b in c['camadas']]
    etapas_motor = [etapa for info in saida['relatorio']['camadas'].values() for etapa in info['etapas']]
    tocadas = {e['base'].split(' [')[0] for e in etapas_motor if e.get('registros_com_correspondencia')}
    registros = sum(item['registros'] for item in camadas.values())
    fim = datetime.now(timezone.utc)
    from osgeo import gdal
    geojson = json.loads(pd.concat([frame[[frame.geometry.name]].assign(camada=nome).to_crs(4326)
                                    for nome, frame in saida['camadas'].items()]).to_json(default=str))
    result = {'id':ident,'modo':'enriquecimento','operacao':params['operacao'],'input_id':params['camada_id'],
              'input_nome':params['input_nome'],'criado_em':fim.isoformat(),'gdal':gdal.VersionInfo('RELEASE_NAME'),
              'camada_resultado_id':next(iter(camadas.values()))['camada_resultado_id'],'camadas':camadas,
              'resumo':{'ocorrencias':registros,'camadas_intersectadas':len(tocadas)},
              'relatorio_enriquecimento':saida['relatorio'],'dicionario':saida['dicionario'],'categorias':[],
              'validacao':saida['relatorio']['validacao'],'entradas':entradas_proc,
              'categorias_analiticas':[{'id':c['id'],'nome':c['nome'],'conceito':c.get('conceito','')} for c in categories],
              'intersecoes_territoriais':intersecoes_territoriais,
              'finalidades':{chave:{'nome':item['nome'],'campos':item['campos']} for chave,item in saida['finalidades'].items()},
              'geojson':geojson}
    with _lock: etapas = list(_progress.get(ident) or [])
    configuracao = {'execucao_id':ident,'nome_saida':nome_saida,'modo':'enriquecimento','operacao':params['operacao'],
                    'iniciado_em':inicio.isoformat(),'finalizado_em':fim.isoformat(),'entrada':entrada,
                    'entradas':entradas_proc,'finalidades':params.get('finalidades') or [],
                    'categorias':[{'id':c['id'],'nome':c['nome'],
                                   'camadas':[{'id':b['id'],'nome':b['nome'],'regra':b['regra']} for b in c['camadas']]}
                                  for c in categories],
                    'bases':bases,'resultado':{'camadas':camadas,'relatorio':saida['relatorio']},
                    'etapas':etapas,'ambiente':ambiente()}
    progress('Gerando o pacote de saída: GeoPackage, CSV, XLSX, dicionário e configuração')
    pacote, nome_pacote, manifesto = pacote_enriquecimento.montar_pacote(
        saida['camadas'],source,saida['dicionario'],_jsonavel(configuracao),nome_saida,
        finalidades=saida['finalidades'],validacao=_jsonavel(saida['relatorio']['validacao']),
        preservar_geometrias=params['operacao']=='estatisticas',incluir_entrada=not params.get('entrada_local'))
    progress(f'Pacote gerado: {nome_pacote} ({len(pacote)} bytes)')
    with _lock: etapas = list(_progress.get(ident) or [])
    with get_connection() as conn:
        conn.execute('''INSERT INTO geoprocessamento.extracao_atributos
            (execucao_id,nome_saida,operacao,responsavel,entrada,entrada_geojson,bases,camada_resultado_id,
             relatorio,etapas,pacote,pacote_nome,pacote_sha256,pacote_tamanho_bytes,pacote_arquivos)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
            (ident,nome_saida,params['operacao'],params.get('responsavel'),Jsonb(_jsonavel(entrada)),
             Jsonb({'type':'FeatureCollection','features':[]} if params.get('entrada_local') else json.loads(source.to_crs(4674).to_json(default=str))),Jsonb(_jsonavel(bases)),
             result['camada_resultado_id'],Jsonb(_jsonavel(result)),Jsonb(etapas),pacote,nome_pacote,
             sha256(pacote).hexdigest(),len(pacote),Jsonb(manifesto)))
        for item in camadas.values():
            ciclo.registrar_uso(conn,item['camada_resultado_id'],'relatorio',ident)
    ciclo.finalizar(ident)


def consultar(ident, user, completo=False):
    ident = str(UUID(str(ident)))
    with get_connection() as conn:
        row = conn.execute("SELECT id,status,erro,responsavel FROM geoprocessamento.execucao_arquivo WHERE id=%s AND operacao='extracao_atributos'",(ident,)).fetchone()
    from api.services.session_service import is_gestor
    # Quem executou vê a própria extração; gestor e administrador veem todas.
    if not row or (row['responsavel'] != str(user.id) and not is_gestor(user)):
        raise LookupError('Extração não encontrada para esta sessão.')
    response = {'id':ident,'status':'cancelado' if row['erro']=='Processamento cancelado pelo usuário antes da gravação das saídas.' else row['status'],'erro':row['erro']}
    with _lock: etapas = list(_progress.get(ident) or [])
    response['etapas'] = etapas
    with _lock: controle = _controles.get(str(ident))
    if controle:
        observado=controle.snapshot()
        response.update(observado)
        response['eventos_url'] = f'/api/geoespacial/extracao-atributos/execucoes/{ident}/eventos'
        etapas=observado['etapas']
    response['etapa'] = (etapas[-1]['mensagem'] if etapas
                         else 'Processamento em execução' if row['status'] == 'executando' else row['status'])
    if row['status']=='concluido' and completo:
        with get_connection() as conn:
            linha = conn.execute('''SELECT nome_saida,relatorio,pacote_nome,pacote_tamanho_bytes,pacote_arquivos
                FROM geoprocessamento.extracao_atributos WHERE execucao_id=%s''',(ident,)).fetchone()
        if linha:
            response['nome_saida'] = linha['nome_saida']
            response['resultado'] = linha['relatorio']
            response['pacote'] = {'nome':linha['pacote_nome'],'tamanho_bytes':linha['pacote_tamanho_bytes'],
                                  'arquivos':linha['pacote_arquivos']}
        else:
            # Extrações anteriores ao pacote no banco guardavam o relatório em disco.
            legado = caminho(ident)
            if legado.is_file():
                response['resultado'] = json.loads(legado.read_text(encoding='utf-8'))
    return response


def eventos_progresso(ident, user):
    # Mesma autorização de autoria/gestor aplicada à consulta da execução.
    consultar(ident, user)
    with _lock:
        controle = _controles.get(str(ident))
    if controle is None:
        raise LookupError('Acompanhamento em tempo real indisponível para esta execução.')
    return controle.eventos


def tabela_resultado(ident, user, camada='resultado', offset=0, limite=100):
    job = consultar(ident,user,completo=True)
    resultado = job.get('resultado') or {}
    if job['status'] != 'concluido':
        raise LookupError('A tabela estará disponível quando o processamento terminar.')
    if resultado.get('modo') == 'enriquecimento':
        recurso = (resultado.get('camadas',{}).get(camada) or {}).get('camada_resultado_id')
    else:
        recurso = resultado.get('camada_resultado_id') if camada == 'resultado' else None
    if not recurso:
        raise LookupError('Camada de saída não encontrada nesta extração.')
    tabela = repo.atributos_paginados(recurso,offset,limite)
    if tabela is None:
        raise LookupError('Tabela de saída não encontrada.')
    return {'camada':camada,**tabela}


def dashboard_resultado(ident, user, camada='resultado', **filtros):
    from api.services.extracao_atributos_dashboard import carregar

    def conceitos():
        with get_connection() as conn:
            return [dict(r) for r in conn.execute(
                'SELECT codigo AS id,nome,conceito FROM dominios.categoria_extracao_atributos').fetchall()]

    def representar(features):
        import geopandas as gpd
        from api.services.extracao_entrada_local import _representacao_mapa
        return _representacao_mapa(gpd.GeoDataFrame.from_features(features, crs=4674), 40000)

    return carregar(ident, user, camada, consultar=consultar, repo=repo,
                    carregar_conceitos=conceitos, representar_mapa=representar, **filtros)


def intersecoes_resultado(ident, user, **filtros):
    from api.services.extracao_resultados_territoriais import consultar as apresentar, legado
    job = consultar(ident, user, completo=True)
    if job['status'] != 'concluido' or not job.get('resultado'):
        raise LookupError('As interseções estarão disponíveis quando o processamento terminar.')
    result = job['resultado']
    snapshot = result.get('intersecoes_territoriais')
    recursos = {name:info['camada_resultado_id'] for name,info in result.get('camadas',{}).items()}
    if not recursos and result.get('camada_resultado_id'):
        recursos = {'resultado':result['camada_resultado_id']}
    if snapshot is None:
        tabelas = {}
        for name,recurso in recursos.items():
            rows = repo.atributos_dashboard(recurso)
            if rows is None:
                raise LookupError('Uma camada de saída não está disponível para a consulta.')
            tabelas[name] = rows
        snapshot = legado(result, tabelas)
    data = apresentar(snapshot, **filtros)
    # Resultados antigos não preservaram a geometria original no snapshot analítico.
    # O mapa identifica explicitamente quando está mostrando geometrias de saída.
    data['mapa_saida'] = {'type':'FeatureCollection','features':[]}
    data['mapa_saida_limitado'] = False
    if data['legado']:
        import geopandas as gpd
        from api.services.extracao_entrada_local import _representacao_mapa
        by_output = {}
        total = 0
        for item in data['linhas']:
            for ref in item.pop('_mapa', []):
                total += 1
                if total > 200:
                    data['mapa_saida_limitado'] = True
                    continue
                by_output.setdefault(ref['saida'], {})[ref['ordem']] = item['chave']
        features = []
        for name, ordens in by_output.items():
            for row in repo.geometrias_dashboard(recursos[name],list(ordens)):
                if row['geometria']:
                    features.append({'type':'Feature','geometry':row['geometria'],'properties':{'chave':ordens[row['ordem']]}})
        if features:
            data['mapa_saida'], data['representacao_saida'] = _representacao_mapa(gpd.GeoDataFrame.from_features(features,crs=4674),40000)
    data['execucao'] = str(ident)
    return data


def listar_execucoes(user, limite=50):
    """Extrações com pacote de saída, da mais recente para a mais antiga."""
    from api.services.session_service import is_gestor
    with get_connection() as conn:
        linhas = conn.execute('''SELECT execucao_id,nome_saida,operacao,responsavel,criado_em,pacote_nome,
                pacote_tamanho_bytes,relatorio->'resumo' AS resumo,relatorio->>'input_nome' AS entrada,
                jsonb_array_length(bases) AS bases
            FROM geoprocessamento.extracao_atributos
            WHERE %s OR responsavel=%s ORDER BY criado_em DESC LIMIT %s''',
            (is_gestor(user),str(user.id),limite)).fetchall()
    return [{'id':str(l['execucao_id']),'nome_saida':l['nome_saida'],'operacao':l['operacao'],
             'entrada':l['entrada'],'bases':l['bases'],'resumo':l['resumo'],'pacote_nome':l['pacote_nome'],
             'pacote_tamanho_bytes':l['pacote_tamanho_bytes'],'criado_em':l['criado_em'].isoformat(),
             'minha':l['responsavel']==str(user.id)} for l in linhas]


def _procedencia(ident, nome, frame):
    """Entrada ou base como foi usada: origem, contagem, CRS e, no storage, a impressão digital."""
    item = {'id':ident,'nome':nome,'feicoes':len(frame),'crs':str(frame.crs) if frame.crs else None}
    if str(ident).startswith('storage:'):
        from api.services.storage_geoespacial import impressao_digital
        item.update(origem='storage',**impressao_digital(ident))
    elif str(ident).startswith('local:'):
        item['origem'] = 'memoria'
        item['temporaria'] = True
    else:
        item['origem'] = 'banco'
    return item


# Só o .zip é baixado; os relatórios também podem ser abertos renderizados no navegador.
FORMATOS_PACOTE = ('zip','pdf_processamento','pdf_analitico')


def arquivo_do_pacote(ident, user, formato):
    """O .zip inteiro ou um arquivo dele, lido do banco. Só para quem executou."""
    if formato not in FORMATOS_PACOTE:
        raise LookupError('Arquivo inexistente no pacote.')
    ident = consultar(ident,user)['id']
    with get_connection() as conn:
        linha = conn.execute('''SELECT pacote,pacote_nome,pacote_arquivos
            FROM geoprocessamento.extracao_atributos WHERE execucao_id=%s''',(ident,)).fetchone()
    if not linha:
        raise LookupError('Esta extração não tem pacote de saída.')
    pacote = bytes(linha['pacote'])
    if formato == 'zip':
        return pacote, linha['pacote_nome']
    item = next((a for a in linha['pacote_arquivos'] if a['chave']==formato),None)
    if not item:
        raise LookupError('Arquivo inexistente no pacote.')
    from api.services.extracao_atributos_pacote import ler_do_pacote
    return ler_do_pacote(pacote,item['nome']), item['nome']

def renomear_execucao(ident, user, nome_saida):
    # Novo nome da saída, na extração e na camada gravada.
    ident = consultar(ident,user)['id']
    nome = str(nome_saida or '').strip()[:200]
    if not nome:
        raise ValueError('Informe o nome da saída.')
    with get_connection() as conn:
        linha = conn.execute('UPDATE geoprocessamento.extracao_atributos SET nome_saida=%s '
                             'WHERE execucao_id=%s RETURNING camada_resultado_id',(nome,ident)).fetchone()
        if not linha:
            raise LookupError('Esta extração não tem pacote de saída.')
        conn.execute('UPDATE geoprocessamento.camada_processada SET nome=%s WHERE recurso_sessao_id=%s',
                     (nome,linha['camada_resultado_id']))
    return {'id':ident,'nome_saida':nome}


def excluir_execucao(ident, user):
    # Apaga a extração pelo id exato: a camada de saída registrada nela e a execução.
    # A linha de geoprocessamento.extracao_atributos (relatório e pacote) cai junto
    # com a execução (ON DELETE CASCADE).
    ident = consultar(ident,user)['id']
    with get_connection() as conn:
        linha = conn.execute('''SELECT camada_resultado_id,relatorio->'camadas' AS camadas
            FROM geoprocessamento.extracao_atributos WHERE execucao_id=%s''',(ident,)).fetchone()
    if not linha:
        raise LookupError('Esta extração não tem pacote de saída.')
    # O modo enriquecimento grava uma camada por tipo de geometria: todas saem juntas.
    ids = {linha['camada_resultado_id']}
    if isinstance(linha['camadas'], dict):
        ids |= {item.get('camada_resultado_id') for item in linha['camadas'].values() if item.get('camada_resultado_id')}
    for camada_id in sorted(ids):
        repo.excluir(camada_id)
    with get_connection() as conn:
        conn.execute('DELETE FROM geoprocessamento.arquivo_resultado_uso WHERE referencia=%s',(ident,))
        conn.execute("DELETE FROM geoprocessamento.execucao_arquivo WHERE id=%s AND operacao='extracao_atributos'",(ident,))


def cancelar(ident, user):
    consultar(ident, user)  # Mesma checagem de responsável da consulta.
    with _lock:
        controle = _controles.get(str(ident))
    if controle is None:
        raise ValueError('Não há um processamento ativo que possa ser interrompido.')
    controle.cancelar()
    return controle.snapshot()
