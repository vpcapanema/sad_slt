#!/usr/bin/env bash
# Controle restrito dos túneis do projeto; não altera bancos ou arquivos da VM.
set -euo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
case "${1:-status}" in
  start) bash "$root/scripts/start-database-tunnel.sh" --background >&2 ;;
  stop) if tmux -L sicard has-session -t '=sicard-db-tunnel' 2>/dev/null; then tmux -L sicard kill-session -t '=sicard-db-tunnel'; fi ;;
  status) ;;
  *) echo 'Ação inválida' >&2; exit 2 ;;
esac
export SICARD_TUNNEL_ROOT="$root"
python3 - <<'PY'
import json, os, socket, struct, subprocess
root = os.environ['SICARD_TUNNEL_ROOT']
try:
    check = subprocess.run(['timeout','8','bash',root+'/scripts/ssh-vm-via-windows.sh','true'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
    vm = check.returncode == 0
except (OSError, subprocess.TimeoutExpired):
    vm = False
try:
    with socket.create_connection(('127.0.0.1',15433),timeout=3) as sock:
        sock.settimeout(3)
        sock.sendall(struct.pack('!II',8,80877103))
        db = sock.recv(1) in (b'S',b'N')
except OSError:
    db = False
try:
    import urllib.request
    with urllib.request.urlopen('http://127.0.0.1:8083/api/health', timeout=3) as response:
        web = response.status == 200
except Exception:
    web = False
print(json.dumps({'vm':vm,'database':db,'web':web}))
PY
