import math

import pytest
from osgeo import ogr

from api.services import analise_territorial_ogr as nativo
from api.services import elegibilidade_processamento as service


@pytest.mark.parametrize('analise', ['elegibilidade', 'favorabilidade'])
def test_singleparts_preservam_buracos_vinculos_atributos_e_totais(analise):
    geom = ogr.CreateGeometryFromWkt(
        'MULTIPOLYGON (((0 0,10 0,10 10,0 10,0 0),(2 2,2 4,4 4,4 2,2 2)), '
        '((20 0,25 0,25 10,20 10,20 0)))')
    original = bytes(geom.ExportToWkb())
    saida = nativo.Camada([nativo.campo('total', ogr.OFTReal)], [{'total': 200.}],
                         [geom.Clone()], nativo.referencia(5880))
    saida.campos_intersecoes = [nativo.campo('indice_base', ogr.OFTReal)]
    recortes = [{'demanda_pos': 0, 'base_id': 'base', 'feicao_id': 'base::feicao:7',
                 'area_m2': 146., 'geometry': geom, 'indice_base': 0.7}]
    dados = service.serializar(saida, {'campo_area_total': 'total'}, recortes, 'teste.gpkg', analise=analise)['teste.gpkg']
    camada = nativo.ler(dados, 'intersecoes')
    assert len(camada) == 2
    assert [g.GetGeometryName() for g in camada.geometrias] == ['POLYGON', 'POLYGON']
    assert camada.geometrias[0].GetGeometryCount() == 2  # O buraco permanece no polígono.
    assert [r['intersecao_id'] for r in camada.registros] == [1, 2]
    assert [r['area_m2'] for r in camada.registros] == [96., 50.]
    assert [r['percentual_demanda'] for r in camada.registros] == [48., 25.]
    assert math.fsum(r['area_ha'] for r in camada.registros) == pytest.approx(.0146)
    for r in camada.registros:
        assert (r['demanda_pos'], r['base_id'], r['feicao_id'], r['indice_base']) == (0, 'base', 'base::feicao:7', .7)
    principal = nativo.ler(dados, service.ANALISES[analise]['camada'])
    nativo.conferir(saida, principal)
    assert bytes(geom.ExportToWkb()) == original
    assert len(recortes) == 1


def test_colecao_preserva_contato_sem_area_e_rejeita_area_divergente():
    geom = ogr.CreateGeometryFromWkt('GEOMETRYCOLLECTION (POLYGON ((0 0,1 0,1 1,0 1,0 0)), LINESTRING (3 0,3 1), POINT (5 5))')
    registro = {'demanda_pos': 0, 'area_m2': 1., 'geometry': geom}
    partes = service.individualizar_intersecoes([registro], [10.])
    assert [r['geometry'].GetGeometryName() for r in partes] == ['POLYGON', 'LINESTRING', 'POINT']
    assert [r['area_m2'] for r in partes] == [1., 0., 0.]
    with pytest.raises(ValueError, match='alterou a área'):
        service.individualizar_intersecoes([{**registro, 'area_m2': 2.}], [10.])
