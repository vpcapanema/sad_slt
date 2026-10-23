from pathlib import Path
import hashlib
import json
import sys
from dotenv import load_dotenv

root = Path(__file__).resolve().parent
project = root.parents[1]
sys.path.insert(0, str(project))
load_dotenv(project/'.env')
from api.services import storage_remoto as storage

folder = 'superficies-indices/hierarquizacao/favorabilidade'
base = 'Favorabilidade Rede Trechos pol'
remote = storage.baixar(folder+'/'+base+'.gpkg')
assert hashlib.sha256(remote).digest() == hashlib.sha256((root/(base+'.gpkg')).read_bytes()).digest(), 'Arquivo remoto mudou: preservar a alteracao externa.'
files = [(root/(base+' estilizado.gpkg'),base+'.gpkg'), (root/(base+'.sld'),base+'.sld'), (root/(base+'.qml'),base+'.qml')]
published = {}
for local, name in files:
    storage.enviar(folder+'/'+name, local)
    digest = hashlib.sha256(local.read_bytes()).hexdigest()
    assert hashlib.sha256(storage.baixar(folder+'/'+name)).hexdigest() == digest
    published[name] = digest
(root/'publicacao_estilos.json').write_text(json.dumps(published, indent=2),encoding='utf-8')
print(json.dumps({'arquivos_publicados_e_conferidos':list(published)}, ensure_ascii=True))
