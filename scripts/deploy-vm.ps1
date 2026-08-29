# SICARD - deploy local -> GitHub -> VM (fluxo unico e obrigatorio).
#
# Uso:
#   .\scripts\deploy-vm.ps1
#   .\scripts\deploy-vm.ps1 -Mensagem "ajusta X"
#
# Etapas relatadas: 0) guarda de branch  1) commit local  2) push para o GitHub
# 3) atualizacao/deploy do container na VM (build, restart, healthcheck) e
# abertura da pagina.
#
# GUARDA DE BRANCH
#   O repositorio trabalha com branch unica: 'main' espelha o que esta em
#   producao. O deploy implanta a branch em checkout, entao rodar este script
#   fora de 'main' publicaria outra coisa em producao silenciosamente.
#
#   Por isso, deploy fora de 'main' exige intencao digitada:
#     .\scripts\deploy-vm.ps1 -BranchAlternativa nome-exato-da-branch
#   O nome precisa bater com a branch em checkout. Use apenas para hotfix
#   consciente; o caminho normal e sempre 'main'.
param(
    [string]$Mensagem = "",
    [string]$BranchAlternativa = ""
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Plink = "C:\Program Files\PuTTY\plink.exe"
$Key = Join-Path $Root "SRV-SISTEMA-30001480.ppk"
$HostKey = "SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0"
$Vm = "ubuntu@56.125.163.194"
$AppDirVm = "/opt/sicard"
$AppUrl = "https://56.125.163.194/sicard"
$GitExe = if (Test-Path "C:\Program Files\Git\cmd\git.exe") { "C:\Program Files\Git\cmd\git.exe" } else { "git" }
$CurlExe = if (Test-Path "C:\Windows\System32\curl.exe") { "C:\Windows\System32\curl.exe" } else { "curl" }

function Banner($texto) {
    Write-Host ""
    Write-Host "==== $texto ====" -ForegroundColor Cyan
}

if (-not (Test-Path $Plink)) { Write-Error "PuTTY plink.exe nao encontrado em $Plink"; exit 2 }
if (-not (Test-Path $Key)) { Write-Error "Chave PuTTY nao encontrada: $Key"; exit 2 }

# ---------------------------------------------------------------------------
# Etapa 0/3 - Guarda de branch
# ---------------------------------------------------------------------------
Banner "Etapa 0/3 - Guarda de branch"
$BranchPadrao = "main"
$branch = (& $GitExe rev-parse --abbrev-ref HEAD).Trim()
Write-Host "  Branch em checkout: $branch"

if ($branch -eq "HEAD") {
    Write-Error "HEAD destacado (detached). Faca checkout de '$BranchPadrao' antes do deploy."
    exit 1
}

if ($branch -ne $BranchPadrao) {
    if ($BranchAlternativa -ne $branch) {
        Write-Host ""
        Write-Host "  DEPLOY BLOQUEADO" -ForegroundColor Red
        Write-Host "  A branch em checkout e '$branch', nao '$BranchPadrao'." -ForegroundColor Red
        Write-Host "  A VM executa 'git reset --hard origin/<branch>', entao isto" -ForegroundColor Red
        Write-Host "  publicaria '$branch' em producao no lugar do que esta no ar." -ForegroundColor Red
        Write-Host ""
        Write-Host "  Caminho normal:" -ForegroundColor Yellow
        Write-Host "    git checkout $BranchPadrao" -ForegroundColor Yellow
        Write-Host "  Se o deploy de '$branch' for mesmo intencional:" -ForegroundColor Yellow
        Write-Host "    .\scripts\deploy-vm.ps1 -BranchAlternativa $branch" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  AVISO: deploy explicito de '$branch', fora de '$BranchPadrao'." -ForegroundColor Yellow
    Write-Host "  Producao passara a servir esta branch." -ForegroundColor Yellow
} else {
    Write-Host "  OK - branch padrao." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Etapa 1/3 - Commit local
# ---------------------------------------------------------------------------
Banner "Etapa 1/3 - Commit local"

$statusPorcelain = & $GitExe status --porcelain
if ($statusPorcelain) {
    $arquivos = @($statusPorcelain)
    Write-Host "  $($arquivos.Count) arquivo(s) serao incluidos no commit:"
    $arquivos | Select-Object -First 20 | ForEach-Object { Write-Host "    $_" }
    if ($arquivos.Count -gt 20) {
        Write-Host "    ... e mais $($arquivos.Count - 20) arquivo(s)"
    }
    & $GitExe add -A
    if (-not $Mensagem) {
        $Mensagem = "chore(deploy): atualizacao $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
    & $GitExe commit -m $Mensagem | Out-Host
    Write-Host "  Commit criado: $Mensagem" -ForegroundColor Green
} else {
    Write-Host "  Nada para commitar - arvore de trabalho limpa." -ForegroundColor Yellow
}
$localSha = (& $GitExe rev-parse --short HEAD).Trim()
Write-Host "  HEAD local: $localSha"

# ---------------------------------------------------------------------------
# Etapa 2/3 - Push para o GitHub
# ---------------------------------------------------------------------------
Banner "Etapa 2/3 - Push para o GitHub"
& $GitExe fetch origin $branch *> $null

# Guarda de divergencia: se o remoto tem commits que o local nao contem, o push
# so passaria com --force, o que reescreveria o historico publicado e poderia
# derrubar producao. Melhor abortar e resolver a mao.
$remotoExiste = $true
& $GitExe rev-parse --verify --quiet "refs/remotes/origin/$branch" *> $null
if ($LASTEXITCODE -ne 0) { $remotoExiste = $false }

if ($remotoExiste) {
    $behind = 0
    try { $behind = [int](& $GitExe rev-list --count "HEAD..origin/$branch" 2>$null) } catch { $behind = 0 }
    if ($behind -gt 0) {
        Write-Host ""
        Write-Host "  DEPLOY BLOQUEADO" -ForegroundColor Red
        Write-Host "  origin/$branch tem $behind commit(s) que o local nao contem." -ForegroundColor Red
        Write-Host "  Publicar assim exigiria --force e reescreveria o historico." -ForegroundColor Red
        Write-Host "  Resolva antes:  git pull --rebase origin $branch" -ForegroundColor Yellow
        exit 1
    }
}

$ahead = 0
try { $ahead = [int](& $GitExe rev-list --count "origin/$branch..HEAD" 2>$null) } catch { $ahead = 1 }
if ($ahead -gt 0) {
    & $GitExe push origin $branch
    if ($LASTEXITCODE -ne 0) { Write-Error "git push falhou. A VM nao sera atualizada."; exit 1 }
    Write-Host "  Push concluido ($($ahead) commits)." -ForegroundColor Green
} else {
    Write-Host "  Nenhum commit pendente de push - GitHub ja esta em $localSha." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# Etapa 3/3 - Atualizacao/deploy na VM (container) + healthcheck + navegador
# ---------------------------------------------------------------------------
Banner "Etapa 3/3 - Atualizacao e deploy na VM"
Write-Host "  Host: $Vm"
Write-Host "  A VM executa: git fetch + reset --hard origin/$branch, rebuild (ARM64 nativo),"
Write-Host "  restart do container sicard_app e healthcheck interno + publico."
Write-Host ""

# A VM tem a mesma guarda de branch. Quando o deploy fora de 'main' ja foi
# autorizado aqui (-BranchAlternativa), repassamos a autorizacao adiante; sem
# isso o update_vm.sh bloquearia e a saida de emergencia nao funcionaria.
$autorizacaoVm = ""
if ($branch -ne $BranchPadrao) {
    $autorizacaoVm = "SICARD_PERMITIR_BRANCH=$branch "
}
$remoteCmd = "cd $AppDirVm && $autorizacaoVm" + "bash .deploy/update_vm.sh $branch"
& $Plink -ssh $Vm -i $Key -hostkey $HostKey -batch $remoteCmd
$deployExit = $LASTEXITCODE
if ($deployExit -ne 0) {
    Write-Error "Deploy na VM falhou (codigo $deployExit). Veja a saida acima."
    exit $deployExit
}

Banner "Verificacao final (saude do container)"
$healthOk = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $out = & $CurlExe -k -fsS "$AppUrl/api/health" 2>$null
        if ($out -and ($out -match '"status"\s*:\s*"ok"')) {
            Write-Host "  OK - respondeu na tentativa $($i): $out" -ForegroundColor Green
            $healthOk = $true
            break
        }
        Write-Host "  Aguardando... ($($i)/15)"
        Start-Sleep -Seconds 3
    } catch {
        Write-Host "  Aguardando... ($($i)/15)"
        Start-Sleep -Seconds 3
    }
}
if (-not $healthOk) {
    Write-Warning "Healthcheck publico ainda nao confirmou 200 em $AppUrl/api/health."
}

Banner "Abrindo a aplicacao"
Write-Host "  $AppUrl/"
Start-Process "$AppUrl/"

Write-Host ""
Write-Host "==== Deploy finalizado: local -> GitHub -> VM ====" -ForegroundColor Cyan

