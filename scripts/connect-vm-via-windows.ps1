# Run on Windows and keep this terminal open while using the Codespace.
# The VM sees the authorized Windows IP. Authentication uses the PPK already
# stored privately in the Codespace; this script never reads credentials.
[CmdletBinding()]
param(
    [string]$Codespace = 'scaling-space-giggle-g46xvg6r7vx52w7jw',
    [ValidateRange(1024,65535)][int]$Port = 10022
)
$ErrorActionPreference = 'Stop'
$ghCommand = Get-Command gh.exe -ErrorAction SilentlyContinue
$gh = if ($ghCommand) { $ghCommand.Source } else { "$env:ProgramFiles\GitHub CLI\gh.exe" }
if (-not (Test-Path -LiteralPath $gh)) {
    throw 'GitHub CLI ausente. Instale com: winget install --id GitHub.cli --exact'
}
Write-Host 'Iniciando ponte SSH. Mantenha este terminal aberto.'
& $gh codespace ssh -c $Codespace -- -T -N `
    -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 `
    -R "127.0.0.1:${Port}:56.125.163.194:22"
if ($LASTEXITCODE -ne 0) { throw 'A ponte SSH encerrou com erro; consulte a mensagem acima.' }
