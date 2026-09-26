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
    """Compatibilidade dos demais algoritmos; enriquecimentos entregam seu snapshot.

    A álgebra espacial é integralmente OGR.Layer.Intersection, em lote.
    """
    from api.services import extracao_ogr as espacial
    from api.services.extracao_atributos_enriquecimento import filtrar_entrada, _POS, _FID
    from api.services.extracao_atributos_estatisticas import _geometrias_trabalho
    from api.services.extracao_atributos_regras import normalizar_entrada
    collector = CorrespondenciasTerritoriais(entradas)
    for category in categorias:
        if not tipo_categoria(category.get('id'), category.get('nome')): continue
        for base in category['camadas']:
            geoms, prep = _geometrias_trabalho(base['frame'], base['nome'])
            work = base['frame'].reset_index(drop=True).set_geometry(geoms).set_crs(5880, allow_override=True)
            work[_FID] = range(len(work))
            key = collector.base(category, base, work, prep)
            polygons = work[work.geometry.geom_type.isin(['Polygon', 'MultiPolygon'])]
            overlay = espacial.LayerOverlay(polygons.geometry)
            try:
                for entry in entradas:
                    frame, _ = filtrar_entrada(entry['frame'], normalizar_entrada(entry.get('config')), entry['nome'])
                    geometries, _ = _geometrias_trabalho(frame, entry['nome'])
                    for left, right, common in overlay.records(geometries):
                        collector.adicionar(key, {'camada_origem':entry['nome'], 'fid_origem':int(frame.iloc[left][_POS])},
                                             int(polygons.iloc[right][_FID]), common)
            finally:
                overlay.close()
    return collector.snapshot()


class CorrespondenciasTerritoriais:
    """Monta o painel usando os pares já produzidos pelo overlay do enriquecimento.

    Não executa buscas espaciais. Fragmentos repetidos são reunidos pelo OGR
    antes de medir a relação com a demanda original, evitando somar duplicatas.
    """
    def __init__(self, entradas):
        self.entradas = entradas
        self.bases = {}
        self.pares = {}

    def base(self, categoria, camada, frame, preparacao):
        from api.services.extracao_atributos_enriquecimento import _FID
        tipo = tipo_categoria(categoria.get('id'), categoria.get('nome'))
        if not tipo:
            return None
        key = f"{categoria.get('id', tipo)}:{camada.get('id', camada['nome'])}"
        mascara = frame.geometry.geom_type.isin(['Polygon', 'MultiPolygon'])
        regra = camada.get('regra', {})
        completo = bool(mascara.all()) and regra.get('ligacao', 'localizacao') != 'atributo' and regra.get('predicado', 'intersecta') == 'intersecta'
        info = self.bases.setdefault(key, {'id':key, 'nome':camada['nome'], 'categoria':tipo,
            'conceito':categoria.get('conceito', ''), 'preparacao':preparacao,
            'poligonos':0, 'cobertura_completa':True, '_feicoes':{}})
        info['cobertura_completa'] &= completo
        for pos in range(len(frame)):
            if not mascara.iloc[pos]: continue
            row = frame.iloc[pos]
            fid = int(row[_FID]) if _FID in frame else pos
            info['_feicoes'][fid] = (row.drop([frame.geometry.name, _FID], errors='ignore').to_dict(), row[frame.geometry.name])
        info['poligonos'] = len(info['_feicoes'])
        return key

    def adicionar(self, base_id, registro, fid, comum):
        if base_id is None or fid not in self.bases[base_id]['_feicoes'] or comum is None or comum.is_empty:
            return
        key = (registro['camada_origem'], int(registro['fid_origem']), base_id, int(fid))
        self.pares.setdefault(key, {})[comum.wkb] = comum

    def snapshot(self):
        from api.services import extracao_ogr as espacial
        from api.services.extracao_correspondencias import relacao
        from api.services.extracao_atributos_enriquecimento import filtrar_entrada, _POS, _ID
        from api.services.extracao_atributos_estatisticas import _geometrias_trabalho
        from api.services.extracao_atributos_regras import normalizar_entrada
        from api.services.extracao_entrada_local import _representacao_mapa
        from api.repositories.camada_geoespacial_repository import _json_safe
        import geopandas as gpd
        snapshot = {'versao':2, 'metodo':'OGR.Layer.Intersection/Identity (pares reutilizados)',
            'geoprocessamento':espacial.provenance(), 'entradas':[],
            'bases':[{k:v for k,v in b.items() if k != '_feicoes'} for b in self.bases.values()], 'areas':{}}
        por_demanda = {}
        for (nome, fid, base_id, base_fid), geoms in self.pares.items():
            por_demanda.setdefault((nome, fid), []).append((base_id, base_fid, geoms))
        for entry in self.entradas:
            frame, _ = filtrar_entrada(entry['frame'], normalizar_entrada(entry.get('config')), entry['nome'])
            geoms, prep = _geometrias_trabalho(frame, entry['nome'])
            preview, representation = _representacao_mapa(frame[[frame.geometry.name]], 40000)
            features = []
            for pos, (_, row) in enumerate(frame.iterrows()):
                geom, fid = geoms.iloc[pos], int(row[_POS])
                feature = {'fid':fid, 'identificador':_json_safe(row[_ID]),
                    'atributos':_json_safe(row.drop([frame.geometry.name, _POS, _ID]).to_dict()),
                    'geometria':preview['features'][pos]['geometry'],
                    'geometria_disponivel':geom is not None and not geom.is_empty,
                    'areas':[], 'relacoes':{}, 'bases_intersectadas':[]}
                for base_id, base_fid, fragments in por_demanda.get((entry['nome'], fid), []):
                    base = self.bases[base_id]
                    atributos, area = base['_feicoes'][base_fid]
                    area_id = f'{base_id}:{base_fid}'
                    # União da biblioteca, apenas para consolidar fragmentos da mesma demanda.
                    common = None
                    for piece in fragments.values():
                        common = piece if common is None else espacial.operation('Union', common, piece)
                    feature['areas'].append(area_id)
                    feature['relacoes'][area_id] = relacao(geom, area, comum=common)
                    if base_id not in feature['bases_intersectadas']: feature['bases_intersectadas'].append(base_id)
                    if area_id not in snapshot['areas']:
                        snapshot['areas'][area_id] = {'id':area_id, 'base_id':base_id, 'base':base['nome'],
                            'categoria':base['categoria'], 'fid':base_fid, 'atributos':_json_safe(atributos)}
                features.append(feature)
            snapshot['entradas'].append({'nome':entry['nome'], 'id':entry.get('id'), 'feicoes':features,
                'preparacao':prep, 'representacao_mapa':representation})
        for base_id, base in self.bases.items():
            areas = [a for a in snapshot['areas'].values() if a['base_id'] == base_id]
            if not areas: continue
            frame = gpd.GeoDataFrame(geometry=[base['_feicoes'][a['fid']][1] for a in areas], crs=5880)
            preview, representation = _representacao_mapa(frame, 40000)
            for area, drawing in zip(areas, preview['features']):
                area.update(geometria=drawing['geometry'], representacao_mapa=representation['metodo'])
        return snapshot
