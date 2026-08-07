# SLT — aplica/reaplica schema no container PostgreSQL/PostGIS dedicado (slt_postgres)
#
# Uso:
#   .\scripts\start-db.ps1          # sobe container (schema na 1a vez)
#   .\scripts\apply-database.ps1    # reaplica schema se necessario
#   .\scripts\apply-database.ps1 -OnlyMigration 052_ambientes_geoprocessamento_usuario.sql
#
# Variaveis (opcionais):
#   SLT_PG_CONTAINER    default slt_postgres
#   SLT_PGHOST          default 127.0.0.1
#   SLT_PGPORT          default 5434
#   SLT_PGUSER          default slt_user
#   SLT_PGPASSWORD      default slt_pass (dev)
#   SLT_DB_NAME         default slt_db

param(
    [string[]]$OnlyMigration
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$DbDir = Join-Path $Root "database"
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

$Container = if ($env:SLT_PG_CONTAINER) { $env:SLT_PG_CONTAINER } else { "slt_postgres" }
$HostAddr = if ($env:SLT_PGHOST) { $env:SLT_PGHOST } else { "127.0.0.1" }
$Port = if ($env:SLT_PGPORT) { $env:SLT_PGPORT } else { "5434" }
$DbUser = if ($env:SLT_PGUSER) { $env:SLT_PGUSER } else { "slt_user" }
$DbPass = if ($env:SLT_PGPASSWORD) { $env:SLT_PGPASSWORD } else { "slt_pass" }
$DbName = if ($env:SLT_DB_NAME) { $env:SLT_DB_NAME } else { "slt_db" }

if ($env:SLT_USE_SIGMA_POSTGRES -eq "true") {
    $sltUser = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_USER)
    $sltPassword = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_PASSWORD)
    $sltSslMode = [Uri]::EscapeDataString($env:SIGMA_POSTGRES_SSLMODE)
    $env:SLT_DATABASE_URL = "postgresql://${sltUser}:${sltPassword}@$($env:SIGMA_POSTGRES_HOST):$($env:SIGMA_POSTGRES_PORT)/slt_db?sslmode=${sltSslMode}"
}

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

function Test-SchemaReady([string]$Query) {
    $query = $Query
    if ($env:SLT_USE_SIGMA_POSTGRES -eq "true" -and $env:SLT_DATABASE_URL) {
        $env:SLT_MIGRATION_QUERY = $query
        $python = Join-Path $Root ".venv\Scripts\python.exe"
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $output = @(& $python -c 'import os, psycopg; c=psycopg.connect(os.environ[''SLT_DATABASE_URL'']); r=c.execute(os.environ[''SLT_MIGRATION_QUERY'']).fetchone()[0]; c.close(); print(''t'' if str(r).lower() in (''t'',''true'',''1'') else ''f'')' 2>&1)
            $exitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
            Remove-Item Env:SLT_MIGRATION_QUERY -ErrorAction SilentlyContinue
        }
        if ($exitCode -ne 0) {
            $detail = ($output | Select-Object -Last 1 | Out-String).Trim()
            throw "Falha ao conectar ao PostgreSQL remoto: $detail"
        }
        return (($output | Select-Object -Last 1).ToString().Trim() -eq "t")
    }
    if (Test-ContainerRunning $Container) {
        $result = docker exec $Container psql -U $DbUser -d $DbName -At -c $query 2>$null
        return ($LASTEXITCODE -eq 0 -and ($result | Select-Object -Last 1) -eq "t")
    }
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        $prev = $env:PGPASSWORD
        $env:PGPASSWORD = $DbPass
        try {
            $result = & psql -h $HostAddr -p $Port -U $DbUser -d $DbName -At -c $query 2>$null
            return ($LASTEXITCODE -eq 0 -and ($result | Select-Object -Last 1) -eq "t")
        } finally {
            if ($null -ne $prev) { $env:PGPASSWORD = $prev } else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        }
    }
    return $false
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
Write-Host "  SLT - Aplicar schema PostgreSQL" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host "  Container: $Container  Host: ${HostAddr}:$Port  Banco: $DbName" -ForegroundColor DarkGray

$migrations = @(
    "002_schema_cadastro_auditoria.sql",
    "003_schema_ahp_objetos.sql",
    "004_schema_ahp_analises.sql",
    "005_schema_multicriterio.sql",
    "006_drop_old_analises.sql",
    "007_schema_demandas_aprovadas.sql",
    "008_move_dom_status_objeto.sql",
    "009_schema_hierarquizacao_demandas.sql",
    "010_rename_demandas_aprovadas.sql",
    "011_schema_geo.sql",
    "012_schema_hierarquia_demandas.sql",
    "013_indicadores_projeto.sql",
    "014_cadastro_hierarquia.sql",
    "015_colapso_demandas.sql",
    "016_tipo_demanda_ahp.sql",
    "017_seed_planos_estrategicos.sql",
    "018_representante_plano_programa.sql",
    "019_vinculo_institucional_opcional.sql",
    "020_formulario_cadastro_completo.sql",
    "021_seed_outros_hierarquia.sql",
    "022_criado_por_representante_not_null.sql",
    "023_dom_status_demanda_transicao.sql",
    "024_status_camadas_transicao.sql",
    "025_outros_abrangencia_estado.sql",
    "026_config_portfolio_grupo_tipo.sql",
    "027_config_tema_objetivo.sql",
    "028_config_area_fenomeno.sql",
    "029_config_subconjunto.sql",
    "030_status_fases.sql",
    "031_config_universo_objetos.sql",
    "032_config_alertas_conceituais.sql",
    "033_config_pacote_fase.sql",
    "034_comparacao_colaborativa.sql",
    "035_config_arquivos_fase.sql",
    "036_config_denominacao.sql",
    "037_schema_geoprocessamento.sql",
    "038_persistencia_conteudo_geoespacial.sql",
    "039_biblioteca_camadas_homologadas.sql",
    "040_separacao_fisica_camadas.sql",
    "041_idempotencia_importacao.sql",
    "042_fluxo_fases_hierarquizacao.sql",
    "043_fase1_fatiamento_relatorio.sql",
    "044_fase3_persistencia.sql",
    "045_modelos_geoprocessamento.sql",
    "046_regras_classificacao_fase1.sql",
    "047_fase1_fontes_produto.sql",
    "048_cavidade_maxima_risco.sql",
    "049_unificar_classificacao_cavidades.sql",
    "050_bem_tombado_restricao.sql",
    "051_classificacao_binaria_fase1.sql",
    "052_ambientes_geoprocessamento_usuario.sql",
    "053_catalogo_geoespacial_portal.sql",
    "054_seed_servicos_publicos_portal.sql",
    "055_seed_mapbiomas_portal.sql",
    "056_geom_aceita_z.sql",
    "057_classe_modelagem_atributo_objeto.sql",
    "058_projeto_vigencia_recursos.sql",
    "059_drop_schemas_legados.sql",
    "060_remove_hierarq_apta.sql"
)

if ($OnlyMigration) {
    $unknownMigrations = $OnlyMigration | Where-Object { $_ -notin $migrations }
    if ($unknownMigrations) {
        throw "Migration desconhecida: $($unknownMigrations -join ', ')"
    }
    $migrations = $migrations | Where-Object { $_ -in $OnlyMigration }
}

if (-not $OnlyMigration) {
    $latestSchemaQuery = "SELECT CASE WHEN EXISTS (SELECT 1 FROM geoprocessamento.portal_servico WHERE url='https://brasil.mapbiomas.org/colecoes-mapbiomas/') THEN 't' ELSE 'f' END;"
    $coreSchemaQuery = "SELECT CASE WHEN to_regclass('demandas.projeto') IS NOT NULL OR to_regclass('ahp.config_multicriterio_portfolio') IS NOT NULL THEN 't' ELSE 'f' END;"

    if (Test-SchemaReady $latestSchemaQuery) {
        Write-Ok "Schema ja esta na migration 055; nenhuma migration sera reaplicada"
        $migrations = @()
    } elseif (Test-SchemaReady $coreSchemaQuery) {
        Write-Ok "Schema legado ja esta atualizado; migrations 002-036 serao ignoradas"
        $migrations = $migrations | Where-Object { [int]$_.Substring(0, 3) -ge 37 }
    }
}

function Invoke-PsycopgFile {
    param([string]$FilePath)
    $env:SLT_MIGRATION_FILE = $FilePath
    $python = Join-Path $Root ".venv\Scripts\python.exe"
    & $python -c 'import os, pathlib, psycopg; sql=pathlib.Path(os.environ[''SLT_MIGRATION_FILE'']).read_text(encoding=''utf-8-sig''); c=psycopg.connect(os.environ[''SLT_DATABASE_URL'']); c.execute(sql); c.commit(); c.close()'
    Remove-Item Env:SLT_MIGRATION_FILE -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) { throw "psycopg falhou ($FilePath)" }
}

foreach ($name in $migrations) {
    $path = Join-Path $DbDir $name
    if (-not (Test-Path $path)) {
        Write-Err "Arquivo SQL nao encontrado: database/$name"
        exit 1
    }
}

try {
    if ($env:SLT_USE_SIGMA_POSTGRES -eq "true" -and $env:SLT_DATABASE_URL) {
        Write-Step "PostgreSQL remoto - aplicando migrations via psycopg"
        foreach ($name in $migrations) {
            $path = Join-Path $DbDir $name
            Invoke-PsycopgFile -FilePath $path
            Write-Ok $name
        }
    } elseif (Test-ContainerRunning $Container) {
        Write-Step "Container $Container - aplicando migrations via docker exec"
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

    $GeoLoader = Join-Path $Root "scripts\load_geo_catalog.py"
    $VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
    $PythonExe = if (Test-Path $VenvPython) { $VenvPython } else { "python" }
    Write-Step "Carregando catalogo territorial em geo.unidade_espacial"
    & $PythonExe $GeoLoader
    if ($LASTEXITCODE -ne 0) { throw "Falha ao carregar catalogo geografico" }
    Write-Ok "Catalogo territorial e vinculos espaciais atualizados"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor White
    Write-Host "  Schema SLT aplicado com sucesso" -ForegroundColor Green
    if ($env:SLT_USE_SIGMA_POSTGRES -eq "true") {
        Write-Host "  Banco remoto: $($env:SIGMA_POSTGRES_HOST):$($env:SIGMA_POSTGRES_PORT)/slt_db" -ForegroundColor DarkGray
    } else {
        Write-Host "  SLT_DATABASE_URL=postgresql://${DbUser}:***@${HostAddr}:${Port}/${DbName}" -ForegroundColor DarkGray
    }
    Write-Host "========================================" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Err $_.Exception.Message
    exit 1
}
