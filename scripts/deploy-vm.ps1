# SICARD — deploy local -> GitHub -> VM (fluxo unico e obrigatorio).
#
# Uso:
#   .\scripts\deploy-vm.ps1
#   .\scripts\deploy-vm.ps1 -Mensagem "ajusta X"
#
# Etapas relatadas: 1) commit local  2) push para o GitHub  3) atualizacao/
# deploy do container na VM (build, restart, healthcheck) e abertura da pagina.
param(
    [string]$Mensagem = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Plink = "C:\Program Files\PuTTY\plink.exe"
$Key = Join-Path $Root "SRV-SISTEMA-30001480.ppk"
$HostKey = "SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0"
$Vm = "ubuntu@56.125.163.194"
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
# Etapa 1/3 — Commit local
# ---------------------------------------------------------------------------
Banner "Etapa 1/3 — Commit local"
$branch = (& $GitExe rev-parse --abbrev-ref HEAD).Trim()
Write-Host "  Branch: $branch"

$statusPorcelain = & $GitExe status --porcelain
if ($statusPorcelain) {
    & $GitExe add -A
    if (-not $Mensagem) {
        $Mensagem = "chore(deploy): atualizacao $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
    & $GitExe commit -m $Mensagem | Out-Host
    Write-Host "  Commit criado: $Mensagem" -ForegroundColor Green
} else {
    Write-Host "  Nada para commitar — arvore de trabalho limpa." -ForegroundColor Yellow
}
$localSha = (& $GitExe rev-parse --short HEAD).Trim()
Write-Host "  HEAD local: $localSha"

# ---------------------------------------------------------------------------
# Etapa 2/3 — Push para o GitHub
# ---------------------------------------------------------------------------
Banner "Etapa 2/3 — Push para o GitHub"
& $GitExe fetch origin $branch *> $null
$ahead = 0
try { $ahead = [int](& $GitExe rev-list --count "origin/$branch..HEAD" 2>$null) } catch { $ahead = 1 }
if ($ahead -gt 0) {
    & $GitExe push origin $branch
    if ($LASTEXITCODE -ne 0) { Write-Error "git push falhou. A VM nao sera atualizada."; exit 1 }
    Write-Host "  Push concluido ($($ahead) commits)." -ForegroundColor Green
} else {
    Write-Host "  Nenhum commit pendente de push — GitHub ja esta em $localSha." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# Etapa 3/3 — Atualizacao/deploy na VM (container) + healthcheck + navegador
# ---------------------------------------------------------------------------
Banner "Etapa 3/3 — Atualizacao e deploy na VM"
Write-Host "  Host: $Vm"
Write-Host "  A VM executa: git fetch + reset --hard origin/$branch, rebuild (ARM64 nativo),"
Write-Host "  restart do container sicard_app e healthcheck interno + publico."
Write-Host ""

$remoteCmd = 'cd /opt/sicard && bash .deploy/update_vm.sh ' + $branch
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
            Write-Host "  OK — respondeu na tentativa $($i): $out" -ForegroundColor Green
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

