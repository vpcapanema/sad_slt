# Fluxo de arquivos na bancada compartilhada

Componente: `templates/componentes/_geoprocessamento.html`, servido em
`/restrict/geoespacial/bancada/` e nos iframes das fases.

## Fonte dos dados

O comando **Abrir arquivo** (também **Carregar do sistema**) reutiliza o explorador
de `data/geoespacial`. O catálogo verifica o vínculo; GDAL lê o conteúdo do arquivo.
O storage SFTPGo também pode ser aberto por IDs `storage:<caminho>::<camada>`.
`bancada-arquivos.js` mantém caminho, revisão, CRS original, esquema dos
campos e GeoJSON da sessão. Não substitui essa representação por geometria do banco.

## Exploração e edição

**Tabela** abre mapa e tabela sincronizados pelo FID do arquivo. Permite pesquisa,
ordenação, seleção e páginas de 100 linhas. A paginação é no navegador: o arquivo
vetorial ainda é carregado integralmente, não há consulta espacial paginada no servidor.

**Editar** usa Leaflet.Draw instalado no projeto para criar/excluir feições e
editar vértices da feição selecionada. Multipartes são desdobradas no editor e reunidas por identificador.
Os campos da feição selecionada ficam editáveis; desfazer/refazer atua no rascunho.
Aplicar na barra do Leaflet.Draw apenas confirma a operação no rascunho.
Cancelar edições fecha a sessão sem gravar.

**Salvar alterações** verifica a revisão do arquivo, campos, identificadores,
geometrias e coordenadas. Grava no mesmo caminho do storage, no CRS de origem,
atualiza o registro existente no catálogo e mantém a camada ativa com o mesmo ID.
Não cria cópia, backup ou nova camada. A edição salva substitui o conteúdo anterior.
A escrita usa um arquivo temporário apenas durante a substituição, sem mantê-lo
como versão. No storage SFTPGo a substituição usa sua API REST; a montagem de
leitura continua somente leitura. GeoPackages multicamada preservam as demais
camadas e os FIDs da camada editada. A revisão é o hash do acervo ou a combinação
de data e tamanho do storage. Uma sessão com revisão antiga deve reabrir o arquivo antes de salvar.

## Execução

Formulários de algoritmos que usam arquivos abertos passam por
`/api/geoespacial/bancada-arquivos/executar`. Todas as entradas precisam estar
abertas nesse fluxo, sem editor ativo. O servidor verifica suas revisões e lê os
arquivos novamente. IDs internos exclusivos isolam esses dados do cache antigo;
o motor existente executa e esses IDs são retirados ao final. A execução guarda
os identificadores originais, caminhos e revisões. Saídas vetoriais com arquivo
são reabertas por GDAL e adicionadas à bancada.

## Limites atuais

- Este fluxo cobre arquivos vetoriais de uma única camada, registrados no catálogo.
- Rasters, arquivos multicamada, consulta por extensão e paginação no servidor
  ainda exigem integração própria.
- O formulário de algoritmo neste fluxo processa todas as feições. O processamento
  parcial por seleção ainda não foi integrado.
- A calculadora de campos por expressão ainda não foi integrada; os atributos
  são editados na tabela da sessão do arquivo.
- Funções/modelos e camadas recebidas por outros caminhos continuam com seus
  contratos existentes. A migração das demais páginas não faz parte desta etapa.
- A leitura e os algoritmos não recorrem ao banco para substituir arquivo ausente
  nas entradas deste fluxo. O ciclo de saída ainda mantém a cópia vetorial no banco
  por compatibilidade com os módulos existentes.

## Validação

`tests/test_bancada_arquivos.py` verifica edição, CRS, rejeições, revisão concorrente,
gravação no original e uso do motor. Usa arquivos GDAL reais em diretório temporário e
substitutos para persistência no banco, sem publicar dados de teste no catálogo.

## Seleção por atributo e inversão

Na tabela, **É nulo** seleciona valores ausentes e **Não é nulo** seleciona os
valores preenchidos. Zero, `false` e texto vazio são valores não nulos. Essas
condições dispensam o campo Valor e respeitam a opção **Somente na seleção atual**.
A consulta usa os valores do rascunho, incluindo edições ainda não salvas.

**Inverter seleção** troca os selecionados pelos demais registros da camada,
considerando todas as páginas. Com **Mostrar somente selecionados** ativo, a
visualização acompanha o novo conjunto. Seleção vazia passa a selecionar todos;
seleção completa passa a vazia. A operação sincroniza o mapa e não grava dados.

As APIs `camadas/{id}/consultar-atributos` e `bancada-arquivos/consultar` aceitam
expressões como `campo is None` e `campo is not None`, e o parâmetro opcional
`inverter_selecao` (query string na primeira, JSON na segunda). A inversão inclui
as linhas que não atenderam à condição, inclusive comparações sem resultado por
valor ausente. Chamadas de funções continuam proibidas nas expressões.

Validação isolada: `tests/test_selecao_atributos.py` e
`tests/browser/selecao-atributos.cjs`, sem escrita no banco oficial.
