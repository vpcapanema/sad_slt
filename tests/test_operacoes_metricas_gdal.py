import asyncio
from types import SimpleNamespace
import geopandas as gpd
import pytest
from shapely.geometry import Point, box
from api.services.geoespacial_service import GeoespacialService
from api.services.geoprocessamento_engine import GeoprocessamentoEngine


def test_buffer_ferramenta_usa_5880_e_nao_escolhe_utm():
    frame = gpd.GeoDataFrame({'geometry':[Point(6000000,7000000)]}, crs=5880)
    captured = {}
    def register(output, name, code):
        captured['output'] = output
        return 'resultado'
    service = SimpleNamespace(obter_camada_dados=lambda _:frame, registrar_camada=register)
    asyncio.run(GeoespacialService.criar_buffer(service, 'entrada', 25))
    geometry = captured['output'].geometry.iloc[0]
    assert captured['output'].crs.to_epsg() == 5880
    assert geometry.bounds == pytest.approx((5999975,6999975,6000025,7000025))


@pytest.mark.parametrize('method,field,expected', [('calculate_area','area',1000000),('calculate_length','comprimento',4000)])
def test_medidas_reprojetam_copia_para_5880(method,field,expected):
    source = gpd.GeoDataFrame({'geometry':[box(6000000,7000000,6001000,7001000)]}, crs=5880).to_crs(4674)
    engine = SimpleNamespace(_layer=lambda _:source, _new_layer=lambda output,*_:output)
    result = asyncio.run(getattr(GeoprocessamentoEngine,method)(engine, {'camada_id':'entrada'}))
    assert result.crs.to_epsg() == 4674
    assert result[field].iloc[0] == pytest.approx(expected, rel=1e-7)
    assert field not in source.columns


def test_distancias_nao_escolhem_outro_crs_metrico():
    source = gpd.GeoDataFrame({'geometry':[Point(300000,7400000)]}, crs=31983)
    engine = SimpleNamespace(_layer=lambda _:source)
    assert GeoprocessamentoEngine._distance_crs(engine, {'camada_id':'entrada'}) == 'EPSG:5880'
