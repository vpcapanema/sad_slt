"""Executa Fase 1 end-to-end contra as fontes locais em data/geoespacial/local.

Fluxo (in-process, usando geoespacial_service.classificar_por_feicao_fase1
e utilitários geopandas):

1. Carrega máscara SP a partir de uf_sp.shp.
2. Para cada fonte configurada em SOURCES:
   a. Extrai o ZIP em temp
   b. Lê o shapefile / geojson
   c. Reprojeta para EPSG:31983 (operacional)
   d. Corrige geometrias inválidas (buffer 0)
   e. Recorta pela máscara SP
   f. (Opcional) Aplica buffer externo (para camadas ponto/linha de risco)
   g. Classifica cada feição via OP-CLASS (regra_classificacao_fase1)
3. Concatena todas as feições classificadas.
4. Split por tipo_tratamento → restrição, risco.
5. Reprojeta cada bucket para EPSG:4674 e salva GeoPackage.
"""
from __future__ import annotations

import asyncio
import sys
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api.services.geoespacial_service import geoespacial_service  # noqa: E402

LOCAL = ROOT / "data" / "geoespacial" / "local"
MASK_SHP = ROOT / "data" / "geoespacial" / "outputs" / "vetor" / "uf_sp.shp"
OUT_DIR = ROOT / "data" / "geoespacial" / "outputs" / "vetor"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CRS_OP = "EPSG:31983"
CRS_PUB = "EPSG:4674"

# Configuração: pasta -> (criterio_id, fonte_id, buffer_ext_m)
# buffer_ext_m: aplica OP-04 externo antes de classificar (para pontos/linhas).
SOURCES: dict[str, dict] = {
    "ucs_mma": {"criterio_id": "uc_pi_federal", "fonte_id": "mma_cnuc_pi_federal", "buffer": None},
    "terras_indigenas": {"criterio_id": "terra_indigena", "fonte_id": "funai_ti", "buffer": None},
    "quilombos": {"criterio_id": "territorio_quilombola", "fonte_id": "incra_quilombolas", "buffer": None},
    "cavidades": {"criterio_id": "cavidade", "fonte_id": "cecav_cavidades", "buffer": None},
    "contaminadas": {"criterio_id": "area_contaminada", "fonte_id": "cetesb_areas_contaminadas", "buffer": 500},
    "embargos_ibama": {"criterio_id": "embargo_ibama", "fonte_id": "ibama_embargos", "buffer": None},
    "sitios_arqueologicos": {"criterio_id": "sitio_arqueologico", "fonte_id": "iphan_sitios", "buffer": None},
    "inundacao": {"criterio_id": "inundacao", "fonte_id": None, "buffer": None},
    "movimento_massa": {"criterio_id": "movimento_massa", "fonte_id": None, "buffer": None},
    "assentamentos": {"criterio_id": "assentamento", "fonte_id": None, "buffer": None},
    "aprm_sp": {"criterio_id": "aprm", "fonte_id": None, "buffer": None},
    "vegetacao_sp": {"criterio_id": "vegetacao_protegida", "fonte_id": None, "buffer": None},
}


def load_zip_as_gdf(zip_path: Path) -> gpd.GeoDataFrame:
    with tempfile.TemporaryDirectory() as td:
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(td)
        td_path = Path(td)
        # tenta shp, depois gpkg, depois geojson
        for ext in ("*.shp", "*.gpkg", "*.geojson", "*.json"):
            arqs = list(td_path.rglob(ext))
            if arqs:
                return gpd.read_file(arqs[0])
        raise FileNotFoundError(f"Nenhum vetor em {zip_path}")


def load_source(folder: str) -> gpd.GeoDataFrame:
    d = LOCAL / folder
    zips = list(d.glob("*.zip"))
    if not zips:
        raise FileNotFoundError(f"Sem ZIP em {d}")
    # concatena todos os ZIPs da pasta (aprm_sp tem 4)
    gdfs = []
    for z in zips:
        try:
            gdf = load_zip_as_gdf(z)
            gdfs.append(gdf)
        except Exception as exc:  # noqa: BLE001
            print(f"  [warn] {z.name}: {exc}")
    if not gdfs:
        raise RuntimeError(f"Nenhum vetor carregado de {folder}")
    # unifica CRS
    target = gdfs[0].crs
    normalized = [g.to_crs(target) if g.crs and g.crs != target else g for g in gdfs]
    return gpd.GeoDataFrame(pd.concat(normalized, ignore_index=True), crs=target)


def normalize(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if gdf.crs is None:
        raise ValueError("GeoDataFrame sem CRS")
    if gdf.crs.to_string() != CRS_OP:
        gdf = gdf.to_crs(CRS_OP)
    # corrige geometrias inválidas
    invalid = ~gdf.is_valid
    if invalid.any():
        gdf.loc[invalid, "geometry"] = gdf.loc[invalid, "geometry"].buffer(0)
    gdf = gdf[~gdf.geometry.is_empty & gdf.geometry.notna()].copy()
    return gdf


def clip_to_mask(gdf: gpd.GeoDataFrame, mask: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    return gpd.overlay(gdf, mask[["geometry"]], how="intersection", keep_geom_type=False)


async def main() -> None:
    print(f"[mask] {MASK_SHP}")
    mask = gpd.read_file(MASK_SHP).to_crs(CRS_OP)
    mask["geometry"] = mask.geometry.buffer(0)

    all_classified: list[gpd.GeoDataFrame] = []
    resumo: list[dict] = []

    for folder, cfg in SOURCES.items():
        print(f"\n=== {folder} (criterio={cfg['criterio_id']}, buffer={cfg['buffer']}) ===")
        try:
            gdf = load_source(folder)
            print(f"  bruto: {len(gdf)} feicoes, crs={gdf.crs}")
            gdf = normalize(gdf)
            print(f"  normalizado: {len(gdf)} feicoes")
            gdf = clip_to_mask(gdf, mask)
            print(f"  recortado SP: {len(gdf)} feicoes")
            if len(gdf) == 0:
                resumo.append({"fonte": folder, "status": "vazio_apos_recorte", "feicoes": 0})
                continue
            if cfg["buffer"]:
                gdf["geometry"] = gdf.geometry.buffer(cfg["buffer"])
                print(f"  apos buffer {cfg['buffer']}m: {len(gdf)} feicoes")
                # recorta de novo pra manter dentro de SP
                gdf = clip_to_mask(gdf, mask)
                print(f"  recortado pos-buffer: {len(gdf)} feicoes")

            camada_id = geoespacial_service.registrar_camada(gdf, folder, "FASE1")
            resultado = await geoespacial_service.classificar_por_feicao_fase1(
                camada_id, criterio_id=cfg["criterio_id"], fonte_id=cfg["fonte_id"],
            )
            print(f"  OP-CLASS: {resultado['por_tipo']}")
            classificada = geoespacial_service.obter_camada_dados(resultado["camada_id"])
            classificada["fonte_folder"] = folder
            all_classified.append(classificada)
            resumo.append({"fonte": folder, "status": "ok", "feicoes": len(classificada), "por_tipo": resultado["por_tipo"]})
        except Exception as exc:  # noqa: BLE001
            print(f"  [erro] {exc}")
            resumo.append({"fonte": folder, "status": "erro", "erro": str(exc)})

    if not all_classified:
        print("\nNenhuma camada classificada — abortando.")
        return

    # colunas comuns para concatenar
    common_cols = ["criterio_id", "tipo_tratamento", "severidade", "base_legal", "fonte_id", "feicao_origem_id", "fonte_folder", "geometry"]
    padded = []
    for g in all_classified:
        for c in common_cols:
            if c not in g.columns:
                g[c] = None
        padded.append(g[common_cols])
    consolidado = gpd.GeoDataFrame(pd.concat(padded, ignore_index=True), crs=CRS_OP)

    restricao = consolidado[consolidado["tipo_tratamento"] == "restricao"].copy()
    risco = consolidado[consolidado["tipo_tratamento"] == "risco"].copy()
    print(f"\nCONSOLIDADO: restricao={len(restricao)} risco={len(risco)}")

    if len(restricao):
        r4674 = restricao.to_crs(CRS_PUB)
        r_out = OUT_DIR / "fase1_restricao_consolidada_sp_v1.gpkg"
        r4674.to_file(r_out, driver="GPKG", layer="restricao")
        print(f"[saida] {r_out} ({r_out.stat().st_size / 1024 / 1024:.2f} MB)")
    if len(risco):
        s4674 = risco.to_crs(CRS_PUB)
        s_out = OUT_DIR / "fase1_risco_consolidado_sp_v1.gpkg"
        s4674.to_file(s_out, driver="GPKG", layer="risco")
        print(f"[saida] {s_out} ({s_out.stat().st_size / 1024 / 1024:.2f} MB)")

    import json
    (ROOT / "data" / "geoespacial" / "relatorios" / "execucao_fase1_local.json").write_text(
        json.dumps(resumo, indent=2, ensure_ascii=False), encoding="utf-8",
    )
    print("\n[resumo] gravado em data/geoespacial/relatorios/execucao_fase1_local.json")
    print(json.dumps(resumo, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
