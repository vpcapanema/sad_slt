"""Regressões isoladas: sem conexão, arquivos oficiais ou execução de jobs."""
import geopandas as gpd
import pytest
from shapely.geometry import Point
from api.services import extracao_lote


def test_finalidade_rejeita_campos_que_sumiram(monkeypatch):
    from api.services import extracao_atributos_estatisticas as motor
    def join(**kwargs):
        frame = gpd.GeoDataFrame({'nome': ['A'], 'sicard_esquema': ['{}']}, geometry=[Point(0, 0)], crs=4326)
        return {'camadas': {'pontos': frame}, 'dicionario': [],
                'relatorio': {'camadas': {}, 'validacao': {'aprovada': True}}}
    monkeypatch.setattr(motor, 'enriquecer', join)
    entry = {'nome': 'Entrada', 'chave': 'entrada_1', 'config': {}, 'frame': [1]}
    with pytest.raises(ValueError, match='Ambiental: campos indisponíveis.*risco_grau'):
        extracao_lote.executar([entry], [], 'estatisticas', lambda _: None,
                              [{'nome': 'Ambiental', 'campos': ['nome', 'risco_grau']}])


def test_finalidade_aceita_campos_distribuidos_em_lote_heterogeneo(monkeypatch):
    from api.services import extracao_atributos_estatisticas as motor
    def join(**kwargs):
        campo = kwargs['entradas'][0]['nome']
        frame = gpd.GeoDataFrame({campo: ['A'], 'sicard_esquema': ['{}']}, geometry=[Point(0, 0)], crs=4326)
        return {'camadas': {'pontos': frame}, 'dicionario': [],
                'relatorio': {'camadas': {}, 'validacao': {'aprovada': True}}}
    monkeypatch.setattr(motor, 'enriquecer', join)
    entries = [{'nome': nome, 'chave': f'entrada_{i}', 'config': {}, 'frame': [1]}
               for i, nome in enumerate(['rodovia', 'ferrovia'], 1)]
    result = extracao_lote.executar(entries, [], 'estatisticas', lambda _: None,
                                   [{'nome': 'Transportes', 'campos': ['rodovia', 'ferrovia']}])
    tables = result['finalidades']['finalidade_1']['camadas']
    assert len(tables) == 2
    assert list(tables['entrada_1_pontos'].columns) == ['rodovia', 'geometry']
    assert list(tables['entrada_2_pontos'].columns) == ['ferrovia', 'geometry']
