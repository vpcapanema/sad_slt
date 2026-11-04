# Explorador de análises realizadas

Os seletores **Selecionar análise de elegibilidade já realizada** e
**Selecionar análise de favorabilidade já realizada** usam o explorador compartilhado
`geoespacial/extracao-atributos/explorador.js`, com `detalhesAnalise: true`.
Somente esses seletores iniciam em **Detalhes**. Os demais mantêm Lista e seus
fluxos de seleção, upload e inventário. A tabela mantém filtros, seleção,
ordenação e controles reais. Por exceção expressa de 04/11/2026, as ações
ficam junto aos filtros acima da tabela, sem paginador ou contador.
Todos os itens filtrados são renderizados e acessíveis por rolagem.
**Caminho** é a última coluna; os valores de **Tipo**, **Tamanho**,
**Última modificação** e seleção são centralizados; Nome e Caminho ficam à esquerda.

## Metadados

- **Tamanho:** bytes decimais (B, kB, MB, GB), convenção do visualizador de
  storage. Para pastas, soma todos os arquivos descendentes, inclusive ocultos,
  acompanhantes e formatos que não aparecem no seletor. Não soma o tamanho
  físico dos diretórios nem multiplica bytes por quantidade de camadas.
- **Última modificação:** mtime próprio do arquivo ou diretório, recebido na
  listagem compartilhada; não utiliza o máximo dos descendentes.
  Exibição `dd/mm/aaaa hh:mm:ss`, 24 horas, `America/Sao_Paulo`.
- A coluna **Tipo** existente é preservada; não se adiciona coluna Extensão.
- Metadados ausentes mostram **Indisponível**, nunca um zero estimado.
  Pastas vazias verificadas mostram **0 B**. O nó artificial de navegação
  não representa um diretório listado: seus metadados podem estar indisponíveis.

## Layout e texto completo em todos os exploradores

A regra de linha única abrange todos os usos de `escolherArquivo`, inclusive
seleção de entradas/bases, rasters, bancada inline e visualizações Lista,
Detalhes e Ícones, além do explorador de camadas geoespaciais, seu modal de
metadados e os seletores de pastas para upload/destino de saída
(`geoespacial-storage-pastas.js`). Os cabeçalhos ficam lado a lado, com bordas verticais visíveis.
Em telas estreitas utiliza-se rolagem horizontal; cabeçalhos sticky são
preservados. Os valores não quebram linha: mostram reticências quando não cabem.

A árvore lateral de todos os seletores compartilhados usa largura intrínseca
(`fit-content`), sem reserva fixa de pixels ou de uma fração do modal.
O painel de arquivos ocupa o espaço restante com `min-width: 0`.
O limite lateral de 45% protege esse painel quando os nomes são excepcionalmente
longos: a árvore permite rolagem horizontal, sem cortar ou abreviar seus textos.
Em telas estreitas e na bancada inline, preserva-se a árvore acima do painel.

`explorador-overflow.js` reutiliza o **Notify** oficial para revelar o texto
completo no hover e no foco de teclado, com `aria-describedby` e conteúdo
textual seguro. O toast permite leitura/rolagem por teclado e não intercepta
os cliques de seleção (exceto seu próprio botão de fechar). Não substitui os
dados por HTML nem depende somente do tooltip nativo. Essa regra de layout
não altera o modo inicial nem adiciona metadados aos outros seletores.

## Consulta e desempenho

`POST /api/geoespacial/storage/detalhes?caminho=...` inicia uma consulta em
segundo plano; `GET /api/geoespacial/storage/detalhes/{id}` acompanha o resultado.
A abertura do modal não espera a enumeração recursiva. Enquanto ela acontece,
as pastas mostram **Carregando…**; falhas notificam pelo feedback padrão e
mostram **Indisponível**, com controle de nova tentativa.

A consulta utiliza `_listar` (montagem ou API oficial), uma vez por diretório,
sem requisição, download, GDAL ou inventário individual por arquivo.
Dois workers e limites de consultas ativas impedem filas ilimitadas; o
percurso verifica um prazo de 120 segundos entre listagens (uma chamada remota
em andamento segue o timeout do cliente de storage). Falhas descartam o total
parcial. Consultas são isoladas por usuário.

Não se utiliza mtime de pasta como revisão dos descendentes: uma edição de
arquivo não necessariamente modifica esse mtime. Os totais são reutilizados
apenas durante a abertura do modal (inclusive ao navegar para descendentes),
como a listagem já existente. Nova abertura inicia nova consulta; consultas
ativas idênticas do mesmo usuário são deduplicadas. Retratos terminados são
retidos em memória por até 15 minutos para acompanhamento, com limite de
24 registros. São somas de metadados observados durante o percurso, não uma
transação atômica do filesystem; arquivos alterados durante a consulta exigem
nova abertura para atualização.

## Validação focada

As ações dos modais compartilham `assets/css/explorador-acoes.css`, com
identificação semântica `data-explorer-action` (sem depender da posição).
Essa folha é carregada uma única vez pelas duas bases de templates, após
as folhas da página e `table-scrollbars.css`, com URL versionada. Não depende
de `@import` de folhas antigas em cache. A geometria e o menu pertencem a essa
folha; o posicionamento pertence somente ao helper `posicionarMenu`.
Todas as regiões roláveis dos modais usam track transparente e thumb de baixa
opacidade, com 3 px nos navegadores WebKit/Chromium e `thin` no Firefox;
o hover aumenta o contraste sem ampliar a barra.
Todos os botões da barra são somente de ícone e compartilham a altura do
input pelo token `--explorer-control-size`: 25 × 25 px em Detalhes de análises
e 32 × 32 px nas demais visualizações e no seletor de pastas, com raio de 4 px; ícone e
borda usam o mesmo tom escuro da paleta de Julgamentos Realizados, distinto
por ação. Nos menus de visualização, somente o ícone recebe caixa quadrada
da mesma dimensão; o rótulo fica ao lado, fora da borda, com toda a linha clicável.
Os itens do menu ocupam a largura total, alinhados à esquerda, de modo que as
caixas de ícone e os rótulos partilham o mesmo x em todos os modos. A regra dos
itens usa a mesma lista de escopos do `:is()` dos botões de ação, acrescida de
`.ea-storage-view-menu` e `[role="menuitemradio"]`: a especificidade do `:is()`
é a do seu argumento mais específico (a variante `.admin-filter-bar`), e um
seletor mais fraco perdia para `justify-content:center` fora de Detalhes de
análises, centralizando e deslocando cada item conforme a largura do rótulo.
As ações de pasta preservam rótulos acessíveis e títulos completos sem texto dentro do botão.
Os rótulos dos menus usam a cor normal do texto; a opção vigente mantém
`aria-checked` sincronizado; somente a opção vigente exibe um check verde
ao lado do nome, fora da caixa do ícone, sem fundo ou contorno de seleção.
**Modo de visualização** e **Desmarcar todas** seguem explicitamente a mesma
geometria, inclusive com seleção ativa. O indicador do modo ocupa o canto do
quadrado sem deslocar nem sobrepor o ícone principal. O menu é ancorado às
coordenadas reais do botão pelo helper compartilhado `posicionarMenu`, com
limites do viewport e realinhamento em rolagem e redimensionamento, inclusive
na transição Lista → Detalhes → Lista e em ancestrais transformados.
As divisórias usam apenas uma borda de 1 px por junção, branca nos cabeçalhos
e na paleta existente nas células, sem somar bordas adjacentes. Valores
truncados de todas as colunas e cabeçalhos reutilizam o mesmo Notify da coluna
Nome (mesmo título "Valor completo", cor, geometria e regra de posição, inclusive
no seletor de pastas), inclusive no foco, sem tooltip nativo concorrente.
Cabeçalhos de tabelas e grades Detalhes têm bordas laterais brancas em cada
célula, incluindo o canto. Tabelas usam bordas separadas para preservar as
divisórias. Indicadores reais de ordenação são brancos e precedem o título.
Hover, foco e seleção mantêm as cores individuais. Menus se alinham ao
lado apropriado da barra no desktop e no mobile para permanecer no viewport.
`node tests\browser\explorador-acoes.cjs` mede cores, raio, contraste,
dimensões e ausência de cortes em 1600 e 390 px, incluindo o seletor de pastas,
e o alinhamento dos itens do menu (largura total, mesmo x das caixas de ícone e
dos rótulos, em repouso e com hover, em todos os modos).

- `tests/test_storage_detalhes_jobs.py`: dados sintéticos, totais aninhados,
  falhas, mtime, isolamento, consulta não bloqueante e contagem de operações.
- `node tests\browser\storage-detalhes.cjs`: explorador real e template oficial
  de Julgamentos Realizados, com metadados de fixture; compara estilos
  computados e verifica seleção, filtro, acesso a todos os itens, modos, espera e falhas.
  Também compara a assinatura computada da toast (fundo, cor, borda, raio, fonte,
  padding, sombra, largura, posição, título) entre Nome e todas as demais colunas
  e cabeçalhos dos exploradores, no seletor de pastas e no explorador de camadas.
  Também cobre linha única, bordas, texto completo seguro no Notify e foco,
  incluindo seletores padrão/inline, explorador de camadas e modal de metadados.
  A fixture não certifica sessão autenticada, latência ou dados da produção.
