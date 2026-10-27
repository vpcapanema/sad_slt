# Padrão visual obrigatório das tabelas da aplicação

Definido pelo usuário em 27/10/2026. Referência oficial: **Julgamentos Realizados**,
na página `/restrict/analise-multicriterio/central-julgamentos`.

## Estrutura obrigatória, na ordem

1. Barra de filtros, encostada no topo da tabela, dentro do mesmo contêiner.
2. Tabela com cabeçalhos, zebrado nas linhas de dados e primeira coluna de
   seletores: checkbox por registro e seletor geral no cabeçalho.
3. Barra de botões de controle abaixo da tabela.
4. Paginador e contador de registros, no rodapé padrão.

Todos os elementos devem funcionar, inclusive filtros, seleção, controles,
paginação e contagem. Não adicionar controles decorativos ou ações fictícias.
Os botões de controle correspondem às operações reais da tabela; sua aparência
e disposição devem seguir a referência. Não omitir a coluna de seletores.

## Aparência e espaçamento

- Copiar exatamente a tipografia, cores, alinhamento e espaçamentos da tabela
  de referência. Não substituir por padrões genéricos de frameworks.
- Filtro e tabela compartilham uma borda externa de **1 px, #374151**, com
  cantos de **8 px**. Não deixar espaço entre a barra de filtros e a tabela.
- Barra de filtros: **32 px**. Cabeçalhos têm altura mínima de **32 px**;
  a linha inteira cresce quando necessário para mostrar os títulos completos.
- Larguras inteligentes (`assets/js/table-smart-widths.js`, nas bases globais):
  medir título e registros exibidos com a fonte real. Títulos acima de 10
  caracteres só quebram quando não cabem na largura disponível. A quebra é
  explícita, em blocos de texto separados, equilibrada entre palavras e justificada;
  se faltarem aproximadamente três caracteres para caber em uma linha,
  ampliar a coluna pela pequena diferença antes de quebrar o título.
  admitir linhas adicionais para palavras extensas, sem reticências ou corte.
  O conteúdo dos registros influencia a largura até 320 px, para que um valor
  excepcionalmente longo não domine a tabela. Distribuir o espaço restante
  entre colunas de dados, mantendo os seletores em 44 px. Se não couber,
  usar rolagem horizontal no contêiner, sem comprimir os cabeçalhos.
  Recalcular após renderização, filtros, paginação e alteração de largura.
- Exceção autorizada: na tabela de índices de Saaty, “Par de critérios” é um
  cabeçalho agrupado sobre as colunas “Critério 1” e “Critério 2”. Filtros,
  ordenação e exportação usam cada coluna individualmente.
- Campos dos filtros: **25 px** de altura. Botões dos filtros: **25 × 25 px**,
  redondos, ícones **#4b5563**, bordas **#374151**, fundo neutro.
- Cabeçalho da tabela: fundo azul-escuro `var(--pli-deep)`, texto branco.
- Dados: zebrado branco **#ffffff** e azul muito claro **#edf4f8**. A seleção
  deve continuar identificável, inclusive sobre o zebrado.
- Botões de controle: dimensões da referência (**2.115 rem**, aproximadamente
  **33.84 px**), fundo neutro, ícone colorido e borda em tom mais escuro da
  mesma cor. Cores distintas por ação, conforme os seletores da referência.
- Botões do paginador sem bordas.
- Coluna de seletores com largura fixa de **2.75 rem (44 px)**, incluindo
  cabeçalho e células; checkbox centralizado.
- Textos interativos nas células: fonte herdada da tabela, sublinhado,
  azul-escuro **#123b56**, sem borda, fundo ou sombra. Disponibilidade de
  matriz e pesos: disponível em **#166534**, pendente em **#991b1b**.
- Ritmo do rodapé: gap de **8 px** entre os elementos, margens verticais dos
  controles zeradas e padding superior do rodapé de **6 px**, conforme os
  estilos da referência. Não somar margens adicionais ao gap.
- Paginador centralizado e contador à direita no desktop; em telas estreitas,
  adaptar conforme o rodapé responsivo da referência.
- Reutilizar as famílias, pesos, tamanhos e alturas de linha efetivos da
  referência. Medir o estilo computado no navegador: há regras em cascata,
  portanto um valor isolado em uma folha de estilo não é suficiente.
- Textos longos devem respeitar o alinhamento definido para sua coluna.
  No monitoramento, Destinatário e Detalhes têm os dados alinhados à esquerda.

## Fontes de implementação

- `templates/componentes/_tabela_colaborativa.html`: tabela de referência.
- `templates/componentes/filtro_tabela.html`: barra de filtros.
- `assets/css/paginas/ami-espaco-secoes.css`: ajustes visuais finais da referência.
- `assets/css/analise-multicriterio-tabela.css`: estrutura e células.
- `assets/css/table-standard.css` e `assets/css/admin-table-controls.css`:
  estilos compartilhados.
- `assets/js/table-standard.js`: filtros, paginação e contador.
- `assets/css/paginas/sicard-standard-pages.css` e
  `assets/js/sicard-standard-layout.js`: aplicação compartilhada do padrão em
  Agrupamento de Demandas, Processos de Hierarquização e Central de Respostas.
- `assets/js/analysis-table-controls.js`: filtros, seleção, exportação,
  paginação e contador das tabelas analíticas, inclusive matrizes.

Ao estender o padrão para outra página, reutilizar ou extrair estilos e
componentes compartilhados, preservando o resultado visual da referência.
Conferir no navegador com vários registros, seleção ativa, filtros e paginação,
incluindo tela estreita. Reavaliar o zebrado após filtrar ou mudar de página.

Este documento estabelece o padrão obrigatório; não afirma que todas as
tabelas preexistentes já foram migradas. Ao trabalhar nelas, aplicar o padrão.
