# Execute uma vez no PowerShell DO WINDOWS. Não executar no Codespace.
[CmdletBinding()]
param([string]$Codespace = 'scaling-space-giggle-g46xvg6r7vx52w7jw')
$ErrorActionPreference = 'Stop'
$ghSicard = (Get-Command gh.exe -ErrorAction SilentlyContinue).Source
if (-not $ghSicard) { $ghSicard = "$env:ProgramFiles\GitHub CLI\gh.exe" }
$codeSicard = (Get-Command code.cmd -ErrorAction SilentlyContinue).Source
if (-not $codeSicard) { $codeSicard = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" }
if (-not (Test-Path -LiteralPath $codeSicard)) { throw 'VS Code Desktop não encontrado no Windows.' }
$packageSicard = Join-Path $env:TEMP 'sicard-windows-tunnel-0.1.0.vsix'
& $ghSicard codespace cp -c $Codespace 'remote:/workspaces/sad_slt/tools/vscode-sicard-tunnel/dist/sicard-windows-tunnel-0.1.0.vsix' $packageSicard
if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar a extensão. Confira gh auth status e acesso ao Codespace.' }
foreach ($extensionSicard in @('ms-vscode-remote.remote-ssh', 'ms-vscode.remote-explorer', $packageSicard)) {
    & $codeSicard --install-extension $extensionSicard --force
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar: $extensionSicard" }
}
Write-Host 'Instalação local concluída. Encerre o túnel manual com Ctrl+C e use Developer: Reload Window no VS Code.'
Write-Host 'Ao abrir sad_slt, a extensão iniciará o túnel e configurará sicard-codespace no Explorador Remoto.'
