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
| Processo com etapas | `ProcessFeedback.iniciarCadastro({title, subtitle, tasks, onCancel})` | Overlay de progresso |
| Etapa em curso | `tarefa(nome, descricao)` / `proc.tarefaAtual(...)` | Card "2 de 5", segmento ativo e linha no log |
| Etapa concluída | `concluirTarefa(nome, mensagem)` | Lista de concluídas, segmento verde e avanço automático da barra |
| Linha no log | `etapa(msg)`, `log(msg, 'info'\|'success'\|'warning'\|'error')` | Log com hora |
| Percentual real | `progresso(pct)` | Barra |
| Desfecho | `sucesso(data)`, `parcial(data)`, `erro(data)` | Modal de resultado; o progresso fecha sozinho |
| Resultado sem processo | `StatusFeedback.sucesso/parcial/erro(data)` | Modal de resultado |
| Aviso | `Notify.success/info/warning/error/loading(titulo, mensagem, {duration})` | Aviso no centro da tela |

O cabeçalho dos modais funciona como semáforo: azul enquanto o processo roda, verde no sucesso, amarelo no parcial (concluído com ressalvas) e vermelho no erro. O título do cabeçalho é sempre o da ação (`actionTitle`); o título e a mensagem do desfecho aparecem no corpo.

O modal de resultado aceita:

- `summary`: lista de `{label, value, icon}`. Sem ela, o resumo é montado a partir de `id`, `nome`, `tamanho`, `protocol` e do tempo decorrido.
- `subprocesses`: lista de `{name, status: success|warning|skip|error, detail, action_label, action_url}`. No SICARD, `action` (uma função) no lugar de `action_url` executa código e fecha o modal; é assim que aparecem "Ver resultados" e "Ver ranking".
- `solution` e `details` no modal de erro.

O botão OK do modal de erro baixa um relatório `.txt` com o erro, os detalhes e os dados brutos.

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
- Monitor de atividade: 30 s sem notícias do servidor registram "Aguardando resposta do servidor...".
- `showNotification(tipo, mensagem)` (a ponte legada do SIGMA) cai no `Notify`.

## Integração com os jobs do SICARD

Os jobs do SICARD mandam retratos do estado em vez de eventos. `ProcessFeedback.acompanhar(job)` converte cada retrato nos mesmos eventos do SIGMA:

| Campo do job | Evento |
| --- | --- |
| `etapa_atual` / `etapa` / `atividade` (por `tarefa_id`) | `task` |
| log `sucesso` da tarefa em curso | `task_complete` |
| demais `logs` / `etapas` (uma vez por `sequencia`) | `log` com o nível |
| `percentual` | `progress` |
| `concluidas/total`, `progresso_tarefa` | Linha de informação ("Etapa 2 de 3 · Tarefa atual: 65%") |

Com `eventos_url`, o canal SSE do job (evento `progresso`) atualiza o overlay sozinho. Enquanto o canal entrega, retratos atrasados do polling não sobrescrevem o estado. Sem rede, o canal é fechado e o polling volta a valer; com a rede de volta, ele reabre. O desfecho continua com quem chamou, porque é quem conhece o resultado.

`ProcessFeedback.permitirCancelamento(fn|null)` liga ou desliga o botão CANCELAR conforme o job aceita interrupção (`cancelavel`). O callback pede o cancelamento ao servidor e informa o resultado pelo `Notify`.

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
