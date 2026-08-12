param(
    [string]$SeedFile = "database/seeds/001_demandas_teste_realistas.sql"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SeedPath = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot $SeedFile))
$SeedRoot = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot "database/seeds"))

if (-not $SeedPath.StartsWith($SeedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "O arquivo deve estar dentro de database/seeds."
}
if (-not (Test-Path -LiteralPath $SeedPath)) {
    throw "Arquivo de carga não encontrado: $SeedPath"
}

$envFile = Join-Path $ProjectRoot ".env"
if (Test-Path -LiteralPath $envFile) {
    foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
        if ($line -notmatch '^\s*#' -and $line -match '^\s*([^=]+)=(.*)$') {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            if (-not (Test-Path "Env:$name")) { Set-Item "Env:$name" $value }
        }
    }
}

$dbUser = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_USER)
$dbPassword = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_PASSWORD)
$sslMode = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_SSLMODE)
$env:SLT_DATABASE_URL = "postgresql://${dbUser}:${dbPassword}@$($env:SIGMA_POSTGRES_HOST):$($env:SIGMA_POSTGRES_PORT)/slt_db?sslmode=${sslMode}"
$env:SLT_SEED_FILE = $SeedPath
$python = Join-Path $ProjectRoot ".venv/Scripts/python.exe"
$runner = Join-Path $PSScriptRoot "seed_demandas_teste.py"

& $python $runner
if ($LASTEXITCODE -ne 0) { throw "Falha ao aplicar a carga de teste." }

Remove-Item Env:SLT_SEED_FILE -ErrorAction SilentlyContinue
