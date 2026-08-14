#!/usr/bin/env bash
# Bootstrap do SICARD na VM (rodar UMA VEZ).
#
# Clona o repositório em /opt/sicard e prepara o primeiro deploy. Depois
# disso, toda atualização é feita por .deploy/update_vm.sh (via
# scripts/deploy-vm.ps1, local -> GitHub -> VM).
#
# Travas de segurança - este script NUNCA toca em outra pasta além de
# /opt/sicard, nem em nginx de outra app.
#
# Uso na VM:
#   bash bootstrap_vm.sh
set -euo pipefail

APP_DIR="/opt/sicard"
REPO_URL="https://github.com/vpcapanema/sad_slt.git"
EXPECTED_REPO_FRAGMENT="vpcapanema/sad_slt"
BRANCH="${1:-main}"

step() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
ok()   { printf "    \033[1;32m[ok]\033[0m %s\n" "$1"; }
warn() { printf "    \033[1;33m[!!]\033[0m %s\n" "$1"; }
die()  { printf "    \033[1;31m[X]\033[0m %s\n" "$1"; exit 1; }

case "$APP_DIR" in
    *sigma*|*fad*|*sra*|*hazardtrack*|*reporta*|*smartrouter*|/home/ubuntu/*)
        die "PATH SUSPEITO: $APP_DIR - abortando para nao mexer em outros projetos"
        ;;
esac
ok "caminho seguro: $APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
    warn "$APP_DIR ja existe como clone git — use update_vm.sh para atualizar"
    exit 0
fi

step "Clonando $REPO_URL em $APP_DIR"
sudo mkdir -p "$(dirname "$APP_DIR")"
sudo git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"
ok "clone feito"

cd "$APP_DIR"
ACTUAL_REMOTE=$(git remote get-url origin)
[[ "$ACTUAL_REMOTE" == *"$EXPECTED_REPO_FRAGMENT"* ]] || die "remote inesperado: $ACTUAL_REMOTE"
ok "repo confirmado: $ACTUAL_REMOTE"

step "Verifique/crie o .env de produção"
if [[ ! -f "$APP_DIR/.env" ]]; then
    warn "$APP_DIR/.env não existe — copie um .env válido (SIGMA_POSTGRES_*, SLT_SESSION_SECRET etc.)"
    warn "antes de rodar: bash $APP_DIR/.deploy/update_vm.sh"
else
    ok ".env já presente"
fi

echo ""
echo "Próximo passo: bash $APP_DIR/.deploy/update_vm.sh"
