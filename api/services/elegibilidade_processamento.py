"""Interseções independentes OGR, soma por feição e saída integral no storage."""
from __future__ import annotations

import json
import math
import re
import unicodedata
from hashlib import sha256
from pathlib import PurePosixPath
from uuid import NAMESPACE_URL, uuid4, uuid5

from osgeo import gdal, ogr as ogr_api

from api.services import analise_territorial_ogr as ogr
from api.services import ciclo_vida_arquivos as ciclo, storage_geoespacial as storage
from api.services import storage_remoto, saidas_storage
from api.services.bancada_camada_original import preparar as descritor_original
from api.services.controle_processamento import ControleProcessamento
from api.services.normalizacao_demanda import CRS_METRICO
from api.services.pastas_storage import nome_valido
from api.services import extracao_atributos_aliases as aliases

SUFIXO = '_elegibilidade_territorial'
ANALISES = {
    'elegibilidade': {'papeis': ('restricao', 'risco'),
                      'camada': 'elegibilidade_territorial', 'metadados': 'SICARD_ELEGIBILIDADE', 'fase': 'fase-1'},
    'favorabilidade': {'papeis': ('grade', 'rede'),
                       'camada': 'favorabilidade_territorial', 'metadados': 'SICARD_FAVORABILIDADE', 'fase': 'fase-2'},
}
ABREVIACOES = {
    'app': 'app', 'unidade_conservacao': 'uc', 'unidade_de_conservacao': 'uc',
    'terra_indigena': 'ti', 'quilombo': 'quil', 'inundacao': 'inund',
    'erosao': 'eros', 'escorregamento': 'escor', 'incendio': 'inc',
}


def nome_saida(nome: str, *, analise: str = 'elegibilidade') -> str:
    nome = nome.strip()
    if PurePosixPath(nome).suffix.lower() in {'.gpkg', '.shp', '.fgb', '.geojson', '.json', '.kml', '.zip'}:
        nome = PurePosixPath(nome).stem
    return nome_valido(f'{nome}_{ANALISES[analise]["camada"]}.gpkg')


def campo_saida(nome: str, papel: str, existentes: set[str]) -> str:
    texto = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode().lower()
    texto = re.sub(r'[^a-z0-9]+', '_', texto).strip('_')
    prefixos = {'restricao': 're_', 'risco': 'ri_', 'grade': 'fg_', 'rede': 'fr_'}
    radical = prefixos[papel] + ABREVIACOES.get(texto, texto or 'camada')[:48]
    campo = radical
    numero = 2
    while campo.casefold() in existentes:
        campo = f'{radical}_{numero}'
        numero += 1
    existentes.add(campo.casefold())
    return campo


def _validar(frame: ogr.Camada, nome: str, *, entrada=False) -> None:
    if len(frame.registros) != len(frame.geometrias):
        raise ValueError(f'{nome}: quantidade de geometrias e atributos divergente.')
    if frame.crs is None:
        raise ValueError(f'{nome}: CRS ausente.')
    if len({c['nome'].casefold() for c in frame.campos}) != len(frame.campos):
        raise ValueError(f'{nome}: nomes de campos repetidos.')
    if entrada and not len(frame):
        raise ValueError(f'{nome}: a entrada não contém feições.')
    for pos, value in enumerate(frame.geometrias, 1):
        geom = value
        if geom is None or geom.IsEmpty() or not geom.IsValid():
            raise ValueError(f'{nome}: geometria vazia ou inválida na feição {pos}. Nenhum registro foi descartado.')
        if entrada and geom.GetDimension() != 2:
            raise ValueError(f'{nome}: a entrada da bancada deve ser poligonal.')


def calcular(entrada: ogr.Camada, bases, controle: ControleProcessamento, *,
             intersecoes: list[dict] | None = None, analise: str = 'elegibilidade'):
    """Bases iteradas uma a uma; nenhuma interseção vira entrada da seguinte."""
    _validar(entrada, 'Entrada', entrada=True)
    saida = entrada.copiar()
    campo_id = next((c['nome'] for c in entrada.campos if c['nome'].casefold() == 'id_feicao'), None)
    if campo_id:
        ids = [r.get(campo_id) for r in entrada.registros]
        if any(v is None for v in ids) or len(set(ids)) != len(ids):
            raise ValueError('ID_FEICAO deve ser único e não nulo. A entrada não foi alterada.')
    else:
        campo_id = 'ID_FEICAO'
        saida.adicionar(campo_id, ogr_api.OFTInteger64, range(1, len(saida) + 1))
    ids = [r[campo_id] for r in saida.registros]
    controle.fase(1, 'Preparar cópia integral da entrada e conferir identificadores')
    metrica = ogr.reproject(entrada, CRS_METRICO, progress=controle.mensagem)
    existentes = {c['nome'].casefold() for c in saida.campos}
    campo_area = 'area_total_m2'
    while campo_area.casefold() in existentes:
        campo_area += '_'
    areas = [ogr.area(geom) for geom in metrica.geometrias]
    saida.adicionar(campo_area, ogr_api.OFTReal, areas)
    if any(not math.isfinite(v) or v <= 0 for v in areas):
        raise ValueError('A entrada contém área total não positiva ou não finita.')
    existentes.add(campo_area.casefold())
    controle.concluir_fase(1)
    campos = []
    feicoes_base = {}
    atributos_base = []
    campos_fragmentos = {'demanda_pos', 'base_id', 'feicao_id', 'area_m2', 'geometry'}
    for numero, (papel, nome, ident, base) in enumerate(bases, 1):
        controle.verificar()
        if papel not in ANALISES[analise]['papeis']:
            raise ValueError(f'Papel de superfície inválido para {analise}: {papel}.')
        if numero == 1:
            controle.fase(2, f'Analisar as bases de {analise}')
        controle.iniciar_operacao(f'Base {numero}: {nome} — interseção, área e soma por {campo_id}')
        _validar(base, nome)
        if analise == 'favorabilidade' and any(ogr_api.GT_Flatten(g.GetGeometryType()) not in (ogr_api.wkbPolygon, ogr_api.wkbMultiPolygon) for g in base.geometrias):
            raise ValueError(f'{nome}: esta etapa aceita somente superfícies poligonais. Linhas e rasters podem ser visualizados, mas não participam do cálculo de áreas.')
        base_metrica = ogr.reproject(base, CRS_METRICO, name=nome, progress=controle.mensagem)
        campo = campo_saida(nome, papel, existentes)
        atributos = {}
        if analise == 'favorabilidade':
            for spec in base.campos:
                original = spec['nome']
                destino = f'{campo}__{original}'
                while destino.casefold() in campos_fragmentos:
                    destino += '_'
                campos_fragmentos.add(destino.casefold())
                atributos[original] = destino
                saida.campos_intersecoes.append({**spec, 'nome': destino})
            atributos_base.append({'id': ident, 'papel': papel, 'campos': atributos})
        info = aliases.camada(ident, nome)
        nomes_colunas = {c['nome'].casefold(): c['nome'] for c in base.campos}
        campo_nome = next((nomes_colunas[c.casefold()] for c in
                           [info.get('campo_nome'), 'nome', 'name', 'denominacao', 'denominação', 'nm_feicao', 'nm_unidcon']
                           if c and c.casefold() in nomes_colunas), None)
        totais = {}
        overlay = ogr.LayerOverlay(base_metrica.geometrias, progress=controle.mensagem)
        try:
            for pos, pos_base, geometria in overlay.records(metrica.geometrias, operation='Intersection'):
                controle.verificar()
                area = ogr.area(geometria)
                if not math.isfinite(area) or area < 0:
                    raise ValueError(f'{nome}: área de interseção inválida.')
                ident_feicao = ids[pos]
                totais[ident_feicao] = totais.get(ident_feicao, 0.) + area
                if pos_base is None:
                    raise ValueError(f'{nome}: interseção sem vínculo com a feição de origem.')
                feicao_id = f'{ident}::feicao:{pos_base}'
                valor_nome = base.registros[pos_base].get(campo_nome) if campo_nome else None
                rotulo = str(valor_nome).strip() if valor_nome is not None else ''
                feicoes_base[feicao_id] = {'id': feicao_id, 'base_id': ident, 'nome': rotulo or f'Feição {pos_base + 1}',
                                          'papel': papel, 'tipo': 'feicao', 'posicao': pos_base,
                                          'campo_nome': campo_nome}
                if intersecoes is not None:
                    valores = {destino: base.registros[pos_base].get(original) for original, destino in atributos.items()}
                    intersecoes.append({**valores, 'demanda_pos': pos, 'base_id': ident, 'feicao_id': feicao_id,
                                        'area_m2': area, 'geometry': geometria})
        finally:
            overlay.close()
        saida.adicionar(campo, ogr_api.OFTReal, [totais.get(ident) for ident in ids])
        campos.append({'id': ident, 'nome': nome, 'papel': papel, 'campo': campo, 'unidade': 'm²'})
        controle.concluir(mensagem=f'{nome}: campo {campo} preenchido; interseções vinculadas à saída.')
    controle.concluir_fase(2)
    return saida, {'campo_id': campo_id, 'crs_calculo': f'EPSG:{CRS_METRICO}',
                   'unidade': 'm²', 'campos': campos, 'feicoes': len(saida),
                   'campo_area_total': campo_area, 'feicoes_base': list(feicoes_base.values()),
                   'camada_intersecoes': 'intersecoes', 'versao_saida': 2,
                   **({'atributos_superficies': atributos_base, 'indices_agregados': False} if analise == 'favorabilidade' else {}),
                   'agregacao': 'Soma das áreas dos fragmentos por ID_FEICAO, sem união ou dissolução'}


def _geometria_preservada(original, persistida) -> bool:
    return ogr.geometria_preservada(original, persistida)


def serializar(saida: ogr.Camada, auditoria: dict, intersecoes: list[dict], arquivo: str, *,
               analise: str = 'elegibilidade') -> dict[str, bytes]:
    config = ANALISES[analise]
    principal = saida.copiar()
    principal.metadados[config['metadados']] = json.dumps(auditoria, ensure_ascii=False)
    campos = [ogr.campo('demanda_pos', ogr_api.OFTInteger64), ogr.campo('base_id', ogr_api.OFTString),
              ogr.campo('feicao_id', ogr_api.OFTString), ogr.campo('area_m2', ogr_api.OFTReal)]
    recortes = ogr.Camada(campos + saida.campos_intersecoes,
                          [{k: v for k, v in r.items() if k != 'geometry'} for r in intersecoes],
                          [r['geometry'] for r in intersecoes], ogr.referencia(CRS_METRICO))
    colunas = {c['nome'].casefold() for c in saida.campos}
    fid, geom = '__sicard_fid__', '__sicard_geom__'
    while fid.casefold() in colunas:
        fid += '_'
    while geom.casefold() in colunas:
        geom += '_'
    path = f'/vsimem/territorial-saida-{uuid4().hex}.gpkg'
    dataset = layer = None
    try:
        dataset = ogr_api.GetDriverByName('GPKG').CreateDataSource(path)
        layer = ogr.gravar_camada(dataset, config['camada'], principal,
                                  opcoes=[f'FID={fid}', f'GEOMETRY_NAME={geom}'])
        layer = None
        layer = ogr.gravar_camada(dataset, 'intersecoes', recortes)
        layer = dataset = None
        dados = bytes(gdal.VSIGetMemFileBuffer_unsafe(path))
        ogr.conferir(principal, ogr.ler(dados, config['camada']))
        ogr.conferir(recortes, ogr.ler(dados, 'intersecoes'), fragmentos=True)
        return {arquivo: dados}
    finally:
        layer = dataset = None
        gdal.Unlink(path)


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
    frame = ogr.carregar_referencia(ident)
    if not isinstance(frame, ogr.Camada):
        raise ValueError(f"{ref['nome']}: a fonte não retornou uma camada vetorial integral.")
    conferir()
    return frame


def pasta_saida(lote: str, codigo: str | None = None, *, analise: str = 'elegibilidade') -> str:
    ferramenta = f'{analise}-territorial'
    return saidas_storage.pasta_analise(
        ferramenta, ferramenta,
        str(uuid5(NAMESPACE_URL, f'sicard:{analise}:' + str(lote))),
        hierarquizacao=codigo, fase=ANALISES[analise]['fase'] if codigo else None)


def executar(payload: dict, controle: ControleProcessamento, *, analise: str = 'elegibilidade') -> dict:
    config = ANALISES[analise]
    entrada_ref = payload['entrada']
    arquivo = nome_saida(entrada_ref['nome'], analise=analise)
    entrada = _carregar(entrada_ref)
    codigo = payload.get('hierarquizacao')
    if codigo:
        caminho, camada = storage.separar_id(entrada_ref['id'])
        metadados = ogr.ler(storage_remoto.baixar(caminho), camada).metadados.get('SICARD_NORMALIZACAO')
        try:
            normalizacao = json.loads(metadados) if metadados else {}
        except json.JSONDecodeError as exc:
            raise ValueError('Os metadados de origem da entrada são inválidos.') from exc
        origem = normalizacao.get('origem') if isinstance(normalizacao, dict) else None
        if not isinstance(origem, dict) or origem.get('hierarquizacao') != codigo:
            raise ValueError('A entrada não foi preparada a partir da hierarquização informada.')
    def bases():
        for papel in config['papeis']:
            for ref in payload[papel]:
                controle.verificar()
                controle.mensagem(f"Ler base integral de {papel}: {ref['nome']}")
                yield papel, ref['nome'], ref['id'], _carregar(ref)
    intersecoes = []
    saida, auditoria = calcular(entrada, bases(), controle, intersecoes=intersecoes, analise=analise)
    auditoria['entrada'] = entrada_ref
    if codigo:
        auditoria['hierarquizacao'] = codigo
    lote = str(payload.get('lote_id') or uuid4().hex)
    pasta = pasta_saida(lote, codigo, analise=analise)
    auditoria['pasta_analise'] = pasta
    arquivo = f'{PurePosixPath(arquivo).stem}_{sha256(entrada_ref["id"].encode()).hexdigest()[:12]}.gpkg'
    controle.mensagem('Gravar GeoPackage em memória e reabrir para conferir integridade')
    conteudos = serializar(saida, auditoria, intersecoes, arquivo, analise=analise)
    controle.fase(3, 'Persistir saída conferida no storage', cancelavel=False)
    saidas_storage.garantir_pasta(pasta)
    exportacao = ciclo.registrar_exportacao_memoria(arquivo, conteudos, entrada_ref['id'], 'vetor', pasta_saida=pasta)
    caminho = exportacao['caminho']
    ident = f'storage:{caminho}::{config["camada"]}'
    try:
        descritor = descritor_original(ident, caminho)
    except Exception as exc:
        raise RuntimeError(f'A saída foi gravada em {caminho}, mas não foi possível prepará-la para visualização: {exc}') from exc
    controle.concluir_fase(3)
    return {**descritor, 'nome': arquivo, 'tipo': 'vetor', 'representacao': 'tiles',
            'sha256': sha256(conteudos[arquivo]).hexdigest(),
            'status_validacao': 'valida', 'camada': config['camada'],
            analise: auditoria, 'exportacao': exportacao, 'pasta_analise': pasta}
