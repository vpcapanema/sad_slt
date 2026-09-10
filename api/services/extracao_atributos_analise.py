"""Extração por GDAL/OGR e estatísticas da extensão única da demanda."""
from __future__ import annotations

import json
from collections import defaultdict

import geopandas as gpd
import pandas as pd
import numpy as np
from shapely.geometry import GeometryCollection
from shapely.ops import unary_union

from api.repositories.camada_geoespacial_repository import _json_safe
from api.services.geoespacial_service import _overlay_ogr

DIMENSIONS = {'Point':0,'MultiPoint':0,'LineString':1,'MultiLineString':1,'Polygon':2,'MultiPolygon':2}
METHODOLOGY = (
    'Interseção e medidas planimétricas em SIRGAS 2000 / Brazil Polyconic (EPSG:5880), '
    'projeção métrica nacional; as medidas estão sujeitas às distorções dessa projeção. O denominador é a união '
    'geométrica da entrada, sem duplicar sobreposições internas. Totais por camada, '
    'categoria e geral usam união geométrica; não some percentuais entre grupos. '
    'Estatísticas: extensão atingida por feição da entrada, incluindo zeros; '
    'desvio padrão populacional e quartis por interpolação linear (NumPy). '
    'Para pontos, cada ponto de uma multiparte é uma observação; contato com o limite '
    'é contado como dentro. Contatos sem área/comprimento aplicável são descartados. '
    'Interseção indica relação espacial, não determina impacto positivo ou negativo.'
)


def prepare(frame, name):
    if frame.crs is None:
        raise ValueError(f'{name}: defina o CRS na bancada antes da extração.')
    if frame.empty or frame.geometry.isna().any() or frame.geometry.is_empty.any():
        raise ValueError(f'{name}: camada vazia ou com geometria nula/vazia. Valide na bancada.')
    if not frame.geometry.is_valid.all():
        raise ValueError(f'{name}: há geometrias inválidas. Repare na bancada antes de executar.')
    dimensions = {DIMENSIONS.get(t) for t in frame.geom_type}
    if None in dimensions or len(dimensions) != 1:
        raise ValueError(f'{name}: use uma camada de pontos, linhas ou polígonos de dimensão homogênea.')
    return frame.to_crs(4674).reset_index(drop=True), dimensions.pop()


def measure(geometry, dimension):
    if geometry is None or geometry.is_empty:
        return 0.0
    if hasattr(geometry, 'geoms'):
        return sum(measure(g, dimension) for g in geometry.geoms)
    if DIMENSIONS.get(geometry.geom_type) != dimension:
        return 0.0
    if dimension == 0:
        return 1.0
    if dimension == 1:
        return float(geometry.length)
    return float(geometry.area)


def union(geometries):
    return unary_union(geometries) if geometries else GeometryCollection()


def aggregate(geometries, by_input, source, dimension, denominator, occurrences):
    values = [measure(union(by_input.get(str(i), [])),dimension) for i in range(len(source))]
    if dimension == 0:
        inside = sum(v > 0 for v in values)
        summary = {'ocorrencias':occurrences,'pontos_dentro':inside,'percentual':100*inside/len(source)}
        return summary, {'pontos_dentro':inside,'pontos_fora':len(source)-inside}
    unique = measure(union(geometries),dimension)
    percent = 100*unique/denominator
    if percent > 100.00001:
        raise ValueError('Extensão calculada excede a entrada; confira o CRS e as geometrias.')
    summary = {'ocorrencias':occurrences,'medida_unica_si':unique,'percentual':min(100,percent)}
    stats = dict(zip(['media','mediana','minimo','maximo','desvio_padrao','q1','q3'],map(float,
        [np.mean(values),np.median(values),np.min(values),np.max(values),np.std(values),*np.quantile(values,[.25,.75])])) )
    return summary, {'n':len(values),**stats}


OPCOES_PADRAO = {'promover_multipartes': True, 'manter_dimensoes_menores': False,
                 'ignorar_falhas': False, 'geometrias_preparadas': True,
                 'pretestar_continencia': False}


def analisar(input_frame, categories, operation='intersection', progress=lambda message: None,
             opcoes=None):
    """categories: [{id,nome,conceito,camadas:[{id,nome,frame}]}], sem mocks."""
    opcoes = {**OPCOES_PADRAO, **(opcoes or {})}
    # O rotulo do seletor manda no operador do OGR: Identity chama Identity.
    operador = 'identity' if operation == 'identity' else 'intersection'
    source, dimension = prepare(input_frame,'Entrada')
    source = source.to_crs(5880)
    if dimension == 0:
        source = source.explode(index_parts=False).reset_index(drop=True)
    input_properties = [_json_safe(dict(row.drop(source.geometry.name))) for _,row in source.iterrows()]
    left = gpd.GeoDataFrame({'ea_input':[str(i) for i in range(len(source))]},geometry=source.geometry,crs=5880)
    denominator = len(source) if dimension == 0 else measure(union(list(source.geometry)),dimension)
    if denominator <= 0:
        raise ValueError('A entrada não possui medida positiva para a sua dimensão.')
    output, output_geometries, results = [], [], []
    all_geometries, all_by_input = [], defaultdict(list)
    base_geometries = []
    total_occurrences = hit_layers = 0
    for category in categories:
        category_geometries, category_by_input = [], defaultdict(list)
        layers, category_occurrences = [], 0
        for base in category['camadas']:
            progress(f"Interseção: {category['nome']} / {base['nome']}")
            frame, _ = prepare(base['frame'],base['nome'])
            frame = frame.to_crs(5880)
            properties = [_json_safe(dict(row.drop(frame.geometry.name))) for _,row in frame.iterrows()]
            right = gpd.GeoDataFrame({'ea_base':[str(i) for i in range(len(frame))]},geometry=frame.geometry,crs=5880)
            intersection = _overlay_ogr(left,right,operador,**opcoes)
            geometries, by_input, occurrences = [], defaultdict(list), []
            base_geometries.extend(frame.geometry)
            for _,feature in intersection.iterrows():
                # Identity tambem devolve o que ficou fora desta base. Essa parte
                # nao e ocorrencia da camada; o exterior real sai da passagem
                # unica contra a uniao de todas as bases, mais abaixo.
                # O OGR devolve ea_base como NaN nessas linhas, nao como vazio.
                if pd.isna(feature['ea_base']) or feature['ea_base'] == '':
                    continue
                geom = feature.geometry
                size = measure(geom,dimension)
                if size <= 0:
                    continue
                input_id, base_id = str(feature['ea_input']),str(feature['ea_base'])
                occurrence = {'input_id':input_id,'feicao_base_id':base_id,'dimensao':dimension,
                              'atributos':properties[int(base_id)],'atributos_input':input_properties[int(input_id)]}
                if dimension == 0:
                    occurrence['dentro'] = True
                else:
                    occurrence.update(medida_si=size,percentual=100*size/denominator)
                occurrences.append(occurrence)
                geometries.append(geom); by_input[input_id].append(geom)
                output.append({'categoria_id':category['id'],'categoria':category['nome'],
                               'camada_base_id':base['id'],'camada_base':base['nome'],**occurrence})
                output_geometries.append(geom)
            if dimension == 0:
                occurrences.extend({'input_id':str(i),'feicao_base_id':None,'dimensao':0,'dentro':False,
                                    'atributos':{},'atributos_input':input_properties[i]}
                                   for i in range(len(source)) if str(i) not in by_input)
            hit_count = len(geometries)
            summary, stats = aggregate(geometries,by_input,source,dimension,denominator,hit_count)
            layers.append({'id':base['id'],'nome':base['nome'],'resumo':summary,'estatisticas':stats,'ocorrencias':occurrences})
            category_geometries.extend(geometries)
            for key,values in by_input.items(): category_by_input[key].extend(values)
            category_occurrences += hit_count
            hit_layers += bool(hit_count)
        summary,stats = aggregate(category_geometries,category_by_input,source,dimension,denominator,category_occurrences)
        results.append({k:category[k] for k in ['id','nome','conceito']} | {'resumo':summary,'estatisticas':stats,'camadas':layers})
        all_geometries.extend(category_geometries)
        for key,values in category_by_input.items(): all_by_input[key].extend(values)
        total_occurrences += category_occurrences
    if operation == 'identity':
        # Exterior calculado uma única vez contra a união de todas as bases.
        mask = gpd.GeoDataFrame(geometry=[union(base_geometries)],crs=5880)
        external = _overlay_ogr(left,mask,'difference',**opcoes)
        for _,feature in external.iterrows():
            if measure(feature.geometry,dimension)>0:
                output.append({'input_id':str(feature['ea_input']),'externo':True,
                               'atributos_input':input_properties[int(feature['ea_input'])],'atributos':{}})
                output_geometries.append(feature.geometry)
    summary,_ = aggregate(all_geometries,all_by_input,source,dimension,denominator,total_occurrences)
    result = {'dimensao_input':dimension,'medida_total_input_si':denominator,'operacao':operation,
              'resumo':{**summary,'camadas_intersectadas':hit_layers},'categorias':results,
              'metodologia_estatistica':METHODOLOGY,'motor':'GDAL/OGR',
              'convencao_ids':'Índice de ordem da feição, começando em zero; pontos multipartes são individualizados.'}
    frame = gpd.GeoDataFrame(output,geometry=output_geometries,crs=5880)
    # As colunas booleanas nascem esparsas: só as linhas externas trazem
    # `externo` e só as de ponto trazem `dentro`. Em dtype object com NaN o
    # GDAL grava a coluna como texto e a releitura devolve "True"; a conferência
    # de integridade da gravação reprovava e derrubava toda extração identity.
    for coluna in ('externo','dentro'):
        if coluna in frame.columns:
            frame[coluna] = frame[coluna].fillna(False).astype(bool)
    result['geojson'] = json.loads(frame.to_crs(4326).to_json(default=str))
    return result, frame
