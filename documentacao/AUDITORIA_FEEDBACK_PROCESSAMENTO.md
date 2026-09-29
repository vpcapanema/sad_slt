# Auditoria do feedback de processamento — SICARD

Data: 26/09/2026. Revisão inspecionada: `e73fe75b8008cbdc91fe4fda09aaa6d5fbfab5d6`.
Agente: `skills/auditar-feedback-processamento/SKILL.md`.

## Resultado da inspeção inicial

O problema requer instrumentação no backend e ajustes no componente compartilhado, não apenas alteração do HTML. Há progresso real por lote, mas ele chega depois de várias operações diferentes. Durante reprojeção, preparação do índice, consulta espacial e consolidação, o usuário pode receber apenas “Cruzando base X”. A interface ainda infere conclusão pela troca da tarefa e encerra visualmente o cancelamento antes da confirmação do servidor.

**Método:** inspeção estática do código, leitura dos testes existentes, pesquisa em fontes primárias e análise da imagem fornecida pelo usuário. Nenhum processamento, teste automatizado, banco, migração, deploy ou serviço foi executado. Não houve reprodução em navegador. Tempos, frequência real e impacto de desempenho ainda não foram medidos. As linhas abaixo referem-se à revisão inspecionada; revalidar antes de editar.

A imagem comprova a insatisfação visual: mensagem ativa genérica, detalhe anterior por lote, lista extensa de concluídas e rolagens concorrentes. Ela não permite concluir em qual chamada interna Billings estava, nem quanto tempo permaneceu nela.

## Fontes pesquisadas e aplicação

Consultadas em 26/09/2026. As metas específicas propostas para o SICARD abaixo são decisões de engenharia, não exigências universais dessas fontes.

- [W3C, entendimento de WCAG 4.1.3](https://www.w3.org/WAI/WCAG21/Understanding/status-messages): mensagens de estado precisam ser identificáveis programaticamente sem exigir mudança de foco. É explicação de critério normativo de acessibilidade.
- [W3C, técnica ARIA25](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA25): a barra não é, por si só, região viva; uma região apropriada comunica atualizações. Técnica suficiente, não implementação única obrigatória.
- [W3C APG, propriedades de valores](https://www.w3.org/WAI/ARIA/apg/practices/range-related-properties/): `aria-valuenow` deve representar valor conhecido; progresso indeterminado omite esse valor.
- [IBM Carbon, progress bar](https://carbondesignsystem.com/components/progress-bar/usage/): progresso determinado exige informação calculável; quando desconhecido, usar indeterminado. Texto auxiliar contextualiza contagens e estado. Recomendação de design, não norma SICARD.
- [WHATWG, Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html): o navegador comunica o último identificador na reconexão. Histórico recuperável exige implementação no servidor; fornecer `id` não cria replay automaticamente.
- [GDAL, Common Portability Library](https://gdal.org/en/stable/api/cpl.html): existem callbacks de progresso e progresso escalonado. Isso não implica que qualquer chamada SQL/OGR aceite callback. A disponibilidade deve ser conferida na operação utilizada antes de prometer percentual interno ou interrupção.

## Caminho efetivo das mensagens

1. `templates/paginas/geoespacial/extracao-atributos.html:7,34` marca feedback próprio e carrega `app.js`. O modal é injetado pelo componente comum; alterar apenas o template não resolve sua instrumentação.
2. `geoespacial/extracao-atributos/app.js:300-302,369-370` inicia o painel e encaminha snapshots. `processo.js:22-43` adapta acompanhamento/cancelamento. `api.js:28-47` mantém polling a cada 1,2 s e tentativas de recuperação.
3. `api/services/extracao_atributos.py:215-254` conecta callbacks ao `ControleProcessamento`, carrega entradas/bases e emite detalhes posteriores à leitura. `extracao_lote.py:71-79` acrescenta camada e encaminha contadores.
4. O caminho da imagem é compatível com `extracao_atributos_estatisticas.py:119-165`: “Cruzando”, contador inicial, preparação espacial, índice, consulta por lotes, interseções descritivas, vínculos, agregação de campos, contador e mensagem final do lote. Essa compatibilidade não identifica uma execução viva.
5. `controle_processamento.py:53-108` armazena estado/logs e publica snapshot. `progresso_eventos.py:29-78` entrega retratos SSE compactados, com fila de tamanho 1, até 250 logs e keepalive de transporte a cada 15 s.
6. `process_feedback_unified.js:1107-1189` combina SSE e polling, deduplica logs e renderiza tarefa/contadores. `:314-429` constrói cards, lista de concluídas e histórico.

## Achados priorizados

Todos os achados de código são **inspeção estática**. P1 = corrigir antes de considerar o feedback adequado; P2 = robustez e usabilidade a incluir na mesma evolução, conforme escopo.

### P1 — Suboperações caras não são anunciadas

**Evidência:** `extracao_atributos_estatisticas.py:119-165`, `_geometrias_trabalho` em `:63-70`; `extracao_ogr.py:255-293`. O mesmo rótulo cobre reprojeção, validação/correção de cópias, criação de camada SQLite com índice, escrita do lote, consulta `ST_Intersects`, cálculo das geometrias comuns, serialização de vínculos e agregação. O progresso detalhado é emitido só ao final do lote. O limite de 64 feições/200.000 vértices não limita a duração de uma feição muito complexa nem o custo da base.

**Impacto:** o usuário sabe a base, mas não a operação em andamento. `ControleProcessamento.mensagem` limpa o detalhe e a medida anterior (`controle_processamento.py:53-65`), explicando por que o detalhe de uma base é substituído por um rótulo genérico da próxima.

**Correção:** emitir antes e depois das suboperações reais; instrumentar loops de escrita, preparação e consolidação com contagens. Em `ExecuteSQL` sem callback, anunciar a consulta e estado indeterminado até retorno, sem contadores simulados. Manter contexto camada/base em cada mensagem. Em `extracao_atributos_enriquecimento.py:258-266,291-296`, publicar também antes da formação dos pares: atualmente detalhes surgem apenas depois dela.

**Aceite:** execução isolada lenta deve mostrar a operação específica antes de cada chamada bloqueante e os contadores apenas quando medidos.

### P1 — “Correspondências candidatas” é uma métrica semanticamente incorreta

**Evidência:** `extracao_atributos_estatisticas.py:165` exibe `len(pares)` como candidatas. `extracao_ogr.py:272-293` já aplica `ST_Intersects` e retorna LEFT JOIN, incluindo linhas `(entrada_pos, None)` sem correspondência. Portanto o número mistura pares confirmados e linhas sem par, e não mede os candidatos brutos do índice.

**Correção:** separar pares com `base_pos != None`, feições sem correspondência e candidatas do índice (somente se efetivamente medidas). Descrever as interseções adicionais como medidas/vínculos descritivos, pois não decidem a associação neste caminho.

**Aceite:** lote sintético com feições sem interseção não deve contá-las como correspondências; múltiplos pares devem ser diferenciados de quantidade de feições analisadas.

### P1 — Trocar tarefa equivale indevidamente a concluir a anterior

**Evidência:** `process_feedback_unified.js:1170-1180` chama `concluirTarefa(...,'Concluída')` apenas porque mudou a chave. `controle_processamento.py:53-65` incrementa `tarefa_id` para qualquer mensagem. Assim “Camada 1 de 1” ou “Analisando as relações” tornam-se tarefas concluídas quando chega uma mensagem filha, mesmo sem evento explícito de término do escopo pai. Os logs de início também são adicionados antes da conclusão inferida, alterando a ordem narrativa (`:1155-1179`).

**Correção:** distinguir fase, camada, base e operação; início de filha não encerra pai. Usar estado terminal explícito associado ao identificador da operação. A documentação `FEEDBACK_SICARD.md`, tabela de integração, ainda descreve conclusão por log de sucesso e deve acompanhar a correção.

**Aceite:** iniciar uma subtarefa não cria sucesso do pai; erro/cancelamento preservam estados corretos; conclusão só ocorre com evento correspondente.

### P1 — Cancelamento visual antecede a resposta real

**Evidência:** `process_feedback_unified.js:518-523` marca finalizado, fecha SSE/modal e escreve “Cancelado pelo usuário” antes do callback. `processo.js:33-43` então solicita e aguarda confirmação. O backend é cooperativo (`controle_processamento.py:31-50`), não interrompe automaticamente chamadas nativas. A fase de gravação torna-se não cancelável (`extracao_atributos.py:268,352`).

**Correção:** estado “Cancelamento solicitado; aguardando ponto seguro”, botão desabilitado e acompanhamento preservado. Somente `status=cancelado` confirma interrupção. Se a gravação já começou, explicar recusa e continuar acompanhando o resultado. Não prometer interrupção imediata de SQL/OGR.

**Aceite:** resposta atrasada, recusa, erro de rede e conclusão concorrente não geram confirmação falsa nem perdem acesso ao resultado.

### P2 — Histórico pode perder eventos e apresenta horário de recebimento

**Evidência:** `progresso_eventos.py:33-57` retém últimos 250 logs e descarta snapshots intermediários; `controle_processamento.py:65,75,101` limita logs em memória. Não há replay por `Last-Event-ID` nesse canal. A deduplicação em `process_feedback_unified.js:1155-1167` não sinaliza lacunas. `log()` em `:426` usa `now()` e ignora `em` do servidor.

**Impacto:** reconexão ou consumidor lento pode perder transições antigas; várias mensagens recuperadas aparentam ocorrer simultaneamente no horário local de chegada. O snapshot coalescido é apropriado ao estado atual, mas não substitui trilha completa.

**Correção:** separar snapshot e histórico por cursor; preservar timestamp do evento; informar retenção/lacuna e fornecer recuperação paginada se histórico completo for requisito. Versionar também polling para ordenar fallback. Hoje o SSE vivo impede sobrescrita por polling, mas não há comparação de versão do polling quando o canal perde vivacidade.

**Aceite:** mais de 250 eventos durante desconexão resultam em replay ou lacuna explícita; não duplicar; snapshot antigo não regride estado.

### P2 — Progresso global mede frações de fases, não tempo restante

**Evidência:** `controle_processamento.py:97-108` divide igualmente três fases. `extracao_lote.py:76` divide a fase por entradas; o motor estatístico divide por bases e feições (`:167`). Uma base complexa pode consumir quase todo o tempo com pequeno avanço global. O 0% inicial da base mede feições ainda não concluídas, não avanço interno da preparação.

**Correção:** rotular “avanço das etapas”, documentar o denominador e separar preparação indeterminada do processamento mensurável. Não estimar ETA nem pesar por duração sem evidência. A barra individual já remove `aria-valuenow` quando desconhecido (`process_feedback_unified.js:396-407`); preservar esse acerto.

**Aceite:** medidas têm escopo/unidade estáveis; tarefa nova não herda percentual; progresso desconhecido não aparece como 0% calculado; conclusão global acompanha resultado confirmado.

### P2 — Área de mensagens disputa espaço com concluídas e força rolagem

**Evidência:** `process_feedback_system.css:103,144-167` contém rolagem do corpo e do log; nomes concluídos são truncados. `process_feedback_unified.js:428` força o log ao fim a cada mensagem. Não há limite de nós DOM de logs/concluídas no caminho inspecionado. A imagem confirma a predominância visual da lista verde e duas barras de rolagem.

**Correção:** operação atual e último detalhe visíveis na própria área de mensagens, histórico com quebra integral, fases concluídas recolhíveis, seguir atualizações desativado enquanto o usuário lê mensagens antigas. Agregar atualizações de contador mantendo transições/erros; virtualização ou paginação conforme volume medido.

**Aceite:** textos longos legíveis em desktop/celular; leitura do histórico não salta; alta granularidade não causa crescimento ilimitado do DOM.

### P2 — Atividade, conexão e acessibilidade precisam de semânticas separadas

**Evidência:** `process_feedback_unified.js:48,64` já oferece `role=status` e `role=log`; isso é positivo. Entretanto cada log chama `_touch`, e atualizações de progresso também; `_startActivityMonitor` (`:539-545`) usa esse relógio para o aviso genérico de 30 s. Reaplicar snapshot idêntico pelo polling pode renovar o relógio sem trabalho novo. Keepalive SSE é comentário de transporte, não evento de operação.

**Correção:** distinguir último evento de trabalho, último contato e duração da operação. Anunciar resumo relevante por região viva, agregando contadores para não sobrecarregar leitor de tela. Não substituir transparência por repetição de avisos genéricos. Verificar comportamento real com tecnologia assistiva antes de declarar conformidade.

## Contrato proposto (não implementado)

Manter compatibilidade com os consumidores atuais enquanto se introduz contrato versionado. Separar envelope do job, snapshot corrente e eventos ordenados:

```json
{
  "schema_version": 1,
  "job_id": "<id>",
  "sequence": 123,
  "em": "<timestamp UTC do servidor>",
  "task_id": "<id estável da operação>",
  "parent_task_id": "<id da base ou fase>",
  "kind": "operation_started|operation_progress|operation_finished|warning|error|cancel_requested|cancelled",
  "state": "running",
  "context": {"entrada": "Linhas1", "categoria": "Risco", "base": "Aprm Billings"},
  "operation": "spatial_join",
  "message": "Consultando interseções espaciais do lote",
  "progress": {"completed": null, "total": null, "unit": "feicoes", "mode": "indeterminate"},
  "metrics": {},
  "cancel": {"allowed": true, "requested": false, "mode": "cooperative"}
}
```

O número 123 e o envelope são **ilustrativos**, não eventos coletados. Valores `kind` são alternativas do contrato, não uma string literal a emitir. Cada contador precisa identificar se é cumulativo ou do lote. Nunca publicar atributos pessoais, credenciais ou caminhos internos desnecessários. Estado do job, operação e resultado persistido têm responsabilidades distintas. Snapshot inclui última sequência; histórico aceita cursor e sinaliza retenção. Heartbeat usa tipo separado e não incrementa trabalho concluído.

Exemplos de mensagens propostas, com campos simbólicos, **não resultados reais**:

- “Linhas1 · Aprm Billings — Reprojetando a cópia de consulta de {crs_origem} para {crs_destino}: {feitas}/{total} geometrias.”
- “Linhas1 · Aprm Billings — Carregando {feitas}/{total} geometrias da base e preparando o índice espacial.”
- “Linhas1 · Aprm Billings — Consultando ST_Intersects no lote {inicio}–{fim}. Esta chamada não informa percentual interno.”
- “Linhas1 · Aprm Billings — Calculando medidas das interseções: {pares_feitos}/{pares_confirmados} pares.”
- “Linhas1 · Aprm Billings — Consolidando o campo {campo}, regra {regra}: {feitas}/{total} registros.”
- “Linhas1 · Aprm Billings — Lote concluído: {feicoes} feições analisadas; {pares} pares confirmados; {sem_par} feições sem correspondência.”

Só emitir contagem onde houver instrumentação real. Não anunciar reprojeção se o CRS já coincide nem afirmar preservação antes da conferência. Granularidade é identificação da operação e medida útil, não uma linha por vértice.

## Plano de implementação e validação

1. **Instrumentação:** `extracao_ogr.py`, motores de estatísticas/enriquecimento, carregamento e empacotamento. Inícios/términos e contagens dos loops já existentes, sem alterar geometria, CRS, predicado, resultado ou persistência. Escolher frequência após medir custo; preservar todos os eventos de transição/erro e coalescer apenas atualizações intermediárias.
2. **Estado e transporte:** `controle_processamento.py`, `progresso_eventos.py`, adaptadores de jobs: identidades hierárquicas, término explícito, versões e cancelamento pendente; separar histórico recuperável de snapshot compacto.
3. **Interface:** componente comum JS/CSS e `processo.js`: operação detalhada na área de mensagens, ordem/horário corretos, histórico consultável e cancelamento confirmado. Compatibilidade também com bancada, hierarquização, upload, SEI, análise de demanda e iframes documentados em `FEEDBACK_SICARD.md`.
4. **Testes isolados de comportamento:** fixture geoespacial pequena com um par, múltiplos pares, nenhum par e geometrias complexas; individual e lote; validar sequência observada de operações e contadores, preservação do resultado, fase nativa sem medida, erro durante suboperação, cancelamento solicitado/recusado/confirmado e erro de rede sem afirmar falha do servidor.
5. **Transporte/navegador:** atraso de polling, reconexão, duplicação, lacuna de mais de 250 eventos, troca de job, minimização/retomada, texto longo, rolagem voluntária, teclado e leitor de tela. Verificar overhead com carga representativa antes de decidir taxa de publicação.

Testes existentes lidos: `tests/test_controle_processamento.py` (contadores, cancelamento, detalhe e nova tarefa), `tests/test_progresso_eventos.py` (SSE, compactação e autorização), `tests/test_feedback_processos.py` (contratos compartilhados) e `tests/browser/progresso-eventos.cjs` (SSE vivo, polling antigo, rede e troca de job). O teste OGR em `test_controle_processamento.py:51` exercita `_overlay_ogr` de outro serviço; não comprova granularidade no `SpatialJoin` usado nesta extração. Parte dos testes inspeciona strings; complementar com afirmações sobre eventos e conteúdo realmente exibido. **Nenhum desses testes foi executado nesta auditoria.**

A primeira entrega de correção deve demonstrar, em execução isolada, que o usuário consegue responder “qual operação está acontecendo agora, sobre qual base, quanto trabalho foi medido e se pode cancelar”, lendo a área de mensagens. A auditoria não autoriza alteração de dados nem atesta funcionamento de uma versão implantada.


## Correções implementadas — 26/09/2026

Esta seção registra a implementação autorizada após a auditoria. Os achados e linhas anteriores são a evidência histórica da revisão original; os arquivos atuais foram alterados e suas linhas mudaram. Não foi feito commit/push, deploy, migração nem acesso de escrita ao banco oficial durante a implementação/validação.

| Achado | Correção aplicada | Evidência principal |
| --- | --- | --- |
| Suboperações caras sem anúncio | Instrumentação por operação, antes do trabalho, contexto entrada/base/lote, medidas em loops de preparação/validação, consulta, medidas, vínculos, campos, saída e pacote; chamadas sem contador indeterminadas | `feedback_operacao.py`, `extracao_ogr.py`, motores de estatísticas/enriquecimento e pacotes |
| Contagem de candidatas incorreta | Mensagem de lote separa pares confirmados de feições sem correspondência; não inventa candidatas do índice | Fixture com duas interseções e uma entrada sem par em `test_feedback_extracao_detalhado.py` |
| Conclusão por mudança de texto | `tarefa_estado`, `tipo` e `tarefa_id`; término explícito depois do bloco retornar; exceção não conclui | Controlador e consumidor compartilhado; testes Python/browser |
| Cancelamento visual antecipado | Pedido pendente conserva modal/SSE; confirmação só por estado cancelado; recusa permite nova tentativa | Componente compartilhado, adaptadores da extração/entrada local e browser |
| Histórico/ordem/horário | Revisão comum para snapshots, timestamps de origem, aviso explícito de lacunas, download com limites declarados | Canal, controlador, JS compartilhado e testes de rede/retencão |
| Progresso global ambíguo | Rotulado avanço das etapas; suboperações desconhecidas indeterminadas, medidas têm unidade/denominador; 100% medido não implica sucesso de tarefa running | JS e eventos reais da fixture |
| Leitura/DOM/rolagem | Resumo atual na área de mensagens, concluídas recolhíveis, quebra de texto, pausa do seguimento, DOM/histórico limitados | CSS/JS e testes de navegador |
| Atividade/acessibilidade | Relógios de contato/avanço separados, resumo `role=status` agrupado, histórico sem anúncios por linha, foco por teclado | Componente e browser; leitor de tela manual ainda não exercitado |

O contrato incremental efetivamente implementado está em `FEEDBACK_SICARD.md`. Não foi imposto o envelope futuro completo do exemplo anterior: os campos compatíveis existentes foram estendidos. O canal continua sendo de snapshots; a correção da perda silenciosa é detectar e declarar lacunas, conforme alternativa de aceite desta auditoria. O histórico baixado é explicitamente o recorte recebido, não uma trilha completa de auditoria durável.

### Validação executada

- **7/7 testes novos Python passaram**: operações geoespaciais pequenas reais, pares corretos, preservação de geometria, início indeterminado da consulta, conclusão explícita, cancelamento cooperativo e liberação de recurso, 10.001 checkpoints com no máximo seis publicações, retenção e empacotamento por arquivo/aba.
- **69/69 testes Python de regressão passaram** na rodada inicial dos motores/controlador/canal, antes dos últimos ajustes de documentação e apresentação.
- **112/112 testes Python passaram na rodada integrada final** (33,78 s; 18 avisos), cobrindo os sete novos testes e regressões de controlador, SSE, feedback compartilhado, estatísticas, OGR, enriquecimento e lote. Três asserts estáticos antigos de frontend foram atualizados após a primeira rodada; o comportamento substituto também foi verificado em navegador.
- Os testes de navegador `feedback-auditoria.cjs`, `feedback-global.cjs`, `feedback-sigma.cjs` e `progresso-eventos.cjs` passaram com Chrome headless local. `feedback-auditoria.cjs` também passou após incluir SSE terminal sem resultado (aguarda REST completo) e recusa/confirmação da ponte municipal real extraída da fonte. O teste SSE usa worker isolado, sem banco oficial.
- A compilação dos módulos Python editados passou. O teste geoespacial executa apenas fixtures em memória e arquivos temporários dos pacotes.

### Limites verificados e ainda não medidos

- SQL/OGR sem callback permanece indeterminado; o usuário recebe o nome real da operação. Cancelamento dessas chamadas é confirmado no próximo ponto cooperativo, não instantaneamente.
- Teste sintético do controlador pelo coordenador: 3.000 detalhes em cerca de 0,722 s, 2.000 retidos e 250 transmitidos (~38.653 bytes no snapshot medido). É medição local sintética, não benchmark de bases grandes nem rede/DOM. O helper limita publicações intermediárias sem reduzir checkpoints de cancelamento.
- Avisos `GDALClose` em destrutor SQLite apareceram também na rodada de base anterior às mudanças. Não houve falha dos resultados ou testes; a instrumentação agora fecha índice em `finally` e limpa falhas de preparação. Não se atribui à auditoria uma correção geral de dependências GDAL.
- Não foi realizada validação manual com leitor de tela, benchmark de bases de produção, ou implantação. Os testes de acesso/autorização são isolados, com dependências substituídas.


### Fechamento da implementação

- Build do plugin municipal concluído: `npm run build` (demo e biblioteca) e `vite build --config vite.sicard.config.js`, ambos exit 0. O bundle servido foi recompilado a partir de `sicard/main.jsx`; a ponte devolve a Promise e propaga recusa ao modal. Nenhum ZIP de dados foi recriado. Dependências foram instaladas do lockfile com scripts automáticos desativados; npm portátil foi verificado por SHA-512.
- Após o rebuild, `feedback-auditoria.cjs` passou novamente, incluindo a ponte municipal.
- Revisão visual independente pelo coordenador em Chrome: desktop 1366×900 e celular 390×844, sem erros de página/overflow horizontal, sem falsa conclusão ao trocar operação; resumo detalhado legível, quebra de texto, histórico separado e concluídas recolhidas. Evidências locais em `tmp/feedback-review-*.png` (artefatos temporários, não entregas de produção). Leitor de tela manual não testado.
- `git diff --check` passou. Os artefatos de build versionados e a fonte estão sincronizados. Alterações simultâneas dos auditores de fluxos/console devem ser validadas na integração final, além das evidências específicas deste relatório.
