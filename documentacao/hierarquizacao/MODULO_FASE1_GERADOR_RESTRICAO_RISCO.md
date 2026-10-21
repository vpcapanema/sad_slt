# Modulo Fase 1 - Gerador de camadas de restricao e risco

## Objetivo do modulo

Este documento define o modulo responsavel por gerar, validar, homologar e publicar
as camadas consolidadas de restricao e risco consumidas pela Fase 1 da espinha dorsal
do sistema de hierarquizacao e ranqueamento de projetos do PLI.

A Fase 1 da espinha dorsal nao ranqueia projetos. Ela classifica a elegibilidade
territorial preliminar:

- projetos que intersectam restricoes sao classificados como `restrito`;
- projetos que intersectam riscos, mas nao restricoes, sao classificados como
  `apto_com_ressalva`;
- projetos sem intersecao com restricoes ou riscos sao classificados como `apto`.

O papel deste modulo e preparar os insumos espaciais para essa triagem.

## Preparacao operacional na pagina de elegibilidade v2

A rota `/restrict/hierarquizacao/fase-1/` passa a servir a pagina v2, em
substituicao a interface de selecao de um par homologado. Nesta entrega, o fluxo
abrange a preparacao, o envio a bancada e a producao da camada de sobreposicoes, sem executar a classificacao
automatica nem alterar resultados existentes da hierarquizacao.

1. A entrada pode ser composta por camadas vetoriais escolhidas no explorador do
   storage ou pelas demandas de uma hierarquizacao cadastrada, sem filtro de fase.
   Na segunda alternativa, sao recuperadas as informacoes da rodada e as geometrias
   atuais do cadastro, preservando pontos, linhas e poligonos na previa. A ausencia de uma
   geometria interrompe a selecao; nao se cria um ponto substituto por coordenadas.
   Os dois campos sao mutuamente exclusivos: selecionar camadas bloqueia o campo
   de hierarquizacoes, e selecionar uma hierarquizacao bloqueia a escolha de
   camadas. Limpar a selecao de entrada libera a troca de origem. O envio a previa
   substitui integralmente a entrada anterior nessa etapa, sem acumular origens.
2. As bases sao selecionadas em listas separadas de restricao e risco, nessa ordem.
   Uma camada nao pode ocupar ambos os papeis nem ser simultaneamente entrada.
3. O fluxo possui tres estados distintos: selecao, previa e bancada. Os botoes
   das secoes 1 e 2 enviam a selecao do respectivo grupo para a previa da secao 3.
   Confirmar no explorador transfere somente as referencias dos arquivos, sem
   inventariar componentes nem ler geometrias. A identificacao das camadas internas
   e a validacao geometrica ocorrem ao enviar para a previa; uma falha preserva
   tanto a selecao quanto a previa anterior. Arquivos inteiros nao podem ser
   atribuidos a um papel conflitante com qualquer uma de suas camadas internas.
   Selecionar, remover ou recarregar listas nao atualiza automaticamente a previa
   nem a bancada. Uma selecao vazia pode ser enviada para retirar o grupo da previa.
   A previa reutiliza os componentes do extrator de atributos. Seu painel de
   camadas possui, no rodape, o botao unico de envio das camadas marcadas a bancada,
   mediante confirmacao explicita.
4. As listas guardam referencias, nomes e caminhos no storage de configuracoes
   do sistema, em escopos separados `elegibilidade-restricao` e
   `elegibilidade-risco`. Ao salvar, arquivos multicamadas sao identificados para
   guardar referencias de cada componente. Ao recarregar, as referencias retornam
   a selecao; a validacao geometrica e repetida no envio a previa. Uma referencia
   conflitante e recusada na selecao; indisponibilidade ou geometria invalida impede
   a substituicao da previa.
5. O envio final substitui o conjunto anteriormente enviado por esta pagina pelas
   camadas marcadas na previa, preservando seus papeis; camadas desmarcadas deixam
   esse conjunto. Quando a entrada vem de uma hierarquizacao, exige-se o grupo
   completo na previa, com todas as demandas marcadas; nao se envia um subconjunto
   como se fosse a hierarquizacao integral. Cancelar o envio preserva a bancada. A remocao direta na bancada
   e respeitada; outras camadas adicionadas fora deste fluxo nao sao substituidas.
6. As demandas de entrada sao representadas na bancada exclusivamente por
   `Polygon` ou `MultiPolygon`. A conversao ocorre depois da confirmacao do envio,
   sobre todas as feicoes da fonte integral, nunca sobre tiles ou geometrias
   simplificadas. Reutiliza-se a rotina cadastral
   `api/services/normalizacao_demanda.py`: pontos e multipontos recebem buffer
   de raio de 50 m; linhas e multilinhas recebem buffer de 25 m de cada lado,
   com extremidades e juncoes arredondadas; poligonos e multipoligonos nao
   recebem buffer. O processamento utiliza GDAL/OGR em EPSG:5880, com 32
   segmentos por quadrante, reducao a 2D, `MakeValid`, coleta de componentes
   poligonais e `UnionCascaded` por feicao; a saida e gravada em EPSG:4674.
   `GeometryCollection`, inclusive aninhada, e processada recursivamente:
   cada componente recebe a regra de seu tipo original e os resultados
   poligonais sao reunidos na mesma feicao. Nao se extraem somente os poligonos,
   pois isso descartaria os pontos e as linhas da colecao. Preservam-se o FID
   de origem, os atributos e uma unica demanda por registro; os metadados e o
   feedback registram as colecoes e seus tipos de componentes.
   Nao se dissolvem demandas diferentes nem se descartam registros sem geometria
   utilizavel. CRS ausente, coordenadas incompativeis, componentes vazios ou
   nao suportados e impossibilidade de gerar poligono valido interrompem o envio.
   Erros de componentes indicam sua posicao na colecao, alem da feicao e do FID.
7. A origem cadastrada e recuperada novamente no servidor; arquivos do storage
   sao lidos integralmente, preservando atributos e identificadores de origem.
   Para entradas escolhidas no explorador, cada camada de demandas gera um
   GeoPackage derivado. Para a entrada de uma hierarquizacao, todas as demandas
   do grupo sao reunidas em um unico GeoPackage, com uma unica camada vetorial
   `demandas`, somente no envio confirmado da previa a bancada. A previa mantem
   as fontes individuais. O servidor confere a composicao atual da hierarquizacao
   e recupera todas as geometrias cadastrais; divergencia de membros interrompe o envio.
   Cada fonte e normalizada em seu CRS original antes da concatenacao em EPSG:4674.
   A concatenacao preserva todas as feicoes e a uniao dos campos, com nulos para
   atributos inexistentes em uma fonte, sem dissolver demandas diferentes.
   O codigo da demanda, a referencia da camada e o FID de origem ficam em campos
   de rastreio, com sufixos se os nomes ja existirem; os atributos e o objeto
   completo da rodada acompanham cada registro. Os metadados registram todas
   as fontes, suas contagens e os parametros. O arquivo e reaberto e conferido
   antes do registro no ciclo de vida oficial das saidas. O arquivo inclui
   metadados de origem e parametros; a bancada recebe seu caminho e revisao
   reais para as operacoes, e nao a referencia geometrica da previa.
   A fonte original permanece intacta. Risco e restricao nao recebem esta
   conversao: o buffer cadastral de demandas nao cria zonas derivadas dos criterios.
8. Os dois envios apresentam acompanhamento no sistema de feedback: etapas,
   camada corrente, total de camadas, sucesso, falha e cancelamento.
   O cancelamento aguarda a operacao corrente terminar e impede a substituicao
   do conjunto; arquivos derivados ja produzidos permanecem registrados para
   rastreabilidade. Uma falha em qualquer entrada impede o envio parcial.
   Nesta sessao da pagina, o derivado da mesma revisao da previa pode ser
   reutilizado nos reenvios, sem aplicar novo buffer a uma demanda normalizada.

A atribuicao de um papel pelo usuario nao equivale a homologacao da camada.
O estado e o resultado das execucoes de elegibilidade sao publicados no storage
por usuario e identificador, com substituicao atomica do registro. A consulta e
o pedido de cancelamento funcionam entre os processos da API; o resultado
final permanece consultavel apos reinicio, sem depender da memoria do worker.
O bloqueio por usuario impede calculos simultaneos em processos distintos.
Falhas na persistencia do acompanhamento sao informadas explicitamente.
A apresentacao conserva os nomes cadastrais das demandas, inclusive barras
como em `ASSIS/SP`; as regras de validacao dos aliases revisados de camadas
nao sao aplicadas a esses atributos cadastrais.
Os tiles do mapa sao representacoes: a geracao recorta na extensao do tile,
separa componentes multipartes e subdivide representacoes complexas em
fragmentos com ate 16.000 vertices, preservando o identificador da fonte.
A simplificacao e limitada a resolucao do tile e nao modifica o arquivo,
as geometrias integrais nem os valores usados nos calculos e relatorios.
A vinculacao com as fases seguintes e a apresentacao de classificacoes dependem
de definicao posterior.
As regras metodologicas abaixo permanecem como referencia, nao como calculo
automatico executado pela nova interface de preparacao.

### Producao da camada de elegibilidade territorial

O comando de execucao utiliza somente as entradas e bases confirmadas e
atualmente marcadas na bancada. Exige uma entrada e ao menos uma base de
restricao ou risco. Camadas adicionadas diretamente, sem papel definido neste
fluxo, nao participam. Cada entrada gera sua propria saida.

1. Verifica-se `ID_FEICAO`, quando existente, exigindo valores unicos e nao nulos.
   Na ausencia desse campo, cria-se na copia de saida um identificador sequencial
   unico, sem modificar a fonte.
2. A saida e uma copia integral da entrada poligonal da bancada, incluindo todas
   as feicoes, geometrias, atributos e CRS. Copias de calculo sao reprojetadas por
   GDAL/OGR para EPSG:5880.
3. Processam-se primeiro as bases de restricao e depois as de risco, uma por vez.
   Cada `OGR Layer.Intersection` utiliza sempre a entrada integral, nunca o
   resultado da intersecao anterior. Calcula-se a area dos fragmentos em metros
   quadrados e soma-se por identificador da entrada. Nao se aplica uniao nem
   dissolucao; fragmentos sobrepostos da mesma base participam da soma.
4. Cada base acrescenta um campo numerico `re_*` ou `ri_*`. Exemplos:
   `re_app`, `re_uc`, `re_ti`, `re_quil`, `ri_inund`, `ri_eros`, `ri_escor`,
   `ri_inc`. Nomes restantes sao normalizados; colisoes recebem sufixos
   numericos, sem sobrescrever atributos. O mapeamento consta dos metadados.
   Ausencia de intersecao permanece `NULL`; intersecao sem area recebe zero.
5. Apos cada base, libera-se a estrutura temporaria do OGR, conservando os
   recortes e seus vinculos para a camada `intersecoes` do mesmo GeoPackage.
   A saida final e serializada em memoria e reaberta para conferir feicoes,
   geometrias, atributos, vinculos e resultados, antes do registro no storage oficial.
6. Grava-se `[nome da camada de entrada]_elegibilidade_territorial.gpkg`,
   retirando apenas a extensao original quando presente. Uma pasta exclusiva
   por saida evita sobrescritas sem alterar o nome solicitado. Nao se utilizam
   temporarios em disco local. A camada e adicionada automaticamente a bancada,
   preservando as entradas, bases e demais camadas.

O acompanhamento apresenta etapas e permite cancelamento em pontos seguros
antes da gravacao final. Uma falha nao e convertida em resultados nulos.
Saidas de entradas anteriores ja concluidas permanecem registradas e visiveis.
Esta etapa produz a camada vetorial; nao aplica classificacao, ranking ou
homologacao automatica.

### Apresentacao dos resultados e entrega do pacote

A secao Resultados acompanha as saidas concluidas da mesma execucao da pagina,
sem depender de uma lista fixa de bases. A composicao de restricao e risco e
recuperada dos metadados de processamento, nao da selecao posteriormente editada.
O GeoPackage de saida versao 2 acrescenta a area total de cada demanda em m²,
sem sobrescrever atributos existentes, e a camada `intersecoes`, em EPSG:5880.
Cada recorte conserva sua area e os vinculos com a posicao da demanda na camada
integral, a base e a feicao de origem. Os nomes originais das feicoes e o campo
utilizado para identifica-las constam dos metadados; na ausencia de nome,
apresenta-se um identificador explicito de feicao. A soma por base permanece
inalterada, inclusive quando diferentes feicoes da mesma base se sobrepoem.

1. Sugerem-se nomes amigaveis a partir da biblioteca e do dicionario existentes;
   fontes nao cadastradas recebem somente uma sugestao de formatacao. O usuario
   revisa significado, ortografia, acentuacao e gramatica e confirma os nomes antes
   da apresentacao e da exportacao. Aplica-se title case em portugues brasileiro,
   com conectivos internos em minusculas e preservacao de siglas. Nao se inferem
   expansoes de abreviacoes desconhecidas. Nomes tecnicos dos arquivos e campos
   permanecem intactos; os aliases revisados sao comuns a tela, mapa e PDF.
   A revisao inclui as feicoes sobrepostas e fica recolhida apos confirmacao.
   Os nomes sao persistidos em arquivo de apresentacao no storage, vinculado ao
   usuario e a assinatura da saida, sem modificar o GeoPackage processado.
2. Cada entrada possui resumo, fontes em duas colunas (Restricao e Risco),
   mapa Leaflet e tabela de areas por feicao, com uma coluna
   por base. A tela pagina 50 feicoes; o PDF apresenta todas as demandas,
   bases e feicoes sobrepostas, inclusive suas areas totais e percentuais.
   Os detalhes e a tabela utilizam km² e hectares; a legenda da rosca explicita
   as areas em m². O processamento e o GeoPackage mantem m².
   Nulos sao apresentados como travessao e nao se confundem com zero. A formatacao
   decimal preserva os valores, inclusive areas positivas inferiores a 0,01 m².
3. O mapa da tela apresenta demandas integrais e recortes do mesmo arquivo de
   saida, sobre mapa-base Leaflet. Selecao no grafico ou na tabela atualiza os
   detalhes, destaca os elementos relacionados e enquadra as geometrias;
   a selecao no mapa tambem atualiza tabela e grafico. No PDF, o mapa usa
   EPSG:5880, escala e norte, sem mapa-base, com recortes vermelhos para restricao
   e amarelos para risco. Nenhum desses mapas classifica elegibilidade.
   Categoria significa Restricao ou Risco; classe significa a propria feicao
   da base, identificada por origem, mesmo quando houver nomes iguais.
   Uma unica rosca reune todas as sobreposicoes de todas as entradas e demandas
   da analise. Cada fatia identifica uma combinacao demanda × feicao da base,
   sem agrupamento por camada ou nome. Selecao de entrada, demanda ou camada,
   paginacao e ocultacao de vazias na tabela nao limitam o conjunto do grafico.
   A legenda identifica entrada, demanda, camada, feicao, area e participacao na
   soma; selecionar uma fatia de outra entrada atualiza a entrada ativa e os
   detalhes, a tabela e o mapa. Cada fatia representa sua participacao na soma
   de todas as areas sobrepostas; nao
   representa cobertura exclusiva da demanda. O percentual dos detalhes e a
   area sobreposta dividida pela area total da demanda, podendo superar 100%
   na soma de feicoes. Contatos de area zero aparecem na legenda, sem fatia
   proporcional. Selecionar uma base destaca suas fatias sem ocultar as demais.
4. O botao final gera um ZIP com relatorio PDF, uma copia binaria de cada
   GeoPackage processado e metadados da analise com os aliases e assinaturas.
   Pastas numeradas evitam colisoes entre arquivos de mesmo nome. O PDF inclui
   identificacao, datas, fontes, metodologia, resumos, mapas e tabelas completas.
   Saidas parciais sao explicitamente identificadas, sem apresentacao como lote
   completo. O pacote e gravado e conferido no storage antes do download.
5. A exportacao nao repete as intersecoes. Antes da leitura, compara-se o SHA-256
   de cada saida com a assinatura registrada na producao. Divergencia impede a
   emissao. Editar aliases invalida a apresentacao anterior e exige nova
   confirmacao. Falha na exportacao preserva as geometrias e os resultados.
   A soma dos recortes e conferida contra os campos por base antes da
   apresentacao. Saidas anteriores sem recortes persistidos exigem nova
   execucao; nao se simulam dados ausentes para liberar o painel.

## Produto final do modulo

O modulo deve produzir um pacote homologado de Fase 1 contendo:

- uma camada consolidada de restricao;
- uma camada consolidada de risco;
- metadados das camadas de origem;
- relatorio de processamento;
- relatorio de validacao topologica;
- política de incidências factuais aplicada;
- identificador de versao;
- status de homologacao.

Esses produtos devem ser publicados na biblioteca de camadas de risco e restricao,
ficando disponiveis para consumo pela Fase 1 da espinha dorsal.

## Conceito metodologico

O modulo deve aceitar multiplas camadas vetoriais de entrada, vindas de fontes
oficiais ou tecnicamente homologadas, e transforma-las em duas camadas consolidadas:

1. camada unica de restricao;
2. camada unica de risco.

A consolidacao deve preservar atributos das camadas originais. Por isso, o operador
conceitual recomendado e a funcao `Identity`, no sentido usado pelo ArcGIS: as
geometrias sao particionadas conforme as sobreposicoes e os atributos das camadas
sobrepostas sao mantidos nos trechos resultantes.

Quando a implementacao nao usar ArcGIS diretamente, deve ser usado operador
equivalente de overlay que reproduza o comportamento esperado da funcao `Identity`.

## Fluxo geral de processamento

```text
fontes vetoriais
    -> importacao
    -> validacao bruta
    -> normalizacao
    -> correcao geometrica e topologica
    -> classificacao restricao/risco por geometria factual
    -> identity das restricoes
    -> identity dos riscos
    -> validacao final
    -> homologacao
    -> publicacao na biblioteca de camadas
```

## Entradas aceitas

O modulo deve aceitar, no minimo:

- WFS;
- Shapefile compactado;
- GeoPackage;
- GeoJSON;
- outras fontes vetoriais suportadas pelo motor geoespacial adotado.

Cada camada de entrada deve ser registrada como uma fonte individual, mesmo quando
varias camadas forem importadas de um mesmo arquivo ou servico.

## Cadastro minimo da fonte

Cada camada importada deve possuir um cadastro minimo:

- `fonte_id`;
- `nome_fonte`;
- `tipo_fonte`: WFS, Shapefile, GeoPackage, GeoJSON etc.;
- `url_origem`, quando aplicavel;
- `arquivo_origem`, quando aplicavel;
- `orgao_responsavel`;
- `data_importacao`;
- `data_referencia_dado`, quando conhecida;
- `tipo_tratamento`: restricao, risco ou insumo_para_risco_derivado;
- `criterio_associado`;
- `base_legal_ou_tecnica`;
- `severidade_padrao`;
- `observacao_metodologica`.

## Importacao

### WFS

Para fontes WFS, o modulo deve:

- registrar URL consultada;
- registrar layer/typeName;
- registrar parametros de consulta;
- registrar data e hora da requisicao;
- validar retorno;
- armazenar copia local ou snapshot do dado importado;
- registrar eventual filtro espacial ou atributivo aplicado.

### Upload de arquivo

Para arquivos enviados pelo usuario, o modulo deve:

- aceitar arquivos compactados quando necessario;
- identificar camadas internas, no caso de GeoPackage ou zip;
- validar tipo de geometria;
- validar presenca de CRS;
- impedir importacao de arquivo vazio;
- armazenar o arquivo original como evidencia de origem.

## Validacao bruta

Apos importar a camada, o sistema deve executar validacoes iniciais:

- a camada possui feicoes;
- a camada possui geometria;
- o CRS esta definido;
- o tipo geometrico e compativel com o uso esperado;
- ha campos obrigatorios quando definidos pela configuracao;
- a extensao espacial e compativel com a area de estudo;
- a camada nao possui percentual critico de geometrias nulas ou vazias.

Camadas reprovadas nesta etapa nao devem seguir para consolidacao.

## Normalizacao

Todas as camadas aprovadas na validacao bruta devem ser normalizadas antes do overlay.

Normalizacoes minimas:

- reprojetar para o CRS oficial do projeto;
- padronizar nomes de campos de controle;
- criar identificador unico de feicao de origem;
- registrar tipo de tratamento: restricao, risco ou insumo técnico;
- converter geometrias para tipo esperado, quando tecnicamente seguro;
- padronizar valores categoricos;
- preservar atributos originais relevantes.

Campos de controle recomendados:

```text
fonte_id
feicao_origem_id
criterio_id
criterio_nome
tipo_tratamento
severidade
base_legal_ou_tecnica
fonte_nome
data_referencia_dado
metodo_obtencao
```

## Correcao geometrica e topologica

Antes de qualquer operacao de `Identity`, o modulo deve corrigir e validar as
geometrias.

Operacoes recomendadas:

- corrigir geometrias invalidas;
- remover geometrias vazias;
- remover geometrias sem area quando a camada esperada for poligonal;
- explodir multipartes, se isso for necessario para rastreabilidade;
- remover duplicidades exatas;
- corrigir orientacao e fechamento de aneis, quando aplicavel;
- aplicar tolerancia minima para remocao de artefatos, se configurada;
- registrar todas as correcoes executadas.

O modulo nao deve apagar feicoes problematicas silenciosamente. Toda exclusao ou
correcao deve aparecer no relatorio de processamento.

## Classificacao entre restricao e risco

Cada camada deve ser classificada em uma das categorias:

- `restricao`;
- `risco`;
- `insumo_para_risco_derivado`, somente como registro técnico que não é materializado pela Fase 1.

Restricao representa ocorrencia territorial com potencial excludente ou segregador.
Risco representa ocorrencia territorial que nao exclui o projeto, mas gera ressalva.

A categoria de cada camada e definida pelo *Arcabouco Teorico-Conceitual de
Risco e Restricao*, em `/restrict/geoespacial/configuracao-risco-restricao/`,
secao 2, que e a regra: sete camadas de restricao e treze de risco. Este modulo
apenas aplica o que esta la.

Exemplo:

```text
Unidade de Conservacao de Protecao Integral -> restricao
Terra Indigena                              -> restricao
Area suscetivel a inundacao                 -> risco
Unidade de Conservacao de Uso Sustentavel   -> risco
```

Zona de amortecimento nao aparece no exemplo por nao ser camada da Fase 1: a
secao 2 nao a lista, e a Fase 1 nao gera nem classifica faixas externas.

## Incidencias factuais

A Fase 1 não materializa riscos derivados, zonas de amortecimento, entornos ou
outras faixas externas. Ela classifica somente a geometria oficial publicada ou
a geometria-base homologada de cada critério.

Geometrias oficialmente delimitadas por outros órgãos podem ser incorporadas como
camadas de origem, preservando sua autoria, vigência e metadados. Elas não são
produto de buffer ou de cálculo espacial do SICARD.

## Consolidacao por Identity

### Restricoes

As camadas classificadas como restricao devem ser consolidadas em uma camada unica de
restricao por operacoes sucessivas de `Identity` ou overlay equivalente.

Objetivo:

- particionar as geometrias conforme sobreposicoes;
- preservar os atributos das camadas de origem;
- permitir saber quais restricoes incidem em cada trecho espacial;
- permitir emissao de relatorio detalhado por projeto.

Fluxo conceitual:

```text
restricao_1
    identity restricao_2
    identity restricao_3
    ...
    -> camada_consolidada_restricao
```

### Riscos

As camadas classificadas como risco devem ser consolidadas em uma camada unica de
risco por operacoes sucessivas de `Identity` ou overlay
equivalente.

Fluxo conceitual:

```text
risco_1
    identity risco_2
    identity risco_3
    ...
    -> camada_consolidada_risco
```

## Ordem de processamento

A ordem das operacoes de `Identity` deve ser registrada.

Embora o resultado espacial esperado seja equivalente para o objetivo de sobreposicao,
a ordem pode afetar nomes de campos, sufixos, desempenho e rastreabilidade operacional.

O relatorio deve registrar:

- ordem das camadas;
- numero de feicoes antes e depois de cada operacao;
- area total antes e depois;
- campos adicionados;
- eventuais conflitos de nomes de campos;
- tempo de processamento.

## Tratamento de conflitos de atributos

Como diferentes camadas podem possuir campos com nomes iguais, o modulo deve aplicar
regra de nomenclatura para evitar sobrescrita.

Regra recomendada:

```text
<fonte_id>__<nome_campo_original>
```

Exemplo:

```text
funai_ti__nome
datageo_ucpi__categoria
cetesb_contaminadas__situacao
```

Campos de controle do sistema devem ter nomes reservados e nao podem ser sobrescritos
por atributos de origem.

## Validacao final das camadas consolidadas

Depois da consolidacao, o modulo deve validar:

- geometrias validas;
- ausencia de geometrias vazias;
- CRS correto;
- area total coerente;
- campos de controle presentes;
- atributos de origem preservados;
- quantidade de feicoes gerada;
- ausencia de perda indevida de feicoes;
- consistencia entre tipo_tratamento e camada final.

Tambem deve ser executada uma checagem de prioridade:

```text
se uma area aparece como restricao e risco:
    restricao prevalece para classificacao da Fase 1
    risco pode ser mantido como informacao secundaria, se metodologicamente util
```

## Homologacao

Antes de publicar o pacote para uso pela espinha dorsal, o modulo deve gerar uma etapa
de homologacao.

Itens minimos da homologacao:

- resumo das fontes utilizadas;
- quantidade de camadas importadas;
- quantidade de camadas aprovadas;
- quantidade de camadas reprovadas;
- criterios cobertos;
- criterios ausentes;
- erros corrigidos;
- erros remanescentes;
- area total de restricao;
- area total de risco;
- mapa de pre-visualizacao;
- amostra de atributos preservados;
- aprovador responsavel;
- data de homologacao.

Somente pacotes homologados devem aparecer na biblioteca de camadas disponivel para a
Fase 1.

## Versionamento

Todo pacote publicado deve possuir identificador de versao.

Padrao recomendado:

```text
fase1_restricao_risco_<area_estudo>_<data>_v<numero>
```

Exemplo:

```text
fase1_restricao_risco_sp_2026_07_02_v1
```

O versionamento deve permitir reproduzir rankings antigos mesmo que as fontes de
dados sejam atualizadas posteriormente.

Metadados minimos de versao:

- `pacote_id`;
- `versao`;
- `data_criacao`;
- `data_homologacao`;
- `responsavel_tecnico`;
- `status`: rascunho, validado, homologado, arquivado;
- `hash_ou_assinatura_dos_insumos`, se disponivel;
- `observacoes`.

## Publicacao na biblioteca

Apos homologacao, o pacote deve ser publicado na biblioteca de camadas de risco e
restricao.

A biblioteca deve permitir:

- listar pacotes homologados;
- consultar metadados;
- baixar ou consumir camada de restricao;
- baixar ou consumir camada de risco;
- visualizar relatorio de processamento;
- selecionar pacote para uma rodada da Fase 1.

## Contrato de saida para a espinha dorsal

O pacote homologado deve expor, no minimo:

```json
{
  "pacote_id": "fase1_restricao_risco_sp_2026_07_02_v1",
  "status": "homologado",
  "crs": "EPSG:XXXX",
  "camada_restricao": {
    "nome": "restricao_consolidada",
    "tipo_geometria": "Polygon",
    "campos_controle": [
      "fonte_id",
      "feicao_origem_id",
      "criterio_id",
      "criterio_nome",
      "tipo_tratamento",
      "severidade"
    ]
  },
  "camada_risco": {
    "nome": "risco_consolidado",
    "tipo_geometria": "Polygon",
    "campos_controle": [
      "fonte_id",
      "feicao_origem_id",
      "criterio_id",
      "criterio_nome",
      "tipo_tratamento",
      "severidade"
    ]
  },
  "relatorio_processamento": "...",
  "metadados": "..."
}
```

## Consumo pela Fase 1 da espinha dorsal

Ao consumir o pacote, a espinha dorsal deve executar:

```text
projeto intersecta camada_consolidada_restricao?
    sim -> status_fase1 = restrito

senao, projeto intersecta camada_consolidada_risco?
    sim -> status_fase1 = apto_com_ressalva

senao:
    status_fase1 = apto
```

Para cada projeto, a espinha dorsal deve recuperar os atributos preservados pela
consolidacao por `Identity`, permitindo emitir relatorio com:

- restricoes encontradas;
- riscos encontrados;
- fonte de cada ocorrencia;
- base legal ou tecnica;
- severidade;
- area ou extensao afetada;
- observacao metodologica.

## Funções do Fluxo

O sistema deve ser maleável, permitindo que o usuário:
- Crie novas funções combinando operações disponíveis (construtor de funções)
- Crie novos fluxos combinando funções (construtor de fluxo)

### Funções Padrão da Fase 1

#### FUN-01: Cadastrar Fonte
- Entrada: metadados da fonte
- Operações: nenhum (apenas cadastro de variáveis)
- Saída: `fonte_id` e metadados registrados

#### FUN-02: Importar Camada
- Entrada: `informar_tipo_entrada`, `informar_caminho_arquivo`, `informar_crs_origem`, `definir_filtro_espacial`, `definir_filtro_atributivo`
- Operações: OP-01 (Carregar Camada)
- Saída: camada importada

#### FUN-03: Validar e Reparar Camada
- Entrada: camada importada
- Operações: OP-02 (Validar Camada) + OP-02-CORR (Reparar Geometrias)
- Saída: camada validada e corrigida

#### FUN-04: Normalizar Camada
- Entrada: camada validada
- Operações: OP-03 (Normalizar Camada)
- Saída: camada normalizada (CRS oficial, campos padronizados)

#### FUN-05: Classificar Fonte
- Entrada: metadados da fonte
- Operações: nenhum (classificação manual)
- Saída: `tipo_tratamento` definido (restricao, risco ou insumo técnico não materializável).

#### FUN-06: Consolidar Restrições
- Entrada: todas as camadas de restrição
- Operações: OP-05 (Sobrepor Camadas - Identity)
- Saída: camada consolidada de restrição

#### FUN-07: Consolidar Riscos
- Entrada: todas as camadas de risco
- Operações: OP-05 (Sobrepor Camadas - Identity)
- Saída: camada consolidada de risco

#### FUN-08: Exportar Camadas
- Entrada: camadas consolidadas, `definir_nome_arquivo_restricao`, `definir_nome_arquivo_risco`, `selecionar_formato_saida`, `definir_crs_saida`, `selecionar_opcao_salvamento`
- Operações: OP-25 (Exportar Camada Vetorial)
- Saída: arquivos exportados

#### FUN-10: Gerar Metadados de Versão
- Entrada: `definir_nome_versao`, `informar_responsavel_tecnico`, `informar_observacoes_homologacao`
- Operações: nenhum (geração de metadados)
- Saída: pacote versionado

---

## Variáveis do Modulo

### Variáveis de Entrada
- `informar_tipo_entrada`
- `informar_caminho_arquivo`
- `informar_crs_origem`
- `definir_filtro_espacial`
- `definir_filtro_atributivo`

### Variáveis de Cadastro da Fonte
- `informar_nome_fonte`
- `informar_tipo_fonte`
- `informar_orgao_responsavel`
- `informar_data_referencia_dado`
- `classificar_tipo_tratamento`
- `informar_criterio_associado`
- `informar_base_legal_ou_tecnica`
- `informar_severidade_padrao`
- `informar_observacao_metodologica`

### Variáveis de Validação
- `validar_sobreposicoes`
- `validar_lacunas`
- `validar_intersecoes_invalidas`
- `validar_gaps`
- `validar_dangles`
- `validar_crs`
- `validar_tipo_geometrico`
- `validar_campos_obrigatorios`
- `definir_tolerancia_topologica`
- `definir_percentual_critico_erros`

### Variáveis de Correção
- `corrigir_geometrias_invalidas`
- `corrigir_orientacao_aneis`
- `corrigir_fechamento_aneis`
- `corrigir_repeticao_pontos`
- `corrigir_auto_intersecoes`
- `corrigir_geometrias_degeneradas`
- `corrigir_vertices_colineares`
- `definir_tolerancia_correcao`
- `manter_geometria_original_falha`

### Variáveis de Normalização
- `recortar_area_estudo`
- `corrigir_geometrias_invalidas`
- `remover_geometrias_vazias`
- `explodir_multipartes`
- `padronizar_nomes_campos`

### Variáveis de Consolidação
- `selecionar_tipo_overlay`
- `resolver_conflitos_campos`

### Variáveis de Exportação
- `definir_nome_arquivo_restricao`
- `definir_nome_arquivo_risco`
- `selecionar_formato_saida`
- `definir_crs_saida`
- `selecionar_opcao_salvamento`

### Variáveis de Metadados
- `definir_nome_versao`
- `informar_responsavel_tecnico`
- `informar_observacoes_homologacao`

### Variáveis de Ordem de Processamento
- `definir_ordem_camadas_restricao`
- `definir_ordem_camadas_risco`

---

## Regras de auditoria

Toda execucao do modulo deve gerar trilha de auditoria:

- usuario responsavel;
- data e hora de importacao;
- fonte importada;
- parametros de processamento;
- CRS de origem e destino;
- correcoes geometricas aplicadas;
- geometrias oficiais e camadas-base classificadas;
- ordem das operacoes de `Identity`;
- erros e avisos;
- decisao de homologacao.

## Decisoes conceituais consolidadas

1. A Fase 1 e uma etapa de triagem, nao de ranking.
2. Restricao exclui ou segrega o projeto do ranking ordinario.
3. Risco gera ressalva e pode ser avaliado quantitativamente na Fase 3.
4. A consolidacao deve preservar atributos das camadas originais.
5. A funcao conceitual adequada para consolidacao e `Identity`.
6. A Fase 1 não calcula buffers, zonas de amortecimento ou entornos.
7. Pacotes de restricao e risco devem ser homologados e versionados antes de uso.
8. A espinha dorsal deve consumir apenas pacotes homologados.

## Proximos detalhamentos

Este documento define o modulo gerador de camadas de restricao e risco. Os proximos
documentos devem detalhar:

- modulo gerador da superficie de favorabilidade territorial da Fase 2;
- modulo de recepcao, validacao e normalizacao de atributos de projeto da Fase 3;
- modelo de dados para biblioteca de camadas;
- contrato de API para execucao da Fase 1.

## Implementação da página geradora

A página `geoespacial/gerador-risco-restricao.html` implementa o cadastro do produto,
a configuração sequencial de funções/algoritmos, a incorporação da bancada de
geoprocessamento e o acompanhamento dos eventos de processamento. Produtos e receitas
são persistidos nas tabelas `geoprocessamento.produto`,
`geoprocessamento.produto_fase1`, `geoprocessamento.configuracao_fluxo` e
`geoprocessamento.configuracao_fluxo_item`.
