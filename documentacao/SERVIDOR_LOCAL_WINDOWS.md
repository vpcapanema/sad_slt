# Servidor local no Windows

## Ambiente Python

O projeto usa um ambiente virtual local em `.venv`, que não deve ser copiado
entre máquinas nem versionado. Se a instalação-base mudar ou deixar de existir,
recrie o ambiente com um Python 3.12 instalado:

```powershell
Remove-Item -LiteralPath .venv -Recurse -Force
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

`requirements-dev.txt` inclui as dependências da aplicação e o pytest. O GDAL
para Windows/Python 3.12 é instalado pelo wheel binário definido em
`requirements.txt`.

No VS Code, execute **Terminal → Executar tarefa → SICARD: Iniciar servidor local**.
A tarefa usa `.venv/Scripts/python.exe` e `scripts/start-local-task.py`,
mantendo `api.server:app`, `.env`, host `127.0.0.1` e porta `8083`. `Ctrl+C`
encerra somente o servidor.

## Acesso local aos bancos oficiais

No Windows, a aplicação não abre túnel SSH. Os DSNs privados de `slt_db` e
`sigma_pli_qr53` usam o gateway TLS já aprovado: SNI `pg-pli.pli.internal`,
porta `443` e `hostaddr` do balanceador. A negociação é direta
(`sslnegotiation=direct`), com `sslmode=verify-full` e a CA local do pgAdmin.
As credenciais continuam no `.env`, que não é versionado.

Esse caminho é exclusivo do desenvolvimento local. A VM continua acessando o
PostgreSQL pela rede interna e não deve ser alterada para usar o gateway.

O startup só continua depois de validar, em transações somente leitura, os bancos
`slt_db` e `sigma_pli_qr53` e suas tabelas esperadas. Essa validação não altera
registros.

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
