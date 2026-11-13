---
applyTo: "**"
description: "Obrigacao de aplicar o layout padrao das tabelas em qualquer conteudo criado ou alterado no repositorio"
---

# Tabelas: leitura obrigatória antes de iniciar qualquer tarefa

Esta instrução vale para **todo e qualquer agente** (inclusive subagentes e
agentes especializados) que iniciar trabalho neste repositório, em qualquer
contexto: nova página, componente, modal, relatório, painel, exportação,
documentação renderizada ou ajuste em conteúdo existente.

## Regra

1. **Antes de começar a tarefa**, ler integralmente
   [docs/prompt-layout-padrao-tabelas.md](../../docs/prompt-layout-padrao-tabelas.md).
2. Se o conteúdo que você vai criar ou alterar **incluir qualquer tabela**
   (HTML, componente, modal, bloco de resultados, lista tabular), essa tabela
   **já deve nascer com o layout padrão** descrito naquele documento:
   título, barra de filtros com botões de grupos de colunas, tabela com
   seletores e zebrado, barra de botões de controle, paginador e contador, na
   ordem, alinhamentos, dimensões, espaçamentos e hierarquia tipográfica ali
   especificados. Não entregar a tabela "simples" para padronizar depois.
   Os botões de grupos de colunas e a barra de botões de controle são
   **obrigatórios**; seus **nomes e funções variam conforme o conteúdo da
   tabela**: a barra reúne os botões comuns (visualizar, editar, cancelar,
   salvar, excluir, exportar, limpar seleção, quando a operação existir) e,
   após eles, os botões específicos daquele conteúdo, todos na mesma geometria.
3. Se a tarefa não envolver tabela, nenhuma ação adicional é necessária, mas a
   leitura prévia continua obrigatória para que a decisão seja consciente.

## Referências de cor e tipografia: verificação obrigatória antes de codar

O layout padrão é fixo; **cor e família de fonte são as únicas variáveis**, e
elas devem ser as do **sistema onde a tabela será implementada**, nunca
valores inventados nem copiados de outro projeto. Portanto, **antes de escrever
qualquer código de tabela**, é obrigatório levantar e registrar:

- **Paleta do sistema de destino:** tokens de cor existentes (neste
  repositório, `:root` em [assets/css/app.css](../../assets/css/app.css):
  `--pli-deep`, `--pli-blue`, `--pli-green`, `--pli-border`, `--pli-text`,
  `--pli-muted`, `--pli-bg`, `--pli-error`), cores de status em
  `assets/js/status-colors.js` e as cores já usadas pelos botões de controle,
  cabeçalhos, zebrado, links de célula, paginador e contador nas tabelas
  vizinhas.
- **Tipografia do sistema de destino:** famílias carregadas e seus pesos
  disponíveis (neste repositório: Roboto para corpo, dados, filtros, paginador
  e contador; Montserrat para cabeçalhos de coluna, cabeçalhos de grupo e
  rótulos de seção), além da escala de tamanhos já praticada nas tabelas.
- **Estilos computados de uma tabela de referência já implantada**, medidos
  no navegador (não apenas lidos na folha de estilo, pois há regras em
  cascata). A referência oficial é a tabela "Hierarquizações realizadas" em
  `/restrict/hierarquizacao/processos/`.

Só depois desse levantamento o código da tabela pode ser escrito, usando os
tokens e famílias encontrados, de modo que o resultado seja visualmente
coerente com o restante do sistema. Divergência do padrão exige solicitação
explícita ou aprovação prévia do usuário.

## Validação

Ao concluir, comparar os estilos computados da nova tabela com os da
referência no navegador (vários registros, seleção ativa, filtro aplicado,
segunda página e tela estreita) e corrigir qualquer diferença de estrutura,
alinhamento, dimensão ou espaçamento antes de declarar a tarefa concluída.
