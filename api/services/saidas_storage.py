"""Destino oficial das saídas; arquivos locais são apenas temporários."""
from __future__ import annotations

from contextlib import contextmanager
from hashlib import sha256
import json
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory
from uuid import UUID, uuid4

from api.services import storage_remoto

RAIZ = 'saidas-geoespaciais'
GRUPOS = {'camadas', 'relatorios', 'pacotes'}


def validar(caminho: str) -> str:
    path = PurePosixPath(str(caminho))
    if path.is_absolute() or '\\' in str(caminho) or '..' in path.parts:
        raise ValueError('Caminho de saída inválido.')
    if len(path.parts) != 5 or path.parts[:2] != (RAIZ, 'execucoes') or path.parts[3] not in GRUPOS:
        raise ValueError('Arquivo fora do destino oficial de saídas.')
    UUID(path.parts[2])
    if not path.name or path.name.startswith('.'):
        raise ValueError('Nome de arquivo de saída inválido.')
    return str(path)


def destino(execucao: str, grupo: str, nome: str) -> str:
    if grupo not in GRUPOS:
        raise ValueError('Grupo de saída inválido.')
    from api.services.ciclo_vida_arquivos import apelido
    suffix = Path(nome).suffix.lower()
    safe = apelido(Path(nome).stem, 60) or 'saida'
    return validar(f'{RAIZ}/execucoes/{UUID(str(execucao))}/{grupo}/{safe}_{uuid4().hex[:12]}{suffix}')


def conferir(caminho: str, checksum: str | None = None) -> bytes:
    data = storage_remoto.baixar(validar(caminho))
    if checksum and sha256(data).hexdigest() != checksum:
        raise ValueError('O arquivo de saída no storage diverge do hash registrado.')
    return data


def enviar_arquivo(execucao: str, grupo: str, arquivo: Path, *, nome: str | None = None,
                   caminho: str | None = None) -> dict:
    path = validar(caminho) if caminho else destino(execucao, grupo, nome or arquivo.name)
    if PurePosixPath(path).parts[2:4] != (str(UUID(str(execucao))), grupo):
        raise ValueError('O destino não corresponde à execução e ao grupo informados.')
    with arquivo.open('rb') as stream:
        checksum = __import__('hashlib').file_digest(stream, 'sha256').hexdigest()
    uploaded = False
    try:
        storage_remoto.enviar(path, arquivo)
        uploaded = True
        remote = conferir(path, checksum)
        if len(remote) != arquivo.stat().st_size:
            raise ValueError('O tamanho do arquivo enviado ao storage diverge do original.')
    except Exception:
        if uploaded:
            storage_remoto.apagar_arquivo(path)
        raise
    return {'caminho': path, 'sha256': checksum, 'tamanho_bytes': arquivo.stat().st_size}


def enviar_bytes(execucao: str, grupo: str, nome: str, data: bytes) -> dict:
    with TemporaryDirectory(prefix='sicard-saida-') as directory:
        path = Path(directory)/Path(nome).name
        path.write_bytes(data)
        return enviar_arquivo(execucao, grupo, path, nome=nome)


def enviar_json(execucao: str, nome: str, data: dict) -> dict:
    return enviar_bytes(execucao, 'relatorios', nome,
                        json.dumps(data, ensure_ascii=False, default=str, allow_nan=False).encode('utf8'))


@contextmanager
def materializar(caminho: str, checksum: str | None = None):
    with TemporaryDirectory(prefix='sicard-leitura-') as directory:
        path = Path(directory)/PurePosixPath(validar(caminho)).name
        path.write_bytes(conferir(caminho, checksum))
        yield path


def remover(caminho: str):
    storage_remoto.apagar_arquivo(validar(caminho))


def vetor(camada: dict):
    import geopandas as gpd
    metadata = camada.get('metadados') or {}
    path = camada.get('storage_caminho') or metadata.get('caminho_arquivo')
    with materializar(path, metadata.get('sha256')) as source:
        frame = gpd.read_file(source, engine='pyogrio', layer='resultado')
    for field in metadata.get('campos_json_arquivo', []):
        if field in frame:
            frame[field] = frame[field].map(lambda value: json.loads(value) if isinstance(value, str) else value)
    return frame


def preview_raster(caminho: str, checksum: str | None = None) -> dict:
    """Preview limitado a 1024 pixels; o GeoTIFF original permanece intacto."""
    import base64
    from io import BytesIO
    import numpy as np
    from PIL import Image
    from rasterio.io import MemoryFile
    from rasterio.vrt import WarpedVRT
    with MemoryFile(conferir(caminho,checksum)) as memory:
        with memory.open() as source:
            if not source.crs:
                raise ValueError('Raster sem sistema de referência.')
            with WarpedVRT(source,crs='EPSG:4326') as raster:
                factor=min(1,1024/max(raster.width,raster.height))
                width,height=max(1,int(raster.width*factor)),max(1,int(raster.height*factor))
                values=raster.read(1,out_shape=(height,width),masked=True).astype('float32')
                valid=~np.ma.getmaskarray(values)&np.isfinite(values.data)
                if not valid.any():
                    raise ValueError('Raster sem células válidas.')
                low,high=np.percentile(values.data[valid],[2,98])
                normalized=np.clip((values.data-low)/(high-low),0,1) if high>low else np.zeros_like(values.data)
                normalized=np.where(valid,normalized,0)
                rgba=np.stack([255*normalized,255*np.sqrt(normalized),255*(1-normalized),np.where(valid,190,0)],axis=-1).astype('uint8')
                stream=BytesIO()
                Image.fromarray(rgba).save(stream,format='PNG')
                west,south,east,north=raster.bounds
    return {'image':'data:image/png;base64,'+base64.b64encode(stream.getvalue()).decode('ascii'),
            'coordinates':[[west,north],[east,north],[east,south],[west,south]],
            'min':float(values.data[valid].min()),'max':float(values.data[valid].max())}
