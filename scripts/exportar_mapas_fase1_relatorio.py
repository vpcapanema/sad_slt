"""Exporta mapas da Fase 1 para relatório mensal e apresentações."""

from __future__ import annotations

import argparse
import json
import re
import textwrap
import unicodedata
from pathlib import Path
from typing import Iterable

import contextily as cx
import fiona
import geopandas as gpd
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import ListedColormap, to_hex, to_rgb
from matplotlib.patches import Patch, Polygon, Rectangle
from pyproj import Geod, Transformer
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject, transform_bounds


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "geoespacial"
LOCAL_DIR = DATA_DIR / "local"
OUTPUT_DIR = DATA_DIR / "relatorios" / "mapas_fase1"
LIBRARY_PATH = DATA_DIR / "biblioteca_criterios_risco_restricao.json"
STATE_PATH = LOCAL_DIR / "limites_administrativos" / "uf_sp" / "uf_sp.shp"
MAP_CRS = "EPSG:3857"

SYNTHESIS_COLORS = {
    "Risco": "#E3A018",
    "Restrição": "#C94B40",
}
INPUT_COLORS = [
    "#2F6B9A", "#3C8D5A", "#6C5AA7", "#258A8A", "#A44A8B",
    "#4B78C2", "#2E7D32", "#7A5195", "#00838F", "#8E5C42",
    "#5C6BC0", "#00796B", "#6D4C9A", "#3F7CAC", "#4F772D",
    "#5E548E", "#006D77", "#7B6D8D", "#33658A", "#4D908E",
    "#6A7FDB",
]


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", normalized.casefold()).strip("_")


def load_catalog() -> list[dict]:
    library = json.loads(LIBRARY_PATH.read_text(encoding="utf-8"))
    if len(library["criterios"]) > len(INPUT_COLORS):
        raise ValueError("A paleta não possui cores suficientes para todos os critérios")
    layers = []
    for index, criterion in enumerate(library["criterios"]):
        category = criterion["tipo"]
        folder = "risco" if category == "Risco" else "restrição"
        source = LOCAL_DIR / folder / criterion["id"] / f"{criterion['id']}.shp"
        if not source.exists():
            raise FileNotFoundError(f"Camada canônica ausente: {source}")
        layers.append({**criterion, "source": source, "color": INPUT_COLORS[index]})
    return layers


def fixed_extent(state: gpd.GeoDataFrame) -> tuple[float, float, float, float]:
    min_x, min_y, max_x, max_y = state.total_bounds
    margin_x = (max_x - min_x) * 0.075
    margin_y = (max_y - min_y) * 0.14
    left, right = min_x - margin_x, max_x + margin_x
    bottom, top = min_y - margin_y, max_y + margin_y

    target_ratio = 16 / 9
    width, height = right - left, top - bottom
    if width / height < target_ratio:
        extra = (height * target_ratio - width) / 2
        left, right = left - extra, right + extra
    else:
        extra = (width / target_ratio - height) / 2
        bottom, top = bottom - extra, top + extra
    return left, right, bottom, top


def load_basemap(extent: tuple[float, float, float, float]):
    left, right, bottom, top = extent
    try:
        image, image_extent = cx.bounds2img(
            left,
            bottom,
            right,
            top,
            zoom=7,
            source=cx.providers.CartoDB.PositronNoLabels,
        )
        rgb = np.asarray(image)[..., :3].astype(np.float32)
        grayscale = np.dot(rgb, [0.299, 0.587, 0.114]).astype(np.uint8)
        image = np.dstack((grayscale, grayscale, grayscale))
        return image, image_extent, None
    except Exception as exc:  # o mapa continua utilizável em execução offline
        return None, None, str(exc)


def draw_layer(
    axis,
    frame: gpd.GeoDataFrame,
    color: str,
    extent: tuple[float, float, float, float],
) -> None:
    edge_color = to_hex(np.asarray(to_rgb(color)) * 0.58)
    if len(frame) > 50_000:
        left, right, bottom, top = extent
        native_left, native_bottom, native_right, native_top = transform_bounds(
            MAP_CRS, frame.crs, left, bottom, right, top, densify_pts=21,
        )
        native_transform = from_bounds(
            native_left, native_bottom, native_right, native_top, 1920, 1080,
        )
        native_mask = rasterize(
            ((geometry, 1) for geometry in frame.geometry if geometry is not None),
            out_shape=(1080, 1920),
            transform=native_transform,
            fill=0,
            dtype="uint8",
        )
        mask = np.zeros((1080, 1920), dtype="uint8")
        reproject(
            source=native_mask,
            destination=mask,
            src_transform=native_transform,
            src_crs=frame.crs,
            dst_transform=from_bounds(left, bottom, right, top, 1920, 1080),
            dst_crs=MAP_CRS,
            resampling=Resampling.nearest,
        )
        axis.imshow(
            mask,
            extent=(left, right, bottom, top),
            origin="upper",
            cmap=ListedColormap([(0, 0, 0, 0), color]),
            alpha=0.72,
            interpolation="nearest",
            zorder=3,
        )
        return
    geometry_types = set(frame.geom_type)
    if geometry_types <= {"Point", "MultiPoint"}:
        frame.plot(
            ax=axis,
            color=color,
            edgecolor="#FFFFFF",
            linewidth=0.8,
            markersize=18,
            alpha=0.95,
            zorder=4,
            rasterized=True,
        )
        return
    frame.plot(
        ax=axis,
        facecolor=color,
        edgecolor=edge_color,
        linewidth=0.9,
        alpha=0.88,
        zorder=3,
        rasterized=True,
    )


def load_render_frame(source: Path) -> gpd.GeoDataFrame:
    frame = gpd.read_file(source)
    return frame if len(frame) > 50_000 else frame.to_crs(MAP_CRS)


def draw_compass_rose(axis) -> None:
    center_x, center_y = 0.945, 0.875
    north = Polygon(
        [(center_x, center_y + 0.052), (center_x - 0.009, center_y), (center_x + 0.009, center_y)],
        transform=axis.transAxes, facecolor="#252B2D", edgecolor="#FFFFFF", linewidth=0.5, zorder=12,
    )
    south = Polygon(
        [(center_x, center_y - 0.038), (center_x - 0.009, center_y), (center_x + 0.009, center_y)],
        transform=axis.transAxes, facecolor="#FFFFFF", edgecolor="#252B2D", linewidth=0.7, zorder=12,
    )
    east_west = Polygon(
        [(center_x - 0.024, center_y), (center_x, center_y + 0.007),
         (center_x + 0.024, center_y), (center_x, center_y - 0.007)],
        transform=axis.transAxes, facecolor="#FFFFFF", edgecolor="#252B2D", linewidth=0.7, zorder=11,
    )
    axis.add_patch(east_west)
    axis.add_patch(south)
    axis.add_patch(north)
    axis.text(
        center_x, center_y + 0.059, "N", transform=axis.transAxes,
        ha="center", va="bottom", fontsize=10, fontweight="bold", color="#252B2D", zorder=12,
    )


def draw_scale_bar(axis, state: gpd.GeoDataFrame, extent: tuple[float, float, float, float]) -> None:
    state_center = state.to_crs("EPSG:4326").geometry.union_all().centroid
    end_lon, end_lat, _ = Geod(ellps="GRS80").fwd(state_center.x, state_center.y, 90, 200_000)
    transformer = Transformer.from_crs("EPSG:4326", MAP_CRS, always_xy=True)
    start_x, _ = transformer.transform(state_center.x, state_center.y)
    end_x, _ = transformer.transform(end_lon, end_lat)
    bar_length = abs(end_x - start_x)

    left, right, bottom, top = extent
    center_x = (left + right) / 2
    bar_left = center_x - bar_length / 2
    bar_y = bottom + (top - bottom) * 0.042
    bar_height = (top - bottom) * 0.009
    backdrop = Rectangle(
        (bar_left - bar_length * 0.08, bar_y - bar_height * 2.3),
        bar_length * 1.16, bar_height * 5.2,
        facecolor="#FFFFFF", edgecolor="none", alpha=0.88, zorder=8,
    )
    axis.add_patch(backdrop)
    for segment in range(4):
        axis.add_patch(Rectangle(
            (bar_left + segment * bar_length / 4, bar_y), bar_length / 4, bar_height,
            facecolor="#252B2D" if segment % 2 == 0 else "#FFFFFF",
            edgecolor="#252B2D", linewidth=0.7, zorder=9,
        ))
    for position, label in ((0, "0"), (0.5, "100"), (1, "200 km")):
        axis.text(
            bar_left + bar_length * position, bar_y - bar_height * 0.65, label,
            ha="center", va="top", fontsize=7.5, color="#252B2D", zorder=10,
        )


def export_map(
    filename: str,
    title: str,
    color: str,
    legend_label: str,
    frames: Iterable[gpd.GeoDataFrame],
    state: gpd.GeoDataFrame,
    extent: tuple[float, float, float, float],
    basemap,
) -> None:
    figure, axis = plt.subplots(figsize=(16, 9), dpi=120)
    figure.patch.set_facecolor("#F4F3EF")
    axis.set_facecolor("#ECEBE7")

    image, image_extent, _ = basemap
    if image is not None:
        axis.imshow(image, extent=image_extent, interpolation="bilinear", zorder=0)

    for frame in frames:
        draw_layer(axis, frame, color, extent)

    state.boundary.plot(ax=axis, color="#303638", linewidth=1.55, zorder=5)
    left, right, bottom, top = extent
    axis.set_xlim(left, right)
    axis.set_ylim(bottom, top)
    axis.set_axis_off()
    axis.text(
        0.5,
        0.965,
        title,
        transform=axis.transAxes,
        ha="center",
        va="top",
        fontsize=18,
        fontweight="bold",
        color="#202527",
        bbox={"boxstyle": "square,pad=0.42", "facecolor": "#FFFFFF", "edgecolor": "none", "alpha": 0.9},
        zorder=10,
    )
    legend = axis.legend(
        handles=[Patch(facecolor=color, edgecolor=to_hex(np.asarray(to_rgb(color)) * 0.58),
                       label=textwrap.fill(legend_label, width=52))],
        loc="lower left", bbox_to_anchor=(0.018, 0.025),
        frameon=True, fancybox=False, framealpha=0.9, facecolor="#FFFFFF", edgecolor="#B8BDBF",
        fontsize=8.5, handlelength=2.2, handleheight=1.2, borderpad=0.7,
    )
    legend.set_zorder(10)
    draw_compass_rose(axis)
    draw_scale_bar(axis, state, extent)
    axis.text(
        0.995,
        0.008,
        "Base cartográfica: © OpenStreetMap, © CARTO",
        transform=axis.transAxes,
        ha="right",
        va="bottom",
        fontsize=6.5,
        color="#596164",
        zorder=10,
    )
    figure.subplots_adjust(left=0, right=1, top=1, bottom=0)
    figure.savefig(OUTPUT_DIR / filename, dpi=120, facecolor=figure.get_facecolor())
    plt.close(figure)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Regenera PNGs já existentes")
    args = parser.parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    catalog = load_catalog()
    state = gpd.read_file(STATE_PATH).to_crs(MAP_CRS)
    extent = fixed_extent(state)
    basemap = load_basemap(extent)
    manifest = []

    for index, item in enumerate(catalog, start=1):
        filename = f"{index:02d}_{slugify(item['tipo'])}_{item['id']}.png"
        destination = OUTPUT_DIR / filename
        if args.force or not destination.exists():
            frame = load_render_frame(item["source"])
            export_map(
                filename, item["nome"], item["color"], item["nome"],
                [frame], state, extent, basemap,
            )
        with fiona.open(item["source"]) as source:
            feature_count = len(source)
        manifest.append({
            "arquivo": filename,
            "camada_id": item["id"],
            "alias": item["nome"],
            "tipo": item["tipo"],
            "cor": item["color"],
            "feicoes": feature_count,
            "fonte": item["fonte"],
        })
        print(f"[{index:02d}/{len(catalog) + 2}] {filename}", flush=True)

    for offset, category in enumerate(("Risco", "Restrição"), start=1):
        selected_items = [item for item in catalog if item["tipo"] == category]
        selected = (
            load_render_frame(item["source"])
            for item in selected_items
        )
        filename = f"{len(catalog) + offset:02d}_{slugify(category)}_consolidada_fase1.png"
        title = f"Camada consolidada de {category.casefold()} - Fase 1"
        export_map(
            filename, title, SYNTHESIS_COLORS[category], title,
            selected, state, extent, basemap,
        )
        manifest.append({
            "arquivo": filename,
            "camada_id": f"{slugify(category)}_consolidada_fase1",
            "alias": title,
            "tipo": category,
            "cor": SYNTHESIS_COLORS[category],
            "feicoes": sum(
                entry["feicoes"] for entry in manifest if entry["tipo"] == category
            ),
            "fonte": "Síntese das camadas canônicas da Fase 1",
        })
        print(f"[{len(catalog) + offset:02d}/{len(catalog) + 2}] {filename}", flush=True)

    report = {
        "formato": "PNG 1920 x 1080 px",
        "crs_renderizacao": MAP_CRS,
        "basemap": "CARTO Positron sem rótulos" if basemap[0] is not None else "Fundo neutro (execução offline)",
        "erro_basemap": basemap[2],
        "total_imagens": len(manifest),
        "imagens": manifest,
    }
    (OUTPUT_DIR / "manifesto.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Imagens exportadas em {OUTPUT_DIR}", flush=True)


if __name__ == "__main__":
    main()
