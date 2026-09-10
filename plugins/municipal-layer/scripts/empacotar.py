"""Empacota código, builds, banco, insumos e evidências com manifesto verificável."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import zipfile
from verificar_pacote import verify

APP = Path(__file__).resolve().parents[1]
BASE = APP.parent
SOURCE = BASE/'censo2022_sp'
EXCLUDED = {'node_modules', '__pycache__', '.venv', '.git', '.vscode'}

def digest_file(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=BASE/'municipal-layer-completo-v1.0.0.zip')
    args = parser.parse_args()
    output = args.output.resolve()
    sidecar = Path(str(output)+'.sha256')
    if output.exists() or sidecar.exists():
        raise SystemExit('Saída já existe; use --output com outro nome.')
    if output.is_relative_to(APP) or output.is_relative_to(SOURCE):
        raise SystemExit('Grave o ZIP fora das pastas incluídas para evitar auto-inclusão.')
    lock = json.loads((APP/'package-lock.json').read_text(encoding='utf-8'))
    libraries = ['geopandas','pyogrio','pandas','numpy','shapely','pyproj','requests','packaging','certifi','charset-normalizer','idna','urllib3','python-dateutil','six','tzdata']
    versions = {}
    for name in libraries:
        try:
            versions[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            versions[name] = None
    environment = {'captured_at_utc':datetime.now(timezone.utc).isoformat(),
                   'python':platform.python_version(), 'system':platform.system(),
                   'python_packages':versions,
                   'javascript_lockfile':{name:lock['packages'].get('node_modules/'+name,{}).get('version') for name in ['react','react-dom','vite','@vitejs/plugin-react']},
                   'note':'Versões observadas; não é lockfile Python nem garantia de reprodução em outros sistemas.'}
    (APP/'AMBIENTE_VALIDACAO.json').write_text(json.dumps(environment,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    paths = []
    for file in APP.rglob('*'):
        if file.is_file() and not EXCLUDED.intersection(file.relative_to(APP).parts) and file.suffix not in {'.log','.pyc'}:
            paths.append(file)
    for directory in ['malha_original','camada_unica','fontes','tabelas','documentacao']:
        folder = SOURCE/directory
        if not folder.is_dir():
            raise SystemExit(f'Insumo ausente: {folder}')
        paths.extend(p for p in folder.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    extras = SOURCE/'socioeconomico_desenvolvimento'
    paths.extend(p for p in extras.rglob('*') if p.is_file() and p.suffix not in {'.fgb','.qml','.pyc'} and '__pycache__' not in p.parts)
    paths.extend(SOURCE.glob('*.py'))
    paths.append(SOURCE/'LEIA_ME.md')
    required = [APP/'data/catalog.sqlite', APP/'data/municipios.gpkg', APP/'data/seade_ipdm.csv',
                APP/'dist/municipal-layer.js', APP/'dist/municipal-layer.css', APP/'demo-dist/index.html',
                SOURCE/'camada_unica/SP_Censo2022_completo.fgb',SOURCE/'camada_unica/dicionario_campos.csv',
                extras/'indicadores_adicionais.csv',extras/'dicionario_campos.csv']
    for path in required:
        if not path.is_file() or path not in paths:
            raise SystemExit(f'Arquivo necessário ausente: {path}')
    welcome = '''# Comece por aqui

1. Extraia todo o ZIP, mantendo municipal-layer e censo2022_sp como pastas irmãs.
2. Leia municipal-layer/README.md: instalação, uso, dados, integração React, API e manutenção.
3. Agentes de IA devem ler também municipal-layer/AGENTS.md.
4. O banco e a interface compilada já estão prontos. Instale as dependências Python e execute server/app.py de dentro de municipal-layer.
5. Abra http://127.0.0.1:18765 após iniciar o servidor.

Esta entrega contém código, banco, builds e insumos de preparação. Não contém node_modules, ambientes virtuais, caches ou os antigos derivados redundantes.
MANIFESTO_SHA256.json inventaria todos os outros arquivos. Use municipal-layer/scripts/verificar_pacote.py para conferir o ZIP.
'''.encode('utf-8')
    entries = []
    with zipfile.ZipFile(output,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        archive.writestr('LEIA_PRIMEIRO.md',welcome)
        entries.append({'path':'LEIA_PRIMEIRO.md','bytes':len(welcome),'sha256':hashlib.sha256(welcome).hexdigest()})
        for path in sorted(set(paths)):
            name = path.relative_to(BASE).as_posix()
            entries.append({'path':name,'bytes':path.stat().st_size,'sha256':digest_file(path)})
            archive.write(path,name)
        manifest = {'schema_version':1,'created_at_utc':datetime.now(timezone.utc).isoformat(),
                    'files':entries,'exclusions':['node_modules','virtualenvs','caches','runtime logs','redundant historical GIS exports']}
        archive.writestr('MANIFESTO_SHA256.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    result = verify(output)
    sidecar.write_text(f'{digest_file(output)}  {output.name}\n',encoding='utf-8')
    print(json.dumps({'archive':str(output),'compressed_bytes':output.stat().st_size,**result},ensure_ascii=False,indent=2))

if __name__ == '__main__':
    main()
