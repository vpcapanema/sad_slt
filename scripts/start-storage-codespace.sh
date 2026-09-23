#!/usr/bin/env bash
# Reaplica a montagem apos iniciar/recriar o Codespace.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
[[ -f .env ]] || { echo 'Restaure o .env protegido com as credenciais existentes do storage.' >&2; exit 1; }
if ! ldconfig -p | grep libfuse.so.2 >/dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq libfuse2t64
fi
runtime="$HOME/.venvs/sicard-storage"
if [[ ! -x "$runtime/bin/python" ]]; then
    python3 -m venv "$runtime"
fi
"$runtime/bin/python" -m pip install -q -r requirements-storage.txt
flock /tmp/sicard-storage-mount.lock "$runtime/bin/python" scripts/mount-storage-api.py
