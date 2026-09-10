# Extração de atributos

Página: `/restrict/geoespacial/extracao-atributos/` (prefixo `/sicard` na VM).

## Fluxo implementado

1. Carregar categorias ativas de `dominios.categoria_extracao_atributos` e camadas
   vetoriais do catálogo. Resultados temporários/removidos não são oferecidos.
2. Escolher bases e entrada no explorador com raiz lógica `data/geoespacial`:
   Entradas/acervo (`uploads/datastorage`), Biblioteca canônica
   (`biblioteca_canonica`) e Saídas (`outputs`). Pastas internas não são expostas.
   O botão Nova pasta cria subpastas dentro das três áreas, sem mover arquivos
   ou alterar vínculos. A criação exige perfil com permissão de operação;
   nomes inválidos, destinos externos e duplicações são recusados. O explorador
   reutiliza `/camadas-arquivo/navegar` e `/camadas-arquivo/carregar`, oferece
   formatos vetoriais/contêineres e confirma o ID no catálogo vetorial antes de
   selecionar. Arquivos sem registro e rasters não entram na análise.
   A barra de caminho oferece navegação por componentes. O painel possui modos
   Lista, Detalhes e Ícones grandes e ações de criar/renomear pasta, salvar e
   cancelar a edição. A renomeação aceita apenas pastas vazias e protege as três
   pastas principais, preservando os vínculos de arquivos existentes.
   Os controles da janela permitem minimizar, maximizar e fechar.
   Escolher a categoria antes da base e clicar em Confirmar após selecionar o
   arquivo. A confirmação envia a camada ao seletor e ao mapa. As geometrias selecionadas
   são carregadas no Leaflet pela API existente. Uploads e cadastro de categorias
   abrem as páginas próprias; o botão de atualização recarrega os seletores.
3. Executar interseção ou Identity com GDAL/OGR no servidor. O navegador envia IDs;
   nomes e conceitos são resolvidos no servidor e guardados com a execução.
4. Consultar geometria, síntese, atributos e estatísticas por categoria e camada.
5. Exportar a análise completa em PDF, XLSX, CSV, GeoJSON ou GeoPackage. Filtros da
   tela não alteram os arquivos. Recuperar a última execução nesta sessão do navegador.

## Organização e endpoints

- Template principal e três componentes em `templates/componentes/extracao_atributos/`.
- CSS em `assets/css/extracao-atributos.css`; módulos ES separados para configuração,
  mapa, resultados, API, bancada e orquestração em `geoespacial/extracao-atributos/`.
- Router `api/routers/extracao_atributos.py`, incluído no router geoespacial.
- Serviços `extracao_atributos.py` (execução/catálogo),
  `extracao_atributos_analise.py` (análise) e `extracao_atributos_exportacao.py`.

Sob `/api/geoespacial/extracao-atributos`:

| Método | Caminho | Função |
|---|---|---|
| GET | `/catalogo` | Categorias e camadas reais |
| POST | `/execucoes` | Iniciar análise e devolver ID |
| POST | `/pastas` | Criar subpasta (`caminho`, `nome`) |
| PATCH | `/pastas` | Renomear pasta vazia (`caminho`, `nome`) |
| GET | `/execucoes/{id}` | Estado, erro ou resultado |
| GET | `/execucoes/{id}/exportar/{formato}` | Baixar relatório/geometria |

Todos exigem acesso geoespacial; consulta e exportação exigem o proprietário da
execução. Payload: `input_id`, `operacao` (`intersection` ou `identity`) e
`categorias: [{id, camadas: [id]}]`. Categorias inativas, bases repetidas ou iguais
à entrada são rejeitadas. CRS ausente, geometrias inválidas/vazias e mistura de
dimensões na mesma camada exigem correção na bancada.

## Medição e atributos

O algoritmo reaproveita `_overlay_ogr` do complemento. Interseções e medidas
planimétricas usam EPSG:5880 (SIRGAS 2000 / Brazil Polyconic), com as distorções
inerentes à projeção. O mapa usa EPSG:4326. Linhas apresentam m e km; polígonos,
ha e km². Contatos sem medida da dimensão da entrada são descartados. Pontos
apresentam dentro/fora; contato com limite conta como dentro. Cada ponto de uma
multiparte é uma observação.

O denominador é a união geométrica da entrada, evitando duplicações internas.
Totais únicos por camada, categoria e geral usam união geométrica; percentuais
entre grupos não devem ser somados. Estatísticas representam a extensão atingida
por feição da entrada, incluindo zeros: média, mediana, mínimo, máximo, desvio
padrão populacional e quartis por interpolação linear. A metodologia acompanha
os resultados e o PDF.

Cada ocorrência mantém atributos da entrada e da base separados, com IDs de ordem
das feições começando em zero. Identity conserva partes externas na geometria,
sem contabilizá-las como extração. Categorias organizam a leitura; não inferem
automaticamente impactos positivos/negativos, severidade ou pesos.

## Persistência e bancada

A execução usa `geoprocessamento.execucao_arquivo`. A saída passa por
`registrar_camada` e pelo ciclo de vida existente: arquivo canônico, registro no
banco e vínculo com a execução. `outputs/<execução>/extracao.json` guarda o
relatório completo; as exportações derivadas são produzidas nessa pasta.
O GeoPackage baixado é o arquivo canônico registrado. O resultado recebe vínculo
de uso como relatório. Requer migrations 104 e 105 e storage persistente.

A bancada simplificada chama os jobs existentes para validar, reparar,
reprojetar, recortar, dissolver e selecionar por localização. Não reimplementa
esses algoritmos. Novas saídas entram no catálogo para seleção explícita.

O processamento é sequencial por processo da API, em segundo plano. Execuções
concluídas sobrevivem à recarga da página. Reinício do serviço durante uma tarefa
não oferece retomada automática. Camadas são carregadas integralmente; conjuntos
muito grandes podem exigir otimização posterior de memória e visualização.

## Lista de camadas por categoria

A subseção 1.1 tem uma lista de montagem com a largura do card, abaixo dos campos
de categoria e de camada base. O usuário escolhe uma categoria, marca suas camadas
no explorador, troca de categoria e repete. Nada chega à bancada antes de confirmar.

A lista guarda o caminho relativo de cada camada e mostra apenas o nome do
arquivo; o caminho completo fica no título da linha e é o que o sistema usa para
localizar o arquivo. O caminho vem do catálogo, que passou a informá-lo a partir
do que está registrado nos metadados da camada.

Seis botões quadrados operam apenas sobre essa lista. Confirmar envia as camadas
à bancada já agrupadas pelas categorias da lista. Salvar grava a lista como
configuração. Editar alterna o modo de edição: com ele ativo, clicar em uma
camada da lista a remove; fora dele a lista é só leitura. Para acrescentar
camadas com a lista aberta, escolha a categoria no seletor e use o explorador: o
que for selecionado entra no grupo daquela categoria. Carregar abre um explorador da pasta das
configurações para escolher um arquivo salvo; o conteúdo é acrescentado à lista,
sem apagar o que já estava montado. Camadas repetidas são ignoradas: quem já está
na lista permanece na categoria em que estava, e quem já foi enviado à bancada não
volta. A mensagem informa quantas entraram e o que foi ignorado. Limpar tudo esvazia a lista sem
tocar na bancada. Cancelar restaura a lista ao último estado confirmado ou
carregado.

Ao confirmar, o sistema percorre a lista, cria em Camadas operacionais um grupo
com o nome de cada categoria e coloca nele a camada de cada arquivo, lida pelo
caminho guardado. Os subgrupos aparecem em Camadas operacionais por categoria. Os subgrupos seguem ordem alfabética. Dentro de cada um,
as camadas vêm por geometria, na ordem ponto, linha e polígono, e depois por nome.
O símbolo de cada camada corresponde à sua geometria.

As configurações ficam em `data/geoespacial/configuracoes/extracao-atributos`,
um JSON por configuração, fora das áreas do explorador de camadas. O arquivo
guarda só referências: identificador e nome de cada camada, agrupados por
categoria. Não copia geometria nem atributos. Camadas geradas pelo plugin
municipal são descartadas ao salvar, porque cada geração cria um arquivo próprio
no acervo cuja referência não se repete em outro ambiente. Ao carregar, o serviço
confere o catálogo atual e informa quais referências não existem mais, em vez de
falhar.

Pastas terminadas em `.zip.contents` guardam um shapefile já descompactado. O
explorador passou a listá-las como camada selecionável, e não como pasta, para
permitir a escolha em lote junto com os demais arquivos. Valem as mesmas regras
dos outros arquivos: só aparecem as que possuem vínculo registrado no catálogo.

Reimportar o mesmo arquivo deixa registros antigos do catálogo apontando para
ele. A leitura para o mapa usa o registro mais recente em vez de recusar o
arquivo: a geometria é a mesma em todos, e recusar bloquearia um uso legítimo por
duplicidade de metadado. A resposta informa quantos vínculos existem.

Shapefile sem `.cpg` não declara a codificação da tabela de atributos. A leitura
tenta como está e, se o texto não for UTF-8 válido, relê como Latin-1. A resposta
informa qual codificação foi usada.

## Gerador de camada municipal

Cada categoria oferece **Gerar camada municipal desta categoria**. O componente
React do pacote `plugins/municipal-layer` é servido compilado em
`geoespacial/extracao-atributos/municipal-plugin/` e conversa com
`/api/geoespacial/extracao-atributos/municipal/{categoria}/{catalog|preview|export}`.
A categoria identifica o destino conceitual; nenhum filtro temático oculta
indicadores, e o usuário escolhe livremente fontes e anos.

Os dados vêm do schema `base_municipal` (migration 106): a malha do IBGE de 2022
com 645 municípios em SIRGAS 2000, 6.347 atributos e 4.093.815 observações. O
serviço `api/services/base_municipal.py` monta catálogo, prévia e exportação a
partir dessas tabelas. Não há leitura de SQLite nem de GeoPackage em disco, e o
pacote `plugins/` não participa da execução; ele permanece apenas como origem dos
insumos e do componente compilado.

A carga é feita uma vez por banco, com `scripts/carregar_base_municipal.py` a
partir de `plugins/municipal-layer/data/`. A migration cria o schema vazio; sem a
carga, o gerador falha informando que a malha não está disponível. `--conferir`
reexecuta as verificações de contagem, cobertura, órfãs e validade geométrica.

O nome da camada segue uma convenção automática: categoria escolhida, fonte
majoritária da seleção e data da geração, separadas por travessão, como em
`Econômico — IBGE · Censo 2022 — 2026-09-10`. A fonte majoritária é a que
contribui com mais atributos na seleção; empates seguem a ordem em que as fontes
aparecem no manifesto, que é a mesma ordenação do catálogo. A data usa o fuso de São Paulo, porque o contêiner roda em UTC e viraria
o dia às 21h. O campo de nome abre vazio e mostra a convenção como sugestão;
qualquer texto digitado substitui o nome automático.

Cada geração grava uma pasta própria em
`data/geoespacial/uploads/datastorage/vetor/municipal_<execucao>/` com camada,
dicionário e metadados, e registra a camada, a procedência e os hashes em
`geoprocessamento.camada_importada`. As feições não são copiadas para o banco de
geoprocessamento: a extração relê o arquivo. FlatGeobuf aceita todos os
atributos; GeoPackage aceita 1.900 e Shapefile 250, com campos renumerados.
A seleção completa em FlatGeobuf leva cerca de 30 segundos e aproxima-se do
limite de memória do contêiner de produção.

## Validação

`tests/test_municipal_layer.py` usa o schema `base_municipal` real: confere a malha
e o catálogo, materializa nos três formatos comparando os valores reabertos com a
consulta ao banco, e exige sessão na API.

`tests/test_extracao_atributos.py` exercita o motor GDAL real com dados sintéticos,
contatos, pontos, estatísticas, atributos e exportações. O teste de integração em
`tests/test_ciclo_vida_banco.py` é opt-in (`SLT_TEST_CICLO_BANCO=1`): grava e recupera
a extração com banco real em transação revertida e storage temporário, verifica
GeoPackage e PDF e rejeita outro proprietário. Não constitui teste de carga.
