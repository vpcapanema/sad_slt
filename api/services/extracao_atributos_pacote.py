"""Pacote obrigatório de toda extração de atributos.

Montado em memória ao final da execução e guardado no banco
(geoprocessamento.extracao_atributos): GeoPackage com a geometria resultante e a
entrada, relatório de processamento em PDF, relatório analítico em PDF, planilha
XLSX e tabela CSV. Os arquivos só passam por uma pasta temporária enquanto são
escritos; nada fica no disco.
"""
from __future__ import annotations

import io
import json
import platform
import tempfile
import zipfile
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from api.repositories.camada_geoespacial_repository import _json_safe
from api.services import extracao_atributos_exportacao as exportacao
from api.services.ciclo_vida_arquivos import apelido

# Chave -> (sufixo do arquivo, rótulo). A ordem é a ordem dentro do .zip.
ARQUIVOS = {
    'gpkg': ('.gpkg', 'GeoPackage com a geometria resultante e a entrada'),
    'pdf_processamento': ('_relatorio_processamento.pdf', 'Relatório de processamento'),
    'pdf_analitico': ('_relatorio_analitico.pdf', 'Relatório analítico'),
    'xlsx': ('_tabela_atributos.xlsx', 'Tabela de atributos da geometria de saída, com as colunas agrupadas por categoria e camada base'),
    'csv': ('_tabela_atributos.csv', 'Tabela de atributos da geometria de saída'),
}
FUSO = ZoneInfo('America/Sao_Paulo')


def nomes(nome_saida: str) -> dict[str, str]:
    base = apelido(nome_saida, 60) or 'extracao'
    return {chave: f'{base}{sufixo}' for chave, (sufixo, _) in ARQUIVOS.items()}


def _para_gpkg(frame):
    """Colunas de dicionário ou lista viram texto JSON; datas, texto ISO."""
    data = frame.copy()
    if data.geometry.name != 'geometry':
        data = data.rename_geometry('geometry')
    for coluna in data.columns:
        if coluna == 'geometry':
            continue
        valores = [_json_safe(v) for v in data[coluna]]
        if any(isinstance(v, (dict, list)) for v in valores):
            data[coluna] = [None if v is None else json.dumps(v, ensure_ascii=False) for v in valores]
        elif any(hasattr(v, 'isoformat') for v in data[coluna]):
            data[coluna] = valores
    return data


def escrever_gpkg(saida, entrada, path: Path) -> None:
    for camada, frame in (('resultado', saida), ('entrada', entrada)):
        data = _para_gpkg(frame.to_crs(4674))
        extras = {'geometry_type': 'Unknown'} if data.empty else {}
        # Polígonos simples e multipartes na mesma camada gravavam o tipo como
        # "Unknown"; promovidos a multi, a camada tem um tipo só no QGIS.
        data.to_file(path, driver='GPKG', layer=camada, engine='pyogrio', index=False,
                     promote_to_multi=True, **extras)


def _hora(valor) -> str:
    if not valor:
        return '—'
    try:
        instante = datetime.fromisoformat(str(valor))
    except ValueError:
        return str(valor)
    return instante.astimezone(FUSO).strftime('%d/%m/%Y %H:%M:%S')


def _bytes(valor) -> str:
    if valor is None:
        return '—'
    numero, unidade = float(valor), 'B'
    for proxima in ('kB', 'MB', 'GB'):
        if numero < 1000:
            break
        numero, unidade = numero / 1000, proxima
    return f'{numero:,.1f} {unidade}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def pdf_processamento(proc: dict, path: Path) -> None:
    """Como a extração foi feita: parâmetros, procedência, etapas e ambiente."""
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Cell', fontName='Helvetica', fontSize=8, leading=10, wordWrap='CJK'))
    styles['BodyText'].fontSize = 9
    styles['BodyText'].leading = 12
    styles['Title'].textColor = colors.HexColor('#003b5a')
    for nome in ('Heading1', 'Heading2'):
        styles[nome].textColor = colors.HexColor('#003b5a')
        styles[nome].spaceBefore = 8
        styles[nome].spaceAfter = 4

    def p(valor, estilo='BodyText'):
        return Paragraph(escape(str(valor)), styles[estilo])

    def tabela(linhas, larguras=None, cabecalho=True):
        item = Table([[p(v, 'Cell') for v in linha] for linha in linhas], colWidths=larguras,
                     repeatRows=1 if cabecalho else 0, hAlign='LEFT')
        estilo = [('VALIGN', (0, 0), (-1, -1), 'TOP'),
                  ('ROWBACKGROUNDS', (0, 1 if cabecalho else 0), (-1, -1), [colors.white, colors.HexColor('#f5f7f8')]),
                  ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5)]
        if cabecalho:
            estilo += [('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6eff5')),
                       ('LINEBELOW', (0, 0), (-1, 0), .7, colors.HexColor('#02a344'))]
        item.setStyle(TableStyle(estilo))
        return item

    entrada, saida, ambiente = proc['entrada'], proc['saida'], proc['ambiente']
    opcoes = proc.get('opcoes') or {}
    historia = [
        p('SICARD | Relatório de processamento', 'Title'),
        p(f"Extração de atributos · {proc['nome_saida']}", 'Heading2'),
        tabela([
            ['Execução', proc['execucao_id']],
            ['Responsável', proc.get('responsavel') or '—'],
            ['Início', _hora(proc.get('iniciado_em'))],
            ['Fim do processamento', _hora(proc.get('finalizado_em'))],
            ['Duração', f"{proc.get('duracao_segundos', 0):.1f} s".replace('.', ',')],
            ['Operação', {'intersection': 'Interseção', 'identity': 'Identidade'}.get(proc['operacao'], proc['operacao'])],
        ], [150, 590], cabecalho=False),
        # Cada título vai junto com a sua tabela: nada de título sozinho no pé da página.
        KeepTogether([p('Parâmetros do operador de overlay (GDAL/OGR)', 'Heading1'),
                      tabela([['Opção', 'Valor'], *[[chave, 'sim' if valor else 'não'] for chave, valor in opcoes.items()]], [300, 440])]),
        KeepTogether([p('Camada de entrada', 'Heading1'),
        tabela([
            ['Nome', entrada.get('nome')], ['Identificador', entrada.get('id')],
            ['Origem', 'Storage do SICARD' if entrada.get('origem') == 'storage' else 'Banco do SICARD'],
            ['Arquivo', entrada.get('arquivo') or '—'], ['Feições', entrada.get('feicoes')],
            ['CRS de origem', entrada.get('crs') or '—'],
            ['Tamanho / modificação', f"{_bytes(entrada.get('tamanho_bytes'))} · {_hora(entrada.get('modificado_em'))}"
             if entrada.get('origem') == 'storage' else '—'],
            ['SHA-256 do arquivo', entrada.get('sha256') or '—'],
        ], [150, 590], cabecalho=False)]),
        KeepTogether([p('Camadas de base', 'Heading1'),
        p('Lidas do storage no momento da execução. A impressão digital (tamanho, data e SHA-256) '
          'permite verificar se o arquivo ainda é o mesmo.'),
        tabela([['Categoria', 'Camada', 'Arquivo', 'Feições', 'Tamanho', 'Modificado em', 'SHA-256'],
                *[[b.get('categoria'), b.get('nome'), b.get('arquivo') or b.get('id'), b.get('feicoes'),
                   _bytes(b.get('tamanho_bytes')), _hora(b.get('modificado_em')), b.get('sha256') or '—']
                  for b in proc['bases']]],
               [85, 95, 150, 45, 55, 85, 225])]),
        KeepTogether([p('Saída', 'Heading1'),
        tabela([
            ['Camada resultante (banco)', saida.get('camada_resultado_id')],
            ['Feições resultantes', saida.get('feicoes')],
            ['CRS no pacote', 'EPSG:4674 (SIRGAS 2000)'],
            ['Ocorrências', saida.get('ocorrencias')], ['Camadas intersectadas', saida.get('camadas_intersectadas')],
        ], [150, 590], cabecalho=False)]),
        KeepTogether([p('Etapas do processamento', 'Heading1'),
                      tabela([['Horário', 'Etapa'], *[[_hora(e.get('em')), e.get('mensagem')] for e in proc['etapas']]], [120, 620])]),
        KeepTogether([p('Ambiente de execução', 'Heading1'),
                      tabela([[chave, valor] for chave, valor in ambiente.items()], [150, 590], cabecalho=False)]),
        KeepTogether([p('Conteúdo do pacote', 'Heading1'),
                      tabela([['Arquivo', 'Descrição'], *[[nome, ARQUIVOS[chave][1]] for chave, nome in proc['arquivos'].items()]], [300, 440])]),
        Spacer(1, 6),
        p('As medidas e estatísticas estão no relatório analítico. O SHA-256 de cada arquivo do pacote fica '
          'registrado no banco junto com a execução.'),
    ]

    def rodape(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.drawString(36, 20, 'SICARD - Relatório de processamento da extração de atributos')
        canvas.drawRightString(805, 20, f'Página {doc.page}')
        canvas.restoreState()

    SimpleDocTemplate(str(path), pagesize=landscape(A4), rightMargin=36, leftMargin=36, topMargin=32,
                      bottomMargin=34, title='Relatório de processamento - SICARD').build(
        historia, onFirstPage=rodape, onLaterPages=rodape)


PALETA = ['#1769aa', '#e07b24', '#8c4495', '#217f83', '#b58900', '#52812e', '#a34242', '#58657a']
FIGURA_MAPA = (12, 6.25)


def _escala(ax, latitude: float) -> None:
    """Barra de escala em metros reais: o Web Mercator estica as distâncias por 1/cos(latitude)."""
    import math
    x0, x1 = ax.get_xlim()
    y0, y1 = ax.get_ylim()
    fator = math.cos(math.radians(latitude))
    alvo = (x1 - x0) * fator / 5
    base = 10 ** math.floor(math.log10(alvo))
    comprimento = max(m * base for m in (1, 2, 5) if m * base <= alvo)
    tela = comprimento / fator
    xs, ys = x0 + (x1 - x0) * 0.03, y0 + (y1 - y0) * 0.05
    ax.plot([xs, xs + tela], [ys, ys], color='#1b2a38', linewidth=3, solid_capstyle='butt', zorder=50)
    rotulo = f'{comprimento / 1000:g} km' if comprimento >= 1000 else f'{comprimento:g} m'
    ax.text(xs + tela / 2, ys + (y1 - y0) * 0.018, rotulo, ha='center', va='bottom', fontsize=8, zorder=50,
            bbox={'facecolor': 'white', 'edgecolor': 'none', 'alpha': .75, 'pad': 1})


def mapa_png(entrada, bases, saida, path: Path, mapa_base: bool = True) -> str | None:
    """Camada de entrada sobre todas as bases consideradas, com o entorno.

    O enquadramento é a extensão da entrada mais 30% do maior lado (mínimo de 2 km),
    na proporção da página. Devolve um aviso quando o mapa-base não pôde ser baixado.
    """
    import math
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.lines import Line2D
    from matplotlib.patches import Patch

    web = entrada.to_crs(3857)
    minx, miny, maxx, maxy = web.total_bounds
    folga = max(maxx - minx, maxy - miny, 2000) * 0.3
    centro_x, centro_y = (minx + maxx) / 2, (miny + maxy) / 2
    meia_largura, meia_altura = (maxx - minx) / 2 + folga, (maxy - miny) / 2 + folga
    proporcao = FIGURA_MAPA[0] * 0.72 / FIGURA_MAPA[1]
    if meia_largura / meia_altura < proporcao:
        meia_largura = meia_altura * proporcao
    else:
        meia_altura = meia_largura / proporcao
    x0, x1 = centro_x - meia_largura, centro_x + meia_largura
    y0, y1 = centro_y - meia_altura, centro_y + meia_altura

    fig, ax = plt.subplots(figsize=FIGURA_MAPA, dpi=170)
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    ax.set_aspect('equal')
    legenda = []
    for indice, (categoria, nome, frame) in enumerate(bases):
        cor = PALETA[indice % len(PALETA)]
        recorte = frame.to_crs(3857).cx[x0:x1, y0:y1]
        if not recorte.empty:
            recorte.plot(ax=ax, facecolor=cor, edgecolor=cor, alpha=.3, linewidth=.7, markersize=12, zorder=10 + indice)
        legenda.append(Patch(facecolor=cor, edgecolor=cor, alpha=.55,
                             label=f'{categoria} · {nome} ({len(recorte)} no recorte)'))
    if saida is not None and not saida.empty:
        saida.to_crs(3857).plot(ax=ax, facecolor='#d62728', edgecolor='#8b0000', alpha=.6, linewidth=.8,
                                markersize=16, zorder=40)
        legenda.append(Patch(facecolor='#d62728', edgecolor='#8b0000', alpha=.75, label='Área extraída (interseção)'))
    tipos = set(web.geom_type)
    if tipos & {'Polygon', 'MultiPolygon'}:
        web.boundary.plot(ax=ax, color='#003b5a', linewidth=1.8, zorder=45)
    elif tipos & {'LineString', 'MultiLineString'}:
        web.plot(ax=ax, color='#003b5a', linewidth=2.2, zorder=45)
    else:
        web.plot(ax=ax, color='#003b5a', markersize=20, zorder=45)
    legenda.append(Line2D([0], [0], color='#003b5a', linewidth=2, label='Camada de entrada'))

    aviso = None
    if mapa_base:
        try:
            import contextily
            # Esri World Topographic Map (ArcGIS Online, já usado no satélite dos visualizadores).
            # A CARTO passou a exigir chave e o OpenStreetMap bloqueia download de tiles por
            # aplicação: os dois devolviam aviso impresso no lugar do mapa, sem erro.
            contextily.add_basemap(ax, crs='EPSG:3857', source=contextily.providers.Esri.WorldTopoMap,
                                   attribution='Mapa-base: Esri, HERE, Garmin, © colaboradores do OpenStreetMap',
                                   attribution_size=6, zorder=0)
        except Exception:
            aviso = 'O mapa-base não pôde ser carregado no momento da geração.'
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    _escala(ax, math.degrees(math.atan(math.sinh(centro_y / 6378137))))
    ax.annotate('N', xy=(.965, .95), xytext=(.965, .84), xycoords='axes fraction', ha='center', va='center',
                fontsize=10, fontweight='bold', arrowprops={'arrowstyle': '-|>', 'color': '#1b2a38', 'lw': 1.5}, zorder=50)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.legend(handles=legenda, loc='upper left', bbox_to_anchor=(1.01, 1), fontsize=7.5, frameon=False,
              title='Legenda', title_fontsize=8.5, alignment='left')
    # A legenda fica fora do quadro do mapa; o recorte justo evita que ela seja cortada.
    fig.savefig(path, dpi=170, bbox_inches='tight', pad_inches=0.08)
    plt.close(fig)
    return aviso


def ambiente() -> dict[str, str]:
    import geopandas
    import pyogrio
    import shapely
    from osgeo import gdal
    return {'Motor': 'GDAL/OGR', 'GDAL': gdal.VersionInfo('RELEASE_NAME'), 'GeoPandas': geopandas.__version__,
            'Shapely': shapely.__version__, 'pyogrio': pyogrio.__version__, 'Python': platform.python_version()}


def montar_pacote(result: dict, saida, entrada, proc: dict, bases=(), mapa_base: bool = True,
                  intersecoes=None) -> tuple[bytes, str, list[dict]]:
    """Escreve os cinco arquivos, confere cada um e devolve (zip, nome do zip, manifesto)."""
    arquivos = nomes(proc['nome_saida'])
    with tempfile.TemporaryDirectory(prefix='sicard_extracao_') as temporaria:
        pasta = Path(temporaria)
        escrever_gpkg(saida, entrada, pasta / arquivos['gpkg'])
        mapa = pasta / 'mapa_localizacao.png'
        # No mapa vão só as interseções: com entrada de pontos a tabela traz também os ausentes.
        aviso_mapa = mapa_png(entrada, bases, saida if intersecoes is None else intersecoes, mapa, mapa_base)
        exportacao.pdf(result, saida, pasta / arquivos['pdf_analitico'], mapa=mapa, aviso_mapa=aviso_mapa)
        exportacao.escrever_xlsx(saida, result['tabela_saida'], pasta / arquivos['xlsx'])
        exportacao.escrever_csv(saida, pasta / arquivos['csv'])
        pdf_processamento({**proc, 'arquivos': arquivos}, pasta / arquivos['pdf_processamento'])
        manifesto = []
        memoria = io.BytesIO()
        with zipfile.ZipFile(memoria, 'w', zipfile.ZIP_DEFLATED) as pacote:
            for chave, nome in arquivos.items():
                conteudo = (pasta / nome).read_bytes()
                if not conteudo:
                    raise ValueError(f'O arquivo {nome} do pacote saiu vazio.')
                pacote.writestr(nome, conteudo)
                manifesto.append({'chave': chave, 'nome': nome, 'descricao': ARQUIVOS[chave][1],
                                  'tamanho_bytes': len(conteudo), 'sha256': sha256(conteudo).hexdigest()})
    return memoria.getvalue(), f"{Path(arquivos['gpkg']).stem}.zip", manifesto


def ler_do_pacote(pacote: bytes, nome: str) -> bytes:
    with zipfile.ZipFile(io.BytesIO(pacote)) as arquivo:
        return arquivo.read(nome)
