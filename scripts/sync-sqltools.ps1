# Registra a conexao do banco SLT da VM no SQLTools do VS Code/Cursor.
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
$SettingsPath = $SettingsCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $SettingsPath) { Write-Error "settings.json do VS Code/Cursor nao encontrado" }
$env:SLT_SQLTOOLS_SETTINGS = $SettingsPath

$py = @'
import json, os, re
from pathlib import Path
from urllib.parse import quote

settings_path = Path(os.environ["SLT_SQLTOOLS_SETTINGS"])
raw = settings_path.read_text(encoding="utf-8")

try:
    import json5
    data = json5.loads(raw)
except ImportError:
    cleaned = re.sub(r",(\s*[}\]])", r"\1", raw)
    data = json.loads(cleaned)

host = os.environ["SIGMA_POSTGRES_HOST"]
port = int(os.environ["SIGMA_POSTGRES_PORT"])
user = os.environ["SIGMA_POSTGRES_USER"]
password = os.environ["SIGMA_POSTGRES_PASSWORD"]
sslmode = os.environ.get("SIGMA_POSTGRES_SSLMODE", "disable")
ssl_enabled = sslmode.lower() not in {"disable", "false", "0"}

conn = {
    "name": "Postgres - SLT VM (slt_db)",
    "driver": "PostgreSQL",
    "previewLimit": 50,
    "server": host,
    "port": port,
    "database": "slt_db",
    "username": user,
    "password": password,
    "connectString": (
        f"postgresql://{quote(user, safe='')}:{quote(password, safe='')}@"
        f"{host}:{port}/slt_db?sslmode={quote(sslmode, safe='')}"
    ),
    "askForPassword": False,
    "connectionTimeout": 30,
    "pgOptions": {"ssl": ssl_enabled},
}

old_names = {"Postgres - SLT Local (slt_db)", "Postgres - SLT VM (slt_db)"}
connections = data.get("sqltools.connections") or []
connections = [c for c in connections if c.get("name") not in old_names]
connections.append(conn)
data["sqltools.connections"] = connections
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
