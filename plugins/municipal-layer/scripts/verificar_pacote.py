"""Verifica inventário, tamanhos e SHA-256 sem extrair nem executar o ZIP."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile

def verify(path):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('ZIP contém nomes duplicados.')
        for name in names:
            parts = PurePosixPath(name)
            if parts.is_absolute() or '..' in parts.parts or '\\' in name or ':' in name:
                raise ValueError(f'Caminho inválido: {name}')
        manifest = json.loads(archive.read('MANIFESTO_SHA256.json'))
        entries = manifest['files']
        if len(entries) != len({item['path'] for item in entries}):
            raise ValueError('Manifesto contém entradas duplicadas.')
        expected = {item['path'] for item in entries} | {'MANIFESTO_SHA256.json'}
        if set(names) != expected:
            raise ValueError('Inventário do ZIP difere do manifesto.')
        total = 0
        for item in entries:
            digest = hashlib.sha256()
            size = 0
            with archive.open(item['path']) as stream:
                while chunk := stream.read(1024*1024):
                    digest.update(chunk)
                    size += len(chunk)
            if size != item['bytes'] or digest.hexdigest() != item['sha256']:
                raise ValueError(f'Integridade divergente: {item["path"]}')
            total += size
    return {'files_verified':len(entries), 'uncompressed_bytes':total, 'status':'ok'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('zip', type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.zip), ensure_ascii=False, indent=2))
