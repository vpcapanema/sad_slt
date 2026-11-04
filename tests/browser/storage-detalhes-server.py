"""Fixture visual com templates/estilos reais; sem autenticação nem dados oficiais."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parents[2]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.startswith("/explorer"):
            template = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=True).get_template(
                "paginas/geoespacial/explorador-camadas.html")
            context = template.new_context({})
            html = '<!doctype html><html><meta charset="utf-8">'
            html += '<link rel="stylesheet" href="/assets/css/app.css"><link rel="stylesheet" href="/assets/css/table-standard.css">'
            html += "".join(template.blocks["estilos_pagina"](context))
            html += '<link rel="stylesheet" href="/assets/css/table-scrollbars.css?v=20261027-1"><link rel="stylesheet" href="/assets/css/explorador-acoes.css?v=20261104-menu">'
            html += '<body>' + "".join(template.blocks["conteudo"](context))
            html += '<script src="/assets/js/notification_system.js"></script><script src="/assets/js/table-sort.js"></script>'
            html += "".join(template.blocks["scripts_pagina"](context)) + '</body></html>'
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode())
        elif self.path == "/":
            referencia = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=True).get_template(
                "componentes/_tabela_colaborativa.html").render(
                    tabela_colaborativa_comparacao=True, tabela_colaborativa_id="ami-judgments")
            folhas = ["app", "analise-multicriterio-tabela", "table-standard", "admin-table-controls",
                      "paginas/ami-espaco-secoes", "extracao-atributos"]
            html = '<!doctype html><html lang="pt-BR"><meta charset="utf-8">'
            html += "".join(f'<link rel="stylesheet" href="/assets/css/{css}.css">' for css in folhas)
            html += '<link rel="stylesheet" href="/assets/vendor/fontawesome/css/all.min.css">'
            html += f'<body class="ami-page ami-espaco-page"><main class="ami-main">{referencia}</main>'
            html += '<script src="/assets/js/table-standard.js"></script><script src="/assets/js/table-smart-widths.js"></script>'
            html += '<script src="/assets/js/table-sort.js"></script>'
            html += '<script src="/assets/js/notification_system.js"></script>'
            html += '<link rel="stylesheet" href="/assets/css/storage-pastas.css"><script src="/geoespacial/geoespacial-storage-pastas.js"></script>'
            html += '<link rel="stylesheet" href="/assets/css/table-scrollbars.css?v=20261027-1"><link rel="stylesheet" href="/assets/css/explorador-acoes.css?v=20261104-menu">'
            html += """<script type="module">
              import {escolherArquivo} from '/geoespacial/extracao-atributos/explorador.js';
              window.abrir=options=>escolherArquivo({title:'Selecionar análise de elegibilidade já realizada',
                raiz:'saidas-geoespaciais',validar:false,somenteReferencias:true,...options});
            </script></body></html>"""
            data = html.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(data)
        else:
            self.path = self.path.replace("/restrict/geoespacial/", "/geoespacial/")
            super().do_GET()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    print(server.server_address[1], flush=True)
    server.serve_forever()
