"""Servidor de fixture para verificar o painel real sem importar ou acessar o banco."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT), str(ROOT / 'tests')]
from test_extracao_dashboard import fixture
from api.services.extracao_atributos_dashboard import analisar

ROWS, FIELDS = fixture()
ROWS += [{'camada_origem':'Projetos','fid_origem':i,'id_origem':f'P{i}','id_registro':i+3,
          'classe':'Campo' if i % 2 else 'Floresta','valor':i,'n':1,'n2':i % 2,'n3':0} for i in range(2,32)]
ROWS[4]['classe'] = '<img src=x onerror=alert(1)>'
CATEGORIES = [{'nome':'Ambiental','conceito':'Conceito ambiental da fixture.'}, {'nome':'Social','conceito':'Conceito social da fixture.'}]
RESULT = {'id':'00000000-0000-0000-0000-000000000001','modo':'enriquecimento','operacao':'estatisticas',
          'camadas':{'pontos':{'registros':len(ROWS),'campos':8}},'categorias':[],
          'dicionario':[{**d,'camada':'pontos'} for d in FIELDS], 'validacao':{'aprovada':True},'resumo':{}}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path == '/':
            content = (ROOT / 'templates/componentes/extracao_atributos/_resultados.html').read_text()
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
