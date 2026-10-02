"""Validação comum e representação cartográfica binária, sem GeoJSON intermediário.

As referências de execução continuam apontando para as fontes originais. A cópia
temporária contém somente geometria para desenhar tiles, nunca para os cálculos.
"""
from hashlib import sha256
from pathlib import Path
from time import time
from uuid import uuid4
import re

from osgeo import ogr, osr

TTL = 24 * 60 * 60


def _pasta(dono):
    from api.path_policy import project_path
    pasta = project_path('data/geoespacial/configuracoes/extracao-atributos/previas') / sha256(str(dono).encode()).hexdigest()
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


def representar(frame, meta, dono):
    """WKB -> GDAL: nenhuma serialização da camada para JSON."""
    pasta = _pasta(dono)
    for antigo in pasta.glob('*.gpkg'):
        if time() - antigo.stat().st_mtime > TTL and not antigo.with_suffix('.pin').exists():
            try:
                antigo.unlink()
            except OSError:
                pass
    token = uuid4().hex
    path = pasta / f'{token}.gpkg'
    ds = None
    try:
        ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
        srs = osr.SpatialReference()
        srs.ImportFromWkt(frame.crs.to_wkt())
        layer = ds.CreateLayer('camada', srs, ogr.wkbUnknown)
        layer.StartTransaction()
        for geometry in frame.geometry:
            if geometry is None or geometry.is_empty:
                continue
            feature = ogr.Feature(layer.GetLayerDefn())
            feature.SetGeometry(ogr.CreateGeometryFromWkb(geometry.wkb))
            if layer.CreateFeature(feature) != ogr.OGRERR_NONE:
                raise ValueError('Não foi possível preparar a representação da camada.')
        layer.CommitTransaction()
        ds = None
    except Exception:
        ds = None
        path.unlink(missing_ok=True)
        raise
    return dict(representacao='tiles', tiles_token=token, revisao=token,
                bounds=meta['limites_wgs84'], feicoes=len(frame),
                geometria_tipo=' '.join(meta['tipos_geometria']),
                status_validacao='valida', metadados_local=meta,
                crs_arquivo=str(frame.crs), campos=meta['campos'])


def preparar(ident, dono):
    from api.services.extracao_entrada_local import validar
    from api.services.metadados_previa import descrever_vetor
    from api.services.municipal_layer import carregar_para_extracao
    from api.services import storage_geoespacial as storage
    if ident.startswith('storage:'):
        import geopandas as gpd
        from api.services import storage_pacotes
        arquivo, camada = storage.separar_id(ident)
        path = storage.resolver(arquivo)
        if path.suffix.lower() in storage_pacotes.COMPACTADOS:
            frame, _ = storage_pacotes.carregar(path, camada)
        else:
            frame = gpd.read_file(path, layer=camada, engine='pyogrio', fid_as_index=True)
        nome = camada or path.stem
    else:
        from api.repositories import camada_geoespacial_repository as repo
        item = repo.carregar_vetor_bruto(ident)
        if item is None:
            raise FileNotFoundError('Camada não encontrada no catálogo.')
        frame, registro = item
        nome = registro['nome']
        from api.services.extracao_atributos import caminho_arquivo
        arquivo = caminho_arquivo(registro)
        if arquivo:
            frame = carregar_para_extracao(ident)
    _, avisos = validar(frame, max_feicoes=None)
    meta = descrever_vetor(frame, formato=Path(arquivo).suffix.lstrip('.').upper() if arquivo else 'PostGIS')
    meta['avisos'].extend(avisos)
    return dict(id=ident, nome=nome, arquivo=arquivo, tipo='vetor',
                **representar(frame, meta, dono))


def tile(token, dono, z, x, y):
    if not re.fullmatch(r'[a-f0-9]{32}', token) or not 0 <= z <= 22 or not (0 <= x < 2**z and 0 <= y < 2**z):
        raise ValueError('Tile inválido.')
    path = _pasta(dono) / f'{token}.gpkg'
    if not path.is_file() or (time() - path.stat().st_mtime > TTL and not path.with_suffix('.pin').exists()):
        raise FileNotFoundError('Prévia expirada. Valide a camada novamente.')
    from api.services.storage_geoespacial import _tile
    return _tile(str(path), 'camada', token, z, x, y)
