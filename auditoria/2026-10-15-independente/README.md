# Auditoria independente SICARD — fechamento operacional

**Parecer final:** encerramento operacional aprovado no escopo acordado.
Regressão completa: **1.671 aprovados, zero falhas, zero erros, três ignorados
por ausência dos dados específicos e quatro subtestes aprovados**.
As integrações de banco com rollback, navegador/storage reais e os quatro casos
de bloqueio entre processos foram habilitados. Os cinco scripts adicionais
de feedback, destino, sessão, modelador e fluxos da extração passaram.
O deploy segue o script oficial, com verificação de saúde interna e pública;
os testes descritos abaixo não substituem essa verificação pós-publicação.

## Escopo final acordado — 16/10/2026

O encerramento considera a bancada compartilhada, sua integração com a extração,
concorrência e recuperação em testes controlados, correções dos defeitos
reproduzidos e regressão. A decisão expressa foi executar esse fechamento e
publicar se os testes passassem. A matriz histórica exaustiva, todas as
combinações de algoritmos e integrações externas ficam fora desse aceite.

Há **uma bancada**, usada diretamente e incorporada na extração por `iframe`.
O E2E agora carrega a página real da extração e a mesma rota da bancada,
abre a saída real do storage e verifica visibilidade e remoção pela ponte.
Não se exige outra auditoria integral do mesmo componente.

O fechamento identificou e corrigiu sobrescrita de edições simultâneas:
edição completa e publicação incremental agora compartilham bloqueio
PostgreSQL por arquivo. A concorrência foi reproduzida com dois editores;
os bloqueios de edição e destino foram verificados entre processos reais,
inclusive após encerramento abrupto do processo de teste.
Falhas controladas de upload e catálogo verificam limpeza e nova execução.
Detalhes em [DEFEITOS.md](DEFEITOS.md).

## Evidências da rodada anterior

## Fechamento da rodada de correções e testes — 16/10/2026

- Regressão completa, incluindo integrações opt-in: **1.664 aprovados, zero
  falhas, zero erros, três ignorados e quatro subtestes aprovados**.
- As 14 integrações de ciclo de vida passaram com banco real e rollback.
- No Edge, o fluxo real da bancada abriu entrada sintética, escolheu destino,
  nome e formato no explorador, executou OP-03, gravou no storage, recarregou
  a página, reabriu e reprocessou o resultado. GeoPackage e GeoJSON foram
  conferidos independentemente quanto a atributos e CRS; a entrada ficou intacta.
- Temporários e saídas dessa integração foram removidos somente nas pastas
  exclusivas do teste; os registros de catálogo foram revertidos.
- Quatro scripts adicionais passaram: feedback local, destino, integridade
  de sessão/tabela/edição e modelador. Seus serviços HTTP são simulados;
  não equivalem a quatro homologações com backend real.
- A sessão do E2E é assinada para um usuário sintético; não testa login por
  senha. A segunda bancada não teve novo E2E completo de navegador.

**Conclusão:** a rodada de correção e regressão está concluída, com o fluxo
local de processamento sem montagem verificado. A homologação exaustiva das
duas bancadas e de toda a matriz histórica continua pendente. Os três casos
ignorados dependem de dados ausentes, discriminados em [DEFEITOS.md](DEFEITOS.md).
A validação acima corresponde ao checkout local; não equivale a homologação
pós-deploy da VM. A publicação utiliza exclusivamente o script oficial.

## Registro histórico

**Retomada em 16/10/2026:** foram aplicadas correções incrementais e executadas
regressões sintéticas. O texto e os totais abaixo descrevem a auditoria original
de 15/10, não o estado de aprovação atual. Consulte a atualização ao final de
[DEFEITOS.md](DEFEITOS.md) e [PLANO_CORRECAO.md](PLANO_CORRECAO.md).
Não há aprovação geral de todos os cenários da auditoria. A migração 136 foi
posteriormente aplicada ao banco oficial por solicitação expressa, com
verificação de persistência e idempotência registrada em [DEFEITOS.md](DEFEITOS.md).

**Regressão para publicação em 16/10/2026:** suíte completa executada com
**1.617 aprovações, zero falhas, zero erros e 17 casos ignorados pelas condições
preexistentes**, além de quatro subtestes aprovados. Os dois scripts de feedback
também passaram. O detalhamento dos casos condicionais e das correções do
ambiente de teste consta no fechamento de [DEFEITOS.md](DEFEITOS.md).
A publicação segue exclusivamente `scripts/deploy-vm.ps1`, com verificação
posterior da VM; este resultado de regressão não equivale a homologação integral.

Data: 15/10/2026. Referência: branch `main`, commit `26b1b6c9211279225200c8f63f488dae7846603f`. Nenhum código da aplicação corrigido, nenhuma publicação, nenhuma escrita de teste em dados oficiais. Credenciais existentes foram usadas com sucesso no login normal; **autenticação não é o bloqueio atual**.

## A. Resumo executivo

O achado mais grave é a **perda das demais camadas de um GeoPackage ao salvar um atributo de apenas uma delas**. A reprodução ocorreu exclusivamente na cópia sintética descartável. Há também dois problemas de identificação: o explorador rejeita as quatro camadas já importadas, e a API em processo novo devolve a primeira camada para os outros identificadores.

Outras divergências reproduzidas: seleção por localização duplica feições; importador rejeita GeoTIFF UInt16 com NoData; campos lat/long recebem coordenadas UTM; seleção com chave desconhecida processa toda a camada; a UI oferece graus em buffer, mas o backend recusa; orientação sem camada pode ficar escondida. Seeds recém-instalados apresentam função inválida e fluxo validado que falha ao executá-la. Detalhes e limites em [DEFEITOS.md](DEFEITOS.md).

Fluxos com evidência favorável limitada: os 43 algoritmos nativos chegaram ao término de pelo menos um job pelo backend real isolado; 34 arquivos foram baixados do SFTPGo e reabertos; 40 de 41 comparações independentes passaram. Passaram os casos de buffer analítico, soma/limiar/inversão raster com o importador novo, estatística zonal conhecida, rejeição de grades desalinhadas, edição de camada única com revisão, cancelamento entre etapas e recuperação posterior. Isso **não aprova os controles inteiros nem os 43 algoritmos em todos os cenários**.

O serviço original 8083 autentica e usa configuração apontando para banco/storage compartilhados. Para escrita foram criados serviços próprios em loopback: aplicação 18084, PostgreSQL/PostGIS 15439 e SFTPGo 18095. Uma segunda aplicação 18085 verificou leitura sem cache e foi encerrada. A montagem do banco executou 102 migrações com sucesso e registrou 32 erros, principalmente em AHP/hierarquização; não se presume equivalência completa com produção.

O Edge ficou indisponível durante a etapa isolada; a última descoberta de superfícies retornou zero navegadores. Antes disso, a extensão também recusou seleção de arquivo por falta de acesso a URLs de arquivos. Permissões não foram modificadas. Seguiram-se os testes independentes pela API real.

## Cobertura declarada

| Medida | Resultado |
|---|---:|
| Registros de controles observados no DOM | 425 |
| Candidatos adicionais extraídos estaticamente | 274, com possíveis sobreposições |
| Total único completo de controles | Não determinado |
| Controles distintos com acionamento UI confirmado | Pelo menos 84; contagem exaustiva pendente |
| Ferramentas nativas | 43 |
| Funções/fluxos da instância original com formulário aberto | 8 / 5 |
| Operações nativas com execução completa por UI + backend | 0; abertura não equivale a execução |
| Algoritmos distintos executados por API real | 43 |
| Cenários na matriz provisória | 1.089 |
| APROVADO / FALHOU | 189 / 15 |
| BLOQUEADO / NÃO TESTADO / NÃO APLICÁVEL | 229 / 656 / 0 |

Os totais misturam cenários de abertura, API, referências numéricas e sondas AST, sempre identificados pelo método. Não são percentual de aprovação do produto. A matriz ainda não é exaustiva: deduplicação, controles condicionais, cenários de integração e leitura integral permanecem pendentes.

## B–J. Entregáveis

| Item | Arquivo | Situação |
|---|---|---|
| B — fundamentação | [FUNDAMENTACAO.md](FUNDAMENTACAO.md), ambiente-sanitizado.json | Referências consultadas; lacunas declaradas |
| C — controles | [inventario-controles-dom.json](inventario-controles-dom.json), controles-candidatos.json | Parcial, IDs estáveis; não completo |
| D — toolboxes | [inventario-ferramentas.json](inventario-ferramentas.json), cobertura-toolboxes.json | 43 nativas cruzadas com API; 13 customizadas identificadas |
| E — testes | [matriz-testes.csv](matriz-testes.csv), matriz-testes.json | 1.089 cenários provisórios com estado único |
| F — defeitos | [DEFEITOS.md](DEFEITOS.md) | Reprodução, impacto, causa e regressão |
| G — evidências | [EVIDENCIAS.md](EVIDENCIAS.md), evidencias/ | DOM, imagens, respostas HTTP, arquivos e hashes |
| H — reprodução | [REPRODUCAO.md](REPRODUCAO.md), scripts/, dados/ | Somente ambiente AUDIT |
| I — correções | [PLANO_CORRECAO.md](PLANO_CORRECAO.md) | Propostas, nenhuma executada |
| J — cobertura | [COBERTURA_PENDENCIAS.md](COBERTURA_PENDENCIAS.md), cobertura.json | Incompleta, com retomada explícita |

Registro dos serviços e arquivos criados em [ARTEFATOS.md](ARTEFATOS.md). Leitura de fonte em [LEITURA_CODIGO.md](LEITURA_CODIGO.md). Não há aprovação geral da bancada.
