"""API embutível, somente leitura. Execução local: python -B server/app.py."""
import csv
from contextlib import contextmanager
import io
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sqlite3
import tempfile
import zipfile
import geopandas as gpd
import pandas as pd
try:
    from .import_data import DATA, ROOT
    from . import export_support
except ImportError:  # Execução standalone e testes originais.
    from import_data import DATA, ROOT
    import export_support

@contextmanager
def connection():
    conn = sqlite3.connect(f'file:{DATA / "catalog.sqlite"}?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def catalog():
    with connection() as conn:
        items = [dict(row) for row in conn.execute('SELECT * FROM attributes ORDER BY source,year DESC,theme,field')]
    for item in items:
        multiplier = json.loads(item['detail']).get('multiplicador')
        if multiplier not in (None, '', 1, 1.0):
            item['unit'] = f"{item['unit']} × {float(multiplier):g}"
    return items

def selection(ids):
    if not isinstance(ids, list) or not ids or len(ids) > 6500 or any(not isinstance(i,str) for i in ids):
        raise ValueError('Selecione entre 1 e 6500 atributos.')
    if len(set(ids)) != len(ids):
        raise ValueError('Atributos repetidos na seleção.')
    all_items = {a['id']:a for a in catalog()}
    if any(i not in all_items for i in ids):
        raise ValueError('Atributo não encontrado no catálogo.')
    return sorted((all_items[i] for i in ids), key=lambda a:(a['source'],a['theme'],a['year'],a['field']))

def layer(items):
    frame = gpd.read_file(DATA/'municipios.gpkg', layer='municipios').set_index('CD_MUN')
    columns = {}
    with connection() as conn:
        for item in items:
            records = conn.execute('SELECT municipality,value FROM observations WHERE attribute_id=?', (item['id'],)).fetchall()
            columns[item['field']] = pd.Series([r[1] for r in records], index=[r[0] for r in records], dtype='float64')
    return export_support.join_attributes(frame, columns)

def export_layer(payload):
    items = selection(payload.get('attributes'))
    fmt = payload.get('format', 'fgb')
    limits = {'fgb':6500, 'gpkg':1900, 'shp':250, 'geojson':6500}
    if fmt not in limits:
        raise ValueError('Formato inválido.')
    if len(items) > limits[fmt]:
        raise ValueError(f'Este formato permite até {limits[fmt]} atributos nesta aplicação. Use FlatGeobuf.')
    frame = layer(items)
    fields = {i['field']: (f'A{n:06d}' if fmt == 'shp' else i['field']) for n,i in enumerate(items,1)}
    frame = frame.rename(columns=fields)
    # Uma geometria homogênea, sem simplificação, para interoperabilidade.
    from shapely.geometry import MultiPolygon
    frame.geometry = frame.geometry.map(lambda g: MultiPolygon([g]) if g.geom_type == 'Polygon' else g)
    manifest = {'join':frame.attrs['join'], 'municipalities':len(frame),'crs':'EPSG:4674','geometry_year':2022,
                'geometry_source':'IBGE · Malha municipal 2022 · São Paulo',
                'format':fmt,'attributes':[{**i,'export_field':fields[i['field']]} for i in items],
                'notes':['Ausência de valor permanece nula; zero é preservado.',
                         'Campos agrupados por fonte, tema e ano. Nenhum join externo é necessário.',
                         'Anos dos indicadores não alteram a malha de referência de 2022.']}
    with tempfile.TemporaryDirectory(prefix='municipal-layer-') as temp:
        folder = Path(temp)
        output = folder/f'municipios_sp.{fmt}'
        frame.to_file(output, driver={'fgb':'FlatGeobuf','gpkg':'GPKG','shp':'ESRI Shapefile','geojson':'GeoJSON'}[fmt], encoding='UTF-8', index=False,
                      **({'COORDINATE_PRECISION': 17, 'SIGNIFICANT_FIGURES': 17} if fmt == 'geojson' else {}))
        with (folder/'dicionario.csv').open('w', encoding='utf-8-sig',newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['campo','indicador','fonte','ano','tema','unidade','url','municipios_com_valor','campo_bruto','alias'])
            writer.writeheader()
            for field, label in [('CD_MUN','Código do município (IBGE)'),('NM_MUN','Nome do município'),('SIGLA_UF','Unidade da federação'),('AREA_KM2','Área do município (km²)')]:
                writer.writerow({'campo':field,'campo_bruto':field,'alias':label,'indicador':label})
            for i in items:
                writer.writerow(dict(zip(writer.fieldnames,[fields[i['field']],i['label'],i['source'],i['year'],i['theme'],i['unit'],i['url'],i['coverage'],i['field'],i['label']])))
        actual = export_support.reopen_and_validate(output, frame)
        export_support.write_tables_and_report(folder, 'municipios_sp', actual, manifest, metadata_name='metadados.json')
        (folder/'metadados.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as archive:
            for file in folder.iterdir():
                archive.write(file,file.name)
        return buffer.getvalue()

class Handler(BaseHTTPRequestHandler):
    def send(self,status,data,kind='application/json; charset=utf-8'):
        self.send_response(status)
        self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        if kind == 'application/zip':
            self.send_header('Content-Disposition','attachment; filename="municipios_sp.zip"')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == '/api/catalog':
            self.send(200,json.dumps({'attributes':catalog(),'municipalities':645,'crs':'EPSG:4674','geometryYear':2022},ensure_ascii=False).encode())
            return
        base = ROOT/'demo-dist'
        relative = self.path.split('?')[0].lstrip('/') or 'index.html'
        file = (base/relative).resolve()
        if not file.is_relative_to(base.resolve()) or not file.is_file():
            self.send(404,b'{"error":"Recurso inexistente"}')
            return
        import mimetypes
        self.send(200,file.read_bytes(),mimetypes.guess_type(file)[0] or 'application/octet-stream')

    def do_POST(self):
        try:
            if self.path not in ['/api/preview','/api/export']:
                self.send(404,b'{}'); return
            length = int(self.headers.get('Content-Length',0))
            if not 0 < length <= 1_000_000:
                raise ValueError('Corpo da requisição inválido.')
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload,dict):
                raise ValueError('Configuração deve ser um objeto.')
            if self.path == '/api/export':
                self.send(200,export_layer(payload),'application/zip')
            else:
                items = selection(payload.get('attributes'))
                frame = layer(items[:8]).drop(columns='geometry').head(5)
                self.send(200,json.dumps({'rows':json.loads(frame.to_json(orient='records')), 'fields':[i['field'] for i in items[:8]],'totalAttributes':len(items)},ensure_ascii=False).encode())
        except (ValueError,TypeError) as exc:
            self.send(400,json.dumps({'error':str(exc)},ensure_ascii=False).encode())
        except Exception:
            import traceback
            traceback.print_exc()
            self.send(500,b'{"error":"Falha ao gerar camada. Consulte o log do servidor."}')

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=18765)
    args = parser.parse_args()
    print(f'http://127.0.0.1:{args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
