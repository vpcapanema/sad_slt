"""Sessão de arquivo da bancada: edição do arquivo original com rastreabilidade."""
import asyncio
from uuid import uuid4

import geopandas as gpd
from osgeo import ogr

from api.services import ciclo_vida_arquivos as ciclo
from api.path_policy import project_path
from api.repositories import camada_geoespacial_repository as repo
from api.services.visualizacao_arquivo import ler_arquivo
from api.services.geoespacial_service import geoespacial_service as geo


def abrir(arquivo, revisao=None, camada_id=None):
    if camada_id and camada_id.startswith('storage:') or arquivo.startswith(('base-geoespacial/', 'superficies-indices/')):
        from api.services import storage_geoespacial as storage
        ident = camada_id or 'storage:' + arquivo
        caminho, _ = storage.separar_id(ident)
        if caminho != arquivo:
            raise ValueError('O arquivo não corresponde à camada informada.')
        source = storage.ler_para_mapa(ident)
    else:
        source = ler_arquivo(arquivo)
    if revisao is not None and source['revisao'] != revisao:
        raise ValueError('O arquivo mudou desde a abertura. Reabra antes de salvar ou executar.')
    return source


def frame_editado(source, data):
    import json
    if data.get('type') != 'FeatureCollection' or not data.get('features'):
        raise ValueError('A versão deve conter ao menos uma feição.')
    fields = {field['nome']: field['tipo'] for field in source['campos']}
    subtypes = {field['nome']: field.get('subtipo') for field in source['campos']}
    features = []
    kinds = {f['geometry']['type'].removeprefix('Multi') for f in source['geojson']['features']}
    ids = set()
    for feature in data['features']:
        if feature.get('type') != 'Feature' or feature.get('id') is None or str(feature['id']) in ids:
            raise ValueError('Cada feição deve possuir um identificador único.')
        ids.add(str(feature['id']))
        if (feature.get('geometry') or {}).get('type', '').removeprefix('Multi') not in kinds:
            raise ValueError('Preserve o tipo de geometria da camada de origem.')
        properties = feature.get('properties') or {}
        if set(properties) != set(fields):
            raise ValueError('Preserve os campos originais da camada ao editar.')
        for name, kind in fields.items():
            value = properties[name]
            if value is None:
                continue
            if subtypes[name] == 'Boolean':
                if not isinstance(value, bool):
                    raise ValueError(f'O campo {name} exige um valor booleano.')
                continue
            if subtypes[name] == 'JSON' or (kind == 'String' and isinstance(value, (dict, list))):
                # O driver GeoJSON expande campos JSON em listas/objetos.
                # Regrave-os como JSON, preservando o tipo textual no arquivo.
                continue
            if kind in {'Integer', 'Integer64'} and (not isinstance(value, int) or isinstance(value, bool)):
                raise ValueError(f'O campo {name} exige um número inteiro.')
            if kind == 'Real' and (not isinstance(value, (int, float)) or isinstance(value, bool)):
                raise ValueError(f'O campo {name} exige um número.')
            if kind == 'String' and not isinstance(value, str):
                raise ValueError(f'O campo {name} exige texto.')
        geometry = ogr.CreateGeometryFromJson(json.dumps(feature.get('geometry'), allow_nan=False))
        if geometry is None or geometry.IsEmpty() or not geometry.IsValid():
            raise ValueError('Existe geometria vazia ou inválida. Corrija antes de salvar.')
        features.append({**feature, 'properties': {
            name: json.dumps(value, ensure_ascii=False, allow_nan=False)
            if value is not None and (subtypes[name] == 'JSON' or
                                     (fields[name] == 'String' and isinstance(value, (dict, list)))) else value
            for name, value in properties.items()}})
    frame = gpd.GeoDataFrame.from_features(features, crs=4326)
    for name, subtype in subtypes.items():
        if subtype == 'Boolean':
            frame[name] = frame[name].astype('boolean')
    if not frame.geometry.is_valid.all():
        raise ValueError('Existem geometrias inválidas.')
    west, south, east, north = frame.total_bounds
    if not (-180 <= west <= east <= 180 and -90 <= south <= north <= 90):
        raise ValueError('As coordenadas de edição devem estar em longitude/latitude.')
    return frame.to_crs(source['crs_arquivo'])


def salvar(arquivo, revisao, data, nome, user, camada_id=None):
    source = abrir(arquivo, revisao, camada_id)
    frame = frame_editado(source, data)
    if source['id'].startswith('storage:'):
        from api.services.edicao_storage import gravar
        return gravar(source, frame, data)
    if source.get('coluna_fid'):
        ids = [int(f['id']) for f in source['geojson']['features'] if str(f['id']).isdigit()]
        next_id = max(ids, default=0) + 1
        kept = []
        for feature in data['features']:
            if str(feature['id']).isdigit():
                kept.append(int(feature['id']))
            else:
                kept.append(next_id)
                next_id += 1
        frame.index = kept
        frame.index.name = source['coluna_fid']
    params = {'camada_id': source['id'], 'arquivo': arquivo, 'revisao': revisao,
              'fids_origem': [f['id'] for f in data['features']]}
    ident = ciclo.iniciar('edicao_arquivo_bancada', params, str(user.id))
    token = ciclo.execucao_atual.set(ident)
    try:
        path = project_path(source['arquivo'])
        if source['id'] not in geo._metadados:
            geo._catalogar_persistidas()
        metadata = geo._metadados.get(source['id'])
        if not metadata:
            raise ValueError('Camada não encontrada no catálogo.')
        def gravar():
            # Reconfere após obter o bloqueio do registro no banco.
            abrir(arquivo, revisao)
            geo._reescrever_arquivo_do_acervo(path, frame)
        repo.substituir_vetor(source['id'], frame, metadata,
                             arquivo_editado=path, gravar_arquivo=gravar)
        geo._camadas[source['id']] = frame
        ciclo.finalizar(ident)
        return {**ler_arquivo(source['arquivo']), 'execucao_id': ident}
    except Exception as exc:
        ciclo.finalizar(ident, erro=str(exc))
        raise
    finally:
        ciclo.execucao_atual.reset(token)


def executar(operacao, parametros, arquivos, user, progress=None):
    def report(message, feitas=None, total=None):
        if progress:
            if total is None: progress(message)
            else: progress(message, feitas, total)
    from api.services.geoprocessamento_jobs import _input_references, INPUT_KEYS
    from api.services.geoprocessamento_engine import geoprocessamento_engine
    references = _input_references(parametros)
    if not references or not set(arquivos).issubset(references):
        raise ValueError('Os arquivos informados devem corresponder às entradas da operação.')
    if parametros.get('processar_sobre') == 'selecionadas':
        raise ValueError('Salve a seleção como camada antes de executar sobre parte do arquivo.')
    sources = {}
    for ident, value in arquivos.items():
        report(f"Lendo e conferindo revisão: {value['arquivo']}",len(sources),len(arquivos))
        sources[ident] = abrir(value['arquivo'], value['revisao'], ident if ident.startswith('storage:') else None)
        report(f"Leitura concluída: {sources[ident]['nome']} — {len(sources[ident]['geojson']['features'])} feições",len(sources),len(arquivos))
    if any(value['id'] != ident for ident, value in sources.items()):
        raise ValueError('O arquivo não corresponde à camada informada.')
    execution = ciclo.iniciar(operacao, {**parametros, 'arquivos': arquivos}, str(user.id))
    token = ciclo.execucao_atual.set(execution)
    temporary = {}
    try:
        # IDs exclusivos impedem reaproveitar geometria antiga do cache/banco.
        for ident, source in sources.items():
            key = 'arquivo_bancada_' + uuid4().hex
            temporary[ident] = key
            geo._camadas[key] = gpd.GeoDataFrame.from_features(source['geojson']['features'], crs=4326).to_crs(source['crs_arquivo'])
            geo._metadados[key] = {'id':key,'nome':source['nome'],'tipo':'vetorial','crs':source['crs_arquivo'],'destino':'memoria_local'}
        params = dict(parametros)
        for key, value in params.items():
            if key in INPUT_KEYS:
                params[key] = temporary.get(value, value)
            elif key in {'camada_ids', 'raster_ids'}:
                params[key] = [temporary.get(item, item) for item in value]
        report(f'Executando algoritmo {operacao}: {len(sources)} arquivo(s) de entrada')
        result = asyncio.run(geoprocessamento_engine.execute(operacao, params, **({'progress': report} if progress else {})))
        resource_id = result.get('camada_id') or result.get('raster_id')
        if resource_id and params.get('destino') == 'storage' and operacao not in {'OP-25','OP-26','OP-27'}:
            report('Gravando o resultado no storage')
            filename, output_format = geoprocessamento_engine._canonical_output_file(params)
            output_crs = params.get('crs_saida', 'entrada')
            result['arquivo_saida'] = asyncio.run(geo.salvar_camada(resource_id, 'data/geoespacial/outputs', filename,
                                                    'auto' if output_crs == 'entrada' else output_crs, output_format))
        for original, transient in temporary.items():
            if result.get('camada_id') == transient:
                result['camada_id'] = original
        ciclo.finalizar(execution)
        result_id = result.get('camada_id')
        metadata = geo._metadados.get(result_id) or {}
        path = metadata.get('caminho_arquivo')
        report('Preparando a camada resultante para visualização')
        return {'resultado': result, 'execucao_id': execution,
                'camada': ler_arquivo(path) if path else None}
    except Exception as exc:
        ciclo.finalizar(execution, erro=str(exc))
        raise
    finally:
        ciclo.execucao_atual.reset(token)
        for key in temporary.values():
            geo._camadas.pop(key, None)
            geo._metadados.pop(key, None)


def consultar(arquivo, revisao, expressao, inverter_selecao=False):
    """Consulta o snapshot atual do arquivo sem alterar o original."""
    from api.services.expressoes_atributos import selecionar
    source = abrir(arquivo, revisao)
    frame = gpd.GeoDataFrame.from_features(source['geojson']['features'], crs=4326)
    # Manter o identificador original usado pela seleção no mapa.
    frame.index = [str(feature['id']) for feature in source['geojson']['features']]
    selected = selecionar(frame, expressao, inverter_selecao)
    import json
    return {'total': len(selected), 'geojson': json.loads(selected.to_json(default=str))}


def iniciar_execucao(operacao, parametros, arquivos, user):
    """Expõe as etapas reais do fluxo de arquivos no monitor da bancada."""
    from api.services.geoprocessamento_jobs import geoprocessamento_jobs as jobs
    ident = jobs._new('bancada-arquivos', ['Executar operação'])
    with jobs._lock:
        jobs._jobs[ident].update(responsavel=str(user.id), cancelavel=False)
    def run():
        def report(message, feitas=None, total=None):
            # A duração do algoritmo nativo é desconhecida: não inventar percentual.
            with jobs._lock:
                job = jobs._jobs[ident]
                job['logs'].append({'sequencia':len(job['logs'])+1,'mensagem':message,'nivel':'info'})
                job.update(status='executando',etapa_atual=message,tarefa_id=job['tarefa_id']+1,
                           percentual=None,progresso_tarefa=feitas/total*100 if total else None,
                           tarefa_concluidas=feitas,tarefa_total=total,unidade_tarefa='arquivos')
                jobs._publicar(ident)
        try:
            result = executar(operacao, parametros, arquivos, user, progress=report)
            jobs._complete(ident, result)
        except Exception as exc:
            jobs._fail(ident, exc)
    jobs._executor.submit(run)
    return jobs.get(ident)
