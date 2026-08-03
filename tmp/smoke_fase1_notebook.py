import shutil, tempfile, zipfile
from pathlib import Path
import geopandas as gpd
import pandas as pd
import openpyxl

REPO_ROOT = Path(r"d:\REPOSITORIOS\sistema_apoio_a_tomada_de_decisao_web")
DATA_DIR = REPO_ROOT / "data"
GEO_DIR = DATA_DIR / "geoespacial"
LOCAL_DIR = GEO_DIR / "local"
MASK_PATH = GEO_DIR / "outputs" / "vetor" / "uf_sp.shp"

CRS_OP = "EPSG:31983"

wb = openpyxl.load_workbook(DATA_DIR / "Matriz_Criterios_Premissas_PLI-SP.xlsx", data_only=True)
ws = wb["Índice Risco e Restrição"]
linhas = list(ws.iter_rows(values_only=True))
regs = []
for r in linhas[1:]:
    if r[0] is None:
        continue
    regs.append({"ordem": r[0], "criterio": r[1], "nivel_base": r[3]})
df = pd.DataFrame(regs)
df["tipo"] = df["nivel_base"].apply(lambda n: "restricao" if n == 4 else "risco")
print("Excel: total=", len(df), "restricao=", (df.tipo == "restricao").sum(), "risco=", (df.tipo == "risco").sum())

mask = gpd.read_file(MASK_PATH).to_crs(CRS_OP)
mask_geom = mask.union_all()
print("Mascara SP area km2:", round(mask_geom.area / 1e6, 1))

def teste(zip_path, is_point=False):
    tmp = Path(tempfile.mkdtemp())
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(tmp)
    shp = next(tmp.rglob("*.shp"))
    g = gpd.read_file(shp).to_crs(CRS_OP)
    g["geometry"] = g.geometry.make_valid()
    g = g[~g.geometry.is_empty & g.geometry.notna()].copy()
    if is_point:
        g["geometry"] = g.geometry.buffer(500)
    g = gpd.clip(g, mask_geom)
    shutil.rmtree(tmp, ignore_errors=True)
    return g

ti = teste(LOCAL_DIR / "terras_indigenas" / "tis_poligonais.zip", False)
print("TI em SP:", len(ti), "feicoes, area km2:", round(float(ti.geometry.area.sum()) / 1e6, 2))

cav = teste(LOCAL_DIR / "cavidades" / "CavidadesCecav.zip", True)
print("Cavidades buffer 500m em SP:", len(cav), "feicoes")
print("Colunas cavidades:", [c for c in cav.columns if c != "geometry"][:15])

uc = teste(LOCAL_DIR / "ucs_mma" / "ucs_mma.zip", False)
print("UCs MMA em SP:", len(uc), "feicoes")
print("Colunas UC:", [c for c in uc.columns if c != "geometry"][:15])
