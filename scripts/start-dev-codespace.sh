#!/usr/bin/env bash
# Desenvolvimento local com o .env privado. Não altera nem publica na VM.
set -euo pipefail
sicard_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$sicard_root"
[[ "${1:-}" == '' || "${1:-}" == '--check-only' ]] || { echo 'Uso: start-dev-codespace.sh [--check-only]' >&2; exit 2; }
sicard_python="${SICARD_PYTHON:-/home/codespace/.venvs/sicard-app/bin/python}"
[[ -f .env ]] || { echo 'Arquivo .env privado ausente.' >&2; exit 1; }
# O servidor de desenvolvimento não herda as substituições usadas pelos testes.
unset SLT_DATABASE_URL SLT_USE_SIGMA_POSTGRES
"$sicard_python" - <<'PY'
import os
import subprocess
import time
import psycopg
from urllib.parse import urlsplit
from api.config import get_settings
dsn=get_settings().slt_database_url
if not dsn:
    raise SystemExit('SLT_DATABASE_URL ausente no .env privado.')
destino=urlsplit(dsn)
usa_tunel=destino.hostname in ('127.0.0.1', 'localhost') and destino.port==15433
if usa_tunel:
    print('Verificando ponte Windows e autenticação SSH na VM…',flush=True)
    ponte=subprocess.run(['timeout','10','bash','scripts/ssh-vm-via-windows.sh','true'],
                         stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if ponte.returncode:
        raise SystemExit('Ponte Windows indisponível. Execute a tarefa pelo VS Code Desktop com a extensão SICARD 0.3.0 instalada no Windows para religá-la automaticamente. O Codespace sozinho não pode iniciar processos no Windows.')
    print('Ponte Windows validada. Verificando túnel e banco…',flush=True)
try:
    espera=int(os.environ.get('SICARD_DB_WAIT_SECONDS','90'))
    if not 5 <= espera <= 300: raise ValueError
except ValueError:
    raise SystemExit('SICARD_DB_WAIT_SECONDS deve estar entre 5 e 300 segundos.')
limite=time.monotonic()+espera
tentativa=0
recuperado=False
while True:
    tentativa+=1
    try:
        with psycopg.connect(dsn, connect_timeout=5,
                             options='-c default_transaction_read_only=on -c statement_timeout=5000') as conn:
            conn.execute('SELECT 1').fetchone()
        break
    except psycopg.Error:
        if usa_tunel and not recuperado:
            print('Túnel/banco indisponível; religando o túnel supervisionado…',flush=True)
            recovery=subprocess.run(['bash','scripts/start-database-tunnel.sh','--restart'])
            if recovery.returncode:
                raise SystemExit('Falha ao reiniciar o túnel do banco. O servidor atual foi preservado.') from None
            recuperado=True
        restante=limite-time.monotonic()
        if restante<=0:
            raise SystemExit('Banco oficial indisponível após aguardar a reconexão. A sessão do supervisor não garante conectividade. Verifique a ponte Windows em 10022: documentacao/BANCO_CODESPACE.md.')
        print(f'Banco ainda indisponível; aguardando reconexão (tentativa {tentativa}, até {int(restante)} s restantes)…',flush=True)
        time.sleep(min(3,restante))
print('Conexão ao banco oficial validada.',flush=True)
PY
[[ "${1:-}" == '--check-only' ]] && exit 0
echo 'Iniciando servidor local.'
exec "$sicard_python" -m uvicorn api.server:app --host 127.0.0.1 --port "${SICARD_DEV_PORT:-8083}" --env-file .env
