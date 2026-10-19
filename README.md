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
Para liberar a porta ocupada e iniciar novamente, use **Terminal → Run Task →
SICARD: Limpar porta e reiniciar servidor local**, ou execute
`bash scripts/restart-dev-codespace.sh`. Pelo VS Code Desktop Windows, a tarefa usa a extensão
SICARD 0.3.0 para verificar e recuperar a ponte SSH antes de executar o script.
Atualize o VSIX conforme [estas instruções](tools/vscode-sicard-tunnel/README.md).
O script verifica a ponte e reinicia o túnel do banco se a consulta de conexão falhar;
a execução direta pelo terminal não inicia processos no Windows. Depois aguarda a conexão com o banco por até 90 segundos
(ajustável por `SICARD_DB_WAIT_SECONDS`, de 5 a 300). Se a conexão falhar,
mantém o servidor existente. Após validar o banco, encerra os processos em escuta
na porta 8083 (ou `SICARD_DEV_PORT`), tenta desligamento gracioso por 10 segundos
e força a saída se necessário. Depois usa o startup acima. O servidor permanece
no terminal da tarefa; `Ctrl+C` o encerra. Para repetir uma tarefa que já está
rodando, use **Tasks: Restart Running Task**.
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

No Windows, a tarefa **SICARD: Iniciar servidor local** usa o ambiente Python
local e acessa os bancos oficiais pelo gateway TLS da porta 443, sem túnel SSH.
A página inicial é aberta no Microsoft Edge, usando o perfil atual, após a
verificação de prontidão do servidor; uma instância local saudável já existente
é reutilizada. Se o Edge não for encontrado, a tarefa informa o endereço para
abertura manual, sem recorrer a outro navegador.
A VM não usa esse gateway. O Docker local é apenas contingência.
O storage existente é acessado pela API do SFTPGo no Windows; não se exige
montagem local para iniciar o backend ou descobrir os testes. Caminhos nativos
de dados e temporários continuam restritos ao storage configurado na VM:
não há fallback para pastas locais. Sem montagem, a persistência de resultados
e as exportações vetoriais, raster e JSON usam buffers em RAM e a API do
SFTPGo. Arquivos de trabalho são enviados a subpastas exclusivas de
`temporarios-sicard`, conferidos por hash e removidos ao terminar; resultados
são gravados em `saidas-geoespaciais`. A OP-03 e o overlay não exigem montagem
no Windows. Fluxos legados que ainda exigem caminhos nativos continuam restritos
à VM; essa adaptação não equivale à homologação de todas as funções.
O catálogo de projeto da bancada também funciona sem montagem: mantém mapas,
toolboxes, banco, conexões e a pasta de código `geoespacial`; a pasta nativa
`data/geoespacial` só é listada quando há montagem configurada e ela existe.
O acesso remoto ao acervo permanece nas APIs de storage, sem cópia local.
As prévias vetoriais do acervo usadas na extração de atributos e na elegibilidade
também funcionam sem montagem: as geometrias são serializadas em RAM e enviadas
para `temporarios-sicard/extracao-atributos/previas`, isoladas por usuário e
conferidas por hash. Os tiles leem essa cópia pelo storage; a prévia expira
após 24 horas e os arquivos vencidos do usuário são removidos na próxima preparação.
Os arquivos originais não são alterados. Isso não muda a exigência de montagem
dos fluxos legados de upload local que mantêm cópias consultáveis de atributos.
Na seção **3 — Confira a prévia** da elegibilidade territorial v2, a estrutura
fixa é renderizada em HTML: grupos de entrada e base, estados vazios e a ficha
de informações. Templates HTML definem subgrupos, linhas de camadas e botões
do mapa. O JavaScript apenas instancia os itens dinâmicos, preenche valores e
controla visibilidade, seleção e mapa. Os mesmos parciais são usados na extração
de atributos; a metodologia e as regras de validação não são alteradas.
A elegibilidade v2 acompanha os envios à prévia e à bancada pelo feedback
padronizado, com etapas, camada corrente, cancelamento e resultado explícito.
No envio confirmado à bancada, as demandas de entrada reutilizam a normalização
cadastral: ponto/multiponto com raio de 50 m; linha/multilinha com 25 m por lado,
em EPSG:5880, com 32 segmentos por quadrante e saída poligonal em EPSG:4674.
O GeoPackage derivado integral é conferido e registrado no ciclo de vida das
saídas; suas referências reais alimentam os geoprocessos. As fontes e as
geometrias das bases de risco/restrição não são alteradas. A prévia continua
mostrando as fontes originais.
Coleções geométricas, inclusive aninhadas, são convertidas por componente e
reunidas na mesma demanda, preservando pontos, linhas, atributos e identificadores
de origem. A auditoria e o feedback registram os componentes tratados; componentes
vazios ou não suportados interrompem o envio com indicação da feição, FID e posição.
A rota legada `/data` responde 503 quando
não há acesso nativo configurado; as APIs remotas não dependem dessa rota.
Os JSONs e mapas da documentação de favorabilidade são lidos do storage
existente (`aplicacao/data/geoespacial`), pela montagem da VM ou pela API
remota no Windows. As duas pastas de mapas são acessíveis na rota pública
`/data` também sem montagem, sem criar cópia local.
Os testes que processam arquivos sintéticos solicitam explicitamente a fixture
`storage_sintetico`: ela simula o storage apenas durante cada teste e remove os
arquivos ao terminar. Não monta nem copia o storage real para o Windows; testes
da política de armazenamento e de acesso remoto não usam essa simulação.
O terminal compartilhado é descrito em
[PowerShell compartilhado](documentacao/TERMINAL_POWERSHELL_COMPARTILHADO.md).

### Destino das saídas da bancada geoespacial

O botão **Atualizar**, à direita de **Ordem de desenho**, e **Atualizar mapa**,
abaixo de **Ajustar às camadas**, recarregam as camadas abertas e os mapas-base,
inclusive camadas ocultas ou fora do filtro de pesquisa. Não adicionam recursos
do catálogo nem alteram o enquadramento, a camada ativa ou a visibilidade.
Arquivos nativos são relidos; camadas do catálogo recarregam metadados e a
representação publicada, sem reimportar ou gravar a fonte. Edições pendentes
impedem a atualização, e falhas são identificadas por camada.
Na aba **Camadas por fonte**, as linhas exibem o caminho relativo do arquivo,
com `::camada` para camadas internas do storage. Recursos sem arquivo usam
`banco/<id>` ou `memoria/<id>`; serviços remotos exibem a URL de origem.
A pesquisa nessa aba também considera o caminho.

Na execução, referências de arquivo incluem caminho e revisão; camadas abertas
do catálogo sem arquivo associado são enviadas apenas pelos identificadores dos
parâmetros, para resolução pelo motor. Entradas mistas preservam essa distinção.
Referências de arquivo incompletas são recusadas antes do envio ao servidor.

A seleção por atributo na tabela mantém os registros selecionados ao atualizar
o filtro visual e ao alternar **Somente selecionados**, sem interpretar a limpeza
interna da grade como desseleção no mapa. Em arquivos nativos com paginação,
a consulta da tabela considera a página atual, conforme indicado no formulário;
a seleção por expressão da faixa superior consulta a camada no servidor.
A camada ativa da tabela é respeitada pelos comandos da faixa, mesmo quando
uma linha anterior do painel de conteúdo ainda mantém o destaque visual.
Na ferramenta **Selecionar**, o clique no mapa seleciona a linha correspondente
na tabela, abre a página correta e leva a linha à área visível, sem recriar uma
tabela já aberta. A seleção na tabela destaca a mesma feição no mapa; Shift
permite acumular seleções no mapa. Em arquivos paginados, a localização usa o
FID original e a revisão do arquivo, sem confundir FID com número de linha.
Em memória, a posição da feição distingue registros com atributos iguais e
sem ID. Respostas de geometria atrasadas não substituem uma seleção mais
recente. Filtros existentes são preservados; se ocultarem a linha, a tabela
informa a situação. **Explorar** continua identificando sem alterar a seleção.
Quando uma camada chega apenas como prévia sem FID, a seleção primeiro troca
a representação pelos tiles do arquivo original e refaz a consulta no ponto
clicado, sem deduzir a identidade pela geometria simplificada.
A tabela de atributos maximizada pode ser reposicionada ao segurar e arrastar
o cabeçalho. O arraste mantém o tamanho, os dados e a seleção e deixa uma área
do cabeçalho acessível dentro da bancada, inclusive após redimensionar a janela.
**Restaurar painel** ou **Esc** devolvem a tabela ao painel lateral; uma nova
maximização começa na posição padrão. A mesma interação funciona na bancada
incorporada às páginas de hierarquização.

O feedback de processamento aparece em uma faixa compacta no rodapé do painel
contextual, com nome da ferramenta, progresso, estado, duração e cancelamento
quando disponível. **Exibir detalhes** abre as mensagens em um painel claro.
O controle de cancelamento é um círculo com quadrado preenchido, à esquerda
da barra azul fina e na mesma linha, sem substituir o progresso real do processo.
O processamento não abre automaticamente um terminal sobre o mapa.
Avisos, falhas e cancelamentos têm estados distintos. A estrutura segue o
[padrão público de feedback do ArcGIS Pro](https://pro.arcgis.com/en/pro-app/latest/help/analysis/geoprocessing/basics/run-geoprocessing-tools.htm),
sem utilizar assets da Esri.
Na seleção de GeoPackages, o campo de entrada lista as camadas internas em vez
do nome do arquivo. A importação segue essa ordem, mostrando o nome e a posição
de cada camada, sua conclusão e o progresso do lote; falhas parciais são indicadas
como avisos, sem ocultar as mensagens individuais.
A confirmação do explorador identifica as camadas antes de fechar o modal:
o campo já retorna preenchido, sem executar a importação. O acompanhamento
fica exclusivamente no rodapé, sem resumo duplicado junto aos parâmetros.
A barra permanece azul em execução, vermelha na falha e verde após sucesso.

O botão de procurar camadas do sistema abre o explorador imediatamente, sem
aguardar o catálogo completo do banco e do storage. As pastas são consultadas
com a janela já aberta; o catálogo só é carregado ao acessar **Camadas
cadastradas no banco** e é reutilizado durante a mesma seleção. A navegação
pelo storage não exige essa consulta prévia.
No formulário **Carregar do sistema**, **Confirmar** apenas devolve a seleção,
sem ler ou inventariar o GeoPackage. O inventário das camadas internas ocorre
uma vez por arquivo ao acionar **Carregar camada**. A confirmação das bases e
entradas na extração mantém seu fluxo de inventário e validação.

Na legenda da bancada compartilhada, linhas usam `layer-symbol line`,
polígonos usam `layer-symbol poligon` e pontos circulares usam
`layer-symbol point`. Os títulos identificam o tipo vetorial em português,
inclusive nas legendas categorizadas e graduadas.
O polígono é representado por um retângulo horizontal de cantos arredondados; o ponto circular
mantém formato redondo também dentro da lista de camadas.
Camadas vetoriais sem cor ou simbologia prévia recebem cores distintas,
independentemente do tipo de geometria ou nome. A atribuição evita as cores
já salvas e é mantida no navegador por identificador da camada. Simbologias
existentes, inclusive classificações e representação por status, são preservadas.
Quando o arquivo declara geometria genérica (`Unknown (any)`/GeoPackage
`GEOMETRY`), o inventário e a abertura identificam os tipos pelas feições,
incluindo os componentes de coleções, priorizando a maior dimensão geométrica
para o símbolo. O símbolo não é inferido pelo nome
do arquivo ou da camada.

O campo **Destino** dos algoritmos e das propriedades do modelador abre o
explorador de `saidas-geoespaciais` no storage existente. É possível navegar,
criar subpastas, informar o nome da saída e escolher o formato compatível:
GeoPackage, GeoJSON ou Shapefile para vetores; GeoTIFF para rasters; JSON para
diagnósticos e tabelas. Cancelar o explorador preserva a configuração anterior.
No painel, apenas o campo **Destino** e o ícone de pasta são exibidos; nome e
formato são definidos exclusivamente no explorador, sem campos duplicados.

A pasta escolhida é transmitida como `pasta_saida` e respeitada pelo servidor.
As exportações conservam o nome informado (com a extensão do formato escolhido),
incluindo os acompanhantes de Shapefile. Nome já existente é recusado; gravações
simultâneas na mesma pasta são recusadas pelo bloqueio de sessão do banco,
sem sobrescrita silenciosa entre execuções da aplicação. O catálogo registra
caminhos, componentes, hashes e execução; o conteúdo permanece no storage.
O arquivo canônico interno de cada resultado continua associado à execução,
independentemente da exportação escolhida. Chamadores legados sem `pasta_saida`
mantêm o destino canônico anterior. Não é necessária migração de schema.

As edições do arquivo original também usam bloqueio de sessão PostgreSQL,
pela identidade do arquivo, compartilhado entre edição completa, atributos
incrementais e geometria. Outra gravação concorrente é recusada antes de
substituir o original; a revisão continua sendo conferida. O bloqueio protege
processos da aplicação, não escritores externos ao SICARD. Sem banco disponível,
a edição não prossegue sem proteção.

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

Se a ponte padrão estiver travada, o helper e o deploy aceitam
`SICARD_SSH_PORT=10023`, após abrir essa ponte pelo Windows. Consulte a seção
de recuperação em [Banco no Codespace](documentacao/BANCO_CODESPACE.md).

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
Na tarefa de deploy do VS Code, a leitura de `docker logs` é apenas diagnóstica:
se o driver não permitir consultá-los, um aviso é emitido e as verificações
obrigatórias do contêiner e de `/api/health/ready` continuam normalmente.

O build usa `--pull` e dependências com faixas de versão. Registre falhas de
build/integração; não substitua dados ou aplique migrations automaticamente
para contornar uma falha. Deploy requer autorização do usuário; iniciar o
servidor local não autoriza publicação.

### Correção do contrato de exportação do seed geoespacial

A migração `136_corrigir_contrato_exportacao_seed.sql` corrige os parâmetros de
OP-26 na função `funcao_fase2_normalizar_exportar`. Ela modifica somente o
contrato original conhecido, sem sobrescrever modelos personalizados.
No Windows, a aplicação direcionada é:

```powershell
.\scripts\apply-database.ps1 -OnlyMigration 136_corrigir_contrato_exportacao_seed.sql
```

O aplicador prioriza `SLT_DATABASE_URL` quando configurada, inclusive para o
gateway TLS, sem exigir Docker local. Em 16/10/2026, a migração foi aplicada ao
banco oficial `slt_db`; nova conexão confirmou o contrato persistido e sua
reaplicação retornou `UPDATE 0`, sem alterar definições ou datas dos modelos.
Essa atualização de banco não equivale à publicação do código da aplicação
nem à aprovação dos testes ponta a ponta da bancada.

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
