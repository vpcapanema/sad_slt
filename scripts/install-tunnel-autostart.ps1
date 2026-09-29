# Registra o supervisor do túnel do banco para subir sozinho no logon.
#
# Depois disso a porta local dos bancos oficiais fica disponível o tempo todo,
# sem depender da tarefa do editor: o servidor, os testes e os scripts apenas
# encontram o túnel pronto. Não exige privilégio de administrador, porque a
# tarefa é registrada no contexto do próprio usuário.
#
#   .\scripts\install-tunnel-autostart.ps1            # instala e inicia
#   .\scripts\install-tunnel-autostart.ps1 -Remover   # desinstala e para
[CmdletBinding()]
param(
    [switch]$Remover
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$nome = 'SICARD - Tunel do banco'

if ($Remover) {
    $existente = Get-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue
    if (-not $existente) {
        Write-Host "Tarefa '$nome' não está registrada."
        return
    }
    Stop-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $nome -Confirm:$false
    Write-Host "Tarefa '$nome' removida. O túnel em execução segue até o próximo logoff."
    return
}

$python = Join-Path $raiz '.venv\Scripts\pythonw.exe'
if (-not (Test-Path -LiteralPath $python)) {
    throw "Interpretador do ambiente virtual ausente: $python"
}
$daemon = Join-Path $raiz 'scripts\tunnel_daemon.py'
if (-not (Test-Path -LiteralPath $daemon)) {
    throw "Supervisor ausente: $daemon"
}

$acao = New-ScheduledTaskAction -Execute $python -Argument "-B `"$daemon`"" -WorkingDirectory $raiz
$gatilho = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
# Sem limite de duração: é um processo residente. O reinício automático cobre
# uma falha do próprio supervisor; quedas de rede ele já trata internamente.
$opcoes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $nome -Action $acao -Trigger $gatilho -Settings $opcoes `
    -Principal $principal -Description 'Mantém o túnel SSH até os bancos oficiais do SICARD na VM.' -Force | Out-Null
Start-ScheduledTask -TaskName $nome

Write-Host "Tarefa '$nome' registrada e iniciada."
Write-Host "Registro: .deploy\database-tunnel-daemon.local.log"
