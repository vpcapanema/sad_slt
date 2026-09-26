#!/usr/bin/env bash
# Libera somente a porta TCP do servidor local e reaproveita o startup oficial.
set -euo pipefail
sicard_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$sicard_root"
sicard_port="${SICARD_DEV_PORT:-8083}"
[[ "$sicard_port" =~ ^[0-9]{1,5}$ ]] && (( 10#$sicard_port >= 1024 && 10#$sicard_port <= 65535 )) || {
    echo 'SICARD_DEV_PORT deve ser uma porta entre 1024 e 65535.' >&2; exit 2;
}
sicard_port=$((10#$sicard_port))
export SICARD_DEV_PORT="$sicard_port"
command -v lsof >/dev/null || { echo 'Instale lsof para identificar os processos da porta local.' >&2; exit 1; }

listeners() {
    local result status=0
    result=$(lsof -nP -t -iTCP:"$sicard_port" -sTCP:LISTEN 2>/dev/null) || status=$?
    if (( status > 1 )); then
        echo "Falha ao consultar a porta $sicard_port." >&2; return "$status"
    fi
    if [[ -n "$result" ]]; then printf '%s\n' "$result" | sort -un; fi
}

echo 'Verificando conexão com o banco antes de liberar a porta do servidor…'
bash "$sicard_root/scripts/start-dev-codespace.sh" --check-only

sicard_listeners=$(listeners)
if [[ -n "$sicard_listeners" ]]; then
    mapfile -t sicard_pids <<< "$sicard_listeners"
    echo "Encerrando processos na porta $sicard_port: ${sicard_pids[*]}"
    kill -TERM -- "${sicard_pids[@]}" 2>/dev/null || true
    # O desligamento gracioso do Uvicorn tem até 10 segundos para liberar a porta.
    for ((sicard_attempt=0; sicard_attempt<20; sicard_attempt++)); do
        sicard_listeners=$(listeners)
        [[ -z "$sicard_listeners" ]] && break
        sleep 0.5
    done
    if [[ -n "$sicard_listeners" ]]; then
        mapfile -t sicard_pids <<< "$sicard_listeners"
        echo "Forçando encerramento dos processos que ainda ocupam a porta: ${sicard_pids[*]}"
        kill -KILL -- "${sicard_pids[@]}" 2>/dev/null || true
        for ((sicard_attempt=0; sicard_attempt<10; sicard_attempt++)); do
            sicard_listeners=$(listeners)
            [[ -z "$sicard_listeners" ]] && break
            sleep 0.2
        done
    fi
    [[ -z "$sicard_listeners" ]] || { echo "Não foi possível liberar a porta $sicard_port." >&2; exit 1; }
else
    echo "Porta $sicard_port livre."
fi

echo "Iniciando SICARD em http://127.0.0.1:$sicard_port"
exec bash "$sicard_root/scripts/start-dev-codespace.sh"
