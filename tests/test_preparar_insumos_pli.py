from scripts.preparar_insumos_pli import carregar, manifesto_variaveis, preparar_local
from osgeo import gdal, ogr
import pytest


def test_criterios_correspondem_a_apresentacao():
    definition, rows = carregar()
    assert len(rows) == 17
    assert definition["criterios"]["R1"] == ["V31", "V28", "REL"]
    assert definition["criterios"]["I2"] == ["V26", "V27", "V28", "V29", "V30"]
    assert "V07" not in {v for values in definition["criterios"].values() for v in values}


def test_insumos_nao_sao_valores_fap():
    definition, _ = carregar()
    rows = manifesto_variaveis(definition, definition["insumos"])
    assert len(rows) == 32
    assert all(row["valor_fap_calculado"] is False for row in rows)
    by_code = {row["variavel"]: row for row in rows}
    assert by_code["V16"]["insumos"] == ["sinistros_municipais_2018"]
    assert not by_code["V18"]["insumos"]
    assert not by_code["V19"]["insumos"]
    assert by_code["V28"]["criterios"] == ["I2", "R1"]
    assert not by_code["V07"]["criterios"]
    assert all(row["situacao"] == "insumos_de_apoio_disponiveis"
               for row in rows if row["insumos"])


def test_recorte_reprojecao_e_preservacao_atributos(tmp_path, monkeypatch):
    from scripts import preparar_insumos_pli as script

    monkeypatch.setattr(script, "ROOT", tmp_path)
    source = tmp_path / "fonte.geojson"
    source.write_text(
        '{"type":"FeatureCollection","features":['
        '{"type":"Feature","properties":{"valor":7},"geometry":{"type":"Point","coordinates":[-47,-23]}},'
        '{"type":"Feature","properties":{"valor":9},"geometry":{"type":"Point","coordinates":[-60,-10]}}]}',
        encoding="utf-8",
    )
    clip = tmp_path / "limite.geojson"
    clip.write_text(
        '{"type":"Polygon","coordinates":[[[-48,-24],[-46,-24],[-46,-22],[-48,-22],[-48,-24]]]}',
        encoding="utf-8",
    )
    data, metadata, provenance = preparar_local({"id": "teste", "local": "fonte.geojson"}, str(clip))
    assert metadata[0]["feicoes"] == 1
    assert metadata[0]["epsg"] == "4674"
    assert metadata[0]["geometrias_invalidas"] == 0
    assert provenance[0]["bytes"] == source.stat().st_size
    path = "/vsimem/teste-insumos-pli.gpkg"
    try:
        gdal.FileFromMemBuffer(path, data)
        with gdal.OpenEx(path, gdal.OF_VECTOR) as dataset:
            layer = dataset.GetLayer(0)
            feature = layer.GetNextFeature()
            assert feature.GetField("valor") == 7
            assert feature.GetGeometryRef().GetGeometryType() == layer.GetGeomType()
    finally:
        gdal.Unlink(path)


def test_fonte_sem_crs_nao_e_reprojetada(tmp_path, monkeypatch):
    from scripts import preparar_insumos_pli as script

    monkeypatch.setattr(script, "ROOT", tmp_path)
    path = tmp_path / "sem_crs.shp"
    dataset = ogr.GetDriverByName("ESRI Shapefile").CreateDataSource(str(path))
    layer = dataset.CreateLayer("sem_crs", geom_type=ogr.wkbPoint)
    feature = ogr.Feature(layer.GetLayerDefn())
    feature.SetGeometry(ogr.CreateGeometryFromWkt("POINT (-47 -23)"))
    layer.CreateFeature(feature)
    dataset = None
    with pytest.raises(ValueError, match="sem sistema de coordenadas"):
        preparar_local({"id": "sem_crs", "local": path.name}, "nao_utilizado")
