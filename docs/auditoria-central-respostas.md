# Revisão da Central de respostas — 27/10/2026

Referência: `docs/padrao-tabelas.md` e Central de julgamentos.

## Cobertura

Inventário recursivo de 48 arquivos locais: templates, componentes, macro de
navegação, 21 folhas CSS e 15 scripts, incluindo bibliotecas de terceiros.
Os arquivos foram lidos integralmente pela verificação automatizada; os scripts
foram analisados pelo parser JavaScript e as folhas CSS pelo navegador (4.730
regras, incluindo regras aninhadas). Essa verificação não equivale a uma auditoria
funcional ou de segurança interna das bibliotecas minificadas Font Awesome e XLSX.

A revisão de implementação e do resultado visual concentrou-se na página,
seus componentes e nas regras compartilhadas que a afetam. Foram exercitados
o painel inicial e as sete subseções do espaço analítico, inclusive as tabelas
criadas dinamicamente, análises consolidadas, mudanças de julgador e estados vazios.

## Correções

- A cascata antiga reduzia fontes das tabelas internas apesar da padronização
  da tabela principal. Cabeçalhos agora usam Montserrat 11,52 px e dados Roboto
  11,84 px; títulos de seção usam 14 px, subseções 13 px e títulos internos
  de tabelas/análises 12 px, com indicadores de 24 px.
- Células de identificação das linhas da matriz homologada deixaram de herdar
  o visual de cabeçalho de coluna. A semântica de cabeçalho de linha foi mantida.
- Zebrado branco/azul-claro também se aplica às matrizes. O afastamento entre
  julgamentos continua indicado por uma marca colorida na base da célula,
  em vez de substituir o zebrado ou deixar texto branco sobre fundo branco.
- Análises consolidadas receberam cabeçalho de subseção e numeração 7.1, 7.2
  etc., com alternância de fundo correspondente à profundidade.
- Hierarquia tipográfica dos cards, rótulos, valores, explicações e campos
  foi alinhada à referência. Controles de tabelas mantêm gap de 8 px.
- Os contêineres adicionados pelos controles de tabela agora ocupam a posição
  correta no grid com gráficos; telas estreitas empilham tabela e gráfico.
- A tabela de pares preserva filtros, seletores, controles e rodapé quando vazia.
- Filtros principais correspondem às colunas visíveis e usam datas formatadas
  como as células. Campos de hierarquização ausentes da tabela foram retirados
  do seletor de filtros da Central de respostas.
- Calcular fica desativado sem respostas selecionadas e durante gravação.
- Barras interativas dos gráficos funcionam por Enter/espaço, com foco visível.
- Duas funções homônimas de formatação da escala de Saaty foram separadas,
  evitando que o simulador sobrescrevesse a formatação dos dados analíticos.
- Removida a inclusão duplicada de Font Awesome no template da página.

Os ajustes finais de CSS estão em
`assets/css/paginas/central-respostas-padrao.css`, com escopo exclusivo da
Central de respostas. O carregamento continua usando os componentes comuns.

## Validação

### Modos de consulta e edição

Na barra principal, **Ver respostas colaborativas** recupera o julgamento em
somente leitura. Matriz, pesos e métricas usam a análise homologada registrada
(ou a primeira análise retornada, quando não há homologação); não existe cálculo
de uma nova prévia nesse modo. A consulta por julgador mostra sua matriz gravada.
Campos, seleção de respostas para consolidação, cálculo e homologação ficam
bloqueados. Filtros, paginação e consulta continuam disponíveis.

**Editar respostas colaborativas** requer um único julgamento selecionado e
habilita os controles já editáveis: nome da análise, RC máximo, exclusão de
inconsistentes, método de agregação e respostas incluídas. Salvar continua
utilizando o fluxo existente de criação de análise consolidada; não altera
automaticamente as matrizes originais enviadas pelos colaboradores.

`tests/browser/central-respostas-modos.cjs` verifica dados persistidos,
bloqueio dos handlers de cálculo/homologação, habilitação da edição e retorno
à consulta sem manter alterações locais não salvas.

- `tests/browser/central-respostas-padrao-completo.cjs`: fontes computadas de
  todas as tabelas internas, seletores de 44 px, filtros de 25 px, títulos sem
  corte, desktop e celular, filtros de métricas/datas, estados dos botões,
  teclado, troca de julgador e tabelas vazias.
- `tests/browser/central-respostas-rodapes.cjs`: filtros, navegação e rodapés.
- `tests/browser/table-smart-widths.cjs`: cabeçalhos e larguras nas quatro páginas.
- `tests/browser/fluxo-integrado.cjs`: seleção de respostas, prévia da matriz,
  método de agregação, identidade do julgamento e paginação com 17 respostas.

Os testes utilizam respostas de API simuladas; não alteram registros reais,
não homologam análises reais e não enviam e-mails.
