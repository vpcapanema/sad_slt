"""Representação vetorial para o mapa, lida exclusivamente do arquivo selecionado."""
import json
from hashlib import sha256
from uuid import uuid4

from osgeo import gdal, osr

from api.path_policy import project_path, relative_path
from api.services.catalogo_arquivos import camadas_dos_arquivos


def revisao_arquivo(path):
    parts = [path]
    if path.suffix.lower() == '.shp':
        parts = sorted(p for p in path.parent.iterdir() if p.stem == path.stem
                       and p.suffix.lower() in {'.shp', '.shx', '.dbf', '.prj', '.cpg', '.qpj'})
    digest = sha256()
    for part in parts:
        digest.update(part.name.encode())
        with part.open('rb') as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(block)
    return digest.hexdigest()


def ler_arquivo(arquivo: str) -> dict:
    from api.routers.geoespacial import RAIZES_CARREGAVEIS
    relative = relative_path(arquivo).as_posix()
    root = next((project_path('data/geoespacial/' + area['caminho']).resolve()
                 for area in RAIZES_CARREGAVEIS.values()
                 if relative.startswith('data/geoespacial/' + area['caminho'] + '/')), None)
    path = project_path(relative).resolve()
    if root is None or not path.is_relative_to(root):
        raise ValueError('Selecione um arquivo nas áreas permitidas do storage.')
    if not path.is_file():
        raise FileNotFoundError('Arquivo não encontrado no storage.')
    revision = revisao_arquivo(path)
    matches = camadas_dos_arquivos({relative})
    if not matches:
        raise ValueError('Este arquivo não possui vínculo disponível no catálogo.')
    # Reimportar o mesmo arquivo deixa registros antigos apontando para ele. A
    # geometria é a mesma nos dois; recusar por isso só bloqueia um uso legítimo.
    # Vale o registro mais recente, e o mais novo empate desempata pelo nome do arquivo.
    vinculo = max(matches, key=lambda row: (row.get('criado_em') is not None,
                                            row.get('criado_em'), row.get('id')))
    # Shapefile sem .cpg não declara a codificação do DBF e o GDAL repassa os
    # bytes crus. Tenta como está e, se o texto não for UTF-8, relê como Latin-1.
    for encoding in (None, 'ISO-8859-1'):
        try:
            return _ler(path, relative, revision, vinculo, len(matches), encoding)
        except UnicodeDecodeError:
            if encoding is not None:
                raise ValueError('A tabela de atributos usa uma codificação que não foi possível '
                                 'interpretar. Publique o arquivo com um .cpg.')


def _ler(path, relative, revision, vinculo, vinculos, encoding):
    # Somente drivers de arquivos vetoriais locais; não abre conexões OGR/VRT.
    dataset = gdal.OpenEx(str(path), gdal.OF_VECTOR | gdal.OF_READONLY,
                          allowed_drivers=['GPKG', 'ESRI Shapefile', 'GeoJSON',
                                           'FlatGeobuf', 'KML', 'LIBKML', 'GML'],
                          open_options=[f'ENCODING={encoding}'] if encoding else [])
    if dataset is None:
        raise ValueError('GDAL não conseguiu abrir este arquivo vetorial.')
    try:
        if dataset.GetLayerCount() != 1:
            raise ValueError('O arquivo deve conter uma única camada vetorial para esta seleção.')
        layer = dataset.GetLayer(0)
        source = layer.GetSpatialRef()
        if source is None:
            raise ValueError('O arquivo não informa seu CRS. Defina o CRS antes de visualizar.')
        source = source.Clone()
        source_wkt = source.ExportToWkt()
        source.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
        memory = f'/vsimem/bancada-{uuid4().hex}.geojson'
        try:
            converted = gdal.VectorTranslate(memory, dataset, format='GeoJSON',
                dstSRS='EPSG:4326', preserveFID=True,
                layerCreationOptions=['RFC7946=YES', 'COORDINATE_PRECISION=15'])
            if converted is None:
                raise ValueError('Não foi possível converter o arquivo para o mapa.')
            converted = None
            features = json.loads(bytes(gdal.VSIGetMemFileBuffer_unsafe(memory)))['features']
            features = [feature for feature in features if feature.get('geometry')]
            for feature in features:
                feature['id'] = str(feature['id'])
        finally:
            gdal.Unlink(memory)
        if not features:
            raise ValueError('O arquivo não contém geometrias disponíveis para visualização.')
        if revisao_arquivo(path) != revision:
            raise ValueError('O arquivo foi alterado durante a leitura. Abra novamente.')
        definition = layer.GetLayerDefn()
        fields = [{'nome': definition.GetFieldDefn(i).GetName(),
                   'tipo': definition.GetFieldDefn(i).GetTypeName()}
                  for i in range(definition.GetFieldCount())]
        return {'id': vinculo['id'], 'nome': vinculo.get('nome', path.stem),
                'vinculos': vinculos, 'codificacao': encoding or 'declarada pelo arquivo',
                'arquivo': relative, 'origem_geometria': 'storage', 'revisao': revision,
                'crs_arquivo': source_wkt, 'campos': fields,
                'geojson': {'type': 'FeatureCollection', 'features': features}}
    finally:
        dataset = None
