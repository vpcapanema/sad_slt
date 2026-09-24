#!/usr/bin/env bash
# Windows starts the reverse SSH forward documented in CONTINUAR_SICARD.md.
set -euo pipefail
sicard_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
sicard_key="$sicard_root/.deploy/SRV-SISTEMA-30001480.ppk"
sicard_port="${SICARD_SSH_PORT:-10022}"
[[ "$sicard_port" =~ ^[0-9]{1,5}$ ]] && (( 10#$sicard_port >= 1024 && 10#$sicard_port <= 65535 )) || {
    echo 'SICARD_SSH_PORT deve estar entre 1024 e 65535.' >&2; exit 2;
}
test -f "$sicard_key" || { echo 'Chave PPK ausente.' >&2; exit 1; }
chmod 600 "$sicard_key"
if [ "$#" -eq 0 ]; then
    set -- 'id -un'
fi
# The forwarded endpoint must authenticate as the VM, not as the Codespace.
exec plink -ssh -batch -T -P "$sicard_port" \
    -hostkey SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0 \
    -i "$sicard_key" ubuntu@127.0.0.1 "$@"
