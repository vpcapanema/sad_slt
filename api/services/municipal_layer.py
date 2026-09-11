"""Gerador de camadas municipais; arquivo materializado no acervo, registro no banco.

Os dados vêm do schema base_municipal, carregado por
scripts/carregar_base_municipal.py. O pacote plugins/municipal-layer permanece
apenas como origem dos insumos e do componente React compilado.
"""
import io
import json
import re
import threading
import unicodedata
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from uuid import uuid4
from zipfile import ZipFile

import geopandas as gpd
from osgeo import gdal
from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.path_policy import project_path
from api.services import base_municipal as dados
from api.services import ciclo_vida_arquivos as ciclo

DESTINO = 'data/geoespacial/uploads/datastorage/vetor'
_lock = threading.Lock()


def data_exportacao():
    """Data no fuso de São Paulo; o contêiner roda em UTC e viraria o dia às 21h."""
    try:
        agora = datetime.now(ZoneInfo('America/Sao_Paulo'))
    except Exception:
        agora = datetime.now(timezone(timedelta(hours=-3)))
    return agora.strftime('%Y-%m-%d')


def nome_padrao(category, itens):
    """Categoria escolhida, fonte majoritária da seleção e data da exportação."""
    contagem = Counter(item['source'] for item in itens)
    fonte = contagem.most_common(1)[0][0] if contagem else 'Sem fonte'
    return f"{category['nome']} — {fonte} — {data_exportacao()}"[:200]


def categoria(codigo):
    with get_connection() as conn:
        row = conn.execute('''SELECT codigo AS id,nome,conceito FROM dominios.categoria_extracao_atributos
            WHERE codigo=%s AND ativo''', (codigo,)).fetchone()
    if not row:
        raise ValueError('Categoria inexistente ou inativa.')
    return dict(row)


def catalogo(codigo):
    category = categoria(codigo)
    return {'attributes': dados.catalog(), 'municipalities': dados.MUNICIPIOS, 'crs': dados.CRS,
            'geometryYear': dados.ANO_MALHA, 'categoria': category, 'destino': DESTINO}


LIMITE_GLOSSARIO = 300


def previa(codigo, payload):
    categoria(codigo)
    items = dados.selection(payload['attributes'])
    frame = dados.layer(items[:8]).drop(columns='geometry').head(5)
    # O glossario descreve a tabela de atributos da camada que sera gerada.
    entradas = dados.dicionario(items[:LIMITE_GLOSSARIO], payload.get('format', 'fgb'))
    fixos = [{'campo_exportado': campo, 'alias': rotulo, 'significado': texto,
              'campo_bruto': campo, 'fonte': dados.ORIGEM_MALHA, 'tema': 'Malha municipal',
              'ano': dados.ANO_MALHA, 'unidade': None}
             for campo, (rotulo, texto) in dados.CAMPOS_FIXOS.items()]
    return {'rows': json.loads(frame.to_json(orient='records')),
            'fields': [item['field'] for item in items[:8]], 'totalAttributes': len(items),
            'glossario': fixos + entradas, 'glossarioLimite': LIMITE_GLOSSARIO}


def base_arquivos(nome: str) -> str:
    """municipios_sp + identificador curto + o nome que o usuário deu."""
    texto = unicodedata.normalize('NFKD', str(nome)).encode('ascii', 'ignore').decode()
    # 40 caracteres: o nome completo fica no banco; aqui o caminho precisa caber.
    texto = re.sub(r'[^a-zA-Z0-9]+', '_', texto).strip('_').lower()[:40].strip('_')
    curto = uuid4().hex[:8]
    return '_'.join(parte for parte in (dados.PREFIXO, curto, texto) if parte)


def materializar(payload, folder, base=None):
    """Exporta a base municipal e reabre o arquivo pelo GDAL antes do registro."""
    base = base or dados.PREFIXO
    package = dados.export_layer(payload, base)
    fmt = payload['format']
    with ZipFile(io.BytesIO(package)) as archive:
        for member in archive.infolist():
            path = (folder/member.filename).resolve()
            if Path(member.filename).name != member.filename or not path.is_relative_to(folder.resolve()):
                raise ValueError('Pacote municipal com caminho inválido.')
            with path.open('xb') as stream:
                stream.write(archive.read(member))
    path = folder/f'{base}.{fmt}'
    dataset = gdal.OpenEx(str(path), gdal.OF_VECTOR | gdal.OF_READONLY)
    if dataset is None or dataset.GetLayerCount() != 1:
        raise ValueError('A exportação deve conter uma camada vetorial.')
    layer = dataset.GetLayer(0)
    if layer.GetFeatureCount() != 645:
        raise ValueError('A camada gerada não contém os 645 municípios.')
    dataset = None
    frame = gpd.read_file(path, engine='pyogrio')
    if frame.crs.to_epsg() != 4674 or not frame.CD_MUN.is_unique or not frame.CD_MUN.str.fullmatch(r'\d{7}').all():
        raise ValueError('CRS ou códigos municipais inválidos.')
    manifest = json.loads((folder/f'{base}_metadados.json').read_text(encoding='utf-8'))
    if any(item['export_field'] not in frame for item in manifest['attributes']):
        raise ValueError('Um atributo selecionado não foi materializado.')
    return package, path, manifest, frame


def gerar(codigo, payload, nome, user):
    category = categoria(codigo)
    if not _lock.acquire(blocking=False):
        raise ValueError('Há uma camada municipal sendo gerada. Aguarde e tente novamente.')
    execution = None
    folder = None
    registering = False
    try:
        params = {'plugin': 'municipal-layer', 'versao': '1.0.0', 'categoria': category, **payload}
        execution = ciclo.iniciar('gerar_camada_municipal', params, str(user.id))
        # O nome sai antes da exportação: é ele que batiza a pasta e os arquivos.
        name = nome.strip()[:200] or nome_padrao(category, dados.selection(payload['attributes']))
        base = base_arquivos(name)
        folder = project_path(f'{DESTINO}/{base}')
        folder.mkdir(parents=True, exist_ok=False)
        package, path, manifest, frame = materializar(payload, folder, base)
        relative = path.relative_to(project_path('.').resolve()).as_posix()
        ident = 'camada_' + uuid4().hex
        metadata = {'caminho_arquivo': relative, 'origem': 'municipal-layer', 'base_arquivos': base,
                    'categoria_extracao': category, 'execucao_id': execution, 'manifesto': manifest,
                    'feicoes': 645, 'colunas': list(frame.columns), 'sha256': ciclo.digest(path),
                    'componentes': [{'arquivo': p.relative_to(project_path('.')).as_posix(),
                                    'sha256': ciclo.digest(p)} for p in folder.iterdir() if p.is_file()]}
        # O banco guarda o catálogo e a procedência; as feições permanecem no arquivo.
        registering = True
        with get_connection() as conn:
            conn.execute('''INSERT INTO geoprocessamento.camada_importada
                (recurso_sessao_id,nome,tipo,geometria_tipo,crs,formato,metadados,envelope)
                VALUES (%s,%s,'vetor','MultiPolygon','EPSG:4674',%s,%s,ST_MakeEnvelope(%s,%s,%s,%s,4674))''',
                (ident, name, payload['format'], Jsonb(metadata), *[float(v) for v in frame.total_bounds]))
            conn.execute("UPDATE geoprocessamento.execucao_arquivo SET status='concluido',finalizado_em=now() WHERE id=%s", (execution,))
        return package, {'id': ident, 'arquivo': relative, 'execucao_id': execution, 'nome': name}
    except Exception as exc:
        # Em COMMIT ambíguo, preservar o arquivo permite conciliação sem perder dados.
        if not registering and folder and folder.is_dir() and folder.resolve().is_relative_to(project_path(DESTINO).resolve()):
            for child in folder.iterdir():
                if child.is_file():
                    child.unlink()
            folder.rmdir()
        if execution:
            ciclo.finalizar(execution, erro=str(exc))
        raise
    finally:
        _lock.release()


def carregar_para_extracao(ident):
    with get_connection() as conn:
        row = conn.execute("SELECT metadados FROM geoprocessamento.camada_importada WHERE recurso_sessao_id=%s", (ident,)).fetchone()
    metadata = (row or {}).get('metadados') or {}
    if metadata.get('origem') == 'municipal-layer':
        path = project_path(metadata['caminho_arquivo']).resolve()
        if not path.is_relative_to(project_path(DESTINO).resolve()):
            raise ValueError('Camada municipal fora do acervo.')
        return gpd.read_file(path, engine='pyogrio')
    from api.services.geoespacial_service import geoespacial_service
    return geoespacial_service.obter_camada_dados(ident).copy()
