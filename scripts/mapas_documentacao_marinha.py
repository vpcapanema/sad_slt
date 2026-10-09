"""Figuras científicas do recorte efetivamente adotado; não altera dados fonte.
Executar com matplotlib e GDAL disponíveis: python -m scripts.mapas_documentacao_marinha.
"""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.path import Path as PlotPath
from matplotlib.patches import PathPatch, Patch
from osgeo import ogr
from scripts.gerar_abrangencia_marinha_sp import BASE, LIMITES, halfplane, point
from api.services.normalizacao_demanda import reprojetar

OUT = Path('assets/images/documentacao/limite-maritimo')
OUT.mkdir(parents=True, exist_ok=True)
states = json.loads((BASE/'estados-anp-ibge.geojson').read_text(encoding='utf-8'))
land = [reprojetar(ogr.CreateGeometryFromJson(json.dumps(f['geometry'])),4326,5880) for f in states['features']]
data = json.loads((BASE/'abrangencia-marinha-sp.geojson').read_text(encoding='utf-8'))
result = reprojetar(ogr.CreateGeometryFromJson(json.dumps(data['features'][0]['geometry'])),4674,5880)
ds = ogr.Open(str(BASE/'sistema-costeiro-marinho-2024/SistCostMar_AmAz_2024.shp'))
layer = ds.GetLayer()
feature = layer.GetNextFeature()
national = reprojetar(feature.GetGeometryRef().Clone(),layer.GetSpatialRef().ExportToWkt(),5880)

def draw(ax, geom, color, edge='#526879', alpha=1):
    if geom.GetGeometryName() in ('POLYGON', 'CURVEPOLYGON'):
        vertices=[]; codes=[]
        for ring in geom:
            pts=[(p[0]/1000,p[1]/1000) for p in ring.GetPoints()]
            if not pts: continue
            vertices.extend(pts); codes.extend([PlotPath.MOVETO]+[PlotPath.LINETO]*(len(pts)-2)+[PlotPath.CLOSEPOLY])
        ax.add_patch(PathPatch(PlotPath(vertices,codes),facecolor=color,edgecolor=edge,lw=.45,alpha=alpha))
    else:
        for child in geom: draw(ax,child,color,edge,alpha)

def setup(ax, bounds, title):
    ax.set_facecolor('#edf6fb')
    ax.set_xlim(bounds[:2]); ax.set_ylim(bounds[2:]); ax.set_aspect('equal')
    ax.set_title(title,loc='left',fontsize=12,fontweight='bold',color='#003b5a',pad=12)
    ax.set_xlabel('Easting / 1.000 (km) · EPSG:5880',fontsize=8)
    ax.set_ylabel('Northing / 1.000 (km)',fontsize=8)
    ax.tick_params(labelsize=7); ax.grid(alpha=.18)
    # Cartographic north arrow: geographic north direction at panel centre.
    ax.annotate('↑ N de grade',xy=(.96,.94),xycoords='axes fraction',ha='right',fontsize=8)
    width=bounds[1]-bounds[0]; length=100 if width>500 else 50
    x=bounds[0]+width*.07; y=bounds[2]+(bounds[3]-bounds[2])*.06
    ax.plot([x,x+length],[y,y],color='#003b5a',lw=3)
    ax.text(x+length/2,y+(bounds[3]-bounds[2])*.025,f'{length} km (grade)',ha='center',fontsize=8)

def save(fig,name):
    fig.text(.5,.015,'Fontes: IBGE SCM 2024; estados GeoANP; tabela histórica ANP. Recorte operacional estimado SICARD.',ha='center',fontsize=8,color='#526879')
    fig.savefig(OUT/f'{name}.png',dpi=170,bbox_inches='tight',facecolor='white')
    fig.savefig(OUT/f'{name}.svg',bbox_inches='tight',facecolor='white')
    plt.close(fig)

env=result.GetEnvelope(); bounds=(env[0]/1000-100,env[1]/1000+100,env[2]/1000-100,env[3]/1000+250)
fig,ax=plt.subplots(figsize=(11,8))
setup(ax,bounds,'Recorte marítimo adotado e contexto regional')
draw(ax,national,'#c5e5f3',edge='#82b8ce'); draw(ax,result,'#32b995',edge='#057552')
for g in land: draw(ax,g,'#e5e8df')
for name,lon,lat in [('São Paulo',-46.63,-23.55),('Santos',-46.3,-23.96),('Rio de Janeiro',-43.2,-22.9),('Paraná',-49,-25.5)]:
    p=point(lon,lat);ax.text(p.GetX()/1000,p.GetY()/1000,name,fontsize=9)
for lim in LIMITES:
    p=point(lim['longitude'],lim['latitude']);ax.plot(p.GetX()/1000,p.GetY()/1000,'o',color='#bd5c26',ms=5)
    ax.annotate(lim['divisa'],(p.GetX()/1000,p.GetY()/1000),xytext=(8,8),textcoords='offset points',fontsize=9)
ax.legend(handles=[Patch(facecolor='#32b995',label='Recorte estimado SP'),Patch(facecolor='#c5e5f3',label='Sistema Costeiro-Marinho 2024'),Patch(facecolor='#e5e8df',label='Terra e ilhas (GeoANP)')],loc='lower right',fontsize=8)
save(fig,'resultado')

fig,axes=plt.subplots(2,2,figsize=(13,11))
steps=[national,national.Intersection(halfplane(LIMITES[0])),national.Intersection(halfplane(LIMITES[0])).Intersection(halfplane(LIMITES[1])),result]
titles=['1 · Envelope nacional SCM 2024','2 · Interseção com semiplano RJ/SP','3 · Interseção com semiplano SP/PR','4 · Exclusão de terra e ilhas']
for ax,g,title in zip(axes.flat,steps,titles):
    setup(ax,bounds,title);draw(ax,g,'#32b995')
    for l in land:draw(ax,l,'#e5e8df',alpha=.85)
fig.subplots_adjust(hspace=.28,wspace=.22,bottom=.08)
save(fig,'metodo')

cases=[('A · Mar paulista',-45.5,-25),('B · Próximo a Santos',-46.3,-24.1),('C · Mar ao largo do RJ',-42.5,-23.5),('D · Mar ao largo do PR',-47.8,-26)]
fig,ax=plt.subplots(figsize=(11,8));setup(ax,(bounds[0]-100,bounds[1]+180,bounds[2],bounds[3]),'Exemplos sintéticos: teste de inclusão no recorte')
draw(ax,result,'#b7e6d7')
for l in land:draw(ax,l,'#e5e8df')
for name,lon,lat in cases:
    p=point(lon,lat);inside=result.Intersects(p)
    ax.plot(p.GetX()/1000,p.GetY()/1000,'o' if inside else 'X',color='#07805b' if inside else '#b43d42',ms=8)
    ax.annotate(name,(p.GetX()/1000,p.GetY()/1000),xytext=(9,7),textcoords='offset points',fontsize=9)
ax.legend(handles=[Patch(facecolor='#07805b',label='Dentro do recorte'),Patch(facecolor='#b43d42',label='Fora do recorte')],fontsize=9,loc='lower right')
save(fig,'exemplos')
print('Três figuras exportadas em PNG e SVG:', OUT)
