"""Exporta mapas temáticos dos atributos brutos da Fase 2."""

from __future__ import annotations

import argparse
import json
import sys
import textwrap
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.cm import ScalarMappable
from matplotlib.colors import BoundaryNorm, LinearSegmentedColormap, Normalize, to_rgb
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject, transform_bounds

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from exportar_mapas_fase1_relatorio import (  # noqa: E402
    MAP_CRS,
    STATE_PATH,
    draw_compass_rose,
    draw_scale_bar,
    fixed_extent,
    load_basemap,
    slugify,
)


DATA_DIR = ROOT / "data" / "geoespacial"
OUTPUT_DIR = DATA_DIR / "relatorios" / "mapas_fase2"
GRADE_PATH = DATA_DIR / "outputs" / "favorabilidade_grade.gpkg"
NETWORK_PATH = DATA_DIR / "outputs" / "favorabilidade_rede.gpkg"

GRADE_ATTRIBUTES = {
    "g_pop": ("População residente no setor censitário", "habitantes"),
    "g_dom_tot": ("Domicílios particulares no setor censitário", "domicílios"),
    "g_dom_part": ("Domicílios particulares permanentes", "domicílios"),
    "g_dom_ocup": ("Domicílios particulares permanentes ocupados", "domicílios"),
    "g_mond": ("Média de moradores por domicílio", "moradores por domicílio"),
    "g_alfab15": ("Pessoas alfabetizadas com 15 anos ou mais", "pessoas"),
    "g_agua_rede": ("Domicílios atendidos pela rede geral de água", "domicílios"),
    "g_agua_tot": ("Domicílios considerados no indicador de abastecimento de água", "domicílios"),
    "g_esg_adeq": ("Domicílios com esgotamento sanitário adequado", "domicílios"),
    "g_esg_tot": ("Domicílios considerados no indicador de esgotamento sanitário", "domicílios"),
    "g_lixo_adeq": ("Domicílios com coleta adequada de resíduos", "domicílios"),
    "g_lixo_tot": ("Domicílios considerados no indicador de coleta de resíduos", "domicílios"),
    "g_pib_mun": ("Produto Interno Bruto municipal", "R$"),
    "g_pib_setor": ("Produto Interno Bruto desagregado por setor censitário", "R$"),
    "g_pib_pc": ("Produto Interno Bruto municipal per capita", "R$ por habitante"),
}

NETWORK_ATTRIBUTES = {
    "c1_vdm": ("Volume Diário Médio no subtrecho", "veículos por dia"),
    "c1_vdm_max": ("Volume Diário Médio máximo no subtrecho", "veículos por dia"),
    "c2_vc": ("Relação média entre volume e capacidade", "relação V/C"),
    "c2_vc_max": ("Relação máxima entre volume e capacidade", "relação V/C"),
    "c2_los": ("Pior nível de serviço no subtrecho", "classe A = 1 a F = 6"),
    "c3_cur": ("Velocidade observada no subtrecho", "km/h"),
    "c3_free": ("Velocidade de fluxo livre no subtrecho", "km/h"),
    "c3_ratio": ("Razão entre fluxo livre e velocidade observada", "razão"),
    "c3_delay_s": ("Tempo adicional de percurso no subtrecho", "segundos"),
    "c5_relevo": ("Classe de relevo mais restritiva no subtrecho", "plano = 1 a montanhoso = 3"),
    "c5_v0": ("Velocidade livre de referência no subtrecho", "km/h"),
    "c7_polo_m": ("Distância ao polo logístico relevante mais próximo", "metros"),
    "c8_hidrov_m": ("Distância ao terminal hidroviário mais próximo", "metros"),
    "c9_ferrov_m": ("Distância à ferrovia ativa mais próxima", "metros"),
    "c10_porto_m": ("Distância ao porto mais próximo", "metros"),
    "c10_aero_m": ("Distância ao aeroporto público mais próximo", "metros"),
    "c11_fatal": ("Óbitos em sinistros associados ao subtrecho", "óbitos"),
    "c11_grave": ("Feridos graves em sinistros associados ao subtrecho", "pessoas"),
    "c12_pedes": ("Pedestres envolvidos em sinistros no subtrecho", "pessoas"),
    "c12_bike": ("Ciclistas envolvidos em sinistros no subtrecho", "pessoas"),
    "c12_moto": ("Motociclistas envolvidos em sinistros no subtrecho", "pessoas"),
    "c13_nsin_gr": ("Sinistros graves ou fatais associados ao subtrecho", "sinistros"),
    "c14_urb_m": ("Extensão do subtrecho em área urbanizada", "metros"),
    "c14_dens_m": ("Extensão do subtrecho em área urbanizada densa", "metros"),
    "c14_urb_fr": ("Fração do subtrecho inserida em área urbanizada", "proporção"),
    "c15_port": ("Subtrecho localizado em município portuário", "0 = não; 1 = sim"),
    "c15_urb_m": ("Extensão urbana do subtrecho em município portuário", "metros"),
    "c15_dens_m": ("Extensão urbana densa do subtrecho em município portuário", "metros"),
    "c16_interm_m": ("Distância ao nó intermodal mais próximo", "metros"),
}

END_COLORS = [
    "#245A8D", "#257A57", "#644C9B", "#137C8B", "#8B4A78", "#4267B2",
    "#347A2A", "#76508D", "#176B87", "#81533D", "#4F5DA8", "#187568",
    "#6B477D", "#326B8E", "#52722F", "#5A5387", "#27717B", "#77627F",
    "#385F7D", "#3E7873", "#485FAA", "#3B7660", "#665286", "#2B7482",
    "#79516D", "#446E9E", "#477B48", "#725A91", "#356D73", "#855C50",
    "#5269A6", "#38765A", "#684F78", "#297087", "#6D607F", "#3A678C",
    "#55763C", "#62558A", "#25777A", "#7D5368", "#496C9B", "#41734E",
    "#705984", "#356B7E",
]


def color_map(color: str) -> LinearSegmentedColormap:
    red, green, blue = to_rgb(color)
    light = tuple(0.94 + channel * 0.06 for channel in (red, green, blue))
    return LinearSegmentedColormap.from_list("fase2", [light, color])


def value_limits(values: np.ndarray) -> tuple[float, float]:
    finite = values[np.isfinite(values)]
    if finite.size == 0:
        return 0.0, 1.0
    low = min(0.0, float(np.nanpercentile(finite, 2)))
    high = float(np.nanpercentile(finite, 98))
    if high <= low:
        high = float(np.nanmax(finite))
    return (low, high) if high > low else (low, low + 1.0)


def draw_grade(axis, frame, attribute, cmap, norm, extent) -> None:
    left, right, bottom, top = extent
    native_left, native_bottom, native_right, native_top = transform_bounds(
        MAP_CRS, frame.crs, left, bottom, right, top, densify_pts=21,
    )
    native_transform = from_bounds(native_left, native_bottom, native_right, native_top, 1920, 1080)
    shapes = (
        (geometry, float(value))
        for geometry, value in zip(frame.geometry, frame[attribute])
        if geometry is not None and np.isfinite(value)
    )
    native = rasterize(
        shapes, out_shape=(1080, 1920), transform=native_transform,
        fill=np.nan, dtype="float32",
    )
    image = np.full((1080, 1920), np.nan, dtype="float32")
    reproject(
        source=native, destination=image, src_transform=native_transform, src_crs=frame.crs,
        dst_transform=from_bounds(left, bottom, right, top, 1920, 1080), dst_crs=MAP_CRS,
        src_nodata=np.nan, dst_nodata=np.nan, resampling=Resampling.nearest,
    )
    axis.imshow(
        image, extent=(left, right, bottom, top), origin="upper",
        cmap=cmap, norm=norm, interpolation="nearest", alpha=0.9, zorder=3,
    )


def draw_network(axis, frame, attribute, cmap, norm) -> None:
    frame.plot(ax=axis, color="#D6D8D7", linewidth=1.35, alpha=0.8, zorder=2, rasterized=True)
    valid = frame[frame[attribute].notna()]
    valid.plot(
        ax=axis, column=attribute, cmap=cmap, norm=norm,
        linewidth=2.15, alpha=0.96, zorder=3, rasterized=True,
    )


def export_map(
    frame, group, attribute, alias, unit, color, state, extent, basemap, filename,
    output_dir=OUTPUT_DIR, limits=None, palette=None, quantile_classes=None,
) -> dict:
    values = frame[attribute].to_numpy(dtype="float64", na_value=np.nan)
    minimum, maximum = limits or value_limits(values)
    finite = values[np.isfinite(values)]
    visual_breaks = None
    if quantile_classes and finite.size:
        clipped = finite[(finite >= minimum) & (finite <= maximum)]
        visual_breaks = np.unique(np.quantile(
            clipped if clipped.size else finite,
            np.linspace(0.0, 1.0, quantile_classes + 1),
        ))
        if visual_breaks.size >= 2:
            visual_breaks[0], visual_breaks[-1] = minimum, maximum
            visual_breaks = np.unique(visual_breaks)
            unique_values = np.unique(clipped if clipped.size else finite)
            if visual_breaks.size == 2 and unique_values.size >= 2:
                fallback_classes = min(quantile_classes, unique_values.size)
                visual_breaks = np.linspace(minimum, maximum, fallback_classes + 1)
    if visual_breaks is not None and visual_breaks.size >= 2:
        cmap = LinearSegmentedColormap.from_list(
            "fase2_quantis", palette or ["#F7FCF0", color], visual_breaks.size - 1,
        )
        norm = BoundaryNorm(visual_breaks, cmap.N, clip=True)
    else:
        cmap = LinearSegmentedColormap.from_list("fase2", palette) if palette else color_map(color)
        norm = Normalize(vmin=minimum, vmax=maximum, clip=True)

    figure, axis = plt.subplots(figsize=(16, 9), dpi=120)
    figure.patch.set_facecolor("#F4F3EF")
    axis.set_facecolor("#ECEBE7")
    image, image_extent, _ = basemap
    if image is not None:
        axis.imshow(image, extent=image_extent, interpolation="bilinear", zorder=0)
    if group == "grade":
        draw_grade(axis, frame, attribute, cmap, norm, extent)
    else:
        draw_network(axis, frame, attribute, cmap, norm)

    state.boundary.plot(ax=axis, color="#303638", linewidth=1.55, zorder=5)
    left, right, bottom, top = extent
    axis.set_xlim(left, right)
    axis.set_ylim(bottom, top)
    axis.set_axis_off()
    axis.text(
        0.5, 0.965, alias, transform=axis.transAxes, ha="center", va="top",
        fontsize=17, fontweight="bold", color="#202527",
        bbox={"boxstyle": "square,pad=0.42", "facecolor": "#FFFFFF", "edgecolor": "none", "alpha": 0.9},
        zorder=10,
    )
    colorbar_axis = axis.inset_axes([0.02, 0.055, 0.22, 0.022])
    colorbar = figure.colorbar(ScalarMappable(norm=norm, cmap=cmap), cax=colorbar_axis, orientation="horizontal")
    colorbar.ax.tick_params(labelsize=7, length=2)
    colorbar.outline.set_edgecolor("#596164")
    colorbar.set_label(textwrap.fill(f"{alias} ({unit})", width=52), fontsize=8, labelpad=3)
    colorbar_axis.set_facecolor("#FFFFFF")
    draw_compass_rose(axis)
    draw_scale_bar(axis, state, extent)
    axis.text(
        0.995, 0.008, "Base cartográfica: © OpenStreetMap, © CARTO",
        transform=axis.transAxes, ha="right", va="bottom", fontsize=6.5, color="#596164", zorder=10,
    )
    figure.subplots_adjust(left=0, right=1, top=1, bottom=0)
    figure.savefig(output_dir / filename, dpi=120, facecolor=figure.get_facecolor())
    plt.close(figure)
    return {
        "arquivo": filename, "grupo": group, "atributo": attribute,
        "alias": alias, "unidade": unit, "cor": color,
        "feicoes": len(frame), "valores_validos": int(finite.size),
        "minimo": float(np.nanmin(finite)) if finite.size else None,
        "maximo": float(np.nanmax(finite)) if finite.size else None,
        "limite_visual_superior_percentil_98": maximum,
        "metodo_classificacao_visual": (
            "quantis_adaptativos" if visual_breaks is not None and visual_breaks.size >= 2
            else "escala_continua"
        ),
        "quebras_visuais": visual_breaks.tolist() if visual_breaks is not None else None,
        "paleta_visual": list(palette) if palette else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Regenera PNGs já existentes")
    args = parser.parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    state = gpd.read_file(STATE_PATH).to_crs(MAP_CRS)
    extent = fixed_extent(state)
    basemap = load_basemap(extent)
    grade = gpd.read_file(GRADE_PATH, layer="favorabilidade_grade")
    network = gpd.read_file(NETWORK_PATH, layer="favorabilidade_rede").to_crs(MAP_CRS)
    catalog = [("grade", grade, GRADE_ATTRIBUTES), ("rede", network, NETWORK_ATTRIBUTES)]
    manifest = []
    index = 0

    for group, frame, attributes in catalog:
        for attribute, (alias, unit) in attributes.items():
            index += 1
            if attribute not in frame.columns:
                raise KeyError(f"Atributo ausente em {group}: {attribute}")
            filename = f"{index:02d}_{group}_{slugify(attribute)}.png"
            destination = OUTPUT_DIR / filename
            if args.force or not destination.exists():
                item = export_map(
                    frame, group, attribute, alias, unit, END_COLORS[index - 1],
                    state, extent, basemap, filename,
                )
            else:
                values = frame[attribute].to_numpy(dtype="float64", na_value=np.nan)
                finite = values[np.isfinite(values)]
                item = {
                    "arquivo": filename, "grupo": group, "atributo": attribute,
                    "alias": alias, "unidade": unit, "cor": END_COLORS[index - 1],
                    "feicoes": len(frame), "valores_validos": int(finite.size),
                    "minimo": float(np.nanmin(finite)) if finite.size else None,
                    "maximo": float(np.nanmax(finite)) if finite.size else None,
                    "limite_visual_superior_percentil_98": value_limits(values)[1],
                }
            manifest.append(item)
            print(f"[{index:02d}/44] {filename}", flush=True)

    report = {
        "formato": "PNG 1920 x 1080 px", "crs_renderizacao": MAP_CRS,
        "basemap": "CARTO Positron em escala de cinza",
        "observacao": "Valores brutos; escala visual limitada ao percentil 98 para reduzir o efeito de valores extremos.",
        "total_imagens": len(manifest), "imagens": manifest,
    }
    (OUTPUT_DIR / "manifesto.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8",
    )
    print(f"Imagens exportadas em {OUTPUT_DIR}", flush=True)


if __name__ == "__main__":
    main()
