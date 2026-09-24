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
   tela não as usa. Escolher a categoria antes da base. Uploads podem conter várias camadas de entrada.
   As camadas confirmadas são desenhadas na bancada embutida (seção 02). Uploads abrem seletores locais nesta página;
   cadastro de categorias abre sua página própria; o botão de atualização
   recarrega os seletores.
3. Conferir as camadas efetivamente presentes na bancada (seção 2) e usar Executar extração abaixo dela. Executar o algoritmo selecionado com GDAL/OGR no servidor. O navegador envia IDs e, para camadas locais, o arquivo em memória;
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

O botão **Enviar nova camada de entrada** usa o leitor local abaixo. O botão de **base** usa agora o upload nativo do storage, descrito ao final; pacotes enviados são lidos pelo mesmo explorador em RAM após o envio:

| Conteúdo | Formatos |
| --- | --- |
| Pacotes, inclusive aninhados | ZIP, RAR, 7z, TAR, TGZ/TAR.GZ, TBZ2/TAR.BZ2, TXZ/TAR.XZ, GZ, BZ2, XZ e KMZ |
| Vetores | GeoJSON/JSON, GeoPackage, FlatGeobuf, KML, GML e Shapefile compactado com SHP/SHX/DBF/PRJ |
| Geodatabase ESRI | File Geodatabase: pasta `.gdb` inteira dentro de um pacote, lida por OpenFileGDB; não é uma Personal Geodatabase `.mdb` |
| Rasters | GeoTIFF/TIFF, IMG, ASCII Grid/ASC, JPEG2000/JP2, tabelas raster de GeoPackage e rasters File Geodatabase suportados pelo driver instalado |

Cada pacote tem seu namespace. São percorridos todos os arquivos reconhecidos,
GeoPackages e classes de feições da geodatabase, sem escolher silenciosamente o
primeiro. O upload valida automaticamente todas as camadas encontradas. O inventário
retorna `status_validacao` e metadados/GeoJSON para cada camada válida, ou o erro
individual para cada camada não validada. Não há seletor intermediário.
Componentes geoespaciais ilegíveis também aparecem como não validados.

O painel esquerdo da prévia segue o visual da árvore do visualizador de bases:
fundo azul, grupos **Validadas** e **Não validadas**, arquivos como subgrupos,
guias de hierarquia, símbolos e grupos recolhíveis. Todas as válidas começam
visíveis, com cores distintas e enquadramento do conjunto. Os checkboxes da
camada, do arquivo e do grupo controlam a visibilidade; grupos parcialmente
visíveis têm checkbox indeterminado. Ocultar um raster remove tanto sua imagem
quanto seu contorno. Recolher um grupo não modifica a visibilidade no mapa.

Clicar no nome (ou na geometria) mostra seus metadados abaixo do mapa; mudar o
checkbox também mostra os metadados da camada, indicando se está oculta.
Ocultar na prévia **não altera a composição da bancada**. Somente a seção 2 define quais camadas participarão da análise. Camadas não validadas têm
checkbox desabilitado, mas seu nome continua acessível para consultar a falha.
Em telas estreitas, a árvore da entrada passa para cima do mapa. O envio de bases ao storage usa seu modal nativo e a lista pendente da seção 1.2.

Cada camada vetorial válida do upload é adicionada individualmente à bancada.
A entrada enviada para análise reúne todas as feições das camadas mantidas
nessa bancada, com a união dos atributos e nulos nos campos ausentes. Em
arquivos multicamada, `slt_camada_origem` identifica o componente/camada de cada
feição; o nome recebe sufixo se já existir na fonte. Os vetores são reprojetados
para o CRS da primeira camada válida para compor a entrada; a prévia individual
continua mostrando o CRS original. O servidor reabre e revalida o conjunto na
execução. O arquivo é enviado uma única vez, acompanhado de `arquivo_local.camadas`: as chaves das camadas mantidas na bancada. O backend valida a seleção, rejeita chaves ausentes/inválidas e restaura apenas esse subconjunto; lista vazia nunca significa executar todas. Pedidos antigos sem a lista preservam a leitura integral legada. Rasters não
entram na análise vetorial. Um lote sem vetores válidos limpa a entrada anterior
e mantém os diagnósticos visíveis, evitando executar uma entrada antiga por engano.
No upload de bases, todas as camadas vetoriais válidas entram na lista da categoria.

**Raster é inspecionável, não executável nos algoritmos vetoriais atuais.** A
interface exibe dimensões, bandas, tipo de pixel, NoData, resolução, CRS,
extensão e miniatura georreferenciada limitada a 512×512. Sem CRS/geotransformação,
mostra os metadados e informa por que não há localização. Não converte pixels em
polígonos, nem adiciona a matriz como base vetorial. O servidor também recusa tal
execução. Análise zonal/raster exige um algoritmo próprio e não foi implementada.

O backend mantém compatibilidade com pedidos antigos de `bases_locais` em RAM. O botão da seção 1.2 não produz mais esse payload: envia os arquivos ao storage e usa IDs `storage:...`, reutilizáveis nas configurações salvas.

Limites: 16 MB por envio, 32 MB expandidos **somando todos os níveis**, 2000
componentes, 5 níveis de compactação, orçamento de 60 segundos para exploração,
50 mil feições no conjunto, sem teto de 500 mil vértices; até 1999 atributos de origem mais o identificador da camada. Camadas que excedem o orçamento ficam no painel de não validadas com o motivo. Na execução, arquivos
locais somam no máximo 30 MB codificados. Caminhos externos, links, arquivos
cifrados/multipartidos e formatos de conexão OGR/VRT não são aceitos.

A descompactação usa libarchive-c/libarchive, em memória; o Docker instala a
biblioteca nativa explicitamente. O serviço de importação permanente de outros
módulos não foi alterado: estas regras valem para os botões da extração.

A prévia aparece abaixo dos cards 1.1/1.2/1.3 apenas após a validação de todas as camadas. Usa Leaflet
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


### Vetores complexos: original integral e prévia por escala (24/09/2026)

O teto de 500 mil vértices foi removido da leitura, da validação individual e do
conjunto. Continuam os limites de bytes, expansão, feições e atributos descritos
acima: não se promete processamento ilimitado em RAM. Não há cadastro novo no
banco nem gravação temporária dos arquivos enviados.

- O arquivo original fica em memória e é reaberto no backend na execução. A
  seleção `arquivo_local.camadas` da bancada continua definindo o subconjunto.
  Os algoritmos nunca recebem o GeoJSON simplificado mostrado pelo navegador.
- Coordenadas são verificadas em lotes de 256 feições, preservando todas as
  coordenadas. Uma feição grande é validada inteira; não é rejeitada por vértices.
- A prévia detalhada tem orçamento de 100 mil vértices dividido entre as camadas;
  o nível para zoom distante usa um décimo desse orçamento. Simplificação
  topológica é aplicada exclusivamente a cópias WGS84. Todas as feições e seus
  atributos continuam representados. Cada orçamento tem piso de 5 vértices por
  feição para permitir o desenho de seu envelope sem eliminar registros.
- Geometrias irredutíveis pelo orçamento (por exemplo MultiPoint com muitos
  pontos) usam os limites de cada feição, com aviso explícito de aproximação.
  Isso não invalida nem simplifica a fonte para processamento.
- Leaflet e a bancada MapLibre alternam os níveis no zoom 12. Os metadados
  mostram contagem original e tipo da representação; a bancada identifica
  prévias aproximadas e impede sua edição como se fossem os dados originais.
- Área, comprimento, localização cadastral e quantidade de feições derivam do
  original. A prévia agregada reutiliza as representações leves individuais;
  não volta a serializar toda a geometria original.
- Estatísticas usam índice espacial por base e agregam lotes de até 64 entradas
  ou 200 mil vértices. Uma feição maior é processada sozinha, sem perder vértices.
  Candidatos são liberados entre lotes; contagens e estatísticas consideram todas
  as interseções. Os demais algoritmos continuam recebendo os frames integrais.

Validação: GeoPackage com mais de 600 mil vértices, restauração WKB idêntica ao
original, interseção próxima à borda original que desaparece na prévia mas entra
corretamente na análise, lote de duas camadas somando mais de 500 mil vértices,
representação por limites e estatísticas com múltiplos lotes. Sem deploy.


### Composição da bancada e execução (24/09/2026)

- Seção 1: selecionar, validar e configurar entradas, bases e algoritmo. Bases
  pendentes só são enviadas à bancada ao confirmar a lista.
- Seção 2: a bancada é a composição final. Remover pelo ribbon atualiza o painel,
  a configuração e o payload imediatamente. Uma remoção não é desfeita por troca
  de algoritmo, nome ou atualização do catálogo. A prévia conserva o inventário.
- O resumo e o botão de execução ficam abaixo do iframe, na seção 2. Só habilita
  com entrada, base, algoritmo e todas as camadas participantes presentes no painel.
  A execução também revalida a presença antes e depois da confirmação; camadas
  que falharam ao carregar não podem entrar silenciosamente no pedido.
- Nome da saída é opcional. `operacao` é obrigatório também no contrato HTTP;
  omissão não escolhe mais interseção implicitamente.
- Upload multicamada aparece em linhas independentes no grupo Input. A remoção
  de uma linha restringe a lista de chaves enviada ao backend e preserva as demais.
  Remover a última entrada ou base bloqueia a execução. Uma entrada adicional
  existente pode assumir o lugar da principal removida nos modos compatíveis.
- Durante a execução, a bancada fica inerte para manter estável a composição
  confirmada. Resultados e camadas apenas pendentes não compõem o pedido.

### Servidor local no Codespace

Use a tarefa **SICARD: Iniciar ambiente de desenvolvimento**, que no Linux chama
`bash scripts/start-dev-codespace.sh`. Ela carrega o `.env` privado, ignora as duas
substituições SLT usadas nos testes, verifica o banco com SELECT 1 e inicia a porta
8083. Quando o destino é 127.0.0.1:15433, inicia automaticamente o supervisor
`bash scripts/start-database-tunnel.sh --background`. Ele vive na sessão tmux
`sicard-db-tunnel` (servidor `sicard`), com lock de instância única, log privado
em `.deploy/database-tunnel.local.log` e reconexão após 5 segundos se o SSH cair.
A ponte Windows em 10022 deve continuar ativa; o supervisor não pode iniciá-la
no computador Windows a partir do Codespace.

Não iniciar o servidor de desenvolvimento com `SLT_DATABASE_URL=''`: isso é
exclusivo dos processos de teste e sobrepõe o valor do `.env`. A inicialização
local não realiza deploy nem altera as credenciais ou a VM.


## Envio de bases pelo gestor do storage e feedback SICARD (local)

- A sessão autenticada do SICARD define a autorização. Apenas `ANALISTA`,
  `GESTOR` e `ADMIN` podem iniciar ou continuar a integração; `OPERADOR` e
  `VISUALIZADOR` recebem HTTP 403 com a explicação. Sessão ausente recebe 401.
- Só após essa validação, o servidor autentica separadamente no SFTPGo com
  `SICARD_STORAGE_API_USER=sicard` e a senha privada já configurada. Nenhuma
  senha, cookie de login ou token de acesso do storage é entregue ao frontend.
- `/extracao-atributos/storage-upload/sessoes` cria uma janela vinculada ao ID
  SICARD. A ponte encaminha apenas assets, consulta de existência, listagem,
  manutenção de sessão e upload. Não expõe administração, exclusão ou download.
- O modal/Dropzone e `uploadFiles` vêm do cliente SFTPGo instalado. Apenas os
  endereços são encaminhados pela ponte e a apresentação é adaptada. O algoritmo
  nativo, incluindo progresso e confirmação de sobrescrita, permanece inalterado.
- Destino dos arquivos: `base-geoespacial` no storage oficial. O servidor transmite
  o corpo em streaming; não grava cópia local nem cadastra feições no banco.
- Somente respostas 201 do storage registram arquivos enviados. O recarregamento
  final nativo abre automaticamente a escolha obrigatória de categoria. Todos os
  vetores encontrados no arquivo são propostos; nenhuma base entra na bancada
  antes de **Confirmar bases**. Falhas e matrizes incompatíveis ficam explicadas.
- **Classificar depois** conserva o envio pendente nesta página; os arquivos
  continuam salvos no storage. **Conferir arquivos enviados** recupera sucessos
  parciais sem anunciar como enviados os arquivos que falharam.
- GeoPackages multicamada e pacotes compactados são explorados após o envio. O
  pacote permanece intacto no storage. A leitura de pacotes em RAM mantém seus
  limites atuais de 16 MB de arquivo e 32 MB expandidos; isso não altera o upload
  nativo. Arquivos que não podem ser lidos continuam no storage e não são
  apresentados como bases prontas para análise.
- As sessões da ponte são mantidas em memória por até duas horas de inatividade,
  no worker único configurado para a VM (o mesmo contrato dos jobs atuais).
- A extração e a ferramenta territorial usam `SLTFeedback` para avisos,
  confirmações, acompanhamento e desfechos. A faixa `ea-feedback` foi removida.
  Campos de formulário, metadados e diagnósticos de camadas permanecem na página.

Validação local: testes de autorização/isolamento e leitura de GPKG/ZIP; navegador
com cliente SFTPGo real e upload interceptado, sem gravar dados de teste na VM.
Esta alteração não foi implantada em produção.

### Feedback em todas as seções

As duas páginas usam o feedback oficial também na validação local (com
cancelamento real), explorador, configuração salva, editores de regras,
bancada incorporada, recuperação, tabela de atributos e downloads de relatórios.
Os comandos, a edição de arquivos e o modelador da bancada encaminham suas
mensagens ao componente da página hospedeira. Os formulários de escolha e os
metadados continuam nos painéis; erros, avisos e confirmações não usam faixas.

O cliente do storage mantém seu transporte e suas verificações nativas. A ponte
adapta somente a apresentação de mensagens e confirmações, preservando o retorno
`isConfirmed` esperado pelo cliente. A categoria continua obrigatória depois do
envio; a bancada recebe as bases somente em **Confirmar bases**.

`SLTFeedback.solicitar` coleta nomes no diálogo oficial; `processo` aceita um
callback opcional `cancelar` apenas quando existe cancelamento real. Mensagens
recebidas durante um processo são registradas nas etapas. O componente acompanha
formulários `dialog` abertos e retorna ao documento quando eles são removidos.

### Navbar restrita e acompanhamento global (24/09/2026)

As duas páginas incluem `navbar_painel_restrita.html`, o menu adaptável
`navbar_modulo/geoprocessamento.html` e `admin-session-bar`. A identificação
vem da sessão autenticada, pelo mesmo `admin-auth.js` dos outros módulos.

O componente compartilhado `assets/js/feedback.js` e seu CSS usam cabeçalho
preenchido pela cor do status, título branco e duas barras abaixo do histórico:
a tarefa atual, verde com faixas, e o processo geral, azul. As porcentagens
vêm do servidor; não existem timers para fazer a barra avançar. Quando um
serviço não informa uma medição, a barra indica **Aguardando medição**.

Contrato incremental para os consumidores existentes:

- `progresso(percentualGeral, mensagem, percentualTarefa)` mantém os dois
  argumentos antigos e aceita a medição da tarefa como terceiro argumento.
- `acompanhar(job)` apresenta `logs` ou `etapas` sequenciadas, `percentual`,
  `progresso_tarefa` e a etapa atual, sem repetir eventos.
- `definirCancelamento(callback, motivo)` habilita a ação somente quando o
  consumidor oferece interrupção real. O callback precisa aguardar a confirmação
  do servidor. `restaurar` pode devolver o formulário ao estado de preparação.
- Serviços antigos sem endpoint de cancelamento mantêm o botão desabilitado,
  com explicação. Abortar o HTTP não é tratado como prova de cancelamento no
  servidor. Operações já persistidas não são desfeitas automaticamente.

A extração e a geração territorial oferecem cancelamento cooperativo durante
leitura e cálculo, com verificação entre tarefas. O OGR também verifica a
interrupção no callback nativo. Ao iniciar a gravação final, o servidor rejeita
novo cancelamento para não deixar saídas parciais. A configuração da interface
permanece disponível para uma nova tentativa. Cancelamento aceito na geração
municipal limpa a pasta de saída ainda não registrada; o audit trail permanece.

O progresso geral dessas duas operações conta três fases concluídas: leitura,
análise/materialização e gravação. Não representa previsão de duração. A
medição da tarefa usa feições, indicadores, arquivos ou o callback do OGR;
etapas sem contador não recebem percentuais inventados.

A geração municipal utiliza jobs privados por usuário, consultados a cada
500 ms. O endpoint síncrono de exportação foi preservado por compatibilidade.
Os novos jobs e controles vivem no worker local; reiniciar durante um cálculo
não o recupera automaticamente. Nenhuma alteração foi implantada na VM.

### Preparação unificada das camadas

A subseção 1.3 contém somente os dois modos de enriquecimento. Configurações antigas de Intersect/Identity continuam legíveis no serviço, mas a interface solicita a escolha de um dos algoritmos atuais antes de executar.

O painel Leaflet da seção 1 reúne entradas (com validação e arquivos de origem) e bases (por categoria). Selecionar uma camada exibe seus metadados no contêiner independente de informações. As caixas de visibilidade não alteram a composição de processamento. Bases pendentes só entram na bancada ao usar **Enviar bases à bancada**; editar, limpar e desfazer têm alcance explicitamente restrito às bases pendentes. A remoção na bancada continua sendo definitiva para a composição da execução.

O contrato de configuração versão 5 distingue `escopo=analise` (três subseções, inclusive algoritmo, regras, entradas, finalidades e nome de saída) de `escopo=bases` (somente bases, regras e categorias). As listas têm identificadores prefixados por `lista-bases-` e são filtradas separadamente no explorador. Arquivos anteriores são considerados configurações de análise. O carregamento de listas não altera entradas, algoritmo ou nome de saída e devolve as bases ao estado pendente de confirmação. Rascunhos de análise podem ser salvos antes de escolher bases ou algoritmo. Arquivos de entrada locais continuam temporários: os dados binários não são incluídos nos arquivos de configuração.

Os cards auxiliares de ferramenta territorial e configuração da análise usam o mesmo padrão vertical (título, descrição e uma ação por linha). No desktop, têm a largura de uma coluna: ferramenta à direita acima de 1.3 e configuração à esquerda abaixo de 1.1; em telas estreitas ocupam a largura disponível. O card dinâmico “Entradas desta análise” foi removido. A seleção de uma ou várias entradas ocorre no explorador de 1.1, e os dois algoritmos consomem esse mesmo conjunto; enviar um arquivo local ou limpar a entrada substitui/limpa também as entradas adicionais anteriores.
