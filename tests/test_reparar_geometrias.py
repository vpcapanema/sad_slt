"""Reparo de geometrias: cada opção atua e a saída serve à extração."""
import asyncio

import geopandas as gpd
import pytest
from shapely.geometry import MultiPolygon, Polygon

from api.services.extracao_atributos_analise import prepare
from api.services.geoespacial_service import geoespacial_service as geo


def reparar(frame, marca, **opcoes):
    chave = f'teste_reparo_{marca}'
    geo._camadas[chave] = frame.copy()
    try:
        r = asyncio.run(geo.reparar_geometrias(chave, **opcoes))
        return geo._camadas[r['camada_id']], r
    finally:
        geo._camadas.pop(chave, None)


def gaveta(geometrias):
    return gpd.GeoDataFrame({'id': list(range(len(geometrias)))}, geometry=geometrias, crs=4674)


def test_saida_do_reparo_e_aceita_pela_extracao():
    # Anel degenerado faz make_valid devolver GeometryCollection, que a extração
    # recusa. O reparo tem que manter só a dimensão da camada, como um SIG.
    laco = Polygon([(0, 0), (2, 2), (2, 0), (0, 2)])            # auto-interseção
    degenerado = Polygon([(5, 5), (6, 5), (6, 6), (5, 5)]).union(
        Polygon([(9, 9), (9, 9), (9, 9), (9, 9)]))
    saida, resultado = reparar(gaveta([laco, degenerado]), 'extracao')
    assert resultado['invalidas_restantes'] == 0
    assert not {g.geom_type for g in saida.geometry} - {'Polygon', 'MultiPolygon'}
    pronto, dimensao = prepare(saida, 'reparada')
    assert dimensao == 2 and len(pronto) == 2


def test_o_reparo_nao_simplifica():
    # Simplificar é outra operação (OP-31); reparar preserva os vértices.
    detalhado = Polygon([(0, 0), (0.4, 0.001), (1, 0), (1, 1), (0, 1)])
    saida, _ = reparar(gaveta([detalhado]), 'simplifica')
    assert len(saida.geometry.iloc[0].exterior.coords) == len(detalhado.exterior.coords)


def test_cada_opcao_declarada_atua():
    horario = Polygon([(0, 0), (0, 1), (1, 1), (1, 0)])
    repetido = Polygon([(0, 0), (0, 0), (1, 0), (1, 1), (0, 0)])
    degenerado = MultiPolygon([Polygon([(0, 0), (2, 0), (2, 2), (0, 0)]),
                               Polygon([(5, 5), (5, 5), (5, 5), (5, 5)])])
    amostra = gaveta([horario, repetido, degenerado])
    for opcao, chave in [('corrigir_orientacao_aneis', 'orientacao'),
                         ('corrigir_repeticao_pontos', 'repetidos'),
                         ('corrigir_geometrias_degeneradas', 'degeneradas')]:
        _, ligada = reparar(amostra, f'on_{chave}', **{opcao: True})
        _, desligada = reparar(amostra, f'off_{chave}', **{opcao: False})
        assert ligada['detalhes'][chave] > 0, opcao
        assert desligada['detalhes'][chave] == 0, opcao


def test_preservar_original_quando_o_reparo_falha():
    vazio = gaveta([Polygon([(0, 0), (0, 0), (0, 0), (0, 0)])])
    com, _ = reparar(vazio, 'preserva_on', corrigir_geometrias_degeneradas=True,
                     manter_geometria_original_falha=True)
    sem, _ = reparar(vazio, 'preserva_off', corrigir_geometrias_degeneradas=True,
                     manter_geometria_original_falha=False)
    assert com.geometry.iloc[0] is not None
    assert sem.geometry.iloc[0] is None


def test_auto_intersecao_mantem_as_duas_partes():
    # buffer(0) descarta um dos lobes da gravata; make_valid mantem os dois,
    # que e o que um SIG faz. Cada lobe tem area 1.
    laco = Polygon([(0, 0), (2, 2), (2, 0), (0, 2)])
    saida, _ = reparar(gaveta([laco]), 'area')
    reparada = saida.geometry.iloc[0]
    assert reparada.is_valid and reparada.geom_type == 'MultiPolygon'
    assert reparada.area == pytest.approx(2.0, rel=1e-9)
