from pathlib import Path
from collections import defaultdict
import math
import geopandas as gpd
import numpy as np
import shapely as s
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parent
lines = gpd.read_file(root/'favorabilidade_rede_trechos_original.gpkg')
polys = gpd.read_file(root/'Favorabilidade Rede Trechos pol.gpkg')
nodes = defaultdict(list)
for i, geom in enumerate(lines.geometry):
    for part in s.get_parts(geom):
        for c, d in [(part.coords[0],part.coords[1]),(part.coords[-1],part.coords[-2])]:
            v = np.array(d[:2])-c[:2]
            nodes[tuple(c[:2])].append((i,v/np.linalg.norm(v)))
selected = []
for degree, title in [(2,'Encontro em ângulo'),(3,'Junção de três trechos'),(4,'Junção de quatro trechos'),(1,'Extremidade livre')]:
    for p, incident in nodes.items():
        if len(incident) != degree or len(set(i for i,v in incident)) != degree:
            continue
        if degree == 2:
            angle = math.degrees(math.acos(float(np.clip(np.dot(incident[0][1],incident[1][1]),-1,1))))
            if not 60 < angle < 120:
                continue
        selected.append((p,title))
        break
fig, axes = plt.subplots(2,2,figsize=(12,12),layout='constrained')
for ax,(p,title) in zip(axes.flat,selected):
    extent = s.box(p[0]-120,p[1]-120,p[0]+120,p[1]+120)
    ids = list(polys.sindex.query(extent,predicate='intersects'))
    local = polys.iloc[ids].copy()
    local.geometry = local.geometry.intersection(extent)
    local.plot(ax=ax,color=[plt.get_cmap('tab20')(int(i)%20) for i in ids],edgecolor='#263746',linewidth=.5,alpha=.65)
    local_lines = lines.iloc[list(lines.sindex.query(extent,predicate='intersects'))].copy()
    local_lines.geometry = local_lines.geometry.intersection(extent)
    local_lines.plot(ax=ax,color='#1c2630',linewidth=.7,linestyle='--')
    ax.set_xlim(p[0]-120,p[0]+120); ax.set_ylim(p[1]-120,p[1]+120)
    ax.set_title(title); ax.set_aspect('equal'); ax.set_axis_off()
fig.suptitle('Buffer de 25 m por lado — divisas e limites dos trechos',fontsize=15)
fig.savefig(root/'conferencia_divisas.png',dpi=160)
