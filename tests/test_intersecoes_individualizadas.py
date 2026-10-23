import math

import pytest
from osgeo import ogr, gdal

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


@pytest.mark.parametrize('legado', [True, False])
def test_painel_individualiza_arquivo_legado_e_novo_sem_perder_total(legado):
    from api.services import elegibilidade_relatorio as relatorio
    from tests.territorial_ogr_helpers import tabela
    geom = ogr.CreateGeometryFromWkt('MULTIPOLYGON (((5000000 7000000,5000002 7000000,5000002 7000002,5000000 7000002,5000000 7000000)), ((5000004 7000000,5000005 7000000,5000005 7000001,5000004 7000001,5000004 7000000)))')
    principal = nativo.Camada([nativo.campo('total', ogr.OFTReal)], [{'total': 5.}],
                             [geom.Clone()], nativo.referencia(5880))
    audit = {'versao_saida': 2, 'campo_area_total': 'total', 'camada_intersecoes': 'intersecoes',
             'campos': [{'id': 'base', 'papel': 'risco'}],
             'feicoes_base': [{'id': 'origem', 'base_id': 'base', 'posicao': 7}]}
    r = {'demanda_pos': 0, 'base_id': 'base', 'feicao_id': 'origem', 'area_m2': 5.}
    if legado:
        path = '/vsimem/teste-painel-legado.gpkg'
        ds = ogr.GetDriverByName('GPKG').CreateDataSource(path)
        camada = nativo.Camada([nativo.campo('demanda_pos', ogr.OFTInteger64),
                               nativo.campo('base_id', ogr.OFTString), nativo.campo('feicao_id', ogr.OFTString),
                               nativo.campo('area_m2', ogr.OFTReal)], [r], [geom], nativo.referencia(5880))
        layer = nativo.gravar_camada(ds, 'intersecoes', camada)
        layer = ds = None
        dados = bytes(gdal.VSIGetMemFileBuffer_unsafe(path))
        gdal.Unlink(path)
    else:
        dados = service.serializar(principal, audit, [{**r, 'geometry': geom}], 'teste.gpkg')['teste.gpkg']
    linhas = [{'areas': [5.]}]
    painel = relatorio._painel(tabela(principal), dados, audit, {'origem': 'Base original'}, linhas)
    partes = linhas[0]['poligonos_sobreposicao']
    assert [p['area_m2'] for p in partes] == [4., 1.]
    assert [p['percentual'] for p in partes] == [80., 20.]
    assert len({p['id'] for p in partes}) == 2
    assert all(p['feicao_origem_id'] == 'origem' and p['identificador'] == 8 for p in partes)
    features = painel['poligonos_intersecoes']['features']
    assert [f['geometry']['type'] for f in features] == ['Polygon', 'Polygon']
    assert [f['properties']['poligono_id'] for f in features] == [p['id'] for p in partes]
    assert linhas[0]['sobreposicoes'][0]['area_m2'] == 5.
