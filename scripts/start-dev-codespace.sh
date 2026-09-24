#!/usr/bin/env bash
# Desenvolvimento local com o .env privado. Não altera nem publica na VM.
set -euo pipefail
sicard_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$sicard_root"
sicard_python="${SICARD_PYTHON:-/home/codespace/.venvs/sicard-app/bin/python}"
[[ -f .env ]] || { echo 'Arquivo .env privado ausente.' >&2; exit 1; }
# O servidor de desenvolvimento não herda as substituições usadas pelos testes.
unset SLT_DATABASE_URL SLT_USE_SIGMA_POSTGRES
"$sicard_python" - <<'PY'
import subprocess
import time
from urllib.parse import urlsplit
from api.config import get_settings
from api.db.connection import get_connection
dsn=get_settings().slt_database_url
if not dsn:
    raise SystemExit('SLT_DATABASE_URL ausente no .env privado.')
destino=urlsplit(dsn)
if destino.hostname in ('127.0.0.1', 'localhost') and destino.port==15433:
    subprocess.run(['bash','scripts/start-database-tunnel.sh','--background'],check=True)
for tentativa in range(4):
    try:
        with get_connection() as conn:
            conn.execute('SELECT 1').fetchone()
        break
    except Exception:
        if tentativa==3:
            raise SystemExit('Banco oficial indisponível. Verifique a ponte Windows em 10022; o supervisor do túnel continuará tentando reconectar.')
        time.sleep(3)
print('Conexão ao banco oficial validada. Iniciando servidor local.')
PY
exec "$sicard_python" -m uvicorn api.server:app --host 127.0.0.1 --port "${SICARD_DEV_PORT:-8083}" --env-file .env
