"""Baixa, valida e empacota as 23 camadas canônicas da Fase 1.

Somente serviços oficiais abertos são aceitos. Critérios sem publicação aberta
recebem uma camada vazia com schema válido e status ``indisponivel`` no relatório.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import time
import unicodedata
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import fiona
import geopandas as gpd
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "geoespacial" / "local"
RAW = OUT / "_fontes_oficiais"
SHP = OUT
GPKG = OUT / "biblioteca_canonica_fase1.gpkg"
ZIP = OUT / "biblioteca_canonica_shapefiles.zip"
REPORT = OUT / "relatorio_validacao.json"
CRS = "EPSG:4674"
SP_BBOX = (-53.2, -25.5, -44.0, -19.7)


@dataclass(frozen=True)
class Source:
    key: str
    title: str
    organization: str
    url: str
    kind: str
    layer: str | None = None


ARCGIS = "https://pamgia.ibama.gov.br/server/rest/services"
DATAGEO = "https://datageo.ambiente.sp.gov.br/geoserver/datageo/ows"
SISCOM_WFS = "http://siscom.ibama.gov.br:80/geoserver/publica/ows"
SOURCES = {
    "ucs_mma": Source("ucs_mma", "Unidades de Conservação — CNUC/MMA", "MMA/IBAMA PAMGIA", f"{ARCGIS}/BasesSincronizadas/lim_unidades_conserva%C3%A7%C3%A3o_mma_a/FeatureServer/0", "arcgis"),
    "vegetacao_sp": Source(
        "vegetacao_sp", "Inventário Florestal 2020", "IPA/SEMIL — DataGEO",
        f"{DATAGEO}?service=WFS&version=1.0.0&request=GetFeature&typeName=datageo:InventarioFlorestal2020&outputFormat=SHAPE-ZIP&srsName=EPSG:4674",
        "zip",
    ),
    "aprm_sp": Source("aprm_sp", "APRM — subáreas e zoneamentos", "SEMIL — DataGEO", DATAGEO, "wfs_multi", "datageo:APRMATC_SUBAREAS_2015_POL,datageo:APRMAJ_ZONEAMENTO_10_SMA_2015_POL,datageo:APRMB_SMA2010,datageo:APRMG_SMA2007"),
    "cavidades": Source("cavidades", "Cavidades naturais", "CECAV/ICMBio — DataGEO", DATAGEO, "wfs", "datageo:CavidadesCecav"),
    "terras_indigenas": Source("terras_indigenas", "Terras Indígenas", "FUNAI/IBAMA PAMGIA", f"{ARCGIS}/BasesSincronizadas/lim_terra_indigena_funai_a/FeatureServer/0", "arcgis"),
    "quilombos": Source("quilombos", "Territórios Quilombolas", "INCRA/IBAMA PAMGIA", f"{ARCGIS}/BasesSincronizadas/lim_quilombos_incra_a/FeatureServer/0", "arcgis"),
    "contaminadas": Source("contaminadas", "Áreas Contaminadas e Reabilitadas", "CETESB/SEMIL — DataGEO", DATAGEO, "wfs", "datageo:VWM_AREAS_CONTAMINADAS_GEODADOS_CETESB_PTO"),
    "inundacao": Source("inundacao", "Áreas de risco de inundação", "Instituto Geológico/SEMIL — DataGEO", DATAGEO, "wfs", "datageo:VWM_AREA_RISCO_INUNDACAO_IG_2014_POL"),
    "movimento_massa": Source("movimento_massa", "Áreas de risco de escorregamento", "Instituto Geológico/SEMIL — DataGEO", DATAGEO, "wfs", "datageo:VWM_AREA_RISCO_ESCORREGAMENTO_IG_2014_POL"),
    "bens_tombados": Source("bens_tombados", "Bens materiais protegidos", "IPHAN/IBAMA PAMGIA", f"{ARCGIS}/BasesSincronizadas/lim_bens_materiais_iphan_a/FeatureServer/0", "arcgis"),
    "sitios_arqueologicos": Source("sitios_arqueologicos", "Sítios arqueológicos", "IPHAN/IBAMA PAMGIA", f"{ARCGIS}/BasesSincronizadas/lim_sitios_arqueologicos_iphan_a/FeatureServer/0", "arcgis"),
    "assentamentos": Source("assentamentos", "Assentamentos", "INCRA/IBAMA PAMGIA", f"{ARCGIS}/BasesSincronizadas/lim_assentamentos_incra_a/FeatureServer/0", "arcgis"),
    "embargos_ibama": Source("embargos_ibama", "Embargos ambientais federais", "IBAMA SISCOM", SISCOM_WFS, "wfs", "publica:vw_brasil_adm_embargo_a"),
}


CRITERIA = [
    ("uc_pi_estadual", "ucs_mma", ["estadual", "protecao integral"]),
    ("uc_pi_federal", "ucs_mma", ["federal", "protecao integral"]),
    ("uc_us_estadual", "ucs_mma", ["estadual", "uso sustentavel"]),
    ("uc_us_federal", "ucs_mma", ["federal", "uso sustentavel"]),
    ("za_uc_estadual", None, []),
    ("za_uc_federal", None, []),
    ("vegetacao_protegida", "vegetacao_sp", []),
    ("aprm", "aprm_sp", []),
    ("ecossistema_costeiro", "vegetacao_sp", ["mangue|manguezal|restinga"]),
    ("cavidade", "cavidades", []),
    ("terra_indigena", "terras_indigenas", []),
    ("territorio_quilombola", "quilombos", []),
    ("area_contaminada", "contaminadas", []),
    ("inundacao", "inundacao", []),
    ("movimento_massa", "movimento_massa", []),
    ("bem_tombado", "bens_tombados", []),
    ("sitio_arqueologico", "sitios_arqueologicos", []),
    ("assentamento", "assentamentos", []),
    ("servidao", None, []),
    ("embargo_ibama", "embargos_ibama", ["ativo"]),
    ("embargo_estadual", None, []),
    ("interdicao_cetesb", None, []),
]


def normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


def fetch_json(url: str, params: dict[str, Any], attempts: int = 4) -> dict:
    target = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    request = urllib.request.Request(target, headers={"User-Agent": "SICARD-SLT/1.0"})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return json.loads(response.read())
        except Exception:
            if attempt == attempts - 1:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("Download não concluído")


def download_arcgis(source: Source) -> dict:
    features: list[dict] = []
    offset = 0
    while True:
        print(f"  lote ArcGIS offset={offset}", flush=True)
        data = fetch_json(
            f"{source.url}/query",
            {
                "f": "geojson", "where": "1=1", "outFields": "*",
                "geometry": ",".join(map(str, SP_BBOX)),
                "geometryType": "esriGeometryEnvelope", "inSR": 4674,
                "spatialRel": "esriSpatialRelIntersects", "outSR": 4674,
                "geometryPrecision": 6, "maxAllowableOffset": 0.00001,
                "resultOffset": offset, "resultRecordCount": 2000,
            },
        )
        batch = data.get("features", [])
        features.extend(batch)
        if not data.get("properties", {}).get("exceededTransferLimit") and len(batch) < 2000:
            break
        offset += len(batch)
        if not batch:
            break
    return {"type": "FeatureCollection", "features": features}


def download_wfs_layer(source: Source, layer: str) -> dict:
    features: list[dict] = []
    offset = 0
    count = 1000
    while True:
        print(f"  lote WFS {layer} startIndex={offset}", flush=True)
        data = fetch_json(
            source.url,
            {
                "service": "WFS", "version": "2.0.0", "request": "GetFeature",
                "typeNames": layer, "outputFormat": "application/json",
                "srsName": CRS, "bbox": ",".join(map(str, SP_BBOX)) + ",EPSG:4674",
                "startIndex": offset, "count": count,
            },
        )
        batch = data.get("features", [])
        features.extend(batch)
        print(f"    recebido={len(batch)} acumulado={len(features)}", flush=True)
        if len(batch) < count:
            break
        offset += len(batch)
    return {"type": "FeatureCollection", "features": features}


def download_source(source: Source) -> Path:
    suffix = ".zip" if source.kind == "zip" else ".geojson"
    path = RAW / f"{source.key}{suffix}"
    if path.exists() and path.stat().st_size > 0:
        try:
            gpd.read_file(path, rows=1)
            print(f"  cache local reaproveitado: {path.name}", flush=True)
            return path
        except Exception:
            path.unlink()
    if source.kind == "arcgis":
        data = download_arcgis(source)
    elif source.kind == "wfs":
        data = download_wfs_layer(source, source.layer or "")
    elif source.kind == "zip":
        partial = path.with_suffix(path.suffix + ".part")
        if partial.exists():
            partial.unlink()
        request = urllib.request.Request(source.url, headers={"User-Agent": "SICARD-SLT/1.0"})
        with urllib.request.urlopen(request, timeout=1800) as response, partial.open("wb") as target:
            shutil.copyfileobj(response, target, length=1024 * 1024)
        with zipfile.ZipFile(partial) as archive:
            bad = archive.testzip()
            if bad:
                raise RuntimeError(f"Zip baixado com entrada corrompida: {bad}")
        partial.replace(path)
        return path
    else:
        merged: list[dict] = []
        for layer in (source.layer or "").split(","):
            part = download_wfs_layer(source, layer)
            for feature in part["features"]:
                feature.setdefault("properties", {})["_camada_origem"] = layer
            merged.extend(part["features"])
        data = {"type": "FeatureCollection", "features": merged}
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return path


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_validated(path: Path) -> tuple[gpd.GeoDataFrame, dict]:
    frame = gpd.read_file(path)
    original_crs = str(frame.crs) if frame.crs else None
    if frame.crs is None:
        frame = frame.set_crs(CRS)
    else:
        frame = frame.to_crs(CRS)
    nulls = int(frame.geometry.isna().sum())
    frame = frame.loc[frame.geometry.notna() & ~frame.geometry.is_empty].copy()
    invalid_before = int((~frame.geometry.is_valid).sum())
    if invalid_before:
        frame.geometry = frame.geometry.make_valid()
    frame = frame.loc[~frame.geometry.is_empty].copy()
    return frame, {
        "crs_origem": original_crs, "crs_saida": CRS,
        "geometrias_nulas_removidas": nulls,
        "geometrias_invalidas_corrigidas": invalid_before,
        "feicoes_validas": int(len(frame)),
        "tipos_geometria": sorted(frame.geometry.geom_type.unique().tolist()) if len(frame) else [],
    }


def search_rows(frame: gpd.GeoDataFrame, terms: list[str]) -> gpd.GeoDataFrame:
    if not terms or frame.empty:
        return frame.copy()
    text = frame.drop(columns="geometry").astype(str).agg(" ".join, axis=1).map(normalize)
    mask = pd.Series(True, index=frame.index)
    for term in terms:
        variants = [normalize(x) for x in term.split("|")]
        mask &= text.map(lambda value: any(v in value for v in variants))
    return frame.loc[mask].copy()


def empty_shapefile(folder: Path, name: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    schema = {"geometry": "Point", "properties": {"criterio": "str:80", "status": "str:20"}}
    with fiona.open(folder / f"{name}.shp", "w", driver="ESRI Shapefile", crs=CRS, schema=schema):
        pass


def safe_shapefile_columns(frame: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    keep = ["criterio", "status"]
    extras = [c for c in frame.columns if c not in {"geometry", *keep}][:8]
    copy = frame[[*keep, *extras, "geometry"]].copy()
    used: set[str] = {"geometry"}
    renamed: dict[str, str] = {}
    for column in copy.columns:
        if column == "geometry":
            continue
        base = normalize(column).replace(" ", "_")[:10] or "campo"
        candidate = base
        suffix = 1
        while candidate in used:
            tail = str(suffix)
            candidate = f"{base[:10 - len(tail)]}{tail}"
            suffix += 1
        used.add(candidate)
        renamed[column] = candidate
    return copy.rename(columns=renamed)


def write_shapefile(frame: gpd.GeoDataFrame, name: str) -> None:
    folder = SHP / name
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)
    if frame.empty:
        empty_shapefile(folder, name)
        return
    copy = safe_shapefile_columns(frame)
    copy.to_file(folder / f"{name}.shp", driver="ESRI Shapefile", encoding="UTF-8")


def write_gpkg_layer(frame: gpd.GeoDataFrame, name: str) -> None:
    if frame.empty:
        schema = {"geometry": "Point", "properties": {"criterio": "str", "status": "str"}}
        with fiona.open(GPKG, "w", driver="GPKG", layer=name, crs=CRS, schema=schema):
            pass
    else:
        frame.to_file(GPKG, layer=name, driver="GPKG")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    SHP.mkdir(parents=True, exist_ok=True)
    if GPKG.exists():
        GPKG.unlink()
    report: dict[str, Any] = {
        "gerado_em": datetime.now(UTC).isoformat(), "crs_canonico": CRS,
        "recorte": "Estado de São Paulo", "fontes": {}, "criterios": {},
    }
    loaded: dict[str, gpd.GeoDataFrame] = {}
    for key, source in SOURCES.items():
        print(f"Baixando {key} — {source.organization}", flush=True)
        try:
            raw_path = download_source(source)
            frame, validation = read_validated(raw_path)
            loaded[key] = frame
            report["fontes"][key] = {
                "status": "baixada", "titulo": source.title,
                "orgao": source.organization, "url": source.url,
                "arquivo": str(raw_path.relative_to(ROOT)).replace("\\", "/"),
                "sha256": checksum(raw_path), **validation,
            }
        except Exception as exc:
            loaded[key] = gpd.GeoDataFrame({"geometry": []}, geometry="geometry", crs=CRS)
            report["fontes"][key] = {
                "status": "erro", "titulo": source.title, "orgao": source.organization,
                "url": source.url, "erro": str(exc),
            }

    for criterion, source_key, terms in CRITERIA:
        if source_key is None:
            frame = gpd.GeoDataFrame({"criterio": [], "status": [], "geometry": []}, geometry="geometry", crs=CRS)
            status = "indisponivel"
            reason = "Não foi localizada publicação geoespacial oficial aberta com vigência/aplicabilidade suficientes."
        else:
            frame = search_rows(loaded[source_key], terms)
            frame.insert(0, "criterio", criterion)
            frame.insert(1, "status", "disponivel")
            status = "disponivel" if len(frame) else "indisponivel"
            reason = None if len(frame) else "A fonte oficial foi baixada, mas não contém feições compatíveis com o filtro canônico no recorte."
        write_gpkg_layer(frame, criterion)
        write_shapefile(frame, criterion)
        report["criterios"][criterion] = {
            "status": status, "fonte": source_key, "filtro": terms,
            "feicoes": int(len(frame)), "motivo": reason,
        }
        print(f"  {criterion}: {status} ({len(frame)} feições)", flush=True)

    with zipfile.ZipFile(ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for criterion, _, _ in CRITERIA:
            paths = sorted((SHP / criterion).rglob("*"))
            for path in paths:
                if path.is_file():
                    archive.write(path, path.relative_to(SHP))
    report["artefatos"] = {
        "geopackage": {"arquivo": str(GPKG.relative_to(ROOT)).replace("\\", "/"), "sha256": checksum(GPKG)},
        "shapefiles_zip": {"arquivo": str(ZIP.relative_to(ROOT)).replace("\\", "/"), "sha256": checksum(ZIP)},
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Relatório: {REPORT}")


if __name__ == "__main__":
    main()
