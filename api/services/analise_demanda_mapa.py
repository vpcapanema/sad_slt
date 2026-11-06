"""Mapa de localização da geometria cadastrada, incluído no parecer em PDF.

A figura tem a largura exata da área impressa no relatório, de modo que a escala
numérica corresponde à impressão em A4. Grade e coordenadas ficam em graus decimais.
"""
from __future__ import annotations

import math
from io import BytesIO
from typing import Any

from api.services.extracao_atributos_pacote import _escala

MAPA_RAZAO_ALTURA = 0.84
# Eixo do mapa dentro da figura, em frações: esquerda, base, largura e altura.
_EIXO = (0.085, 0.075, 0.905, 0.835)
_PASSOS_GRAU = [m * 10 ** k for k in range(-4, 2) for m in (1, 2, 5)]
_COR_BORDA = '#8b0000'
_COR_FACE = '#d62728'
_METROS_POR_POLEGADA = 0.0254


def _passo_grau(extensao: float) -> float:
    return next(passo for passo in _PASSOS_GRAU if extensao / passo <= 5)


def _rotulo_grau(valor: float, passo: float, positivo: str, negativo: str) -> str:
    casas = max(0, -math.floor(math.log10(passo)))
    return f"{abs(valor):.{casas}f}°{positivo if valor >= 0 else negativo}"


def _escala_numerica(metros_no_terreno: float, metros_impressos: float) -> str:
    denominador = metros_no_terreno / metros_impressos
    ordem = 10 ** (math.floor(math.log10(denominador)) - 1)
    return f"1:{int(round(denominador / ordem) * ordem):,}".replace(',', '.')


def _rosa_dos_ventos(ax, largura_pol: float, altura_pol: float) -> None:
    from matplotlib.patches import Polygon
    cx, cy = .93, .86
    raio = .22
    hx = raio / (_EIXO[2] * largura_pol)
    hy = raio / (_EIXO[3] * altura_pol)
    cor = '#1b2a38'
    ax.add_patch(Polygon([(cx, cy + hy), (cx - hx * .55, cy), (cx + hx * .55, cy)], closed=True,
                         transform=ax.transAxes, facecolor=cor, edgecolor=cor, zorder=60))
    ax.add_patch(Polygon([(cx, cy - hy), (cx - hx * .55, cy), (cx + hx * .55, cy)], closed=True,
                         transform=ax.transAxes, facecolor='white', edgecolor=cor, zorder=60))
    rotulo = {'fontsize': 9, 'fontweight': 'bold', 'transform': ax.transAxes, 'zorder': 60, 'color': cor}
    ax.text(cx, cy + hy * 1.2, 'N', ha='center', va='bottom', **rotulo)
    ax.text(cx, cy - hy * 1.2, 'S', ha='center', va='top', **rotulo)
    ax.text(cx + hx * 1.3, cy, 'L', ha='left', va='center', **rotulo)
    ax.text(cx - hx * 1.3, cy, 'O', ha='right', va='center', **rotulo)


def mapa_demanda_png(geometria: dict[str, Any], largura_pol: float, mapa_base: bool = True) -> tuple[bytes, str | None]:
    """PNG com a geometria da demanda, o entorno e a legenda. Devolve também um aviso
    quando o mapa-base não pôde ser baixado."""
    import geopandas as gpd
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.lines import Line2D
    from matplotlib.patches import Patch
    from pyproj import CRS, Transformer

    altura_pol = largura_pol * MAPA_RAZAO_ALTURA
    quadro = gpd.GeoDataFrame.from_features(geometria['geojson']['features'], crs='EPSG:4326').to_crs(3857)
    minx, miny, maxx, maxy = quadro.total_bounds
    folga = max(maxx - minx, maxy - miny, 2000) * 0.6
    centro_x, centro_y = (minx + maxx) / 2, (miny + maxy) / 2
    meia_largura = (maxx - minx) / 2 + folga
    meia_altura = (maxy - miny) / 2 + folga
    proporcao = (_EIXO[2] / _EIXO[3]) * (largura_pol / altura_pol)
    if meia_largura / meia_altura < proporcao:
        meia_largura = meia_altura * proporcao
    else:
        meia_altura = meia_largura / proporcao
    x0, x1 = centro_x - meia_largura, centro_x + meia_largura
    y0, y1 = centro_y - meia_altura, centro_y + meia_altura
    latitude_centro = math.degrees(math.atan(math.sinh(centro_y / 6378137)))

    fig = plt.figure(figsize=(largura_pol, altura_pol), dpi=200)
    ax = fig.add_axes(_EIXO)
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    aviso = None
    if mapa_base:
        try:
            import contextily
            # Mesmo mapa-base de mapa_png: as demais opções exigem chave ou bloqueiam o download.
            contextily.add_basemap(ax, crs='EPSG:3857', source=contextily.providers.Esri.WorldTopoMap,
                                   attribution='Mapa-base: Esri, HERE, Garmin, © colaboradores do OpenStreetMap',
                                   attribution_size=5, zorder=0)
        except Exception:
            aviso = 'O mapa-base não pôde ser carregado no momento da geração.'
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    ax.set_aspect('auto')

    para_geo = Transformer.from_crs(3857, 4326, always_xy=True)
    para_web = Transformer.from_crs(4326, 3857, always_xy=True)
    lon0, lat0 = para_geo.transform(x0, y0)
    lon1, lat1 = para_geo.transform(x1, y1)
    passo_lon = _passo_grau(abs(lon1 - lon0))
    passo_lat = _passo_grau(abs(lat1 - lat0))
    lons = [k * passo_lon for k in range(math.ceil(min(lon0, lon1) / passo_lon),
                                         math.floor(max(lon0, lon1) / passo_lon) + 1)]
    lats = [k * passo_lat for k in range(math.ceil(min(lat0, lat1) / passo_lat),
                                         math.floor(max(lat0, lat1) / passo_lat) + 1)]
    # Em Web Mercator a longitude define só x e a latitude define só y.
    ax.set_xticks([para_web.transform(g, 0)[0] for g in lons],
                  [_rotulo_grau(g, passo_lon, 'L', 'O') for g in lons])
    ax.set_yticks([para_web.transform(0, h)[1] for h in lats],
                  [_rotulo_grau(h, passo_lat, 'N', 'S') for h in lats])
    ax.grid(True, color='#5f6b77', linewidth=.5, linestyle=(0, (3, 3)), alpha=.75, zorder=5)
    ax.tick_params(labelsize=6.5, length=3)

    tipos = set(quadro.geom_type)
    if tipos & {'Polygon', 'MultiPolygon'}:
        quadro.plot(ax=ax, facecolor=_COR_FACE, edgecolor=_COR_BORDA, alpha=.35, linewidth=1.6, zorder=40)
        legenda = [Patch(facecolor=_COR_FACE, edgecolor=_COR_BORDA, alpha=.6, label='Geometria da demanda')]
    elif tipos & {'LineString', 'MultiLineString'}:
        quadro.plot(ax=ax, color=_COR_BORDA, linewidth=2.4, zorder=40)
        legenda = [Line2D([0], [0], color=_COR_BORDA, linewidth=2.4, label='Geometria da demanda')]
    else:
        quadro.plot(ax=ax, color=_COR_FACE, markersize=45, zorder=40)
        legenda = [Line2D([0], [0], marker='o', linestyle='', markerfacecolor=_COR_FACE,
                          markeredgecolor=_COR_BORDA, markersize=7, label='Geometria da demanda')]
    ax.legend(handles=legenda, loc='upper left', fontsize=7.5, title='Legenda', title_fontsize=8,
              framealpha=.92)
    ax.set_xlabel('')
    ax.set_ylabel('')
    _escala(ax, latitude_centro)
    _rosa_dos_ventos(ax, largura_pol, altura_pol)

    metros_no_terreno = (x1 - x0) * math.cos(math.radians(latitude_centro))
    metros_impressos = _EIXO[2] * largura_pol * _METROS_POR_POLEGADA
    nome = (geometria.get('nome') or '').strip()
    rotulo_tipo = (geometria.get('tipo') or '').capitalize()
    titulo = f"Mapa de localização — {rotulo_tipo} {geometria.get('codigo', '')}: {nome}"
    fig.text(_EIXO[0], 0.955, titulo[:110], fontsize=9.5, fontweight='bold', ha='left', va='center')
    fig.text(_EIXO[0] + _EIXO[2], 0.955, f"Escala numérica {_escala_numerica(metros_no_terreno, metros_impressos)}",
             fontsize=8, ha='right', va='center')
    crs_arquivo = geometria.get('crs_arquivo')
    datum = f"{CRS.from_user_input(crs_arquivo).name} ({crs_arquivo})" if crs_arquivo else 'não informado'
    fig.text(_EIXO[0], 0.012,
             f"Datum de origem: {datum} · Projeção de exibição: WGS 84 / Pseudo-Mercator (EPSG:3857) · "
             "Grade em graus decimais (EPSG:4326)", fontsize=6.5, ha='left', va='bottom', color='#3c4650')

    buffer = BytesIO()
    fig.savefig(buffer, format='png', dpi=200)
    plt.close(fig)
    return buffer.getvalue(), aviso
