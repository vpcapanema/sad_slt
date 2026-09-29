# Feedback do SICARD (sistema do SIGMA-PLI)

O SICARD usa o mesmo sistema de feedback do SIGMA-PLI (Process Feedback System unificado v3.0 e Notify). O sistema anterior do SICARD (`SLTFeedback`, `assets/js/feedback.js` e `assets/css/feedback.css`) foi removido, e todas as telas usam as APIs abaixo.

| Arquivo | Conteúdo |
| --- | --- |
| `assets/js/notification_system.js` | `window.Notify` (avisos) e a ponte legada `showNotification` |
| `assets/js/process_feedback_unified.js` | `ProcessFeedback`, `StatusFeedback` e os modais de progresso, resultado, confirmação e credencial |
| `assets/css/process_feedback_system.css` | Visual dos modais, reconstruído do SIGMA com a paleta PLI do SICARD |

`base_conteudo.html` carrega os três arquivos. Páginas que não estendem a base (`analise_demanda.html` e `_geoprocessamento.html`) incluem os mesmos arquivos. No SIGMA, o HTML dos modais vem do include `componente_process_feedback_system.html`. No SICARD, o próprio script injeta esse componente, então ele funciona em qualquer página e iframe. Carregar os scripts duas vezes não duplica o componente.

## Componentes

| Situação | API | Apresentação |
| --- | --- | --- |
| Decisão antes de agir | `ProcessFeedback.confirmar({title, message, warning, confirmLabel, cancelLabel, danger})` → `Promise<boolean>` | Modal de confirmação; `danger` deixa o cabeçalho vermelho e o foco inicial em Cancelar |
| Nome ou texto curto | `ProcessFeedback.confirmar({title, message, input:{label, defaultValue}})` → `Promise<string\|null>` | Mesmo modal, com campo obrigatório |
| Ação restrita a gestor/admin | `ProcessFeedback.confirmarGestor(opts)` / `confirmarAdmin(opts)` → `{confirmed, password}` | Modal de credencial |
| Processo com etapas | `ProcessFeedback.iniciarCadastro({title, subtitle, tasks, onCancel})` | Modal compacto de acompanhamento |
| Etapa em curso | `tarefa(nome, descricao)` / `proc.tarefaAtual(...)` | Macropasso no corpo, atividade corrente abaixo e histórico recolhível |
| Etapa concluída | `concluirTarefa(nome, mensagem)` | Atividade corrente removida, registro no histórico e avanço automático |
| Linha no log | `etapa(msg)`, `log(msg, tipo, em)` | Micropasso corrente substituído pela próxima mensagem; histórico integral recebido com horário de origem |
| Percentual real | `progresso(pct)` / `progressoTarefa(pct, feitas, total, unidade)` | Barra da tarefa com granularidade informada pelo servidor; progresso geral continua registrado |
| Desfecho | `sucesso(data)`, `parcial(data)`, `erro(data)` | Modal de resultado; o progresso fecha sozinho |
| Resultado sem processo | `StatusFeedback.sucesso/parcial/erro(data)` | Modal de resultado |
| Aviso | `Notify.success/info/warning/error/loading(titulo, mensagem, {duration})` | Aviso no centro da tela |

O cabeçalho dos modais funciona como semáforo: azul enquanto o processo roda, verde no sucesso, amarelo no parcial (concluído com ressalvas) e vermelho no erro. O título do cabeçalho é sempre o da ação (`actionTitle`); o título e a mensagem do desfecho aparecem no corpo. Progresso, sucesso, parcial e erro usam a mesma dimensão; confirmação/entrada e credenciais formam outros dois grupos de dimensões compartilhadas. Em telas pequenas os componentes encolhem proporcionalmente e detalhes extensos rolam no corpo, sem deslocar cabeçalho e rodapé.

No acompanhamento, o macropasso é atualizado pela tarefa, a caixa apresenta a atividade corrente recebida (a mensagem anterior sai quando chega a próxima ou a tarefa termina) e a barra da tarefa exibe o percentual e as medidas disponíveis. Sem medição da tarefa, a barra é indeterminada ou utiliza o avanço geral das etapas quando este for informado, com rótulo correspondente. O histórico recebido, as operações concluídas e o download JSON continuam disponíveis em “Histórico recebido”, inicialmente recolhido. O botão de cancelamento aparece somente quando a operação o permite e não encerra o acompanhamento até confirmação do servidor.

O modal de resultado aceita:

- `summary`: lista de `{label, value, icon}`. Sem ela, o resumo é montado a partir de `id`, `nome`, `tamanho`, `protocol` e do tempo decorrido.
- `subprocesses`: lista de `{name, status: success|warning|skip|error, detail, action_label, action_url}`. No SICARD, `action` (uma função) no lugar de `action_url` executa código e fecha o modal; é assim que aparecem "Ver resultados" e "Ver ranking".
- `solution` e `details` no modal de erro.

Nos resultados, “Ver detalhes” abre o painel inicialmente recolhido (resumo e subprocessos no sucesso/parcial; erro e orientação na mesma caixa no erro). A ação de subprocesso continua acessível dentro do painel. O erro oferece “Baixar relatório de erro” dentro dos detalhes, gerando o mesmo `.txt` com erro, detalhes e dados brutos; o X apenas fecha o modal. A reabertura recolhe novamente os detalhes.

Como no SIGMA, avisos e erros do `Notify` só fecham por ação do usuário. Sucesso e informação usam `duration` onde a tela pede (extração e bancada: 5 a 7 s). Mensagens do servidor entram como texto; HTML só com `{html: true}`.

## Estratégia de captura (igual ao SIGMA)

- `ProcessFeedback.processar(fetchFn, onSuccess, onError)` lê a resposta:
  - `text/event-stream` ou `application/x-ndjson` passam pelo roteador de eventos;
  - JSON com `ok` abre o modal de sucesso;
  - resposta de erro abre o modal de erro;
  - falha de rede também abre o modal de erro.
- `connectStream(fetchFn, opts)` e `startSSE(url, opts)` abrem o overlay e consomem streams.
- Eventos aceitos: `task`, `log`/`step`, `progress`, `task_complete`, `done`/`success`, `partial` e `error`.
- Erros do FastAPI (`detail` em lista com `loc`/`msg`) viram linhas legíveis, por exemplo "pasta: campo obrigatório".
- Monitor distingue tempo sem novo avanço do tempo sem contato. Polling idêntico não representa trabalho novo. Heartbeat/conexão não incrementa progresso.
- `showNotification(tipo, mensagem)` (a ponte legada do SIGMA) cai no `Notify`.

## Integração com os jobs do SICARD

Os jobs do SICARD mandam retratos do estado em vez de eventos. `ProcessFeedback.acompanhar(job)` converte cada retrato nos mesmos eventos do SIGMA:

| Campo do job | Evento |
| --- | --- |
| `etapa_atual` / `etapa` / `atividade` (por `tarefa_id`) | `task` |
| log com `tipo=concluido` e `tarefa_id`, ou `tarefa_estado=concluido` | Conclusão explícita da operação; trocar de tarefa não conclui a anterior |
| demais `logs` / `etapas` (uma vez por `sequencia`) | `log` com o nível |
| `percentual` | `progress` |
| `concluidas/total`, `progresso_tarefa` | Linha de informação ("Etapa 2 de 3 · Tarefa atual: 65%") |

Com `eventos_url`, o canal SSE do job (evento `progresso`) atualiza o overlay sozinho. Enquanto o canal entrega, retratos atrasados do polling não sobrescrevem o estado. Sem rede, o canal é fechado e o polling volta a valer; com a rede de volta, ele reabre. O desfecho continua com quem chamou, porque é quem conhece o resultado.

`ProcessFeedback.permitirCancelamento(fn|null)` liga ou desliga o botão CANCELAR conforme `cancelavel`. O callback deve retornar sua Promise: aceitar o pedido ainda não confirma a interrupção. O modal permanece acompanhando com “Cancelamento solicitado” até `status=cancelado` ou `proc.confirmarCancelamento()`. Recusa/erro de rede restaura a tentativa e mantém o acompanhamento; conclusão concorrente segue o desfecho real. Não interromper gravações não canceláveis.

## Diferenças em relação ao arquivo original do SIGMA

- O componente é injetado pelo script, sem include de template.
- O componente e o `Notify` acompanham `<dialog>` modais abertos (a *top layer* do navegador) e voltam ao `body` quando o diálogo fecha ou é removido.
- Os modais recebem o foco ao abrir e o devolvem ao fechar. A confirmação prende o Tab. O foco inicial vai para Cancelar em ações perigosas e para o campo no modo entrada. Esc fecha confirmação e resultado.
- Um processo que termina não fecha o overlay de outro que já começou (no SIGMA, o `setTimeout` do desfecho fechava o overlay compartilhado).
- `processar` também trata o último evento do stream quando ele não termina com quebra de linha (no SIGMA, esse evento se perdia).
- `Notify` insere as mensagens como texto.
- O relatório de erro é `sicard_erro_<data>.txt`.

## Validação automatizada

- `tests/test_feedback_processos.py`: contratos dos consumidores (fases, upload, SEI) e ausência do sistema antigo.
- `tests/browser/feedback-global.cjs`: todos os modais, foco, Tab, Esc, entrada obrigatória, cancelamento, retrato de job, relatório de erro, credencial, `Notify`, diálogo nativo e celular.
- `tests/browser/feedback-sigma.cjs`: captura com `processar` (sucesso, erro do FastAPI, falha de rede), NDJSON, `connectStream`, SSE e canal de eventos de job.
- `tests/browser/progresso-eventos.cjs`: canal SSE real do worker, polling atrasado, queda da rede e troca de job.
- `tests/browser/feedback-geoespacial.cjs`: página real com formulários em `<dialog>`, erro, cancelamento e aviso de campo.


## Granularidade da extração e contrato de acompanhamento (26/09/2026)

`api/services/feedback_operacao.py` fornece `operacao(progress, mensagem)` e `contexto(progress, nome)`. A operação publica início antes do trabalho, medições observadas dentro do bloco e `concluir(tarefa_id, mensagem)` somente no retorno normal. Exceção/cancelamento não publica sucesso. O callback de progresso retorna o identificador estável e propaga `detalhe`, `tarefa`, `concluir`, `verificar`, `progresso_fase` e `fase` quando presentes. Os checkpoints consultam cancelamento cooperativo a cada passagem; atualizações intermediárias são agrupadas a até uma a cada 250 ms por operação, preservando início/medição final/término. Esse intervalo é uma política inicial, não uma garantia de latência durante chamadas nativas.

A extração informa CRS/reprojeção em cópia, validação/correção geométrica, preparação de camada/índice, consulta espacial, leitura do overlay, medidas dos pares, vínculos, campo/regra de consolidação, conferência da saída, persistência e arquivos do pacote. Identificadores de camada/base/lote acompanham as mensagens. SQL/OGR e escritas monolíticas sem medição interna são apresentados como indeterminados, até o retorno. Não há porcentagem por relógio nem ETA inventada. A junção esquerda separa pares confirmados por `ST_Intersects` e feições sem correspondência; não apresenta `len(pares)` como candidatas do índice.

Campos adicionais compatíveis com snapshots anteriores:

| Campo | Contrato |
| --- | --- |
| `revisao` | Versão crescente do estado do worker; ordenar snapshots de polling e SSE pelo mesmo contador. O `id` do SSE é uma versão de transporte distinta. |
| `tarefa_estado` | `running`, `concluido`, `erro` ou `cancelado`. `progresso_tarefa=100` não encerra uma tarefa que ainda está `running`. |
| `logs[].tarefa_id` | Identidade da operação à qual pertence a mensagem. |
| `logs[].tipo` | `iniciado`, `detalhe`, `concluido`, `cancelamento_solicitado`, `erro` ou `cancelado`. |
| `logs[].em` | Horário UTC de origem. A UI formata para o usuário e preserva o valor original no download. |
| `historico_inicio` | Primeira sequência incluída na janela transmitida; lacunas são mostradas explicitamente. |

O controlador mantém até 2.000 logs em memória e transmite até 250 em cada snapshot; o SSE coalesce estados em fila de tamanho 1. Isso privilegia o estado corrente e **não oferece replay ilimitado ou auditoria durável completa**. Lacunas de sequência aparecem no histórico. O navegador limita o DOM a 250 mensagens, a lista de operações concluídas a 100 e o histórico recebido para download a 5.000 mensagens, informando descartes. O arquivo baixado declara que é o recorte recebido naquele navegador. O banco não foi ampliado para guardar uma nova trilha de eventos.

A área de mensagens mantém resumo da operação/detalhe atual, com região viva educada e atualização agrupada; o histórico integral recebido não é anunciado linha a linha. Concluídas ficam recolhíveis e textos podem quebrar linha. “Seguir atualizações” pode ser desligado e a rolagem manual para o passado pausa o acompanhamento automático. A barra global se chama “Avanço das etapas”: ela mede frações das fases, não tempo restante.

## Verificação da evolução

- `tests/test_feedback_extracao_detalhado.py`: operações reais sobre fixture geoespacial local, contagem com e sem correspondência, preservação geométrica, estado indeterminado, término explícito, cancelamento e liberação do índice, coalescência e retenção, arquivos do pacote.
- `tests/browser/feedback-auditoria.cjs`: contrato novo em navegador isolado, horário do servidor, lacuna, ordem de versões, cancelamento pendente/recusado/confirmado, histórico, limites de DOM e rolagem.
- Regressões compartilhadas: `tests/test_controle_processamento.py`, `tests/test_progresso_eventos.py`, `tests/test_feedback_processos.py`, testes de estatísticas/OGR/enriquecimento/lote e browser global/SIGMA/SSE.

Consulte `AUDITORIA_FEEDBACK_PROCESSAMENTO.md` para resultados efetivamente executados e limitações. Teste local não equivale à validação de proxy de produção, leitor de tela manual ou desempenho em bases grandes.

A ponte React municipal em `plugins/municipal-layer/sicard/main.jsx` também deve devolver a Promise de cancelamento: ela aguarda o job, propaga recusas ao controlador e só chama `confirmarCancelamento` após confirmação. A fonte e o bundle servido precisam permanecer sincronizados pelo build SICARD.

## Feedback próprio da bancada de geoprocessamento

A bancada usa o mesmo controlador e o mesmo modal de acompanhamento das demais telas. A página `_geoprocessamento.html` carrega `process_feedback_system.css` e `process_feedback_unified.js`; `geoespacial/bancada-feedback.js` apenas preserva o namespace `gpFeedback` e encaminha o acompanhamento ao controlador compartilhado, sem substituir `window.ProcessFeedback` nem criar um painel dentro do formulário.

As operações da bancada que usam jobs canceláveis ligam o botão CANCELAR à rota de cancelamento do job. O pedido permanece pendente até o servidor confirmar `status=cancelado`; erros permitem nova tentativa. Envios ao storage e demais operações sem interrupção segura não oferecem esse botão. O histórico do processo inicia recolhido, conforme o padrão da prévia local.
