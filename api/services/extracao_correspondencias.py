"""Evidência descritiva de correspondências; não interpreta risco nem distribui valores."""
import json
from api.services import extracao_ogr as espacial
from api.repositories.camada_geoespacial_repository import _json_safe


def serializar(valor):
    return json.dumps(_json_safe(valor), ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def valores_distintos(valores):
    saida, vistos = [], set()
    for valor in valores:
        valor = _json_safe(valor)
        chave = serializar(valor)
        if chave not in vistos:
            vistos.add(chave)
            saida.append(valor)
    return serializar(saida)


def relacao(a, b, demanda_original=None, comum=None):
    """Operação depende das duas representações; medidas no CRS métrico de trabalho.

    Percentual é geométrico por par, nunca peso automático para atributos. Pares
    sobrepostos não podem ter seus percentuais somados. Pontos não ganham buffer.
    """
    if a is None or b is None or a.is_empty or b.is_empty:
        return {'tipo': 'nao_avaliado', 'area_m2': None, 'comprimento_m': None,
                'situacao': 'nao_avaliado', 'percentual_entrada': None}
    demanda = a if demanda_original is None else demanda_original
    comum = espacial.intersection(a, b) if comum is None else comum
    da, db = int(espacial.dimension(a)), int(espacial.dimension(b))
    dim = min(da, db)
    tipo = ('sem_intersecao' if comum.is_empty else 'contato_borda' if espacial.predicate(a, b, 'touches')
            else 'cruzamento_pontual' if dim > 0 and espacial.dimension(comum) == 0
            else 'intersecao_interior')
    nomes = {0:'ponto', 1:'linha', 2:'poligono'}
    saida = {'tipo': tipo, 'situacao': tipo,
             'representacao_entrada': nomes[da], 'representacao_base': nomes[db],
             'area_m2': float(espacial.area(comum)) if dim == 2 else None,
             'comprimento_m': float(espacial.length(comum)) if dim == 1 else None,
             'comprimento_interior_m': None, 'comprimento_borda_m': None,
             'percentual_entrada': None, 'referencia_percentual': 'demanda_original'}
    if a.geom_type == 'GeometryCollection' or b.geom_type == 'GeometryCollection':
        saida['situacao'] = 'intersecao_mista' if not comum.is_empty else tipo
        if a.geom_type == 'GeometryCollection': saida['representacao_entrada'] = 'mista'
        if b.geom_type == 'GeometryCollection': saida['representacao_base'] = 'mista'
        return saida
    if comum.is_empty:
        return saida
    if da == 0:
        saida['situacao'] = ('pontos_coincidentes' if db == 0 else
            ('ponto_na_extremidade' if tipo == 'contato_borda' else 'ponto_sobre_linha') if db == 1 else
            'ponto_na_borda' if tipo == 'contato_borda' else 'ponto_no_interior')
    elif db == 0:
        saida['situacao'] = ('ponto_base_na_borda' if tipo == 'contato_borda' else 'ponto_base_no_interior')
    elif da == 2 and db == 2:
        saida['situacao'] = ('sobreposicao_area' if espacial.area(comum) > 0 else
                             'contato_linear' if espacial.length(comum) > 0 else 'contato_pontual')
        saida['percentual_entrada'] = min(100., 100.*espacial.area(comum)/espacial.area(demanda)) if espacial.area(demanda) else None
    elif {da, db} == {1, 2}:
        linha, poligono = (a, b) if da == 1 else (b, a)
        borda = espacial.length(espacial.intersection(linha, espacial.boundary(poligono)))
        interior = espacial.length(espacial.difference(comum, espacial.boundary(poligono)))
        saida.update(comprimento_borda_m=borda, comprimento_interior_m=interior)
        saida['situacao'] = ('trechos_interior_e_borda' if borda > 0 and interior > 0 else
                             'trecho_no_interior' if interior > 0 else
                             'trecho_na_borda' if borda > 0 else 'contato_pontual')
        # Polígono de demanda com base linear não tem percentual de área ocupado.
        if da == 1 and espacial.length(demanda):
            saida['percentual_entrada'] = min(100., 100.*espacial.length(comum)/espacial.length(demanda))
    else:  # linha × linha: coincidência por extensão ou encontro pontual
        saida['situacao'] = ('trecho_coincidente' if espacial.length(comum) > 0 else
                             'contato_pontual' if tipo == 'contato_borda' else 'cruzamento_pontual')
        if espacial.length(demanda): saida['percentual_entrada'] = min(100., 100.*espacial.length(comum)/espacial.length(demanda))
    return saida


def registro(base, pos, geometria, fid=None, espacial=True, demanda_original=None, comum=None):
    linha = base.iloc[pos]
    detalhes = {}
    if espacial and geometria is not None:
        from api.services import extracao_ogr as geo
        import geopandas as gpd
        geom_base = linha[base.geometry.name]
        comum = geo.intersection(geometria, geom_base) if comum is None else comum
        # Evidência geométrica do par, preservada na saída; nenhuma nova busca no painel.
        detalhes['geometria_medida'] = comum.wkb_hex if comum is not None else None
        original = geometria if demanda_original is None else demanda_original
        detalhes['demanda_medida'] = original.wkb_hex
        cache = base.attrs.setdefault('_sicard_mapa', {})
        if pos not in cache:
            mapa = geo.reproject(gpd.GeoDataFrame(geometry=[geom_base],crs=base.crs),4674,'Base relacionada')
            cache[pos] = json.loads(mapa.to_json())['features'][0]['geometry']
        detalhes['geometria_base'] = cache[pos]
    return {**detalhes, 'fid_base': int(pos if fid is None else fid),
            'atributos': _json_safe(linha.drop([base.geometry.name, '__ea_fid'], errors='ignore').to_dict()),
            **(relacao(geometria, linha[base.geometry.name], demanda_original, comum=comum) if espacial else
               {'tipo': 'chave_atributo', 'area_m2': None, 'comprimento_m': None})}
