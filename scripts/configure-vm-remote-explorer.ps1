# Execute uma vez no PowerShell DO WINDOWS. Não executar no Codespace.
# Registra a VM AWS como conexão Remote-SSH "sicard-vm" no Explorador Remoto.
# O OpenSSH do Windows não lê .ppk: a chave é convertida com o puttygen para
# ~/.ssh/sicard-vm.key (ACL restrita ao usuário). O .ppk original não é alterado
# nem copiado. O IP público desta máquina precisa estar autorizado na VM.
[CmdletBinding()]
param(
    [string]$ChavePpk = 'C:\Users\vinic\OneDrive\GEOSER-VINICIUS DO PRADO CAPANEMA LTDA\CONCREMAT-TRANSPLAN\SRV-SISTEMA-30001480.ppk',
    [string]$Alias = 'sicard-vm',
    [string]$HostVm = '56.125.163.194',
    [string]$Usuario = 'ubuntu',
    [string]$ImpressaoHost = 'SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0',
    [switch]$Reconverter
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ChavePpk)) { throw "Chave PPK não encontrada: $ChavePpk" }
$puttygen = (Get-Command puttygen.exe -ErrorAction SilentlyContinue).Source
if (-not $puttygen) { $puttygen = "$env:ProgramFiles\PuTTY\puttygen.exe" }
if (-not (Test-Path -LiteralPath $puttygen)) {
    throw 'puttygen ausente. Instale com: winget install --id PuTTY.PuTTY --exact'
}
$sshDir = Join-Path $env:USERPROFILE '.ssh'
New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
$chaveSsh = Join-Path $sshDir 'sicard-vm.key'

# 1. Converte PPK -> OpenSSH e restringe a ACL (o ssh recusa chave legível por outros).
if ((Test-Path -LiteralPath $chaveSsh) -and -not $Reconverter) {
    Write-Host "Chave OpenSSH já existe: $chaveSsh (use -Reconverter para refazer)."
} else {
    if (Test-Path -LiteralPath $chaveSsh) { Remove-Item -LiteralPath $chaveSsh -Force }
    & $puttygen $ChavePpk -O private-openssh -o $chaveSsh
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $chaveSsh)) {
        throw 'Falha ao converter a chave (senha incorreta ou formato inválido).'
    }
    & icacls.exe $chaveSsh /inheritance:r /grant:r "${env:USERNAME}:R" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao restringir permissões da chave.' }
}

# 2. Confia no host somente se a impressão digital coincidir com a registrada no projeto.
$scan = & ssh-keyscan.exe -T 10 -t ed25519,ecdsa,rsa $HostVm 2>$null | Where-Object { $_ -and $_ -notmatch '^#' }
if (-not $scan) { throw "ssh-keyscan não alcançou $HostVm. Confira se o IP desta máquina está autorizado na VM." }
$confiavel = $scan | Where-Object { ($_ | & ssh-keygen.exe -lf - 2>$null) -match [regex]::Escape($ImpressaoHost) }
if (-not $confiavel) { throw "Impressão digital do host diferente de $ImpressaoHost. Conexão NÃO configurada." }
$knownHosts = Join-Path $sshDir 'known_hosts'
$jaConhecido = (Test-Path -LiteralPath $knownHosts) -and (& ssh-keygen.exe -F $HostVm -f $knownHosts 2>$null)
if (-not $jaConhecido) { Add-Content -LiteralPath $knownHosts -Value $confiavel -Encoding ascii }

# 3. Bloco gerenciado + Include no topo do ~/.ssh/config (com backup; preserva o restante).
$gerenciado = Join-Path $sshDir 'sicard-vm.config'
@"
Host $Alias
    HostName $HostVm
    User $Usuario
    IdentityFile "$($chaveSsh -replace '\\','/')"
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
"@ | Set-Content -LiteralPath $gerenciado -Encoding ascii

$config = Join-Path $sshDir 'config'
$existente = if (Test-Path -LiteralPath $config) { Get-Content -LiteralPath $config -Raw } else { '' }
$linha = "Include `"$($gerenciado -replace '\\','/')`""
if (($existente -split "\r?\n") -notcontains $linha) {
    if ($existente) { Copy-Item -LiteralPath $config -Destination "$config.sicard-backup-$(Get-Date -Format yyyyMMddHHmmss)" }
    "# SICARD: conexão da VM gerenciada por configure-vm-remote-explorer.ps1`n$linha`n`n$($existente -replace '^\uFEFF','')" |
        Set-Content -LiteralPath $config -Encoding ascii
}

# 4. Teste não interativo.
$id = & ssh.exe -o BatchMode=yes -o ConnectTimeout=15 $Alias 'echo $(id -un)@$(hostname)' 2>&1
if ($LASTEXITCODE -ne 0) { throw "Configuração gravada, mas o login falhou: $id" }
Write-Host "Conexão '$Alias' funcionando: $id"
Write-Host "No VS Code: Explorador Remoto > Remote (SSH) > $Alias, ou F1 > Remote-SSH: Connect to Host."
