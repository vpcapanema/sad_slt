"""Apresentação e pacote da elegibilidade a partir das saídas já produzidas."""
from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
import json
import math
from pathlib import PurePosixPath
import re
from uuid import uuid4
from zipfile import ZipFile, ZIP_DEFLATED

import geopandas as gpd
from reportlab.lib import colors
from reportlab.platypus import Flowable, PageBreak, Spacer
from shapely.geometry import Polygon, MultiPolygon

from api.services import elegibilidade_jobs as jobs, storage_remoto
from api.services import extracao_atributos_aliases as aliases
from api.services import extracao_atributos_relatorios as estilo
from api.services.extracao_atributos_exportacao import registros, texto
from api.services.extracao_ogr import reproject
from api.services.arquivos_geoespaciais_memoria import ler_vetor

CONECTIVOS = {'a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos', 'e', 'em', 'na', 'nas',
              'no', 'nos', 'por', 'para', 'com', 'sem', 'à', 'às', 'ao', 'aos'}
SIGLAS = {'APP', 'APA', 'UC', 'TI', 'IBGE', 'DER', 'DNIT', 'SP', 'SICARD', 'GIS', 'AHP'}
PAPEIS = {'entrada': 'Entrada', 'restricao': 'Restrição', 'risco': 'Risco'}
METODOLOGIA = (
    'Cada base de restrição e risco foi intersectada separadamente com a entrada integral, '
    'utilizando GDAL/OGR. As áreas dos fragmentos foram somadas por identificador da feição, '
    'em metros quadrados, com cálculo em EPSG:5880, sem união ou dissolução. '
    'As geometrias, os atributos e o CRS da entrada da bancada foram preservados. '
    'O travessão indica ausência de interseção (valor nulo); zero indica interseção sem área. '
    'Não se somam bases diferentes para formar um indicador de elegibilidade. '
    'Os atributos originais completos acompanham as geometrias no GeoPackage.'
)
NOTA_MAPA = ('O mapa representa as feições inteiras da entrada, não os recortes das interseções. '
             'O destaque indica interseção registrada em ao menos uma base, inclusive contato sem área. '
             'Não constitui classificação de elegibilidade. Coordenadas em EPSG:5880; sem mapa-base.')


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


def _selecionar(identificadores: list[str], dono) -> list[dict]:
    if not identificadores or len(identificadores) != len(set(identificadores)):
        raise ValueError('Informe as execuções concluídas, sem repetições.')
    resultados = []
    for ident in identificadores:
        job = jobs.consultar(ident, dono)
        if job['status'] != 'concluido' or not job['resultado']:
            raise ValueError('Aguarde a conclusão do processamento antes de preparar o relatório.')
        resultados.append({**job['resultado'], 'execucao_id': ident})
    if len({r.get('lote_id', r['execucao_id']) for r in resultados}) != 1:
        raise ValueError('O relatório deve reunir somente saídas da mesma execução da página.')
    totais = {r.get('total_entradas', 1) for r in resultados}
    if len(totais) != 1 or len(resultados) > next(iter(totais)):
        raise ValueError('A quantidade de saídas diverge do lote registrado.')
    return resultados


def _fontes(resultados: list[dict]) -> list[dict]:
    fontes = {}
    for resultado in resultados:
        auditoria = resultado['elegibilidade']
        for item in [{**auditoria['entrada'], 'papel': 'entrada'}, *auditoria['campos']]:
            ident = item['id']
            if ident in fontes:
                if fontes[ident]['papel'] != item['papel']:
                    raise ValueError('A mesma fonte está associada a papéis conflitantes.')
                continue
            alias = aliases.camada(ident, item['nome'])
            sugestao = aliases.automatico(PurePosixPath(alias['nome']).stem
                                         if PurePosixPath(alias['nome']).suffix.lower() in {'.fgb', '.kml', '.zip', '.json'}
                                         else alias['nome'])
            sugestao = re.sub(r'[<>/\\\x00-\x1f]', ' ', sugestao).strip()[:160]
            fontes[ident] = {'id': ident, 'papel': item['papel'], 'nome': titulo(sugestao),
                             'origem': alias['origem']}
    return list(fontes.values())


def preparar(identificadores: list[str], dono) -> dict:
    resultados = _selecionar(identificadores, dono)
    return {'fontes': _fontes(resultados), 'concluidas': len(resultados),
            'previstas': resultados[0].get('total_entradas', len(resultados))}


def _mapa(frame: gpd.GeoDataFrame, ocorrencias: list[bool]) -> dict:
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
    return {'largura': 720, 'altura': 400, 'formas': formas, 'metros_escala': 100 / escala,
            'cor_intersecao': '#1769aa', 'cor_ausencia': '#eef3f7', 'nota': NOTA_MAPA}


def _ler(resultado: dict) -> tuple[gpd.GeoDataFrame, bytes]:
    dados = storage_remoto.baixar(resultado['arquivo'])
    if not resultado.get('sha256') or sha256(dados).hexdigest() != resultado['sha256']:
        raise ValueError('A camada de saída mudou ou não possui assinatura verificável. Não será emitido um relatório divergente.')
    nome = PurePosixPath(resultado['arquivo']).name
    frame = ler_vetor({nome: dados}, nome)
    auditoria = resultado['elegibilidade']
    exigidos = [auditoria['campo_id'], *(c['campo'] for c in auditoria['campos'])]
    if len(frame) != auditoria['feicoes'] or any(c not in frame for c in exigidos):
        raise ValueError('A estrutura da saída diverge da execução registrada.')
    return frame, dados


def montar(identificadores: list[str], nomes: dict[str, str], dono, revisados: bool) -> tuple[dict, list[tuple[str, bytes]]]:
    if not revisados:
        raise ValueError('Revise e confirme a ortografia, a gramática e o significado dos nomes amigáveis.')
    resultados = _selecionar(identificadores, dono)
    fontes = _fontes(resultados)
    if set(nomes) != {f['id'] for f in fontes}:
        raise ValueError('Os nomes revisados devem corresponder exatamente às fontes desta execução.')
    nomes = {ident: titulo(nome) for ident, nome in nomes.items()}
    if len({nome.casefold() for nome in nomes.values()}) != len(nomes):
        raise ValueError('Use nomes amigáveis distintos para identificar cada camada sem ambiguidade.')
    modelo = {'gerado_em': datetime.now(timezone.utc).isoformat(),
              'fontes': [{**f, 'nome': nomes[f['id']]} for f in fontes],
              'concluidas': len(resultados), 'previstas': resultados[0].get('total_entradas', len(resultados)),
              'metodologia': METODOLOGIA, 'nomes_revisados': True, 'entradas': []}
    arquivos = []
    for indice, resultado in enumerate(resultados, 1):
        frame, conteudo = _ler(resultado)
        audit = resultado['elegibilidade']
        campos = [{**c, 'nome': nomes[c['id']]} for c in audit['campos']]
        nome_coluna = next((c for c in frame.columns if c.lower() in {'nome', 'name', 'denominacao', 'denominação'}), None)
        linhas = []
        for registro in registros(frame):
            areas = [registro[c['campo']] for c in campos]
            linhas.append({'id': texto(registro[audit['campo_id']]),
                           'nome': texto(registro[nome_coluna]) if nome_coluna else '',
                           'areas': areas, 'areas_texto': ['—' if v is None else texto(v) for v in areas]})
        ocorrencias = [any(v is not None for v in linha['areas']) for linha in linhas]
        entrada = {'id': resultado['execucao_id'], 'nome': nomes[audit['entrada']['id']],
                   'concluido_em': resultado.get('concluido_em'), 'feicoes': len(frame),
                   'com_intersecao': sum(ocorrencias), 'sem_intersecao': len(frame) - sum(ocorrencias),
                   'campos': campos, 'linhas': linhas, 'mapa': _mapa(frame, ocorrencias)}
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
            canvas.setFillColor(colors.HexColor(self.mapa['cor_intersecao'] if forma['intersecao'] else self.mapa['cor_ausencia']))
            path = canvas.beginPath()
            for anel in forma['aneis']:
                for indice, (x, y) in enumerate(anel):
                    if indice == 0:
                        path.moveTo(x, 400 - y)
                    else:
                        path.lineTo(x, 400 - y)
                path.close()
            canvas.drawPath(path, fill=1, stroke=1, fillMode=0)
        canvas.setFillColor(estilo.AZUL)
        canvas.setFont('Helvetica', 12)
        canvas.drawString(685, 370, 'N')
        canvas.line(690, 330, 690, 360)
        canvas.line(686, 354, 690, 360)
        canvas.line(694, 354, 690, 360)
        canvas.line(25, 18, 125, 18)
        canvas.drawString(25, 25, f'{estilo.numero(self.mapa["metros_escala"])} m')
        canvas.restoreState()


def pdf(modelo: dict) -> bytes:
    e = estilo._estilos()
    historia = [estilo._faixa_titulo(e, 'Relatório de Elegibilidade Territorial', 'Resultados da Análise de Sobreposição',
                                    f'Emitido em {estilo.hora(modelo["gerado_em"])}'),
                Spacer(1, 12), estilo._p(e, 'Identificação da Análise', 'h1'),
                estilo._p(e, f'Entradas concluídas: {modelo["concluidas"]} de {modelo["previstas"]}.')]
    if modelo['concluidas'] != modelo['previstas']:
        historia.append(estilo._p(e, 'RELATÓRIO PARCIAL: somente as entradas concluídas estão incluídas.', 'h2'))
    historia += [estilo._p(e, 'Fontes Utilizadas', 'h1'),
                 estilo._tabela(e, [['Papel', 'Camada'], *[[PAPEIS[f['papel']], f['nome']] for f in modelo['fontes']]],
                                [100, estilo.LARGURA - 100]),
                 estilo._p(e, 'Metodologia', 'h1'), estilo._p(e, modelo['metodologia'])]
    for entrada in modelo['entradas']:
        historia += [PageBreak(), estilo._p(e, entrada['nome'], 'h1'),
                     estilo._p(e, f'Processamento concluído em {estilo.hora(entrada["concluido_em"])}. '
                                  f'Total: {entrada["feicoes"]} feições; com interseção: {entrada["com_intersecao"]}; '
                                  f'sem interseção: {entrada["sem_intersecao"]}.'),
                     estilo._p(e, 'Mapa-Síntese', 'h2'), MapaPDF(entrada['mapa']),
                     estilo._p(e, 'Azul: Com Interseção Registrada. Cinza-Claro: Sem Interseção.', 'nota'),
                     estilo._p(e, NOTA_MAPA, 'nota')]
        for papel in ('restricao', 'risco'):
            indices = [i for i, campo in enumerate(entrada['campos']) if campo['papel'] == papel]
            for inicio in range(0, len(indices), 4):
                bloco = indices[inicio:inicio + 4]
                cabecalho = ['Identificador', 'Nome', *[f'{entrada["campos"][i]["nome"]} (m²)' for i in bloco]]
                linhas = [cabecalho, *[[r['id'], r['nome'] or '—', *[r['areas_texto'][i] for i in bloco]]
                                       for r in entrada['linhas']]]
                tabela = estilo._tabela(e, linhas, [65, 95] + [(estilo.LARGURA - 160) / len(bloco)] * len(bloco))
                tabela.splitInRow = 1
                historia += [PageBreak(), estilo._p(e, entrada['nome'], 'h1'),
                             estilo._p(e, f'Tabela de {PAPEIS[papel]} — Bloco {inicio // 4 + 1}', 'h2'),
                             tabela]
    buffer = BytesIO()
    estilo._construir(buffer, 'Elegibilidade Territorial', historia)
    return buffer.getvalue()


def pacote(modelo: dict, arquivos: list[tuple[str, bytes]]) -> tuple[bytes, str]:
    relatorio = pdf(modelo)
    memoria = BytesIO()
    with ZipFile(memoria, 'w', ZIP_DEFLATED) as zipado:
        zipado.writestr('Relatório de Elegibilidade Territorial.pdf', relatorio)
        for nome, dados in arquivos:
            zipado.writestr(nome, dados)
        manifesto = {**{k: v for k, v in modelo.items() if k != 'entradas'},
                     'entradas': [{k: v for k, v in item.items() if k not in {'mapa', 'linhas'}} for item in modelo['entradas']],
                     'arquivos': [{'nome': n, 'sha256': sha256(d).hexdigest()} for n, d in arquivos]}
        zipado.writestr('Metadados da Análise.json', json.dumps(manifesto, ensure_ascii=False, indent=2))
    dados = memoria.getvalue()
    with ZipFile(BytesIO(dados)) as zipado:
        if zipado.testzip() is not None:
            raise ValueError('O pacote não passou na conferência de integridade.')
    caminho = f'saidas-geoespaciais/relatorios-elegibilidade/{uuid4().hex}/Relatório e Camadas.zip'
    storage_remoto.enviar_bytes(caminho, dados)
    if sha256(storage_remoto.baixar(caminho)).digest() != sha256(dados).digest():
        raise ValueError('O pacote no storage diverge do conteúdo conferido.')
    return dados, caminho
