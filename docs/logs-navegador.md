# Diagnóstico local de navegador

As páginas de Elegibilidade (Fase 1), Favorabilidade (Fase 2), Priorização por
atributos (Fase 3), Gestão de hierarquizações/processos, Gestão de julgamentos,
Central de respostas e Agrupamento de demandas dispõem de logs locais no console.
Não há envio ou armazenamento de logs no servidor.

## Ativação

- Acrescentar `?sicard_logs=verbose` à URL (ou `&sicard_logs=verbose` se já houver
  parâmetros), abrir o Console do DevTools e recarregar.
- Para persistir a preferência nesta origem:
  `localStorage.setItem("sicard.browserLogs", "verbose")` e recarregar.
- Para desativar: `localStorage.removeItem("sicard.browserLogs")` e recarregar.
  `sicard_logs=off` prevalece sobre a preferência persistida nesta navegação.
- Durante a sessão: `SICARDBrowserLogs.ativar()`, `.desativar()` e `.status()`.
  Erros continuam aparecendo quando o detalhamento está desligado.
- Uma mensagem inicial no console relembra a ativação. Se o navegador bloquear
  localStorage, a opção da URL continua funcionando.

## Cobertura e privacidade

`assets/js/browser-logs.js` identifica a página e registra carregamento, ações
reais (`click`, `change`, `submit`), rejeição de validação HTML, feedbacks de
validação, falhas tratadas pelas notificações/modais e erros não tratados.
Somente controles de uma lista fixa têm identificador registrado; demais ações
informam apenas o tipo do controle. Não são lidos valores, rótulos ou textos.

HierApi, AdminAPI e as chamadas diretas das páginas utilizam explicitamente o
adaptador HTTP, sem substituir `window.fetch`, alterar opções, sinais,
credenciais, retornos ou tratamento de erros. O console mostra método, rota
redigida, identificador local da requisição, status e duração até o recebimento
dos cabeçalhos. O adaptador não consome o corpo da resposta.

As fases 1 e 2 reutilizam também o logger e o rastreamento existentes em
`geoespacial/extracao-atributos/logger.js`, encaminhados para o mesmo console
por página, incluindo progresso, validação espacial, retentativas e HTTP.
Nesse cliente a duração inclui a leitura do corpo. O comportamento da bancada
de extração fora destas páginas permanece inalterado.

Mensagens de erro, corpos, cabeçalhos, tokens, e-mails, nomes de arquivos,
geometrias, atributos, identificadores de registros, host e parâmetros de URL
não são registrados pela instrumentação. Metadados passam por listas de
permissão; caminhos dinâmicos são substituídos por `:ref`. O diagnóstico não
desativa mensagens que o navegador ou bibliotecas externas já emitam.

## Limites e testes

Os eventos de carregamento não significam conclusão de todos os pedidos
assíncronos: consultar os respectivos eventos HTTP e de operação. Cliques
registram a intenção, não confirmam persistência; conferir o status HTTP e o
feedback da ação. Requisições de imagens, tiles, bibliotecas e documentos em
iframes não são interceptadas. A captura global de erros não cancela os
eventos nativos nem substitui o console original do navegador.

`tests/test_browser_logs.py` executa o JavaScript em Node com DOM mínimo para
os sete escopos: ativação, privacidade, erros, eventos, duração/status,
preservação de requisições/respostas e integração com o logger geoespacial.
Também verifica a inclusão e a sintaxe dos templates. Não precisa de banco
ou credenciais e não realiza operações de negócio.
