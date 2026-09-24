#!/usr/bin/env bash
# Os clientes VS Code e Windows se conectam ao mesmo processo, no Codespace.
set -euo pipefail
raiz_sicard=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
for programa_sicard in tmux pwsh; do
    if ! command -v "$programa_sicard" >/dev/null; then
        echo 'Execute: bash scripts/install-codespace-powershell.sh' >&2
        exit 1
    fi
done
if [[ ${TERM:-dumb} == dumb ]]; then export TERM=xterm-256color; fi
exec tmux -L sicard new-session -A -s host-do-agente -c "$raiz_sicard" 'pwsh -NoLogo'
