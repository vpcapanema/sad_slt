# Feedback global SICARD

O componente compartilhado `assets/js/feedback.js`, carregado por `base_conteudo.html`, distingue o **estado** (informação, sucesso, aviso, erro) do **modo de apresentação**. Páginas que usam `SLTFeedback` herdam os comportamentos abaixo. Não são substituídos automaticamente componentes de aplicações externas, como o cliente nativo do storage.

| Evento | Componente |
| --- | --- |
| Seleção, alternância ou visibilidade | Atualização do próprio controle ou conteúdo; sem mensagem redundante |
| Campo inválido | `campo(elemento, mensagem)`; validação nativa apresenta mensagens associadas e resumo navegável |
| Operação curta | `carregamento(elemento, título)`, restrito à área afetada; desaparece após a resposta |
| Sucesso simples | `success(mensagem)`; notificação sem foco, sem botão OK obrigatório |
| Falha contextual | `contextual(elemento, 'error', mensagem, {action})`, persistente e com recuperação |
| Aviso geral ou erro sem campo conhecido | `notify`, `info`, `warning`, `error`; notificação sem bloquear a página |
| Perda de dados ou decisão necessária | `confirmar({message, detail, confirmLabel, danger})` |
| Entrada curta de informação | `solicitar({title, label})`, com erro junto ao campo |
| Processo longo | `processo(título, {cancelar, restaurar, target})`; painel persistente, independente de outras operações |

Notificações repetidas são deduplicadas. Sucesso/informação sem ação podem desaparecer após sete segundos; o tempo pausa com hover, foco ou aba oculta. Avisos, erros e mensagens com ação permanecem disponíveis. `notify(tipo, mensagem, {action:{label, run}})` permite oferecer Desfazer. Mensagens contextuais não roubam foco. Os diálogos prendem a navegação por Tab, dão precedência a Cancelar em ações perigosas e restauram o foco ao fechar. Cor não é o único indicador de estado.

A API `acao` usa carregamento contextual por padrão; cálculos longos declaram `acompanhamento:true`. Confirmação é opcional e explícita. Sucesso só é anunciado depois que `executar` resolve. As confirmações existentes de publicação, exclusão, substituição de resultados e decisões gerenciais são preservadas.

Cada processo mantém seu painel e histórico. **Recolher acompanhamento não cancela**; é possível reabrir o mesmo painel. A conclusão não captura o foco. As duas barras indicam tarefa atual e processo geral; recebem valores reais via `progresso(geral, etapa, tarefa)` ou `acompanhar(job)`. Sem medição, o indicador é indeterminado, sem porcentagem fabricada. Progresso por contagem de etapas não representa estimativa de tempo. Registros de atividades distintas não são misturados.

O botão Cancelar só é habilitado com uma implementação de interrupção fornecida pelo serviço. A solicitação permanece pendente até a confirmação; só então o sinal é abortado e `restaurar` é chamado. Falha de cancelamento preserva o acompanhamento e o resultado real. Serviços sem endpoint de cancelamento continuam informando essa limitação; o componente visual não cria uma capacidade inexistente no backend.

Integrações revisadas: validação e navegação do extrator, leituras de tabelas, autenticação do envio ao storage, preparação das bases, hierarquização e fila de PDFs do SEI. Esta última mantém resultados consultáveis sem exigir dispensar uma mensagem para analisar o próximo documento. O algoritmo nativo de upload do storage permanece intacto.

Validação automatizada: `tests/browser/feedback-global.cjs` cobre foco, concorrência, cancelamento e componentes; `tests/browser/feedback-integracao.cjs` cobre o fluxo na página de extração com APIs simuladas; `tests/test_feedback_processos.py` cobre contratos dos consumidores. Não equivale a executar fluxos de produção de todos os módulos.

Referências: [IBM Carbon](https://carbondesignsystem.com/patterns/notification-pattern/), [Google Material](https://codelabs.developers.google.com/codelabs/material-communication-guidance), [GOV.UK](https://design-system.service.gov.uk/components/error-summary/) e [W3C](https://www.w3.org/WAI/ARIA/apg/patterns/alert/).
