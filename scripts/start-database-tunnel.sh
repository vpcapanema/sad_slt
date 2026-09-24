#!/usr/bin/env bash
# Túnel local supervisionado. A ponte Windows em 10022 continua necessária.
set -euo pipefail
sicard_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
sicard_key="$sicard_root/.deploy/SRV-SISTEMA-30001480.ppk"
sicard_log="$sicard_root/.deploy/database-tunnel.local.log"
sicard_lock="$sicard_root/.deploy/database-tunnel.local.lock"
test -f "$sicard_key" || { echo 'Chave PPK ausente.' >&2; exit 1; }
chmod 600 "$sicard_key"
umask 077
if [[ "${1:-}" == '--background' ]]; then
    # O servidor tmux mantém o processo independente do terminal que o iniciou.
    if tmux -L sicard has-session -t '=sicard-db-tunnel' 2>/dev/null; then
        echo 'Supervisor do túnel já está ativo.'
        exit 0
    fi
    tmux -L sicard new-session -d -s sicard-db-tunnel -c "$sicard_root" \
        bash "$sicard_root/scripts/start-database-tunnel.sh" --supervised || {
        tmux -L sicard has-session -t '=sicard-db-tunnel' 2>/dev/null || exit 1
    }
    echo 'Supervisor do túnel iniciado na sessão persistente sicard-db-tunnel.'
    exit 0
fi
if [[ "${1:-}" == '--supervised' ]]; then
    exec >>"$sicard_log" 2>&1
fi
exec 9>"$sicard_lock"
flock -n 9 || { echo 'Supervisor do túnel já está ativo.'; exit 0; }
sicard_child=''
sicard_stop() {
    trap - INT TERM EXIT
    if [[ -n "$sicard_child" ]]; then
        kill "$sicard_child" 2>/dev/null || true
        wait "$sicard_child" 2>/dev/null || true
    fi
    exit 0
}
trap sicard_stop INT TERM EXIT
while true; do
    echo "$(date -u +%FT%TZ) Conectando o banco pela ponte Windows…"
    plink -ssh -batch -T -N -P 10022 \
        -hostkey SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0 \
        -i "$sicard_key" \
        -L 127.0.0.1:15433:127.0.0.1:5433 ubuntu@127.0.0.1 &
    sicard_child=$!
    wait "$sicard_child" || true
    echo "$(date -u +%FT%TZ) Túnel interrompido; nova tentativa em 5 segundos."
    sleep 5 &
    sicard_child=$!
    wait "$sicard_child" || true
    sicard_child=''
done
