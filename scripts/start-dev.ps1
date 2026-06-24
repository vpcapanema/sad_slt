# SLT - sobe o backend local, verifica saude e abre o navegador.
# Uso: .\scripts\start-dev.ps1
# Encerre com Ctrl+C (o servidor para junto).

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Port = if ($env:PORT) { [int]$env:PORT } else { 8080 }
$HostAddr = "127.0.0.1"
$BaseUrl = "http://${HostAddr}:$Port/"
$HealthUrl = "${BaseUrl}api/health"
$ReadyUrl = "${BaseUrl}api/health/ready"
$MaxWaitSec = 90

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "  >> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "     OK  $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
    Write-Host "     !!  $Message" -ForegroundColor Yellow
}

function Write-Err([string]$Message) {
    Write-Host "     XX  $Message" -ForegroundColor Red
}

function Write-Info([string]$Message) {
    Write-Host "     ..  $Message" -ForegroundColor DarkGray
}

function Stop-PortListeners([int]$PortToFree) {
    $killed = @{}
    try {
        $connections = Get-NetTCPConnection -LocalPort $PortToFree -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            if ($procId -and $procId -gt 0 -and -not $killed.ContainsKey($procId)) {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Info "Encerrando PID $procId ($($proc.ProcessName)) na porta $PortToFree"
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    $killed[$procId] = $true
                }
            }
        }
    } catch {
        Write-Warn "Get-NetTCPConnection indisponivel; tentando netstat..."
    }

    if ($killed.Count -eq 0) {
        $lines = netstat -ano | Select-String ":$PortToFree\s"
        foreach ($line in $lines) {
            if ($line -match "\s(\d+)\s*$") {
                $procId = [int]$Matches[1]
                if ($procId -gt 0 -and -not $killed.ContainsKey($procId)) {
                    Write-Info "Encerrando PID $procId (netstat) na porta $PortToFree"
                    taskkill /PID $procId /F 2>$null | Out-Null
                    $killed[$procId] = $true
                }
            }
        }
    }

    if ($killed.Count -eq 0) {
        Write-Ok "Porta $PortToFree ja estava livre"
    } else {
        Write-Ok "Porta $PortToFree liberada ($($killed.Count) processo(s))"
    }
}

function Test-PortListening([int]$PortToCheck) {
    try {
        return [bool](Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction SilentlyContinue)
    } catch {
        return [bool](netstat -ano | Select-String "127\.0\.0\.1:$PortToCheck\s+.*LISTENING")
    }
}

function Wait-PortFree([int]$PortToFree, [int]$TimeoutSec = 15) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (-not (Test-PortListening -PortToCheck $PortToFree)) {
            return $true
        }
        Start-Sleep -Milliseconds 400
    }
    return -not (Test-PortListening -PortToCheck $PortToFree)
}

function Show-ServerLogTail([string]$LogPath, [int]$Lines = 25) {
    if (-not (Test-Path $LogPath)) { return }
    Write-Info "Ultimas linhas do log do servidor:"
    Get-Content $LogPath -Tail $Lines -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "       $_" -ForegroundColor DarkGray
    }
}

function Test-PythonEnv([string]$ProjectRoot) {
    Push-Location $ProjectRoot
    try {
        $ver = python --version 2>&1
        Write-Ok "Python: $ver"
        python -c "import fastapi, uvicorn, httpx" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Info "Instalando dependencias (requirements.txt)..."
            pip install -r requirements.txt -q
        }
        Write-Ok "Dependencias Python prontas"
    } finally {
        Pop-Location
    }
}

function Wait-ServerReady([string]$Url, [int]$TimeoutSec, [System.Diagnostics.Process]$ServerProc, [string]$LogPath) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $attempt = 0
    while ((Get-Date) -lt $deadline) {
        $attempt++
        if ($ServerProc -and $ServerProc.HasExited) {
            Write-Err "O processo do servidor encerrou (codigo $($ServerProc.ExitCode))."
            Show-ServerLogTail -LogPath $LogPath
            return $false
        }
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($resp.StatusCode -eq 200) {
                Write-Ok "Servidor respondeu em $attempt tentativa(s)"
                return $true
            }
        } catch {
            Write-Info "Aguardando servidor... (tentativa $attempt)"
            Start-Sleep -Milliseconds 800
        }
    }
    if ($ServerProc -and $ServerProc.HasExited) {
        Write-Err "O processo do servidor encerrou antes de responder."
        Show-ServerLogTail -LogPath $LogPath
    }
    return $false
}

function Show-ReadyReport([string]$Url) {
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
        $data = $resp.Content | ConvertFrom-Json

        Write-Step "Conexoes"

        foreach ($name in @("api", "sigma_instituicoes", "sigma_pessoas", "slt_database")) {
            $c = $data.checks.$name
            if (-not $c) { continue }
            $label = switch ($name) {
                "api" { "API local" }
                "sigma_instituicoes" { "Instituicoes (API externa)" }
                "sigma_pessoas" { "Representantes (API externa)" }
                "slt_database" { "Banco SLT" }
                default { $name }
            }
            if ($c.ok) {
                Write-Ok "$label - $($c.message)"
            } else {
                Write-Warn "$label - $($c.message)"
            }
        }

        if (-not $data.ok) {
            Write-Warn "Algumas verificacoes obrigatorias falharam; a aplicacao pode ter funcionalidades limitadas."
        }
        return [bool]$data.ok
    }
    catch {
        Write-Warn "Nao foi possivel executar verificacao completa: $($_.Exception.Message)"
        return $false
    }
}

function Open-Browser([string]$Url) {
    Write-Step "Abrindo aplicacao no navegador"
    Write-Ok $Url
    Start-Process $Url
}

Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host "  SLT - Ambiente de desenvolvimento" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White

Write-Step "Liberando porta $Port"
Stop-PortListeners -PortToFree $Port
if (-not (Wait-PortFree -PortToFree $Port -TimeoutSec 15)) {
    Write-Err "A porta $Port continua em uso. Encerre o processo manualmente e tente novamente."
    Write-Info "Exemplo: netstat -ano | findstr :$Port"
    exit 1
}
Write-Ok "Porta $Port disponivel para bind"

Write-Step "Verificando ambiente Python"
Test-PythonEnv -ProjectRoot $Root

Write-Step "Iniciando backend (porta $Port)"
Push-Location $Root

if (-not $env:SLT_DATABASE_URL) {
    $env:SLT_DATABASE_URL = "postgresql://slt_user:slt_pass@127.0.0.1:5434/slt_db"
    Write-Info "SLT_DATABASE_URL padrao (slt_postgres local :5434)"
}

if (-not $env:SIGMA_DATABASE_URL -and -not $env:SIGMA_POSTGRES_PASSWORD) {
    $envExample = Join-Path $Root ".env.example"
    $envFile = Join-Path $Root ".env"
    if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
        Copy-Item $envExample $envFile
        Write-Info "Criado .env a partir de .env.example - preencha SIGMA_POSTGRES_PASSWORD"
    }
    if (-not $env:SIGMA_POSTGRES_PASSWORD) {
        Write-Warn "Login admin: defina SIGMA_POSTGRES_PASSWORD no .env (VM 56.125.163.194:5433, user sigma_user)"
    }
}

$serverProc = $null
$serverLog = Join-Path $Root ".dev-server.log"
$serverCmd = "python -m api.server >> `"$serverLog`" 2>&1"
try {
    if (Test-Path $serverLog) {
        Remove-Item $serverLog -Force -ErrorAction SilentlyContinue
    }

    $serverProc = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", $serverCmd `
        -WorkingDirectory $Root `
        -PassThru `
        -NoNewWindow

    Write-Ok "Processo iniciado (PID $($serverProc.Id))"
    Start-Sleep -Milliseconds 600

    if ($serverProc.HasExited) {
        Write-Err "O servidor nao permaneceu em execucao."
        Show-ServerLogTail -LogPath $serverLog
        exit 1
    }

    Write-Step "Aguardando servidor ficar saudavel (ate ${MaxWaitSec}s)"
    if (-not (Wait-ServerReady -Url $HealthUrl -TimeoutSec $MaxWaitSec -ServerProc $serverProc -LogPath $serverLog)) {
        Write-Err "O servidor nao respondeu a tempo."
        Show-ServerLogTail -LogPath $serverLog
        exit 1
    }

    $readyOk = Show-ReadyReport -Url $ReadyUrl
    if (-not $readyOk) {
        Write-Warn "Continuando mesmo com alertas - confira o cadastro de demandas."
    }

    Open-Browser -Url $BaseUrl

    Write-Host ""
    Write-Host "========================================" -ForegroundColor White
    Write-Host "  Backend em execucao - Ctrl+C para parar" -ForegroundColor White
    Write-Host "  $BaseUrl" -ForegroundColor DarkGray
    Write-Host "========================================" -ForegroundColor White
    Write-Host ""

    Wait-Process -Id $serverProc.Id
}
catch {
    Write-Err "Falha ao iniciar o backend: $($_.Exception.Message)"
    Show-ServerLogTail -LogPath $serverLog
    exit 1
}
finally {
    Pop-Location
    if ($serverProc -and -not $serverProc.HasExited) {
        Write-Host ""
        Write-Step "Encerrando backend (PID $($serverProc.Id))"
        Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
        Write-Ok "Backend encerrado"
    }
}
