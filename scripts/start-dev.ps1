# SLT - sobe o backend local, verifica saude e abre o navegador.
# Uso: .\scripts\start-dev.ps1
# Validacao: .\scripts\start-dev.ps1 -CheckOnly -NoBrowser
# Encerre com Ctrl+C (o servidor para junto).

param(
    [switch]$NoBrowser,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
    foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
        if ($line -notmatch '^\s*#' -and $line -match '^\s*([^=]+)=(.*)$') {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            if (-not (Test-Path "Env:$name")) { Set-Item "Env:$name" $value }
        }
    }
}
if ($env:SLT_USE_SIGMA_POSTGRES -eq "true") {
    $sltUser = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_USER)
    $sltPassword = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_PASSWORD)
    $sltSslMode = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_SSLMODE)
    $env:SLT_DATABASE_URL = "postgresql://${sltUser}:${sltPassword}@$($env:SIGMA_POSTGRES_HOST):$($env:SIGMA_POSTGRES_PORT)/slt_db?sslmode=${sltSslMode}"
}
$Port = if ($env:PORT) { [int]$env:PORT } else { 8080 }
$HostAddr = "127.0.0.1"
$BaseUrl = "http://${HostAddr}:$Port/"
$AppUrl = "${BaseUrl}public/"
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

function Get-ProcessTreeIds([int]$RootProcessId) {
    # O processo dono do socket pode ja ter encerrado, mas filhos que herdaram o
    # socket ainda podem apontar para ele como ParentProcessId.
    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
    $ids = [System.Collections.Generic.List[int]]::new()
    $pending = [System.Collections.Generic.Queue[int]]::new()
    $pending.Enqueue($RootProcessId)

    while ($pending.Count -gt 0) {
        $parentId = $pending.Dequeue()
        foreach ($child in $processes | Where-Object { $_.ParentProcessId -eq $parentId }) {
            $childId = [int]$child.ProcessId
            if (-not $ids.Contains($childId)) {
                $ids.Add($childId)
                $pending.Enqueue($childId)
            }
        }
    }

    # Filhos primeiro; assim nenhum deles fica orfao segurando o socket.
    $result = @($ids)
    [array]::Reverse($result)
    return @($result) + @($RootProcessId)
}

function Stop-ProcessTree([int]$RootProcessId) {
    $stopped = 0
    foreach ($id in @(Get-ProcessTreeIds -RootProcessId $RootProcessId)) {
        $process = Get-Process -Id $id -ErrorAction SilentlyContinue
        if (-not $process) { continue }

        try {
            Stop-Process -Id $id -Force -ErrorAction Stop
            $process.WaitForExit(3000) | Out-Null
            $stopped++
        } catch {
            Write-Warn "Nao foi possivel encerrar PID ${id}: $($_.Exception.Message)"
        }
    }
    return $stopped
}

function Stop-PortListeners([int]$PortToFree) {
    $handled = @{}
    $stopped = 0
    try {
        $connections = Get-NetTCPConnection -LocalPort $PortToFree -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            if ($procId -and $procId -gt 0 -and -not $handled.ContainsKey($procId)) {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Info "Encerrando PID $procId ($($proc.ProcessName)) na porta $PortToFree"
                } else {
                    Write-Info "Encerrando processos filhos do antigo PID $procId na porta $PortToFree"
                }
                $stopped += Stop-ProcessTree -RootProcessId $procId
                $handled[$procId] = $true
            }
        }
    } catch {
        Write-Warn "Get-NetTCPConnection indisponivel; tentando netstat..."
    }

    if ($handled.Count -eq 0 -and (Test-PortListening -PortToCheck $PortToFree)) {
        $lines = netstat -ano | Select-String ":$PortToFree\s+.*LISTENING"
        foreach ($line in $lines) {
            if ($line -match "\s(\d+)\s*$") {
                $procId = [int]$Matches[1]
                if ($procId -gt 0 -and -not $handled.ContainsKey($procId)) {
                    Write-Info "Encerrando PID $procId (netstat) na porta $PortToFree"
                    $stopped += Stop-ProcessTree -RootProcessId $procId
                    $handled[$procId] = $true
                }
            }
        }
    }

    if ($handled.Count -eq 0) {
        Write-Ok "Porta $PortToFree ja estava livre"
    } elseif ($stopped -gt 0) {
        Write-Ok "Processos da porta $PortToFree encerrados ($stopped processo(s))"
    } else {
        Write-Warn "O socket da porta $PortToFree existia, mas nenhum processo associado foi encontrado"
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

function Resolve-PythonExecutable {
    $pythonCommands = @(Get-Command python -CommandType Application -All -ErrorAction SilentlyContinue)
    foreach ($pythonCommand in $pythonCommands) {
        if (-not $pythonCommand.Source -or -not (Test-Path -LiteralPath $pythonCommand.Source)) {
            continue
        }

        & $pythonCommand.Source -c "import sys" 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $pythonCommand.Source
        }
    }

    $pyLauncher = Get-Command py -CommandType Application -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        $pythonPath = & $pyLauncher.Source -3 -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $pythonPath) {
            return ($pythonPath | Select-Object -First 1).Trim()
        }
    }

    throw "Python nao encontrado. Instale o Python 3 e confirme que 'python' ou 'py' esta disponivel no PATH."
}

function Test-PythonEnv([string]$ProjectRoot) {
    Push-Location $ProjectRoot
    try {
        $pythonExe = Resolve-PythonExecutable
        Write-Info "Python do sistema: $pythonExe"

        $venvDir = Join-Path $ProjectRoot ".venv"
        $venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
        $recreateVenv = -not (Test-Path $venvPython)

        if (-not $recreateVenv) {
            & $venvPython -c "import sys; print(sys.executable)" 2>$null | Out-Null
            $recreateVenv = $LASTEXITCODE -ne 0
        }

        if ($recreateVenv) {
            if (Test-Path $venvDir) {
                Write-Warn "Ambiente virtual aponta para um Python inexistente; recriando .venv..."
                Remove-Item -LiteralPath $venvDir -Recurse -Force
            } else {
                Write-Info "Criando ambiente virtual (.venv)..."
            }

            & $pythonExe -m venv $venvDir
            if ($LASTEXITCODE -ne 0 -or -not (Test-Path $venvPython)) {
                throw "Nao foi possivel criar o ambiente virtual com $pythonExe"
            }
        }

        $ver = & $venvPython --version 2>&1
        Write-Ok "Python: $ver"

        & $venvPython -c "import fastapi, uvicorn, httpx; from osgeo import gdal; assert gdal.GetDriverCount() > 0" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Info "Instalando dependencias (requirements.txt)..."
            & $venvPython -m pip install -r requirements.txt -q
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

function Test-DockerDaemon {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }

    # `docker info` pode ficar bloqueado indefinidamente enquanto o Docker
    # Desktop esta iniciando. Execute-o com limite para o start-dev continuar
    # dando feedback em vez de parecer congelado nesta etapa.
    try {
        $docker = (Get-Command docker -ErrorAction Stop).Source
        $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = $docker
        $startInfo.Arguments = 'info --format "{{.ServerVersion}}"'
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $process = [System.Diagnostics.Process]::Start($startInfo)
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(5000)) {
            $process.Kill($true)
            return $false
        }
        $stdout.GetAwaiter().GetResult() | Out-Null
        $stderr.GetAwaiter().GetResult() | Out-Null
        return $process.ExitCode -eq 0
    } catch {
        return $false
    }
}

function Test-RemoteTcpPort([string]$RemoteHost, [int]$RemotePort, [int]$TimeoutMs = 5000) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $attempt = $client.BeginConnect($RemoteHost, $RemotePort, $null, $null)
        if (-not $attempt.AsyncWaitHandle.WaitOne($TimeoutMs)) {
            return $false
        }
        $client.EndConnect($attempt)
        return $client.Connected
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Start-DockerDesktop {
    $desktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $desktop)) { return $false }

    if (-not (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) {
        Write-Info "Docker Desktop nao esta ativo; iniciando..."
        Start-Process -FilePath $desktop -WindowStyle Hidden | Out-Null
    } else {
        Write-Info "Aguardando o mecanismo do Docker Desktop..."
    }

    $deadline = (Get-Date).AddSeconds(90)
    $attempt = 0
    while ((Get-Date) -lt $deadline) {
        $attempt++
        if (Test-DockerDaemon) {
            Write-Ok "Mecanismo do Docker Desktop disponivel"
            return $true
        }
        # Cada teste pode consumir ate 5s. Mostre atividade em todas as
        # tentativas para a tarefa do VS Code nao parecer travada.
        $remaining = [Math]::Max(0, [int][Math]::Ceiling(($deadline - (Get-Date)).TotalSeconds))
        Write-Info "Docker ainda iniciando (tentativa $attempt; ate ${remaining}s restantes)"
        Start-Sleep -Seconds 3
    }
    return $false
}

function Start-SltDatabase {
    if ($env:SLT_USE_SIGMA_POSTGRES -eq "true") {
        Write-Step "Verificando banco SLT na VM ($($env:SIGMA_POSTGRES_HOST):$($env:SIGMA_POSTGRES_PORT))"
        if (-not (Test-RemoteTcpPort -RemoteHost $env:SIGMA_POSTGRES_HOST -RemotePort ([int]$env:SIGMA_POSTGRES_PORT))) {
            $publicIp = $null
            try {
                $publicIp = (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5).ip
            } catch {}
            Write-Warn "A VM responde em HTTP/HTTPS, mas a porta PostgreSQL $($env:SIGMA_POSTGRES_PORT) esta bloqueada ou o servico esta parado."
            if ($publicIp) {
                Write-Warn "IP publico desta maquina: $publicIp (liberar no firewall/whitelist da VM)."
            }
            return $false
        }
        $python = Join-Path $Root ".venv\Scripts\python.exe"
        $connectionError = & $python -c "import os, psycopg; c=psycopg.connect(os.environ['SLT_DATABASE_URL'], connect_timeout=10); assert c.execute('SELECT 1').fetchone()[0] == 1; c.close()" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "slt_db remoto acessivel"
            return $true
        }
        Write-Warn "A porta esta acessivel, mas o PostgreSQL rejeitou a conexao ou a consulta."
        $connectionError | Select-Object -Last 3 | ForEach-Object { Write-Warn "$_" }
        return $false
    }

    Write-Step "Verificando banco SLT local (slt_postgres :5434)"

    if (-not (Test-DockerDaemon) -and -not (Start-DockerDesktop)) {
        Write-Warn "Docker indisponivel apos 90s - abra o Docker Desktop e rode .\scripts\start-db.ps1"
        Write-Warn "Login admin funciona sem auditoria; cadastro e painel exigem o banco SLT."
        return $false
    }

    Push-Location $Root
    try {
        Write-Info "Iniciando/verificando o container..."
        $composeOutput = @(docker compose up -d slt_postgres 2>&1)
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Nao foi possivel subir slt_postgres via docker compose"
            foreach ($line in $composeOutput) { Write-Warn "$line" }
            return $false
        }

        $deadline = (Get-Date).AddSeconds(60)
        $attempt = 0
        Write-Info "Inicializando PostgreSQL e validando uma consulta SQL..."
        while ((Get-Date) -lt $deadline) {
            $attempt++
            # O healthcheck do Docker pode permanecer em "starting" ou até
            # "unhealthy" por alguns ciclos depois de o PostgreSQL já aceitar
            # conexões. Valide o serviço diretamente, sem depender desse atraso.
            $ready = docker exec slt_postgres pg_isready -q -U slt_user -d slt_db 2>$null
            if ($LASTEXITCODE -eq 0) {
                $probe = docker exec slt_postgres psql -U slt_user -d slt_db -Atqc "SELECT 1" 2>$null
            } else {
                $probe = $null
            }
            if ($LASTEXITCODE -eq 0 -and ($probe | Select-Object -Last 1) -eq "1") {
                Write-Ok "slt_postgres saudavel em 127.0.0.1:5434"
                return $true
            }
            if ($attempt % 10 -eq 0) {
                Write-Info "PostgreSQL ainda inicializando ($attempt s de 60 s)"
            }
            Start-Sleep -Seconds 1
        }

        Write-Warn "PostgreSQL nao aceitou uma consulta SQL dentro de 60s"
        docker compose logs --tail 20 slt_postgres 2>&1 | ForEach-Object { Write-Warn "$_" }
        return $false
    } finally {
        Pop-Location
    }
}

function Test-SltSchemaCurrent {
    $query = @"
SELECT CASE WHEN
    to_regclass('geoprocessamento.configuracao_fatiamento_fase1') IS NOT NULL
    AND to_regclass('geoprocessamento.rodada_fase3') IS NOT NULL
    AND to_regclass('geoprocessamento.modelo_geoprocessamento') IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hierarquizacao_demandas'
          AND table_name = 'hierarquizacao_portfolio'
          AND column_name IN ('dados_hierarquizacao', 'relatorio_fase1')
        GROUP BY table_schema, table_name
        HAVING count(*) = 2
    )
THEN 't' ELSE 'f' END;
"@
    if ($env:SLT_USE_SIGMA_POSTGRES -eq "true") {
        $env:SLT_SCHEMA_QUERY = $query
        $python = Join-Path $Root ".venv\Scripts\python.exe"
        & $python -c "import os, psycopg; c=psycopg.connect(os.environ['SLT_DATABASE_URL']); r=c.execute(os.environ['SLT_SCHEMA_QUERY']).fetchone()[0]; c.close(); raise SystemExit(0 if str(r).lower() in ('t','true','1') else 1)" 2>$null
        Remove-Item Env:SLT_SCHEMA_QUERY -ErrorAction SilentlyContinue
        return $LASTEXITCODE -eq 0
    }
    $result = docker exec slt_postgres psql -U slt_user -d slt_db -At -c $query 2>$null
    return $LASTEXITCODE -eq 0 -and ($result | Select-Object -Last 1) -eq "t"
}

function Update-SltSchema {
    Write-Step "Verificando migrations do banco SLT"
    if (Test-SltSchemaCurrent) {
        Write-Ok "Schema do banco atualizado"
        return $true
    }

    Write-Info "Schema incompleto; aplicando migrations pendentes..."
    & (Join-Path $PSScriptRoot "apply-database.ps1")
    if ($LASTEXITCODE -ne 0 -or -not (Test-SltSchemaCurrent)) {
        Write-Err "Nao foi possivel atualizar o schema do banco SLT."
        return $false
    }
    Write-Ok "Migrations aplicadas"
    return $true
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

$databaseReady = Start-SltDatabase
if (-not $databaseReady) {
    Write-Err "O banco SLT e obrigatorio para iniciar o ambiente de desenvolvimento."
    exit 1
}
if (-not (Update-SltSchema)) {
    exit 1
}

Write-Step "Iniciando backend (porta $Port)"
Push-Location $Root

if ($env:SLT_USE_SIGMA_POSTGRES -eq "true") {
    Write-Info "SLT_DATABASE_URL remoto (VM :$($env:SIGMA_POSTGRES_PORT)/slt_db)"
} elseif (-not $env:SLT_DATABASE_URL) {
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
$serverErrorLog = Join-Path $Root ".dev-server.err.log"
$serverPython = Join-Path $Root ".venv\Scripts\python.exe"
try {
    foreach ($logPath in @($serverLog, $serverErrorLog)) {
        if (Test-Path $logPath) {
            Remove-Item $logPath -Force -ErrorAction SilentlyContinue
        }
    }

    # Inicie o Python diretamente. Usar `cmd /c` fazia o processo intermediario
    # terminar e liberava o Wait-Process, encerrando a tarefa logo apos abrir o navegador.
    $serverProc = Start-Process -FilePath $serverPython `
        -ArgumentList "-m", "api.server" `
        -WorkingDirectory $Root `
        -PassThru `
        -NoNewWindow `
        -RedirectStandardOutput $serverLog `
        -RedirectStandardError $serverErrorLog

    Write-Ok "Processo iniciado (PID $($serverProc.Id))"
    Start-Sleep -Milliseconds 600

    if ($serverProc.HasExited) {
        Write-Err "O servidor nao permaneceu em execucao."
        Show-ServerLogTail -LogPath $serverLog
        Show-ServerLogTail -LogPath $serverErrorLog
        exit 1
    }

    Write-Step "Aguardando servidor ficar saudavel (ate ${MaxWaitSec}s)"
    if (-not (Wait-ServerReady -Url $HealthUrl -TimeoutSec $MaxWaitSec -ServerProc $serverProc -LogPath $serverLog)) {
        Write-Err "O servidor nao respondeu a tempo."
        Show-ServerLogTail -LogPath $serverLog
        Show-ServerLogTail -LogPath $serverErrorLog
        exit 1
    }

    $readyOk = Show-ReadyReport -Url $ReadyUrl
    if (-not $readyOk) {
        Write-Warn "Continuando mesmo com alertas - confira o cadastro de demandas."
    }

    if (-not $NoBrowser -and -not $CheckOnly) {
        Open-Browser -Url $AppUrl
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor White
    if ($CheckOnly) {
        Write-Host "  Ambiente validado com sucesso" -ForegroundColor White
    } else {
        Write-Host "  Backend em execucao - Ctrl+C para parar" -ForegroundColor White
    }
    Write-Host "  $AppUrl" -ForegroundColor DarkGray
    Write-Host "========================================" -ForegroundColor White
    Write-Host ""

    if (-not $CheckOnly) {
        Wait-Process -Id $serverProc.Id
    }
}
catch {
    Write-Err "Falha ao iniciar o backend: $($_.Exception.Message)"
    Show-ServerLogTail -LogPath $serverLog
    Show-ServerLogTail -LogPath $serverErrorLog
    exit 1
}
finally {
    Pop-Location
    if ($serverProc) {
        Write-Host ""
        Write-Step "Encerrando backend (PID $($serverProc.Id))"
        Stop-ProcessTree -RootProcessId $serverProc.Id | Out-Null
        Write-Ok "Backend encerrado"
    }
}
