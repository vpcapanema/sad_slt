"""Destino oficial das saídas; arquivos locais são apenas temporários."""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path, PurePosixPath
import re
from api.storage_policy import TemporaryDirectory
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from api.services import storage_remoto

RAIZ = 'saidas-geoespaciais'
GRUPOS = {'camadas', 'relatorios', 'pacotes'}


def nome_gerado(extensao: str = '', *, quando: datetime | None = None, referencia=None) -> str:
    """Nome físico da nova saída, independente do título descritivo da camada."""
    instante = quando or datetime.now(timezone.utc)
    data = instante.astimezone(ZoneInfo('America/Sao_Paulo')).strftime('%Y%m%d_%H%M%S')
    ident = UUID(str(referencia)).hex if referencia is not None else uuid4().hex
    return f'{data}_{ident}{extensao}'


def pasta_analise(ferramenta: str, nome: str, referencia: str, *,
                  quando: datetime | None = None, hierarquizacao: str | None = None,
                  fase: str | None = None, exportacao: bool = False) -> str:
    from api.services.ciclo_vida_arquivos import apelido
    from api.services.pastas_storage import nome_valido
    ident = UUID(str(referencia)).hex
    titulo = apelido(nome, 60) or 'analise'
    data = quando.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ_') if quando else ''
    analise = f'{data}{titulo}_{ident}'
    if hierarquizacao:
        if fase not in {'fase-1', 'fase-2', 'fase-3', 'consolidado'}:
            raise ValueError('Informe a fase da hierarquização para salvar a análise.')
        return pasta_exportacao(f'{RAIZ}/hierarquizacoes/{nome_valido(hierarquizacao)}/{fase}/{analise}')
    if fase:
        raise ValueError('Uma fase exige o código da hierarquização.')
    if exportacao:
        return f'{RAIZ}/exportacoes/{analise}'
    ferramenta = apelido(ferramenta, 60).replace('_', '-') or 'geoprocessamento'
    return f'{RAIZ}/analises-avulsas/{ferramenta}/{analise}'


def pasta_execucao(execucao: str, *, conn=None) -> str:
    if conn is None:
        from api.db.connection import get_connection
        with get_connection() as connection:
            return pasta_execucao(execucao, conn=connection)
    ident = str(UUID(str(execucao)))
    registro = conn.execute(
        'SELECT operacao,parametros,iniciado_em FROM geoprocessamento.execucao_arquivo WHERE id=%s',
        (ident,),
    ).fetchone()
    if not registro:
        raise ValueError('Execução não encontrada para organizar a saída no Storage.')
    parametros = registro['parametros']
    operacao = registro['operacao']
    ferramenta = operacao.rstrip('/').removesuffix('/executar').rsplit('/', 1)[-1]
    ferramenta = {'gerar_camada_municipal': 'gerador-camadas-territoriais',
                  'extracao_atributos': 'extracao-atributos'}.get(ferramenta, ferramenta)
    nome = parametros.get('nome_saida') or parametros.get('nome') or ferramenta
    return pasta_analise(ferramenta, nome, ident, quando=registro['iniciado_em'],
                         exportacao=operacao == 'exportacao_direta')


def pasta_exportacao(caminho: str) -> str:
    from api.services.pastas_storage import nome_valido
    raw = str(caminho)
    parts = raw.split('/')
    if not parts or parts[0] != RAIZ:
        raise ValueError('Escolha uma pasta dentro de saidas-geoespaciais.')
    for part in parts[1:]:
        nome_valido(part)
    return '/'.join(parts)


def validar_exportacao(caminho: str) -> str:
    from api.services.pastas_storage import nome_valido
    parent, separator, name = str(caminho).rpartition('/')
    if not separator:
        raise ValueError('Arquivo fora do storage de saídas.')
    pasta_exportacao(parent)
    nome_valido(name)
    return caminho


def listar_pastas(caminho: str = RAIZ) -> dict:
    path = pasta_exportacao(caminho)
    items = storage_remoto.listar(path, estrito=True)
    return {
        'caminho': path,
        'pastas': [{'nome': item['nome'], 'caminho': f"{path}/{item['nome']}", 'raiz': False}
                   for item in items if item['pasta']],
        'arquivos': [item['nome'] for item in items if not item['pasta']],
    }


def criar_pasta(pai: str, nome: str) -> dict:
    from api.services.pastas_storage import nome_valido
    parent = pasta_exportacao(pai)
    name = nome_valido(nome)
    if name in {item['nome'] for item in storage_remoto.listar(parent, estrito=True)}:
        raise FileExistsError('Já existe um arquivo ou pasta com esse nome.')
    path = f'{parent}/{name}'
    storage_remoto.criar_pasta(path)
    return {'nome': name, 'caminho': path}


def garantir_pasta(caminho: str) -> str:
    parts = pasta_exportacao(caminho).split('/')
    for indice in range(2, len(parts) + 1):
        path = '/'.join(parts[:indice])
        try:
            storage_remoto.listar(path, estrito=True)
        except FileNotFoundError:
            try:
                storage_remoto.criar_pasta(path)
            except storage_remoto.StorageIndisponivel:
                # Outro worker pode ter criado o mesmo diretório nesse intervalo.
                storage_remoto.listar(path, estrito=True)
    return caminho


def validar(caminho: str) -> str:
    validar_exportacao(caminho)
    path = PurePosixPath(str(caminho))
    parts = path.parts
    if len(parts) == 5 and parts[1] == 'execucoes' and parts[3] in GRUPOS:
        UUID(parts[2])
        return str(path)
    organizada = ((len(parts) == 5 and parts[1] == 'analises-avulsas')
                  or (len(parts) == 4 and parts[1] == 'exportacoes')
                  or (len(parts) == 6 and parts[1] == 'hierarquizacoes'
                      and parts[3] in {'fase-1', 'fase-2', 'fase-3', 'consolidado'}))
    if not organizada or not re.fullmatch(r'[a-z0-9_]+_[a-f0-9]{32}', parts[-2], re.I):
        raise ValueError('Arquivo fora do destino oficial de saídas.')
    return str(path)


def destino(execucao: str, grupo: str, nome: str, *, pasta: str | None = None) -> str:
    if grupo not in GRUPOS:
        raise ValueError('Grupo de saída inválido.')
    suffix = Path(nome).suffix.lower()
    parent = pasta if pasta is not None else pasta_execucao(execucao)
    path = validar(f'{parent}/{nome_gerado(suffix)}')
    _conferir_execucao(path, execucao, grupo)
    return path


def _conferir_execucao(caminho: str, execucao: str, grupo: str) -> None:
    if grupo not in GRUPOS:
        raise ValueError('Grupo de saída inválido.')
    parts = PurePosixPath(caminho).parts
    ident = UUID(str(execucao))
    if parts[1] == 'execucoes':
        corresponde = parts[2:4] == (str(ident), grupo)
    else:
        corresponde = parts[-2].endswith('_' + ident.hex)
    if not corresponde:
        raise ValueError('O destino não corresponde à execução e ao grupo informados.')


def conferir(caminho: str, checksum: str | None = None) -> bytes:
    data = storage_remoto.baixar(validar_exportacao(caminho))
    if checksum and sha256(data).hexdigest() != checksum:
        raise ValueError('O arquivo de saída no storage diverge do hash registrado.')
    return data


def enviar_arquivo(execucao: str, grupo: str, arquivo: Path, *, nome: str | None = None,
                   caminho: str | None = None) -> dict:
    path = validar(caminho) if caminho else destino(execucao, grupo, nome or arquivo.name)
    _conferir_execucao(path, execucao, grupo)
    return _enviar_arquivo(path, arquivo)


def enviar_exportacao(caminho: str, arquivo: Path) -> dict:
    path = validar_exportacao(caminho)
    return _enviar_arquivo(path, arquivo)


def _enviar_arquivo(path: str, arquivo: Path) -> dict:
    with arquivo.open('rb') as stream:
        digest = sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
        checksum = digest.hexdigest()
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


def enviar_bytes(execucao: str, grupo: str, nome: str, data: bytes, *, caminho: str | None = None) -> dict:
    path = validar(caminho) if caminho else destino(execucao, grupo, nome)
    _conferir_execucao(path, execucao, grupo)
    return enviar_conteudo(path, data)


def enviar_conteudo(caminho: str, data: bytes) -> dict:
    path = validar_exportacao(caminho)
    checksum = sha256(data).hexdigest()
    try:
        storage_remoto.enviar_bytes(path, data)
        remote = conferir(path, checksum)
        if len(remote) != len(data):
            raise ValueError('O tamanho do arquivo enviado diverge do original.')
    except Exception:
        storage_remoto.apagar_arquivo(path)
        raise
    return {'caminho': path, 'sha256': checksum, 'tamanho_bytes': len(data)}


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
    storage_remoto.apagar_arquivo(validar_exportacao(caminho))


def vetor(camada: dict):
    import geopandas as gpd
    from io import BytesIO
    from api.storage_policy import sem_montagem
    metadata = camada.get('metadados') or {}
    path = camada.get('storage_caminho') or metadata.get('caminho_arquivo')
    if sem_montagem():
        frame = gpd.read_file(BytesIO(conferir(validar(path), metadata.get('sha256'))), engine='pyogrio', layer='resultado')
    else:
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
