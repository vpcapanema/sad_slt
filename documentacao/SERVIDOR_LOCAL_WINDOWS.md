# Servidor local no Windows

No VS Code, execute **Terminal → Executar tarefa → SICARD: Iniciar servidor local**.
A tarefa usa `.venv/Scripts/python.exe` e `scripts/start-local-task.py`, mantendo
`api.server:app`, `.env`, host `127.0.0.1` e porta `8083`. `Ctrl+C` encerra o servidor.

Antes do servidor, o script cria e supervisiona um túnel SSH direto do Windows
para a VM. A porta local `127.0.0.1:15434` encaminha ao PostgreSQL oficial da VM;
o host SSH e sua chave pública são fixados no código e a chave privada permanece
em `.deploy`, ignorada pelo Git. O Plink portátil fica fora do repositório em
`%LOCALAPPDATA%/SICARD/tools/plink.exe`.

A porta é exclusiva do SICARD por decisão deliberada: o projeto SIGMA-PLI
encaminha a mesma VM na `15433`. Quando dois projetos disputam a mesma porta,
quem sobe depois fica com um encaminhamento morto, e o encerramento de um
derruba o banco do outro.

O startup só continua depois de validar, em transações somente leitura, os bancos
`slt_db` e `sigma_pli_qr53` e suas tabelas esperadas. Essa validação não altera
registros. Durante a execução, o túnel é monitorado e reconectado se cair; `Ctrl+C`
encerra tanto o servidor quanto o túnel criado pela tarefa.

## Túnel permanente, independente do editor

Para que o banco fique alcançável o tempo todo — inclusive para testes e scripts
rodados fora da tarefa, e depois que ela é encerrada — registre o supervisor
autônomo, uma vez por máquina:

```powershell
.\scripts\install-tunnel-autostart.ps1
```

O comando registra a tarefa agendada `SICARD - Tunel do banco` no logon do
usuário atual, sem exigir privilégio de administrador, e a inicia na hora. O
supervisor é `scripts/tunnel_daemon.py`: abre o túnel, sonda o PostgreSQL a cada
15 segundos e o refaz quando a sessão SSH cai, registrando tudo em
`.deploy/database-tunnel-daemon.local.log`. Uma única instância roda por vez, e
tentar iniciar outra apenas registra que já existe supervisor ativo.

Com ele ativo, a tarefa do servidor encontra o túnel pronto, não o administra e
não o derruba ao terminar — a supervisão continua sendo de quem o criou. Sem ele,
o comportamento permanece o de antes: a tarefa abre o túnel e o encerra junto com
o servidor. Para desinstalar:

```powershell
.\scripts\install-tunnel-autostart.ps1 -Remover
```

O storage geoespacial não é montado no Windows, porque a montagem usada no
Codespace depende de FUSE. O storage continua sendo um só — o SFTPGo da VM — e é
ele que o servidor local acessa, com as credenciais `SICARD_STORAGE_API_*` do
`.env`. Não existe pasta de trabalho local: o explorador lista as pastas pela API
e o GDAL abre o arquivo onde ele está, por `/vsicurl`, lendo apenas as faixas de
bytes necessárias. No caso do shapefile, o próprio GDAL pede os arquivos que o
acompanham. O acesso é de leitura; gravar continua sendo papel do SFTPGo. Na VM
nada disso é acionado, porque lá a pasta já está montada — e `SICARD_STORAGE_DIR`
é apenas esse ponto de montagem, que no Windows permanece vazio.

Depois que esta instância terminar o startup, o script espera `/api/health` e
a página inicial responderem. Abre `http://127.0.0.1:8083/` no **Edge e Chrome
externos ao VS Code**, com DevTools na aba Console. O prazo é de 180 segundos;
falha de abertura não encerra o servidor. A tarefa **Verificar servidor local**
consulta `/api/health/ready` para confirmar também as integrações.

Os navegadores usam perfis persistentes exclusivos:

- `%LOCALAPPDATA%/SICARD/BrowserProfiles-Isolated/Edge`
- `%LOCALAPPDATA%/SICARD/BrowserProfiles-Isolated/Chrome`

Eles mantêm suas próprias sessões; pode ser necessário entrar no SICARD no
primeiro uso. Não é necessário fechar os navegadores pessoais. Se alterar
manualmente as preferências desses perfis e mantê-los abertos, feche suas janelas
SICARD local antes de repetir a tarefa para reaplicar a configuração.
Extensões ficam desabilitadas nesses perfis de desenvolvimento. Assim, erros de
`chrome-extension://.../background.js` não se misturam aos logs do SICARD. Abas
de uma execução interrompida não são restauradas antes de o servidor responder.

Console: Verbose/Info/Warning/Error, filtro vazio, todos os contextos, horários,
preservação na navegação, mensagens de rede e XHR, sem agrupar mensagens similares.
As demais preferências são preservadas; alterações existentes recebem backup
`Default/Preferences.before-console.bak`. Nenhuma porta de depuração remota é aberta.

Na extração de atributos os logs `[SICARD][Extração]` já ficam ativos por padrão.
Para registrar também cada consulta HTTP repetida, execute no Console dessa página
`SICARDExtracaoLogs.detalharHttp(true)`. O launcher não cria logs de aplicação
para páginas que ainda não tenham instrumentação.

Referências dos fabricantes: [Chrome](https://developer.chrome.com/docs/devtools/open)
e [Edge](https://learn.microsoft.com/en-us/microsoft-edge/devtools/overview)
documentam `--auto-open-devtools-for-tabs`.

Validação isolada: `python -m pytest tests/test_start_local_task.py -q`.
Não inicia o servidor real nem acessa o banco oficial.
