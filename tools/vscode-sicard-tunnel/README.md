# SICARD · Túnel do Windows

Extensão **local do VS Code Desktop Windows**, não do servidor Codespace.
Ao abrir uma pasta chamada `sad_slt` em um workspace confiável, inicia exatamente:

```powershell
gh codespace ssh -c scaling-space-giggle-g46xvg6r7vx52w7jw -- -T -N -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 127.0.0.1:10022:56.125.163.194:22
```

- Executa o GitHub CLI no Windows e mantém o IP autorizado da VM.
- Usa a autenticação GitHub existente; não lê nem copia a chave PPK da VM.
- Gera a conexão `sicard-codespace` em `~/.ssh/sicard-codespace.config` e inclui esse arquivo em `~/.ssh/config`, preservando as outras conexões e criando backup antes de alterar.
- Mostra os controles no Explorador Remoto e o log na barra de status.
- Reinicia o processo com espera progressiva quando cai; encerra seus processos ao fechar a janela.
- Um bloqueio TCP exclusivamente local em `127.0.0.1:38427` impede duplicação entre janelas.
- A barra indica o estado do processo, não atesta a autenticação SSH na VM.

## Instalar uma vez no Windows

Baixe `sicard-windows-tunnel-0.3.0.vsix` para o Windows. No **PowerShell local**, execute:

```powershell
code --install-extension ms-vscode-remote.remote-ssh
code --install-extension ms-vscode.remote-explorer
code --install-extension "$env:USERPROFILE\Downloads\sicard-windows-tunnel-0.3.0.vsix" --force
```

Encerre o túnel manual com `Ctrl+C` e execute **Developer: Reload Window** no VS Code. Nas próximas aberturas de `sad_slt`, a ponte inicia automaticamente. Não instale apenas no Codespace: o manifesto exige execução local (`extensionKind: ui`).

O Windows deve ter GitHub CLI autenticado com acesso ao Codespace (`gh auth status`, escopo `codespace`). Se necessário, `gh auth refresh -h github.com -s codespace`.
O nome pode ser alterado na configuração **SICARD Tunnel: Codespace**. Desative **Auto Start** para não iniciar ao abrir.

A entrada Remote-SSH permite abrir o Codespace via SSH; o encaminhamento é independente e gerenciado pela extensão. Não acrescente um segundo `RemoteForward` ao mesmo host.

## Recuperação pela tarefa local

A tarefa **SICARD: Limpar porta e reiniciar servidor local** usa o comando
`sicardTunnel.ensureBridge` da versão 0.3.0. Antes de executar o script no
Codespace, a extensão verifica a autenticação SSH na VM pela ponte 10022.
Se falhar, reinicia o processo Windows que ela gerencia e aguarda até dois
minutos pela recuperação. Depois, o script verifica o banco com `SELECT 1`
em conexão somente leitura; se necessário, reinicia o supervisor do túnel
15433 e aguarda a conexão. Somente após validar o banco libera a porta 8083.

Atualize a extensão **no Windows** com o VSIX 0.3.0 e recarregue a janela.
O script executado diretamente no terminal verifica a ponte, mas não consegue
iniciar um processo em outro computador. A recuperação automática da ponte
requer VS Code Desktop Windows e GitHub CLI autenticado.
