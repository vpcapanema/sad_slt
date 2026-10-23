"""Validação comum e representação cartográfica binária, sem GeoJSON intermediário.

As referências de execução continuam apontando para as fontes originais. A cópia
temporária de arquivos locais preserva atributos para consulta, nunca para os cálculos.
"""
from hashlib import sha256
from time import time
from uuid import uuid4
import re

from osgeo import ogr
from api.services import analise_territorial_ogr as nativo
from api.services import fluxo_camadas_ogr as fluxo
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
        conteudo = nativo.serializar(frame, 'camada', preservar_fids=True)
        path.write_bytes(conteudo)
        ds = ogr.Open(str(path))
        from api.services.storage_geoespacial import campo_fid_tile
        campo_fid = campo_fid_tile(ds.GetLayer(0))
        ds = None
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
                crs_arquivo=frame.crs.ExportToWkt(), campos=meta['campos'])


def _pasta_remota(dono):
    return 'temporarios-sicard/extracao-atributos/previas/' + sha256(str(dono).encode()).hexdigest()


def _gravar_remoto(frame, dono):
    from api.services import storage_remoto
    storage_remoto.listar('temporarios-sicard', estrito=True)
    pasta = _pasta_remota(dono)
    for item in storage_remoto.listar(pasta):
        nome = item['nome']
        if not item['pasta'] and re.fullmatch(r'[a-f0-9]{32}\.gpkg', nome) and time() - item['modificado'] > TTL:
            storage_remoto.apagar_arquivo(f'{pasta}/{nome}')
    token = uuid4().hex
    nome = f'{token}.gpkg'
    conteudo = nativo.serializar(frame, 'camada', preservar_fids=True)
    caminho = f'{pasta}/{nome}'
    try:
        storage_remoto.enviar_bytes(caminho, conteudo)
        if sha256(storage_remoto.baixar(caminho)).digest() != sha256(conteudo).digest():
            raise ValueError('A prévia no storage diverge da geometria validada.')
    except Exception:
        storage_remoto.apagar_arquivo(caminho)
        raise
    return token


def carregar(ident):
    from api.services import storage_geoespacial as storage
    frame = nativo.carregar_referencia(ident)
    if ident.startswith('storage:'):
        arquivo, camada = storage.separar_id(ident)
        path = storage.resolver(arquivo)
        frame.fonte['arquivo'] = path
        nome = camada or path.stem
    else:
        nome = frame.fonte.get('nome', ident)
        arquivo = frame.fonte.get('arquivo')
    return frame, nome, arquivo


def preparar(ident, dono):
    from api.services import storage_geoespacial as storage
    if ident.startswith('storage:'):
        from api.services.bancada_camada_original import preparar as preparar_original
        from urllib.parse import urlencode
        caminho, camada = storage.separar_id(ident)
        resultado = preparar_original(ident, caminho)
        if not resultado['feicoes'] or not resultado['bounds']:
            raise ValueError('A camada está vazia ou sem extensão utilizável para visualização.')
        consulta = urlencode({'caminho': caminho, 'camada': camada or '', 'v': resultado['revisao']})
        resultado.update(tipo='vetor', representacao='tiles', revisao_fonte=resultado['revisao'],
                         tiles_url=f'/api/geoespacial/storage/camada/tiles/{{z}}/{{x}}/{{y}}.pbf?{consulta}')
        return resultado
    frame, nome, arquivo = carregar(ident)
    meta = fluxo.descrever(frame, arquivo=frame.fonte.get('arquivo'))
    representacao = representar(frame, meta, dono)
    return dict(id=ident, nome=nome, arquivo=arquivo, tipo='vetor',
                **representacao)


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
