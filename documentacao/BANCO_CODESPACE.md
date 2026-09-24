# Banco oficial no Codespace via Windows

A VM aceita SSH apenas do IP autorizado do Windows. A ponte preserva essa
restricao: Codespace -> tunel SSH ate o Windows -> SSH da VM -> PostgreSQL.
SLT usa `slt_db`; SIGMA usa `sigma_pli_qr53`, ambos no `sigma_pli_db`.
Nenhum banco local ou copia dos dados foi criado.

## Abrir a ponte

No PowerShell do Windows, manter este comando executando:

```powershell
& "$env:ProgramFiles\GitHub CLI\gh.exe" codespace ssh -c scaling-space-giggle-g46xvg6r7vx52w7jw -- -T -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 127.0.0.1:10022:56.125.163.194:22
```

O GitHub CLI precisa estar autenticado na conta proprietaria do Codespace com
escopo `codespace`. A porta 10022 escuta somente no loopback do Codespace.
O destino TCP da VM e acessado pelo Windows, usando seu IP autorizado.

No Codespace, se o tunel PostgreSQL ainda nao estiver ativo:

```bash
bash scripts/start-database-tunnel.sh
```

Esse processo deve permanecer ativo. Nao iniciar outra instancia na mesma
porta. O tunel expoe somente `127.0.0.1:15433`, encaminhando ao PostgreSQL na
porta 5433 da VM. `bash scripts/ssh-vm-via-windows.sh` testa a autenticacao
na VM e retorna `ubuntu`. Os dois scripts fixam a impressao digital SSH da VM.

Fechar o PowerShell, suspender o Windows ou desconectar a rede interrompe o
acesso. Reabrir a ponte e, se necessario, reiniciar o tunel no Codespace.
O storage HTTPS existente funciona independentemente dessa ponte.

## Configuracao e verificacao

As duas URLs de banco ficam apenas no `.env` ignorado pelo Git, permissao
0600. `SLT_USE_SIGMA_POSTGRES=false` permite usar a URL explicita de SLT.
As credenciais foram copiadas com autorizacao explicita do usuario; nao imprimir
as URLs nem incluir o `.env` em commits. A chave fica em
`.deploy/SRV-SISTEMA-30001480.ppk`, tambem ignorada e com permissao 0600.
O transporte publico e protegido por SSH; o PostgreSQL da VM permanece sem TLS.

Em 23/09/2026 foram executadas consultas reais a partir do Codespace, com
`default_transaction_read_only=on`: 64 linhas em `slt_db.demandas.projeto` e
20 linhas em `sigma_pli_qr53.usuarios.usuario`. O registro sem credenciais fica
em `.deploy/database-validation.local.json`. Nenhuma escrita no banco foi
realizada na validacao. O banco e compartilhado com producao.

## Inicialização corrente

`start-dev-codespace.sh` chama o supervisor com `--background`, que exige
`tmux`, além de Plink e da chave privada local. O modo foreground continua
útil para diagnóstico. Confira `command -v tmux plink` antes de usar o fluxo.
O servidor usa 8083; os túneis 10022 e 15433 não são portas de navegação.
Relatórios datados acima são evidências históricas, não prova da conexão atual.
Procedimentos completos de desenvolvimento e deploy estão no README.

## Recuperar uma ponte travada

Se o Windows alcança `56.125.163.194:22`, mas a porta 10022 não retorna a
identificação SSH, abra uma ponte alternativa no PowerShell do Windows e
mantenha esse terminal aberto:

```powershell
& "$env:ProgramFiles\GitHub CLI\gh.exe" codespace ssh -c scaling-space-giggle-g46xvg6r7vx52w7jw -- -T -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 127.0.0.1:10023:56.125.163.194:22
```

No Codespace, o helper e o deploy aceitam a porta alternativa explicitamente:

```bash
SICARD_SSH_PORT=10023 bash scripts/ssh-vm-via-windows.sh
SICARD_SSH_PORT=10023 bash scripts/deploy-codespace.sh "descricao"
```

O padrão continua sendo 10022. Essa opção não muda a porta do supervisor do
banco nem publica uma porta na VM; mantém a autenticação e a impressão digital
SSH existentes. Não encaminhe 10023 publicamente pela aba Ports.
