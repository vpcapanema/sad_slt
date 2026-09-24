# PowerShell compartilhado entre VS Code e Windows

O ambiente preparado usa PowerShell e tmux no Codespace. Verifique a disponibilidade com `command -v pwsh tmux`; a configuração versionada não garante que estejam acessíveis em toda sessão. O perfil Linux padrão do VS Code
é **Host do agente — PowerShell compartilhado**. A tarefa de mesmo nome abre na
entrada da pasta (`runOn: folderOpen`); o VS Code pode pedir para permitir tarefas
automáticas. Também pode ser iniciada por **Terminal: Run Task**.

A sessão `host-do-agente` no servidor tmux `sicard` contém um único processo
PowerShell. Fechar/desanexar um cliente não encerra a sessão. Digitar `exit`
encerra o PowerShell para todos os clientes; Ctrl+B, depois D, apenas desconecta.

No PowerShell do Windows, conecte-se à mesma sessão:

```powershell
& "$env:ProgramFiles\GitHub CLI\gh.exe" codespace ssh -c scaling-space-giggle-g46xvg6r7vx52w7jw -- -t "bash /workspaces/sad_slt/scripts/shared-powershell.sh"
```

Ambos os clientes veem os mesmos comandos e saída. A execução ocorre no Linux do
Codespace; os arquivos do Windows continuam no Windows. A ponte para a VM,
gerenciada pela extensão local SICARD, é um processo independente no Windows.

O `postCreateCommand` do devcontainer reinstala as dependências após reconstruir.
O instalador segue o repositório Microsoft para Ubuntu:
https://learn.microsoft.com/en-us/powershell/scripting/install/install-ubuntu

Validação realizada: PowerShell 7.6.6 / Ubuntu 24.04.5; tmux confirma processo
`pwsh` na sessão `host-do-agente`; scripts passam em `bash -n` e instalador é
idempotente. A ligação do cliente Windows requer executar o comando acima;
a aba do VS Code será aberta pela tarefa na próxima abertura da pasta.
