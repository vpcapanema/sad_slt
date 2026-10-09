"""Recorte operacional estimado de SP: fontes IBGE/ANP, operações OGR em 5880.
Não constitui nova demarcação legal nem modifica as geometrias recebidas.
"""
import json, math, hashlib
from pathlib import Path
from osgeo import ogr
from api.services.normalizacao_demanda import reprojetar

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/referencias-territoriais'
LIMITES=[
    {'divisa':'RJ/SP','longitude':-(44+43/60+21.7/3600),'latitude':-(23+22/60+13.5/3600),'azimute_tabela':327+29/60+7.07/3600},
    {'divisa':'SP/PR','longitude':-(48+4/60+56/3600),'latitude':-(25+19/60+10/3600),'azimute_tabela':311+44/60+23.24/3600},
]

def point(lon,lat):
    g=ogr.Geometry(ogr.wkbPoint);g.AddPoint_2D(lon,lat)
    return reprojetar(g,4326,5880)

def halfplane(limit):
    lon,lat=limit['longitude'],limit['latitude']
    origin=point(lon,lat);north=point(lon,lat+0.00001)
    # Orientação cartográfica estimada a partir dos azimutes geográficos da tabela.
    north_angle=math.atan2(north.GetX()-origin.GetX(),north.GetY()-origin.GetY())
    angle=north_angle+math.radians(limit['azimute_tabela'])
    dx,dy=math.sin(angle),math.cos(angle);nx,ny=-dy,dx
    seed=point(-46,-25)
    if (seed.GetX()-origin.GetX())*nx+(seed.GetY()-origin.GetY())*ny<0:nx,ny=-nx,-ny
    length=4000000
    ax,ay=origin.GetX()-length*dx,origin.GetY()-length*dy
    bx,by=origin.GetX()+length*dx,origin.GetY()+length*dy
    ring=ogr.Geometry(ogr.wkbLinearRing)
    for x,y in [(ax,ay),(bx,by),(bx+length*nx,by+length*ny),(ax+length*nx,ay+length*ny),(ax,ay)]:ring.AddPoint_2D(x,y)
    poly=ogr.Geometry(ogr.wkbPolygon);poly.AddGeometry(ring);return poly

def main():
    source=BASE/'sistema-costeiro-marinho-2024/SistCostMar_AmAz_2024.shp'
    ds=ogr.Open(str(source));layer=ds.GetLayer();ocean=None
    for f in layer:
        g=reprojetar(f.GetGeometryRef(),layer.GetSpatialRef().ExportToWkt(),5880)
        ocean=g if ocean is None else ocean.Union(g)
    for limit in LIMITES:ocean=ocean.Intersection(halfplane(limit))
    # Retira terra firme e ilhas dos 27 estados, evitando aceitar território vizinho.
    states=json.loads((BASE/'estados-anp-ibge.geojson').read_text(encoding='utf-8'))
    for f in states['features']:
        g=reprojetar(ogr.CreateGeometryFromJson(json.dumps(f['geometry'])),4326,5880)
        if ocean.Intersects(g):ocean=ocean.Difference(g)
    assert ocean is not None and not ocean.IsEmpty() and ocean.IsValid()
    geometry=json.loads(reprojetar(ocean,5880,4674).ExportToJson())
    output={'type':'FeatureCollection','crs':{'type':'name','properties':{'name':'EPSG:4674'}},'features':[
        {'type':'Feature','properties':{'nome':'Área marítima de referência de São Paulo','natureza':'recorte operacional estimado','metodo':'semiplanos cartográficos EPSG:5880, azimutes IBGE/ANP, interseção SCM 2024, exclusão terra firme','area_km2':ocean.Area()/1e6},'geometry':geometry}]}
    target=BASE/'abrangencia-marinha-sp.geojson'
    target.write_text(json.dumps(output,ensure_ascii=False),encoding='utf-8')
    metadata={'fontes':[
      'https://imagem.camara.leg.br/Imagem/d/pdf/295anc19ago1988.pdf',
      'https://royaltiesdopetroleo.ucam-campos.br/wp-content/uploads/2017/05/Guia_Royalties.pdf',
      'https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/biomas/vetores/SistCostMar_AmAz_2024.zip',
      'https://geomaps.anp.gov.br/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=sisroc:estado_view_geoanp&outputFormat=application/json&srsName=EPSG:4326'],
      'pontos_azimutes':LIMITES,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
      'limitacoes':'Estimativa operacional a partir de tabela histórica, não arquivo oficial de divisas. Coordenadas históricas tratadas como geográficas WGS84 para aproximação; datum não informado na tabela. Projeções cartográficas retas não reproduzem exatamente as geodésicas jurídicas. Não usar para demarcação, royalties ou licenciamento.'}
    (BASE/'abrangencia-marinha-sp-fontes.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Recorte gerado:',round(ocean.Area()/1e6,2),'km2')

if __name__=='__main__':main()
