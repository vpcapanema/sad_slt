"""Prévia raster limitada, somente leitura, diretamente da fonte do storage."""
import base64
import math
import struct
from uuid import uuid4
from osgeo import gdal

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
    band = projected.GetRasterBand(1)
    raw = band.ReadRaster(buf_type=gdal.GDT_Float32)
    values = [v[0] for v in struct.iter_unpack('=f', raw)]
    alpha = projected.GetRasterBand(projected.RasterCount).ReadRaster(buf_type=gdal.GDT_Byte)
    valid = sorted(v for v, a in zip(values, alpha) if a and math.isfinite(v))
    if not valid:
        raise ValueError('Raster sem células válidas.')
    def percentil(p):
        pos = (len(valid)-1)*p
        i = int(pos)
        return valid[i] + (valid[min(i+1, len(valid)-1)]-valid[i])*(pos-i)
    low, high = percentil(.02), percentil(.98)
    band.SetNoDataValue(float('nan'))
    band.WriteRaster(0, 0, width, height,
                     b''.join(struct.pack('=f', v if a and math.isfinite(v) else float('nan'))
                              for v, a in zip(values, alpha)), buf_type=gdal.GDT_Float32)
    prefix = f'/vsimem/raster-previa-{uuid4().hex}'
    colors, png = prefix+'.txt', prefix+'.png'
    image = encoded = None
    try:
        if high > low:
            linhas = [f'{low+(high-low)*i/255:.17g} {i} {int(255*math.sqrt(i/255))} {255-i} 255'
                      for i in range(256)]
        else:
            linhas = [f'{low:.17g} 0 0 255 255']
        gdal.FileFromMemBuffer(colors, ('\n'.join(linhas)+'\nnv 0 0 0 0\n').encode())
        image = gdal.DEMProcessing('', projected, 'color-relief', format='MEM', colorFilename=colors, addAlpha=True)
        if image is None:
            raise ValueError('GDAL não conseguiu colorir a prévia raster.')
        encoded = gdal.Translate(png, image, format='PNG')
        if encoded is None:
            raise ValueError('GDAL não conseguiu gerar o PNG da prévia.')
        encoded = None
        conteudo = bytes(gdal.VSIGetMemFileBuffer_unsafe(png))
    finally:
        image = encoded = None
        gdal.Unlink(colors)
        gdal.Unlink(png)
        gdal.Unlink(png+'.aux.xml')
    x, dx, _, y, _, dy = projected.GetGeoTransform()
    east, south = x + width * dx, y + height * dy
    return {'image': 'data:image/png;base64,' + base64.b64encode(conteudo).decode('ascii'),
            'coordinates': [[x, y], [east, y], [east, south], [x, south]],
            'bounds': [x, south, east, y], 'crs': 'EPSG:4326', 'width': width, 'height': height,
            'min': valid[0], 'max': valid[-1]}
