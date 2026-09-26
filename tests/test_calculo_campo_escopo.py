from types import SimpleNamespace

import geopandas as gpd
import pytest
from shapely.geometry import Point

from api.services.calculo_campo import calcular


@pytest.fixture
def frame():
    return gpd.GeoDataFrame({'valor': [2, 4, 8], 'grupo': ['A', 'A', 'B']},
                           geometry=[Point(i, 0) for i in range(3)], crs=4326)


def test_selecao_e_filtro_intersectam_sem_alterar_demais(frame):
    result, count = calcular(frame, 'valor', 'valor * 10', ['b', 'c'], "grupo == 'A'", ['a', 'b', 'c'])
    assert count == 1
    assert result.valor.tolist() == [2, 40, 8]
    assert frame.valor.tolist() == [2, 4, 8]


def test_campo_novo_so_preenche_escopo(frame):
    result, count = calcular(frame, 'novo', '7', ['1'])
    assert count == 1
    assert result.novo.iloc[1] == 7
    assert result.novo.isna().tolist() == [True, False, True]


@pytest.mark.parametrize('keys,filtro', [([], None), (['ausente'], None), (None, "grupo == 'C'")])
def test_escopo_vazio_ou_obsoleto_nao_calcula_todos(frame, keys, filtro):
    with pytest.raises(ValueError):
        calcular(frame, 'valor', '99', keys, filtro)


def test_geometria_nao_pode_ser_sobrescrita(frame):
    with pytest.raises(ValueError, match='geometria'):
        calcular(frame, 'geometry', '9')


def test_arquivo_calcula_e_grava_original_com_revisao(frame, monkeypatch):
    from api.services import bancada_arquivos as service
    source = {'id': 'storage:base-geoespacial/a.geojson', 'arquivo': 'base-geoespacial/a.geojson',
              'revisao': 'r1', 'crs_arquivo': 'EPSG:4326', 'geojson': frame.__geo_interface__}
    seen = {}
    def abrir(arquivo, revisao, camada):
        assert (arquivo, revisao, camada) == (source['arquivo'], 'r1', source['id'])
        return source
    def persistir(original, result, data, user):
        seen['frame'] = result
        assert original is source
        return {**source, 'revisao': 'r2'}
    monkeypatch.setattr(service, 'abrir', abrir)
    monkeypatch.setattr(service, '_persistir', persistir)
    result = service.calcular_campo(source['arquivo'], 'r1', 'valor', 'valor * 3', SimpleNamespace(id=1),
                                    source['id'], ['1'], "grupo == 'A'")
    assert result['revisao'] == 'r2'
    assert result['feicoes_atualizadas'] == 1
    assert seen['frame'].valor.tolist() == [2, 12, 8]


def test_catalogo_grava_somente_linhas_do_escopo(frame, monkeypatch):
    import asyncio
    from api.services.geoespacial_service import GeoespacialService
    from api.services import geoespacial_service as module
    from api.services import ciclo_vida_arquivos
    service = GeoespacialService.__new__(GeoespacialService)
    service._metadados = {'a': {'metadados': {}}}
    service._camadas = {}
    monkeypatch.setattr(service, 'obter_camada_dados', lambda _: frame)
    monkeypatch.setattr(service, '_caminho_arquivo_da_camada', lambda _: None)
    monkeypatch.setattr(module.camada_geoespacial_repository, 'esta_homologada', lambda _: False)
    monkeypatch.setattr(ciclo_vida_arquivos, 'exigir_editavel', lambda _: None)
    saved = []
    monkeypatch.setattr(module.camada_geoespacial_repository, 'substituir_vetor', lambda _, result, metadata: saved.append(result))
    result = asyncio.run(service.calcular_campo('a', 'valor', '99', ['1', '2'], "grupo == 'A'"))
    assert result['feicoes_atualizadas'] == 1
    assert saved[0].valor.tolist() == [2, 99, 8]
