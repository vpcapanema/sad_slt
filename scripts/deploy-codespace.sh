#!/usr/bin/env bash
# Publica somente o índice revisado; preserva alterações locais fora do commit.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
[[ $(git branch --show-current) == main ]] || { echo 'Deploy exige main.' >&2; exit 1; }
command -v plink >/dev/null || { echo 'Plink indisponível.' >&2; exit 1; }
git fetch origin main
git merge-base --is-ancestor origin/main HEAD || { echo 'Integre origin/main antes de publicar.' >&2; exit 1; }
if ! git diff --cached --quiet; then
    [[ -n ${1:-} ]] || { echo 'Informe a mensagem do commit.' >&2; exit 1; }
    git diff --cached --check
    git commit -m "$1"
fi
sicard_sha=$(git rev-parse HEAD)
git push origin main
bash scripts/ssh-vm-via-windows.sh 'cd /opt/sicard && bash .deploy/update_vm.sh main'
sicard_remote=$(bash scripts/ssh-vm-via-windows.sh 'cd /opt/sicard && git rev-parse HEAD')
[[ "$sicard_remote" == "$sicard_sha" ]] || { echo 'O SHA da VM difere do commit local.' >&2; exit 1; }
bash scripts/ssh-vm-via-windows.sh 'curl -fsS https://56.125.163.194/sicard/api/health >/dev/null && python3 -c '\''import json,urllib.request; r=json.load(urllib.request.urlopen("http://127.0.0.1:8070/api/health/ready",timeout=90)); assert r["ok"] and r["checks"]["slt_database"].get("schema_ready"), "Integrações não estão prontas"; print("Integrações da produção: OK")'\'''
printf 'Produção atualizada: %s\n' "$sicard_sha"
