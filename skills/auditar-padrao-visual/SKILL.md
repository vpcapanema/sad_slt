---
name: auditar-padrao-visual
description: Auditar a arquitetura visual do frontend SICARD, rastreando templates-base, componentes HTML, cascata CSS e elementos gerados por JavaScript. Pesquisar boas práticas e propor uniformização fundamentada no padrão existente, com relatório compacto e completo, sem redesenhar automaticamente.
---

# Especialista em arquitetura e padronização visual

Descubra o padrão visual real antes de propor uniformização. Analise estrutura, reutilização e aparência dos mesmos papéis de interface, identificando divergências justificadas e acidentais. Preserve identidade SICARD/PLI, contratos de comportamento e diferenças funcionais entre formulário, mapa, painel, tabela e bancada. O resultado padrão é diagnóstico e proposta; a auditoria não autoriza modificar a interface.

## Reconstruir a implementação

Leia instruções do projeto e `documentacao/ARQUITETURA_TEMPLATES.md`. Registre commit e mudanças locais relevantes: outros agentes podem estar trabalhando. Comece pela página solicitada, por padrão `templates/paginas/geoespacial/extracao-atributos.html`, e compare com páginas representativas ativas do cadastro, análise multicritério, hierarquização, painel e administração. Diferencie templates ainda usados de páginas descontinuadas; inventário de arquivos não é cobertura visual.

Trace `extends`, `include`, macros, blocos sobrescritos e exceções sem herança. Verifique ambos os candidatos conhecidos, `templates/bases/base_conteudo.html` e `base_painel_mapa.html`, componentes de navegação, footer, formulários, modais e documentos em iframe. A existência do template-base não comprova que todos os elementos compartilham estilo.

Levante a ordem real de CSS carregado, imports, custom properties, seletores globais, estilos por componente/página, media queries e regras geradas em execução. Examine `assets/css/app.css`, `template-conteudo.css`, `template-painel-mapa.css`, `page-title-standard.css`, CSS dos módulos e `assets/js/status-colors.js`. Cores de status têm fonte única neste último: não proponha duplicá-las.

Siga também JS que cria HTML, troca classes/atributos, injeta estilo ou move componentes entre documento e dialog. IDs e classes usados por handlers/testes são contratos: não proponha renomeação sem mapa dos consumidores. Bibliotecas externas, mapas e o plugin React municipal têm fronteiras próprias; não exija migração de framework nem edição direta de artefatos compilados.

## Comparar por função e estado

Monte uma matriz enxuta com: papel do elemento, implementação reutilizada, variantes observadas, fonte vencedora do estilo e padrão recomendado. Cubra títulos/subtítulos; seções/cards; botões e links de ação; rótulos/inputs/selects/checkboxes; tabelas; abas/listas; badges; mensagens; modais; barras de ação e controles cartográficos quando presentes.

Verifique tipografia, escala de tamanhos/pesos/altura de linha, espaçamento, alinhamento, densidade, dimensões de controles, cores semânticas, bordas, raios, sombras, ícones e hierarquia. Inclua estados normal, hover, foco, ativo/selecionado, desabilitado, carregando, vazio, erro e sucesso. Mesmo HTML pode cumprir papéis diferentes: uniformidade não exige um estilo único para qualquer `button` ou `h2`.

Procure causas, não só sintomas: tokens duplicados ou ignorados, valores avulsos para mesma função, ordem de carregamento variável, alta especificidade, cadeias de `!important`, seletores de página contaminando componente, marcação duplicada e JS reintroduzindo estilos. Não classifique toda literal CSS, seletor por ID ou exceção como defeito sem evidência do impacto.

## Pesquisa e evidência

Consulte fontes primárias atuais: W3C/WAI para acessibilidade, documentação oficial de CSS e sistemas de design públicos para tokens/componentes. Use [as referências de partida](references/fontes.md), revalidando-as na auditoria. Vincule cada princípio relevante a uma proposta concreta do SICARD. Distinga critério normativo e nível WCAG, recomendação e preferência de produto; não afirme que consistência exige aparência idêntica em todos os contextos.

Quando houver runtime seguro, compare DOM e estilos computados de elementos representativos em desktop e viewport estreito, incluindo foco/teclado, zoom/texto longo, contraste e reflow. Verifique regras e exceções aplicáveis a mapas e tabelas antes de exigir que todo conteúdo caiba sem rolagem. Uma análise estática não demonstra contraste efetivo, responsividade completa ou conformidade WCAG. Identifique o que foi medido, observado ou inferido.

Use fixture isolada ou leitura da interface sem alterar dados oficiais. Não execute `start-dev`/migrations/deploy para conseguir screenshots. Ao usar fixtures, declare que não representam uma sessão real completa. Nunca gere cadastro/extração persistente apenas para auditoria visual.

## Proposta incremental

Indique o que manter como referência, o que consolidar e o que continuar específico. Prefira melhorar tokens e componentes existentes; proponha fonte única de decisões visuais (cor semântica, tipografia, espaço, dimensão, borda e estado), composição por templates e pequenas variantes explícitas. Explique responsabilidade de cada arquivo/camada, evitando um CSS global que sobrescreva todos os módulos.

Se recomendar cascade layers, detalhe a convivência com CSS legado sem layer e bibliotecas: introduzir `@layer` isoladamente muda a precedência e não resolve a cascata automaticamente. Não troque framework, tema, fonte ou arquitetura inteira sem necessidade demonstrada e autorização de implementação.

Priorize migração por família de componente, impacto visual e risco de regressão, usando a extração como piloto quando ela for o foco. Defina critérios verificáveis: equivalência entre mesmos papéis/estados, ausência de quebra em páginas consumidoras, preservação de seletores comportamentais e screenshots comparáveis. Não altere fluxos para encaixar uma proposta estética.

## Relatório denso e curto

Salve `documentacao/AUDITORIA_PADRAO_VISUAL.md`, salvo destino diferente. Busque 700–1000 palavras, com até oito achados agrupados por causa. Estrutura:

1. Veredito e escopo: existe template-base/padrão? Onde é efetivamente reutilizado? Quais evidências foram estáticas ou visuais?
2. Matriz compacta das famílias de elementos, fontes e divergências.
3. Achados priorizados com IDs V01…: evidência arquivo:linha, consequência e solução proposta.
4. Arquitetura visual recomendada, ordem de adoção e critérios de aceite.
5. Fontes ligadas às recomendações e limites de cobertura.

Não omita problemas importantes para caber no limite: agrupe causas e explicite o que falta verificar. Evite catálogo de todos os seletores, longas citações e explicações genéricas. Resposta no chat: veredito, no máximo cinco pontos e link ao relatório. Nenhuma uniformização deve ser declarada implementada quando a entrega foi apenas proposta.

Em paralelo, leia o código sem disputar arquivos com agentes de correção; escreva somente seu relatório e coordene qualquer teste/fixture nova. Revalide as linhas afetadas por mudanças concorrentes antes de finalizar.
