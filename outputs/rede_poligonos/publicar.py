from pathlib import Path
import hashlib
import json
import sys
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT/'.env')
from api.services import storage_remoto

folder = 'superficies-indices/hierarquizacao/favorabilidade'
local = Path(__file__).resolve().parent
name = 'Favorabilidade Rede Trechos pol.gpkg'
report = json.loads((local/'validacao.json').read_text(encoding='utf-8'))
assert report['atributos_identicos'] and report['geometria_valida'] and report['registros'] == 4782
original = storage_remoto.baixar(folder+'/favorabilidade_rede_trechos.gpkg')
assert hashlib.sha256(original).digest() == hashlib.sha256((local/'favorabilidade_rede_trechos_original.gpkg').read_bytes()).digest(), 'A fonte remota mudou durante o processamento.'
assert not any(item['nome'] == name for item in storage_remoto.listar(folder, estrito=True)), 'Destino ja existe: nao sobrescrever automaticamente.'
storage_remoto.enviar(folder+'/'+name, local/name)
downloaded = storage_remoto.baixar(folder+'/'+name)
digest = hashlib.sha256((local/name).read_bytes()).hexdigest()
assert hashlib.sha256(downloaded).hexdigest() == digest, 'Arquivo publicado difere da copia validada.'
report.update(destino_storage=folder+'/'+name, sha256=digest, publicado_e_conferido=True, bytes=len(downloaded))
(local/'validacao.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({key:report[key] for key in ('destino_storage','sha256','publicado_e_conferido','bytes')}, ensure_ascii=False, indent=2))
