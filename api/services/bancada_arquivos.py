"""Sessão de arquivo da bancada: validação e nova versão com rastreabilidade."""
import asyncio
from uuid import uuid4

import geopandas as gpd
from osgeo import ogr

from api.services import ciclo_vida_arquivos as ciclo
from api.services.visualizacao_arquivo import ler_arquivo
from api.services.geoespacial_service import geoespacial_service as geo


def abrir(arquivo, revisao=None):
    source = ler_arquivo(arquivo)
    if revisao is not None and source['revisao'] != revisao:
        raise ValueError('O arquivo mudou desde a abertura. Reabra antes de salvar ou executar.')
    return source


def frame_editado(source, data):
    import json
    if data.get('type') != 'FeatureCollection' or not data.get('features'):
        raise ValueError('A versão deve conter ao menos uma feição.')
    fields = {field['nome']: field['tipo'] for field in source['campos']}
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
            if kind in {'Integer', 'Integer64'} and (not isinstance(value, int) or isinstance(value, bool)):
                raise ValueError(f'O campo {name} exige um número inteiro.')
            if kind == 'Real' and (not isinstance(value, (int, float)) or isinstance(value, bool)):
                raise ValueError(f'O campo {name} exige um número.')
            if kind == 'String' and not isinstance(value, str):
                raise ValueError(f'O campo {name} exige texto.')
        geometry = ogr.CreateGeometryFromJson(json.dumps(feature.get('geometry'), allow_nan=False))
        if geometry is None or geometry.IsEmpty() or not geometry.IsValid():
            raise ValueError('Existe geometria vazia ou inválida. Corrija antes de salvar.')
    frame = gpd.GeoDataFrame.from_features(data['features'], crs=4326)
    if not frame.geometry.is_valid.all():
        raise ValueError('Existem geometrias inválidas.')
    west, south, east, north = frame.total_bounds
    if not (-180 <= west <= east <= 180 and -90 <= south <= north <= 90):
        raise ValueError('As coordenadas de edição devem estar em longitude/latitude.')
    return frame.to_crs(source['crs_arquivo'])


def salvar(arquivo, revisao, data, nome, user):
    source = abrir(arquivo, revisao)
    frame = frame_editado(source, data)
    params = {'camada_id': source['id'], 'arquivo': arquivo, 'revisao': revisao,
              'fids_origem': [f['id'] for f in data['features']]}
    ident = ciclo.iniciar('edicao_arquivo_bancada', params, str(user.id))
    token = ciclo.execucao_atual.set(ident)
    try:
        output = geo.registrar_camada(frame, nome, 'processamento', linhagem=params)
        path = geo._metadados[output]['caminho_arquivo']
        ciclo.finalizar(ident)
        return {**ler_arquivo(path), 'execucao_id': ident}
    except Exception as exc:
        ciclo.finalizar(ident, erro=str(exc))
        raise
    finally:
        ciclo.execucao_atual.reset(token)


def executar(operacao, parametros, arquivos, user):
    from api.services.geoprocessamento_jobs import _input_references, INPUT_KEYS
    from api.services.geoprocessamento_engine import geoprocessamento_engine
    references = _input_references(parametros)
    if not references or set(references) != set(arquivos):
        raise ValueError('Abra no storage todos os arquivos de entrada desta operação.')
    if parametros.get('processar_sobre') == 'selecionadas':
        raise ValueError('Salve a seleção como camada antes de executar sobre parte do arquivo.')
    sources = {ident: abrir(value['arquivo'], value['revisao']) for ident, value in arquivos.items()}
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
        params = dict(parametros)
        for key, value in params.items():
            if key in INPUT_KEYS:
                params[key] = temporary.get(value, value)
            elif key in {'camada_ids', 'raster_ids'}:
                params[key] = [temporary.get(item, item) for item in value]
        result = asyncio.run(geoprocessamento_engine.execute(operacao, params))
        ciclo.finalizar(execution)
        result_id = result.get('camada_id')
        metadata = geo._metadados.get(result_id) or {}
        path = metadata.get('caminho_arquivo')
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
