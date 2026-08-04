"""Fase 1 end-to-end (v2): mesma lógica, mas classificação inline (sem async
e sem reabrir conexão a cada chamada), com flush=True em todos os prints e
output direto em arquivo (sem Tee). Ideal para debug/execução em lote.
"""
from __future__ import annotations

import json
import sys
import tempfile
import traceback
import zipfile
from pathlib import Path

import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api.services.fase1_classificacao import carregar_configuracao  # noqa: E402

LOCAL = ROOT / "data" / "geoespacial" / "local"
MASK_SHP = ROOT / "data" / "geoespacial" / "outputs" / "vetor" / "uf_sp.shp"
OUT_DIR = ROOT / "data" / "geoespacial" / "outputs" / "vetor"
OUT_DIR.mkdir(parents=True, exist_ok=True)
REL_DIR = ROOT / "data" / "geoespacial" / "relatorios"
LOG_FILE = REL_DIR / "executar_fase1_local.run.log"

CRS_OP = "EPSG:31983"
CRS_PUB = "EPSG:4674"


def log(msg: str) -> None:
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(msg + "\n")


SOURCES: dict[str, dict] = {
    "ucs_mma": {
        "criterio_id": "uc_pi_federal",
        "fonte_id": "mma_cnuc_pi_federal",
        "buffer": None,
        "sp_only": False,
        "zona_amortecimento": None,
    },
    "terras_indigenas": {"criterio_id": "terra_indigena", "fonte_id": "funai_ti", "buffer": None, "sp_only": False},
    "quilombos": {"criterio_id": "territorio_quilombola", "fonte_id": "incra_quilombolas", "buffer": None, "sp_only": False},
    "cavidades": {"criterio_id": "cavidade", "fonte_id": "cecav_cavidades", "buffer": None, "sp_only": False},
    "contaminadas": {"criterio_id": "area_contaminada", "fonte_id": "cetesb_areas_contaminadas", "buffer": None, "sp_only": True},
    "embargos_ibama": {"criterio_id": "embargo_ibama", "fonte_id": "ibama_embargos", "buffer": None, "sp_only": False},
    "sitios_arqueologicos": {"criterio_id": "sitio_arqueologico", "fonte_id": "iphan_sitios", "buffer": None, "sp_only": False},
    "inundacao": {"criterio_id": "inundacao", "fonte_id": None, "buffer": None, "sp_only": True},
    "movimento_massa": {"criterio_id": "movimento_massa", "fonte_id": None, "buffer": None, "sp_only": True},
    "assentamentos": {"criterio_id": "assentamento", "fonte_id": None, "buffer": None, "sp_only": False},
    "aprm_sp": {"criterio_id": "aprm", "fonte_id": None, "buffer": None, "sp_only": True},
    "vegetacao_sp": {"criterio_id": "vegetacao_protegida", "fonte_id": None, "buffer": None, "sp_only": True, "skip": True},
}


def load_rules() -> dict[str, list[dict]]:
    """Carrega regras versionadas da fonte JSON canônica da Fase 1."""
    configuracao = carregar_configuracao()
    return {
        criterio_id: [
            {
                "ordem": ordem,
                "expressao": expressao,
                "tipo_tratamento_resultante": tipo,
                "severidade": severidade,
                "base_legal": base_legal,
            }
            for ordem, expressao, tipo, severidade, base_legal in regras
        ]
        for criterio_id, regras in configuracao["regras"].items()
    }


def load_zip_as_gdf(zip_path: Path) -> gpd.GeoDataFrame:
    with tempfile.TemporaryDirectory() as td:
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(td)
        td_path = Path(td)
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
    gdfs = []
    for z in zips:
        try:
            gdfs.append(load_zip_as_gdf(z))
        except Exception as exc:  # noqa: BLE001
            log(f"  [warn] {z.name}: {exc}")
    if not gdfs:
        raise RuntimeError(f"Nenhum vetor em {folder}")
    target = gdfs[0].crs
    normalized = [g.to_crs(target) if g.crs and g.crs != target else g for g in gdfs]
    return gpd.GeoDataFrame(pd.concat(normalized, ignore_index=True), crs=target)


def normalize(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if gdf.crs is None:
        raise ValueError("sem CRS")
    if gdf.crs.to_string() != CRS_OP:
        gdf = gdf.to_crs(CRS_OP)
    invalid = ~gdf.is_valid
    if invalid.any():
        gdf.loc[invalid, "geometry"] = gdf.loc[invalid, "geometry"].buffer(0)
    gdf = gdf[~gdf.geometry.is_empty & gdf.geometry.notna()].copy()
    return gdf


def clip_to_mask(gdf: gpd.GeoDataFrame, mask: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Filtro rápido: sindex.query intersects. Não altera geometria."""
    if len(gdf) == 0:
        return gdf
    # dissolve a máscara em uma única geometria para reduzir custo
    mask_geoms = list(mask.geometry.values)
    if len(mask_geoms) > 1:
        from shapely.ops import unary_union
        mask_geom = unary_union(mask_geoms)
    else:
        mask_geom = mask_geoms[0]
    sindex = gdf.sindex
    candidates = list(sindex.query(mask_geom, predicate="intersects"))
    if not candidates:
        return gdf.iloc[0:0].copy()
    return gdf.iloc[candidates].reset_index(drop=True)


def classify(gdf: gpd.GeoDataFrame, rules: list[dict], fonte_id: str | None, folder: str) -> gpd.GeoDataFrame:
    """Classifica in-place. Preserva atributos originais em `atributos_origem` (JSON)
    e `feicao_origem_id` estável. Primeira regra que casa determina tipo/severidade/base_legal."""
    gdf = gdf.copy().reset_index(drop=True)
    n = len(gdf)
    # Snapshot dos atributos ORIGINAIS antes de qualquer injeção do pipeline.
    atributos_cols = [c for c in gdf.columns if c != "geometry"]

    def _serialize(value):
        if value is None:
            return None
        try:
            if pd.isna(value):
                return None
        except (TypeError, ValueError):
            pass
        if isinstance(value, (str, int, float, bool)):
            return value
        return str(value)

    atributos_json = [
        json.dumps(
            {c: _serialize(row[c]) for c in atributos_cols if _serialize(row[c]) is not None},
            ensure_ascii=False,
        )
        for _, row in gdf[atributos_cols].iterrows()
    ]

    # Nome amigável: usa o nome derivado quando a feição for uma zona de amortecimento.
    name_candidates = ["nome_exibicao", "nome", "name", "NOME", "denominacao", "NM_UC", "nome_uc",
                       "nm_ti", "nm_terrai", "nome_comun", "nome_comunidade",
                       "titulo", "descricao", "cod_iphan", "codigo_iphan",
                       "id_sitio", "processo", "id_area"]
    nome_col = next((c for c in name_candidates if c in gdf.columns), None)
    if nome_col is not None:
        gdf["nome_origem"] = gdf[nome_col].apply(_serialize)
    else:
        gdf["nome_origem"] = None

    if "nome_area_origem" not in gdf.columns:
        gdf["nome_area_origem"] = None
    if "tipo_derivacao" not in gdf.columns:
        gdf["tipo_derivacao"] = None
    if "distancia_buffer_m" not in gdf.columns:
        gdf["distancia_buffer_m"] = None

    gdf["atributos_origem"] = atributos_json
    gdf["feicao_origem_id"] = [f"{folder}#{i}" for i in range(n)]
    gdf["criterio_id"] = None
    gdf["tipo_tratamento"] = None
    gdf["severidade"] = None
    gdf["base_legal"] = None
    gdf["fonte_id"] = fonte_id

    pendentes = pd.Series([True] * n, index=gdf.index)
    for r in rules:
        expr = r["expressao"]
        if not pendentes.any():
            break
        try:
            if expr.strip() == "True":
                mask = pd.Series([True] * n, index=gdf.index)
            else:
                sub = gdf[pendentes]
                idx_match = sub.query(expr, engine="python").index
                mask = pd.Series(False, index=gdf.index)
                mask.loc[idx_match] = True
        except Exception as exc:  # noqa: BLE001
            log(f"    [warn] expressao falhou '{expr}': {exc}")
            continue
        apply_mask = pendentes & mask
        if apply_mask.any():
            gdf.loc[apply_mask, "criterio_id"] = r["criterio_id"]
            gdf.loc[apply_mask, "tipo_tratamento"] = r["tipo_tratamento_resultante"]
            gdf.loc[apply_mask, "severidade"] = r["severidade"]
            gdf.loc[apply_mask, "base_legal"] = r["base_legal"]
            pendentes &= ~apply_mask
    return gdf


def main() -> None:
    LOG_FILE.write_text("", encoding="utf-8")
    log(f"[mask] {MASK_SHP}")
    mask = gpd.read_file(MASK_SHP).to_crs(CRS_OP)
    mask["geometry"] = mask.geometry.buffer(0)

    log("[rules] carregando de geoprocessamento.regra_classificacao_fase1")
    rules_by_crit = load_rules()
    log(f"[rules] {sum(len(v) for v in rules_by_crit.values())} regras em {len(rules_by_crit)} criterios")

    all_classified: list[gpd.GeoDataFrame] = []
    resumo: list[dict] = []

    for folder, cfg in SOURCES.items():
        log(f"\n=== {folder} (criterio={cfg['criterio_id']}, buffer={cfg['buffer']}) ===")
        if cfg.get("skip"):
            log("  [skip] fonte marcada como skip (adiar para pipeline dedicado)")
            resumo.append({"fonte": folder, "status": "skip"})
            continue
        try:
            gdf = load_source(folder)
            log(f"  bruto: {len(gdf)} feicoes, crs={gdf.crs}")
            gdf = normalize(gdf)
            log(f"  normalizado: {len(gdf)}")
            if cfg.get("sp_only"):
                log(f"  sp_only=True -> pulando recorte de mascara")
            else:
                gdf = clip_to_mask(gdf, mask)
                log(f"  recortado SP: {len(gdf)}")
            if len(gdf) == 0:
                resumo.append({"fonte": folder, "status": "vazio_apos_recorte"})
                continue
            if cfg["buffer"]:
                nome_col = next(
                    (
                        col
                        for col in [
                            "nome", "name", "NOME", "denominacao", "NM_UC", "nome_uc",
                            "nm_ti", "nm_terrai", "nome_comun", "nome_comunidade",
                            "titulo", "descricao", "cod_iphan", "codigo_iphan",
                            "id_sitio", "processo", "id_area",
                        ]
                        if col in gdf.columns
                    ),
                    None,
                )
                nome_area_origem = (
                    gdf[nome_col].fillna(folder).astype(str)
                    if nome_col is not None else pd.Series(folder, index=gdf.index)
                )
                gdf["nome_area_origem"] = nome_area_origem
                gdf["nome_exibicao"] = "Área de influência de " + nome_area_origem
                gdf["tipo_derivacao"] = "buffer_risco"
                gdf["distancia_buffer_m"] = cfg["buffer"]
                gdf["geometry"] = gdf.geometry.buffer(cfg["buffer"])
                if not cfg.get("sp_only"):
                    gdf = clip_to_mask(gdf, mask)
                log(f"  buffer {cfg['buffer']}m + recorte: {len(gdf)}")
            rules = rules_by_crit.get(cfg["criterio_id"], [])
            if not rules:
                log(f"  [warn] sem regras para criterio {cfg['criterio_id']}")
            log(f"  aplicando {len(rules)} regras...")
            classificada = classify(gdf, rules, cfg["fonte_id"], folder)
            classificada["fonte_folder"] = folder
            por_tipo = classificada["tipo_tratamento"].value_counts().to_dict()
            log(f"  OP-CLASS: {por_tipo}")
            all_classified.append(classificada)

            regra_zona = cfg.get("zona_amortecimento")
            if regra_zona:
                categorias_excluidas = regra_zona["excecoes"]
                elegiveis = gdf[
                    gdf["grupo"].astype(str).str.casefold().eq("proteção integral")
                    & ~gdf["categoria"].astype(str).str.upper().isin(categorias_excluidas)
                ].copy()
                if len(elegiveis):
                    nome_area = elegiveis["nome_uc"].fillna(folder).astype(str)
                    zona = elegiveis.copy()
                    zona["nome_area_origem"] = nome_area
                    zona["nome_exibicao"] = "Zona de amortecimento da " + nome_area
                    zona["tipo_derivacao"] = "zona_amortecimento"
                    zona["distancia_buffer_m"] = regra_zona["distancia"]
                    zona["geometry"] = zona.geometry.buffer(regra_zona["distancia"])
                    zona["geometry"] = zona.geometry.difference(elegiveis.geometry)
                    zona = clip_to_mask(zona, mask)
                    if len(zona):
                        criterios = regra_zona["criterios_por_esfera"]
                        zona["criterio_zona"] = (
                            zona["esfera"].astype(str).str.casefold().map(criterios).fillna("za_uc_federal")
                        )
                        for criterio_zona, grupo_zona in zona.groupby("criterio_zona"):
                            classificada_zona = classify(
                                grupo_zona,
                                rules_by_crit.get(criterio_zona, []),
                                cfg["fonte_id"],
                                f"{folder}_zona_amortecimento",
                            )
                            classificada_zona["fonte_folder"] = f"{folder}_zona_amortecimento"
                            all_classified.append(classificada_zona)
                        log(f"  zonas de amortecimento: {len(zona)} feicoes externas de 3 km")
            resumo.append({"fonte": folder, "status": "ok", "feicoes": len(classificada), "por_tipo": por_tipo})
        except Exception as exc:  # noqa: BLE001
            log(f"  [erro] {exc}")
            log(traceback.format_exc())
            resumo.append({"fonte": folder, "status": "erro", "erro": str(exc)})

    if not all_classified:
        log("Nenhuma camada classificada — abortando.")
        return

    common_cols = [
        "feicao_origem_id", "fonte_folder", "fonte_id", "nome_origem", "nome_area_origem",
        "criterio_id", "tipo_tratamento", "severidade", "base_legal",
        "tipo_derivacao", "distancia_buffer_m", "atributos_origem", "geometry",
    ]
    padded = []
    for g in all_classified:
        for c in common_cols:
            if c not in g.columns:
                g[c] = None
        padded.append(g[common_cols])
    consolidado = gpd.GeoDataFrame(pd.concat(padded, ignore_index=True), crs=CRS_OP)

    # Normaliza para MultiPolygon único (importador rejeita geometrias mistas).
    from shapely.geometry import MultiPolygon, Polygon

    def _to_multipolygon(geom):
        if geom is None or geom.is_empty:
            return None
        if isinstance(geom, MultiPolygon):
            return geom
        if isinstance(geom, Polygon):
            return MultiPolygon([geom])
        # ponto/linha residual: descarta (deveria ter recebido buffer antes)
        return None

    consolidado["geometry"] = consolidado.geometry.apply(_to_multipolygon)
    consolidado = consolidado[consolidado.geometry.notna()].copy()
    log(f"  normalizacao MultiPolygon: {len(consolidado)} feicoes retidas")

    restricao = consolidado[consolidado["tipo_tratamento"] == "restricao"].copy()
    risco = consolidado[consolidado["tipo_tratamento"] == "risco"].copy()
    log(f"\nCONSOLIDADO: restricao={len(restricao)}  risco={len(risco)}")

    if len(restricao):
        out = OUT_DIR / "fase1_restricao_consolidada_sp_v1.gpkg"
        restricao.to_crs(CRS_PUB).to_file(out, driver="GPKG", layer="restricao")
        log(f"[saida] {out} ({out.stat().st_size / 1024 / 1024:.2f} MB)")
    if len(risco):
        out = OUT_DIR / "fase1_risco_consolidado_sp_v1.gpkg"
        risco.to_crs(CRS_PUB).to_file(out, driver="GPKG", layer="risco")
        log(f"[saida] {out} ({out.stat().st_size / 1024 / 1024:.2f} MB)")

    (REL_DIR / "execucao_fase1_local.json").write_text(
        json.dumps(resumo, indent=2, ensure_ascii=False), encoding="utf-8",
    )
    log("[resumo] em data/geoespacial/relatorios/execucao_fase1_local.json")


if __name__ == "__main__":
    main()
