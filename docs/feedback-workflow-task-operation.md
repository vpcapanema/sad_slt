# Feedback hierárquico do SICARD

Implementação local no modal `ProcessFeedbackSystem` existente. Não há outro
modal de progresso nem outro canal de acompanhamento.

## Apresentação aprovada

O corpo do acompanhamento mostra o ícone do fluxo e seu nome centralizados,
seguido da orientação com ícone de informação. Três linhas independentes exibem
a atividade atual, a etapa e o processo, nessa ordem. Cada linha tem uma frase
informativa e uma barra com a mesma largura das demais, sem rótulos técnicos ou
cartões aninhados. A operação em execução mais recente é apresentada; as demais
continuam preservadas no snapshot, sem conclusão implícita.

O tempo decorrido fica centralizado. Os blocos de situação, etapa atual e aviso
de ausência de atualização não são apresentados. “Detalhes da execução” começa
recolhido e recebe apenas `diagnostico_tecnico` ou `erro` do snapshot; logs,
contagens e nomes da hierarquia não são copiados para esse espaço. Sem diagnóstico
adicional, aparece uma mensagem neutra. Textos são inseridos com `textContent`.

Chamadores legados continuam aceitos e usam as medidas disponíveis na mesma
estrutura visual, sem inventar medidas para níveis não informados. As confirmações
de início e cancelamento compartilham título e ícone centralizados no corpo,
altura adaptada ao conteúdo e rolagem em telas pequenas. Promessas, teclado,
campos obrigatórios e confirmação explícita mantêm o comportamento anterior.
Sucesso, parcial e erro recebem apenas centralização do título e mensagem principal.

`documentacao/feedback-hierarquia.html` utiliza diretamente o componente da
aplicação, sem renderizador ou estilos próprios para os modais.

Validação desta apresentação: 50 testes Python de feedback aprovados; suítes
Playwright `feedback-hierarquia.cjs`, `feedback-sigma.cjs` e
`progresso-eventos.cjs` aprovadas. Foram verificados alinhamento e largura das
barras, detalhes sem repetição, troca de job, confirmação/cancelamento, entrada
obrigatória e SSE real com reconexão. Capturas locais em
`outputs/feedback-hierarquia-mobile.png` e `outputs/feedback-confirmacao-mobile.png`.

## Contrato

Snapshots de polling e SSE incluem `workflow`, com `id`, `nome`, `estado`,
`percentual` e `tasks`. Cada task contém `workflow_id` e `operations`; cada
operation contém `task_id`, estado, nome, detalhe, percentual e medidas.
IDs não dependem de nomes. A revisão pertence ao snapshot completo do job.
O estado estrutural é mantido separadamente dos logs (2.000 no controle;
250 transmitidos). Uma reconexão reconstrói também operações fora da retenção.

Os campos planos, callbacks textuais e endpoints existentes permanecem.
`mensagem`/`detalhe` atualizam apresentação; **não iniciam nem concluem trabalho**.
O início agora é `iniciar_operacao`; o context manager `operacao` publica início,
medidas por ID e término normal ou excepcional. `contexto` propaga capacidades,
inclusive para wrappers legados cujo `concluir` está ligado ao controle.
`concluir_fase` confirma a task explicitamente; trocar de fase não a conclui.

Extração, municipal e elegibilidade usam as fases lógicas já existentes como
tasks. Leituras e operações instrumentadas são filhas dessas fases.
Jobs genéricos têm a task de execução e operações iniciadas/concluídas nos
checkpoints reais; callbacks de texto internos são detalhes, não nanotarefas
inventadas. Modelos acrescentam tasks por invocação real de algoritmo, inclusive
em funções e iterações. Bancada de arquivos e prévia usam sua ação concreta como
operation, mantendo medições recebidas sem transformar mensagens em entidades.

## Agregação

- Operation: `feitas / total * 100`, limitado a 100. Dados não numéricos,
  negativos, não finitos ou total não positivo produzem `null`.
- Task: uma medida explícita de fase prevalece; caso contrário, média de pesos
  iguais das operações conhecidas, somente se todas têm medida. Tasks planejadas
  pendentes contribuem com zero. Término explícito normal confirma 100.
- Workflow: média de pesos iguais das tasks planejadas/conhecidas, quando todas
  têm medida. Término normal confirmado pelo executor confirma 100 do workflow.
  Erro, cancelamento e parcial não forçam 100.
- Trabalho descoberto pode aumentar o denominador e reduzir o percentual.
  Não há máximo histórico, avanço por tempo nem estimativa de tempo restante.
  Uma medida de 100 não implica estado concluído.

O conjunto de operações pode ser aberto durante a execução. Por isso, 100 das
operações conhecidas ainda pode coexistir com uma task em execução. Se uma
operação não tem total, sua barra é indeterminada. O estado é sempre mostrado
separadamente da medida.

Encerrar o workflow não converte operações abertas em sucesso: ficam
interrompidas (ou com o erro/cancelamento confirmado); tasks pendentes ficam
não executadas. Operações já concluídas preservam o resultado. Um job que retorna
explicitamente `status: parcial/partial` ou `_status: partial` é publicado como
parcial e o controlador de resultado respeita esse estado.

## Ciclo de vida e transporte

Abrir uma execução inicializa o DOM e limpa histórico, medidas e canais anteriores.
Ocultar/fechar acompanhamento ativo mantém o job e o canal; o botão “Ver
acompanhamento” reabre a mesma estrutura. Expansão, rolagem e elementos da
área de detalhes são preservados durante atualizações. As três linhas de progresso
reutilizam os mesmos elementos do DOM.

O botão Cancelar pede confirmação; uma requisição aceita permanece pendente até
o backend confirmar o estado. Falha da requisição permite tentar novamente.
Cancelar não aborta arbitrariamente bibliotecas nativas nem gravações.

O polling continua sob responsabilidade dos chamadores existentes. Com SSE,
revisões novas de polling são aceitas; revisões repetidas/antigas são descartadas.
Eventos sem revisão não substituem SSE ativo. Trocar de job fecha o canal anterior;
eventos de jobs abandonados são ignorados até iniciar explicitamente outro
acompanhamento. Um snapshot terminal impede revisões tardias de alterar o estado.
O SSE fecha em concluído, parcial, erro, cancelado ou interrompido.

Resultados atrasados de streams/fetch e temporizadores de outra execução não
abrem modais sobre a execução atual. O término remove listeners de rede, canal e
monitor de atividade. Contato com o servidor e avanço estrutural são distintos.
O resultado final continua sendo apresentado pelo chamador que possui os dados
completos, usando os modais de sucesso/parcial/erro já existentes.

## Verificação local

`tests/test_feedback_hierarquia.py` cobre vínculos, nomes repetidos, callbacks
aninhados/concorrentes, agregação, totais inválidos, término, erro, cancelamento,
parcial, retenção e reconstrução SSE. As regressões de controle, extração,
elegibilidade, jobs municipais, modelos e bancada usam fixtures sintéticas.

`tests/browser/feedback-hierarquia.cjs` verifica o modal com Playwright e APIs
simuladas. `feedback-sigma.cjs` cobre os contratos legados. `progresso-eventos.cjs`
usa um servidor FastAPI local e SSE real; no Windows, configurar
`SICARD_TEST_PYTHON` com o Python da `.venv`.

Limites: snapshots dos jobs em memória sobrevivem a reconexões de navegador,
mas não ao reinício do processo Python. A elegibilidade já possui persistência
própria e mantém esse mecanismo. Ausência de contato não é confirmação de falha
nem cancelamento. Algoritmos nativos sem medição continuam indeterminados.
Nenhum teste deste trabalho exige execução de produção, deploy ou push.

## Arquivos envolvidos

- Estado e transporte: `api/services/feedback_hierarquia.py`,
  `controle_processamento.py`, `feedback_operacao.py`, `progresso_eventos.py`.
- Produtores: `api/services/extracao_atributos.py`, `geoprocessamento_jobs.py`,
  `geoprocessamento_engine.py`, `bancada_arquivos.py`, `entrada_previa_jobs.py`,
  `base_municipal.py`, `municipal_layer.py`, `elegibilidade_processamento.py`.
- Interface: `assets/js/process_feedback_unified.js`,
  `assets/css/process_feedback_system.css`, `geoespacial/geoprocessamento.js`,
  `geoespacial/geoprocessamento-modeler.js`, `geoespacial/bancada-arquivos.js`,
  `geoespacial/extracao-atributos/api.js`.
- Testes: `tests/test_feedback_hierarquia.py`, `test_controle_processamento.py`,
  `test_progresso_eventos.py`, `test_feedback_extracao_detalhado.py`, `test_feedback_processos.py`,
  `tests/conftest.py`, `tests/browser/feedback-hierarquia.cjs`,
  `feedback-sigma.cjs`, `progresso-eventos.cjs`, `progresso-eventos-server.py`.
- Evidência visual: `outputs/feedback-hierarquia-mobile.png`.

As rotas prioritárias foram inspecionadas; continuam usando os mesmos endpoints
e controles de acesso. Não foi necessário duplicar ou substituir suas rotas SSE.

## Resultado da validação em 20/10/2026

- Suíte combinada: **161 testes aprovados**, 12 avisos de dependências
  (Starlette/httpx e leitura de GeoPackage/GDAL), sem falhas.
- Playwright: `feedback-hierarquia.cjs`, `feedback-sigma.cjs` e
  `progresso-eventos.cjs` aprovados. O último inicia um servidor FastAPI isolado
  e verifica SSE real, desconexão, polling e reconexão.
- `node --check` aprovado no controlador e nos chamadores JS alterados.
  `git diff --check` sem erros; apenas avisos de conversão LF/CRLF do Git.
- A suíte ampliada revelou contaminação de `tempfile.tempdir` entre fixtures;
  `tests/conftest.py` agora restaura esse estado ao terminar cada fixture.
- Os testes precisaram executar fora do sandbox do Windows: dentro dele,
  `asyncio` bloqueava na criação de socket interno de loopback e o Chromium
  instalado no perfil do usuário não era encontrado.

As alterações iniciais dos templates e CSS de hierarquização foram preservadas.
Foram observados commits periódicos de outro processo durante a sessão; este
trabalho não executou commit, checkout, merge, cherry-pick, push ou deploy.
