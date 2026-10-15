import base64
from io import BytesIO

import numpy as np
import pytest
from osgeo import gdal, osr
from PIL import Image

from api.services import bancada_raster


def test_preview_limitada_preserva_fonte_e_nodata(tmp_path, monkeypatch):
    path = tmp_path / 'raster.tif'
    ds = gdal.GetDriverByName('GTiff').Create(str(path), 1200, 600, 1, gdal.GDT_Float32)
    crs = osr.SpatialReference(); crs.ImportFromEPSG(4326)
    ds.SetProjection(crs.ExportToWkt()); ds.SetGeoTransform([-47, .001, 0, -22, 0, -.001])
    values = np.full((600, 1200), 5, dtype='float32'); values[:100, :100] = -9999
    ds.GetRasterBand(1).SetNoDataValue(-9999); ds.GetRasterBand(1).WriteArray(values); ds = None
    before = path.read_bytes()
    monkeypatch.setattr(bancada_raster, 'resolver', lambda _: path)
    result = bancada_raster.preview('base-geoespacial/raster.tif')
    assert max(result['width'], result['height']) <= 1024
    image = np.asarray(Image.open(BytesIO(base64.b64decode(result['image'].split(',')[1]))))
    assert image[0, 0, 3] == 0
    assert image[-1, -1, 3] == 255
    assert result['min'] == result['max'] == 5
    assert result['bounds'] == pytest.approx([-47, -22.6, -45.8, -22])
    assert path.read_bytes() == before


def test_preview_sem_crs_recusada(tmp_path, monkeypatch):
    path = tmp_path / 'sem-crs.tif'
    ds = gdal.GetDriverByName('GTiff').Create(str(path), 2, 2, 1); ds = None
    monkeypatch.setattr(bancada_raster, 'resolver', lambda _: path)
    with pytest.raises(ValueError, match='referência'):
        bancada_raster.preview('base-geoespacial/sem-crs.tif')
