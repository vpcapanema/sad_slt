# SLT - sobe o container PostgreSQL/PostGIS dedicado (slt_postgres)
# Uso: .\scripts\start-db.ps1

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Port = if ($env:SLT_PGPORT) { $env:SLT_PGPORT } else { "5434" }

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "  >> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "     OK  $Message" -ForegroundColor Green
}

function Write-Err([string]$Message) {
    Write-Host "     XX  $Message" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host "  SLT - Banco PostgreSQL/PostGIS" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White

Push-Location $Root
try {
    Write-Step "Subindo container slt_postgres (porta $Port)"
    docker compose up -d slt_postgres
    if ($LASTEXITCODE -ne 0) { throw "docker compose falhou" }
    Write-Ok "Container iniciado"

    Write-Step "Aguardando banco ficar saudavel (ate 60s)"
    $deadline = (Get-Date).AddSeconds(60)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        $status = docker inspect -f "{{.State.Health.Status}}" slt_postgres 2>$null
        if ($status -eq "healthy") {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 2
    }

    if (-not $ready) {
        Write-Err "Health check nao confirmou em 60s - confira: docker compose logs slt_postgres"
        exit 1
    }
    Write-Ok "slt_db pronto"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor White
    Write-Host "  Container: slt_postgres" -ForegroundColor White
    Write-Host "  URL: postgresql://slt_user:slt_pass@127.0.0.1:$Port/slt_db" -ForegroundColor DarkGray
    Write-Host "  Schema aplicado na 1a inicializacao (docker-entrypoint-initdb.d)" -ForegroundColor DarkGray
    Write-Host "========================================" -ForegroundColor White
    Write-Host ""
} finally {
    Pop-Location
}
