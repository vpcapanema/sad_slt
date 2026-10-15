"""Prévia raster limitada, somente leitura, diretamente da fonte do storage."""
import base64
from io import BytesIO

import numpy as np
from osgeo import gdal
from PIL import Image

from api.services.storage_geoespacial import resolver


def preview(caminho: str) -> dict:
    arquivo = resolver(caminho)
    source = gdal.OpenEx(str(arquivo), gdal.OF_RASTER | gdal.OF_READONLY)
    if source is None or not source.GetProjection():
        raise ValueError('Raster sem sistema de referência para visualização.')
    vrt = gdal.AutoCreateWarpedVRT(source, None, 'EPSG:4326')
    factor = min(1, 1024 / max(vrt.RasterXSize, vrt.RasterYSize))
    width, height = max(1, round(vrt.RasterXSize * factor)), max(1, round(vrt.RasterYSize * factor))
    projected = gdal.Warp('', source, format='MEM', dstSRS='EPSG:4326', width=width, height=height, dstAlpha=True)
    values = projected.GetRasterBand(1).ReadAsArray().astype('float32')
    alpha = projected.GetRasterBand(projected.RasterCount).ReadAsArray()
    valid = (alpha > 0) & np.isfinite(values)
    if not valid.any():
        raise ValueError('Raster sem células válidas.')
    low, high = np.percentile(values[valid], [2, 98])
    normalized = np.clip((values - low) / (high - low), 0, 1) if high > low else np.zeros_like(values)
    normalized = np.where(valid, normalized, 0)
    rgba = np.stack([255 * normalized, 255 * np.sqrt(normalized), 255 * (1 - normalized), np.where(valid, 255, 0)], axis=-1).astype('uint8')
    stream = BytesIO()
    Image.fromarray(rgba).save(stream, format='PNG')
    x, dx, _, y, _, dy = projected.GetGeoTransform()
    east, south = x + width * dx, y + height * dy
    return {'image': 'data:image/png;base64,' + base64.b64encode(stream.getvalue()).decode('ascii'),
            'coordinates': [[x, y], [east, y], [east, south], [x, south]],
            'bounds': [x, south, east, y], 'crs': 'EPSG:4326', 'width': width, 'height': height,
            'min': float(values[valid].min()), 'max': float(values[valid].max())}
