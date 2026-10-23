"""Apresentação e pacote da elegibilidade a partir das saídas já produzidas."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from hashlib import sha256
from io import BytesIO
import json
import math
from numbers import Real
from pathlib import PurePosixPath
import re
from uuid import uuid4
from zipfile import ZipFile, ZIP_DEFLATED

import geopandas as gpd
from pyogrio import read_info
from pyogrio.errors import DataLayerError, DataSourceError
from reportlab.lib import colors
from reportlab.platypus import Flowable, PageBreak, Spacer, Paragraph
from shapely.geometry import Polygon, MultiPolygon, mapping, box
from shapely.ops import unary_union
from shapely.validation import make_valid

from api.services import elegibilidade_jobs as jobs, storage_remoto, saidas_storage
from api.services.elegibilidade_processamento import pasta_saida, ANALISES, individualizar_intersecoes
from api.services import extracao_atributos_aliases as aliases
from api.services import extracao_preparacao, analise_territorial_ogr as nativo
from osgeo import ogr
from api.services import extracao_atributos_relatorios as estilo
from api.services import elegibilidade_sintese as sintese
from api.services.extracao_atributos_exportacao import registros, texto
from api.services.extracao_ogr import reproject
from api.services.storage_geoespacial import RAIZES_LEITURA

CONECTIVOS = {'a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos', 'e', 'em', 'na', 'nas',
              'no', 'nos', 'por', 'para', 'com', 'sem', 'à', 'às', 'ao', 'aos'}
SIGLAS = {'APP', 'APA', 'UC', 'TI', 'IBGE', 'DER', 'DNIT', 'SP', 'SICARD', 'GIS', 'AHP'}
PAPEIS = {'entrada': 'Entrada', 'restricao': 'Restrição', 'risco': 'Risco',
          'grade': 'Favorabilidade de Grade', 'rede': 'Favorabilidade de Rede'}
CORES = {'restricao': '#852c38', 'risco': '#997400', 'grade': '#176878', 'rede': '#69438a'}
CAMPOS_FAVORABILIDADE = {
    'grade': ('fav_territorial_dim', 'fav_territorial_classe'),
    'rede': ('fav_rede_dim', 'fav_rede_classe'),
}
METODOLOGIA = (
    'Cada base de restrição e risco foi intersectada separadamente com a entrada integral, '
    'utilizando GDAL/OGR. As áreas dos fragmentos foram somadas por identificador da feição, '
    'em metros quadrados, com cálculo em EPSG:5880, sem união ou dissolução. '
    'As geometrias, os atributos e o CRS da entrada da bancada foram preservados. '
    'O travessão indica ausência de interseção (valor nulo); zero indica interseção sem área. '
    'Não se somam bases diferentes para formar um indicador de elegibilidade. '
    'As áreas são apresentadas em km², com equivalência em hectares e percentual da área da demanda. '
    'A rosca reúne todas as entradas e demandas da análise, sem ser limitada pela seleção ou paginação. '
    'Cada fatia representa a área total de uma demanda na soma das áreas de todas as demandas, inclusive sem interseção. '
    'Sobre a mesma fatia são desenhadas camadas semitransparentes com hachuras para cada feição intersectada, '
    'na proporção entre a área da interseção e a área total da demanda, preservando sua identidade de origem. '
    'As representações partem do mesmo início do setor, não indicam a posição geográfica das feições, '
    'não constituem parcelas exclusivas nem são normalizadas pela soma das interseções. '
    'As cores correspondem às categorias do mapa; contatos sem área são consultados na lista da demanda, sem área gráfica fictícia. '
    'Os atributos originais, a área total e os recortes vinculados acompanham as geometrias no mesmo GeoPackage.'
)
NOTA_MAPA = ('O mapa do relatório representa as demandas inteiras e as áreas atingidas por restrição (vermelho) '
             'e por risco (amarelo). Não constitui classificação de elegibilidade. '
             'Coordenadas em EPSG:5880, com escala e norte; sem mapa-base no PDF.')
METODOLOGIA_FAVORABILIDADE = (
    'Cada superfície poligonal de grade e rede foi intersectada separadamente com a entrada integral '
    'preparada pelas regras cadastrais da Elegibilidade, utilizando GDAL/OGR em EPSG:5880. '
    'Somam-se exclusivamente as áreas dos fragmentos por demanda e superfície, sem união ou dissolução. '
    'Os campos fg_* e fr_* registram áreas em m². O travessão indica ausência de interseção; zero indica contato sem área. '
    'Os resultados apresentam fav_territorial_dim e fav_territorial_classe para grade e '
    'fav_rede_dim e fav_rede_classe para rede, lidos dos atributos preservados nos fragmentos. '
    'Cada combinação demanda × feição mantém seu índice e sua classe originais, sem soma, média ou ponderação por área. '
    'Os gráficos de intervalos com pontos, separados por superfície, utilizam escala fixa de 0 a 1, com uma linha por demanda, '
    'identificada somente pelo nome, e um ponto para cada feição intersectada. O traço liga o menor ao maior índice válido, '
    'sem agregar os valores. As cores identificam as feições de origem na legenda. Reúnem todas as combinações das entradas concluídas, '
    'independentemente da seleção, paginação ou ocultação de vazias. Zero é um índice válido. '
    'Campos ausentes, valores nulos e índices inválidos são sinalizados e não substituídos por área ou zero. '
    'As áreas permanecem apenas como informação técnica complementar da interseção. '
    'Os GeoPackages preservam a entrada preparada, as interseções e todos os atributos das superfícies, '
    'inclusive classe nominal e índices com e sem _dim, sem agregá-los. '
    'Esta apresentação não atualiza índices registrados, ranking, pesos AHP ou homologação.'
)
NOTA_MAPA_FAVORABILIDADE = (
    'O mapa representa as demandas inteiras e suas interseções, coloridas pelo índice _dim em '
    'rampa contínua Viridis de 0 a 1. Cinza identifica ausência de índice válido. '
    'A classe nominal é a original da superfície; não há reclassificação ou agregação. '
    'Coordenadas em EPSG:5880, com escala e norte; sem mapa-base no PDF.'
)


def _titulo_analise(analise: str) -> str:
    return 'Favorabilidade Territorial' if analise == 'favorabilidade' else 'Elegibilidade Territorial'


def titulo(valor: str) -> str:
    """Title case em português; a revisão semântica é confirmada pelo usuário."""
    valor = re.sub(r'\s+', ' ', str(valor)).strip()
    if not valor or '_' in valor or re.search(r'[<>/\\\x00-\x1f]', valor) or len(valor) > 160:
        raise ValueError('Informe um nome amigável de até 160 caracteres, sem sublinhados, caminhos ou marcação.')
    if re.search(r'\.(gpkg|shp|fgb|geojson|zip|json|kml)$', valor, re.I):
        raise ValueError('O nome amigável não deve incluir a extensão do arquivo.')
    partes = []
    for indice, palavra in enumerate(valor.split()):
        limpa = palavra.strip('(),;:')
        if indice and palavra.lower() in CONECTIVOS:
            partes.append(palavra.lower())
        elif limpa.upper() in SIGLAS or (limpa.isupper() and 1 < len(limpa) <= 4
                                        and (not valor.isupper() or len(valor.split()) == 1)):
            partes.append(palavra.upper())
        else:
            partes.append(palavra[:1].upper() + palavra[1:].lower())
    return ' '.join(partes)


def _selecionar(identificadores: list[str], dono, *, analise: str = 'elegibilidade') -> list[dict]:
    if not identificadores or len(identificadores) != len(set(identificadores)):
        raise ValueError('Informe as execuções concluídas, sem repetições.')
    resultados = []
    for ident in identificadores:
        job = jobs.consultar(ident, dono) if analise == 'elegibilidade' else jobs.consultar(ident, dono, analise=analise)
        if job['status'] != 'concluido' or not job['resultado']:
            raise ValueError('Aguarde a conclusão do processamento antes de preparar o relatório.')
        resultados.append({**job['resultado'], 'execucao_id': ident})
    if len({r.get('lote_id', r['execucao_id']) for r in resultados}) != 1:
        raise ValueError('O relatório deve reunir somente saídas da mesma execução da página.')
    totais = {r.get('total_entradas', 1) for r in resultados}
    if len(totais) != 1 or len(resultados) > next(iter(totais)):
        raise ValueError('A quantidade de saídas diverge do lote registrado.')
    return resultados


def _fontes(resultados: list[dict], *, analise: str = 'elegibilidade') -> list[dict]:
    fontes = {}
    for resultado in resultados:
        auditoria = resultado[analise]
        for item in [{**auditoria['entrada'], 'papel': 'entrada'}, *auditoria['campos'],
                     *auditoria.get('feicoes_base', [])]:
            ident = item['id']
            if ident in fontes:
                if fontes[ident]['papel'] != item['papel']:
                    raise ValueError('A mesma fonte está associada a papéis conflitantes.')
                continue
            alias = ({'nome': item['nome'], 'origem': 'atributo da feição' if item.get('campo_nome') else 'identificador da feição'}
                     if item.get('tipo') == 'feicao' else aliases.camada(ident, item['nome']))
            sugestao = aliases.automatico(PurePosixPath(alias['nome']).stem
                                         if PurePosixPath(alias['nome']).suffix.lower() in {'.fgb', '.kml', '.zip', '.json'}
                                         else alias['nome'])
            sugestao = re.sub(r'[<>/\\\x00-\x1f]', ' ', sugestao).strip()[:160]
            fontes[ident] = {'id': ident, 'papel': item['papel'], 'nome': titulo(sugestao),
                             'origem': alias['origem'], 'tipo': item.get('tipo', 'camada'),
                             'base_id': item.get('base_id')}
    return list(fontes.values())


def _pasta_resultados(resultados: list[dict], *, analise: str = 'elegibilidade') -> str:
    pastas = set()
    codigos = set()
    for resultado in resultados:
        auditoria = resultado[analise]
        pasta = auditoria.get('pasta_analise')
        caminho = PurePosixPath(resultado['arquivo'])
        if len(caminho.parts) > 1 and caminho.parts[1] in {
                'hierarquizacoes', 'analises-avulsas', 'exportacoes'}:
            try:
                saidas_storage.validar(str(caminho))
            except ValueError:
                # Arquivos avulsos também podem estar em pastas escolhidas pelo usuário.
                pass
            else:
                pasta = str(caminho.parent)
        pastas.add(pasta if pasta and str(caminho.parent) == pasta else None)
        codigo = auditoria.get('hierarquizacao')
        if codigo is not None and not isinstance(codigo, str):
            raise ValueError('O código da hierarquização nos metadados da saída é inválido.')
        codigos.add(codigo)
    if len(pastas) == 1 and None not in pastas:
        pasta = pastas.pop()
        saidas_storage.validar(pasta + '/analise.json')
        return pasta
    codigo = next(iter(codigos)) if len(codigos) == 1 else None
    referencia = (resultados[0].get('lote_id') if len(resultados) > 1 else None) or resultados[0]['arquivo']
    return pasta_saida(referencia, codigo, analise=analise)


def _caminho_revisao_legada(resultado: dict, dono, *, analise: str = 'elegibilidade') -> str:
    if resultado.get('origem') != 'arquivo':
        return resultado['arquivo'] + '.nomes.json'
    usuario = sha256(str(dono).encode()).hexdigest()
    arquivo = sha256(resultado['arquivo'].encode()).hexdigest()
    return f'saidas-geoespaciais/{analise}-revisoes/{usuario}/{arquivo}.json'


def _caminho_revisao(resultado: dict, dono, *, analise: str = 'elegibilidade') -> str:
    usuario = sha256(str(dono).encode()).hexdigest()
    arquivo = sha256(resultado['arquivo'].encode()).hexdigest()
    return f'{_pasta_resultados([resultado], analise=analise)}/revisoes/{usuario}/{arquivo}.json'


def preparar(identificadores: list[str], dono, *, analise: str = 'elegibilidade') -> dict:
    resultados = _selecionar(identificadores, dono, analise=analise)
    fontes = _fontes(resultados, analise=analise)
    salvos = {}
    for resultado in resultados:
        caminhos = [_caminho_revisao(resultado, dono, analise=analise),
                    _caminho_revisao_legada(resultado, dono, analise=analise)]
        if resultado.get('origem') == 'arquivo':
            caminhos.append(resultado['arquivo'] + '.nomes.json')
        for caminho in caminhos:
            try:
                revisao = json.loads(storage_remoto.baixar(caminho))
            except FileNotFoundError:
                continue
            if not isinstance(revisao, dict) or not isinstance(revisao.get('nomes'), dict):
                raise ValueError('O arquivo de revisão dos nomes possui estrutura inválida.')
            if revisao.get('sha256') != resultado['sha256'] or revisao.get('dono') != str(dono):
                if resultado.get('origem') == 'arquivo':
                    continue
                raise ValueError('A revisão de nomes não corresponde ao proprietário ou à saída atual.')
            if any(not isinstance(k, str) or not isinstance(v, str) for k, v in revisao['nomes'].items()):
                raise ValueError('A revisão de nomes contém valores inválidos.')
            salvos.update(revisao['nomes'])
            break
    for fonte in fontes:
        if fonte['id'] in salvos:
            fonte['nome'] = titulo(salvos[fonte['id']])
    return {'fontes': fontes, 'revisados': bool(fontes) and all(f['id'] in salvos for f in fontes),
            'concluidas': len(resultados),
            'previstas': resultados[0].get('total_entradas', len(resultados))}


def salvar_nomes(identificadores: list[str], modelo: dict, dono, *, analise: str = 'elegibilidade') -> None:
    nomes = {f['id']: f['nome'] for f in modelo['fontes']}
    for resultado in _selecionar(identificadores, dono, analise=analise):
        dados = json.dumps({'dono': str(dono), 'sha256': resultado['sha256'], 'nomes': nomes},
                           ensure_ascii=False).encode('utf-8')
        caminho = _caminho_revisao(resultado, dono, analise=analise)
        storage_remoto.enviar_bytes(caminho, dados)
        if storage_remoto.baixar(caminho) != dados:
            raise ValueError('A revisão de nomes não foi preservada no storage. Confirme novamente.')


def _caminho_nomes_demandas(resultado: dict, dono) -> str:
    return _caminho_revisao(resultado, dono).removesuffix('.json') + '.demandas.json'


def _nome_demanda(nome: str) -> str:
    nome = nome.strip()
    if not nome or len(nome) > 200 or re.search(r'[\x00-\x1f\x7f]', nome):
        raise ValueError('Informe um nome de demanda de até 200 caracteres, sem caracteres de controle.')
    return nome


def _nomes_demandas(resultado: dict, dono) -> dict[str, str]:
    try:
        revisao = json.loads(storage_remoto.baixar(_caminho_nomes_demandas(resultado, dono)))
    except FileNotFoundError:
        return {}
    if (not isinstance(revisao, dict) or revisao.get('dono') != str(dono)
            or revisao.get('sha256') != resultado['sha256'] or not isinstance(revisao.get('nomes'), dict)):
        raise ValueError('A revisão dos nomes das demandas não corresponde ao proprietário ou à saída atual.')
    nomes = revisao['nomes']
    for chave, nome in nomes.items():
        if (not isinstance(chave, str) or not chave.isascii() or not chave.isdecimal()
                or str(int(chave)) != chave or not 0 <= int(chave) < resultado['elegibilidade']['feicoes']
                or not isinstance(nome, str) or _nome_demanda(nome) != nome):
            raise ValueError('A revisão dos nomes das demandas contém valores inválidos.')
    return nomes


def renomear_demanda(execucao: str, chave: str, nome: str, dono) -> dict:
    resultado = _selecionar([execucao], dono)[0]
    frame, _ = _ler(resultado)
    nome = _nome_demanda(nome)
    if (not chave.isascii() or not chave.isdecimal() or str(int(chave)) != chave
            or not 0 <= int(chave) < len(frame)):
        raise ValueError('Selecione uma demanda existente nesta saída da análise.')
    nomes = _nomes_demandas(resultado, dono)
    nomes[chave] = nome
    dados = json.dumps({'dono': str(dono), 'sha256': resultado['sha256'], 'nomes': nomes,
                        'atualizado_em': datetime.now(timezone.utc).isoformat()},
                       ensure_ascii=False).encode('utf-8')
    caminho = _caminho_nomes_demandas(resultado, dono)
    storage_remoto.enviar_bytes(caminho, dados)
    try:
        confirmacao = storage_remoto.baixar(caminho)
    except FileNotFoundError as exc:
        raise RuntimeError('Não foi possível confirmar a gravação do nome da demanda no Storage.') from exc
    if confirmacao != dados:
        raise ValueError('O nome da demanda não foi confirmado no Storage. Tente salvar novamente.')
    return {'execucao': execucao, 'chave': chave, 'nome': nome}


def registrar_relatorios(identificadores: list[str], modelo: dict, dono, *, analise: str = 'elegibilidade') -> None:
    from api.services import hierarquizacao_service
    from api.services.hierarquizacao_service import registrar_saida_geoespacial_fase1

    fase = 1 if analise == 'elegibilidade' else 2
    grupos = {}
    for resultado in _selecionar(identificadores, dono, analise=analise):
        codigo = resultado[analise].get('hierarquizacao')
        if codigo:
            grupos.setdefault(codigo, []).append(resultado)
    documentos = []
    for codigo, resultados in grupos.items():
        ids = {r['execucao_id'] for r in resultados}
        fontes = {f['id'] for f in _fontes(resultados, analise=analise)}
        recorte = {**modelo,
                   'entradas': [e for e in modelo['entradas'] if e['id'] in ids],
                   'fontes': [f for f in modelo['fontes'] if f['id'] in fontes],
                   'concluidas': len(resultados),
                   'previstas': resultados[0].get('total_entradas', len(resultados))}
        dados = pdf(recorte)
        caminho = f'{_pasta_resultados(resultados, analise=analise)}/Relatório de {_titulo_analise(analise)}_{uuid4().hex[:12]}.pdf'
        assinatura = sha256(dados).hexdigest()
        storage_remoto.enviar_bytes(caminho, dados)
        if sha256(storage_remoto.baixar(caminho)).hexdigest() != assinatura:
            raise ValueError('O PDF no Storage diverge do relatório conferido. O vínculo não foi registrado.')
        documento = {'arquivo': caminho, 'sha256': assinatura, 'gerado_em': modelo['gerado_em'],
                     'nomes_revisados': True, 'registrado_por': str(dono)}
        registro = documento
        if fase == 1:
            # O Resumo da Elegibilidade acompanha o PDF e a camada no relatório da Fase 1 da hierarquização.
            planilha = sintese.xlsx_resumo(recorte)
            caminho_planilha = f'{_pasta_resultados(resultados, analise=analise)}/Resumo da Elegibilidade_{uuid4().hex[:12]}.xlsx'
            assinatura_planilha = sha256(planilha).hexdigest()
            storage_remoto.enviar_bytes(caminho_planilha, planilha)
            if sha256(storage_remoto.baixar(caminho_planilha)).hexdigest() != assinatura_planilha:
                raise ValueError('A planilha do resumo no Storage diverge da conferida. O vínculo não foi registrado.')
            registro = {**documento,
                        'tabela_resumo': {'arquivo': caminho_planilha, 'sha256': assinatura_planilha,
                                          'gerado_em': modelo['gerado_em']},
                        'resumo_elegibilidade': sintese.resumo_para_registro(recorte)}
        for resultado in resultados:
            if fase == 1:
                registrar_saida_geoespacial_fase1(codigo, resultado, dono, registro)
            else:
                hierarquizacao_service.registrar_saida_geoespacial(codigo, fase, resultado, dono, registro)
            # Idempotente: completa o registro de análises reabertas, que não passaram pelo fim do cálculo.
            hierarquizacao_service.registrar_resultado_por_demanda(codigo, fase, resultado, dono)
        hierarquizacao_service.atualizar_nomes_resultado(codigo, fase, {f['id']: f['nome'] for f in recorte['fontes']})
        documentos.append({'hierarquizacao': codigo, **documento})
    if documentos:
        modelo['relatorios_hierarquizacao'] = documentos


def _mapa(frame: gpd.GeoDataFrame, ocorrencias: list[bool], recortes=None,
          papeis: dict[str, str] | None = None, *, analise: str = 'elegibilidade') -> dict:
    projetada = reproject(frame, 5880)
    xmin, ymin, xmax, ymax = map(float, projetada.total_bounds)
    if not all(math.isfinite(v) for v in (xmin, ymin, xmax, ymax)):
        raise ValueError('A camada não possui extensão válida para o mapa-síntese.')
    escala = min(660 / max(xmax - xmin, 1), 320 / max(ymax - ymin, 1))
    dx = (720 - (xmax - xmin) * escala) / 2
    dy = (400 - (ymax - ymin) * escala) / 2
    formas = []
    for geom, ocorre in zip(projetada.geometry, ocorrencias):
        if isinstance(geom, MultiPolygon):
            poligonos = list(geom.geoms)
        elif isinstance(geom, Polygon):
            poligonos = [geom]
        else:
            raise ValueError('O mapa-síntese exige a saída poligonal da elegibilidade.')
        for poligono in poligonos:
            aneis = []
            for anel in [poligono.exterior, *poligono.interiors]:
                aneis.append([[round(dx + (p[0] - xmin) * escala, 3),
                               round(400 - dy - (p[1] - ymin) * escala, 3)] for p in anel.coords])
            formas.append({'aneis': aneis, 'intersecao': ocorre})
    def adicionar(geom, cor):
        if hasattr(geom, 'geoms'):
            for parte in geom.geoms:
                adicionar(parte, cor)
            return
        aneis = [geom.exterior, *geom.interiors] if isinstance(geom, Polygon) else [geom]
        forma = {'aneis': [[[round(dx + (p[0] - xmin)*escala, 3),
                            round(400-dy-(p[1]-ymin)*escala, 3)] for p in anel.coords] for anel in aneis],
                 'intersecao': True, 'cor': cor, 'tipo': geom.geom_type}
        if analise == 'favorabilidade' and isinstance(geom, Polygon):
            forma['sem_borda'] = True
        formas.append(forma)
    if recortes and recortes['features']:
        if papeis is None:
            raise ValueError('As categorias das interseções são necessárias para o mapa.')
        projetados = reproject(gpd.GeoDataFrame.from_features(recortes, crs=4326), 5880)
        for r, geom in zip(registros(projetados), projetados.geometry):
            base_id = r['base_id']
            if not isinstance(base_id, str) or base_id not in papeis:
                raise ValueError('Interseção sem categoria de origem no mapa.')
            adicionar(geom, cor_favorabilidade(r['indice_favorabilidade'])
                      if analise == 'favorabilidade' else CORES[papeis[base_id]])
    return {'largura': 720, 'altura': 400, 'formas': formas, 'metros_escala': 100 / escala,
            'cor_intersecao': '#1769aa', 'cor_ausencia': '#eef3f7',
            'nota': NOTA_MAPA_FAVORABILIDADE if analise == 'favorabilidade' else NOTA_MAPA}


def _conferir_estrutura(frame: gpd.GeoDataFrame, auditoria: dict) -> None:
    exigidos = [auditoria['campo_id'], *(c['campo'] for c in auditoria['campos'])]
    if len(frame) != auditoria['feicoes'] or any(c not in frame for c in exigidos):
        raise ValueError('A estrutura da saída diverge dos metadados da análise.')
    if frame.crs is None or frame.geometry.isna().any() or frame.geometry.is_empty.any() or not frame.geometry.is_valid.all():
        raise ValueError('A saída contém geometrias inválidas ou não informa o CRS.')


def _ler(resultado: dict, *, analise: str = 'elegibilidade') -> tuple[gpd.GeoDataFrame, bytes]:
    dados = storage_remoto.baixar(resultado['arquivo'])
    if not resultado.get('sha256') or sha256(dados).hexdigest() != resultado['sha256']:
        raise ValueError('A camada de saída mudou ou não possui assinatura verificável. Não será emitido um relatório divergente.')
    frame = gpd.read_file(BytesIO(dados), engine='pyogrio', layer=ANALISES[analise]['camada'])
    _conferir_estrutura(frame, resultado[analise])
    return frame, dados


def _auditoria(dados: bytes, *, analise: str = 'elegibilidade') -> dict:
    config = ANALISES[analise]
    info = read_info(BytesIO(dados), layer=config['camada'])
    metadados = info.get('layer_metadata') or {}
    if info.get('driver') != 'GPKG' or config['metadados'] not in metadados:
        raise ValueError(f'O GeoPackage não contém os metadados de uma análise de {analise} territorial.')
    try:
        auditoria = json.loads(metadados[config['metadados']])
    except json.JSONDecodeError as exc:
        raise ValueError(f'Os metadados de {analise} do GeoPackage são inválidos.') from exc
    if not isinstance(auditoria, dict) or auditoria.get('versao_saida') != 2:
        raise ValueError('Esta saída não contém o painel interativo. Execute novamente para gravar áreas totais e interseções.')
    if 'hierarquizacao' in auditoria and (not isinstance(auditoria['hierarquizacao'], str) or not auditoria['hierarquizacao']):
        raise ValueError('A identificação da hierarquização nos metadados é inválida.')
    if (not all(isinstance(auditoria.get(c), str) and auditoria[c]
                for c in ('campo_id', 'campo_area_total', 'camada_intersecoes'))
            or type(auditoria.get('feicoes')) is not int or auditoria['feicoes'] <= 0
            or not isinstance(auditoria.get('entrada'), dict)
            or not all(isinstance(auditoria['entrada'].get(c), str) and auditoria['entrada'][c] for c in ('id', 'nome'))
            or not isinstance(auditoria.get('campos'), list)
            or not isinstance(auditoria.get('feicoes_base'), list)):
        raise ValueError(f'Os metadados de {analise} não identificam a entrada, os campos e as interseções.')
    for campo in auditoria['campos']:
        if (not isinstance(campo, dict)
                or not all(isinstance(campo.get(c), str) and campo[c] for c in ('id', 'nome', 'campo'))
                or campo.get('papel') not in config['papeis']):
            raise ValueError(f'Os metadados contêm uma base de {analise} inválida.')
    bases = {c['id']: c['papel'] for c in auditoria['campos']}
    fontes = [auditoria['entrada']['id'], *(c['id'] for c in auditoria['campos'])]
    for feicao in auditoria['feicoes_base']:
        if (not isinstance(feicao, dict)
                or not all(isinstance(feicao.get(c), str) and feicao[c] for c in ('id', 'nome', 'base_id'))
                or feicao.get('tipo') != 'feicao' or feicao['base_id'] not in bases
                or feicao.get('papel') != bases[feicao['base_id']]
                or type(feicao.get('posicao')) is not int or feicao['posicao'] < 0):
            raise ValueError('Os metadados contêm uma feição de origem inválida.')
        fontes.append(feicao['id'])
    if len(fontes) != len(set(fontes)) or len({c['campo'] for c in auditoria['campos']}) != len(auditoria['campos']):
        raise ValueError(f'Os metadados contêm identificadores ou campos de {analise} repetidos.')
    return auditoria


def abrir(arquivo: str, dono, *, analise: str = 'elegibilidade') -> dict:
    caminho = PurePosixPath(arquivo)
    if (not caminho.parts or caminho.parts[0] not in RAIZES_LEITURA
            or caminho.is_absolute() or '..' in caminho.parts or '\\' in arquivo
            or str(caminho) != arquivo or caminho.suffix.lower() != '.gpkg'):
        raise ValueError('Selecione um GeoPackage em uma pasta acessível do Storage.')
    dados = storage_remoto.baixar(arquivo)
    try:
        auditoria = _auditoria(dados, analise=analise)
        frame = gpd.read_file(BytesIO(dados), engine='pyogrio', layer=ANALISES[analise]['camada'])
        _conferir_estrutura(frame, auditoria)
        nomes = {f['id']: f['nome'] for f in _fontes([{analise: auditoria}], analise=analise)}
        _painel(frame, dados, auditoria, nomes, _linhas(frame, auditoria), analise=analise)
    except (DataSourceError, DataLayerError) as exc:
        raise ValueError(f'O arquivo não é um GeoPackage de {analise} válido com as camadas de resultados e interseções.') from exc
    resultado = {'arquivo': arquivo, 'sha256': sha256(dados).hexdigest(), analise: auditoria}
    ident = (jobs.registrar_saida(resultado, dono) if analise == 'elegibilidade'
             else jobs.registrar_saida(resultado, dono, analise=analise))
    return {'execucoes': [ident], **preparar([ident], dono, analise=analise)}


def _linhas(frame: gpd.GeoDataFrame, auditoria: dict) -> list[dict]:
    nome_coluna = next((c for c in frame.columns if c.lower() in {'nome', 'name', 'denominacao', 'denominação'}), None)
    codigo_coluna = next((c for c in frame.columns if c.lower() == 'codigo'), None)
    linhas = []
    for registro in registros(frame):
        areas = [registro[c['campo']] for c in auditoria['campos']]
        if any(v is not None and (not isinstance(v, (int, float, Decimal)) or isinstance(v, bool)
                                  or not math.isfinite(v) or v < 0) for v in areas):
            raise ValueError('A saída contém um valor de área de sobreposição inválido.')
        linhas.append({'id': texto(registro[auditoria['campo_id']]),
                       'nome': texto(registro[nome_coluna]) if nome_coluna and registro[nome_coluna] else '',
                       'codigo_demanda': texto(registro[codigo_coluna]) if auditoria.get('hierarquizacao') and codigo_coluna and registro[codigo_coluna] else None,
                       'areas': areas, 'areas_texto': ['—' if v is None else texto(v) for v in areas]})
    return linhas


def _favorabilidade(registro: dict, papel: str, mapa: dict[str, str]) -> dict:
    campo_indice, campo_classe = CAMPOS_FAVORABILIDADE[papel]
    valor = registro.get(mapa.get(campo_indice))
    indice = None
    if campo_indice not in mapa:
        estado = 'ausente'
    elif valor is None:
        estado = 'nulo'
    elif isinstance(valor, bool) or not isinstance(valor, (Real, Decimal)):
        estado = 'invalido'
    else:
        numero = float(valor)
        estado = 'valido' if math.isfinite(numero) and 0 <= numero <= 1 else 'invalido'
        if estado == 'valido':
            indice = numero
    classe = registro.get(mapa.get(campo_classe))
    campo_original = campo_indice.removesuffix('_dim')
    original = registro.get(mapa.get(campo_original))
    indice_original = None
    if campo_original not in mapa:
        estado_original = 'ausente'
    elif original is None:
        estado_original = 'nulo'
    elif isinstance(original, (Real, Decimal)) and not isinstance(original, bool) and math.isfinite(original):
        estado_original = 'valido'
        indice_original = float(original)
    else:
        estado_original = 'invalido'
    return {'campo_indice': campo_indice, 'campo_classe': campo_classe,
            'indice': indice, 'estado_indice': estado,
            'campo_original': campo_original, 'indice_original': indice_original,
            'estado_original': estado_original,
            'classe': classe, 'estado_classe': 'ausente' if campo_classe not in mapa
            else 'nulo' if classe is None or not str(classe).strip() else 'valido'}

def superficie_elegibilidade(identificador: str, base_id: str, dono, bounds: list[float], tolerancia: float = 0) -> dict:
    resultado = _selecionar([identificador], dono)[0]
    _ler(resultado)
    base = next((c for c in resultado['elegibilidade']['campos'] if c['id'] == base_id), None)
    if base is None:
        raise ValueError('A superfície não pertence a esta análise.')
    if (len(bounds) != 4 or not all(math.isfinite(v) for v in bounds)
            or not -180 <= bounds[0] < bounds[2] <= 180 or not -90 <= bounds[1] < bounds[3] <= 90
            or not math.isfinite(tolerancia) or not 0 <= tolerancia <= .1):
        raise ValueError('Extensão ou resolução de visualização inválida.')
    frame, _, _ = extracao_preparacao.carregar(base_id)
    if not isinstance(frame, nativo.Camada) or frame.crs is None:
        raise ValueError('A superfície não contém uma camada vetorial com CRS.')
    frame = nativo.reproject(frame, 4326)
    oeste, sul, leste, norte = bounds
    janela = ogr.CreateGeometryFromWkt(
        f'POLYGON(({oeste} {sul},{leste} {sul},{leste} {norte},{oeste} {norte},{oeste} {sul}))')
    nomes = {c['nome'].casefold(): c['nome'] for c in frame.campos}
    campo_nome = next((nomes[c] for c in ('nome', 'name', 'nm_mun', 'denominacao') if c in nomes), None)
    features = []
    for pos, (linha, geom) in enumerate(zip(frame.registros, frame.geometrias)):
        if geom is None or geom.IsEmpty():
            continue
        if not geom.IsValid():
            geom = geom.MakeValid()
        if geom is None or geom.IsEmpty() or not geom.IsValid():
            raise ValueError('A superfície atual contém geometria inválida.')
        if not geom.Intersects(janela):
            continue
        geom = geom.Intersection(janela)
        if geom is None:
            raise ValueError('Não foi possível recortar a superfície atual.')
        if geom.IsEmpty():
            continue
        if tolerancia:
            geom = geom.SimplifyPreserveTopology(tolerancia)
        features.append({'type': 'Feature', 'geometry': json.loads(geom.ExportToJson()), 'properties': {
            'base_id': base_id, 'nome': texto(linha[campo_nome]) if campo_nome else f'Feição {pos + 1}'}})
    return {'base_id': base_id, 'papel': base['papel'],
            'origem': 'Fonte original atual; não é uma cópia histórica da rodada. Exibição recortada à vista do mapa.',
            'consultado_em': datetime.now(timezone.utc).isoformat(),
            'geometrias': {'type': 'FeatureCollection', 'features': features}}


def atributos_feicao(identificador: str, base_id: str, posicao: int, dono) -> dict:
    """Atributos da feição de base intersectada, com nomes amigáveis, para o detalhe do mapa."""
    resultado = _selecionar([identificador], dono)[0]
    _ler(resultado)
    auditoria = resultado['elegibilidade']
    base = next((c for c in auditoria['campos'] if c['id'] == base_id), None)
    feicao = next((f for f in auditoria['feicoes_base'] if f['base_id'] == base_id and f['posicao'] == posicao), None)
    if base is None or feicao is None:
        raise ValueError('A feição não pertence a esta análise.')
    frame, _, _ = extracao_preparacao.carregar(base_id)
    if not isinstance(frame, nativo.Camada) or not 0 <= posicao < len(frame.registros):
        raise ValueError('A fonte atual não contém esta feição. A camada pode ter sido alterada desde a análise.')
    registro = frame.registros[posicao]
    campo_nome = feicao.get('campo_nome')
    if campo_nome and registro.get(campo_nome) is not None and str(registro[campo_nome]).strip() != feicao['nome']:
        raise ValueError('A fonte atual diverge da usada na análise; os atributos não foram exibidos.')
    nomes = aliases.camada(base_id, base['nome'])['campos']
    campos = []
    for spec in frame.campos:
        bruto = spec['nome']
        if bruto.startswith('__sicard'):
            continue
        valor = texto(registro.get(bruto))
        campos.append({'campo': bruto, 'alias': nomes.get(bruto) or aliases.automatico(bruto),
                       'valor': valor[:400] + ('…' if len(valor) > 400 else '')})
    return {'base_id': base_id, 'posicao': posicao, 'campos': campos,
            'origem': 'Fonte original atual da camada; não é uma cópia histórica da rodada.',
            'consultado_em': datetime.now(timezone.utc).isoformat()}


def superficie_favorabilidade(identificador: str, base_id: str, dono) -> dict:
    resultado = _selecionar([identificador], dono, analise='favorabilidade')[0]
    _ler(resultado, analise='favorabilidade')
    base = next((c for c in resultado['favorabilidade']['campos'] if c['id'] == base_id), None)
    if base is None:
        raise ValueError('A superfície não pertence a esta análise.')
    frame, _, _ = extracao_preparacao.carregar(base_id)
    if not isinstance(frame, nativo.Camada) or frame.crs is None:
        raise ValueError('A fonte atual não contém uma camada vetorial com CRS.')
    for geom in frame.geometrias:
        if geom is None or geom.IsEmpty():
            raise ValueError('A superfície atual contém geometrias ausentes ou vazias.')
        if ogr.GT_Flatten(geom.GetGeometryType()) not in (ogr.wkbPolygon, ogr.wkbMultiPolygon):
            raise ValueError('A superfície atual deve conter apenas polígonos.')
    mapa = {c['nome'].casefold(): c['nome'] for c in frame.campos}
    campo_nome = next((mapa[c] for c in ('nome', 'name', 'nm_mun', 'municipio') if c in mapa), None)
    geometrias = nativo.reproject(frame, 4326)
    features = []
    for pos, geom in enumerate(geometrias.geometrias):
        if not geom.IsValid():
            geom = geom.MakeValid()
        if geom is None or geom.IsEmpty() or not geom.IsValid():
            raise ValueError('A superfície atual contém geometria inválida sem reparação utilizável.')
        valores = frame.registros[pos]
        features.append({'type': 'Feature', 'geometry': json.loads(geom.ExportToJson()),
                         'properties': {'base_id': base_id, 'posicao': pos,
                                        'nome': texto(valores[campo_nome]) if campo_nome else f'Feição {pos + 1}',
                                        'favorabilidade': _favorabilidade(valores, base['papel'], mapa)}})
    return {'base_id': base_id, 'origem': 'Fonte original atual; não é uma cópia histórica da rodada.',
            'consultado_em': datetime.now(timezone.utc).isoformat(),
            'geometrias': {'type': 'FeatureCollection', 'features': features}}



def cor_favorabilidade(valor: float | None) -> str:
    if valor is None:
        return '#808080'
    cores = ('440154', '3b528b', '21918c', '5ec962', 'fde725')
    posicao = valor * (len(cores) - 1)
    inicio = min(int(posicao), len(cores) - 2)
    fracao = posicao - inicio
    canais = [math.floor(int(cores[inicio][i:i+2], 16) * (1-fracao) +
                         int(cores[inicio+1][i:i+2], 16) * fracao + .5) for i in (0, 2, 4)]
    return '#' + ''.join(f'{canal:02x}' for canal in canais)


def _poligonos_painel(dados, auditoria, nomes, linhas):
    """Normaliza saídas novas e legadas apenas para apresentação, com GDAL/OGR."""
    camada = nativo.reproject(nativo.ler(dados, auditoria['camada_intersecoes']), 5880)
    partes = individualizar_intersecoes(
        [{**r, 'geometry': g} for r, g in zip(camada.registros, camada.geometrias)],
        [l['area_total_m2'] for l in linhas])
    bases = {c['id']: c for c in auditoria['campos']}
    fontes = {f['id']: f for f in auditoria['feicoes_base']}
    for linha in linhas:
        linha['poligonos_sobreposicao'] = []
    features = []
    destino = nativo.referencia(4326)
    for parte in partes:
        pos, origem = parte['demanda_pos'], parte['feicao_id']
        itens = linhas[pos]['poligonos_sobreposicao']
        ident = f"intersecao:{parte['intersecao_id']}"
        item = {'id': ident, 'feicao_origem_id': origem, 'base_id': parte['base_id'],
                'nome': nomes[origem], 'papel': bases[parte['base_id']]['papel'],
                'identificador': fontes[origem]['posicao'] + 1, 'numero_poligono': len(itens) + 1,
                'area_m2': parte['area_m2'], 'percentual': parte['percentual_demanda']}
        itens.append(item)
        geometria = parte['geometry'].Clone()
        geometria.AssignSpatialReference(camada.crs)
        geometria.TransformTo(destino)
        features.append({'type': 'Feature', 'geometry': json.loads(geometria.ExportToJson()),
                         'properties': {'chave': str(pos), 'base_id': parte['base_id'],
                                        'feicao_id': origem, 'poligono_id': ident}})
    return {'type': 'FeatureCollection', 'features': features}


def _area_uniao_risco(recortes: gpd.GeoDataFrame, campos: dict[str, dict]) -> dict[int, float]:
    """Área de cada demanda atingida por alguma camada de risco, sem contar duas vezes o que coincide (EPSG:5880)."""
    if not len(recortes):
        return {}
    riscos = recortes[recortes['base_id'].map(lambda base: campos[base]['papel'] == 'risco')]
    if not len(riscos):
        return {}
    projetados = reproject(riscos, 5880)
    areas: dict[int, list] = {}
    for pos, geometria in zip(projetados['demanda_pos'], projetados.geometry):
        if geometria is None or geometria.is_empty:
            continue
        areas.setdefault(int(pos), []).append(geometria if geometria.is_valid else make_valid(geometria))
    return {pos: float(unary_union(partes).area) for pos, partes in areas.items()}


def _painel(frame: gpd.GeoDataFrame, dados: bytes, auditoria: dict, nomes: dict[str, str], linhas: list[dict], *,
            somente_atributos: bool = False, analise: str = 'elegibilidade') -> dict:
    if auditoria.get('versao_saida') != 2:
        raise ValueError('Esta saída é anterior ao painel interativo. Execute novamente para gravar áreas totais e interseções.')
    campo_area = auditoria['campo_area_total']
    if campo_area not in frame:
        raise ValueError('A saída não contém a área total das demandas.')
    recortes = gpd.read_file(BytesIO(dados), engine='pyogrio', layer=auditoria['camada_intersecoes'])
    if any(c not in recortes for c in ('demanda_pos', 'base_id', 'feicao_id', 'area_m2')) or recortes.crs is None:
        raise ValueError('A camada de interseções não contém os vínculos, as áreas e o CRS da análise.')
    campos = {c['id']: c for c in auditoria['campos']}
    feicoes = {f['id']: f for f in auditoria['feicoes_base']}
    atributos = {}
    if analise == 'favorabilidade':
        for base in auditoria.get('atributos_superficies', []):
            mapa = {nome.casefold(): destino for nome, destino in base['campos'].items()}
            for original in (*CAMPOS_FAVORABILIDADE[base['papel']],
                             CAMPOS_FAVORABILIDADE[base['papel']][0].removesuffix('_dim')):
                if original in mapa and mapa[original] not in recortes:
                    raise ValueError(f'O atributo preservado {original} não existe na camada de interseções.')
            atributos[base['id']] = mapa
    grupos = {}
    vinculos = []
    for r in registros(recortes):
        pos, base, ident = r['demanda_pos'], r['base_id'], r['feicao_id']
        if (pos is None or int(pos) != pos or not 0 <= int(pos) < len(linhas)
                or not isinstance(base, str) or not isinstance(ident, str) or base not in campos or ident not in feicoes):
            raise ValueError('Interseção com vínculo inválido na camada de saída.')
        if (feicoes[ident]['base_id'] != base or not isinstance(r['area_m2'], (int, float, Decimal))
                or not math.isfinite(r['area_m2']) or r['area_m2'] < 0):
            raise ValueError('Interseção com base ou área inválida na camada de saída.')
        vinculos.append({'chave': str(int(pos)), 'base_id': base, 'feicao_id': ident})
        if r.get('intersecao_id') is not None:
            vinculos[-1].update(intersecao_id=r['intersecao_id'], area_m2=r['area_m2'],
                               area_ha=r['area_ha'], percentual_demanda=r['percentual_demanda'])
        grupo = grupos.setdefault((int(pos), ident), {'id': ident, 'base_id': base, 'nome': nomes[ident],
                                                      'papel': campos[base]['papel'], 'area_m2': 0.,
                                                      'identificador': feicoes[ident]['posicao'] + 1})
        grupo['area_m2'] += r['area_m2']
        if r.get('intersecao_id') is not None:
            grupo.setdefault('fragmentos', []).append({
                'intersecao_id': r['intersecao_id'], 'area_m2': r['area_m2'],
                'area_ha': r['area_ha'], 'percentual_demanda': r['percentual_demanda']})
        if analise == 'favorabilidade':
            valor = _favorabilidade(r, campos[base]['papel'], atributos.get(base, {}))
            if 'favorabilidade' in grupo and grupo['favorabilidade'] != valor:
                raise ValueError('Fragmentos da mesma feição possuem índices ou classes divergentes; não serão agregados.')
            grupo['favorabilidade'] = valor
            vinculos[-1]['indice_favorabilidade'] = valor['indice']
    por_demanda = {}
    for (pos, _), grupo in grupos.items():
        por_demanda.setdefault(pos, []).append(grupo)
    perimetros = reproject(frame[[frame.geometry.name]], 5880).length if analise == 'elegibilidade' else None
    uniao_risco = _area_uniao_risco(recortes, campos) if analise == 'elegibilidade' else {}
    for pos, linha in enumerate(linhas):
        total = frame.iloc[pos][campo_area]
        if not isinstance(total, (Real, Decimal)) or not math.isfinite(total) or total <= 0:
            raise ValueError('Área total da demanda inválida na saída.')
        total = float(total)
        sobreposicoes = por_demanda.get(pos, [])
        for campo, esperado in zip(auditoria['campos'], linha['areas']):
            encontrados = [g['area_m2'] for g in sobreposicoes if g['base_id'] == campo['id']]
            if (esperado is None) != (not encontrados) or (esperado is not None and not math.isclose(sum(encontrados), esperado, rel_tol=1e-9, abs_tol=1e-10)):
                raise ValueError('A soma das interseções diverge dos atributos da saída.')
        for grupo in sobreposicoes:
            grupo['percentual'] = grupo['area_m2'] / total * 100
        linha.update(chave=str(pos), area_total_m2=total, sobreposicoes=sobreposicoes)
        if analise == 'elegibilidade':
            linha['risco_area_m2'] = min(total, uniao_risco.get(pos, 0.0))
        if perimetros is not None:
            perimetro = float(perimetros.iloc[pos])
            if not math.isfinite(perimetro) or perimetro <= 0:
                raise ValueError('Perímetro da demanda inválido na saída.')
            linha['perimetro_m'] = perimetro
    if somente_atributos:
        return {}
    geometrias = reproject(frame[[frame.geometry.name]], 4326)
    geometrias_recortes = reproject(recortes, 4326) if len(recortes) else recortes
    return {
        **({'poligonos_intersecoes': _poligonos_painel(dados, auditoria, nomes, linhas)}
           if analise == 'elegibilidade' else {}),
        'hierarquizacao': auditoria.get('hierarquizacao'),
        'geometrias': {'type': 'FeatureCollection', 'features': [
            {'type': 'Feature', 'geometry': mapping(geom), 'properties': {'chave': str(i)}}
            for i, geom in enumerate(geometrias.geometry)]},
        'intersecoes': {'type': 'FeatureCollection', 'features': [
            {'type': 'Feature', 'geometry': mapping(geom), 'properties': propriedades}
            for propriedades, geom in zip(vinculos, geometrias_recortes.geometry)]},
    }


def resumo_por_demanda(resultado: dict, dono, *, analise: str = 'elegibilidade') -> list[dict]:
    """Resultado de cada demanda lido da saída gravada (nomes técnicos; os amigáveis são aplicados depois)."""
    frame, dados = _ler(resultado, analise=analise)
    auditoria = resultado[analise]
    nomes = {f['id']: f['nome'] for f in [auditoria['entrada'], *auditoria['campos'], *auditoria['feicoes_base']]}
    linhas = _linhas(frame, auditoria)
    _painel(frame, dados, auditoria, nomes, linhas, somente_atributos=True, analise=analise)
    return linhas


def sobreposicoes_favorabilidade(identificadores: list[str], dono) -> dict:
    resultados = _selecionar(identificadores, dono, analise='favorabilidade')
    entradas = []
    for resultado in resultados:
        frame, dados = _ler(resultado, analise='favorabilidade')
        auditoria = resultado['favorabilidade']
        nomes = {f['id']: f['nome'] for f in [auditoria['entrada'], *auditoria['campos'], *auditoria['feicoes_base']]}
        linhas = _linhas(frame, auditoria)
        _painel(frame, dados, auditoria, nomes, linhas, somente_atributos=True, analise='favorabilidade')
        entradas.append({'id': resultado['execucao_id'], 'nome': auditoria['entrada']['nome'],
                         'campos': auditoria['campos'], 'linhas': linhas})
    return {'entradas': entradas, 'concluidas': len(resultados),
            'previstas': resultados[0].get('total_entradas', len(resultados))}


def montar(identificadores: list[str], nomes: dict[str, str], dono, revisados: bool, *,
           analise: str = 'elegibilidade') -> tuple[dict, list[tuple[str, bytes]]]:
    if not revisados:
        raise ValueError('Revise e confirme a ortografia, a gramática e o significado dos nomes amigáveis.')
    resultados = _selecionar(identificadores, dono, analise=analise)
    fontes = _fontes(resultados, analise=analise)
    if set(nomes) != {f['id'] for f in fontes}:
        raise ValueError('Os nomes revisados devem corresponder exatamente às fontes desta execução.')
    nomes = {ident: titulo(nome) for ident, nome in nomes.items()}
    nomes_camadas = [nomes[f['id']] for f in fontes if f['tipo'] == 'camada']
    if len({nome.casefold() for nome in nomes_camadas}) != len(nomes_camadas):
        raise ValueError('Use nomes amigáveis distintos para identificar cada camada sem ambiguidade.')
    modelo = {'gerado_em': datetime.now(timezone.utc).isoformat(), 'analise': analise,
              'fontes': [{**f, 'nome': nomes[f['id']]} for f in fontes],
              'concluidas': len(resultados), 'previstas': resultados[0].get('total_entradas', len(resultados)),
              'metodologia': METODOLOGIA_FAVORABILIDADE if analise == 'favorabilidade' else METODOLOGIA,
              'nomes_revisados': True, 'entradas': [],
              'pasta_analise': _pasta_resultados(resultados, analise=analise)}
    arquivos = []
    for indice, resultado in enumerate(resultados, 1):
        frame, conteudo = _ler(resultado, analise=analise)
        audit = resultado[analise]
        campos = [{**c, 'nome': nomes[c['id']]} for c in audit['campos']]
        linhas = _linhas(frame, audit)
        nomes_demandas = _nomes_demandas(resultado, dono) if analise == 'elegibilidade' else {}
        for chave, nome in nomes_demandas.items():
            linhas[int(chave)]['nome'] = nome
        ocorrencias = [any(v is not None for v in linha['areas']) for linha in linhas]
        painel = _painel(frame, conteudo, audit, nomes, linhas, analise=analise)
        entrada = {'id': resultado['execucao_id'], 'nome': nomes[audit['entrada']['id']],
                   'concluido_em': resultado.get('concluido_em'), 'feicoes': len(frame),
                   'com_intersecao': sum(ocorrencias), 'sem_intersecao': len(frame) - sum(ocorrencias),
                   'campos': campos, 'linhas': linhas,
                   'mapa': _mapa(frame, ocorrencias, painel['intersecoes'], {c['id']: c['papel'] for c in campos},
                                 analise=analise),
                   **painel}
        if nomes_demandas:
            entrada['nomes_demandas_revisados'] = nomes_demandas
        modelo['entradas'].append(entrada)
        # Pastas numeradas conservam os nomes originais mesmo quando duas entradas têm o mesmo nome de arquivo.
        arquivos.append((f'Camadas/{indice:02d}/{PurePosixPath(resultado["arquivo"]).name}', conteudo))
    return modelo, arquivos


class MapaPDF(Flowable):
    def __init__(self, mapa):
        super().__init__()
        self.mapa = mapa
        self.width = estilo.LARGURA
        self.height = self.width * 400 / 720

    def draw(self):
        canvas = self.canv
        canvas.saveState()
        canvas.scale(self.width / 720, self.width / 720)
        canvas.setLineWidth(.65)
        canvas.setStrokeColor(estilo.AZUL)
        for forma in self.mapa['formas']:
            cor = forma.get('cor', self.mapa['cor_intersecao'] if forma['intersecao'] else self.mapa['cor_ausencia'])
            canvas.setFillColor(colors.HexColor(cor))
            canvas.setStrokeColor(colors.HexColor(forma.get('cor', '#003b5a')))
            if forma.get('tipo') == 'Point':
                x, y = forma['aneis'][0][0]
                canvas.circle(x, 400-y, 2, fill=1, stroke=1)
                continue
            path = canvas.beginPath()
            for anel in forma['aneis']:
                for indice, (x, y) in enumerate(anel):
                    if indice == 0:
                        path.moveTo(x, 400 - y)
                    else:
                        path.lineTo(x, 400 - y)
                if forma.get('tipo', 'Polygon') == 'Polygon':
                    path.close()
            canvas.drawPath(path, fill=int(forma.get('tipo', 'Polygon') == 'Polygon'),
                            stroke=int(not forma.get('sem_borda', False)), fillMode=0)
        canvas.setFillColor(estilo.AZUL)
        canvas.setFont('Helvetica', 12)
        canvas.drawString(685, 370, 'N')
        canvas.line(690, 330, 690, 360)
        canvas.line(686, 354, 690, 360)
        canvas.line(694, 354, 690, 360)
        canvas.line(25, 18, 125, 18)
        canvas.drawString(25, 25, f'{estilo.numero(self.mapa["metros_escala"])} m')
        canvas.restoreState()


def _numero(valor: float, divisor: float = 1) -> str:
    decimal = Decimal(str(valor)) / Decimal(str(divisor))
    return format(decimal, '.2f' if decimal == 0 or abs(decimal) >= Decimal('.01') else 'f').replace('.', ',')


def _area_pdf(e, valor):
    if valor is None:
        return estilo._p(e, '—', 'cel')
    return Paragraph(f'{_numero(valor, 1e6)} km²<br/><font size="7">{_numero(valor, 1e4)} ha</font>', e['cel'])


def _indice_pdf(valor: dict) -> str:
    if valor['estado_indice'] == 'valido':
        return format(Decimal(str(valor['indice'])).quantize(Decimal('.01'), rounding=ROUND_HALF_UP), '.2f').replace('.', ',')
    return {'ausente': 'Campo ausente', 'nulo': 'Sem valor', 'invalido': 'Índice inválido (exige número de 0 a 1)'}[valor['estado_indice']]


def _classe_pdf(valor: dict) -> str:
    return str(valor['classe']).title() if valor['estado_classe'] == 'valido' else (
        'Campo ausente' if valor['estado_classe'] == 'ausente' else 'Sem classe informada')


def pdf(modelo: dict) -> bytes:
    e = estilo._estilos()
    analise = modelo.get('analise', 'elegibilidade')
    nome_analise = _titulo_analise(analise)
    historia = [estilo._faixa_titulo(e, f'Relatório de {nome_analise}',
                                    'Resultados da Análise de Sobreposição' if analise == 'favorabilidade'
                                    else 'Situação das Demandas quanto a Restrições e Riscos',
                                    f'Emitido em {estilo.hora(modelo["gerado_em"])}'),
                Spacer(1, 12), estilo._p(e, 'Identificação da Análise', 'h1'),
                estilo._p(e, f'Entradas concluídas: {modelo["concluidas"]} de {modelo["previstas"]}.')]
    if analise == 'elegibilidade':
        historia.append(estilo._p(e, sintese.CONCEITO))
    if modelo['concluidas'] != modelo['previstas']:
        historia.append(estilo._p(e, 'RELATÓRIO PARCIAL: somente as entradas concluídas estão incluídas.', 'h2'))
    historia += [estilo._p(e, 'Fontes Utilizadas', 'h1'),
                 estilo._tabela(e, [['Papel', 'Camada'], *[[PAPEIS[f['papel']], f['nome']] for f in modelo['fontes'] if f['tipo'] == 'camada']],
                                [100, estilo.LARGURA - 100]),
                 estilo._p(e, 'Metodologia', 'h1'), estilo._p(e, modelo['metodologia'])]
    for entrada in modelo['entradas']:
        fichas = sintese.caracterizar(entrada) if analise == 'elegibilidade' else []
        caracterizacao = [estilo._p(e, 'Situação das Demandas', 'h2'), sintese.kpis(e, fichas), Spacer(1, 6)] if fichas else []
        processamento = (f'Processamento concluído em {estilo.hora(entrada["concluido_em"])}. '
                         f'Demandas analisadas: {entrada["feicoes"]}; com restrição ou risco: {entrada["com_intersecao"]}; '
                         f'livres de restrições e riscos: {entrada["sem_intersecao"]}.'
                         if analise == 'elegibilidade' else
                         f'Processamento concluído em {estilo.hora(entrada["concluido_em"])}. '
                         f'Total: {entrada["feicoes"]} feições; com interseção: {entrada["com_intersecao"]}; '
                         f'sem interseção: {entrada["sem_intersecao"]}.')
        historia += [PageBreak(), estilo._p(e, entrada['nome'], 'h1'),
                     estilo._p(e, processamento),
                     *caracterizacao,
                     estilo._p(e, 'Mapa-Síntese', 'h2'), MapaPDF(entrada['mapa']),
                     estilo._p(e, 'Demandas: Azul ou Cinza-Claro. Interseções: rampa contínua Viridis do índice _dim (0 a 1); cinza sem índice válido.'
                               if analise == 'favorabilidade'
                               else 'Demandas: azul (com restrição ou risco) e cinza-claro (livres de restrições e riscos). '
                                    'Áreas atingidas: vermelho (restrição) e amarelo (risco).', 'nota'),
                     estilo._p(e, entrada['mapa']['nota'], 'nota')]
        if analise == 'favorabilidade':
            campos = {c['id']: c for c in entrada['campos']}
            historia += [PageBreak(), estilo._p(e, 'Índices e Classes por Demanda e Feição', 'h1'),
                         estilo._p(e, 'Valores originais, sem soma, média ou ponderação por área. Contatos sem área são identificados.')]
            for linha in entrada['linhas']:
                historia.append(estilo._p(e, f'{linha["nome"] or "Demanda"} · {linha["id"]}', 'h2'))
                if not linha['sobreposicoes']:
                    historia.append(estilo._p(e, 'Sem interseção; nenhum índice ou classe atribuído.'))
                    continue
                detalhes = [['Superfície / Feição', 'Campo do Índice', 'Índice (0–1)', 'Classe Original']]
                for item in linha['sobreposicoes']:
                    valor = item['favorabilidade']
                    detalhes.append([
                        f'{PAPEIS[item["papel"]]} · {campos[item["base_id"]]["nome"]} · {item["nome"]} '
                        f'[{item["identificador"]}]' + (' · Contato sem área' if item['area_m2'] == 0 else ''),
                        valor['campo_indice'], _indice_pdf(valor),
                        f'{_classe_pdf(valor)} ({valor["campo_classe"]})',
                    ])
                tabela = estilo._tabela(e, detalhes, [estilo.LARGURA*.36, estilo.LARGURA*.23,
                                                    estilo.LARGURA*.16, estilo.LARGURA*.25])
                tabela.splitInRow = 1
                historia.append(tabela)
            continue
        historia += [PageBreak(), estilo._p(e, f'{entrada["nome"]} — Distribuição das Demandas por Situação', 'h1'),
                     estilo._p(e, sintese.NOTA_LEITURA, 'nota'),
                     sintese.GraficoSituacoes(fichas),
                     estilo._p(e, f'{entrada["nome"]} — Resumo por Demanda', 'h1'),
                     sintese.tabela_resumo(e, fichas, _area_pdf),
                     estilo._p(e, f'{entrada["nome"]} — Resumo da Elegibilidade', 'h1'),
                     estilo._p(e, sintese.NOTA_INDICE, 'nota'),
                     sintese.tabela_resumo_elegibilidade(e, entrada)]
        campos = {c['id']: c for c in entrada['campos']}
        historia += [PageBreak(), estilo._p(e, f'{entrada["nome"]} — Detalhes por Demanda', 'h1')]
        for ficha in sintese.ordenar_por_situacao(fichas):
            linha, nome = ficha['linha'], ficha['nome']
            historia += [estilo._p(e, f'{nome} · {linha["id"]} · {sintese.SITUACOES[ficha["situacao"]]}', 'h2'),
                         estilo._p(e, sintese.descrever(ficha)),
                         estilo._p(e, 'Área da demanda: ' + _numero(linha['area_total_m2'],1e6)
                                   + ' km² (' + _numero(linha['area_total_m2'],1e4) + ' ha).', 'nota')]
            if not linha['sobreposicoes']:
                continue
            detalhes: list[list[object]] = [['Tipo / Camada consultada', 'Restrição ou risco encontrado', 'Área atingida', '% da demanda']]
            for c in linha['sobreposicoes']:
                camada = campos[c['base_id']]['nome']
                detalhes.append([f'{PAPEIS[c["papel"]]} · {camada}', c['nome'],
                               'Apenas toca o limite' if c['area_m2'] == 0 else _area_pdf(e, c['area_m2']),
                               '—' if c['area_m2'] == 0 else _numero(c['percentual']) + '%'])
            tabela = estilo._tabela(e, detalhes, [estilo.LARGURA*.28, estilo.LARGURA*.32,
                                               estilo.LARGURA*.23, estilo.LARGURA*.17])
            tabela.splitInRow = 1
            historia.append(tabela)
        for papel in ANALISES[analise]['papeis']:
            indices = [i for i, campo in enumerate(entrada['campos']) if campo['papel'] == papel]
            for inicio in range(0, len(indices), 4):
                bloco = indices[inicio:inicio + 4]
                cabecalho = ['Identificador', 'Nome', *[entrada["campos"][i]["nome"] for i in bloco]]
                linhas = [cabecalho, *[[r['id'], r['nome'] or '—', *[_area_pdf(e, r['areas'][i]) for i in bloco]]
                                       for r in entrada['linhas']]]
                tabela = estilo._tabela(e, linhas, [65, 95] + [(estilo.LARGURA - 160) / len(bloco)] * len(bloco))
                tabela.splitInRow = 1
                historia += [PageBreak(), estilo._p(e, f'{entrada["nome"]} — Anexo: Matrizes de Área por Camada', 'h1'),
                             estilo._p(e, f'Tabela de {PAPEIS[papel]} — Bloco {inicio // 4 + 1}', 'h2'),
                             tabela]
    buffer = BytesIO()
    estilo._construir(buffer, nome_analise, historia)
    return buffer.getvalue()


def pacote(modelo: dict, arquivos: list[tuple[str, bytes]]) -> tuple[bytes, str]:
    relatorio = pdf(modelo)
    memoria = BytesIO()
    with ZipFile(memoria, 'w', ZIP_DEFLATED) as zipado:
        analise = modelo.get('analise', 'elegibilidade')
        nome_relatorio = f'Relatório de {_titulo_analise(analise)}.pdf'
        zipado.writestr(nome_relatorio, relatorio)
        for nome, dados in arquivos:
            zipado.writestr(nome, dados)
        documentos = []
        if analise == 'elegibilidade':
            documentos = [('Tabelas/Situação das Demandas.xlsx', sintese.xlsx(modelo)),
                          ('Tabelas/Situação das Demandas.csv', sintese.csv_detalhe(modelo)),
                          ('Tabelas/Resumo da Elegibilidade.xlsx', sintese.xlsx_resumo(modelo)),
                          ('Tabelas/Resumo da Elegibilidade.csv', sintese.csv_resumo(modelo)),
                          ('LEIA-ME.txt', sintese.leia_me(modelo, nome_relatorio, [n for n, _ in arquivos]))]
            for nome, dados in documentos:
                zipado.writestr(nome, dados)
        manifesto = {**{k: v for k, v in modelo.items() if k != 'entradas'},
                     'entradas': [{k: v for k, v in item.items() if k not in {'mapa', 'linhas', 'geometrias', 'intersecoes'}} for item in modelo['entradas']],
                     'arquivos': [{'nome': n, 'sha256': sha256(d).hexdigest()} for n, d in arquivos]}
        if documentos:
            manifesto['documentos'] = [{'nome': n, 'sha256': sha256(d).hexdigest()} for n, d in documentos]
        zipado.writestr('Metadados da Análise.json', json.dumps(manifesto, ensure_ascii=False, indent=2))
    dados = memoria.getvalue()
    with ZipFile(BytesIO(dados)) as zipado:
        if zipado.testzip() is not None:
            raise ValueError('O pacote não passou na conferência de integridade.')
    pasta = saidas_storage.pasta_exportacao(modelo['pasta_analise'])
    saidas_storage.validar(pasta + '/analise.json')
    caminho = f'{pasta}/Relatório e Camadas_{uuid4().hex[:12]}.zip'
    storage_remoto.enviar_bytes(caminho, dados)
    if sha256(storage_remoto.baixar(caminho)).digest() != sha256(dados).digest():
        raise ValueError('O pacote no storage diverge do conteúdo conferido.')
    return dados, caminho
