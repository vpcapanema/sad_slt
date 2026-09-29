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
    return _persistir(source, frame, data, user)


def _persistir(source, frame, data, user, incluir_geojson=True):
    arquivo, revisao = source['arquivo'], source['revisao']
    if source['id'].startswith('storage:'):
        from api.services.edicao_storage import gravar
        return gravar(source, frame, data, incluir_geojson=incluir_geojson)
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


def calcular_campo(arquivo, revisao, campo, expressao, user, camada_id=None,
                   chaves_selecionadas=None, filtro=None, incluir_geojson=True):
    from api.services.calculo_campo import calcular
    source = abrir(arquivo, revisao, camada_id)
    features = source['geojson']['features']
    frame = gpd.GeoDataFrame.from_features(features, crs=4326).to_crs(source['crs_arquivo'])
    frame, count = calcular(frame, campo, expressao, chaves_selecionadas, filtro,
                            ids=[feature['id'] for feature in features])
    result = _persistir(source, frame, source['geojson'], user, incluir_geojson)
    if not incluir_geojson:
        result.pop('geojson', None)
    return {**result, 'feicoes_atualizadas': count, 'campo_calculado': campo}


REVISAO_OBSOLETA = 'O arquivo mudou desde a abertura. Reabra antes de salvar ou executar.'
DRIVERS_ARQUIVO = ['GPKG', 'ESRI Shapefile', 'GeoJSON', 'FlatGeobuf', 'KML', 'LIBKML', 'GML']


def _somente_geometrias(frame, nome):
    frame = frame[frame.geometry.notna() & ~frame.geometry.is_empty]
    if frame.empty:
        raise ValueError(f'A camada {nome} não contém geometrias disponíveis para processamento.')
    return frame


def _carregar_storage(arquivo, revisao, ident):
    """Lê o vetor do storage pelo GDAL/pyogrio, sem gerar GeoJSON de mapa."""
    import pyogrio
    from api.services import storage_geoespacial as storage, storage_pacotes
    caminho, camada = storage.separar_id(ident)
    if caminho != arquivo:
        raise ValueError('O arquivo não corresponde à camada informada.')
    alvo = storage.resolver(caminho)
    def revisao_atual(item):
        estado = item.stat()
        return f'{estado.st_mtime_ns}-{estado.st_size}'
    atual = revisao_atual(alvo)
    if revisao is not None and atual != revisao:
        raise ValueError(REVISAO_OBSOLETA)
    if alvo.suffix.lower() in storage_pacotes.COMPACTADOS:
        # Mesmo leitor em memória que carregar_gdf usa, sem reprojetar o original.
        frame, meta = storage_pacotes.carregar(alvo, camada)
        nome = meta.get('nome_camada') or alvo.stem
    else:
        crs = pyogrio.read_info(alvo, layer=camada)['crs']
        if not crs:
            raise ValueError('O arquivo não informa seu CRS. Defina o CRS antes de processar.')
        camadas = pyogrio.list_layers(alvo)
        nome = alvo.stem if len(camadas) == 1 else (camada or camadas[0][0])
        # Leitura nativa: mantém Z, CRS e FIDs originais (carregar_gdf reprojeta e força 2D).
        for encoding in (None, 'ISO-8859-1'):
            try:
                frame = gpd.read_file(alvo, layer=camada, engine='pyogrio', fid_as_index=True,
                                      **({'encoding': encoding} if encoding else {}))
                break
            except UnicodeDecodeError:
                if encoding is not None:
                    raise ValueError('A tabela de atributos usa uma codificação que não foi possível '
                                     'interpretar. Publique o arquivo com um .cpg.')
        if frame.crs is None:
            frame = frame.set_crs(crs)
    if revisao_atual(storage.resolver(caminho)) != atual:
        raise ValueError('O arquivo foi alterado durante a leitura. Abra novamente.')
    frame = _somente_geometrias(frame, nome)
    frame.index = [str(item) for item in frame.index]
    return {'id': ident, 'nome': nome, 'arquivo': caminho, 'revisao': atual,
            'crs_arquivo': frame.crs.to_wkt(), 'frame': frame}


def _carregar_arquivo(arquivo, revisao):
    """Lê o vetor do acervo local com os mesmos limites de raiz e drivers da visualização."""
    from osgeo import gdal
    from api.path_policy import relative_path
    from api.routers.geoespacial import RAIZES_CARREGAVEIS
    from api.services import visualizacao_arquivo as leitura
    relative = relative_path(arquivo).as_posix()
    root = next((leitura.project_path('data/geoespacial/' + area['caminho']).resolve()
                 for area in RAIZES_CARREGAVEIS.values()
                 if relative.startswith('data/geoespacial/' + area['caminho'] + '/')), None)
    path = leitura.project_path(relative).resolve()
    if root is None or not path.is_relative_to(root):
        raise ValueError('Selecione um arquivo nas áreas permitidas do storage.')
    if not path.is_file():
        raise FileNotFoundError('Arquivo não encontrado no storage.')
    atual = leitura.revisao_arquivo(path)
    if revisao is not None and atual != revisao:
        raise ValueError(REVISAO_OBSOLETA)
    matches = leitura.camadas_dos_arquivos({relative})
    if not matches:
        raise ValueError('Este arquivo não possui vínculo disponível no catálogo.')
    vinculo = max(matches, key=lambda row: (row.get('criado_em') is not None,
                                            row.get('criado_em'), row.get('id')))
    dataset = gdal.OpenEx(str(path), gdal.OF_VECTOR | gdal.OF_READONLY, allowed_drivers=DRIVERS_ARQUIVO)
    if dataset is None:
        raise ValueError('GDAL não conseguiu abrir este arquivo vetorial.')
    try:
        if dataset.GetLayerCount() != 1:
            raise ValueError('O arquivo deve conter uma única camada vetorial para esta seleção.')
        srs = dataset.GetLayer(0).GetSpatialRef()
        if srs is None:
            raise ValueError('O arquivo não informa seu CRS. Defina o CRS antes de processar.')
        crs_wkt = srs.ExportToWkt()
    finally:
        dataset = None
    for encoding in (None, 'ISO-8859-1'):
        try:
            frame = gpd.read_file(path, engine='pyogrio', fid_as_index=True,
                                  **({'encoding': encoding} if encoding else {}))
            break
        except UnicodeDecodeError:
            if encoding is not None:
                raise ValueError('A tabela de atributos usa uma codificação que não foi possível '
                                 'interpretar. Publique o arquivo com um .cpg.')
    if leitura.revisao_arquivo(path) != atual:
        raise ValueError('O arquivo foi alterado durante a leitura. Abra novamente.')
    nome = vinculo.get('nome', path.stem)
    frame = _somente_geometrias(frame, nome)
    frame.index = [str(item) for item in frame.index]
    return {'id': vinculo['id'], 'nome': nome, 'arquivo': relative, 'revisao': atual,
            'crs_arquivo': crs_wkt, 'frame': frame}


def carregar_para_execucao(arquivo, revisao=None, camada_id=None):
    """Vetor original (CRS e FIDs do arquivo) para algoritmos, sem GeoJSON intermediário."""
    if camada_id and camada_id.startswith('storage:') or arquivo.startswith(('base-geoespacial/', 'superficies-indices/')):
        return _carregar_storage(arquivo, revisao, camada_id or 'storage:' + arquivo)
    return _carregar_arquivo(arquivo, revisao)


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
    sources = {}
    for ident, value in arquivos.items():
        report(f"Lendo e conferindo revisão: {value['arquivo']}",len(sources),len(arquivos))
        sources[ident] = carregar_para_execucao(value['arquivo'], value['revisao'], ident if ident.startswith('storage:') else None)
        report(f"Leitura concluída: {sources[ident]['nome']} — {len(sources[ident]['frame'])} feições",len(sources),len(arquivos))
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
            geo._camadas[key] = source['frame']
            geo._metadados[key] = {'id':key,'nome':source['nome'],'tipo':'vetorial','crs':source['crs_arquivo'],'destino':'memoria_local'}
        params = dict(parametros)
        for key, value in params.items():
            if key in INPUT_KEYS:
                params[key] = temporary.get(value, value)
            elif key in {'camada_ids', 'raster_ids'}:
                params[key] = [temporary.get(item, item) for item in value]
        params['filtros_camadas'] = {temporary.get(key, key): value for key, value in params.get('filtros_camadas', {}).items()}
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


def consultar(arquivo, revisao, expressao, inverter_selecao=False, camada_id=None):
    """Consulta o snapshot atual do arquivo sem alterar o original."""
    from api.services.expressoes_atributos import selecionar
    source = abrir(arquivo, revisao, camada_id)
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


def salvar_edicoes(arquivo, camada_id, revisao, edicoes, excluidos, user):
    """Grava só atributos alterados e exclusões, indexados pelo FID original.

    Restrito a sessões de arquivo nativo do storage: não há recuo para a
    gravação da coleção GeoJSON completa (`salvar`).
    """
    from api.services import storage_geoespacial as storage, storage_pacotes
    from api.services.edicao_storage import gravar_incremental
    ident = camada_id or 'storage:' + arquivo
    if not ident.startswith('storage:'):
        raise ValueError('A edição incremental está disponível apenas para arquivos nativos do storage.')
    caminho, _ = storage.separar_id(ident)
    if caminho != arquivo:
        raise ValueError('O arquivo não corresponde à camada informada.')
    if any(caminho.lower().endswith(ext) for ext in storage_pacotes.COMPACTADOS):
        raise ValueError('Pacotes compactados não são editáveis: descompacte o arquivo no storage.')
    return gravar_incremental(ident, revisao, edicoes, excluidos, user)


def salvar_geometrias(arquivo, camada_id, revisao, edicoes, excluidos, novas, user):
    """Salva um lote de geometrias no arquivo nativo sem serializar a camada inteira."""
    from api.services import storage_geoespacial as storage, storage_pacotes
    from api.services.edicao_storage import gravar_geometrias
    ident = camada_id or 'storage:' + arquivo
    if not ident.startswith('storage:'):
        raise ValueError('A edição geométrica está disponível apenas para arquivos nativos do storage.')
    caminho, _ = storage.separar_id(ident)
    if caminho != arquivo:
        raise ValueError('O arquivo não corresponde à camada informada.')
    if any(caminho.lower().endswith(ext) for ext in storage_pacotes.COMPACTADOS):
        raise ValueError('Pacotes compactados não são editáveis: descompacte o arquivo no storage.')
    return gravar_geometrias(ident, revisao, edicoes, excluidos, novas, user)
