#!/usr/bin/env bash
# Keep running while the Windows reverse SSH forward on port 10022 is active.
set -euo pipefail
sicard_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
sicard_key="$sicard_root/.deploy/SRV-SISTEMA-30001480.ppk"
test -f "$sicard_key" || { echo 'Chave PPK ausente.' >&2; exit 1; }
chmod 600 "$sicard_key"
exec plink -ssh -batch -T -N -P 10022 \
    -hostkey SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0 \
    -i "$sicard_key" \
    -L 127.0.0.1:15433:127.0.0.1:5433 ubuntu@127.0.0.1
