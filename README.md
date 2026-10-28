# SICARD — Sistema Inteligente de Cadastro e Ranking de Demandas

Aplicação web de apoio à decisão para cadastrar, analisar, hierarquizar e
acompanhar planos, programas e projetos. O sistema combina análise multicritério
AHP, processamento geoespacial e trilha de auditoria.

O inventário detalhado do que está implementado está em
[`documentacao/STATUS_IMPLEMENTACAO.md`](documentacao/STATUS_IMPLEMENTACAO.md).
Os nomes oficiais de módulos, fases e objetos estão em
[`documentacao/geral/TERMINOLOGIA.md`](documentacao/geral/TERMINOLOGIA.md).
A apresentação integrada está em `/public/documentacao/visao-geral/`.

O menu **Mapa do site**, na navegação pública, reúne os acessos dos cards da
área restrita e suas páginas vinculadas, preservando grupos, subgrupos e nomes.
A página `/public/mapa-do-site/` apresenta também as rotas e os padrões de
endereços que exigem identificador ou token. O inventário compartilhado fica em
[`templates/componentes/mapa_site.html`](templates/componentes/mapa_site.html).
Os links do menu e da lista abrem em outra aba e não concedem permissões de acesso.

O formulário público em
`/public/analise-multicriterio/formulario-comparacao-pareada/` é o mesmo
formulário enviado ao colaborador, em modo de modelo: não exige código de acesso
e não envia nem grava respostas. Seus critérios vêm do domínio
`dominios.criterio`, vinculados às dimensões de
`dominios.categoria_extracao_atributos` cujo `grupo_conceitual` é `PLI`
(migration `148_dimensoes_criterios_pli.sql`). Correspondem aos 17 indicadores
de `documentacao/fundamentacao/PLI_Fig_Estrutura_Criterios_v6.pptx`, apresentados
como critérios e sem os códigos de identificação do arquivo. As dimensões do PLI
não aparecem nas categorias da extração de atributos. Julgamentos reais
continuam acessíveis exclusivamente pelos respectivos convites.

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

### Email do SICARD

O SICARD pode usar a mesma conta SMTP autorizada do SIGMA, mas executa o envio
diretamente: não chama os endpoints de email do SIGMA, não altera seu código
nem escreve em seu banco. As cotas e a reputação do remetente são compartilhadas.
Esta integração não dispara mensagens automaticamente ao cadastrar demandas,
concluir processos ou executar outros fluxos.

Todos os endpoints abaixo pertencem ao SICARD e exigem sessão válida de
**Gestor ou Admin**, por cookie ou Bearer. Em produção, acrescente `/sicard`
antes de `/api`.

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/email/diagnostico` | Verifica a configuração, sem conectar nem enviar; não revela senha ou usuário SMTP |
| POST | `/api/email/teste-conexao` | Verifica TLS, autenticação e resposta SMTP, sem enviar mensagem |
| POST | `/api/email/teste` | Envia uma mensagem de teste a um único `destinatario` informado no JSON |
| POST | `/api/email/enviar` | Envia assunto e conteúdo definidos pelo solicitante autorizado |

Contrato de envio:

```json
{
  "destinatario": "pessoa@example.com",
  "assunto": "Atualização da demanda",
  "texto": "Há uma atualização disponível no SICARD.",
  "html": "<p>Há uma atualização disponível no SICARD.</p>"
}
```

`html` é opcional; `texto` é obrigatório e usado como alternativa de leitura.
Cada requisição aceita **um destinatário**, assunto de até 200 caracteres,
texto de até 50.000 e HTML de até 100.000. Não aceita anexos, CC, BCC, troca de
remetente ou credenciais no corpo. Não é um serviço de envio em massa.
O remetente exibe o nome **SICARD** e usa o endereço autorizado da configuração.
O retorno `aceito_smtp` inclui `id_mensagem` para correlação, mas **não comprova
entrega à caixa de entrada**. Não há rastreamento de leitura ou de devoluções.

Para ativar, preencha no `.env` privado do SICARD as variáveis de email
documentadas em `.env.example`, preservando as demais configurações:

- `SICARD_EMAIL_ENABLED=true`;
- `SICARD_SMTP_HOST`, `SICARD_SMTP_PORT`, `SICARD_SMTP_USER` e
  `SICARD_SMTP_PASSWORD` com a conta autorizada (para Gmail, senha de aplicativo);
- `SICARD_SMTP_SECURITY=starttls` (normalmente porta 587) ou `ssl` (normalmente
  porta 465). Não existe modo sem TLS e a validação do certificado é obrigatória;
- `SICARD_EMAIL_FROM` com o endereço autorizado para envio e, opcionalmente,
  `SICARD_EMAIL_REPLY_TO` para respostas;
- `SICARD_SMTP_TIMEOUT` entre 1 e 60 segundos (padrão 30).

O Compose já carrega o `.env` do SICARD; alterações no ambiente de produção
precisam ser aplicadas pelo procedimento de implantação autorizado. Não montar
o `.env` inteiro do SIGMA nem versionar credenciais. O envio fica desativado por
padrão. Primeiro consulte o diagnóstico, depois teste a conexão e só então faça
um envio autorizado. O diagnóstico configurado não substitui esses testes.

Configuração ausente e falhas de conexão retornam HTTP 503; recusas SMTP,
autenticação e incompatibilidades retornam 502. Interrupção durante a transmissão
retorna 504 com resultado indeterminado: a mensagem pode já ter sido aceita.
**Não há repetição automática**, para evitar duplicatas. As falhas trazem
`detail` em português e o código no cabeçalho `X-SICARD-Email-Error`.
Os logs registram usuário, identificador da mensagem e tipo de falha, sem senha,
corpo, destinatário ou resposta bruta do provedor.

#### Convites da Central de julgamentos

A seção **Mensagem de email** envia a mensagem exibida pelo botão **Enviar
e-mail**, individualmente para os colaboradores salvos do julgamento. Exige
perfil Analista, Gestor ou Admin, julgamento aberto, prazo vigente e versão
atual do cadastro. Durante edição o envio fica bloqueado: primeiro salve as
alterações. O envio usa o texto completo exibido e acrescenta, no servidor, o
token de acesso de seis dígitos e suas instruções, sem abrir um aplicativo externo.
O convite aceita o caminho atual `/public/analise-multicriterio/formulario-comparacao-pareada/{token}/`
e o caminho legado `/public/analise-multicriterio/{token}/`, inclusive sob o
prefixo `/sicard`. Ambos permitem habilitar o envio quando os demais requisitos
do julgamento estiverem atendidos.

Aplicar `database/137_email_convites_colaborativos.sql` e
`database/138_token_acesso_julgamento.sql` antes de usar este fluxo.
Os endpoints, todos no SICARD, são:

- `GET /api/ahp/comparacao-colaborativa/ambientes/{id}/emails`: histórico;
- `POST .../{id}/emails/enviar`: `destinatario`, `texto` e `versao` (valor de
  `atualizadoEm` do julgamento); envia um convite salvo por requisição;
- `POST .../{id}/emails/confirmacoes`: coleta os retornos por IMAP e atualiza o
  histórico, sem reenviar mensagens.

O código é único por julgamento (compartilhado pelos convidados), gerado por
fonte criptográfica e gravado em `ahp.comparacao_colaborativa_ambiente.token_acesso`.
Zeros iniciais são preservados. O código não muda nos reenvios ou nas edições;
é válido enquanto o julgamento estiver aberto e dentro do prazo. E-mails
removidos da lista de convidados perdem o acesso, mesmo conhecendo o código.
O token do link público continua distinto desse código de seis dígitos.

No formulário público, nome e instituição identificam a resposta; a autorização
é feita pelo par **e-mail convidado + token de acesso**, no servidor:
`POST /api/ahp/comparacao-colaborativa/publico/{token}/acesso`.
O corpo contém `email` e `token_acesso`; os endpoints de início, progresso e envio
também exigem `token_acesso`, além dos seus campos anteriores. O GET público
retorna apenas contexto, sem critérios ou autorização por e-mail. O código
não é devolvido pelas respostas das APIs de julgamentos nem incluído em URLs
ou armazenamento local do navegador.

A contextualização pública preserva o objetivo informado ou, quando ausente,
descreve a hierarquização de planos, programas ou projetos conforme o tipo
cadastrado. O prazo usa `dd/mm/aaaa, hh:mm:ss`, em horário de Brasília.
O nome da rodada aparece como “Hierarquização”, separado do “Escopo do
formulário”: texto explicativo visível antes da identificação, com finalidade,
método AHP e escala de Saaty, seis passos de participação, interpretação da RC
e uso posterior das respostas na consolidação e homologação. Esse conteúdo
descreve o fluxo existente, sem alterar regras de cálculo ou de autorização.
A identificação distribui nome/instituição e e-mail/token em duas linhas de
duas colunas, com uma coluna em telas de até 600 px.
A apresentação do formulário público segue a escala tipográfica da Fase 3:
dados de contexto em 12 px, instruções e ajuda em 11,5 px, rótulos em 12,7 px
e títulos de seção em 13,3 px. O espaçamento entre blocos é de 1,25 rem e
entre campos de 1 rem, sem acumular margens com o `gap` dos contêineres.

No formulário colaborativo, λmax, IC e RC são recalculados localmente após um
segundo sem novos ajustes da barra, agrupando movimentos consecutivos em um
único cálculo, sem depender da rede ou do salvamento automático. Durante essa
espera, o envio fica bloqueado para não utilizar indicadores desatualizados.
O card de RC permanece neutro em zero, fica verde
quando `0 < RC < 0,10` e vermelho quando `RC >= 0,10`. Cada ajuste da escala
reinicia uma espera de três segundos; sem novos ajustes, o par e seu bloco de
valor inverso recebem confirmação visual verde. Movimentos posteriores
reabrem a edição normalmente, inclusive por teclado e toque. Essa indicação
não altera o cálculo AHP nem substitui o envio final. O salvamento do progresso
tem mensagem própria, preserva estatísticas de retomada e é concluído em ordem
antes do envio final, evitando gravações concorrentes fora de sequência.

Julgamentos antigos permanecem sem código até o primeiro envio de convite após
a migração; o envio gera e persiste o código de forma atômica, sem alterar as
respostas existentes. Convites antigos precisam ser reenviados explicitamente
para que seus destinatários recebam o código; não há envio automático.
Por decisão operacional, não há bloqueio por quantidade de tentativas erradas:
o código curto fica mais exposto à adivinhação automatizada.

O registro é reservado no PostgreSQL **antes** do SMTP, com exclusividade por
julgamento, destinatário e hash do conteúdo. Repetições idênticas já aceitas ou
sem resultado final não são reenviadas, mesmo após recarga da página ou chamadas
concorrentes. Falhas comprovadas podem ser tentadas novamente por ação explícita.
Se o processo parar após a reserva, o resultado permanece sem confirmação e
exige consulta/revisão; não há reenvio automático. O corpo não é armazenado no
histórico; ficam hash, destinatário, Message-ID, usuário e estados do transporte.

O SICARD solicita confirmação de leitura via `Disposition-Notification-To`.
Solicita DSN de sucesso, falha e atraso **somente se o servidor SMTP anunciar
suporte**. O Gmail da conta compartilhada não anunciou DSN no teste realizado:
a aceitação SMTP não é apresentada como entrega. Devoluções ainda podem chegar
à conta remetente. O aplicativo do destinatário pode ignorar ou recusar a
solicitação de leitura; ausência de confirmação não significa ausência de leitura.
Não há pixel de rastreamento, nem uso da abertura do formulário como prova de
leitura do email.

Para coletar os retornos, habilite `SICARD_EMAIL_IMAP_ENABLED=true`, configure
`SICARD_EMAIL_IMAP_HOST`, `SICARD_EMAIL_IMAP_PORT` (993) e
`SICARD_EMAIL_IMAP_FOLDER` (INBOX). Usa a mesma conta e senha SMTP; o provedor
precisa permitir IMAP. O botão **Atualizar confirmações** executa a coleta sob
demanda, inclusive de retornos recebidos enquanto a página estava fechada.
**Não existe coleta agendada em segundo plano.**

A consulta usa conexão TLS, seleção somente-leitura e `BODY.PEEK[]`: não marca
mensagens como lidas, não move e não exclui. Busca apenas mensagens
`multipart/report` contendo o Message-ID ou identificador de envelope de um
envio desse julgamento. A interpretação exige correlação exata e destinatário
compatível: DSN `delivered` confirma entrega, `failed` registra devolução,
`delayed` indica adiamento; `relayed`/`expanded` não comprovam entrega final.
MDN `displayed` registra a confirmação informada pelo aplicativo — não prova
que uma pessoa leu ou compreendeu o conteúdo. Respostas comuns não contam.
Relatórios repetidos não duplicam eventos. Retornos acima de 256 KiB ou mais de
100 retornos por envio interrompem a coleta com aviso, sem truncamento silencioso.
Os relatórios brutos e demais emails da conta não são armazenados.

### Tabelas do Explorador de camadas

O modo Detalhes do Explorador de camadas geoespaciais adota o padrão da tabela
administrativa de Status da Demanda: filtros por coluna e valor, inversão e
limpeza do filtro, linhas compactas, controles abaixo da tabela, paginação
centralizada e contador de selecionados, itens na página e total da pasta.
A contagem aparece somente no rodapé, sem uma linha de status acima da tabela.
São exibidos 15 registros por página inicialmente, com opções de 30, 50 e 100.
A seleção e as ações ocupam as duas primeiras colunas, fixas durante a rolagem
horizontal. A seleção de todas as linhas abrange somente a página atual e é
limpa ao mudar página, filtro, pesquisa, ordenação ou pasta. Os controles
permitem recarregar as camadas da tabela e consultar detalhes, visualizar no mapa ou baixar
uma camada selecionada; não incluem edição ou exclusão dos arquivos.
O botão Recarregar atualiza somente os dados da tabela, sem recarregar a página,
preservando pesquisa, filtros, ordenação, quantidade por página e rolagem.
A página atual é mantida quando ainda existir e a seleção é limpa após a atualização.
Se a consulta falhar, os dados anteriores permanecem visíveis com aviso de erro.
As colunas Geometria e Camada interna são preenchidas pelo inventário real dos
arquivos do Storage e Outputs. Arquivos multicamadas continuam em uma única
linha, com todos os tipos geométricos e nomes internos; o título das células
relaciona cada camada ao seu tipo. As colunas e suas opções de filtro são
ocultadas quando não se aplicam a nenhum item da pasta, independentemente da
página ou do filtro atual. Demandas usam o tipo geométrico cadastrado no PostGIS
e não têm camada interna; rasters simples não têm camada interna.
Arquivos `.json` válidos sem tipo GeoJSON são documentos auxiliares, sem
geometria ou camada interna e sem aviso de falha geoespacial. JSON inválido
continua sinalizado como erro; camadas GeoJSON em `.json` mantêm o inventário.
Falhas de leitura são sinalizadas na tabela e nas notificações padrão, sem
ocultar a coluna nem apresentar metadados não consultados como valores válidos.
Os modos Lista e Ícones e a navegação entre grupos permanecem disponíveis.

### Logins do SICARD Storage

Os logins `/sicard/storage/web/client/login` e
`/sicard/storage/web/admin/login` usam sempre o tema claro, independentemente
da preferência do navegador ou do tema salvo pelo usuário. Essa regra é
restrita aos dois logins e não altera o tema das áreas internas do SFTPGo.
Os nomes das áreas aparecem como subtítulos em caixa alta abaixo do logo e
também logo abaixo do título externo “SICARD Storage”, acima do card.
O acesso à gestão de dados usa detalhes azuis; a administração de acesso usa
vermelho escuro no subtítulo, nos controles, no contorno do card e no fundo.
As linhas e os elementos geométricos do fundo usam azul escuro na gestão de
dados e vermelho escuro na administração, preservando o fundo claro.
Ambos os logins têm um detalhe diagonal no canto superior esquerdo, em azul
na gestão de dados e vermelho escuro na administração.

A personalização está no template comum
`.deploy/storage/templates/common/base.html` e em
`.deploy/storage/static/sicard/cores.css`, montados pela composição própria
do Storage. A instância usa `/opt/sicard-storage`, fora do checkout da aplicação.
O deploy sincroniza explicitamente o template e o CSS com os arquivos montados
no container e o reinicia somente se houver alteração, sem modificar dados,
usuários, configuração ou credenciais. A validação exige que os dois logins
sirvam o template atualizado e que o CSS servido corresponda ao commit.

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
O gerador de camadas territoriais também usa esse fluxo no servidor local:
sem montagem, gera e reabre FGB, GeoPackage, Shapefile e GeoJSON em RAM,
preservando dicionário, aliases, relatório e tabelas CSV/XLSX/TXT do pacote.
Os arquivos de trabalho passam por `temporarios-sicard`; a camada validada,
o ZIP original e os metadados ficam juntos em
`saidas-geoespaciais/analises-avulsas/gerador-camadas-territoriais/<analise>`.
O banco registra as referências e os hashes;
o download recupera o ZIP do storage oficial, sem gravá-lo em uma pasta local.
O XLSX sem montagem permanece em memória e entra no orçamento da exportação;
seleções que excedem a capacidade são recusadas com orientação para dividi-las.

#### Transparência dos procedimentos territoriais

As novas exportações municipais e setoriais usam campos descritivos, por exemplo
`pop_taxa_crescimento_geometrico_2022`, preservando o código original no
dicionário e nos metadados. GeoPackage incorpora aliases; os demais formatos
recebem QML para os aliases no QGIS. CSV, TXT e XLSX usam os aliases como
cabeçalhos dos indicadores. Shapefile mantém nomes de até dez caracteres
com correspondência no dicionário/QML. A exibição de aliases na camada depende
do suporte e das configurações do SIG; arquivos anteriormente gerados não mudam.

A página autenticada `/restrict/geoespacial/documentacao-camadas-territoriais/`
documenta originais e combinados, campos, fórmulas, universos, fontes, períodos
e pendências, distinguindo o catálogo de metadados da matriz preliminar histórica
de 46 indicadores. A listagem do catálogo não afirma que todos os valores estejam
carregados no banco nem homologa novas combinações.
O universo auditado contém 645 municípios; a camada setorial de 2022 contém
103.319 códigos e 103.620 partes, com 8 geometrias oficiais inválidas.
Não há replicação municipal nos setores. O catálogo de metadados contempla
3.519 campos originais dos 18 conjuntos oficiais de 2022 e 10 combinações
setoriais: nove campos básicos
(`v0001–v0009`), demografia, alfabetização, domicílios Partes 1, 2 e 3,
cor ou raça, parentesco, óbitos, pessoas e domicílios indígenas e quilombolas,
rendimento do responsável, entorno por domicílios, moradores e faces e
registro de nascimento. Os valores são obtidos quando um processamento os
solicita. Como as fontes configuradas são arquivos oficiais, o SICARD baixa o
conjunto que contém o atributo, extrai e valida as colunas solicitadas e as
persiste para reutilização. Não se presume a existência de consulta oficial
por variável na API do IBGE.
Ausência de linha e sigilo `X` não são substituídos por zero; a cobertura,
os sinais e o SHA-256 da fonte são registrados com os valores obtidos.
Foram persistidos 18 combinados municipais, todos com 645/645 valores; o catálogo
municipal totaliza 6.393 atributos, dos quais 6.375 originais.
O estado operacional de cada atributo setorial, inclusive sua cobertura após
carregamento, pode ser consultado em
`/api/geoespacial/extracao-atributos/municipal/catalog?territorialidade=setores_2022`.
Temas comuns às duas escalas não implicam mesmos IDs, períodos ou universos.
Rendimento médio e mediano do responsável e suas variâncias foram incorporados;
não equivalem à renda domiciliar per capita ou à pobreza. O indicador de
baixa renda já calculado permanece municipal. Dados divulgados em 2025/2026
mantêm a referência censitária de 2022 e as janelas específicas da descrição.

O catálogo estático de metadados é reproduzível com
`scripts/preparar_catalogo_setorial_on_demand.py --insumos DIR`.
Esse comando descreve as fontes e os 3.519 atributos sem gravar valores no banco.
Durante a operação, a primeira solicitação de um atributo obtém o arquivo oficial,
valida códigos e valores contra a malha, preserva ausências e sigilos, grava
apenas as chaves solicitadas e registra a procedência em transação protegida
por trava consultiva. Solicitações seguintes reutilizam os dados persistidos.
As dez combinações setoriais são recalculadas quando solicitadas, após obtenção
dos respectivos insumos. A malha e seus IDs são preservados.

Os dados públicos de referência estão versionados, sem dependência de pasta de sessão:

- `config/catalogo-setorial-on-demand.json`: catálogo de metadados dos 3.519
  atributos originais e 10 combinados setoriais; os valores originais são
  carregados e têm cobertura confirmada somente quando solicitados;
- `config/documentacao-camadas-territoriais.json`: prévia histórica integral,
  46 indicadores, preservada sem alterações e usada nas fórmulas da carga;
- `config/documentacao-camadas-territoriais/matriz-viabilidade-variaveis.csv`: mesma matriz em CSV;
- `config/documentacao-camadas-territoriais/baixa-renda-2022-percentuais-calculados.csv`:
  645 municípios, contagens e percentual de moradores até meio salário mínimo,
  incluindo sem rendimento, calculado com o universo da tabela SIDRA 10296.

O link de download da página usa a rota autenticada
`/restrict/geoespacial/documentacao-camadas-territoriais/baixa-renda-2022.csv`.
Os recursos versionados também são públicos pelo mount existente `/config`;
não contêm microdados pessoais. Campos ausentes e denominadores não positivos
não são substituídos por zero. A não aditividade dos percentuais publicados de
renda é explicitada, sem renormalização. A inversão de indicadores de relação
negativa pertence à futura favorabilidade deste fluxo, não a esta documentação.

Para reproduzir a incorporação do retrato, defina `$origem` como a pasta que
contém os três arquivos da auditoria e copie-os **sem conversão ou arredondamento**:

```powershell
Copy-Item "$origem\matriz-viabilidade-variaveis.json" config\documentacao-camadas-territoriais.json
Copy-Item "$origem\matriz-viabilidade-variaveis.csv" config\documentacao-camadas-territoriais\matriz-viabilidade-variaveis.csv
Copy-Item "$origem\baixa-renda-2022-percentuais-calculados.csv" config\documentacao-camadas-territoriais\baixa-renda-2022-percentuais-calculados.csv
```

Os testes `tests/test_documentacao_camadas_territoriais.py` verificam os SHA-256
do retrato original, a equivalência JSON/CSV e reproduzem os 645 percentuais como
`100 × (até 1/4 SM + mais de 1/4 até 1/2 SM + sem rendimento) / total do universo`.
Uma atualização deliberada do retrato exige revisar os dados, as ressalvas e
os hashes esperados nos testes, sem tratar disponibilidade numérica como homologação.
O catálogo de metadados setoriais é reproduzível por
`scripts\preparar_catalogo_setorial_on_demand.py --insumos DIR`.
Essa geração não grava valores no banco. O carregamento de valores ocorre no
fluxo da aplicação, quando um processamento solicita atributos não persistidos.

As novas saídas usam uma organização por contexto, não por formato de arquivo:

```text
saidas-geoespaciais/
  hierarquizacoes/<codigo>/<fase-1|fase-2|fase-3|consolidado>/<analise>/
  analises-avulsas/<ferramenta>/<analise>/
  exportacoes/<exportacao>/
```

Cada análise reúne camadas, relatórios, metadados e pacotes. O nome da pasta
combina um título normalizado e o identificador único; execuções registradas no
banco também incluem a data UTC de início. Na elegibilidade, o lote identifica
a análise, e os arquivos de entrada recebem um sufixo próprio para evitar
colisões de nomes. Somente entradas comprovadamente oriundas de uma hierarquização
usam sua pasta de fase; entradas avulsas não ganham vínculo com uma rodada.
PDFs e ZIPs recebem identificadores próprios para preservar versões anteriores.
Revisões de nomes ficam em `revisoes/<hash_usuario>/` dentro da análise.
Preparações de demandas ficam identificadas como `preparacao-demandas` no
mesmo contexto territorial, sem modificar as fontes.

Exportações automáticas diretas usam `exportacoes`; uma pasta explicitamente
selecionada pelo usuário continua sendo respeitada. Bases, originais das demandas,
configurações e temporários permanecem separados. Os registros de acompanhamento
da elegibilidade passam para
`aplicacao/data/geoespacial/configuracoes/extracao-atributos/execucoes-elegibilidade`.
Arquivos, vínculos, históricos e revisões antigos continuam legíveis.
O utilitário `scripts/migrar_destinos_storage.py` reorganiza o acervo existente
na montagem oficial da VM: sem argumentos, apenas confere o plano; com
`--aplicar`, copia, verifica os hashes pela API, atualiza referências por chave
primária e só então exclui as origens conferidas e os diretórios vazios.
Ele requer o código atualizado e a migração SQL 139 aplicada.
Os manifestos e backups dos JSONs alterados ficam em
`aplicacao/data/geoespacial/configuracoes/migracoes-storage/<identificador>/`.
GeoPackages, PDFs e ZIPs preservam os bytes originais e sua auditoria histórica.
Relatórios e revisões de análises migradas usam a pasta física organizada,
sem exigir a regravação dos metadados dos GeoPackages.

Na VM, os diretórios de configurações compartilham o grupo do Storage
(`1000`, diretórios `2770`). A publicação atômica dos JSONs aplica o grupo
do destino e o modo `0660` antes da troca do arquivo, evitando o modo
privado `0600` dos temporários sem conceder acesso a outros usuários do SO.
Antes de usar as novas gravações, aplique
[139_centralizar_destinos_saidas_storage.sql](database/139_centralizar_destinos_saidas_storage.sql)
pelo aplicador de banco, com `-OnlyMigration 139_centralizar_destinos_saidas_storage.sql`.
A migração amplia a restrição de caminhos sem alterar dados ou referências,
preservando exatamente as permissões de caminhos legados da versão instalada.

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
A ficha usa o arquivo real para informar tamanho, formato e componente interno;
pacotes preservam a contagem de bytes compactados e descompactados do leitor.
As demandas de uma hierarquização recebem contagem de vértices, medidas
geodésicas, limites e descrição do CRS obtido do SRID cadastrado. Essa leitura
reutiliza a geometria recuperada e não dispara consultas municipais adicionais.
Geometrias em banco não recebem nomes, caminhos ou tamanhos de arquivos fictícios:
esses campos indicam que não se aplicam. UF e municípios continuam sem confirmação
quando não houve consulta à base territorial; ausência de metadados não é tratada
como contagem zero. Os atributos acrescentados pela rodada também aparecem na ficha.

A **Favorabilidade de grade e da rede V2** é servida na mesma rota
`/restrict/hierarquizacao/fase-2/`. O template
`templates/paginas/hierarquizacao/fase2-favorabilidade.html` e seu executor
`hierarquizacao/js/fase2.js` permanecem intactos como backup da versão anterior,
sem serem carregados pela V2. A nova página adapta Entrada, Superfícies e Prévia
da Elegibilidade, usando a bancada atual de `componentes/_geoprocessamento.html`.
Grade e rede podem ser preparadas em qualquer ordem, com os exploradores abrindo
em `superficies-indices/hierarquizacao/favorabilidade`. As listas de referências
ficam isoladas nos escopos `favorabilidade-grade` e `favorabilidade-rede`.
Entradas vetoriais e geometrias cadastradas das demandas são preservadas, sem
buffers ou conversão geométrica. Superfícies vetoriais usam a prévia comum por
tiles; rasters usam imagem reduzida vinculada ao arquivo original. A preparação
não comprova homologação ou normalização dos índices. Apenas as camadas marcadas
na prévia são confirmadas na bancada, nos papéis de entrada, grade e rede;
camadas adicionadas diretamente à bancada não recebem esses papéis.
O bloco **Conferir e executar**, anexo à bancada, acompanha a visibilidade e as
remoções das entradas e superfícies confirmadas. O botão **Calcular Favorabilidade
Territorial** exige entrada e ao menos uma superfície poligonal. Após confirmação,
prepara a entrada pelas regras cadastrais poligonais da Elegibilidade e reutiliza
seu motor de interseções GDAL/OGR independentes, somando somente áreas em m² nos
campos `fg_*` (grade) e `fr_*` (rede), sem união ou dissolução. As demandas de uma
hierarquização são processadas integralmente em uma camada, sem dissolvê-las.
Rasters e bases lineares continuam disponíveis para visualização, mas não
participam desta execução de áreas.
O GeoPackage contém `favorabilidade_territorial` e `intersecoes`; os fragmentos
preservam todos os atributos das superfícies, incluindo classe nominal e valores
normalizados, sem agregá-los. O mapa de campos e a procedência ficam em
`SICARD_FAVORABILIDADE`. A execução possui progresso, cancelamento seguro, saída
conferida no Storage e inclusão na bancada, com namespace próprio e pasta
`fase-2` para hierarquizações. Não executa o extrator pontual legado, não atualiza
índices ou ranking e não registra saídas como Fase 1.
As referências do Storage distinguem `revisao_fonte` (data/tamanho do arquivo
original) do token de revisão da prévia. Entradas avulsas e superfícies enviam
a revisão do original ao cálculo; alterações reais são bloqueadas, sem confundir
a criação de novos tiles com mudança do arquivo. Descritores anteriores a essa
distinção devem ser preparados novamente na prévia e confirmados na bancada.
Os resultados anteriormente registrados continuam consultáveis e não são
substituídos por esse cálculo. Validação sintética:
`tests/test_favorabilidade_processamento.py` e `tests/browser/favorabilidade-v2.cjs`.

Anexo à bancada da elegibilidade v2, o bloco **Conferir e executar** resume
separadamente Entrada, Restrição e Risco, com os arquivos ou referências integrais.
A conferência acompanha a visibilidade e as remoções na bancada, sem usar a seleção
ou a prévia como composição. Camadas acrescentadas diretamente na bancada são
sinalizadas e não recebem um papel automaticamente. O botão **Calcular Elegibilidade
Territorial** exige uma entrada e ao menos uma base de restrição ou risco marcadas.
Após confirmação, executa interseções GDAL/OGR independentes da entrada integral
com cada base, primeiro restrição e depois risco. Soma as áreas dos fragmentos por
feição em EPSG:5880, em m², sem união ou dissolução, acrescentando campos `re_*`
e `ri_*`; ausência de interseção permanece `NULL`. A saída preserva todas as
geometrias, atributos e o CRS da entrada da bancada. O GeoPackage é reaberto e
conferido antes do registro no storage, com o nome
`[nome da camada de entrada]_elegibilidade_territorial.gpkg`, em pasta exclusiva
para evitar sobrescrita. Cada saída é adicionada automaticamente à bancada sem
remover as fontes. Há acompanhamento e cancelamento seguro antes da gravação;
classificação e integração com as fases seguintes não são executadas nesta etapa.
Quando a origem da entrada é a opção **Hierarquizações**, o GeoPackage produzido
é registrado automaticamente em `relatorio_fase1.analises_geoespaciais` da rodada
correspondente, com caminho no Storage, SHA-256, origem e identificação do registro.
O vínculo informado pela página é conferido contra o metadado
`SICARD_NORMALIZACAO` da entrada preparada para o grupo e é preservado no metadado
da saída. Entradas escolhidas pela opção **Camada de entrada** não são associadas
a nenhuma hierarquização. O registro não altera situação, classificação ou
resultados das outras fases, e novas análises não apagam as anteriores.
Após confirmar os nomes na seção de resultados, o PDF é gerado, conferido e salvo
no Storage, sendo associado à mesma análise na coluna **Relatório da Fase 1**.
Não é necessário clicar em baixar o ZIP para registrar o PDF. Se houver entradas
de origens diferentes, cada PDF vinculado inclui somente as da respectiva rodada.
Em **Gestão das hierarquizações**, as colunas **Relatório da Fase 1**,
**Relatório da Fase 2**, **Relatório da Fase 3** e **Relatório consolidado** exibem
os registros disponíveis. Na Fase 1, o modal permite baixar o GeoPackage, o PDF
e a planilha de resumo associados, com autenticação e conferência de SHA-256.
O link **Visualizar tabela-resumo de elegibilidade** abre outro modal com os
dados salvos de cada análise, sem recalcular os resultados. Ao fechá-lo, retorna-se
ao relatório. Análises antigas sem resumo registrado exibem essa indisponibilidade;
os relatórios sem arquivo
persistido continuam consultáveis como dados estruturados. A ausência de relatório
é indicada por **Não produzido**, sem ocultar a coluna.
A seção **Resultados** permite revisar os nomes amigáveis das entradas, bases
dinâmicas e feições sobrepostas antes da apresentação. O link **selecione uma
análise já realizada** abre o explorador diretamente em `saidas-geoespaciais`,
limitado a GeoPackages. A seleção lê diretamente o arquivo no Storage e seus
metadados `SICARD_ELEGIBILIDADE`, sem exigir histórico de execução nem autoria
do usuário atual. Qualquer saída de elegibilidade válida em uma pasta de leitura
publicada pelo Storage pode ser aberta por quem já possui acesso geoespacial.
São conferidos os campos, as geometrias, as áreas totais e os vínculos e somas
das interseções antes de reutilizar o mesmo fluxo de revisão, mapa, gráfico,
tabela e exportação. Uma referência ao conteúdo validado e ao seu SHA-256 é
persistida para manter a apresentação e a exportação consistentes, inclusive
após reiniciar o servidor; ela não depende do registro do processamento original.
Os nomes anteriormente confirmados pelo mesmo usuário são reaproveitados;
não há novo processamento espacial. Cancelar ou selecionar um arquivo inválido
preserva os resultados já apresentados. Os aliases confirmados são
persistidos no storage, vinculados ao usuário e ao SHA-256 da saída. Nas análises
reabertas, as revisões ficam separadas por usuário, sem bloquear o acesso ao
GeoPackage nem sobrescrever a revisão de outro usuário; a revisão é
recolhida após confirmação e pode ser reaberta. Os nomes são usados na tela e no
PDF, em title case do português brasileiro; sugestões automáticas não substituem
a revisão de significado, ortografia e gramática. O painel integra mapa Leaflet,
gráfico de rosca e tabela paginada, com seleção bidirecional e zoom nas geometrias
selecionadas. As fontes são separadas em Restrição e Risco. Uma única rosca reúne
todas as entradas e demandas da análise: cada fatia corresponde a uma combinação
demanda × feição da base, não a uma classificação de elegibilidade. Nomes iguais
não unem combinações distintas. A legenda identifica a entrada, demanda, camada,
feição, área e participação na soma. Seleção, paginação e filtros da tabela não
retiram fatias; selecionar uma fatia de outra entrada atualiza o mapa, a tabela e
os detalhes correspondentes. A legenda explicita áreas em m²; na tabela e nos
detalhes, as áreas aparecem em km², com hectares abaixo, e os detalhes
informam o percentual da demanda. A proporção da rosca usa a soma das áreas
sobrepostas, que podem ocupar o mesmo local, não uma cobertura exclusiva.
A Favorabilidade V2 utiliza o mesmo componente de rosca integral em seu painel
de sobreposições. Os dados são conferidos nos GeoPackages das execuções do usuário,
sem repetir interseções ou agregar classes e índices. Execuções parciais são
identificadas, contatos sem área permanecem na legenda e falhas na leitura
oferecem recarregamento sem recalcular os produtos.
A tabela utiliza tipografia compacta em todos os seus componentes. Entre a
tabela e o paginador, a barra de controles inclui o botão de ocultar/mostrar
linhas e colunas vazias: a verificação considera os valores de sobreposição de
todas as páginas da entrada selecionada, sem contar identificador e nome.
Zero continua sendo um valor válido; somente ausências são ocultadas. A
paginação acompanha as linhas visíveis. O filtro é reversível e exclusivamente
visual, sem alterar mapa, gráfico, arquivos, dados salvos ou relatório completo.
No rodapé, **Baixar Relatório e
Camadas (.zip)** entrega o PDF completo (todas as feições e bases), os GeoPackages
sem alteração e os metadados da análise. A exportação verifica o SHA-256 das
saídas, não repete interseções e grava o pacote no storage antes do download.
O GeoPackage contém a entrada integral em `elegibilidade_territorial`, a área total
em `area_total_m2` (ou nome livre equivalente em caso de colisão) e a camada
`intersecoes`, com vínculos por posição da demanda, base e feição de origem. As
áreas de processamento continuam em m², sem união nem dissolução. O PDF inclui
mapas com recortes, tabelas por base e detalhes de todas as demandas e feições,
mesmo fora da página ou seleção visível. Lotes parciais são identificados.
Saídas anteriores, sem interseções persistidas, exigem nova execução para esse
painel; não são criados recortes ou resultados substitutos.
A tabela de atributos da bancada sempre exibe a identificação técnica da feição
em coluna fixa e somente leitura: nos arquivos, o FID real retornado pelo GDAL,
com o nome da coluna nativa quando disponível; nas leituras em memória, o ID
GeoJSON quando completo e único, ou um índice de sessão explicitamente identificado.
IDs GeoJSON incompletos ou repetidos continuam visíveis ao lado do índice, sem
serem apresentados como únicos. A coluna também integra a seleção por atributo e
o CSV; FIDs de 64 bits são mantidos sem arredondamento. Os identificadores técnicos
não são inseridos como novos atributos nos arquivos e não constituem UUIDs globais.
A elegibilidade v2 acompanha os envios à prévia e à bancada pelo feedback
padronizado, com etapas, camada corrente, cancelamento e resultado explícito.
O modal compartilhado mostra a etapa e a atividade atuais, a situação, o tempo
decorrido, a última etapa concluída e os avisos que exigem atenção. O percentual
da atividade e o avanço das etapas são apresentados separadamente; sem medição,
a barra correspondente permanece indeterminada, sem estimativa de tempo restante.
Ocultar o acompanhamento não cancela a execução. O histórico técnico não aparece
na interface; os registros limitados de diagnóstico e sua exportação programática
permanecem disponíveis ao suporte.
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

O gerador de camadas territoriais entrega o ZIP original já gravado no Storage,
com a geometria e os arquivos auxiliares da exportação, sem remontá-lo a partir
de diretórios locais. Novas gerações conferem o SHA-256 registrado antes do
download. Se a leitura do pacote falhar após a geração, o feedback distingue
essa falha da criação da camada e orienta a consultar as saídas no acervo, sem
repetir a geração apenas para baixar o arquivo.

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
- Em produção, `X-Forwarded-Prefix` orienta o middleware a acrescentar `/sicard`
  aos caminhos absolutos de HTML e JavaScript. O gerador de superfícies e sua
  integração com julgamentos usam esse mecanismo também para APIs e downloads;
  não se deve calcular e concatenar outro prefixo com base em `location.pathname`.

Rotas públicas principais:

| Rota | Uso |
|---|---|
| `/public/` | Entrada geral |
| `/public/cadastro/` | Orientações e catálogos públicos; envio exige Operador ou superior |
| `/public/painel/` | Consulta de registros, localização e situação; não publica ranking |
| `/public/transparencia/` | Acesso à consulta cartográfica e documentação |
| `/public/documentacao/` | Documentação funcional |
| `/public/login/` | Entrada da área restrita |
| `/public/analise-multicriterio/formulario-comparacao-pareada/{token}/` | Formulário do especialista por token |

O painel consulta planos, programas e projetos de todos os status e omite os
dados do representante (`painel_service`, `public_only=True`); não há filtro de
aprovação/publicação nessa consulta. Presença no painel não comprova aprovação
ou homologação. Falha da API é apresentada explicitamente, sem substituir a
consulta por cadastros locais do navegador. Uma resposta vazia é distinta de erro.
Os catálogos usam as referências em `config/referencia-institucional.json` e
`config/referencia-classificacao.json`, não a listagem operacional do banco.
O formulário legado `/public/ahp/colaborativa/` retorna 410; o convite ativo usa
a rota por token e exige validação de e-mail e código de acesso na API.
Os relatórios em `/public/documentacao/saidas_modelos/` e a apresentação
conceitual não certificam homologação nem execução integral do modelo.

Rotas restritas principais:

| Rota | Uso |
|---|---|
| `/restrict/` | Entrada interna |
| `/restrict/painel/` | Painel administrativo |
| `/restrict/demandas/` | Análise das demandas |
| `/restrict/hierarquizacao/` | Árvore metodológica |
| `/restrict/hierarquizacao/processos/` | Gestão das rodadas |
| `/restrict/hierarquizacao/ranking/` | Resultados e ranking das demandas |
| `/restrict/analise-multicriterio/central-julgamentos` | Central de julgamentos colaborativos |
| `/restrict/analise-multicriterio/central-respostas` | Central de respostas dos especialistas |
| `/restrict/analise-multicriterio/mesa-consolidacao` | Mesa de consolidação: proposta simplificada que reúne seleção de respostas, regras, resultado em tempo real, gravação e homologação em uma só tela. `?demo=1` abre com dados fictícios em memória; `?julgamento=<id>` abre direto um julgamento |
| `/restrict/ahp/` | Configuração multicritério |
| `/restrict/geoespacial/` | Ferramentas e produtos espaciais |

Os endereços antigos com `?modo=espaco` e `?modo=julgamentos` redirecionam
permanentemente para as respectivas centrais. Os links públicos antigos
`/public/analise-multicriterio/{token}/` redirecionam para
`/public/analise-multicriterio/formulario-comparacao-pareada/{token}/`,
preservando o token e os parâmetros. Os espaços de trabalho dos julgamentos
mantêm seus endereços.

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

Na tabela da página Demandas, o seletor à esquerda do rodapé permite exibir
15, 25, 35, 50 ou 100 linhas por página, com 15 como padrão. A mudança retorna à
primeira página, limpa a seleção e atualiza o contador e a paginação, preservando
o filtro e a ordenação. O seletor fica desabilitado durante a edição de registros.

A análise em `/restrict/demanda/` adapta os três tipos de demanda ao celular.
Até 900 px, a página usa escala integral, rolagem vertical pelo documento e lista
de demandas com altura limitada e rolagem própria. Até 600 px, os campos usam
fonte de 16 px para evitar ampliação automática durante o foco, os controles de
resposta e ações oferecem altura mínima de 44 px e as margens internas são
reduzidas. Informações e mapa ficam empilhados nas telas estreitas; as colunas
e a escala do desktop são preservadas. A regressão
`node tests\browser\demanda-responsividade.cjs` cobre Projeto, Plano e Programa
em oito larguras, de 320 a 1440 px, com o template e as folhas de estilo reais
e dados sintéticos, sem consultas ao banco.

Famílias: `/api/demandas`, `/api/planos`, `/api/programas`, `/api/dominios` e
`/api/painel`.

Na página `/restrict/complementacao/`, os dois fluxos são independentes.
**Complementação de Dados Cadastrais e Geometria** mantém a tabela de demandas
com status aguardando complementação e suas ações cadastrais e de geometria.
**Complementação de Atributos de demanda** permanece visível: o administrador
escolhe a hierarquização e suas demandas; o operador escolhe diretamente uma
demanda da qual seja criador ou representante legal. No contêiner abaixo,
consulta-se a mesma tabela de atributos da Fase 3, limitada às demandas
autorizadas. São reconhecidos os atributos
cadastrais já existentes, sem duplicá-los entre os atributos da matriz.
Acima da tabela, o **Resumo da hierarquização** reproduz o resumo da Fase 3,
inclui a data de criação e mantém o clique nas demandas para abrir seus detalhes.
As duas seções utilizam a hierarquia tipográfica e a escala da Fase 3.
Isso inclui os textos gerados por JavaScript, os campos e o modal de detalhes.
Na tabela de atributos, a coluna de identificação das demandas permanece fixa
durante a rolagem horizontal; nomes e códigos completos quebram linha, sem corte.
Os campos numéricos recebem máscaras durante a digitação e na consulta, conforme
a unidade e o formato declarados na coluna: reais (inclusive R$/ano) com duas
casas decimais, inteiros sem frações e demais números com agrupamento de milhar
e vírgula decimal. Reutiliza-se a entrada monetária em centavos da análise de
demandas: digitar `123456` resulta em `1.234,56`. Percentuais são armazenados
na unidade informada, sem conversão automática em fração. As máscaras não mudam
os valores numéricos enviados à API; campos vazios permanecem distintos de zero,
e entradas inválidas impedem a confirmação com mensagem de validação.
A numeração é **1. Complementação de Dados Cadastrais e Geometria**, com
**1.1** para o editor cadastral ou de geometria aberto; e
**2. Complementação de Atributos de demanda**, com
**2.1 Resumo da hierarquização** e **2.2 Critérios atributo de projeto**
(ou do tipo de demanda selecionado).
A disponibilidade desses atributos não exige
o status cadastral aguardando complementação; operadores continuam limitados à
autoria ou representação do cadastro atual. Analistas e gestores podem solicitar
a coleta, mas a edição de demandas alheias nesse bloco exige perfil ADMIN.

Os atributos abrem em consulta; **Editar**, **Confirmar** e **Cancelar** controlam
a edição dos valores originais na tabela. Confirmar grava os atributos da matriz
na hierarquização e os atributos cadastrais no cadastro oficial e na cópia da
rodada selecionada, em uma única transação. Outras rodadas não são reescritas.
Cancelar preserva os valores salvos. Trocar de hierarquização com alterações
pendentes exige confirmação de descarte. O seletor permanece disponível na
seção, e abrir os editores cadastral ou de geometria apenas desloca a seção de
atributos para baixo, sem ocultá-la ou perder seu rascunho. Na Fase 3, os valores
continuam somente leitura; os controles de pesos ficam exclusivos dessa fase.
O modelo da matriz permanece inalterado. A alteração não muda os métodos de
normalização, os pesos ou as regras de cálculo da hierarquização.

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

Na página Agrupamento de Demandas, a exclusão exige confirmação pelo feedback
padronizado e utiliza somente os IDs selecionados. Agrupamentos utilizados por
hierarquizações não podem ser excluídos: a resposta identifica os agrupamentos e
as hierarquizações vinculadas, sem expor mensagens internas do PostgreSQL.
Se qualquer agrupamento estiver vinculado, nenhum item do lote é excluído.
Excluir um agrupamento livre não exclui as demandas que o compõem.

Os 13 acessos dos grupos MOCAD e MAD no índice restrito usam o feedback
compartilhado (`Notify`, `ProcessFeedback` e `StatusFeedback`). Avisos de
carregamento e validação usam notificações; ações destrutivas usam a confirmação
padrão; cadastros e consolidações acompanham a resposta real do servidor.
As centrais de hierarquização, julgamentos e respostas não utilizam confirmações
nativas nem modais próprios de progresso ou resultado. Operações já gravadas
com falha posterior de atualização são relatadas como parciais, sem sugerir
que o usuário repita o cadastro. O painel cartográfico restrito também informa
falhas de consulta pelas notificações padronizadas.

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

Na Área do Administrador, o filtro de valor permite digitar um valor ou parte
dele, com sugestões dos valores existentes. A busca é aplicada com Enter ou ao
sair do campo e não diferencia maiúsculas de minúsculas. Os caracteres `%`, `_`
e barras são tratados literalmente, não como curingas. As opções Vazias,
inversão e limpeza permanecem disponíveis; a busca considera a tabela inteira,
independentemente da página ou do limite de sugestões.
Confirmações de exclusão, erros e resultados das operações utilizam o feedback
padrão do SICARD. A exclusão continua limitada às chaves dos registros
selecionados, nunca ao texto digitado no filtro.

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
build, reinício de `sicard_app`, verificações HTTP e publicação do template/CSS
dos logins do Storage. Para uma alteração restrita aos logins, no Windows:

```powershell
.\scripts\deploy-vm.ps1 -Mensagem "atualiza logins do Storage" -SomenteStorage
```

Esse escopo mantém o fluxo único de commit/push/sincronização e as guardas de
branch e SHA, mas não reconstrói nem reinicia a aplicação. Os testes continuam
obrigatórios antes da publicação. A conferência visual real, sem substituição
local dos arquivos, é executada com `node tests/browser/storage-logins.cjs --published`.

A implantação da aplicação usa
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


### Solicitações de complementação de demanda

A página `/restrict/complementacao/` separa os pedidos cadastrais/geometria
abertos em `demandas.solicitacao_complementacao_demanda` das pendências de
atributos na hierarquização. O segundo bloco também apresenta as pendências
cuja solicitação por email foi adiada. O status não cria, sozinho, uma solicitação.

Na análise, informe o tipo e o motivo antes de solicitar complementação:

- `dados_cadastrais` e `geometria` podem compor o mesmo pedido e interrompem a
  análise cadastral; cada tipo precisa ser salvo antes da conclusão explícita.
- `atributos_objeto` usa pedido separado e exige o código de uma hierarquização
  que contenha o objeto. Usa `hierarq_aguardando_complementacao`, sem reabrir
  a avaliação nem utilizar `analise_aguardando_complementacao`.
- Salvar mantém o pedido aberto. Concluir registra atendente/data e preserva o
  histórico. A retomada da análise exige que os pedidos cadastrais/geometria
  estejam concluídos. Atributos pendentes da matriz vigente impedem sua conclusão.

Ao salvar uma hierarquização, cada demanda recebe os slots dos atributos da
matriz enviada, com valores dinâmicos vazios, preservando-se os atributos
nativos oficiais aplicáveis ao tipo. Se faltarem valores, o status de espera da
hierarquização é registrado imediatamente. A escolha **Agora** cria os pedidos
e tenta notificar o representante pelo email do cadastro; **Depois, na Fase 3**
apenas adia o pedido e o email. O comando de solicitação da Fase 3 reutiliza
`POST /api/complementacao/hierarquizacoes/{codigo}/solicitar`, com
`{"descricao":"motivo da solicitação"}`.

Tabela 2 da Fase 3 e complementação usam as mesmas colunas: Cadastro e Dinâmicos
da matriz e do Configurador, sem duplicar atributos nativos. Risco é obtido da
Fase 1 e não é preenchimento manual. A matriz prevalece em identificadores
duplicados. Um marcador antigo de conclusão não oculta novos campos vazios.
Ao salvar o último valor válido, a API conclui automaticamente por demanda,
revalida os atributos e domínios, atende os pedidos do contexto e registra
autoria/data. A demanda retorna a `hierarq_em_andamento` sem aprovação adicional;
outra rodada ainda pendente mantém o status de espera. A gravação parcial mantém
`hierarq_aguardando_complementacao`; não há botão adicional de conclusão.
A rota `POST /api/complementacao/hierarquizacoes/{codigo}/demandas/{demanda_codigo}/concluir`
permanece disponível para validar coletas anteriores ainda abertas.
Edições de atributos, critérios ou pesos descartam imediatamente os resultados
calculados da Fase 3 e da síntese, incluindo relatórios e ranking. A tela não
exibe resultados anteriores: valores e pendências refletem a tabela vigente, e
os índices ficam sem cálculo até nova execução. A Fase 1 descarta também o
resultado da Fase 3 por fornecer o grupo Risco; alterações nas Fases 1 e 2
descartam a síntese. O novo cálculo considera a rodada inteira.
Na Fase 3, após calcular o índice geral, a seção **Gerar a síntese final**
exibe o **Ranking final de demandas**, em ordem de posição, com o
**Índice geral de hierarquização** e a situação de cada demanda. Demandas
segregadas, barradas por risco ou sem os índices necessários ficam sem posição.
O índice é clicável e abre a memória de cálculo no modal padrão: demanda,
índices de favorabilidade de rede, favorabilidade territorial e prioridade,
pesos efetivamente utilizados, resultado combinado, equação e definição dos
termos. A consulta utiliza os valores da síntese salva, não alterações ainda
não calculadas dos controles. Na média simples, cada índice tem peso 1/3.
Sínteses históricas sem dados compatíveis para reconstrução recebem aviso
explícito, sem inventar pesos ou equações. A tabela reaparece ao reabrir a
rodada, desde que os resultados continuem atuais.

Na página **Ranking de demandas**, as hierarquizações finalizadas e atuais são
consultadas na tabela padrão, com filtros, seleção, controles, paginação e
contador. Uma única seleção habilita **Visualizar**, que abre o ranking do grupo,
e os atalhos para os painéis restrito e público existentes. Esses atalhos não
publicam o grupo nem aplicam filtros que os painéis ainda não suportam. O nome da
hierarquização abre um modal com os índices das três fases por demanda, pesos
registrados e resultado final. Pesos da síntese incompatíveis com o resultado
salvo não são apresentados como reconstituídos. **Gerenciar publicação** permanece
desabilitado até a implementação da gestão de publicações.
No modal, a leitura começa pela posição final, demanda e índice geral de
hierarquização, seguidos pelos pesos da síntese e pelo detalhamento das Fases
1, 2 e 3. O texto esclarece que o índice de risco da Fase 1 participa do índice
de prioridade da Fase 3, sem entrar separadamente na síntese final. Após um
separador na barra de filtros, os botões de ícone **Pesos**, **Índices das fases**
e **Elegibilidade** alternam seus grupos de colunas. Todas começam visíveis;
seletores, posição, demanda e índice final permanecem disponíveis. A escolha
de visibilidade é mantida na filtragem e paginação e reinicia ao reabrir o modal.
Ocultar colunas não remove dados dos filtros nem da exportação.

O título do ranking incorpora o tipo de demanda e o nome da hierarquização.
Os nomes das demandas são exibidos como registrados, sem normalização
automática de capitalização, siglas ou grafia, no ranking, mapa, modal de
detalhes e em todas as seções da Fase 3.

O componente `templates/componentes/mapa_ranking.html` exporta a macro
`mapa_ranking(somente_canvas=false, prefixo="ranking")`. A versão completa oferece
a árvore **Plano/Programa/Projeto → Hierarquização → Demanda**, com controles de
visibilidade que atuam simultaneamente sobre a geometria e o marcador ordinal.
Tipos sem grupos finalizados são omitidos. A página de ranking usa
`somente_canvas=true`, sem sidebar. Carregar `ranking-dados.js`, `ranking-mapa.js`,
`ranking-privado.css`, Leaflet, `status-colors.js` e `painel-map-controls.js`;
inicializar com `SLTRankingMapa.criar(elemento, {hierarquizacoes, demandas})`.
O mapa privado recebe geometrias reais do endpoint autenticado
`/api/painel/demandas/internas`, associadas pelo tipo e pelo código da demanda.
Não cria pontos substitutos a partir das coordenadas de referência; geometrias
ausentes ou inválidas são informadas explicitamente. A posição aparece somente
no marcador em gota.
Em polígonos, a gota é posicionada no centroide da área em coordenadas GeoJSON,
descontando os anéis internos e ponderando as partes dos multipolígonos pela
área, independentemente da orientação dos anéis; não usa o centro do retângulo
envolvente. O centroide de um polígono côncavo pode ficar fora de sua área.
A tabela do grupo e a seção do mapa iniciam ocultas e aparecem juntas ao
visualizar uma hierarquização (inclusive pelo parâmetro `codigo`). O canvas
mostra apenas as demandas do grupo visualizado. Clicar em uma linha do ranking,
ou focá-la e pressionar Enter ou Espaço, enquadra a geometria correspondente;
os seletores da tabela continuam independentes dessa navegação. A legenda
compartilhada de demandas é exibida na seção do mapa, fora do canvas.
Nesse componente, `SLTStatusColors.rankingPinHtml` gera a mesma gota ordinal
para o mapa e para a legenda (`renderLegend` com `marcadorRanking: true`).
Fundo e texto usam a paleta central, e a geometria usa `leafletPathStyle`,
preservando listras de planos, malha de programas e preenchimento liso de projetos.
O status atual do cadastro interno prevalece sobre o retrato salvo no grupo;
concluir o cálculo não equivale a publicar a demanda. Status ausentes ou
desconhecidos geram aviso explícito e impedem a exibição da demanda no mapa,
sem atribuir uma situação presumida. As fases da legenda representam o ciclo
de vida cadastral, não as três etapas do cálculo multicritério.

Para a futura integração de publicação, a instância oferece
`definirPoliticaPublicacao(hierarquizacao => boolean)`, que recompõe mapa e árvore
segundo a política recebida, e `atualizar(hierarquizacoes, demandas)`. Por enquanto,
a página privada permite consultar todos os grupos finalizados e atuais.
O componente não autoriza acesso a dados públicos: a futura página pública deve
receber apenas dados autorizados pelo servidor e a política oficial de publicação,
sem reutilizar o endpoint interno nem inferir publicação a partir de homologação.

Nos painéis existentes (`/restrict/painel/` e `/public/painel/`), a API unificada
de demandas inclui `hierarquizacoes`: resumo seguro das fases e dos pesos, índice
final e posição **daquela demanda em cada rodada**. Não transfere o documento
interno completo da rodada para o painel público. A sidebar cria
**Tipo → Hierarquização → Demanda** desde a formação do grupo, com situação da
rodada; demandas sem grupo permanecem na raiz de seu tipo. Várias participações
compartilham uma única geometria e um único estado de visibilidade da demanda.
O contador considera demandas únicas, não participações. Os detalhes individuais
permitem consultar todas as rodadas, sem presumir ranking global entre grupos.

Ciclo da hierarquização: o cálculo da síntese apenas **grava** o ranking e deixa a
rodada em `calculada`; o status das demandas não muda. Nesse estado qualquer
índice das três fases pode ser recalculado. A **homologação**
(`POST /api/ahp/hierarquizacoes/{codigo}/homologar`, gestor ou administrador) é a
única operação que conclui as demandas (`hierarq_em_andamento` para
`hierarq_finalizada`, conferida no domínio, na mesma transação), exige síntese
atual e **trava** o recálculo das fases, da síntese e da complementação. A
reversão (`POST .../reverter-homologacao`) só é permitida a administrador ou a
gestor diferente de quem homologou; devolve a rodada a `calculada` e as demandas a
`hierarq_em_andamento`, exceto as que pertençam a outra rodada homologada. Ambas as
ações ficam registradas em `cabecalho_grupo.historico_homologacao`. Demandas em
execução, suspensas, retiradas ou já publicadas não são sobrescritas. A publicação
é um controle gerencial somente do painel público, ainda não implementado.
As migrações `149_reconciliar_demandas_hierarquizacao_concluida.sql` (corrige
somente demandas de rodadas já homologadas, por tipo e ID) e
`150_reverter_homologacao_hierarquizacao.sql` (transições da reversão) estão
registradas no aplicador e devem ser aplicadas explicitamente após revisão. A
presença dos arquivos no repositório não significa aplicação ao banco oficial.

O cálculo usa os critérios enviados pela tabela atual, respeitando os pesos
homologados. Escalas ordinais declaradas no campo Dado também são lidas; escalas
ausentes não são inventadas. A síntese é bloqueada se os critérios ou escalas
mudarem em relação ao último cálculo.
O `GET` da tabela aceita `demanda_codigo` para restringir a seleção a uma única
demanda autorizada; isso não substitui a validação de titularidade no servidor.

**Pré-requisito de publicação:** aplicar a migração
`146_dom_status_demanda_complementacao_hierarquizacao.sql`, já registrada no
aplicador de banco. Ela adiciona o status, as transições dedicadas e o histórico
JSON de notificação por pedido; sua presença no repositório não significa que
tenha sido aplicada ao banco oficial. O envio é posterior à confirmação da
transação do pedido. Falhas e destinatários ausentes são informados por demanda;
aceitação SMTP não confirma entrega. Repetir a ação não reenvia mensagens já
aceitas, indeterminadas ou ainda marcadas como em envio.

A migração `140_solicitacoes_complementacao_tipos.sql` amplia a tabela existente,
controla duplicidade por demanda/contexto e recupera os registros legados em
`analise_aguardando_complementacao`. Quando há encaminhamento de geometria
registrado, recupera esse tipo; nos demais casos, classifica como cadastral.
A autoria e o motivo originais desconhecidos ficam explicitamente indicados;
não são atribuídos a um usuário presumido. A reaplicação não recria pedidos
concluídos. Migração aplicada ao `slt_db` em 24/10/2026: seis pedidos recuperados,
três de geometria e três cadastrais. A publicação do código é uma etapa separada.
