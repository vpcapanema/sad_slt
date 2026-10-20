"""Interseções independentes OGR, soma por feição e saída integral no storage."""
from __future__ import annotations

import json
import math
import re
import unicodedata
from hashlib import sha256
from io import BytesIO
from pathlib import PurePosixPath
from uuid import NAMESPACE_URL, uuid4, uuid5

import geopandas as gpd
import pandas as pd
from pyogrio import read_info
from osgeo import gdal

from api.services import extracao_ogr as ogr
from api.services import extracao_preparacao as previa
from api.services import ciclo_vida_arquivos as ciclo, storage_geoespacial as storage
from api.services import storage_remoto, saidas_storage
from api.services.arquivos_geoespaciais_memoria import vetor
from api.services.bancada_camada_original import preparar as descritor_original
from api.services.controle_processamento import ControleProcessamento
from api.services.normalizacao_demanda import CRS_METRICO
from api.services.pastas_storage import nome_valido
from api.services import extracao_atributos_aliases as aliases

SUFIXO = '_elegibilidade_territorial'
ABREVIACOES = {
    'app': 'app', 'unidade_conservacao': 'uc', 'unidade_de_conservacao': 'uc',
    'terra_indigena': 'ti', 'quilombo': 'quil', 'inundacao': 'inund',
    'erosao': 'eros', 'escorregamento': 'escor', 'incendio': 'inc',
}


def nome_saida(nome: str) -> str:
    nome = nome.strip()
    if PurePosixPath(nome).suffix.lower() in {'.gpkg', '.shp', '.fgb', '.geojson', '.json', '.kml', '.zip'}:
        nome = PurePosixPath(nome).stem
    return nome_valido(f'{nome}{SUFIXO}.gpkg')


def campo_saida(nome: str, papel: str, existentes: set[str]) -> str:
    texto = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode().lower()
    texto = re.sub(r'[^a-z0-9]+', '_', texto).strip('_')
    radical = ('re_' if papel == 'restricao' else 'ri_') + ABREVIACOES.get(texto, texto or 'camada')[:48]
    campo = radical
    numero = 2
    while campo.casefold() in existentes:
        campo = f'{radical}_{numero}'
        numero += 1
    existentes.add(campo.casefold())
    return campo


def _validar(frame: gpd.GeoDataFrame, nome: str, *, entrada=False) -> None:
    if frame.crs is None:
        raise ValueError(f'{nome}: CRS ausente.')
    if not frame.columns.is_unique or len({str(c).casefold() for c in frame.columns}) != len(frame.columns):
        raise ValueError(f'{nome}: nomes de campos repetidos.')
    if entrada and frame.empty:
        raise ValueError(f'{nome}: a entrada não contém feições.')
    for pos, value in enumerate(frame.geometry, 1):
        geom = ogr.geometry(value)
        if geom is None or geom.IsEmpty() or not geom.IsValid():
            raise ValueError(f'{nome}: geometria vazia ou inválida na feição {pos}. Nenhum registro foi descartado.')
        if entrada and geom.GetDimension() != 2:
            raise ValueError(f'{nome}: a entrada da bancada deve ser poligonal.')


def calcular(entrada: gpd.GeoDataFrame, bases, controle: ControleProcessamento, *,
             intersecoes: list[dict] | None = None):
    """Bases iteradas uma a uma; nenhuma interseção vira entrada da seguinte."""
    _validar(entrada, 'Entrada', entrada=True)
    saida = gpd.GeoDataFrame(entrada.copy())
    campo_id = next((c for c in entrada.columns if c.casefold() == 'id_feicao'), None)
    if campo_id:
        if entrada[campo_id].isna().any() or entrada[campo_id].duplicated().any():
            raise ValueError('ID_FEICAO deve ser único e não nulo. A entrada não foi alterada.')
    else:
        campo_id = 'ID_FEICAO'
        saida[campo_id] = range(1, len(saida) + 1)
    ids = saida[campo_id].tolist()
    controle.fase(1, 'Preparar cópia integral da entrada e conferir identificadores')
    metrica = ogr.reproject(entrada, CRS_METRICO, progress=controle.mensagem)
    existentes = {str(c).casefold() for c in saida.columns}
    campo_area = 'area_total_m2'
    while campo_area.casefold() in existentes:
        campo_area += '_'
    saida[campo_area] = [ogr.area(geom) for geom in metrica.geometry]
    if any(not math.isfinite(v) or v <= 0 for v in saida[campo_area]):
        raise ValueError('A entrada contém área total não positiva ou não finita.')
    existentes.add(campo_area.casefold())
    controle.concluir_fase(1)
    campos = []
    feicoes_base = {}
    for numero, (papel, nome, ident, base) in enumerate(bases, 1):
        controle.verificar()
        if numero == 1:
            controle.fase(2, 'Analisar as bases de elegibilidade')
        controle.iniciar_operacao(f'Base {numero}: {nome} — interseção, área e soma por {campo_id}')
        _validar(base, nome)
        base_metrica = ogr.reproject(base, CRS_METRICO, name=nome, progress=controle.mensagem)
        campo = campo_saida(nome, papel, existentes)
        info = aliases.camada(ident, nome)
        nomes_colunas = {str(c).casefold(): c for c in base.columns if c != base.geometry.name}
        campo_nome = next((nomes_colunas[c.casefold()] for c in
                           [info.get('campo_nome'), 'nome', 'name', 'denominacao', 'denominação', 'nm_feicao', 'nm_unidcon']
                           if c and c.casefold() in nomes_colunas), None)
        totais = {}
        overlay = ogr.LayerOverlay(base_metrica.geometry, progress=controle.mensagem)
        try:
            for pos, pos_base, geometria in overlay.records(metrica.geometry, operation='Intersection'):
                controle.verificar()
                area = ogr.area(geometria)
                if not math.isfinite(area) or area < 0:
                    raise ValueError(f'{nome}: área de interseção inválida.')
                ident_feicao = ids[pos]
                totais[ident_feicao] = totais.get(ident_feicao, 0.) + area
                if pos_base is None:
                    raise ValueError(f'{nome}: interseção sem vínculo com a feição de origem.')
                feicao_id = f'{ident}::feicao:{pos_base}'
                valor_nome = base.iloc[pos_base][campo_nome] if campo_nome else None
                rotulo = str(valor_nome).strip() if valor_nome is not None and pd.notna(valor_nome) else ''
                feicoes_base[feicao_id] = {'id': feicao_id, 'base_id': ident, 'nome': rotulo or f'Feição {pos_base + 1}',
                                          'papel': papel, 'tipo': 'feicao', 'posicao': pos_base,
                                          'campo_nome': campo_nome}
                if intersecoes is not None:
                    intersecoes.append({'demanda_pos': pos, 'base_id': ident, 'feicao_id': feicao_id,
                                        'area_m2': area, 'geometry': geometria})
        finally:
            overlay.close()
        saida[campo] = pd.array([totais.get(ident) for ident in ids], dtype='Float64')
        campos.append({'id': ident, 'nome': nome, 'papel': papel, 'campo': campo, 'unidade': 'm²'})
        controle.concluir(mensagem=f'{nome}: campo {campo} preenchido; interseções vinculadas à saída.')
    controle.concluir_fase(2)
    return saida, {'campo_id': campo_id, 'crs_calculo': f'EPSG:{CRS_METRICO}',
                   'unidade': 'm²', 'campos': campos, 'feicoes': len(saida),
                   'campo_area_total': campo_area, 'feicoes_base': list(feicoes_base.values()),
                   'camada_intersecoes': 'intersecoes', 'versao_saida': 2,
                   'agregacao': 'Soma das áreas dos fragmentos por ID_FEICAO, sem união ou dissolução'}


def serializar(saida: gpd.GeoDataFrame, auditoria: dict, intersecoes: list[dict], arquivo: str) -> dict[str, bytes]:
    fid, geom = '__sicard_fid__', '__sicard_geom__'
    colunas = {str(c).casefold() for c in saida.columns}
    while fid.casefold() in colunas:
        fid += '_'
    while geom.casefold() in colunas:
        geom += '_'
    conteudos = vetor(saida, arquivo, 'GPKG', layer='elegibilidade_territorial', FID=fid, GEOMETRY_NAME=geom,
                      layer_metadata={'SICARD_ELEGIBILIDADE': json.dumps(auditoria, ensure_ascii=False)})
    recortes = gpd.GeoDataFrame(intersecoes, columns=['demanda_pos', 'base_id', 'feicao_id', 'area_m2', 'geometry'],
                               geometry='geometry', crs=CRS_METRICO)
    complemento = vetor(recortes, 'intersecoes.gpkg', 'GPKG', layer='intersecoes', geometry_type='Unknown')
    prefixo = f'/vsimem/elegibilidade-{uuid4().hex}'
    destino, origem = prefixo + '.gpkg', prefixo + '-intersecoes.gpkg'
    try:
        gdal.FileFromMemBuffer(destino, conteudos[arquivo])
        gdal.FileFromMemBuffer(origem, complemento['intersecoes.gpkg'])
        dataset = gdal.VectorTranslate(destino, origem, accessMode='update', layerName='intersecoes')
        if dataset is None:
            raise RuntimeError('Não foi possível gravar as interseções no GeoPackage de saída.')
        dataset = None
        conteudos[arquivo] = bytes(gdal.VSIGetMemFileBuffer_unsafe(destino))
    finally:
        gdal.Unlink(origem)
        gdal.Unlink(destino)
    reabertos = gpd.read_file(BytesIO(conteudos[arquivo]), engine='pyogrio', layer='intersecoes')
    if len(reabertos) != len(recortes) or any(bytes(a.wkb) != bytes(b.wkb)
                                             for a, b in zip(recortes.geometry, reabertos.geometry)):
        raise ValueError('As geometrias das interseções não foram preservadas na saída.')
    try:
        pd.testing.assert_frame_equal(pd.DataFrame(recortes.drop(columns='geometry')),
                                      pd.DataFrame(reabertos.drop(columns='geometry')),
                                      check_dtype=False, check_exact=True)
    except AssertionError as exc:
        raise ValueError('Os vínculos ou as áreas das interseções não foram preservados.') from exc
    return conteudos


def _carregar(ref: dict):
    ident = ref['id']
    revisao = ref.get('revisao')
    def conferir():
        if ident.startswith('storage:') and revisao:
            arquivo, _ = storage.separar_id(ident)
            estado = storage.resolver(arquivo).stat()
            if revisao != f'{estado.st_mtime_ns}-{estado.st_size}':
                raise ValueError(f"{ref['nome']}: o arquivo mudou após o envio à bancada. Prepare-o novamente.")
    conferir()
    frame, _, _ = previa.carregar(ident)
    if not isinstance(frame, gpd.GeoDataFrame):
        raise ValueError(f"{ref['nome']}: a fonte não retornou uma camada vetorial integral.")
    conferir()
    return frame


def pasta_saida(lote: str, codigo: str | None = None) -> str:
    return saidas_storage.pasta_analise(
        'elegibilidade-territorial', 'elegibilidade-territorial',
        str(uuid5(NAMESPACE_URL, 'sicard:elegibilidade:' + str(lote))),
        hierarquizacao=codigo, fase='fase-1' if codigo else None)


def executar(payload: dict, controle: ControleProcessamento) -> dict:
    entrada_ref = payload['entrada']
    arquivo = nome_saida(entrada_ref['nome'])
    entrada = _carregar(entrada_ref)
    codigo = payload.get('hierarquizacao')
    if codigo:
        caminho, camada = storage.separar_id(entrada_ref['id'])
        info = read_info(BytesIO(storage_remoto.baixar(caminho)), layer=camada)
        metadados = (info.get('layer_metadata') or {}).get('SICARD_NORMALIZACAO')
        try:
            normalizacao = json.loads(metadados) if metadados else {}
        except json.JSONDecodeError as exc:
            raise ValueError('Os metadados de origem da entrada são inválidos.') from exc
        origem = normalizacao.get('origem') if isinstance(normalizacao, dict) else None
        if not isinstance(origem, dict) or origem.get('hierarquizacao') != codigo:
            raise ValueError('A entrada não foi preparada a partir da hierarquização informada.')
    def bases():
        for papel in ('restricao', 'risco'):
            for ref in payload[papel]:
                controle.verificar()
                controle.mensagem(f"Ler base integral de {papel}: {ref['nome']}")
                yield papel, ref['nome'], ref['id'], _carregar(ref)
    intersecoes = []
    saida, auditoria = calcular(entrada, bases(), controle, intersecoes=intersecoes)
    auditoria['entrada'] = entrada_ref
    if codigo:
        auditoria['hierarquizacao'] = codigo
    lote = str(payload.get('lote_id') or uuid4().hex)
    pasta = pasta_saida(lote, codigo)
    auditoria['pasta_analise'] = pasta
    arquivo = f'{PurePosixPath(arquivo).stem}_{sha256(entrada_ref["id"].encode()).hexdigest()[:12]}.gpkg'
    controle.mensagem('Gravar GeoPackage em memória e reabrir para conferir integridade')
    conteudos = serializar(saida, auditoria, intersecoes, arquivo)
    reaberta = gpd.read_file(BytesIO(conteudos[arquivo]), engine='pyogrio', layer='elegibilidade_territorial')
    if len(reaberta) != len(saida) or reaberta.crs != saida.crs or any(
            bytes(a.wkb) != bytes(b.wkb) for a, b in zip(saida.geometry, reaberta.geometry)):
        raise ValueError('A saída gravada não preservou as geometrias integrais da entrada.')
    try:
        pd.testing.assert_frame_equal(
            pd.DataFrame(saida).drop(columns=saida.geometry.name).reset_index(drop=True),
            pd.DataFrame(reaberta).drop(columns=reaberta.geometry.name).reset_index(drop=True),
            check_dtype=False, check_exact=True)
    except AssertionError as exc:
        raise ValueError('A saída gravada não preservou os atributos ou os valores calculados.') from exc
    controle.fase(3, 'Persistir saída conferida no storage', cancelavel=False)
    saidas_storage.garantir_pasta(pasta)
    exportacao = ciclo.registrar_exportacao_memoria(arquivo, conteudos, entrada_ref['id'], 'vetor', pasta_saida=pasta)
    caminho = exportacao['caminho']
    ident = f'storage:{caminho}::elegibilidade_territorial'
    try:
        descritor = descritor_original(ident, caminho)
    except Exception as exc:
        raise RuntimeError(f'A saída foi gravada em {caminho}, mas não foi possível prepará-la para visualização: {exc}') from exc
    controle.concluir_fase(3)
    return {**descritor, 'nome': arquivo, 'tipo': 'vetor', 'representacao': 'tiles',
            'sha256': sha256(conteudos[arquivo]).hexdigest(),
            'status_validacao': 'valida', 'camada': 'elegibilidade_territorial',
            'elegibilidade': auditoria, 'exportacao': exportacao, 'pasta_analise': pasta}
