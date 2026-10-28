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
from contextlib import nullcontext
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
            FROM dominios.categoria_extracao_atributos
            WHERE ativo AND grupo_conceitual IS DISTINCT FROM 'PLI' ORDER BY ordem,nome''').fetchall()]


def backend(territorialidade='municipios'):
    if territorialidade == 'municipios':
        return dados
    if territorialidade == 'setores_2022':
        from api.services import base_setorial
        return base_setorial
    raise ValueError('Escala territorial invalida.')


def catalogo(codigo=None, territorialidade='municipios'):
    category = categoria(codigo) if codigo is not None else None
    source = backend(territorialidade)
    return {'attributes': source.catalog(), 'municipalities': dados.MUNICIPIOS, 'crs': source.CRS,
            'featureCount': source.MUNICIPIOS, 'territorialidade': territorialidade,
            'keyField': 'CD_SETOR' if territorialidade == 'setores_2022' else 'CD_MUN',
            'territoryLabel': 'setores censitários' if territorialidade == 'setores_2022' else 'municípios',
            'geometryYear': source.ANO_MALHA, 'categoria': category, 'destino': DESTINO}


LIMITE_GLOSSARIO = 300


def previa(codigo, payload):
    if codigo is not None:
        categoria(codigo)
    source = backend(payload.get('territorialidade', 'municipios'))
    items = source.selection(payload['attributes'])
    frame = (source.layer(items[:8], limit=5) if source is not dados else source.layer(items[:8])).drop(columns='geometry').head(5)
    # O glossario descreve a tabela de atributos da camada que sera gerada.
    todas_entradas = source.dicionario(items, payload.get('format', 'fgb'))
    entradas = todas_entradas[:LIMITE_GLOSSARIO]
    por_campo = {entry['campo_bruto']: entry for entry in todas_entradas}
    nomes = {item['field']: por_campo[item['field']]['campo_exportado'] for item in items[:8]}
    frame = frame.rename(columns=nomes)
    fixos = [{'campo_exportado': campo, 'alias': rotulo, 'significado': texto,
              'campo_bruto': campo, 'fonte': source.ORIGEM_MALHA, 'tema': 'Malha territorial',
              'ano': source.ANO_MALHA, 'unidade': None}
             for campo, (rotulo, texto) in source.CAMPOS_FIXOS.items()]
    return {'rows': json.loads(frame.to_json(orient='records')),
            'fields': [nomes[item['field']] for item in items[:8]], 'totalAttributes': len(items),
            'fixedFields': list(source.CAMPOS_FIXOS),
            'aliases': {entry['campo_exportado']: entry['alias'] for entry in fixos + todas_entradas},
            'glossario': fixos + entradas, 'glossarioLimite': LIMITE_GLOSSARIO,
            'keyField': 'CD_SETOR' if source is not dados else 'CD_MUN'}


def base_arquivos(nome: str, territorialidade='municipios') -> str:
    """municipios_sp + identificador curto + o nome que o usuário deu."""
    texto = unicodedata.normalize('NFKD', str(nome)).encode('ascii', 'ignore').decode()
    # 40 caracteres: o nome completo fica no banco; aqui o caminho precisa caber.
    texto = re.sub(r'[^a-zA-Z0-9]+', '_', texto).strip('_').lower()[:40].strip('_')
    curto = uuid4().hex[:8]
    return '_'.join(parte for parte in (backend(territorialidade).PREFIXO, curto, texto) if parte)


def materializar(payload, folder=None, base=None, controle=None):
    """Reabre pelo GDAL; sem montagem retorna caminho None e mantém tudo em RAM."""
    source = backend(payload.get('territorialidade', 'municipios'))
    base = base or source.PREFIXO
    package = source.export_layer(payload, base, controle) if controle else source.export_layer(payload, base)
    fmt = payload['format']
    components = {}
    with ZipFile(io.BytesIO(package)) as archive:
        for member in archive.infolist():
            if (Path(member.filename).name != member.filename or '\\' in member.filename
                    or member.filename in components):
                raise ValueError('Pacote municipal com caminho inválido.')
            components[member.filename] = archive.read(member)
    path = None
    if folder is None:
        from api.services.arquivos_geoespaciais_memoria import ler_vetor
        frame = ler_vetor(components, f'{base}.{fmt}')
    else:
        for name, content in components.items():
            with (folder/name).open('xb') as stream:
                stream.write(content)
        path = folder/f'{base}.{fmt}'
        dataset = gdal.OpenEx(str(path), gdal.OF_VECTOR | gdal.OF_READONLY)
        if dataset is None or dataset.GetLayerCount() != 1:
            raise ValueError('A exportação deve conter uma camada vetorial.')
        dataset = None
        frame = gpd.read_file(path, engine='pyogrio')
    key, pattern = ('CD_MUN', r'\d{7}') if source is dados else ('CD_SETOR', r'\d{15}')
    if len(frame) != source.MUNICIPIOS:
        raise ValueError(f'A camada gerada não contém as {source.MUNICIPIOS} unidades territoriais.')
    if frame.crs is None or frame.crs.to_epsg() != 4674 or not frame[key].is_unique or not frame[key].str.fullmatch(pattern).all():
        raise ValueError('CRS ou códigos territoriais inválidos.')
    manifest = json.loads(components[f'{base}_metadados.json'])
    if any(item['export_field'] not in frame for item in manifest['attributes']):
        raise ValueError('Um atributo selecionado não foi materializado.')
    return package, path, manifest, frame


def gerar(codigo, payload, nome, user, controle=None):
    category = categoria(codigo)
    if not _lock.acquire(blocking=False):
        raise ValueError('Há uma camada municipal sendo gerada. Aguarde e tente novamente.')
    execution = None
    try:
        source = backend(payload.get('territorialidade', 'municipios'))
        name = nome.strip()[:200] or nome_padrao(category, source.selection(payload['attributes']))
        params = {'plugin': 'municipal-layer', 'versao': '1.0.0', 'categoria': category,
                  **payload, 'nome_saida': name}
        execution = ciclo.iniciar('gerar_camada_municipal', params, str(user.id))
        # O nome sai antes da exportação: é ele que batiza a pasta e os arquivos.
        base = base_arquivos(name, payload.get('territorialidade', 'municipios'))
        from api.storage_policy import TemporaryDirectory, sem_montagem
        from api.repositories import camada_geoespacial_repository as camadas, saidas_geoespaciais_repository as catalogo
        from api.services import saidas_storage
        with (nullcontext(None) if sem_montagem() else TemporaryDirectory(prefix='sicard-municipal-')) as temporary:
            folder = Path(temporary) if temporary is not None else None
            package, _, manifest, frame = materializar(payload, folder, base, controle) if controle else materializar(payload, folder, base)
            if controle: controle.concluir_fase(2)
            ident = 'camada_' + uuid4().hex
            metadata = {'origem_ferramenta':'municipal-layer', 'base_arquivos':base,
                        'categoria_extracao':category, 'execucao_id':execution,
                        'manifesto':manifest, 'feicoes':len(frame), 'colunas':list(frame.columns)}
            if controle:controle.fase(3,'Registrando a camada validada no Sicard Storage',cancelavel=False)
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
            if controle: controle.concluir_fase(3)
            return package, {'id':ident,'arquivo':metadata['caminho_arquivo'],
                             'pacote_caminho':archive['caminho'],'pacote_sha256':archive['sha256'],
                             'execucao_id':execution,'nome':name}
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
