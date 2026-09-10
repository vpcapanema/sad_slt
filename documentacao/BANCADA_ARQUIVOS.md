# Fluxo de arquivos na bancada compartilhada

Componente: `templates/componentes/_geoprocessamento.html`, servido em
`/restrict/geoespacial/bancada/` e nos iframes das fases.

## Fonte dos dados

O comando **Abrir arquivo** (também **Carregar do sistema**) reutiliza o explorador
de `data/geoespacial`. O catálogo verifica o vínculo; GDAL lê o conteúdo do arquivo.
`bancada-arquivos.js` mantém caminho, revisão SHA-256, CRS original, esquema dos
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

**Salvar nova versão** verifica a revisão do arquivo, campos, identificadores,
geometrias e coordenadas. Converte o rascunho para o CRS de origem e reutiliza o
ciclo de persistência existente: GeoPackage de saída via GDAL/pyogrio, validação
por reabertura, registro e vínculo com a execução. A fonte não é sobrescrita,
incluindo a biblioteca canônica. A nova versão passa a ser a camada ativa.
O ciclo existente normaliza a persistência vetorial para EPSG:4674.

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
nova versão e uso do motor. Usa arquivos GDAL reais em diretório temporário e
substitutos para persistência no banco, sem publicar dados de teste no catálogo.
