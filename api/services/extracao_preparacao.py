"""Validação comum e representação cartográfica binária, sem GeoJSON intermediário.

As referências de execução continuam apontando para as fontes originais. A cópia
temporária de arquivos locais preserva atributos para consulta, nunca para os cálculos.
"""
from hashlib import sha256
from pathlib import Path
from time import time
from uuid import uuid4
import re

from osgeo import ogr, osr
from api.storage_policy import sem_montagem

TTL = 24 * 60 * 60


def _pasta(dono):
    from api.path_policy import project_path
    pasta = project_path('tmp/extracao-atributos/previas') / sha256(str(dono).encode()).hexdigest()
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


def representar(frame, meta, dono, *, atributos=False):
    """WKB -> GDAL: nenhuma serialização da camada para JSON."""
    if sem_montagem() and not atributos:
        return _descritor(frame, meta, _gravar_remoto(frame, dono))
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
        if atributos:
            # Cópia privada de leitura: todos os atributos e geometrias originais.
            fid = '__sicard_fid__'
            while fid in frame.columns:
                fid += '_'
            geometria = '__sicard_geom__'
            while geometria in frame.columns:
                geometria += '_'
            frame.to_file(path, layer='camada', driver='GPKG', engine='pyogrio', index=False,
                          FID=fid, GEOMETRY_NAME=geometria)
            ds = ogr.Open(str(path))
            from api.services.storage_geoespacial import campo_fid_tile
            campo_fid = campo_fid_tile(ds.GetLayer(0))
            ds = None
        else:
            _gravar_geometrias(frame, path)
    except Exception:
        ds = None
        path.unlink(missing_ok=True)
        raise
    resultado = _descritor(frame, meta, token)
    if atributos:
        resultado.update(origem_geometria='local_temporaria', editavel=False, campo_fid_tile=campo_fid)
    return resultado


def _descritor(frame, meta, token):
    return dict(representacao='tiles', tiles_token=token, revisao=token,
                bounds=meta['limites_wgs84'], feicoes=len(frame),
                geometria_tipo=' '.join(meta['tipos_geometria']),
                status_validacao='valida', metadados_local=meta,
                crs_arquivo=str(frame.crs), campos=meta['campos'])


def _pasta_remota(dono):
    return 'temporarios-sicard/extracao-atributos/previas/' + sha256(str(dono).encode()).hexdigest()


def _gravar_remoto(frame, dono):
    from api.services import storage_remoto
    from api.services.arquivos_geoespaciais_memoria import vetor
    storage_remoto.listar('temporarios-sicard', estrito=True)
    pasta = _pasta_remota(dono)
    for item in storage_remoto.listar(pasta):
        nome = item['nome']
        if not item['pasta'] and re.fullmatch(r'[a-f0-9]{32}\.gpkg', nome) and time() - item['modificado'] > TTL:
            storage_remoto.apagar_arquivo(f'{pasta}/{nome}')
    token = uuid4().hex
    nome = f'{token}.gpkg'
    geometria = frame.geometry
    geometrias = frame.loc[geometria.notna() & ~geometria.is_empty, [geometria.name]]
    conteudo = vetor(geometrias, nome, 'GPKG', layer='camada')[nome]
    caminho = f'{pasta}/{nome}'
    try:
        storage_remoto.enviar_bytes(caminho, conteudo)
        if sha256(storage_remoto.baixar(caminho)).digest() != sha256(conteudo).digest():
            raise ValueError('A prévia no storage diverge da geometria validada.')
    except Exception:
        storage_remoto.apagar_arquivo(caminho)
        raise
    return token


def _gravar_geometrias(frame, path):
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


def carregar(ident):
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
    return frame, nome, arquivo


def preparar(ident, dono):
    from api.services.extracao_entrada_local import validar
    from api.services.metadados_previa import descrever_vetor
    frame, nome, arquivo = carregar(ident)
    _, avisos = validar(frame, max_feicoes=None)
    meta = descrever_vetor(frame, formato=Path(arquivo).suffix.lstrip('.').upper() if arquivo else 'PostGIS')
    meta['avisos'].extend(avisos)
    return dict(id=ident, nome=nome, arquivo=arquivo, tipo='vetor',
                **representar(frame, meta, dono))


def tile(token, dono, z, x, y):
    if not re.fullmatch(r'[a-f0-9]{32}', token) or not 0 <= z <= 22 or not (0 <= x < 2**z and 0 <= y < 2**z):
        raise ValueError('Tile inválido.')
    if sem_montagem():
        from api.services import storage_remoto, storage_geoespacial
        pasta = _pasta_remota(dono)
        item = next((item for item in storage_remoto.listar(pasta)
                     if item['nome'] == f'{token}.gpkg' and not item['pasta']), None)
        if item is None or time() - item['modificado'] > TTL:
            raise FileNotFoundError('Prévia expirada. Valide a camada novamente.')
        path = storage_geoespacial.ArquivoStorage(
            f'{pasta}/{token}.gpkg', item['tamanho'], item['modificado'])
        return storage_geoespacial._tile(str(path), 'camada', token, z, x, y)
    path = _pasta(dono) / f'{token}.gpkg'
    if not path.is_file() or (time() - path.stat().st_mtime > TTL and not path.with_suffix('.pin').exists()):
        raise FileNotFoundError('Prévia expirada. Valide a camada novamente.')
    from api.services.storage_geoespacial import _tile
    return _tile(str(path), 'camada', token, z, x, y)
