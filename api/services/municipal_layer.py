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

DESTINO = 'saidas-geoespaciais'
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


def categorias():
    """A ferramenta independente não precisa inventariar arquivos do storage."""
    with get_connection() as conn:
        return [dict(row) for row in conn.execute('''SELECT codigo AS id,nome,conceito
            FROM dominios.categoria_extracao_atributos WHERE ativo ORDER BY ordem,nome''').fetchall()]


def catalogo(codigo=None):
    category = categoria(codigo) if codigo is not None else None
    return {'attributes': dados.catalog(), 'municipalities': dados.MUNICIPIOS, 'crs': dados.CRS,
            'geometryYear': dados.ANO_MALHA, 'categoria': category, 'destino': DESTINO}


LIMITE_GLOSSARIO = 300


def previa(codigo, payload):
    if codigo is not None:
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


def materializar(payload, folder, base=None, controle=None):
    """Exporta a base municipal e reabre o arquivo pelo GDAL antes do registro."""
    base = base or dados.PREFIXO
    package = dados.export_layer(payload, base, controle) if controle else dados.export_layer(payload, base)
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


def gerar(codigo, payload, nome, user, controle=None):
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
        from tempfile import TemporaryDirectory
        from api.repositories import camada_geoespacial_repository as camadas, saidas_geoespaciais_repository as catalogo
        from api.services import saidas_storage
        with TemporaryDirectory(prefix='sicard-municipal-') as temporary:
            folder = Path(temporary)
            package, path, manifest, frame = materializar(payload, folder, base, controle) if controle else materializar(payload, folder, base)
            ident = 'camada_' + uuid4().hex
            metadata = {'origem_ferramenta':'municipal-layer', 'base_arquivos':base,
                        'categoria_extracao':category, 'execucao_id':execution,
                        'manifesto':manifest, 'feicoes':len(frame), 'colunas':list(frame.columns)}
            if controle:controle.fase(3,'Registrando a camada validada no Sicard Storage',cancelavel=False)
            registering = True
            token = ciclo.execucao_atual.set(execution)
            try:
                camadas.salvar_vetor(recurso_id=ident,nome=name,origem='OP-MUNICIPAL',
                                     gdf=frame,metadados=metadata,preservar_geometrias=True)
            finally:
                ciclo.execucao_atual.reset(token)
            archive = saidas_storage.enviar_bytes(execution,'pacotes',base+'.zip',package)
            catalogo.registrar_documento(execution,ident,archive,validacao={'pacote_municipal':True})
            report = saidas_storage.enviar_json(execution,base+'_metadados.json',manifest)
            catalogo.registrar_documento(execution,ident,report,validacao={'json':True,'tipo':'metadados_municipais'})
            ciclo.finalizar(execution)
            return package, {'id':ident,'arquivo':metadata['caminho_arquivo'],
                             'pacote_caminho':archive['caminho'],'execucao_id':execution,'nome':name}
    except Exception as exc:
        if execution:
            ciclo.finalizar(execution, erro=str(exc))
        raise
    finally:
        _lock.release()


def carregar_para_extracao(ident):
    if str(ident).startswith('storage:'):
        from api.services.storage_geoespacial import carregar_gdf
        return carregar_gdf(ident)
    with get_connection() as conn:
        row = conn.execute("SELECT metadados FROM geoprocessamento.camada_importada WHERE recurso_sessao_id=%s", (ident,)).fetchone()
    metadata = (row or {}).get('metadados') or {}
    if metadata.get('origem') == 'municipal-layer':
        path = project_path(metadata['caminho_arquivo']).resolve()
        if not path.is_relative_to(project_path('data/geoespacial/uploads/datastorage/vetor').resolve()):
            raise ValueError('Camada municipal fora do acervo.')
        return gpd.read_file(path, engine='pyogrio')
    from api.services.geoespacial_service import geoespacial_service
    frame = geoespacial_service._ler_do_acervo(ident)
    if frame is not None:
        return frame.copy()
    from api.repositories.camada_geoespacial_repository import carregar_vetor_bruto
    loaded = carregar_vetor_bruto(ident)
    if loaded is None:
        raise ValueError('Camada não encontrada no catálogo.')
    return loaded[0]
