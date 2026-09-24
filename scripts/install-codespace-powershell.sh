#!/usr/bin/env bash
# PowerShell/tmux persistem após reconstruir o Codespace pelo postCreateCommand.
set -euo pipefail
if command -v pwsh >/dev/null && command -v tmux >/dev/null; then
    exit 0
fi
if ! apt-cache show powershell >/dev/null 2>&1; then
    . /etc/os-release
    if [[ "$ID" != ubuntu ]]; then
        echo 'Este instalador requer Ubuntu.' >&2
        exit 1
    fi
    pacote_sicard=$(mktemp /tmp/sicard-microsoft-XXXXXX.deb)
    trap 'rm -f "$pacote_sicard"' EXIT
    curl --fail --location --silent --show-error "https://packages.microsoft.com/config/ubuntu/${VERSION_ID}/packages-microsoft-prod.deb" -o "$pacote_sicard"
    sudo dpkg -i "$pacote_sicard"
fi
sudo apt-get update -qq
sudo apt-get install -y powershell tmux
