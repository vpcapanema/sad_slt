# Registra a conexao SLT no SQLTools do Cursor (settings globais do usuario).
# Uso: .\scripts\sync-sqltools.ps1

$ErrorActionPreference = "Stop"

$Connection = @{
    name              = "SLT (slt_postgres · local 5434)"
    driver            = "PostgreSQL"
    previewLimit      = 50
    server            = "127.0.0.1"
    port              = 5434
    database          = "slt_db"
    username          = "slt_user"
    password          = "slt_pass"
    connectString     = "postgresql://slt_user:slt_pass@127.0.0.1:5434/slt_db"
    askForPassword    = $false
    connectionTimeout = 30
    pgOptions         = @{ ssl = $false }
}

$SettingsPath = Join-Path $env:APPDATA "Cursor\User\settings.json"
if (-not (Test-Path $SettingsPath)) {
    Write-Error "Nao encontrado: $SettingsPath"
}

$py = @'
import json, os, re, sys
from pathlib import Path

settings_path = Path(os.environ["APPDATA"]) / "Cursor" / "User" / "settings.json"
raw = settings_path.read_text(encoding="utf-8")

try:
    import json5
    data = json5.loads(raw)
except ImportError:
    cleaned = re.sub(r",(\s*[}\]])", r"\1", raw)
    data = json.loads(cleaned)

conn = {
    "name": "SLT (slt_postgres · local 5434)",
    "driver": "PostgreSQL",
    "previewLimit": 50,
    "server": "127.0.0.1",
    "port": 5434,
    "database": "slt_db",
    "username": "slt_user",
    "password": "slt_pass",
    "connectString": "postgresql://slt_user:slt_pass@127.0.0.1:5434/slt_db",
    "askForPassword": False,
    "connectionTimeout": 30,
    "pgOptions": {"ssl": False},
}

connections = data.get("sqltools.connections") or []
connections = [c for c in connections if c.get("name") != conn["name"]]
connections.append(conn)
data["sqltools.connections"] = connections
data["sqltools.useNodeRuntime"] = True

text = json.dumps(data, indent=2, ensure_ascii=False)
if not text.endswith("\n"):
    text += "\n"
settings_path.write_text(text, encoding="utf-8")
print(f"SQLTools atualizado: {settings_path}")
'@

$tmp = Join-Path $env:TEMP "sync_sqltools_slt.py"
Set-Content -Path $tmp -Value $py -Encoding UTF8
python $tmp
Remove-Item $tmp -ErrorAction SilentlyContinue
