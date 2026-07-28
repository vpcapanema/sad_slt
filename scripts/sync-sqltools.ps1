# Sincroniza as conexoes SQLTools do projeto no VS Code/Cursor.
# As credenciais sao lidas do .env do projeto.
# Uso: .\scripts\sync-sqltools.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $EnvPath)) { Write-Error ".env do projeto nao encontrado" }

Get-Content $EnvPath | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$required = @("SIGMA_POSTGRES_HOST", "SIGMA_POSTGRES_PORT", "SIGMA_POSTGRES_USER", "SIGMA_POSTGRES_PASSWORD")
foreach ($key in $required) {
    if (-not [Environment]::GetEnvironmentVariable($key, "Process")) {
        Write-Error "Variavel obrigatoria ausente no .env: $key"
    }
}

$SettingsCandidates = @(
    (Join-Path $env:APPDATA "Code\User\settings.json"),
    (Join-Path $env:APPDATA "Cursor\User\settings.json")
)
$SettingsPaths = $SettingsCandidates | Where-Object { Test-Path $_ }
if (-not $SettingsPaths) { Write-Error "settings.json do VS Code/Cursor nao encontrado" }
$env:SLT_SQLTOOLS_SETTINGS = ($SettingsPaths -join [IO.Path]::PathSeparator)

$py = @'
import json, os, re
from pathlib import Path

settings_paths = [Path(p) for p in os.environ["SLT_SQLTOOLS_SETTINGS"].split(os.pathsep) if p]

host = os.environ["SIGMA_POSTGRES_HOST"]
port = int(os.environ["SIGMA_POSTGRES_PORT"])
user = os.environ["SIGMA_POSTGRES_USER"]
password = os.environ["SIGMA_POSTGRES_PASSWORD"]
sslmode = os.environ.get("SIGMA_POSTGRES_SSLMODE", "disable")
ssl_enabled = sslmode.lower() not in {"disable", "false", "0"}


def pg_conn(name, server, port, database, username, password, *, ssl=False, connection_timeout=None, pg_ssl=None, ssl_object=None):
    conn = {
        "name": name,
        "driver": "PostgreSQL",
        "previewLimit": 50,
        "server": server,
        "port": port,
        "database": database,
        "username": username,
        "password": password,
        "askForPassword": False,
    }
    if ssl_object is not None:
        conn["ssl"] = ssl_object
    else:
        conn["ssl"] = ssl
    if connection_timeout is not None:
        conn["connectionTimeout"] = connection_timeout
    if pg_ssl is not None:
        conn["pgOptions"] = {"ssl": pg_ssl}
    return conn


connections = [
    pg_conn(
        "AWS RDS - SIGMA PLI",
        "sigma-pli-postgresql-db.cwlmgwc4igdh.us-east-1.rds.amazonaws.com",
        5432,
        "sigma_pli",
        "sigma_admin",
        password,
        ssl_object={"rejectUnauthorized": False},
    ),
    pg_conn(
        "AWS VM - PLI STATS",
        host,
        5432,
        "pli_stats",
        "pli_admin",
        password,
    ),
    pg_conn(
        "AWS VM - SIGMA PLI (tunel 15433)",
        "127.0.0.1",
        15433,
        "sigma_pli_qr53",
        "sigma_user",
        password,
    ),
    pg_conn(
        "AWS VM - PLI REPORTA",
        host,
        5433,
        "pli_reporta",
        "pli_user",
        password,
    ),
    pg_conn(
        "Postgres - SLT VM (slt_db)",
        host,
        port,
        "slt_db",
        user,
        password,
        connection_timeout=30,
        pg_ssl=ssl_enabled,
    ),
    pg_conn(
        "Postgres - SLT Local (slt_db)",
        "127.0.0.1",
        5434,
        "slt_db",
        "slt_user",
        os.environ.get("SLT_PGPASSWORD", "slt_pass"),
        connection_timeout=30,
        pg_ssl=False,
    ),
    pg_conn(
        "AWS VM - PLI SMARTROUTER",
        host,
        5433,
        "pli_smartrouter",
        "pli_user",
        password,
    ),
    pg_conn(
        "AWS VM - POSTGRES ADMIN",
        host,
        5433,
        "postgres",
        "postgres",
        password,
    ),
]

desired_names = {c["name"] for c in connections}

for settings_path in settings_paths:
    raw = settings_path.read_text(encoding="utf-8")

    try:
        import json5
        data = json5.loads(raw)
    except ImportError:
        cleaned = re.sub(r",(\s*[}\]])", r"\1", raw)
        data = json.loads(cleaned)

    existing = data.get("sqltools.connections") or []
    existing = [c for c in existing if c.get("name") not in desired_names]
    data["sqltools.connections"] = existing + connections
    data["sqltools.useNodeRuntime"] = True

    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    settings_path.write_text(text, encoding="utf-8")
    print(f"SQLTools atualizado: {settings_path}")
'@

$tmp = Join-Path $env:TEMP "sync_sqltools_slt.py"
Set-Content -Path $tmp -Value $py -Encoding UTF8
try {
    python $tmp
} finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
}
