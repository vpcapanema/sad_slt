# Fase 2 — Favorabilidade territorial — município e rede rodoviária

Preparação das superfícies de favorabilidade territorial. Adota-se “objeto de
demanda” para plano, programa ou projeto, conforme a
[terminologia oficial](../geral/TERMINOLOGIA.md).
Município é um recorte administrativo; grade e rede permanecem identificadas
segundo a representação espacial de cada produto. A nomenclatura não modifica
as unidades espaciais, os campos ou os métodos descritos a seguir.

## Objetivo do modulo

Este documento define o modulo responsavel por gerar, validar, homologar e publicar
a superficie consolidada de favorabilidade territorial consumida pela Fase 2 da
espinha dorsal do sistema de hierarquizacao e ranqueamento de projetos do PLI.

A Fase 2 e o nucleo do ranking tecnico-territorial. Ela cruza os projetos com uma
superficie de favorabilidade territorial previamente gerada e extrai, para cada
projeto, um indice espacial normalizado.

O papel deste modulo e produzir essa superficie de favorabilidade a partir de camadas
geoespaciais, operadores espaciais, reescalonamento, pesos AHP e algebra de mapas.

## Gerador autônomo de superfícies por critérios territoriais

A página `/restrict/geoespacial/gerador-superficies-favorabilidade/` prepara
superfícies vetoriais municipais ou por setores censitários de 2022, vinculadas
a uma hierarquização já cadastrada. Trata-se de uma página independente da
bancada da Fase 2, sem alteração automática dos resultados ou da homologação.

O usuário seleciona variáveis do catálogo com levantamento territorial integral
comprovado, associa uma das 12 dimensões do modelo oficial e declara a relação
positiva ou negativa com a favorabilidade territorial. O nome do critério
preserva a propriedade expressa no nome da variável e explicita o fenômeno
avaliado; a premissa é gerada separadamente como relação direcional. Não se
infere fundamento causal, normativo ou empírico a partir do nome.

A transformação é linear mínimo–máximo, com inversão nas relações negativas.
Registram-se os extremos, a direção e os valores ausentes. Variáveis constantes
ou sem observações numéricas são rejeitadas, sem atribuição artificial de 0,5.
Zero observado permanece válido; sigilo e ausência desconhecida permanecem
nulos. A cobertura do levantamento não é inferida da contagem de valores numéricos.

Ao salvar, persistem-se o cadastro da superfície no banco e o GeoPackage no
Storage oficial, ainda sem índice composto. A camada conserva geometrias e
campos cadastrais, três colunas de conceitos — premissa, critério e dimensão —
com mapas JSON por identificador de critério, seguidas pelos pares de variáveis
originais e reescalonadas. Os metadados documentam a correspondência entre
critérios, campos, fontes e transformações. O visualizador lê essa camada salva,
inclusive quando carregada de uma sessão anterior, sem recalcular pelo catálogo.

O índice utiliza média simples ou média ponderada por pesos AHP. Pesos
informados devem identificar exatamente os critérios salvos e somar um;
comparações individuais devem ser recíprocas e apresentar razão de consistência
não superior a 0,10. Na modalidade colaborativa, exporta-se cópia preenchida do
modelo oficial, acrescida da comparação pareada e dos vínculos, e abre-se o
cadastro de julgamento com hierarquização e critérios fixados pela superfície.
O arquivo também é persistido no julgamento; o modelo original não é alterado.
O envio de convites permanece uma ação explícita, separada da criação.

Somente um julgamento consolidado e consistente, vinculado à mesma superfície
e ao mesmo conjunto de critérios, pode fornecer pesos para a retomada do
cálculo. Essa consolidação não sobrescreve critérios ou pesos globais da
hierarquização. Alterações de critérios exigem uma nova superfície. O índice
é salvo em camada derivada, com operador, pesos e origem registrados; qualquer
valor ausente entre os critérios mantém o índice territorial nulo, sem
redistribuição de pesos. A geração do produto não representa sua homologação.

## Etapa operacional da bancada de favorabilidade V2

A pagina `/restrict/hierarquizacao/fase-2/` disponibiliza o bloco **Conferir e
executar**, com o comando **Calcular Favorabilidade Territorial**. Esta etapa
reutiliza o motor de intersecoes independentes da Elegibilidade, mas nao corresponde
a geracao, extracao agregada ou homologacao do indice final descrito neste documento.

O conjunto de calculo inclui somente as camadas confirmadas pela pagina e visiveis
na bancada, nos papeis Entrada, Favorabilidade territorial de grade e Favorabilidade
territorial de rede. Camadas inseridas diretamente na bancada sao sinalizadas e nao
recebem papel automaticamente. Exige-se uma entrada e ao menos uma superficie
poligonal; bases lineares e rasters permanecem disponiveis para visualizacao, mas
nao sao convertidos em superficies de area nem amostrados por este comando.

A selecao, a previa e o envio a bancada preservam as fontes originais. Somente apos
a confirmacao do calculo, a entrada e preparada em arquivo derivado pelas mesmas
regras cadastrais poligonais da Elegibilidade, com auditoria dos parametros e das
origens. As demandas de uma hierarquizacao devem estar integralmente visiveis e
sao consolidadas em uma unica camada, sem dissolucao entre demandas.

Para arquivos do Storage, o descritor da previa distingue o token temporario
dos tiles (`revisao`) da revisao fisica do original (`revisao_fonte`, data de
modificacao em nanossegundos e tamanho). Esta ultima e conferida antes e depois
da preparacao e enviada ao calculo para entradas avulsas e superficies. O token
de visualizacao nao e utilizado como evidencia de alteracao do arquivo original;
mudancas reais continuam interrompendo a execucao.

Cada superficie e intersectada separadamente com a entrada integral, em EPSG:5880.
Somam-se exclusivamente as areas dos fragmentos por feicao de entrada, em m2, sem
uniao ou dissolucao. Os campos `fg_*` identificam grade e `fr_*` identificam rede.
Ausencia de intersecao resulta em `NULL`; contato sem area resulta em zero.
Sobreposicoes internas a uma base podem produzir soma superior a area da demanda.

O GeoPackage possui a camada principal `favorabilidade_territorial`, com a copia
integral da entrada preparada, identificador por feicao, area total e areas por
base; e a camada `intersecoes`, com geometria, posicao da demanda, identificadores
da base e da feicao de origem, area e todos os atributos nao geometricos de cada
superficie. A classe nominal, os campos normalizados e os indices com e sem o
sufixo `_dim` permanecem separados por fragmento, sem media, moda, reescalonamento
ou qualquer agregacao desses valores. Prefixos evitam colisoes e os metadados
`SICARD_FAVORABILIDADE` registram o mapa entre os campos originais e os de saida.
As geometrias e os atributos gravados sao conferidos por reabertura do produto.

O fluxo oferece progresso por etapas e cancelamento em ponto seguro antes da
gravacao final. O acompanhamento e persistido em namespace proprio de
favorabilidade, restrito ao usuario. As saidas sao gravadas em
`saidas-geoespaciais/analises-avulsas/favorabilidade-territorial/` ou, para grupos,
em `saidas-geoespaciais/hierarquizacoes/{codigo}/fase-2/`, e incluidas na bancada.
Falhas posteriores a persistencia informam o caminho recuperavel, sem descartar
produtos anteriores. Esta execucao nao atualiza indices, escores, ranking ou
homologacao da hierarquizacao e nao registra produtos como resultados de Fase 1.

O painel apresenta os atributos originais `fav_territorial_dim` e
`fav_territorial_classe` para grade, e `fav_rede_dim` e `fav_rede_classe` para
rede, utilizando o mapa de campos preservados nos metadados. Nao utiliza como
substitutos area, indice sem sufixo `_dim`, media ou classe inferida. Cada
combinacao demanda × feicao permanece individualizada, mesmo com nomes ou
valores iguais. Fragmentos da mesma combinacao devem concordar nos atributos;
divergencias e colunas declaradas mas inexistentes impedem a apresentacao.

A seção **5 — Resultados da Favorabilidade Territorial** mantém a revisão de
nomes (5.1), a composição e leitura dos resultados (5.2), a consulta exploratória
por demanda (5.3) e a emissão do relatório com limites e próximos passos (5.4).
As orientações distinguem saída não carregada, ausência de interseção, contato
sem área, zero válido, campo ausente, valor nulo e índice inválido. Mensagens
de carregamento, lote parcial e erro permanecem também em região de status
acessível na própria seção, além do feedback de operação existente.

O PDF corrente identifica as execuções e separa fontes, leitura, metodologia,
resultados por conjunto e limites. Mantém os índices e classes originais por
demanda e feição; as estatísticas exploratórias da tela não são exportadas como
índice final. A síntese de cobertura por superfície informa demandas com e sem
interseção, combinações demanda × feição, índices válidos, ausentes, nulos,
inválidos e contatos sem área. Essas contagens não constituem novo escore.
O PDF apresenta índices com duas casas decimais; Excel e CSV conservam a
precisão numérica disponível nos resultados, sem arredondamento de apresentação.
O pacote conserva os GeoPackages e os metadados com SHA-256.
Falha de leitura pode ser tratada pela tentativa de carregar novamente ou pela
reabertura da saída, sem repetir o cálculo. A preparação de superfícies no
gerador e o avanço à Fase 3 continuam ações separadas. Essa revisão de
apresentação não modifica operadores, pesos AHP, ranking ou persistência dos
dados processados; documentos já emitidos não são sobrescritos.

Um grafico de intervalos com pontos por superficie reune todas as combinacoes
das saidas concluidas, inclusive em lote parcial identificado. Cada demanda
ocupa uma linha, identificada somente pelo nome, sem codigo, identificador ou
nome da entrada anexado ao rotulo. A identidade composta por entrada e chave
da demanda impede a fusao de demandas homonimas. As linhas seguem a ordem
das entradas e demandas; os pontos validos mantem o indice dimensionado na
escala horizontal fixa de 0 a 1. Cada feicao intersectada corresponde a um
ponto individual, inclusive em contatos sem area e valores repetidos.
O traco liga exclusivamente o menor ao maior indice valido da demanda, sem
media, soma, ponderacao ou substituicao dos valores originais. Um unico indice
nao recebe intervalo ficticio. Pontos proximos recebem separacao vertical para
evitar sobreposicao, sem alterar sua posicao horizontal; deslocamentos verticais
sao ligados ao traco por guias e nao representam uma segunda variavel.

As cores categoricas identificam as feicoes de origem, compartilhando a mesma
cor quando a feicao aparece em demandas distintas. A legenda contem uma
entrada por identidade de feicao e superficie, com seu nome, em grade de celulas
uniformes e quebra de nomes longos. Feicoes homonimas permanecem distintas;
as cores nao representam indice ou classe e permanecem estaveis na selecao.
Os valores numericos aparecem junto aos pontos; a identidade completa, classe
e entrada continuam no titulo de consulta, na descricao acessivel e nos detalhes.
A legenda seleciona uma combinacao da feicao, preferindo a demanda ativa quando
houver correspondencia. Pontos e nomes das demandas tambem permitem selecionar,
sincronizando mapa, tabela e detalhes, sem filtrar os graficos.

Zero valido permanece no inicio do eixo. Indices nulos, ausentes, nao numericos
ou fora de [0,1] sao sinalizados na propria linha e nao recebem pontos ficticios
nem conversao em zero. Demandas sem intersecao permanecem como linhas com
indicacao explicita, sem ponto. A rolagem interna permite consultar todas as
demandas e o eixo em telas estreitas, preservando nomes e cabecalho de referencia.
A tabela detalhada continua ordenada pelo indice em ordem decrescente antes
da paginacao. Contatos sem area mantem seus atributos e identificacao tecnica.

Na interface, inclusive nos textos produzidos por JavaScript, aplica-se a
hierarquia tipografica e a paleta de UI da pagina de Priorizacao por atributos.
A rampa Viridis dos indices nos mapas e mantida. Indices e resultados estatisticos sao
formatados com duas casas decimais e virgula; as classes nominais sao exibidas
em Title Case. A mesma formatacao de indices e classes e aplicada no PDF.
Estas regras sao exclusivamente de apresentacao: ordenacao, calculos e produtos
geoespaciais conservam os valores e atributos originais, sem arredondamento
previo ou reclassificacao.

Como referencias de visualizacao, a documentacao de
[graficos do ArcGIS Pro](https://doc.esri.com/en/arcgis-pro/latest/help/analysis/geoprocessing/charts/bar-chart.html)
descreve a apresentacao de observacoes com identificacao individual, sem
agregacao. Os graficos priorizam a leitura direta dos valores originais;
nao representa os indices como parcelas aditivas de um total.

A secao 5, **Resultados da Favorabilidade Territorial**, reutiliza o painel
completo da Elegibilidade, adaptado aos papeis de grade e rede. A apresentacao
exige revisao e confirmacao dos nomes de camadas e feicoes; os nomes sao
persistidos por usuario e assinatura da saida. O painel conecta o mapa de
demandas e intersecoes, a selecao de entrada e superficie, os detalhes de indice
e classe, os graficos integrais e a tabela paginada por combinacao. As colunas
identificam demanda e municipio de origem (feicao), com pares separados de
indice dimensionado e classe para municipios e rede rodoviaria. Mantem-se
uma linha por feicao, com travessao nas colunas da outra superficie; nao se
associam feicoes municipais e de rede por posicao ou nome. A superficie de
origem permanece no titulo de consulta da linha e nos detalhes. O rotulo
municipal e apenas de apresentacao: nao reidentifica a feicao nem modifica sua
geometria ou seus atributos. Area e percentual
da intersecao permanecem apenas como informacao tecnica complementar nos
detalhes. A ocultacao de registros sem indice e classe nao remove zero valido
nem indices invalidos sinalizados e nao limita a lista.
O mapa dispoe de dois seletores na mesma linha: superficie e simbologia.
Nao existe seletor de origem das geometrias. A simbologia permite consultar:
indice original (`fav_territorial` ou `fav_rede`), dimensionado (`_dim`) e
classes nominais originais. O indice dimensionado utiliza rampa Viridis
continua e linear de 0 a 1; o original utiliza os extremos dos valores validos
da superficie consultada e de seus recortes historicos, somente para a cor,
sem modificar ou substituir atributos. Classes recebem cores categoricas,
sem inferencia por limiares. Cinza identifica valores ausentes ou invalidos.
As bases integrais sao carregadas automaticamente a partir da camada oficial
referenciada no processamento, mediante execucao autorizada e vinculo com a
superficie da analise. Nao se oferece escolha entre fontes alternativas.
A referencia identifica a camada utilizada, mas nao constitui copia historica
do conteudo integral da fonte. Os recortes preservados na saida destacam a
combinacao selecionada sobre essa base, sem substituir seus valores.
Falhas de acesso a fonte sao comunicadas no feedback oficial, com tentativa
de recarga e preservacao dos resultados da execucao.
Os poligonos sao opacos e sem bordas;
contatos lineares ou pontuais continuam representados. Nao se simplificam as
geometrias para esta apresentacao.

O carregamento, a revisao e a exportacao da secao de resultados utilizam
ProcessFeedback e Notify, sem emitir um historico de mensagens dentro da secao.
Avisos de qualidade permanecem explicitos no feedback e nos valores das tabelas.

As tres tabelas de conferencia das camadas confirmadas e as duas tabelas de
resultados possuem conteineres independentes, com o componente de filtros de
Agrupamento de Demandas, barra de controles e rodape com paginacao de 50 registros
e contador. Os filtros permitem escolher coluna e valor, inverter e limpar;
a limpeza fica restrita a barra de filtros. Filtrar ou paginar a conferencia
nao muda a composicao do calculo nem a visibilidade das camadas na bancada.
O botao de visualizar da conferencia consulta os dados da camada selecionada,
sem editar suas referencias.

Na tabela por combinacao, os filtros operam sobre todas as linhas, mantendo
a ordenacao global antes da paginacao e distinguindo zero valido, ausencia e
valores invalidos. Na tabela agregada, filtros e paginacao sao independentes;
as barras de filtros e de controles das duas tabelas de resultados utilizam
escala compacta proporcional, preservando os componentes e a organizacao do padrao;
as medidas estatisticas continuam considerando todas as intersecoes de cada
demanda, e nao apenas as linhas visiveis. Alterar a medida reinicia o filtro e a
paginacao da tabela agregada para evitar a reutilizacao de valores de outra
medida. Percentil invalido limpa os resultados apresentados, sem manter valores
anteriores como se fossem validos.

A tabela agregada oferece visualizar demanda no modal de objetos, editar
somente o nome inline, cancelar e salvar. Nas analises vinculadas a uma
hierarquizacao, o codigo cadastral original e conferido contra os membros do
grupo antes de consultar o cadastro correspondente. A gravacao exige permissao
de operacao e altera somente o nome no cadastro original, pelas rotas existentes
de plano, programa ou projeto. Demandas sem vinculo confirmado permanecem
somente para consulta. O resumo consulta os nomes cadastrais atuais ao reabrir;
o GeoPackage e o PDF preservam o registro da analise. Durante a edicao, a troca
de entrada, os filtros da tabela agregada e as medidas estatisticas ficam bloqueados para preservar
o rascunho. Nenhum desses controles altera indices, classes ou intersecoes.

Pode-se reabrir um GeoPackage de favorabilidade ja gravado no Storage, com
conferencia de metadados, geometrias, vinculos e somas antes da apresentacao.
O acesso as execucoes e as revisoes de nomes permanecem segregados por usuario
e modalidade, sem utilizar o namespace da Fase 1. O pacote de download inclui
PDF de Favorabilidade Territorial com indices e classes por combinacao,
todos os GeoPackages integrais, tabelas editaveis, guia e manifesto,
com identificacao explicita de lotes parciais e conferencia de integridade no
Storage. A geracao do pacote nao executa novamente as intersecoes e nao
registra relatorio de Elegibilidade ou altera indices da hierarquizacao.

O pacote de exportação, versão 2, é organizado por finalidade:

| Arquivo | Finalidade |
|---|---|
| `Relatório de Favorabilidade Territorial.pdf` | Leitura técnica: alcance, fontes, cobertura, mapas, índices e classes por demanda e feição, limites e próximos passos. |
| `Tabelas/Favorabilidade Territorial.xlsx` | Conferência externa com abas de índices e classes, cobertura por superfície, fontes e nomes revisados e orientações. |
| `Tabelas/Índices e Classes.csv` | Detalhe aberto, com identificadores, valores originais, estados explícitos e áreas técnicas. |
| `Tabelas/Cobertura por Superfície.csv` | Contagens das combinações e dos estados de qualidade, sem agregação dos índices. |
| `Camadas/NN/*.gpkg` | Saídas integrais para SIG, incluindo atributos de origem, geometrias e vínculos. |
| `Metadados da Análise.json` | Identificação das execuções, nomes revisados e assinaturas SHA-256 das camadas, PDF, tabelas e guia. |
| `LEIA-ME.txt` | Ordem de leitura, formato, interpretação e procedimentos para conferência e eventuais correções. |

O detalhe contém uma linha por execução × demanda × superfície × feição;
demandas sem interseção também aparecem por superfície, sem índice ou classe
atribuídos. Contatos sem área preservam seus índices e classes. Nomes iguais
não fundem registros: a chave de conferência combina execução, chave posicional
da demanda, ID da superfície e ID da feição. O estado `sem_intersecao` difere
de `ausente` (campo inexistente), `nulo` e `invalido`; zero válido permanece
numérico. Os atributos brutos, inclusive valores incompatíveis com o domínio
do índice dimensionado, permanecem disponíveis no GeoPackage integral.

Os CSVs usam UTF-8 com BOM, separador ponto e vírgula e decimal vírgula.
Percentuais são apresentados em 0–100, não como frações. O XLSX mantém tipos
numéricos e os textos não são gravados como fórmulas. A exportação não é um
formulário de reimportação: editar uma cópia não modifica o sistema. Eventuais
correções devem ser feitas na fonte e gerar nova execução, preservando o pacote
original para comparação. As estatísticas exploratórias da interface não
são exportadas como se fossem resultados persistidos ou índices finais.

A tabela **Indices e Classes Agregados por Demanda** fica imediatamente abaixo
da tabela por feicao, substituindo nesta pagina a consulta de indices oficiais
registrados. Seus valores provem exclusivamente das intersecoes da camada de
demandas selecionada. Uma linha por demanda, identificada pela entrada e pelo
vinculo da feicao, mantem conjuntos separados de grade e rede, inclusive para
demandas homonimas. Os valores originais sao apresentados em ordem decrescente,
com repeticoes, separados por virgulas e pela conjuncao “e” antes do ultimo
valor. As classes seguem a mesma separacao, sem reclassificacao.

Tres seletores, em colunas independentes, oferecem tendencia central (media
aritmetica simples, mediana e moda), dispersao (amplitude, variancia populacional,
desvio-padrao populacional, coeficiente de variacao percentual e intervalo
interquartil) e posicao (minimo, Q1, Q2, Q3, maximo e percentil personalizado).
Somente uma medida pode ficar ativa no total; selecionar uma reinicia os demais
seletores. A medida substitui os conjuntos nas colunas numericas de grade e rede;
voltar ao estado neutro restaura todos os valores originais.

Cada combinacao demanda × feicao contribui uma observacao, sem ponderacao por
area. Repeticoes e zero valido sao mantidos; valores ausentes, nulos ou invalidos
sao excluidos, com contagem explicita de indices validos por celula. Conjuntos
sem indices validos nao recebem zero. Variancia e desvio-padrao usam divisor N.
Quartis e percentis usam interpolacao linear na posicao (N-1) × p da sequencia
crescente; o percentil personalizado deve estar entre 0 e 100. A moda preserva
todos os empates na maior frequencia; conjuntos com mais de uma observacao, todas
distintas, sao indicados como sem moda. O coeficiente de variacao e indefinido
para media zero. As linhas sao ordenadas pelo maior indice original valido da
demanda, mantendo entradas sem valor valido ao final.

Estas estatisticas sao exclusivamente exploratorias no navegador. Nao gravam
valores, nao repetem intersecoes, nao substituem indices oficiais, nao alteram
classes, homologacao ou metodo de sintese e nao modificam o PDF ou os GeoPackages,
que preservam os resultados originais.

## Produto final do modulo

O modulo deve produzir um pacote homologado de Fase 2 contendo:

- raster final de favorabilidade territorial;
- rasters intermediarios por criterio;
- rasters intermediarios normalizados;
- pesos AHP utilizados;
- metadados das camadas de origem;
- regras de transformacao por criterio;
- relatorio de processamento;
- relatorio de validacao;
- identificador de versao;
- status de homologacao.

O raster final deve ser publicado na biblioteca de camadas de indice de favorabilidade
territorial, ficando disponivel para consumo pela Fase 2 da espinha dorsal.

## Conceito metodologico

O modulo deve transformar dados geoespaciais de entrada em superficies raster
continuas e comparaveis. Cada criterio gera um raster normalizado entre 0 e 1. Em
seguida, os rasters sao ponderados por pesos AHP e combinados por algebra de mapas,
preferencialmente por operador de media ponderada.

Fluxo conceitual:

```text
camadas de entrada
    -> validacao e compatibilizacao
    -> operador espacial por criterio
    -> raster continuo por criterio
    -> reescalonamento 0-1
    -> inversao de criterios de relacao negativa
    -> aplicacao dos pesos AHP
    -> media ponderada
    -> raster final de favorabilidade territorial
    -> homologacao
    -> publicacao na biblioteca
```

## Entradas aceitas

O modulo deve aceitar, no minimo:

- WFS;
- Shapefile compactado;
- GeoPackage;
- GeoJSON;
- raster externo ja homologado, quando tecnicamente justificavel;
- outras fontes suportadas pelo motor geoespacial adotado.

Cada insumo deve ser associado a um criterio da Fase 2.

## Cadastro minimo do criterio

Cada criterio processado pelo modulo deve possuir cadastro minimo:

- `criterio_id`;
- `criterio_nome`;
- `dimensao`;
- `fonte_id`;
- `tipo_dado_entrada`: ponto, linha, poligono, tabela, raster;
- `operador_espacial`;
- `relacao`: positiva ou negativa;
- `peso_ahp`;
- `unidade_original`;
- `regra_normalizacao`;
- `resolucao_saida`;
- `crs_saida`;
- `extensao_processamento`;
- `observacao_metodologica`.

## Independencia entre criterios

Antes de gerar a superficie, o modulo deve verificar se os criterios selecionados
sao efetivamente independentes entre si.

A superficie combina os criterios por media — simples nesta versao, ponderada por
AHP na versao homologada. Em qualquer das duas, dois criterios que medem o mesmo
fator latente nao se compensam: eles somam. O fator passa a pesar tantas vezes
quantos forem os criterios que o representam.

Isso e especialmente grave quando os pesos vem de AHP. A comparacao pareada de
Saaty pergunta ao especialista o peso de cada criterio assumindo que os criterios
sao independentes. Se dois deles medem a mesma coisa, o especialista atribui peso
a cada um separadamente e o fator recebe a soma dos dois, sem que isso apareca na
razao de consistencia — a matriz pode ficar perfeitamente consistente e ainda
assim ponderar errado. A verificacao de independencia precisa acontecer na
composicao do catalogo, nao na ponderacao.

### Procedimento

1. **Verificacao por construcao.** Para cada par de criterios, comparar os insumos
   brutos. Criterio derivado dos mesmos insumos de outro — ainda que por operador
   de agregacao diferente — e redundante por construcao e deve ser removido, mesmo
   que a correlacao observada nao seja alta.
2. **Verificacao por correlacao.** Calcular a matriz de correlacao de postos
   (Spearman) entre os campos de criterio da camada normalizada. Pares com
   coeficiente elevado devem ser examinados.
3. **Julgamento.** Correlacao alta nao e prova de redundancia. Dois criterios
   podem correlacionar porque o territorio os associa, e ainda assim medirem
   fenomenos que respondem a intervencoes diferentes. O criterio de remocao e
   **ausencia de informacao propria**, nao correlacao.
4. **Registro.** Toda remocao deve constar do catalogo de criterios com o motivo
   (`redundante` ou `sem_dado`) e da secao de composicao do diagnostico
   correspondente, com a evidencia que a sustentou.

### Distincao entre redundancia e degeneracao

Sao problemas diferentes e a resposta e diferente:

- **Redundante:** o criterio repete informacao de outro. A remocao e definitiva,
  porque reincluir o criterio voltaria a inflar o fator.
- **Degenerado:** o criterio tem informacao propria, mas e praticamente constante
  no territorio — quase todos os valores iguais. Ele nao discrimina e apenas
  desloca a superficie por uma constante. A causa costuma ser qualidade ou
  cobertura do insumo, entao o criterio permanece no catalogo e a correcao e no
  dado, nao na composicao.

## Importacao e recepcao das camadas

O modulo deve conter um motor de input/importacao capaz de receber camadas por WFS ou
upload de arquivos geoespaciais.

### WFS

Para fontes WFS, o modulo deve:

- registrar URL consultada;
- registrar layer/typeName;
- registrar parametros de consulta;
- registrar data e hora da requisicao;
- validar retorno;
- armazenar snapshot do dado importado;
- registrar filtros espaciais ou atributivos aplicados.

### Upload de arquivo

Para arquivos enviados pelo usuario, o modulo deve:

- aceitar Shapefile compactado;
- aceitar GeoPackage;
- aceitar GeoJSON;
- identificar camadas internas quando houver mais de uma;
- validar geometria;
- validar CRS;
- armazenar arquivo original como evidencia.

## Validacao inicial

Cada camada importada deve passar por validacoes antes de gerar raster.

Validacoes minimas:

- camada possui feicoes;
- geometria esta presente;
- CRS esta definido;
- extensao espacial e compativel com a area de estudo;
- tipo geometrico e compativel com o operador definido;
- campos necessarios para ponderacao existem;
- valores numericos esperados sao validos;
- nao ha percentual critico de geometrias nulas ou vazias.

Camadas reprovadas nao devem seguir para o processamento do criterio.

## Compatibilizacao

Antes da aplicacao dos operadores, o modulo deve compatibilizar todos os insumos.

Operacoes minimas:

- reprojetar para o CRS oficial do pacote;
- recortar para a area de estudo;
- corrigir geometrias invalidas;
- remover geometrias vazias;
- padronizar campos de controle;
- aplicar filtros atributivos configurados;
- resolver duplicidades quando houver regra definida.

## Operadores espaciais por criterio

Cada criterio deve declarar qual operador espacial sera usado para gerar sua superficie
continua.

Operadores possiveis:

- distancia euclidiana;
- distancia ponderada;
- custo acumulado;
- densidade de kernel;
- densidade simples;
- interpolacao;
- agregacao por unidade territorial;
- rasterizacao de atributo;
- booleano de presenca/ausencia;
- estatistica zonal;
- modelo de acessibilidade em rede;
- operador customizado homologado.

Exemplos:

```text
proximidade a polos logisticos -> distancia euclidiana ou custo acumulado
acidentes graves -> densidade de kernel
producao agropecuaria -> agregacao municipal ou regional
VDM alto -> distancia ponderada pelo VDM do segmento
vulnerabilidade social -> rasterizacao de indice por setor/municipio
```

## Geracao do raster bruto por criterio

Cada operador deve produzir um raster bruto, ainda na unidade original ou em escala
derivada.

Exemplos:

- metros ate a feicao mais proxima;
- acidentes por km2;
- toneladas por municipio;
- minutos de deslocamento;
- indice de vulnerabilidade;
- valor de producao;
- densidade de equipamentos.

O raster bruto deve ser armazenado como evidencia intermediaria.

## Reescalonamento para 0 a 1

Todos os rasters brutos devem ser reescalonados para a escala comum de 0 a 1.

Regra basica:

```text
valor_normalizado = (valor - minimo) / (maximo - minimo)
```

O modulo deve permitir outras regras quando tecnicamente justificadas:

- winsorizacao por percentis;
- classificacao por quebras naturais;
- curva fuzzy;
- limite maximo saturado;
- normalizacao por meta;
- normalizacao por faixa regulatoria ou tecnica.

Toda regra diferente da transformacao linear simples deve ser registrada no relatorio
metodologico.

## Inversao de criterios de relacao negativa

Depois da normalizacao, criterios de relacao negativa devem ser invertidos.

Regra:

```text
valor_favorabilidade = 1 - valor_normalizado
```

Exemplo:

- quanto maior a distancia ate infraestrutura desejada, pior;
- quanto maior a exposicao a congestionamento, maior a necessidade, quando o criterio
  for necessidade de intervencao;
- quanto maior o custo de acesso, pior.

A inversao deve respeitar a semantica do criterio. O cadastro do criterio deve
informar se o valor maior representa maior ou menor favorabilidade.

## Pesos AHP

Os pesos dos criterios devem ser gerados pelo modulo de pesos AHP ja existente e
consumidos por este modulo.

Regras minimas:

- cada criterio processado deve possuir peso associado;
- pesos devem estar normalizados;
- soma dos pesos deve ser igual a 1, salvo tolerancia numerica;
- a matriz AHP e a razao de consistencia devem ser registradas;
- se houver criterio sem raster valido, o sistema deve bloquear a homologacao ou
  recalcular pesos conforme regra explicita.

## Algebra de mapas

O raster final de favorabilidade territorial deve ser produzido por media ponderada.

Regra conceitual:

```text
favorabilidade =
    raster_criterio_1 * peso_1 +
    raster_criterio_2 * peso_2 +
    ...
    raster_criterio_n * peso_n
```

Com:

```text
soma(pesos) = 1
```

Resultado esperado:

```text
0 = menor favorabilidade territorial
1 = maior favorabilidade territorial
```

## Variáveis do Modulo

### Variáveis de Cadastro de Critério
- `criterio_id`
- `criterio_nome`
- `dimensao`
- `fonte_id`
- `tipo_dado_entrada`
- `operador_espacial`
- `relacao`
- `peso_ahp`
- `unidade_original`
- `regra_normalizacao`
- `resolucao_saida`
- `crs_saida`
- `extensao_processamento`
- `observacao_metodologica`

### Variáveis de Importação de Camada
- `informar_tipo_entrada`
- `informar_caminho_arquivo`
- `informar_crs_origem`
- `definir_filtro_espacial`
- `definir_filtro_atributivo`

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

### Variáveis de Compatibilização
- `recortar_area_estudo`
- `corrigir_geometrias_invalidas`
- `remover_geometrias_vazias`
- `padronizar_nomes_campos`
- `reprojetar_crs_destino`

### Variáveis de Operador Espacial
- `selecionar_operador_espacial` (distancia_euclidiana, densidade_kernel, interpolacao, etc.)
- `definir_parametros_operador` (ex: banda, raio, etc.)
- `definir_resolucao_raster`
- `definir_crs_saida`

### Variáveis de Reescalonamento
- `selecionar_regra_normalizacao` (linear, winsorizacao, quebras_naturais, fuzzy, etc.)
- `definir_percentil_inferior` (para winsorização)
- `definir_percentil_superior` (para winsorização)
- `definir_limite_minimo` (para limite saturado)
- `definir_limite_maximo` (para limite saturado)

### Variáveis de Inversão
- `selecionar_regra_inversao` (1 - valor_normalizado)
- `definir_fator_inversao` (opcional)

### Variáveis de Álgebra de Mapas
- `selecionar_operador_algebra` (media_simples, media_ponderada, fuzzy_membership, fuzzy_or, fuzzy_and, fuzzy_gamma)
- `definir_regra_nodata` (bloquear, neutro, minimo, interpolacao)
- `definir_valor_neutro`
- `definir_gamma` (para fuzzy gamma)

### Variáveis de Exportação
- `definir_nome_arquivo_favorabilidade`
- `selecionar_formato_saida` (tiff, geotiff, etc.)
- `definir_crs_saida`
- `selecionar_opcao_salvamento`

### Variáveis de Metadados
- `definir_nome_versao`
- `informar_responsavel_tecnico`
- `informar_observacoes_homologacao`

---

## Funções do Fluxo

O sistema deve ser maleável, permitindo que o usuário:
- Crie novas funções combinando operações disponíveis (construtor de funções)
- Crie novos fluxos combinando funções (construtor de fluxo)

### Funções Padrão da Fase 2

#### FUN-01: Cadastrar Critério
- Entrada: metadados do critério
- Operações: nenhum (apenas cadastro)
- Saída: `criterio_id` e metadados registrados

#### FUN-02: Importar e Validar Camada de Critério
- Entrada: `informar_tipo_entrada`, `informar_caminho_arquivo`, `informar_crs_origem`, `definir_filtro_espacial`, `definir_filtro_atributivo`
- Operações: OP-01 (Carregar Camada) + OP-02 (Validar Camada)
- Saída: camada validada

#### FUN-03: Compatibilizar Camada
- Entrada: camada validada
- Operações: OP-03 (Normalizar Camada)
- Saída: camada compatibilizada (CRS oficial, recortada)

#### FUN-04: Gerar Raster Bruto por Critério
- Entrada: camada compatibilizada, `selecionar_operador_espacial`, `definir_parametros_operador`, `definir_resolucao_raster`, `definir_crs_saida`
- Operações: variável conforme operador (OP-08, OP-09, OP-10, OP-11, OP-12, OP-13, OP-14, OP-15, OP-16, OP-17, OP-18)
- Saída: raster bruto

#### FUN-05: Normalizar Raster (0-1)
- Entrada: raster bruto, `selecionar_regra_normalizacao`, parâmetros específicos da regra
- Operações: OP-23 (Normalizar Raster)
- Saída: raster normalizado (0-1)

#### FUN-06: Inverter Critério Negativo
- Entrada: raster normalizado, `selecionar_regra_inversao`, `definir_fator_inversao`
- Operações: OP-26 (Subtrair) ou cálculo aritmético
- Saída: raster invertido

#### FUN-07: Combinar Rasters (Álgebra de Mapas)
- Entrada: rasters normalizados, `selecionar_operador_algebra` (media_simples, media_ponderada, fuzzy_membership, fuzzy_or, fuzzy_and, fuzzy_gamma), `definir_regra_nodata`, `definir_valor_neutro`, `definir_gamma`
- Operações: OP-27 (Somar Rasters) + OP-28 (Multiplicar Raster por Escalar) + operadores fuzzy
- Saída: raster final de favorabilidade

#### FUN-08: Exportar Raster Final
- Entrada: raster final, `definir_nome_arquivo_favorabilidade`, `selecionar_formato_saida`, `definir_crs_saida`, `selecionar_opcao_salvamento`
- Operações: OP-26 (Exportar Raster)
- Saída: arquivo exportado

#### FUN-09: Gerar Metadados de Versão
- Entrada: `definir_nome_versao`, `informar_responsavel_tecnico`, `informar_observacoes_homologacao`
- Operações: nenhum (geração de metadados)
- Saída: pacote versionado

---

## Fluxo da Fase 2

```text
cadastrar criterio
    -> importar e validar camada
    -> compatibilizar camada
    -> gerar raster bruto por criterio
    -> normalizar raster (0-1)
    -> inverter criterio negativo (se aplicavel)
    -> combinar rasters (algebra de mapas)
    -> exportar raster final
    -> gerar metadados de versao
    -> homologacao
    -> publicacao na biblioteca
```

---

## Tratamento de NoData

O modulo deve possuir regra explicita para valores NoData.

Opcoes possiveis:

- bloquear processamento quando houver NoData em area relevante;
- preencher com valor neutro;
- preencher com minimo;
- preencher por interpolacao;
- recalcular media ponderada apenas com criterios validos na celula;
- aplicar mascara de area elegivel.

A regra adotada deve ser registrada no pacote.

Regra recomendada para o primeiro desenho:

```text
NoData em criterio obrigatorio -> bloqueia homologacao
NoData em criterio opcional -> recalcula pesos locais ou aplica regra homologada
```

## Decomposicao por dimensao

Quando os criterios estiverem organizados por dimensoes, o modulo deve permitir gerar:

- raster por criterio;
- raster por dimensao;
- raster final consolidado.

Isso permite que a Fase 2 da espinha dorsal explique a contribuicao de cada dimensao
para o ranking.

Exemplo:

```text
favorabilidade_tecnica
favorabilidade_economico_financeira
favorabilidade_social
favorabilidade_seguranca
favorabilidade_ambiental
favorabilidade_territorial
favorabilidade_final
```

## Validacao do raster final

Antes da homologacao, o raster final deve ser validado.

Validacoes minimas:

- valores dentro da faixa 0 a 1;
- CRS correto;
- resolucao correta;
- extensao correta;
- alinhamento de grade entre rasters;
- ausencia de NoData indevido;
- estatisticas basicas calculadas;
- distribuicao de valores coerente;
- pesos aplicados corretamente;
- metadados completos;
- rastreabilidade ate os insumos originais.

Estatisticas recomendadas:

- minimo;
- maximo;
- media;
- mediana;
- desvio padrao;
- percentis;
- histograma;
- area por classe de favorabilidade.

## Analise de sensibilidade

O modulo deve permitir armazenar ou executar analise de sensibilidade quando
disponivel.

Possibilidades:

- simulacao de variacao de pesos;
- comparacao entre cenarios AHP;
- mapa de sensibilidade espacial;
- identificacao de criterios mais sensiveis;
- comparacao entre ranking original e ranking por cenario.

A analise de sensibilidade pode ser opcional, mas deve ser prevista no contrato do
pacote.

## Homologacao

Antes de publicar o raster final, o modulo deve gerar uma etapa de homologacao.

Itens minimos da homologacao:

- criterios processados;
- criterios reprovados;
- fontes utilizadas;
- operadores aplicados;
- regras de normalizacao;
- criterios invertidos;
- pesos AHP aplicados;
- razao de consistencia AHP;
- regra de NoData;
- estatisticas do raster final;
- visualizacao do raster final;
- amostra de valores por localidade;
- responsavel tecnico;
- data de homologacao.

Somente pacotes homologados devem aparecer na biblioteca de indice de favorabilidade
territorial.

## Versionamento

Todo pacote publicado deve possuir identificador de versao.

Padrao recomendado:

```text
fase2_favorabilidade_<area_estudo>_<data>_v<numero>
```

Exemplo:

```text
fase2_favorabilidade_sp_2026_07_02_v1
```

Metadados minimos de versao:

- `pacote_id`;
- `versao`;
- `data_criacao`;
- `data_homologacao`;
- `responsavel_tecnico`;
- `status`: rascunho, validado, homologado, arquivado;
- `criterios_incluidos`;
- `pesos_ahp_id`;
- `hash_ou_assinatura_dos_insumos`, se disponivel;
- `observacoes`.

## Publicacao na biblioteca

Apos homologacao, o pacote deve ser publicado na biblioteca de camadas de indice de
favorabilidade territorial.

A biblioteca deve permitir:

- listar pacotes homologados;
- consultar metadados;
- visualizar raster final;
- consultar rasters intermediarios;
- consultar pesos AHP;
- consultar relatorio de processamento;
- selecionar pacote para uma rodada da Fase 2.

## Contrato de saida para a espinha dorsal

O pacote homologado deve expor, no minimo:

```json
{
  "pacote_id": "fase2_favorabilidade_sp_2026_07_02_v1",
  "status": "homologado",
  "crs": "EPSG:XXXX",
  "resolucao": 50,
  "unidade_resolucao": "m",
  "raster_final": {
    "nome": "favorabilidade_territorial",
    "valor_minimo": 0,
    "valor_maximo": 1,
    "nodata": null
  },
  "criterios": [
    {
      "criterio_id": "criterio_001",
      "criterio_nome": "Proximidade com segmentos rodoviarios de VDM alto",
      "dimensao": "Tecnica",
      "operador": "distancia_ponderada",
      "relacao": "positiva",
      "peso_ahp": 0.12,
      "raster_normalizado": "criterio_001_norm"
    }
  ],
  "relatorio_processamento": "...",
  "metadados": "..."
}
```

## Consumo pela Fase 2 da espinha dorsal

Ao consumir o pacote, a espinha dorsal deve extrair o valor do raster final para cada
projeto.

Operadores de extracao possiveis:

- valor no ponto;
- media zonal;
- mediana zonal;
- maximo;
- minimo;
- percentil;
- media ponderada por extensao;
- extracao por corredor ou area de influencia.

Regra conceitual:

```text
score_fase2_projeto = extrair(favorabilidade_territorial, geometria_projeto)
```

O metodo de extracao deve ser registrado na rodada de analise.

## Regras de auditoria

Toda execucao do modulo deve gerar trilha de auditoria:

- usuario responsavel;
- data e hora de importacao;
- fontes importadas;
- parametros de operadores espaciais;
- CRS de origem e destino;
- resolucao adotada;
- extensao de processamento;
- regras de normalizacao;
- criterios invertidos;
- pesos AHP aplicados;
- algebra de mapas executada;
- erros e avisos;
- decisao de homologacao.

## Decisoes conceituais consolidadas

1. A Fase 2 e a etapa de ranking tecnico-territorial.
2. Cada criterio deve gerar uma superficie raster continua ou uma superficie
   homologada equivalente.
3. Todos os criterios devem ser normalizados para 0 a 1.
4. Criterios de relacao negativa devem ser invertidos antes da ponderacao.
5. Pesos AHP devem ser consumidos do modulo de pesos ja existente.
6. O raster final deve ser gerado por algebra de mapas, preferencialmente media
   ponderada.
7. O pacote deve preservar rasters intermediarios, pesos e metadados para auditoria.
8. Somente superficies homologadas devem ser publicadas na biblioteca e consumidas
   pela espinha dorsal.

## Proximos detalhamentos

Este documento define o modulo gerador da superficie de favorabilidade territorial da
Fase 2. Os proximos documentos devem detalhar:

- modulo de recepcao, validacao e normalizacao de atributos de projeto da Fase 3;
- modelo de dados para biblioteca de camadas;
- contrato de API para execucao da Fase 2;
- relacao entre pesos AHP, cenarios e superficies homologadas.

## Implementação da página geradora

A página `geoespacial/gerador-favorabilidade.html` cadastra a superfície territorial,
incluindo grade, CRS, resolução, política de NoData e método de combinação. Ela também
oferece a configuração sequencial de funções/algoritmos, incorpora a bancada de
geoprocessamento e acompanha seus eventos. A superfície é o produto deste módulo; o
índice `score_fase2` por projeto continua sendo produzido posteriormente pela camada
consumidora, mediante extração espacial sobre a geometria do projeto.

Produtos e receitas são persistidos nas tabelas `geoprocessamento.produto`,
`geoprocessamento.produto_fase2`, `geoprocessamento.configuracao_fluxo` e
`geoprocessamento.configuracao_fluxo_item`. Critérios e seus vínculos com a superfície
utilizam `geoprocessamento.criterio_fase2` e
`geoprocessamento.produto_criterio_fase2`.
