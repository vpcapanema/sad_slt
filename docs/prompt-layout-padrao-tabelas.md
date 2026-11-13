# Prompt — Layout padrão das tabelas da interface

Leitura obrigatória para qualquer agente que vá criar ou alterar conteúdo com
tabela (ver `.github/instructions/tabelas-padrao.instructions.md`). Este
documento complementa [docs/padrao-tabelas.md](./padrao-tabelas.md).

Toda tabela deve reproduzir **exatamente** o layout da tabela de referência
**"Tabela das hierarquizações realizadas"**, da página
`/restrict/hierarquizacao/processos/` (seção "Hierarquizações realizadas").
Os valores abaixo foram medidos nos estilos computados dessa página em
produção, com viewport de 1440 px.

**Somente três coisas podem variar em relação à referência: a família de
fonte, as cores dos elementos e o conteúdo** (títulos, colunas, registros e
botões de ação existentes). Estrutura, ordem, alinhamentos, dimensões,
espaçamentos, hierarquia de tamanhos de fonte, pesos, bordas, raios, formato e
comportamento dos botões são fixos. Não substituir por padrões genéricos de
frameworks.

## 0. Antes de codar: referências de cor e tipografia (obrigatório)

Cor e fonte são variáveis justamente para que a tabela siga o **sistema onde
será implementada**. Antes de escrever qualquer código:

1. Levantar os tokens de cor do sistema de destino (neste repositório, `:root`
   em `assets/css/app.css`: `--pli-deep #003b5a`, `--pli-blue #116593`,
   `--pli-green #3ec26e`, `--pli-border #d8dee4`, `--pli-text #212529`,
   `--pli-muted #5a6570`, `--pli-bg`, `--pli-error`) e as cores já usadas nas
   tabelas vizinhas para cabeçalho, zebrado, seleção, links de célula, botões
   de controle, paginador e contador.
2. Levantar as famílias e pesos tipográficos carregados (neste repositório:
   Roboto 400/500 para corpo, dados, filtros, paginador e contador; Montserrat
   400–700 para cabeçalhos de coluna, cabeçalhos de grupo e rótulo de seção).
3. Medir no navegador os estilos computados da tabela de referência e usar
   esses valores; não presumir equivalência a partir de uma folha de estilo
   isolada.
4. Reutilizar os componentes existentes: `templates/componentes/filtro_tabela.html`,
   `assets/css/table-standard.css`, `assets/css/admin-table-controls.css`,
   `assets/css/table-column-groups.css`,
   `assets/css/paginas/sicard-standard-pages.css`, `assets/js/table-standard.js`,
   `assets/js/table-smart-widths.js`, `assets/js/table-labels.js`. Não criar
   variações locais.

## 1. Elementos constituintes e ordem (de cima para baixo)

1. **Título da tabela**
2. **Barra de filtros + botões mostra/oculta grupos de colunas** (uma única barra)
3. **Tabela propriamente dita** (cabeçalho de grupos opcional, cabeçalho de
   colunas, corpo zebrado, coluna de seletores)
4. **Barra de botões de controle**
5. **Paginador**
6. **Contador**

Os elementos 5 e 6 ficam na mesma linha (rodapé). Todos ficam dentro do corpo
da seção (card) com borda de 1 px, raio de 8 px e padding de 20 px × 24 px,
tendo o rótulo da seção (ícone + texto em caixa alta) na faixa superior do card.

## 2. Alinhamento horizontal dos elementos

| Elemento | Alinhamento no contêiner |
|---|---|
| Título da tabela | À esquerda, ocupando toda a largura |
| Barra de filtros | Toda a largura; rótulo "Filtro:" e os dois `select` encostados à esquerda; botões redondos (inverter, limpar) logo após os `select`; **botões de grupos de colunas empurrados para a extremidade direita** (`margin-left: auto`) |
| Tabela | Toda a largura; rolagem horizontal interna quando as colunas não couberem |
| Barra de botões de controle | **Centralizada** horizontalmente |
| Paginador | **Centralizado** na linha do rodapé |
| Contador | **Alinhado à direita** na linha do rodapé (texto alinhado à direita) |

A barra de filtros e a tabela compartilham a mesma moldura externa (borda 1 px,
raio 8 px) e **não há espaço entre elas** (0 px).

## 3. Espaçamento vertical (medido, obrigatório)

| De → Para | Distância |
|---|---|
| Rótulo da seção → Título da tabela | 20 px |
| Título da tabela → Barra de filtros | 17 px (margem inferior do título 8 px + gap do corpo 8 px) |
| Barra de filtros → Tabela | **0 px** |
| Tabela → Barra de botões de controle | 21 px (margem superior dos botões 12 px + gap 8 px) |
| Barra de botões → Rodapé (paginador/contador) | 8 px; o rodapé tem `padding-top: 6px` e gap interno de 8 px × 12 px |

Não somar margens adicionais; o corpo da seção é flex column com `gap: 8px`.

## 4. Título da tabela

- Texto no formato "Tabela de/das …" (ex.: "Tabela das hierarquizações realizadas").
- 16 px, peso 600, line-height 22,4 px, cor escura institucional (referência
  `#003b5a`), alinhado à esquerda, margem inferior 8 px.

## 5. Barra de filtros + botões de grupos de colunas

- Altura fixa **32 px**, padding 1 px × 8 px, gap 6 px, fundo neutro claro
  (referência `#f4f7fa`), itens centralizados verticalmente.
- Rótulo "Filtro:" 11,84 px, peso 600.
- Dois `select` (coluna e valor): altura **25 px**, padding 2 px × 6 px, borda
  1 px (referência `#d8dee4`), raio 4 px, fonte 11,84 px.
- Botões **Inverter seleção** e **Limpar filtros**: **25 × 25 px**,
  **redondos** (`border-radius: 50%`), fundo branco, borda 1 px escura
  (referência `#374151`), ícone 11,84 px (referência `#4b5563`). Somente
  ícone, com `title`/`aria-label`.
- Botões **mostrar/ocultar grupos de colunas** — **obrigatórios em toda
  tabela**: extremidade direita da mesma barra, formato pílula
  (`border-radius: 999px`), **altura 28 px**, padding 0 × 10 px, texto 600 /
  0,74 rem, texto branco sobre a cor do grupo; grupo **oculto = opacidade
  0,45**, visível = opacidade 1. Um botão por grupo; a cor de cada grupo é a
  mesma do cabeçalho de grupo correspondente.
  - **Os nomes e a composição dos grupos variam conforme o conteúdo da
    tabela**: ao projetar a tabela, agrupar as colunas por afinidade semântica
    (ex.: na referência, "Hierarquização", "Composição", "Relatórios",
    "Homologação", "Cadastro", "Classificação"; em outra tabela poderiam ser
    "Identificação", "Localização", "Situação", "Documentos", "Auditoria").
    A coluna de seletores e a(s) coluna(s) de identificação principal nunca
    pertencem a grupo ocultável.
  - Mínimo de dois grupos; cada grupo gera um botão e um cabeçalho de grupo.
    Só é admitido omitir os botões se a tabela tiver quatro colunas de dados
    ou menos, e isso deve ser registrado como exceção aprovada pelo usuário.

## 6. Tabela propriamente dita

**Estrutura**

- Primeira coluna sempre de **seletores**: checkbox por registro e checkbox
  "selecionar todos" no cabeçalho; largura fixa **44 px (2,75 rem)**, checkbox
  centralizado, coluna fixa (`sticky`) na rolagem horizontal.
- Com grupos de colunas, uma **linha de cabeçalho de grupos** acima do
  cabeçalho de colunas: célula com `colspan` sobre suas colunas, altura 32 px,
  texto branco 700 / 0,72 rem, centralizado, sem borda, fundo na cor do grupo;
  a célula sobre a coluna de seletores fica transparente.
- Fonte-base da tabela 11,84 px.

**Cabeçalhos de coluna**

- Altura mínima **32 px**, padding 8 px × 9,6 px, texto **branco**, peso
  **700**, 11,52 px (0,72 rem), caixa alta, `vertical-align: middle`.
- **Preenchimento de fundo: azul-escuro institucional sólido em todas as
  células do cabeçalho** (referência `var(--pli-deep)` = `#003b5a`), separadas
  por borda de 1 px branca.
- **Alinhamento: sempre centralizado na célula** (horizontal e vertical), sem
  exceção, incluindo a célula de seletores.
- Títulos não são truncados com reticências nem partidos no meio da palavra;
  quebram em no máximo duas linhas entre palavras e a linha cresce para
  acomodá-los. Larguras calculadas pelo mecanismo de larguras inteligentes.

**Linhas de dados**

- Altura mínima 27 px (1,7 rem), padding 2,88 px × 8,8 px, fonte 400 /
  11,84 px, line-height 1,1, `vertical-align: middle`, bordas de célula 1 px
  (referência `#d8dee4`).
- **Zebrado obrigatório por linha, aplicado ao fundo das células (`td`)**:
  linhas ímpares **brancas** (`#ffffff`), linhas pares em **tom muito claro da
  cor institucional** (referência `#edf4f8`). Linha selecionada recebe fundo
  distinto, identificável sobre o zebrado (referência `#eef4fa`). Reavaliar o
  zebrado após filtrar, ordenar ou paginar.
- **Alinhamento dos dados — regra fixa, decidida por coluna conforme o
  conteúdo típico dela:**
  - conteúdo com **três ou mais palavras → alinhado à esquerda**
    (ex.: Nome, Descrição, Responsável, Detalhes);
  - conteúdo com **uma ou duas palavras, números, datas, códigos, traços "—"
    e links de ação → centralizado** (ex.: Situação, Código, Data, Tipo).
- Textos interativos nas células (abrir modal, visualizar arquivo): mesma
  fonte da célula, **sublinhado**, cor azul-escura (referência `#123b56`), sem
  borda, fundo, sombra ou padding.

## 7. Barra de botões de controle

- Abaixo da tabela, **centralizada**, gap **10 px** entre botões, altura ≈ 34 px.
- Cada botão: **quadrado de 33,84 px (2,115 rem)**, raio **6 px**, **fundo
  branco**, **somente ícone** (14,4 px), texto apenas em
  `title`/`aria-label`/`sr-only`.
- **Cor por ação**: o ícone usa a cor da ação e a **borda de 1 px usa um tom
  mais escuro da mesma cor**. Referência: visualizar `#1d4ed8`/`#153998`;
  editar `#92400e`/`#622b09`; cancelar `#475569`/`#2f3946`; salvar e exportar
  `#166534`/`#0e4322`; excluir `#991b1b`/`#661212`; recarregar
  `#0f766e`/`#0a4f49`. As cores podem mudar; a relação "ícone colorido + borda
  mais escura + fundo branco" é fixa.
- Desabilitado: mesma geometria, ícone e borda esmaecidos. Hover: sombra sutil
  (`0 1px 2px rgba(0,0,0,.04)`), sem mudar o fundo.
- **A barra é obrigatória em toda tabela**, mas **as funções e os nomes dos
  botões variam conforme o conteúdo da tabela**. A composição segue esta
  ordem, da esquerda para a direita:
  1. **Botões comuns** (presentes sempre que a operação existir para aquele
     conteúdo, nesta ordem e com as cores de referência acima): Visualizar
     selecionado(a) · Editar selecionado(a)s · Cancelar edição · Salvar
     alterações · Excluir selecionado(a)s · Exportar selecionado(a)s · Limpar
     seleção. Tabelas somente-leitura mantêm ao menos Visualizar, Exportar e
     Limpar seleção.
  2. **Espaço para botões específicos** da tabela, após os comuns: ações que
     só fazem sentido para aquele conteúdo (ex.: "Visualizar selecionado no
     mapa", "Baixar selecionado em ZIP", "Recarregar", "Abrir formulário
     público", "Simular matriz de comparação pareada", "Confirmar registros
     do grupo"). Cada botão específico usa a **mesma geometria** (33,84 px,
     raio 6 px, fundo branco, somente ícone) e recebe **seu próprio par de
     cores** (ícone + borda mais escura), distinto dos pares já usados pelos
     botões comuns daquela barra; ícone Font Awesome que represente a ação.
  - Os rótulos (`title`/`aria-label`) devem nomear o objeto da tabela e
    concordar em gênero e número com ele (ex.: "Excluir as extrações
    selecionadas", "Visualizar demanda", "Editar julgamento").
  - Botões correspondem apenas às operações reais da tabela; nada decorativo.
    Quando a operação não existir para o conteúdo, o botão é omitido (não
    deixado permanentemente desabilitado).

## 8. Paginador

- `nav` centralizado, `display: flex`, gap **12 px**, altura 34 px, fonte
  11,2 px (0,7 rem).
- Sequência fixa: `<<` `<` **"Página N de M"** `>` `>>`.
- Botões **34 × 34 px**, **sem borda**, fundo branco, texto 700 / 11,2 px na
  cor de destaque (referência `#1683c4`); desabilitados quando não há página
  anterior/seguinte.
- Texto "Página N de M": 400 / 11,2 px, cor cinza-azulada (referência `#475569`).

## 9. Contador

- Parágrafo à **direita** do rodapé, texto alinhado à direita, **10,24 px
  (0,64 rem)**, peso 400, cor cinza (referência `#64748b`).
- Formato fixo: **"X selecionados / Y na página / Z no total"**, atualizado a
  cada seleção, filtro ou mudança de página.

## 10. Hierarquia de tamanhos de fonte (fixa)

| Nível | Tamanho / peso |
|---|---|
| Rótulo da seção (card) | 13 px / 700, caixa alta |
| Título da tabela | 16 px / 600 |
| Rótulo "Filtro:" e campos do filtro | 11,84 px (600 no rótulo, 400 nos campos) |
| Botões de grupos de colunas | 0,74 rem / 600 |
| Cabeçalhos de grupo e de coluna | 11,52 px (0,72 rem) / 700 |
| Dados das células | 11,84 px (0,74 rem) / 400 |
| Ícones dos botões de controle | 14,4 px |
| Paginador | 11,2 px (700 nos botões, 400 no texto) |
| Contador | 10,24 px / 400 |

## 11. Comportamento obrigatório

- Filtro por coluna + valor, inversão e limpeza funcionais; tabela, paginador e
  contador respondem aos filtros.
- Seleção individual e geral funcionais; os botões de controle
  habilitam/desabilitam conforme a seleção.
- Paginação de 15 registros por página (padrão do `table-standard.js`), com
  zebrado recalculado.
- Botões de grupos ocultam/exibem as colunas do grupo e o cabeçalho de grupo.
- Validar no navegador comparando os **estilos computados** com a referência
  (vários registros, seleção ativa, filtro aplicado, página 2, tela estreita).

## 12. O que não fazer

- Não alterar ordem dos elementos, alinhamentos, alturas, paddings, gaps,
  raios, formato redondo dos botões de filtro, formato quadrado dos botões de
  controle, formato pílula dos botões de grupo.
- Não alinhar cabeçalhos à esquerda; não centralizar textos com três ou mais
  palavras.
- Não omitir coluna de seletores, paginador ou contador.
- Não usar texto nos botões de controle nem adicionar ações fictícias.
- Não truncar títulos de colunas com reticências.
- Não inventar cores nem fontes: usar as referências levantadas na seção 0.
