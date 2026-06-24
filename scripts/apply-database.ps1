# SLT — aplica/reaplica schema no container PostgreSQL/PostGIS dedicado (slt_postgres)
#
# Uso:
#   .\scripts\start-db.ps1          # sobe container (schema na 1a vez)
#   .\scripts\apply-database.ps1    # reaplica schema se necessario
#
# Variaveis (opcionais):
#   SLT_PG_CONTAINER    default slt_postgres
#   SLT_PGHOST          default 127.0.0.1
#   SLT_PGPORT          default 5434
#   SLT_PGUSER          default slt_user
#   SLT_PGPASSWORD      default slt_pass (dev)
#   SLT_DB_NAME         default slt_db

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$DbDir = Join-Path $Root "database"

$Container = if ($env:SLT_PG_CONTAINER) { $env:SLT_PG_CONTAINER } else { "slt_postgres" }
$HostAddr = if ($env:SLT_PGHOST) { $env:SLT_PGHOST } else { "127.0.0.1" }
$Port = if ($env:SLT_PGPORT) { $env:SLT_PGPORT } else { "5434" }
$DbUser = if ($env:SLT_PGUSER) { $env:SLT_PGUSER } else { "slt_user" }
$DbPass = if ($env:SLT_PGPASSWORD) { $env:SLT_PGPASSWORD } else { "slt_pass" }
$DbName = if ($env:SLT_DB_NAME) { $env:SLT_DB_NAME } else { "slt_db" }

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

function Test-ContainerRunning([string]$Name) {
    $running = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -eq $Name }
    return [bool]$running
}

function Invoke-DockerPsqlFile {
    param(
        [string]$ContainerName,
        [string]$Database,
        [string]$FilePath,
        [string]$User
    )

    Get-Content -Raw -Encoding UTF8 $FilePath | docker exec -i $ContainerName psql -U $User -d $Database -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "docker psql falhou ($FilePath)" }
}

function Invoke-PsqlFile {
    param(
        [string]$Database,
        [string]$FilePath
    )

    $prev = $env:PGPASSWORD
    $env:PGPASSWORD = $DbPass
    try {
        & psql -h $HostAddr -p $Port -U $DbUser -d $Database -v ON_ERROR_STOP=1 -f $FilePath
        if ($LASTEXITCODE -ne 0) { throw "psql falhou ($FilePath)" }
    } finally {
        if ($null -ne $prev) { $env:PGPASSWORD = $prev } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host "  SLT — Aplicar schema PostgreSQL" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host "  Container: $Container  Host: ${HostAddr}:$Port  Banco: $DbName" -ForegroundColor DarkGray

$migrations = @(
    "002_schema_cadastro_auditoria.sql",
    "003_schema_ahp_objetos.sql",
    "004_schema_ahp_analises.sql"
)

foreach ($name in $migrations) {
    $path = Join-Path $DbDir $name
    if (-not (Test-Path $path)) {
        Write-Err "Arquivo SQL nao encontrado: database/$name"
        exit 1
    }
}

try {
    if (Test-ContainerRunning $Container) {
        Write-Step "Container $Container — aplicando migrations via docker exec"
        foreach ($name in $migrations) {
            $path = Join-Path $DbDir $name
            Invoke-DockerPsqlFile -ContainerName $Container -Database $DbName -FilePath $path -User $DbUser
            Write-Ok $name
        }
    } elseif (Get-Command psql -ErrorAction SilentlyContinue) {
        Write-Step "psql local em ${HostAddr}:$Port"
        foreach ($name in $migrations) {
            $path = Join-Path $DbDir $name
            Invoke-PsqlFile -Database $DbName -FilePath $path
            Write-Ok $name
        }
    } else {
        Write-Err "Container $Container nao esta rodando."
        Write-Host "     Execute primeiro: .\scripts\start-db.ps1" -ForegroundColor Yellow
        exit 1
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor White
    Write-Host "  Schema SLT aplicado com sucesso" -ForegroundColor Green
    Write-Host "  SLT_DATABASE_URL=postgresql://${DbUser}:***@${HostAddr}:${Port}/${DbName}" -ForegroundColor DarkGray
    Write-Host "========================================" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Err $_.Exception.Message
    exit 1
}
