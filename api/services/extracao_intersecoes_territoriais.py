"""Vínculos observados entre feições de entrada e polígonos de risco/restrição.

O snapshot registra os pares e os atributos originais na data da extração.
Prévia cartográfica nunca participa do cálculo de interseção.
"""
import unicodedata


def tipo_categoria(codigo, nome=''):
    for value in (codigo, nome):
        normalized = ''.join(c for c in unicodedata.normalize('NFKD', str(value or '').lower()) if not unicodedata.combining(c))
        if normalized in ('risco', 'riscos'):
            return 'risco'
        if normalized in ('restricao', 'restricoes'):
            return 'restricao'
    return None


def registrar(entradas, categorias, progress=lambda message: None):
    from api.services import extracao_ogr as espacial
    from api.services.extracao_correspondencias import relacao
    import geopandas as gpd
    from api.repositories.camada_geoespacial_repository import _json_safe
    from api.services.extracao_atributos_enriquecimento import filtrar_entrada, _POS, _ID
    from api.services.extracao_atributos_estatisticas import _geometrias_trabalho
    from api.services.extracao_entrada_local import _representacao_mapa
    from api.services.extracao_atributos_regras import normalizar_entrada

    snapshot = {'versao':2, 'metodo':'OGR.Intersects', 'geoprocessamento':espacial.provenance(), 'entradas':[], 'bases':[], 'areas':{}}
    preparadas = []
    for category in categorias:
        tipo = tipo_categoria(category.get('id'), category.get('nome'))
        if not tipo:
            continue
        for index, base in enumerate(category['camadas']):
            progress(f"Identificando áreas de {category['nome']}: {base['nome']}")
            geometries, preparation = _geometrias_trabalho(base['frame'], base['nome'])
            mask = geometries.geom_type.isin(['Polygon', 'MultiPolygon'])
            polygons = geometries[mask]
            key = f"{category['id']}:{base.get('id', index)}"
            metadata = {'id':key, 'nome':base['nome'], 'categoria':tipo, 'conceito':category.get('conceito',''),
                        'preparacao':preparation, 'poligonos':len(polygons),
                        'cobertura_completa':bool(mask.all())}
            snapshot['bases'].append(metadata)
            preparadas.append((metadata, base['frame'], polygons, espacial.SpatialIndex(polygons)))

    for entry in entradas:
        progress(f"Relacionando {entry['nome']} às áreas de risco e restrição")
        frame, _ = filtrar_entrada(entry['frame'], normalizar_entrada(entry.get('config')), entry['nome'])
        geoms, prep = _geometrias_trabalho(frame, entry['nome'])
        preview, representation = _representacao_mapa(frame[[frame.geometry.name]], 40000)
        features = []
        for pos, (_, row) in enumerate(frame.iterrows()):
            geometry = geoms.iloc[pos]
            valid = geometry is not None and not geometry.is_empty
            feature = {'fid':int(row[_POS]), 'identificador':_json_safe(row[_ID]),
                       'atributos':_json_safe(row.drop([frame.geometry.name,_POS,_ID]).to_dict()),
                       'geometria':preview['features'][pos]['geometry'], 'geometria_disponivel':valid,
                       'areas':[], 'relacoes':{}, 'bases_intersectadas':[]}
            if valid:
                for base, source, polygons, spatial_index in preparadas:
                    candidates = sorted(int(polygons.index[int(i)]) for i in spatial_index.query(geometry, predicate='intersects'))
                    if candidates:
                        feature['bases_intersectadas'].append(base['id'])
                    for fid in candidates:
                        area_id = f"{base['id']}:{fid}"
                        feature['areas'].append(area_id)
                        feature['relacoes'][area_id] = relacao(geometry, polygons.loc[fid])
                        if area_id not in snapshot['areas']:
                            snapshot['areas'][area_id] = {'id':area_id, 'base_id':base['id'], 'base':base['nome'],
                                'categoria':base['categoria'], 'fid':fid,
                                'atributos':_json_safe(source.iloc[fid].drop(source.geometry.name).to_dict())}
            features.append(feature)
            if hasattr(progress, 'tarefa'):
                progress.tarefa(pos+1, len(frame))
        snapshot['entradas'].append({'nome':entry['nome'], 'id':entry.get('id'), 'feicoes':features,
                                     'preparacao':prep, 'representacao_mapa':representation})
    # Desenho dos polígonos encontrados, sem substituir as geometrias usadas acima.
    for base, source, polygons, _ in preparadas:
        areas = [a for a in snapshot['areas'].values() if a['base_id'] == base['id']]
        if not areas:
            continue
        selected = gpd.GeoDataFrame(geometry=polygons.loc[[a['fid'] for a in areas]], crs=polygons.crs)
        preview, representation = _representacao_mapa(selected, 40000)
        for area, drawing in zip(areas, preview['features']):
            area['geometria'] = drawing['geometry']
            area['representacao_mapa'] = representation['metodo']
    return snapshot
