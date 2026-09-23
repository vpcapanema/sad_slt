#!/usr/bin/env python3
"""Monta a API REST ja existente do storage; nao muda servicos na VM."""
from pathlib import Path
import argparse
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / '.env')

def main():
    from api.services.storage_httpfs import StorageHTTP, mount
    parser = argparse.ArgumentParser()
    parser.add_argument('--child', action='store_true')
    parser.add_argument('--remote', default='/')
    parser.add_argument('--target')
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    if args.child:
        mount(args.remote, args.target, writable=args.write, foreground=True)
        return
    # Autenticacao e existencia das pastas antes de alterar qualquer montagem.
    api = StorageHTTP()
    api.listar('/')
    targets = [('/', ROOT/'data/storage', False)]
    if (ROOT/'.deploy/storage-api.local.ready').exists():
        targets += [(f'/base-geodatabase/codespace-geoespacial/{name}',
                     ROOT/'data/geoespacial'/name, name=='biblioteca_canonica')
                    for name in ('local','arquivados','biblioteca_canonica')]
    logs = Path.home()/'.cache/sicard-httpfs'
    logs.mkdir(parents=True, exist_ok=True)
    for remote, target, write in targets:
        if os.path.ismount(target):
            result = subprocess.check_output(['findmnt','-rn','-o','SOURCE','-T',str(target)],text=True).strip()
            if result != 'sicard-api':
                raise RuntimeError(f'Outra montagem ocupa {target}')
            continue
        api.listar(remote)
        target.mkdir(parents=True, exist_ok=True)
        if any(target.iterdir()):
            raise RuntimeError(f'Pasta ainda contem arquivos locais: {target}')
        command = [sys.executable, __file__, '--child', '--remote', remote, '--target', str(target)]
        if write:
            command.append('--write')
        with (logs/(target.name+'.log')).open('a') as log:
            proc = subprocess.Popen(command, stdout=log, stderr=log, start_new_session=True)
        import time
        for _ in range(100):
            if os.path.ismount(target):
                break
            if proc.poll() is not None:
                raise RuntimeError(f'Falha na montagem; consulte {logs}')
            time.sleep(.1)
        else:
            raise RuntimeError(f'Montagem nao ficou pronta: {target}')
    if (ROOT/'.deploy/storage-api.local.ready').exists():
        tracked = subprocess.check_output(['git', '-C', str(ROOT), 'ls-files', '-z', '--',
            'data/geoespacial/local', 'data/geoespacial/arquivados',
            'data/geoespacial/biblioteca_canonica'])
        subprocess.run(['git', '-C', str(ROOT), 'update-index', '--assume-unchanged',
                        '--skip-worktree', '-z', '--stdin'], input=tracked, check=True)
    print('Storage conectado pela API REST existente; leituras sem cache em disco.')

if __name__ == '__main__':
    main()
