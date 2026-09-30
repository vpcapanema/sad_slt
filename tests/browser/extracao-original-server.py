"""Fixture isolada dos três caminhos, com módulos reais e tiles binários reais."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from jinja2 import Environment, FileSystemLoader
import geopandas as gpd
from shapely.geometry import Point, box
from api.services import extracao_preparacao as preparo, extracao_entrada_local as local
from api.services.metadados_previa import descrever_vetor
local.localizacao = lambda frame: {'status': 'consultado', 'ufs': ['SP']}
# Nunca consulta contas, catálogo ou banco de produção.
items = []
for ident, nome, geom in [('entrada', 'Entrada de teste', Point(-46.5,-23.5)), ('a','Base social',box(-47,-24,-46,-23)), ('b','Base risco',box(-46.8,-23.8,-46.2,-23.2)), ('c','Base econômica',box(-46.6,-23.6,-46.4,-23.4))]:
    frame = gpd.GeoDataFrame({'codigo':['001']}, geometry=[geom], crs=4674)
    meta = descrever_vetor(frame, formato='Fixture')
    items.append(dict(id=ident,nome=nome,tipo='vetor',**preparo.representar(frame,meta,'fixture')))
catalog = {'camadas':[{k:v for k,v in i.items() if k in ('id','nome','tipo')} for i in items], 'categorias':[{'id':i,'nome':n} for i,n in [('social','Social'),('risco','Risco'),('economico','Econômico')]]}
env=Environment(loader=FileSystemLoader(ROOT/'templates'),autoescape=True)
content=''.join(env.get_template('componentes/extracao_atributos/'+n+'.html').render() for n in ['_configuracao','_bancada','_resultados'])
styles=['/assets/vendor/fontawesome/css/all.min.css','/assets/vendor/leaflet/leaflet.css','/assets/vendor/maplibre-gl/maplibre-gl.css','/assets/css/extracao-atributos.css','/assets/css/process_feedback_system.css']
scripts=['/assets/js/notification_system.js','/assets/js/process_feedback_unified.js','/assets/vendor/leaflet/leaflet.js','/assets/vendor/maplibre-gl/maplibre-gl.js','/assets/vendor/maplibre-gl/leaflet-maplibre-gl.js']
html='<html><head><meta charset="utf-8">'+''.join(f'<link rel="stylesheet" href="{s}">' for s in styles)+'</head><body><main id="extracao-app" class="ea-main">'+content+'</main>'+''.join(f'<script src="{s}"></script>' for s in scripts)+'<script type="module" src="/restrict/geoespacial/extracao-atributos/app.js"></script></body></html>'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a):pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def send(self, data, mime='application/json'):
        self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(data if isinstance(data,bytes) else json.dumps(data).encode())
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/restrict/geoespacial/extracao-atributos/':return self.send(html.encode(),'text/html; charset=utf-8')
        if path=='/restrict/geoespacial/bancada/':return self.send(env.get_template('componentes/_geoprocessamento.html').render().encode(),'text/html; charset=utf-8')
        if '/previa-tiles/' in path:
            token,z,x,y=path.split('/previa-tiles/')[1].split('/')
            return self.send(preparo.tile(token,'fixture',int(z),int(x),int(y.split('.')[0])),'application/vnd.mapbox-vector-tile')
        if path.endswith('/catalogo'):return self.send(catalog)
        if path.endswith('/configuracoes'):return self.send({'configuracoes':[{'chave':'teste','arquivo':'teste.json','nome':'Lista de teste','camadas':1,'categorias':1,'bytes':100}] if 'escopo=bases' in self.path else [], 'pasta':'listas de teste'})
        if path.endswith('/configuracoes/teste'):return self.send({'chave':'teste','nome':'Lista de teste','categorias':[{'id':'social','camadas':[{'id':'a','nome':'Base social'}]}],'ausentes':[],'categoria_ativa':'social'})
        if path.endswith('/storage/navegar'):return self.send({'caminho':'base-geoespacial','pastas':[],'arquivos':[]})
        if '/api/' in path:
            if '/auth/' in path:return self.send({'authenticated':True,'id':'fixture','nome':'Teste','username':'Teste','tipo_usuario':'ADMIN'})
            return self.send([])
        self.path=self.path.replace('/restrict/geoespacial/','/geoespacial/')
        if not self.path.startswith(('/geoespacial/','/assets/')):return self.send_error(404)
        super().do_GET()
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))) or b'{}')
        if self.path.endswith('/preparar-camada'):return self.send(next(i for i in items if i['id']==body['id']))
        if self.path.endswith('/compatibilizar'):return self.send({'compativel':True,'camadas':body['camadas'],'erros':[]})
        return self.send_error(404)

if __name__=='__main__':
    port=int(sys.argv[1]) if len(sys.argv)>1 else 8097
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    print(f'http://127.0.0.1:{port}/restrict/geoespacial/extracao-atributos/',flush=True)
    server.serve_forever()
