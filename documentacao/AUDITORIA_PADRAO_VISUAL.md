# Auditoria do padrão visual — SICARD

26/09/2026 · HEAD `e73fe75b8008cbdc91fe4fda09aaa6d5fbfab5d6`, acrescido das alterações locais concorrentes. Especialidade: `skills/auditar-padrao-visual/SKILL.md`. **Diagnóstico e proposta; nenhuma uniformização implementada.**

## Veredito e cobertura

Existe identidade visual e composição compartilhada, mas não um contrato visual uniforme por componente. As duas bases reutilizam `app.css`, navegação e footer; a base de conteúdo também instala o feedback. A extração reaproveita essa estrutura, porém reconstrói controles e densidade em CSS próprio. O painel cartográfico precisa continuar distinto do formulário.

Inspeção: bases, includes, CSS, geração de DOM e páginas ativas de extração, cadastro, multicritério, fase 2, painel público e demandas administrativas. Rotas conferidas em `api/server.py:100`, `:128`, `:137`, `:194`, `:317`; páginas AHP retiradas com 410 (`:299`) não foram tomadas como referência.

**Medição isolada:** Jinja renderizado em memória; Chrome headless, 1366×900 e 390×900; CSS local na ordem original, scripts da aplicação e recursos externos bloqueados. Sem dados, autenticação, fontes remotas ou mapas reais. Nenhuma das seis estruturas apresentou overflow horizontal da página nesses dois tamanhos; isso não demonstra reflow completo dos estados dinâmicos. Computados: títulos extração 20px, multicritério 23,2px, fase 2 32px; cadastro inicia por h2 de 16px. Administração aplica zoom 0,9. São observações dessa fixture, não de produção.

## Famílias e referência proposta

| Família | Implementação/fontes atuais | Direção |
|---|---|---|
| Títulos/subtítulos | `standard-page-hero`, `ahp-page-title`, h2 do cadastro; CSS de página vence tamanhos | Cabeçalho comum com variantes documentadas |
| Seções/cards | `.card`, `.ahp-section-label`, `.ea-section`, `.admin-card` | Superfície, espaçamento e cabeçalho compartilhados |
| Botões/ações | `.btn`, `.ea-btn`, `.pfs-btn`, controles cartográficos | Mesmos papéis/estados; densidades normal e compacta |
| Campos/checks | Globais de `app.css`, `.ea-field`, `.c-form-control`, regras administrativas | Tokens de controle, rótulo, ajuda e validação |
| Tabelas | `.admin-table`, `.fase-table`, `.ea-table-wrap`, Tabulator | Cabeçalho/seleção/vazio coerentes; rolagem local |
| Abas/listas | `.admin-tab`, `.ami-tabs`, listas de camadas e seletores do cadastro | Contrato de seleção/foco; manter árvore e abas distintas |
| Badges/mensagens | `SLTStatusColors`, `.ea-badge`, Notify, ProcessFeedback | Status de demanda central; estado operacional separado |
| Modais/mapas | `<dialog>`, overlays PFS, iframe da bancada, Leaflet/MapLibre | Adaptadores explícitos para cada fronteira |

## Achados priorizados

**V01 — P1, contraste do estado vazio.** `assets/css/app.css:409` colore selects vazios com `#8a94a0`. Na fixture, categoria e algoritmo habilitados (`templates/componentes/extracao_atributos/_configuracao.html:41`, `:72`) exibiram essa cor sobre branco: **3,08:1**, abaixo de 4,5:1 para texto normal. Corrigir o token de texto auxiliar, sem confundir vazio com desabilitado. Referência normativa: [WCAG 1.4.3, AA](https://www.w3.org/TR/WCAG22/#contrast-minimum). Não extrapolar essa medição para toda a aplicação.

**V02 — P1, escala definida por múltiplas camadas.** `app.css:21` cria tokens tipográficos; `paginas/cadastro-nova-demanda.css:3` os redefine; `escala-tipografica.css:72` reduz a página inteira por zoom. Extração redefine título em `extracao-atributos.css:668`; multicritério em `analise-multicriterio.css:1`. Mesma finalidade resulta em hierarquias diferentes, confirmadas nas medições. Consolidar escala por papel e densidade, substituindo progressivamente o experimento de zoom após comparação visual. Não mudar fontes institucionais.

**V03 — P1, variantes implícitas e cascata corretiva.** `page-title-standard.css:15` usa `!important` para alinhamento, mas não governa tamanho. Extração redefine botões em `:27`, `:97`, `:171`, `:391` do seu CSS. A regra vencedora depende de seletor/contexto, dificultando evolução. Adotar variantes explícitas, remover sobreposições por família e manter ordem de carga testada. [MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer): CSS normal sem layer prevalece sobre regras normais em layers; introduzi-las isoladamente não resolve o legado.

**V04 — P2, controles e estados fragmentados.** `.btn` (`app.css:491`) e `.ea-btn` (`extracao-atributos.css:27`) repetem estrutura, mas diferem em borda, hover, foco e disabled. Na fixture: botão do cadastro 12,8px; ações da preparação 12px; Voltar administrativo 13,3px antes do zoom. Formalizar ação primária/secundária/destrutiva e compacta, incluindo ativo, ocupado, vazio e erro; preservar IDs. [USWDS tokens](https://designsystem.digital.gov/design-tokens/) fundamenta decisões reutilizáveis, não copiar seu tema.

**V05 — P2, cabeçalho reutilizado parcialmente.** Extração e multicritério compõem `standard-page-hero`; cadastro abre com h2 (`nova-demanda.html:21`), administração com spans (`admin/demandas.html:21`). Criar macro de cabeçalho com título semântico e descrição opcional, sem forçar hero no mapa. Identificação consistente é critério [WCAG 3.2.4, AA](https://www.w3.org/TR/WCAG22/#consistent-identification), não exigência de aparência idêntica.

**V06 — P2, fronteiras dinâmicas exigem contrato próprio.** `assets/js/componentes/geoprocessamento-slt.js:31` gera HTML e iframe; `process_feedback_unified.js:185` move o componente para a top layer; a bancada carrega folhas próprias (`templates/componentes/_geoprocessamento.html:9`). Uniformização apenas em Jinja falharia nesses consumidores. Compartilhar tokens/adaptadores e testar documento, dialog, iframe e plugin React, sem editar bundle compilado diretamente.

**V07 — P2, preservar centralização sem misturar significados.** `status-colors.js:615` injeta a paleta de demanda; `app.css:2116` delega a ela. Manter essa fonte única para badges, linhas, pins e legenda. Tokens PFS representam resultados operacionais, não fases administrativas. Catálogo deve registrar essa diferença e combinar cor com texto/ícone.

## Arquitetura e aceite

Manter bases como composição; `app.css` como entrada compatível; extrair tokens semânticos de tipografia/espaço/controle/borda/sombra; componentes reutilizáveis abaixo; módulos apenas para layout e variantes; vendors isolados. Documentar proprietário, consumidores e estados de cada família.

Ordem: contraste → escala/cascata → controles → cabeçalhos → tabelas/modais. Extração como piloto; depois cadastro, multicritério, administração e painel. Aceite: screenshots comparáveis, estilos computados por papel, teclado/foco, seleção/disabled/loading/erro, texto longo, 200% de zoom e 320 CSS px. Mapas/tabelas podem exigir disposição bidimensional: aplicar as exceções de [WCAG 1.4.10, AA](https://www.w3.org/TR/WCAG22/#reflow), mantendo controles acessíveis.

Fontes consultadas em 26/09/2026. Linhas revalidadas no estado local; feedback e fluxos continuam sob edição concorrente. Não foram testados leitor de tela, contraste de todos os estados, interação autenticada ou mapa carregado. Nenhum banco, serviço oficial, migração ou deploy foi utilizado.
