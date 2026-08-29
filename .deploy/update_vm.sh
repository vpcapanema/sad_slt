#!/usr/bin/env bash
# Atualiza o SICARD na VM (sync GitHub + container + rota Nginx + health).
# Rodado via SSH pelo script de deploy local (scripts/deploy-vm.ps1).
set -eu

APP_DIR="/opt/sicard"
COMPOSE_FILE="docker-compose.vm.yml"
NGINX_SNIPPET_SRC="$APP_DIR/.deploy/nginx/sicard-subpath.conf"
NGINX_SNIPPET_DST="/etc/nginx/snippets/sicard-subpath.conf"
SIGMA_SITE="/etc/nginx/sites-available/sigma-pli-ip.conf"
PUBLIC_URL="https://56.125.163.194/sicard"
EXPECTED_REPO_FRAGMENT="vpcapanema/sad_slt"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$1"; }
info() { printf "  \033[1;34m·\033[0m %s\n" "$1"; }
warn() { printf "  \033[1;33m!\033[0m %s\n" "$1"; }
die()  { printf "  \033[1;31m✗\033[0m %s\n" "$1"; exit 1; }

[[ "$APP_DIR" == "/opt/sicard" ]] || die "diretorio inesperado: $APP_DIR"
[[ -d "$APP_DIR/.git" ]] || die "clone git nao encontrado em $APP_DIR (rode bootstrap_vm.sh primeiro)"
cd "$APP_DIR"

ACTUAL_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
[[ "$ACTUAL_REMOTE" == *"$EXPECTED_REPO_FRAGMENT"* ]] || die "remote inesperado: $ACTUAL_REMOTE"
ok "repositorio confirmado: $ACTUAL_REMOTE"

# Branch a publicar. O padrao e 'main', que espelha o que esta em producao.
# Antes o default era a branch em checkout na propria VM, o que fazia o alvo do
# deploy depender de um estado local invisivel de quem chamava o script.
BRANCH_PADRAO="main"
BRANCH="${1:-$BRANCH_PADRAO}"

# Publicar algo que nao seja 'main' exige intencao explicita, declarada na
# variavel de ambiente com o nome exato da branch:
#   SICARD_PERMITIR_BRANCH=hotfix-x bash .deploy/update_vm.sh hotfix-x
if [[ "$BRANCH" != "$BRANCH_PADRAO" ]]; then
    if [[ "${SICARD_PERMITIR_BRANCH:-}" != "$BRANCH" ]]; then
        die "deploy de '$BRANCH' bloqueado: producao serve '$BRANCH_PADRAO'. Para publicar mesmo assim, repita o nome em SICARD_PERMITIR_BRANCH=$BRANCH"
    fi
    warn "deploy explicito de '$BRANCH' (fora de $BRANCH_PADRAO); producao passara a servir esta branch"
fi

git rev-parse --verify --quiet "refs/remotes/origin/$BRANCH" >/dev/null 2>&1 \
    || git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1 \
    || die "branch '$BRANCH' nao existe em origin; nada foi alterado"

step "Sincronizando com o GitHub (origin/$BRANCH)"
OLD_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "none")
git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH" >/dev/null 2>&1 || git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
NEW_SHA=$(git rev-parse --short HEAD)
if [[ "$OLD_SHA" == "$NEW_SHA" ]]; then
    info "ja estava na versao $NEW_SHA"
else
    ok "codigo atualizado: $OLD_SHA -> $NEW_SHA"
    info "arquivos alterados:"
    git diff --name-only "$OLD_SHA" "$NEW_SHA" 2>/dev/null | sed 's/^/    /' || true
fi

[[ -f "$COMPOSE_FILE" ]] || die "$COMPOSE_FILE nao encontrado"
[[ -f ".env" ]] || die ".env nao encontrado em $APP_DIR (crie a partir de .env.example antes do primeiro deploy)"

step "Configurando rota exclusiva no proxy HTTPS do SIGMA (aditivo, nao mexe nas outras rotas)"
[[ -f "$NGINX_SNIPPET_SRC" ]] || die "snippet nginx nao encontrado em $NGINX_SNIPPET_SRC"
sudo mkdir -p /etc/nginx/snippets
sudo cp "$NGINX_SNIPPET_SRC" "$NGINX_SNIPPET_DST"
if ! sudo grep -q "sicard-subpath.conf" "$SIGMA_SITE"; then
    sudo sed -i \
        '/include \/etc\/nginx\/snippets\/pli-hub-subpath.conf;/a\    include /etc/nginx/snippets/sicard-subpath.conf;' \
        "$SIGMA_SITE"
    ok "include adicionado ao server{} do SIGMA"
else
    info "include ja presente no server{} do SIGMA"
fi
sudo nginx -t
sudo systemctl reload nginx
ok "rota ativa em $PUBLIC_URL/"

step "Build/atualização do container (nativo ARM64 na própria VM)"
docker compose -f "$COMPOSE_FILE" build --pull
docker compose -f "$COMPOSE_FILE" up -d --force-recreate
ok "container sicard_app em execução"

step "Aguardando HTTP interno (até 120s)"
HEALTH_OK=0
for i in $(seq 1 24); do
    if curl -fsS http://127.0.0.1:8070/api/health >/dev/null 2>&1; then
        HEALTH_OK=1
        ok "healthcheck interno OK (tentativa $i)"
        break
    fi
    printf "  · aguardando HTTP... (%ds)\n" "$((i * 5))"
    sleep 5
done
[[ "$HEALTH_OK" -eq 1 ]] || die "app nao respondeu em /api/health (veja: docker logs sicard_app)"

step "Testando rota pública (até 60s)"
PUB_OK=0
for i in $(seq 1 12); do
    CODE=$(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_URL/api/health" 2>/dev/null || echo "000")
    if [[ "$CODE" == "200" ]]; then
        PUB_OK=1
        ok "HTTPS público OK (HTTP $CODE, tentativa $i)"
        break
    fi
    sleep 5
done
[[ "$PUB_OK" -eq 1 ]] || warn "rota pública ainda não respondeu 200 (verifique manualmente: $PUBLIC_URL/api/health)"

step "DEPLOY CONCLUÍDO"
echo "  Commit:  $NEW_SHA"
echo "  URL:     $PUBLIC_URL/"
