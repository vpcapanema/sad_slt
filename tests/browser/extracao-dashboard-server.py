"""Servidor de fixture para verificar o painel real sem importar ou acessar o banco."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json
import sys
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT), str(ROOT / 'tests')]
from test_extracao_dashboard import fixture
from api.services.extracao_atributos_dashboard import analisar
from api.services.extracao_resultados_territoriais import consultar as territorial

ROWS, FIELDS = fixture()
ROWS += [{'camada_origem':'Projetos','fid_origem':i,'id_origem':f'P{i}','id_registro':i+3,
          'classe':'Campo' if i % 2 else 'Floresta','valor':i,'n':1,'n2':i % 2,'n3':0} for i in range(2,32)]
ROWS[4]['classe'] = '<img src=x onerror=alert(1)>'
CATEGORIES = [{'nome':'Ambiental','conceito':'Conceito ambiental da fixture.'}, {'nome':'Social','conceito':'Conceito social da fixture.'}]
RESULT = {'id':'00000000-0000-0000-0000-000000000001','modo':'enriquecimento','operacao':'estatisticas',
          'camadas':{'pontos':{'registros':len(ROWS),'campos':8}},'categorias':[],
          'dicionario':[{**d,'camada':'pontos'} for d in FIELDS], 'validacao':{'aprovada':True},'resumo':{}}

BASES = [{'id':'r','nome':'Áreas de risco','categoria':'risco','cobertura_completa':True},
         {'id':'s','nome':'Áreas de restrição','categoria':'restricao','cobertura_completa':True}]
AREAS = {key:{'id':key,'base_id':base,'base':name,'categoria':category,'fid':i,
              'atributos':{'nome':label},'geometria':{'type':'Polygon','coordinates':[[[-47,-23],[-46.9,-23],[-46.9,-22.9],[-47,-22.9],[-47,-23]]]}}
         for i,(key,base,name,category,label) in enumerate([
             ('r1','r','Áreas de risco','risco','Inundação'),('s1','s','Áreas de restrição','restricao','Área protegida')])}
SNAPSHOT = {'versao':1,'bases':BASES,'areas':AREAS,'entradas':[
    {'nome':name,'feicoes':[{'fid':i,'identificador':f'D-{i}','atributos':{'nome':f'Demanda {i}'},
                           'geometria_disponivel':True,'geometria':{'type':'Point','coordinates':[-46.99+i*.001,-22.99]},
                           'relacoes':{'r1':{'tipo':'contato_borda','area_m2':0,'comprimento_m':None},'s1':{'tipo':'intersecao_interior','area_m2':12,'comprimento_m':None}},
                           'areas':(['r1'] if i%2==0 else [])+(['s1'] if i%3==0 else []),
                           'bases_intersectadas':(['r'] if i%2==0 else [])+(['s'] if i%3==0 else [])}
                          for i in range(n)]} for name,n in [('Rodovias',30),('Ferrovias',2)]]}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path == '/':
            content = Environment(loader=FileSystemLoader(ROOT / 'templates'), autoescape=True).get_template('componentes/extracao_atributos/_resultados.html').render()
            html = f'''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <link rel="stylesheet" href="/assets/css/extracao-atributos.css">
            <link rel="stylesheet" href="/assets/vendor/leaflet/leaflet.css">
            <style>body{{font-family:Arial,sans-serif;margin:0;background:#f3f6f8}}*{{box-sizing:border-box}}main{{padding:20px;max-width:1450px;margin:auto}}</style>
            <main class="ea-main">{content}</main><script src="/assets/vendor/leaflet/leaflet.js"></script>
            <script type="module">import {{criarResultados}} from '/restrict/geoespacial/extracao-atributos/resultados.js';
            window.resultado={json.dumps(RESULT)};window.painel=criarResultados();painel.set(resultado);</script></html>'''.encode()
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.end_headers(); self.wfile.write(html)
        else:
            self.path = self.path.replace('/restrict/geoespacial/extracao-atributos/', '/geoespacial/extracao-atributos/')
            super().do_GET()

    def do_POST(self):
        payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        if self.path.endswith('/intersecoes'):
            data=territorial(SNAPSHOT,**payload)
            self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers()
            self.wfile.write(json.dumps(data).encode()); return
        payload.pop('camada', None)
        data = analisar(ROWS, FIELDS, CATEGORIES, **payload)
        data.update({'mapa':{'type':'FeatureCollection','features':[
            {'type':'Feature','properties':{'posicao':r['posicao']},'geometry':{'type':'Point','coordinates':[-47+r['posicao']*.04,-23+r['posicao']*.01]}}
            for r in data['linhas']]}, 'representacao_mapa':{'metodo':'original'},
            'execucao':RESULT['id'],'camada':'pontos','conceito_origem':'Conceitos da fixture','criado_em':'2026-09-25T12:00:00Z'})
        self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers()
        self.wfile.write(json.dumps(data).encode())


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    print(server.server_address[1], flush=True)
    server.serve_forever()
