# Extração de atributos

Página: `/restrict/geoespacial/extracao-atributos/` (prefixo `/sicard` na VM).

## Fluxo implementado

1. Carregar categorias ativas de `dominios.categoria_extracao_atributos` e camadas
   vetoriais do catálogo. Resultados temporários/removidos não são oferecidos.
2. Escolher bases e entrada no explorador do storage, com raiz `base-geoespacial`
   (`GET /api/geoespacial/storage/navegar`). O explorador lista formatos vetoriais
   (GeoPackage, Shapefile, GeoJSON, KML, FlatGeobuf) e só permite escolher camadas
   presentes no catálogo vetorial; rasters e arquivos sem registro não entram. Ele
   não cria nem renomeia pastas: as rotas `POST`/`PATCH /pastas` existem, mas esta
   tela não as usa. Escolher a categoria antes da base. A entrada é uma única camada.
   As camadas confirmadas são desenhadas na bancada embutida (seção 02). Uploads e
   cadastro de categorias abrem as páginas próprias; o botão de atualização
   recarrega os seletores.
3. Executar interseção ou Identity com GDAL/OGR no servidor. O navegador envia IDs;
   nomes e conceitos são resolvidos no servidor e guardados com a execução.
4. Consultar geometria, síntese, atributos e estatísticas por categoria e camada.
5. Baixar o pacote `.zip` da extração: GeoPackage, relatório de processamento em
   PDF, relatório analítico em PDF, XLSX e CSV. Filtros da tela não alteram os
   arquivos. Recuperar a última execução nesta sessão do navegador. O índice de
   extrações abre os relatórios no navegador, o visualizador de camadas e o pacote.

## Modo enriquecimento

Geoprocesso "Enriquecimento · um registro por feição, com regras por base". Segue
`documentacao/geoespacial/FLUXO_CRUZAMENTO_ESPACIAL_CONFIGURAVEL.md`: em vez de uma
linha por pedaço de interseção, cada feição de entrada vira um registro (ou um
trecho por unidade de recorte) com os atributos de todas as bases.

Cada base confirmada aparece em **Bases confirmadas**, na área dinâmica do card 1
(conteúdo da 1.2), com o botão **Regra** ao lado (`geoespacial/extracao-atributos/regras.js`); o check up da extração
apenas repete a seleção e mostra a estimativa de registros. A regra é validada no
servidor por `api/services/extracao_atributos_regras.py`:

| Item | Opções | Padrão |
| --- | --- | --- |
| Papel | atributos; unidade de recorte (no máximo uma, só polígonos) | atributos |
| Ligação | por localização (intersecta, contém, está dentro); por atributo (chave da entrada = chave da base) | localização, intersecta |
| Multiplicidade | maior sobreposição, primeira, todas (um registro por feição), resumo (soma de números, lista de textos) | maior sobreposição |
| Campos, prefixo, apelidos | lista de campos; prefixo com letra minúscula e `_`; `CAMPO = Apelido` | todos; derivado do nome; nenhum |
| Preparação | buffer em metros, corrigir geometrias, separar por tipo | sem buffer, corrigir, separar |

O motor (`api/services/extracao_atributos_enriquecimento.py`) trabalha em EPSG:5880
e grava em EPSG:4674:

1. Prepara entrada e bases: corrige geometrias inválidas (`make_valid`), separa
   pontos, linhas e polígonos e aplica o buffer. Não recusa camada mista ou inválida.
2. Recorta linhas e polígonos pela unidade de recorte. Os atributos da unidade vêm
   da própria interseção, sem junção espacial depois do corte, porque o trecho
   termina na divisa e tocaria a unidade vizinha. Partes fora de todas as unidades
   continuam como trechos, com os campos da unidade vazios.
3. Enriquece base a base, na ordem das categorias. Registros sem correspondência
   são mantidos. "Primeira" é a feição de menor posição na base; "maior
   sobreposição" usa extensão ou área em comum e, sem medida (pontos), cai na
   primeira. Na ligação por atributo as chaves são comparadas como texto.
4. Cada base acrescenta `<prefixo>n_feicoes` (feições tocadas), `<prefixo>fid_base`
   (feição escolhida) e, na maior sobreposição, a medida em comum.

### Entradas, conferência e finalidades

No enriquecimento, **Entradas desta análise** lista as entradas: a principal (o campo
da 1.1) e as adicionais (**Adicionar entrada**), até 10.
**Configurar** define, por entrada:

- campo identificador, gravado em `id_origem`;
- filtro: campo preenchido, igual, diferente ou em uma lista (texto sem espaços nas
  pontas; valor só com espaços conta como vazio);
- campos a manter.

Registros de entradas com o mesmo tipo de geometria vão para a mesma camada de
saída, com `camada_origem` (nome da entrada) e `fid_origem` (posição da feição na
entrada original, antes do filtro).

A **conferência** (etapa 5) roda depois do enriquecimento, por caminhos independentes,
e fica em `validacao` no resultado e em `<saida>_validacao.json` no pacote:

- `id_registro` único;
- nenhuma feição de entrada sem registro;
- cada trecho dentro da própria unidade de recorte (resíduo até 0,001 m ou m²) e
  soma dos trechos igual à feição original;
- na maior sobreposição e na primeira, a feição escolhida é recalculada contra as
  candidatas da base;
- identificadores repetidos em cada entrada (informativo).

A execução não é interrompida: a tela mostra "aprovada" ou "REPROVADA" com os
números por camada.

**Recortes por finalidade** (etapa 6), conteúdo da 1.3: **Adicionar finalidade** abre um
diálogo com nome e a lista dos campos que a saída terá, agrupados por entrada e por
base, com filtro por nome. A lista é montada na tela a partir das entradas, das
bases confirmadas e das regras (mesmo prefixo que o servidor deriva), então não é
preciso digitar nome de campo nem executar antes. Cada finalidade leva os
identificadores (`id_registro`, `camada_origem`, `fid_origem`, `id_origem`) e os
campos escolhidos, e gera camadas `<finalidade>_<camada>` no GeoPackage e um CSV por
camada. Campo inexistente em todas as camadas recusa a execução.

A saída é uma camada por tipo de geometria da entrada, gravada no banco. O pacote
(`api/services/extracao_atributos_pacote_enriquecimento.py`) traz o GeoPackage com
as camadas e a entrada (apelidos como nome alternativo dos campos), um CSV por
camada, o XLSX com uma aba por camada e a aba `dicionario_campos`, o dicionário em
CSV e `configuracao.json` com entrada, bases, regras e procedência. Não há
relatórios PDF neste modo.

As configurações salvas estão na versão 3: guardam as bases com a regra de cada
uma, as entradas (identificador, filtro e campos) e as finalidades, o que permite
repetir a análise inteira. Arquivos das versões 1 e 2 continuam abrindo: o que falta
entra com o padrão (regra padrão, sem entradas e sem finalidades).

Na tela, o geoprocesso é escolhido pelo resultado desejado ("um registro por feição
da entrada" para o enriquecimento; "um registro por pedaço de interseção" para os
modos de sobreposição). Os indicadores da seção 03 mudam com o modo: no
enriquecimento são camadas de saída, bases com correspondência, registros e o
resultado da conferência.

## Organização e endpoints

- Template principal e três componentes em `templates/componentes/extracao_atributos/`.
- CSS em `assets/css/extracao-atributos.css`; módulos ES separados para configuração,
  mapa, resultados, API, bancada e orquestração em `geoespacial/extracao-atributos/`.
- Router `api/routers/extracao_atributos.py`, incluído no router geoespacial.
- Serviços `extracao_atributos.py` (execução/catálogo),
  `extracao_atributos_analise.py` (análise) e `extracao_atributos_exportacao.py`.

Sob `/api/geoespacial/extracao-atributos`:

| Método | Caminho | Função |
| --- | --- | --- |
| GET | `/catalogo` | Categorias e camadas reais |
| POST | `/arquivo-mapa` | Ler uma camada para desenhar no mapa |
| GET | `/configuracoes` | Listar configurações salvas |
| POST | `/configuracoes` | Salvar a lista de camadas por categoria |
| GET | `/configuracoes/{chave}` | Abrir uma configuração |
| DELETE | `/configuracoes/{chave}` | Excluir uma configuração |
| GET | `/execucoes` | Índice de extrações (próprias; gestor vê todas) |
| POST | `/execucoes` | Iniciar análise e devolver ID |
| GET | `/execucoes/{id}` | Estado, etapas, erro ou resultado |
| PATCH | `/execucoes/{id}` | Renomear a saída |
| DELETE | `/execucoes/{id}` | Excluir a extração |
| GET | `/execucoes/{id}/pacote` | Baixar o pacote `.zip` |
| GET | `/execucoes/{id}/relatorios/{processamento\|analitico}` | Abrir o PDF no navegador |
| POST, PATCH | `/pastas` | Criar e renomear pastas (sem uso nesta tela) |

Todos exigem acesso geoespacial; consulta, pacote e relatórios exigem o
proprietário da execução ou perfil gestor. Payload da execução: `input_id`,
`operacao` (`intersection` ou `identity`), `nome_saida`, `opcoes` do operador OGR e
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

A execução usa `geoprocessamento.execucao_arquivo`. A geometria de saída é gravada
no banco por `registrar_camada`, sem arquivo em `data/geoespacial/outputs`. O
relatório, as etapas, a procedência da entrada e das bases e o pacote `.zip`
(com tamanho e SHA-256 de cada arquivo) ficam em `geoprocessamento.extracao_atributos`
(migration 109). O resultado recebe vínculo de uso como relatório. Extrações
anteriores ao pacote no banco ainda são lidas de `outputs/<execução>/extracao.json`.
Requer as migrations 104, 105 e 109.

A bancada simplificada chama os jobs existentes para validar, reparar,
reprojetar, recortar, dissolver e selecionar por localização. Não reimplementa
esses algoritmos. Novas saídas entram no catálogo para seleção explícita.

O processamento é sequencial por processo da API, em segundo plano. Execuções
concluídas sobrevivem à recarga da página. Reinício do serviço durante uma tarefa
não oferece retomada automática. Camadas são carregadas integralmente; conjuntos
muito grandes podem exigir otimização posterior de memória e visualização.

## Layout do card 1

O card **1. Configuração geral da extração** tem três subcards do mesmo tamanho,
na ordem do processamento: **1.1 Configurações da camada de entrada**,
**1.2 Configurações das camadas de base e configurações** e
**1.3 Configurações da camada de saída**. Só campos fixos ficam dentro deles; na
1.2 a categoria e as camadas base ocupam duas colunas da mesma linha, e na 1.3 o
nome da camada de saída e o algoritmo de processamento fazem o mesmo.

As ações de cada subcard são botões-ícone do mesmo tamanho, lado a lado dentro de
uma caixa com a moldura dos outros campos: na 1.1 abaixo de **Camada de input**
(explorar storage, upload, remover entrada) e na 1.2 abaixo de **Camadas base**
(explorar storage, cadastrar categoria, upload, gerar camada municipal). O rótulo
fica no `title` e em texto para leitores de tela.

Em 1.3, **Algoritmo de processamento** oferece Enriquecimento (Spatial Join),
Interseção (Intersect) e Identidade (Identity). Abaixo do seletor,
`geoespacial/extracao-atributos/diagramas.js` desenha em SVG o que o algoritmo faz
— entrada, base e resultado — com uma legenda curta. Os desenhos são próprios, não
são material de terceiros.

Todo conteúdo dinâmico dos três subcards (entradas, lista de camadas por categoria,
bases confirmadas, parâmetros do algoritmo, recortes por finalidade, check up e o
botão de executar) é renderizado, mostrado e oculto na área `#ea-dinamico`, sempre
abaixo dos subcards, para que eles mantenham altura e largura iguais.

Cada conjunto dinâmico fica em uma aréola própria: moldura na cor do subcard de
origem (1.1 azul, 1.2 âmbar, 1.3 roxo, a mesma cor da borda superior do subcard) e
etiqueta com o número e o nome do subcard, centrada sobre a coluna dele. A aréola
desaparece quando todo o seu conteúdo está oculto.

Os cards principais são **1. Configuração geral da extração**,
**2. Bancada básica de geoprocessamento** e **3. Resultados**, com o mesmo
cabeçalho escuro.

## Lista de camadas por categoria

A lista de montagem da 1.2 fica na área dinâmica, com a largura do card 1, abaixo
dos três subcards. O usuário escolhe uma categoria, marca suas camadas
no explorador, troca de categoria e repete. Nada chega à bancada antes de confirmar.

A lista guarda o caminho relativo de cada camada e mostra apenas o nome do
arquivo; o caminho completo fica no título da linha e é o que o sistema usa para
localizar o arquivo. O caminho vem do catálogo, que passou a informá-lo a partir
do que está registrado nos metadados da camada.

Seis botões quadrados operam apenas sobre essa lista. Confirmar envia as camadas
à bancada já agrupadas pelas categorias da lista. Salvar grava a lista como
configuração. Editar alterna o modo de edição: com ele ativo, clicar em uma
camada da lista a remove, e o botão + de cada grupo abre o explorador já na
categoria daquele grupo; fora dele a lista é só leitura. Também é possível escolher
a categoria no seletor e usar o explorador: o que for selecionado entra no grupo
daquela categoria. Carregar abre um explorador da pasta das
configurações para escolher um arquivo salvo; o conteúdo é acrescentado à lista,
sem apagar o que já estava montado. No mesmo diálogo, Excluir apaga a configuração
selecionada, após confirmação. Camadas repetidas são ignoradas: quem já está
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
categoria. Não copia geometria nem atributos. Inclui referências às camadas municipais
materializadas no acervo. A gravação usa arquivo temporário e substituição atômica,
preservando a configuração anterior se a escrita falhar. Ao carregar, o serviço
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
`data/geoespacial/uploads/datastorage/vetor/municipios_sp_<id_curto>_<nome>/` com camada,
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
a extração com banco real em transação revertida e storage temporário, lê o pacote
`.zip` e o relatório de processamento guardados no banco e rejeita outro
proprietário. Não constitui teste de carga.

## Dois modos de enriquecimento — 24/09/2026

O seletor de algoritmo oferece os dois contratos; as configurações anteriores
com `operacao=enriquecimento` continuam no modo configurável.

| Opção | Contrato |
| --- | --- |
| Enriquecimento configurável (`enriquecimento`) | Mantém papel de recorte, ligação por chave, buffer e multiplicidade, inclusive `todas`. Pode dividir ou duplicar a entrada. |
| Enriquecimento sem recorte (`estatisticas`) | Preserva cada feição, sua geometria e todos os atributos de entrada. Acrescenta todos os campos de cada base, sem dividir ou duplicar. |

No modo sem recorte, a categoria oficial **Risco** ou **Restrição** determina o
resultado binário: cada campo da base recebe **Sim** se ao menos uma feição da
base intersectar a entrada, ou **Não** se nenhuma intersectar. Existe também
`<prefixo>intersecao`, inclusive para bases sem campos. Esse indicador expressa
somente a relação espacial, não gravidade ou aplicabilidade jurídica.

Nas demais categorias, o botão **Regra** oferece média, moda, mediana, total
(soma), mínimo, máximo, desvio padrão, variância e contagem. A medida padrão da
base é média; `estatisticas_campos` pode definir outra medida para cada campo.
Cada feição intersectada contribui uma única vez, com peso igual. Multipartes
não multiplicam sua contribuição. Toque na borda conta como interseção.

- Valores nulos são ignorados; zero participa dos cálculos.
- Sem interseção, todos os campos estatísticos ficam nulos, inclusive contagem.
- Havendo interseção com todos os valores nulos, contagem é zero; as outras
  medidas ficam nulas.
- Contagem conta valores não nulos do campo. O campo técnico `n_feicoes` conta
  as feições intersectadas, independentemente de seus atributos.
- Desvio padrão e variância são populacionais (`ddof=0`); uma observação resulta
  em zero. Não existe ponderação por área ou comprimento.
- Textos, códigos textuais e datas aceitam moda e contagem. Medidas numéricas
  nesses campos retornam nulo. Não se convertem códigos textuais em números.
- Empates na moda usam o primeiro valor na ordem da base usada na execução.

O novo modo ignora configurações antigas de recorte, buffer, seleção de campos
da base e junção por chave, normalizando-as para interseção real. Filtros ou
seleções de campos na **entrada** são recusados explicitamente: abra Configurar
na entrada e aplique a preservação integral, ou volte ao modo configurável.
As regras estatísticas ficam salvas na configuração e no pacote, e a medida
efetiva consta no dicionário de campos.

Geometrias inválidas são reparadas apenas em cópias de trabalho para consultar
interseções. A saída mantém a geometria original, no CRS padrão EPSG:4674;
feições nulas/vazias não são descartadas. A persistência do novo modo usa WKB e
seu GeoPackage não promove geometrias simples para multipartes. Entradas de
tipos distintos são agrupadas por tipo; a soma de todas as camadas de saída é
igual à quantidade total de feições de entrada. Finalidades são cópias opcionais
com subconjuntos de atributos, fora dessa contagem principal.

Os destinos permanecem os mesmos: feições processadas e pacote ZIP no PostgreSQL;
configurações no diretório persistente de configurações da extração. Este novo
modo não copia bases completas para o Codespace nem altera o gerador territorial.

## Entrada local temporária — 24/09/2026

**Selecionar camada existente** continua abrindo o explorador de storage.
**Enviar nova camada** abre o seletor de arquivos do computador na própria
página; não navega para outro módulo. A lista de montagem das bases fica oculta
até existir ao menos uma camada pendente. Bases confirmadas têm seu painel
próprio; a lista pendente volta a ficar oculta quando esvaziada.

O upload usa `POST /extracao-atributos/entrada-local`, autenticado, corpo binário
e resposta `Cache-Control: no-store`. O servidor lê o corpo por streaming com
limite, descompacta e abre os componentes somente em `/vsimem` do GDAL. Não usa
`UploadFile`/spool, arquivos temporários em disco nem cadastro de camada. O proxy
Nginx desta API desativa buffers de requisição e resposta para também evitar
spool do upload ou da prévia no proxy.

A entrada original e sua prévia ficam apenas no estado da página. Não são
armazenadas em localStorage, sessionStorage ou IndexedDB. Ao executar, o cliente
reenvia o arquivo original; o servidor revalida e entrega o GeoDataFrame em RAM
à tarefa. Isso funciona com os dois workers HTTP sem cache compartilhado. Os
parâmetros persistidos levam apenas metadados de procedência, incluindo tamanho,
CRS e hash. O arquivo original não é registrado no banco, não preenche o snapshot
`entrada_geojson` e não é incluído como camada `entrada` no GeoPackage persistido.
Os **resultados derivados** continuam seguindo a política normal da extração.

Formatos aceitos: GPKG, GeoJSON/JSON, FGB, KML, KMZ e ZIP de Shapefile ou de camadas
vetoriais. ZIP de Shapefile exige SHP, SHX, DBF e PRJ. Arquivo com várias camadas
mostra um seletor para escolher a entrada antes de validar/desenhar. Limites da
leitura em memória: 16 MB enviados, 32 MB descompactados, 200 componentes,
50 mil feições, 500 mil vértices e 2000 campos. Caminhos externos, links,
arquivos cifrados e formatos de conexão OGR não são aceitos.

A prévia aparece abaixo dos cards 1.1/1.2/1.3 apenas após a validação. Usa Leaflet
1.9.4 já presente no acervo de assets e tiles OpenStreetMap. Falha no mapa de
fundo não oculta a geometria. O contêiner mostra arquivo, tamanho, formato,
camada, contagens, tipos geométricos, CRS original/nome/unidade, limites WGS 84,
comprimentos de linhas e áreas de polígonos válidos quando aplicáveis, além de
UFs/municípios/códigos IBGE. A fonte e cobertura cadastral são explícitas:
**UFs do Brasil**, pela malha nacional do acervo, e **municípios de SP**, pela
malha IBGE 2022 em `base_municipal.municipio`, consultada somente para leitura.
Indisponibilidade cadastral é informada sem invalidar um arquivo válido.

Geometrias vazias ou inválidas são contabilizadas e geram avisos; não são
silenciosamente descartadas ou reparadas na prévia. A preparação da execução
continua determinada pelo algoritmo escolhido. Erro ou cancelamento de um novo
upload preserva a seleção anterior. Limpar a entrada libera as referências em
memória; atualizar o catálogo mantém a entrada local. Recarregar/sair da página
exige selecionar novamente o arquivo. Configurações salvas incluem somente
entradas persistentes, com mensagem explícita sobre a entrada local omitida.
