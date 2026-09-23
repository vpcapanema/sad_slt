#!/usr/bin/env bash
# Windows starts the reverse SSH forward documented in CONTINUAR_SICARD.md.
set -euo pipefail
sicard_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
sicard_key="$sicard_root/.deploy/SRV-SISTEMA-30001480.ppk"
test -f "$sicard_key" || { echo 'Chave PPK ausente.' >&2; exit 1; }
chmod 600 "$sicard_key"
if [ "$#" -eq 0 ]; then
    set -- 'id -un'
fi
# The forwarded endpoint must authenticate as the VM, not as the Codespace.
exec plink -ssh -batch -T -P 10022 \
    -hostkey SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0 \
    -i "$sicard_key" ubuntu@127.0.0.1 "$@"
