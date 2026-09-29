# Fluxo de arquivos na bancada compartilhada

Componente: `templates/componentes/_geoprocessamento.html`, servido em
`/restrict/geoespacial/bancada/` e nos iframes das fases.

## Fonte dos dados

O comando **Carregar do sistema** abre no painel direito um formulário no padrão de
**Importar arquivo**. O campo **Camada do sistema** abre um explorador modal
independente do painel, com as raízes publicadas do storage geoespacial e as camadas
cadastradas no banco. As pastas-raiz são descobertas pela API de pastas do storage,
incluindo `base-geoespacial` e `superficies-indices`. Confirmar a seleção apenas
preenche o campo, e **Carregar camada** efetiva a abertura das referências
selecionadas via `gpArquivos.abrirReferencias`.
Para arquivos vetoriais nativos do storage SFTPGo, identificados por
`storage:<caminho>::<camada>`, o servidor lê o original com
GDAL e a abertura retorna metadados; o mapa recebe tiles vetoriais. Geometrias não são
enviadas em massa ao navegador. Os tiles incluem um atributo técnico com o FID original
para permitir filtros e seleções exatos.

Arquivos locais registrados em formatos nativos seguem o mesmo fluxo de metadados e
tiles. Pacotes compactados ainda usam a leitura legada integral em memória, limitada a
16 MB. O explorador de pastas aberto pelo formulário **Importar arquivo** serve para
escolher o destino de envio ao storage; suas ações de criar, renomear e excluir pastas
não carregam camadas para o mapa.

## Exploração e edição

**Tabela** lê páginas de atributos no servidor, identificadas pelo FID original.
Seleções da página obtêm do servidor somente as geometrias selecionadas, em lotes
de até 100 feições, para sincronização com o mapa. A paginação e a consulta não
materializam o GeoJSON integral da camada.

Na edição geométrica de uma camada nativa do storage, a bancada solicita ao servidor
as geometrias selecionadas, limitadas a 100 FIDs por abertura do editor. Leaflet.Draw
altera o rascunho; ao salvar, somente geometrias e atributos alterados, feições novas
e FIDs excluídos são enviados. Feições não selecionadas permanecem intactas no arquivo.
Multipartes são reunidas por identificador. Desfazer/refazer atua no rascunho e
cancelar fecha a sessão sem gravar.
Camadas com coordenadas Z ou M podem ser exploradas, mas a edição geométrica é
bloqueada porque o editor do mapa não preserva essas dimensões.

**Salvar alterações** valida revisão, campos, FIDs, geometrias e coordenadas no
servidor. A escrita é feita em cópia temporária verificada antes da publicação no
mesmo caminho do storage, sem criar camada ou versão de backup. GeoPackages
multicamada preservam as demais camadas e os FIDs da camada editada. Uma sessão
com revisão antiga deve reabrir o arquivo antes de salvar. A edição incremental de
atributos da tabela segue o mesmo princípio: transmite apenas os campos alterados
e exclusões.
Para arquivos nativos do storage, a calculadora da bancada solicita uma resposta
sem a coleção GeoJSON e atualiza a sessão com metadados relidos do original. A API
mantém a resposta GeoJSON quando o parâmetro não é informado, preservando o contrato
dos demais consumidores.

## Execução

Formulários de algoritmos que usam arquivos abertos passam por
`/api/geoespacial/bancada-arquivos/executar-job`. Todas as entradas precisam estar
abertas nesse fluxo, sem editor ativo. O servidor verifica as revisões, lê os
originais com GDAL/pyogrio e executa o motor no backend. IDs internos exclusivos
isolam esses dados do cache antigo e são retirados ao final. A execução guarda os
identificadores originais, caminhos e revisões. Saídas vetoriais ainda podem ser
reabertas como GeoJSON para compatibilidade com os módulos existentes.

## Limites atuais

- A leitura paginada cobre os formatos vetoriais nativos aceitos por GDAL.
  A edição incremental de atributos e geometrias cobre GeoPackage, Shapefile,
  GeoJSON e JSON do storage; pacotes compactados, FlatGeobuf e KML não são
  editáveis por essas rotas.
- Arquivos locais registrados e camadas abertas por outros caminhos mantêm seus
  contratos de leitura e gravação existentes.
- O formulário de algoritmo neste fluxo processa todas as feições. O processamento
  parcial por seleção ainda não foi integrado para todas as operações.
- A consulta por extensão e a saída de todas as operações ainda não usam
  exclusivamente a representação nativa em tiles.
- Funções/modelos e camadas recebidas por outros caminhos continuam com seus
  contratos existentes. A migração das demais páginas não faz parte desta etapa.

## Seleção por atributo e inversão

Na tabela, **É nulo** seleciona valores ausentes e **Não é nulo** seleciona os
valores preenchidos. Zero, `false` e texto vazio são valores não nulos. Essas
condições dispensam o campo Valor e respeitam a opção **Somente na seleção atual**.
A consulta usa os valores do rascunho, incluindo edições ainda não salvas.

**Inverter seleção** troca os selecionados pelos demais registros no escopo
disponível. Na tabela paginada de arquivos nativos, a operação se limita à página
carregada e preserva a seleção das demais páginas. Com **Mostrar somente
selecionados** ativo, a visualização acompanha o novo conjunto. A operação
sincroniza o mapa e não grava dados.

As APIs `camadas/{id}/consultar-atributos` e `bancada-arquivos/consultar` aceitam
expressões como `campo is None` e `campo is not None`, e o parâmetro opcional
`inverter_selecao` (query string na primeira, JSON na segunda). A leitura nativa
também oferece `/api/geoespacial/bancada-arquivos/consulta`, paginada por FID.
A inversão inclui
as linhas que não atenderam à condição, inclusive comparações sem resultado por
valor ausente. Chamadas de funções continuam proibidas nas expressões.

Validação isolada: `tests/test_selecao_atributos.py` e
`tests/browser/selecao-atributos.cjs`, sem escrita no banco oficial.
