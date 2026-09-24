"""Pacote obrigatório de toda extração de atributos.

Montado em memória ao final da execução e guardado no banco
(geoprocessamento.extracao_atributos): GeoPackage com a geometria resultante e a
entrada, relatório de processamento em PDF, relatório analítico em PDF, planilha
XLSX e tabela CSV. Os arquivos só passam por uma pasta temporária enquanto são
escritos; nada fica no disco. Os relatórios vêm de extracao_atributos_relatorios.
"""
from __future__ import annotations

import io
import json
import platform
import tempfile
import textwrap
import zipfile
from hashlib import sha256
from pathlib import Path

from api.repositories.camada_geoespacial_repository import _json_safe
from api.services import extracao_atributos_aliases as aliases
from api.services import extracao_atributos_exportacao as exportacao
from api.services import extracao_atributos_relatorios as relatorios
from api.services.ciclo_vida_arquivos import apelido

# Chave -> (sufixo do arquivo, rótulo). A ordem é a ordem dentro do .zip.
ARQUIVOS = {
    'gpkg': ('.gpkg', 'GeoPackage com a geometria resultante e a entrada'),
    'pdf_processamento': ('_relatorio_processamento.pdf', 'Relatório de processamento'),
    'pdf_analitico': ('_relatorio_analitico.pdf', 'Relatório analítico'),
    'xlsx': ('_tabela_atributos.xlsx', 'Tabela de atributos da geometria de saída, com as colunas agrupadas por categoria e camada base'),
    'csv': ('_tabela_atributos.csv', 'Tabela de atributos da geometria de saída'),
}


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


def escrever_gpkg(saida, entrada, path: Path, incluir_entrada=True) -> None:
    for camada, frame in ([('resultado', saida), ('entrada', entrada)] if incluir_entrada else [('resultado', saida)]):
        data = _para_gpkg(frame.to_crs(4674))
        extras = {'geometry_type': 'Unknown'} if data.empty else {}
        # Polígonos simples e multipartes na mesma camada gravavam o tipo como
        # "Unknown"; promovidos a multi, a camada tem um tipo só no QGIS.
        data.to_file(path, driver='GPKG', layer=camada, engine='pyogrio', index=False,
                     promote_to_multi=True, **extras)


PALETA = relatorios.PALETA
# Área do mapa em polegadas, na largura útil da página A4 em retrato; a legenda vai abaixo.
FIGURA_MAPA = (7.3, 6.4)


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
    na proporção do mapa. A legenda fica abaixo do mapa, em duas colunas e com os
    nomes quebrados em linhas, para caber inteira na largura da página. Devolve um
    aviso quando o mapa-base não pôde ser baixado.
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
    proporcao = FIGURA_MAPA[0] / FIGURA_MAPA[1]
    if meia_largura / meia_altura < proporcao:
        meia_largura = meia_altura * proporcao
    else:
        meia_altura = meia_largura / proporcao
    x0, x1 = centro_x - meia_largura, centro_x + meia_largura
    y0, y1 = centro_y - meia_altura, centro_y + meia_altura

    fig, ax = plt.subplots(figsize=FIGURA_MAPA, dpi=180)
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    ax.set_aspect('equal')
    legenda = []

    def rotulo(texto):
        return textwrap.fill(texto, 46)

    for indice, (categoria, nome, frame) in enumerate(bases):
        cor = PALETA[indice % len(PALETA)]
        recorte = frame.to_crs(3857).cx[x0:x1, y0:y1]
        if not recorte.empty:
            recorte.plot(ax=ax, facecolor=cor, edgecolor=cor, alpha=.3, linewidth=.7, markersize=12, zorder=10 + indice)
        legenda.append(Patch(facecolor=cor, edgecolor=cor, alpha=.55,
                             label=rotulo(f'{categoria} · {nome} ({len(recorte)} feição(ões) no mapa)')))
    tipos = set(web.geom_type)
    pontos = not tipos & {'Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'}
    # Milhares de pontos com marcador grande cobriam as bases; o marcador diminui com a quantidade.
    marcador = max(2.0, min(20.0, 6000 / max(len(web), 1)))
    if saida is not None and not saida.empty:
        # Pontos atingidos vão por cima da entrada; partes de linha ou polígono ficam abaixo do contorno.
        saida.to_crs(3857).plot(ax=ax, facecolor='#d62728', edgecolor='#8b0000', alpha=.85 if pontos else .6,
                                linewidth=.8, markersize=marcador * 1.6, zorder=47 if pontos else 40)
        legenda.append(Patch(facecolor='#d62728', edgecolor='#8b0000', alpha=.75,
                             label='Pontos dentro de alguma base' if pontos else 'Partes atingidas (interseção)'))
    if tipos & {'Polygon', 'MultiPolygon'}:
        web.boundary.plot(ax=ax, color='#003b5a', linewidth=1.8, zorder=45)
    elif tipos & {'LineString', 'MultiLineString'}:
        web.plot(ax=ax, color='#003b5a', linewidth=2.2, zorder=45)
    else:
        web.plot(ax=ax, color='#003b5a', markersize=marcador, alpha=.7, zorder=45)
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
    ax.legend(handles=legenda, loc='upper left', bbox_to_anchor=(0, -0.012), ncol=2, fontsize=7, frameon=False,
              title='Legenda', title_fontsize=8, alignment='left', columnspacing=1.6, handlelength=1.6)
    # O recorte justo inclui a legenda, que fica fora do quadro do mapa.
    fig.savefig(path, dpi=180, bbox_inches='tight', pad_inches=0.06)
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
                  intersecoes=None, incluir_entrada=True) -> tuple[bytes, str, list[dict]]:
    """Escreve os cinco arquivos, confere cada um e devolve (zip, nome do zip, manifesto)."""
    arquivos = nomes(proc['nome_saida'])
    with tempfile.TemporaryDirectory(prefix='sicard_extracao_') as temporaria:
        pasta = Path(temporaria)
        escrever_gpkg(saida, entrada, pasta / arquivos['gpkg'], incluir_entrada)
        mapa = pasta / 'mapa_localizacao.png'
        # No mapa vão só as interseções: com entrada de pontos a tabela traz também os ausentes.
        aviso_mapa = mapa_png(entrada, [(categoria, aliases.nome_camada(None, nome), frame) for categoria, nome, frame in bases],
                              saida if intersecoes is None else intersecoes, mapa, mapa_base)
        relatorios.pdf_analitico(result, saida, proc, pasta / arquivos['pdf_analitico'], mapa=mapa, aviso_mapa=aviso_mapa)
        exportacao.escrever_xlsx(saida, result['tabela_saida'], pasta / arquivos['xlsx'])
        exportacao.escrever_csv(saida, pasta / arquivos['csv'])
        # O relatório de processamento sai por último para listar tamanho e SHA-256 dos demais arquivos.
        conteudo = []
        for chave, nome in arquivos.items():
            if chave == 'pdf_processamento':
                conteudo.append((nome, ARQUIVOS[chave][1], None, 'este arquivo'))
            else:
                dados = (pasta / nome).read_bytes()
                conteudo.append((nome, ARQUIVOS[chave][1], len(dados), sha256(dados).hexdigest()))
        relatorios.pdf_processamento(result, saida, {**proc, 'arquivos': arquivos},
                                     pasta / arquivos['pdf_processamento'], conteudo)
        manifesto = []
        memoria = io.BytesIO()
        with zipfile.ZipFile(memoria, 'w', zipfile.ZIP_DEFLATED) as pacote:
            for chave, nome in arquivos.items():
                dados = (pasta / nome).read_bytes()
                if not dados:
                    raise ValueError(f'O arquivo {nome} do pacote saiu vazio.')
                pacote.writestr(nome, dados)
                manifesto.append({'chave': chave, 'nome': nome, 'descricao': ARQUIVOS[chave][1] if incluir_entrada or chave != 'gpkg' else 'GeoPackage com a geometria resultante (entrada local temporária não incluída)',
                                  'tamanho_bytes': len(dados), 'sha256': sha256(dados).hexdigest()})
    return memoria.getvalue(), f"{Path(arquivos['gpkg']).stem}.zip", manifesto


def ler_do_pacote(pacote: bytes, nome: str) -> bytes:
    with zipfile.ZipFile(io.BytesIO(pacote)) as arquivo:
        return arquivo.read(nome)
