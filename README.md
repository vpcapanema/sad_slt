# SICARD — Sistema Inteligente de Cadastro e Ranking de Demandas

Aplicação web de apoio à decisão para cadastrar, analisar, hierarquizar e
acompanhar planos, programas e projetos. O sistema combina análise multicritério
AHP, processamento geoespacial e trilha de auditoria.

O inventário detalhado do que está implementado está em
[`documentacao/STATUS_IMPLEMENTACAO.md`](documentacao/STATUS_IMPLEMENTACAO.md).

## Arquitetura

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| Backend | FastAPI / Python 3.11+ | API, autenticação, regras e páginas estáticas |
| Frontend | HTML, CSS e JavaScript | Formulários, painéis, AHP e bancadas espaciais |
| Banco SLT | PostgreSQL 17 + PostGIS 3.5 | Fonte definitiva dos dados do SICARD |
| SIGMA-PLI | API e PostgreSQL externos | Login, pessoas e instituições, somente leitura |

O backend é organizado em:

| Camada | Pasta |
|---|---|
| Rotas HTTP | `api/routers/` |
| Contratos | `api/schemas/` |
| Regras de negócio | `api/services/` |
| SQL e persistência | `api/repositories/` |
| Conexões | `api/db/` |

## Executar em desenvolvimento no Codespace

O Codespace executa o código local; GitHub guarda o código publicado; a VM
executa produção. Desenvolvimento usa o **mesmo banco oficial da produção**.
Não iniciar o banco de contingência para substituir essa conexão.

1. Preserve o `.env` privado existente. `.env.example` é somente um modelo;
   não o copie sobre uma configuração funcional.
2. Confira o Python configurado em `.vscode/settings.json`:
   `/home/codespace/.venvs/sicard-app/bin/python`. Ele precisa das dependências
   de `requirements.txt`, com os bindings GDAL compatíveis com a biblioteca
   nativa. Um interpretador já preparado pode ser indicado por `SICARD_PYTHON`.
3. Mantenha a ponte Windows → Codespace ativa e confira o túnel do banco,
   conforme [Banco no Codespace](documentacao/BANCO_CODESPACE.md).
4. Confira o storage remoto conforme
   [Storage no Codespace](documentacao/STORAGE_CODESPACE.md).
5. Na raiz do repositório, execute:

```bash
bash scripts/start-dev-codespace.sh
```

O script lê `.env`, inicia/reutiliza o supervisor do túnel, verifica o banco
com `SELECT 1` e inicia FastAPI em `127.0.0.1:8083`. No VS Code, a tarefa
**SICARD: Iniciar ambiente de desenvolvimento** executa esse mesmo script.
Na aba **Ports**, abra a porta **8083**, mantida privada, e navegue para
`/restrict/geoespacial/extracao-atributos/`.

- Saúde do processo: `http://127.0.0.1:8083/api/health`.
- Integrações: `http://127.0.0.1:8083/api/health/ready`.
- Contratos: `http://127.0.0.1:8083/docs`.

`/health` sozinho não comprova acesso ao banco ou às camadas. A leitura de
uma camada real deve ser verificada separadamente. A extensão de prévia usa
`sicardPreview.baseUrl`, configurado neste workspace para a porta 8083.

### Ponte e túneis

```text
Codespace:10022 → ponte mantida pelo Windows → VM:22 (SSH)
Codespace:15433 → SSH autenticado pela ponte → VM:5433 (PostgreSQL)
Codespace → HTTPS /sicard/storage-api/ → SFTPGo → montagem FUSE local
Navegador → porta encaminhada 8083 → FastAPI no Codespace
```

A extensão `tools/vscode-sicard-tunnel` roda no **VS Code do Windows** e
mantém a ponte 10022. O supervisor `scripts/start-database-tunnel.sh` roda
no **Codespace** e mantém 15433. As portas 10022 e 15433 são privadas e não
devem ser publicadas. O storage usa HTTPS e independe da ponte SSH.

O `postCreateCommand` prepara PowerShell/tmux; o `postStartCommand` chama
`scripts/start-storage-codespace.sh`. A existência desses comandos no
repositório não comprova que foram executados na sessão atual. Antes de
instalar algo, confira interpretadores, executáveis, `/dev/fuse` e montagens.
Não confunda limitações do ambiente do agente com o estado do Codespace inteiro.

### Desenvolvimento no Windows

No Windows, `scripts/start-dev.ps1` usa o ambiente Python local, verifica
banco/migrations e inicia a aplicação na porta 8080 por padrão. Esse fluxo é
separado do script Linux acima. O Docker local é apenas contingência.
O terminal compartilhado é descrito em
[PowerShell compartilhado](documentacao/TERMINAL_POWERSHELL_COMPARTILHADO.md).

## Configuração

Copie `.env.example` para `.env` e configure principalmente:

```dotenv
PORT=8080
SLT_USE_SIGMA_POSTGRES=true
SLT_SESSION_SECRET=
SIGMA_API_BASE=https://56.125.163.194
SIGMA_POSTGRES_PASSWORD=
```

O banco principal do SICARD está no mesmo PostgreSQL gerenciado do SIGMA:

| Item | Valor |
|---|---|
| Servidor | `56.125.163.194` |
| Porta | `5433` |
| Banco | `slt_db` |
| Gerenciador | container `sigma_pli_db` |

O `docker-compose.yml` local permanece apenas como contingência/rollback e não
é iniciado pelo `start-dev.ps1` quando `SLT_USE_SIGMA_POSTGRES=true`.

## Padrão de rotas

- APIs usam o prefixo `/api`.
- Páginas públicas usam `/public/`.
- Páginas operacionais usam `/restrict/`.
- URLs canônicas de páginas terminam em `/` e não contêm `.html`.
- Rotas antigas conhecidas redirecionam com status `308`, preservando a query.
- Arquivos estáticos são montados sob os mesmos blocos, mas não constituem URLs
  canônicas de navegação.

Rotas públicas principais:

| Rota | Uso |
|---|---|
| `/public/` | Entrada geral |
| `/public/cadastro/` | Cadastro de demandas |
| `/public/painel/` | Acompanhamento publicado |
| `/public/transparencia/` | Transparência e resultados |
| `/public/documentacao/` | Documentação funcional |
| `/public/login/` | Entrada da área restrita |
| `/public/ahp/colaborativa/` | Resposta a convite AHP por token |
| `/public/analise-multicriterio/{token}/` | Formulário do especialista por token |

Rotas restritas principais:

| Rota | Uso |
|---|---|
| `/restrict/` | Entrada interna |
| `/restrict/painel/` | Painel administrativo |
| `/restrict/demandas/` | Análise das demandas |
| `/restrict/hierarquizacao/` | Árvore metodológica |
| `/restrict/hierarquizacao/processos/` | Gestão das rodadas |
| `/restrict/hierarquizacao/ranking/` | Resultados e ranking das demandas |
| `/restrict/analise-multicriterio/` | Central de julgamentos e respostas |
| `/restrict/ahp/` | Configuração multicritério |
| `/restrict/geoespacial/` | Ferramentas e produtos espaciais |

As páginas do `/restrict/` exibem uma navbar por bloco, declarada em
`templates/componentes/navbar_modulo/`. Os blocos são MOCAD (cadastro e
demandas), MAD (hierarquização e julgamentos), geoprocessamento, AHP,
resultados e administração.

## Módulos implementados

### Demandas

Plano, programa e projeto são persistidos no esquema único `demandas`. A mesma
linha avança do cadastro à execução. Estão disponíveis criação, consulta,
atualização, exclusão, análise e aprovação. A matriz de transições é mantida no
banco e consultada pelo backend.

Famílias: `/api/demandas`, `/api/planos`, `/api/programas`, `/api/dominios` e
`/api/painel`.

### AHP

O módulo permite configurações avulsas e de portfólio, definição de universo,
critérios e premissas, comparação pareada, cálculo de pesos e consistência e
homologação. A comparação colaborativa cria convites com prazo e token público,
recebe as matrizes individuais e registra suas métricas.

Famílias: `/api/ahp/objetos`, `/api/ahp/universo`,
`/api/ahp/configuracoes` e `/api/ahp/comparacao-colaborativa`.

### Hierarquização

As rodadas persistem o universo e os resultados em um documento autocontido.
O fluxo metodológico possui:

1. elegibilidade territorial por risco e restrição;
2. favorabilidade territorial;
3. ajuste fino por atributos dos projetos;
4. síntese, ranking e homologação.

Família: `/api/ahp/hierarquizacoes`.

### Geoprocessamento

Inclui importação e catálogo de camadas, visualização vetorial e raster,
operações individuais, jobs, funções, fluxos e homologação. O armazenamento
físico separa camadas importadas, processadas e homologadas. Apenas snapshots
homologados formam a biblioteca oficial consumida pelas fases.

Família: `/api/geoespacial`.

Os endpoints genéricos `/api/geoespacial/processar` e
`/api/geoespacial/processamento/{id}` ainda são demonstrativos. Os endpoints de
algoritmos, operações e jobs executam o fluxo efetivo usado pelas telas.

## Modelo de dados vigente

| Esquema | Responsabilidade |
|---|---|
| `demandas` | Planos, programas, projetos, indicadores, tipos e status |
| `ahp` | Objetos, configurações e comparação colaborativa |
| `hierarquizacao_demandas` | Rodadas, fases e rankings |
| `geo` | Regionalizações e unidades espaciais |
| `geoprocessamento` | Catálogo, feições, rasters, execuções e homologações |
| `auditoria` | Trilha de operações |

Referências a `cadastro.cadastro_demanda` e `demandas_aprovadas` pertencem ao
modelo histórico das migrations. A migration `015_colapso_demandas.sql`
consolidou o modelo atual no esquema `demandas`.

## Autorização

Os perfis são derivados do usuário SIGMA:

- `VISUALIZADOR`: consulta autorizada;
- `OPERADOR`: operações de cadastro e processamento;
- `ANALISTA`: análise e aprovação;
- `GESTOR`: análise, homologação e supervisão;
- `ADMIN`: administração técnica, sem herdar automaticamente decisões de
  analista ou gestor.

As permissões efetivas são aplicadas no backend por dependências de rota.

## Dados de referência

| Arquivo | Uso |
|---|---|
| `config/catalogo-slt.json` | Diretorias, planos, frentes e eixos |
| `config/referencia-classificacao.json` | Apoio à classificação PLI/PEF |
| `config/referencia-institucional.json` | Conteúdo institucional |
| `config/matriz-criterios-premissas.json` | Critérios e premissas AHP |

Scripts de manutenção:

```powershell
python scripts/gerar_catalogo_slt.py
python scripts/export_catalogo.py
python scripts/load_geo_catalog.py
```

## Branch única e deploy

O repositório trabalha com uma única branch: `main`, que espelha o que está em
produção. Não há branches de trabalho paralelas.

Produção roda em `https://56.125.163.194/sicard/`, no container `sicard_app`,
na mesma VM do SIGMA, publicada como sub-rota do Nginx dele
(`.deploy/nginx/sicard-subpath.conf`). O clone fica em `/opt/sicard`, também
com checkout em `main`.

Antes da publicação, execute os testes relevantes, revise `git diff` e
selecione os arquivos do commit. Nunca inclua `.env`, chaves, permissões
privadas de agentes ou dados/relatórios alterados sem validação de integridade.
`main` só corresponde à versão publicada depois de confirmar o SHA na VM.

No Codespace, com a ponte Windows ativa e Plink disponível:

```bash
git add <arquivos-revisados>
bash scripts/deploy-codespace.sh "descricao da alteracao"
```

O script exige `main`, commita **somente o índice revisado**, verifica que o
remoto não está adiante, faz push e usa a ponte para executar
`.deploy/update_vm.sh main` na VM. Se não houver arquivos no índice, publica
o commit atual. Alterações fora do índice permanecem locais.

No Windows, o fluxo existente é:

```powershell
.\scripts\deploy-vm.ps1 -Mensagem "descricao da alteracao"
```

Esse script Windows usa Plink/PPK locais e inclui todas as alterações pelo
`git add -A`; só o utilize depois de revisar integralmente a árvore de trabalho.
Ele não é o comando de inicialização do Codespace.

Ambos convergem em `.deploy/update_vm.sh`: sincronização de `origin/main`,
build, reinício de `sicard_app` e verificações HTTP. A implantação usa
`docker-compose.vm.yml`, um worker, porta interna 8080 e publicação local
na VM em 8070, acessível pelo Nginx em `/sicard/`. Volumes persistem uploads,
configurações e saídas; o storage bruto é montado para leitura.

O fluxo não usa push forçado. Branch alternativa exige autorização explícita
nos scripts Windows/VM; o script do Codespace aceita somente `main`.
Confira o SHA final e `/api/health/ready`, além da página alterada. Falha
após o push significa que GitHub e produção podem estar em versões diferentes;
não anuncie deploy concluído sem verificar a VM.

O build usa `--pull` e dependências com faixas de versão. Registre falhas de
build/integração; não substitua dados ou aplique migrations automaticamente
para contornar uma falha. Deploy requer autorização do usuário; iniciar o
servidor local não autoriza publicação.

## Testes

No Codespace, use o mesmo interpretador do servidor. Para a extração:

```bash
/home/codespace/.venvs/sicard-app/bin/python -m pytest tests/test_compatibilidade_espacial.py tests/test_extracao_estatisticas.py tests/test_extracao_enriquecimento.py tests/test_extracao_contratos.py -q
SICARD_TEST_URL=http://127.0.0.1:8083 node tests/browser/extracao-atributos.cjs
```

O teste de navegador exige Playwright/Chromium instalados. Ele intercepta as
APIs para não persistir resultados. Alguns testes de configurações consultam
o catálogo oficial e gravam somente em diretórios temporários. Outros testes
da suíte geral escrevem no banco: revise-os antes de apontar ao banco compartilhado.
Os testes `previa-bancada.cjs` e `lista-bases-preparacao.cjs` usam a porta 8083.

No Windows:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

A suíte cobre autenticação e perfis, painéis, política de caminhos, parte do
motor geoespacial e o registro das famílias de rotas e páginas canônicas.

## Regra de cores de status

A fonte única é `assets/js/status-colors.js`. Não duplique cores de status em
HTML, CSS ou JavaScript de módulo. Novos status exigem atualização do domínio no
banco, de `STATUS_DEMANDA`, de `LEGEND_ORDER` e, quando aplicável, dos rótulos
tipados do backend.
