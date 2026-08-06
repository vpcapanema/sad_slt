| col1 | col2 | col3 |
| ---- | ---- | ---- |
|      |      |      |
|      |      |      |

# NOTA TÉCNICA — METODOLOGIA DO SISTEMA DE HIERARQUIZAÇÃO DE DEMANDAS

> **Documento vivo.** Esta nota técnica é atualizada continuamente à medida que a
> metodologia do sistema evolui. Consulte sempre o *Histórico de Revisões* para a
> versão vigente. As lacunas marcadas com `[preencher]` devem ser completadas pela
> equipe responsável antes da entrega formal ao cliente.

---

## Identificação do documento

| Campo                             | Conteúdo                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Título**                 | Metodologia do Sistema de Hierarquização de Demandas — SICARD                                                                                                         |
| **Número**                 | NT-SICARD-001/2026                                                                                                                                                       |
| **Versão**                 | 1.5                                                                                                                                                                      |
| **Data de emissão**        | 06/08/2026                                                                                                                                                               |
| **Classificação**         | Documento técnico-metodológico de entrega ao cliente                                                                                                                   |
| **Sistema**                 | SICARD — Sistema de Apoio à Tomada de Decisão                                                                                                                         |
| **Domínio de aplicação** | Logística e transportes. Concebido no âmbito do Plano de Logística Integrada do Estado de São Paulo (PLI-SP), aplica-se a qualquer objeto de demanda desse domínio. |
| **Unidade responsável**    | `[preencher]`                                                                                                                                                          |
| **Autoria técnica**        | `[preencher]`                                                                                                                                                          |
| **Aprovação**             | `[preencher]`                                                                                                                                                          |
| **Situação**              | Rascunho                                                                                                                                                                 |

### Histórico de revisões

| Versão | Data       | Autoria         | Descrição da alteração                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ---------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 06/08/2026 | `[preencher]` | Versão inicial: consolidação integral da metodologia de hierarquização (Fases 1, 2 e 3, método AHP e matriz de 9 dimensões / 55 critérios).                                                                                                                                                                                                                                                                                                                  |
| 1.1     | 06/08/2026 | `[preencher]` | Padronização do termo "objeto de demanda" (categorias: plano, programa e projeto); ampliação do escopo para o domínio de logística e transportes; renomeação da classe de fator`projeto` para `atributo_objeto`.                                                                                                                                                                                                                                         |
| 1.2     | 06/08/2026 | `[preencher]` | Formalização do**protocolo epistemológico de critérios** como estrutura invariante do sistema: precedência da premissa sobre o critério e cadeia de fundamentação premissa → critério → variável → relação com o escopo → dado → métrica → fonte, distinguindo a estrutura de composição da matriz (invariante) de seu conteúdo temático (dimensões e critérios, substituíveis).                                                     |
| 1.3     | 06/08/2026 | `[preencher]` | Inclusão da Seção 9 ("Fundamentação científica da construção do critério"), detalhando as propriedades científicas que conferem credibilidade aos resultados e os componentes do registro de cada critério, da premissa ao ranking; renumeração das seções subsequentes.                                                                                                                                                                              |
| 1.4     | 06/08/2026 | `[preencher]` | Reposicionamento da fundamentação teórica para a Seção 4 (antes do detalhamento metodológico), em linguagem conceitual; deslocamento das definições de componentes do critério para a Seção 10 (metodológica); reformulação do sumário executivo e demais trechos para expressar o protocolo epistemológico como núcleo do sistema, desvinculando-o de uma matriz única de critérios; renumeração das seções.                                 |
| 1.5     | 06/08/2026 | `[preencher]` | Expansão da Seção 4.1 com um parágrafo dedicado a cada elo da cadeia de fundamentação (premissa, critério, variável, relação com o escopo, dado, métrica e ranking) e respectivo embasamento na literatura de apoio à decisão multicritério, teoria da mensuração e epistemologia (Keeney, Roy, Belton & Stewart, Keeney & Raiffa, Munda, Bouyssou et al., Krantz et al., Saaty e Popper); inclusão das referências correspondentes na Seção 15. |

---

## Sumário

1. [Sumário executivo](#1-sumário-executivo)
2. [Contexto e justificativa](#2-contexto-e-justificativa)
3. [Objetivo](#3-objetivo)
4. [Fundamentação teórica](#4-fundamentação-teórica)
5. [Fundamentação legal, normativa e metodológica](#5-fundamentação-legal-normativa-e-metodológica)
6. [Definições e siglas](#6-definições-e-siglas)
7. [Visão geral do sistema (espinha dorsal)](#7-visão-geral-do-sistema-espinha-dorsal)
8. [Arquitetura metodológica em fases](#8-arquitetura-metodológica-em-fases)
9. [Método multicritério AHP](#9-método-multicritério-ahp)
10. [Matriz de critérios e premissas](#10-matriz-de-critérios-e-premissas)
11. [Fluxo de dados ponta a ponta](#11-fluxo-de-dados-ponta-a-ponta)
12. [Auditoria, versionamento e homologação](#12-auditoria-versionamento-e-homologação)
13. [Produtos e entregáveis](#13-produtos-e-entregáveis)
14. [Considerações finais](#14-considerações-finais)
15. [Referências](#15-referências)

---

## 1. Sumário executivo

O Sistema de Hierarquização de Demandas do SICARD é o motor de apoio à decisão que
cadastra, analisa, hierarquiza e acompanha **objetos de demanda — planos, programas e
projetos — no contexto de logística e transportes**. Concebido inicialmente no âmbito
do Plano de Logística Integrada do Estado de São Paulo (PLI-SP), o sistema aplica-se a
qualquer objeto de demanda desse domínio. A metodologia permite que um grande conjunto
de objetos de demanda seja avaliado de forma **automatizada, configurável e
auditável**, sem depender de análise manual objeto a objeto.

A avaliação é organizada em **três fases metodológicas independentes e combináveis**:

- **Fase 1 — Triagem de restrição e risco:** classifica a elegibilidade territorial
  preliminar de cada objeto de demanda (apto, apto com ressalva ou restrito).
- **Fase 2 — Hierarquização por favorabilidade territorial:** produz o ranking
  técnico-territorial a partir de superfícies contínuas de favorabilidade.
- **Fase 3 — Ajuste por atributos do objeto de demanda:** incorpora informações de
  maturidade, custo, governança e viabilidade, além dos riscos herdados da Fase 1.

Os pesos dos critérios são definidos pelo **Método de Análise Hierárquica (AHP)** e
aplicados sobre critérios organizados segundo um **protocolo epistemológico** — a
estrutura de fundamentação, invariante, que disciplina como cada critério é concebido,
medido e auditado. Esse protocolo, e não uma lista fixa de critérios, é o núcleo do
sistema: o conjunto de 9 dimensões e 55 critérios aqui adotado é a instância aplicada à
logística e aos transportes, substituível conforme o domínio, sem perda de consistência
lógica, rastreabilidade e auditabilidade. Todo o processo é transparente: para cada
objeto de demanda é possível explicar por que ele recebeu determinada posição no ranking.

---

## 2. Contexto e justificativa

O planejamento da infraestrutura de transportes exige comparar, de maneira coerente e
defensável, um grande número de demandas heterogêneas — em estágios distintos de
maturidade, com impactos territoriais, econômicos, sociais, ambientais e de segurança
diversos. A priorização puramente qualitativa, objeto a objeto, é lenta, pouco
reprodutível e vulnerável a vieses.

O sistema responde a essa necessidade com um arcabouço metodológico que combina
**análise geoespacial** (favorabilidade territorial e de rede) com **análise
multicritério** (AHP), preservando a rastreabilidade das decisões e a possibilidade de
reprocessamento com dados atualizados. A modularidade em fases permite adequar a
profundidade da análise à disponibilidade de dados de cada rodada.

---

## 3. Objetivo

Descrever, de forma completa e verificável, a metodologia do Sistema de Hierarquização
de Demandas, de modo que o cliente compreenda:

- a lógica de triagem territorial (elegibilidade);
- a construção do ranking técnico-territorial por favorabilidade;
- o ajuste por atributos intrínsecos dos objetos de demanda;
- o método de ponderação multicritério (AHP) e o protocolo de critérios e premissas;
- o fluxo de dados ponta a ponta e os mecanismos de auditoria e versionamento.

---

## 4. Fundamentação teórica

O núcleo do método é um **protocolo epistemológico**: uma estrutura de fundamentação
invariante que disciplina como cada critério deve ser concebido, justificado, medido e
auditado. Antes de definir *o que* se avalia, o protocolo fixa *como* todo juízo é
construído — da premissa que o origina à métrica que o torna comparável e à fonte que o
autentica. É essa arquitetura de raciocínio que confere unidade ao sistema: por repousar
na estrutura, e não em um elenco particular de critérios, ela sustenta a hierarquização
de demandas de naturezas distintas, sob conjuntos de critérios que variam conforme o tema
em julgamento. Muda o conteúdo submetido à análise; permanece o rigor com que ele é
fundamentado.

Essa opção confere aos resultados as propriedades que caracterizam o conhecimento
científico:

- **Fundamentação:** nenhum critério é admitido sem uma premissa teórica ou normativa que
  o justifique;
- **Rastreabilidade:** cada resultado pode ser reconduzido, passo a passo, até sua origem;
- **Reprodutibilidade:** outro analista, de posse dos mesmos insumos, refaz o percurso e
  obtém o mesmo resultado;
- **Testabilidade:** os critérios se expressam em termos observáveis, passíveis de
  contestação empírica;
- **Intersubjetividade:** o julgamento deixa de ser opinião individual e torna-se
  argumento verificável por terceiros;
- **Comensurabilidade:** valores de naturezas distintas são reduzidos a uma escala comum,
  permitindo comparação legítima;
- **Não-arbitrariedade:** a exclusão da subjetividade injustificada é estrutural, e não
  uma mera promessa de boa conduta.

### 4.1 A cadeia de fundamentação

Todo critério nasce de uma **premissa** e percorre uma sequência lógica até compor o
resultado final: **premissa → critério → variável → relação com o escopo → dado →
métrica → ranking**. A premissa é uma proposição fundamentada sobre aquilo que afeta o
objeto de demanda; dela **deriva** o critério, que se operacionaliza em uma variável
observável, cujo sentido é fixado pela relação com o escopo, preenchida por um dado,
tornada comparável por uma métrica e, por fim, agregada no ranking.

A relação entre premissa e critério tem precedência unívoca: **a premissa é a origem, o
critério é a derivação**. Um critério sem premissa é arbitrário; uma premissa sem
critério é inerte. A construção ocorre no sentido premissa → critério; a verificação de
admissibilidade percorre o caminho inverso — dado um critério, exige-se a premissa que o
sustente e, na sua ausência, o critério é descartado.

Cada elo da cadeia cumpre uma função distinta e insubstituível, e a literatura de apoio
à decisão multicritério, a teoria da mensuração e a epistemologia oferecem fundamento
consolidado para cada um deles.

A **premissa** é o ponto de partida: uma afirmação fundamentada, teórica ou normativa,
sobre o que torna um objeto de demanda mais ou menos favorável — é ela que responde à
pergunta "por que isto importa?". A precedência do valor sobre a alternativa é o cerne do
*value-focused thinking* de Keeney (1992), para quem os objetivos e valores fundamentais
devem anteceder e orientar a formulação dos critérios, e não o contrário. Na tradição
construtivista do apoio à decisão, Roy (1996) reforça que um critério só adquire
legitimidade quando ancorado em um sistema de valores explicitado.

O **critério** traduz a premissa em uma regra de avaliação, delimitando com precisão o
aspecto do objeto que será apreciado. Roy (1996) estabelece que os critérios devem compor
uma *família coerente*, simultaneamente exaustiva — cobrindo os aspectos relevantes —,
coesa — consistente com as preferências globais — e não-redundante — sem dupla contagem.
Belton e Stewart (2002) associam essa disciplina à qualidade estrutural do modelo,
condição para que a avaliação seja defensável perante terceiros.

A **variável** confere ao critério uma forma observável, convertendo um juízo
qualitativo em uma grandeza mensurável e, portanto, contestável. Keeney e Raiffa (1976)
denominam *atributos* essas grandezas que operacionalizam objetivos e advertem que sua
escolha determina a validade do modelo: um atributo mal especificado mede algo distinto
daquilo que o critério pretende avaliar.

A **relação com o escopo** define o sentido dessa grandeza diante do objetivo — se
valores maiores são favoráveis ou desfavoráveis (direção de preferência) e se o critério
atua como barreira eliminatória ou como peso ponderável. Essa distinção corresponde à
diferença, formalizada por Munda (2008), entre agregação compensatória — em que um bom
desempenho compensa um mau — e não-compensatória — em que certos limiares não admitem
compensação —, separação essencial para tratar restrições absolutas sem diluí-las numa
média.

O **dado** fornece a evidência empírica que preenche a variável, ancorando o julgamento
em registros verificáveis em vez de impressões. A separação entre o registro primário e o
valor efetivamente utilizado — e a documentação do tratamento entre ambos — protege a
integridade da inferência e torna explícita a passagem do mundo empírico à sua
representação numérica, exigência central dos modelos formais de avaliação (Bouyssou et
al., 2006).

A **métrica** reduz valores de naturezas distintas a uma escala comum, tornando legítima
a comparação entre critérios e entre objetos. A teoria da mensuração (Krantz et al.,
1971) fundamenta essa operação: só há comparação válida quando as grandezas são mapeadas
para escalas cujas propriedades — ordinais, intervalares ou de razão — autorizam as
operações efetuadas sobre elas. A comensurabilidade, portanto, não é pressuposta, mas
construída sob condições explícitas.

O **ranking** é o ponto de chegada: a síntese ordenada em que todos esses juízos, já
comensurados e ponderados, se combinam para expressar a prioridade relativa de cada
objeto de demanda. A ponderação e a agregação seguem o Método de Análise Hierárquica
(Saaty, 1980), que deriva os pesos de comparações par a par e afere sua consistência —
assunto detalhado na Seção 9.

Desse arranjo decorrem dois movimentos complementares. Na **geração**, a cadeia é
percorrida do fundamento ao resultado, sob o comando da premissa. Na **auditoria**, o
percurso é inverso: a partir de qualquer posição no ranking, é possível cobrar cada elo
até a referência que o originou. É esse encadeamento — e não o peso da autoridade de quem
decide — que confere contundência e credibilidade aos resultados, aproximando o método do
critério de demarcação de Popper (1959), segundo o qual uma afirmação só é científica na
medida em que se expõe à refutação.

### 4.2 Instância e generalidade

A aplicação descrita nesta nota — voltada à logística e aos transportes — é uma
**instância** do protocolo, materializada em um conjunto de dimensões e critérios próprio
desse domínio (detalhado na Seção 10). A mesma estrutura de fundamentação pode ser
preenchida com outros critérios para hierarquizar objetos de demanda de qualquer área do
conhecimento, preservando fundamentação, comparabilidade e auditabilidade.

---

## 5. Fundamentação legal, normativa e metodológica

A metodologia apoia-se em referências técnicas internacionais consagradas e em marcos
legais brasileiros e estaduais aplicáveis:

- **Capacidade e tráfego:** *Highway Capacity Manual* (TRB, 2016); HDM-4 (Banco
  Mundial/PIARC); AASHTO *Green Book*; UK DfT WebTAG.
- **Análise financeira e custo-benefício:** US DOT *Benefit-Cost Analysis Guidance*;
  HM Treasury *Green Book* (2022); HEATCO (UE, 2006); *World Bank PPP Reference Guide* v3.
- **Acessibilidade e impacto social:** Geurs & van Wee (2004); iRAP *Star Ratings*;
  ITE *Trip Generation*.
- **Análise multicritério e multiator:** Saaty (AHP); Macharis & Bernardini (2015) — MAMCA.
- **Risco e viés de otimismo:** Flyvbjerg (2009); HM Treasury *Green Book*.
- **Marco legal ambiental e territorial:** Lei Estadual nº 13.798/2009 (PEMC); Lei
  nº 6.938/1981; Decreto nº 4.297/2002 (ZEE); Resolução CONAMA nº 237/1997; Lei
  nº 10.257/2001 (Estatuto da Cidade).
- **Marco legal de contratação e desapropriação:** Lei nº 14.133/2021;
  Decreto-Lei nº 3.365/1941; Convenção nº 169 da OIT.

> A estrutura formal desta nota técnica segue a prática consolidada de notas técnicas
> institucionais brasileiras (p. ex., IPEA e órgãos do Executivo Federal) e as
> orientações do Manual de Redação da Presidência da República, com identificação,
> objetivo, fundamentação, desenvolvimento metodológico, considerações e referências.

---

## 6. Definições e siglas

| Termo / sigla                                     | Definição                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SICARD**                                  | Sistema de Apoio à Tomada de Decisão.                                                                                                                                                                                                                                                                                                                  |
| **PLI-SP**                                  | Plano de Logística Integrada do Estado de São Paulo.                                                                                                                                                                                                                                                                                                   |
| **Objeto de demanda** (ou **objeto**) | Item submetido à hierarquização. Suas categorias são**plano**, **programa** e **projeto**. Ao longo deste documento, "objeto de demanda" designa qualquer uma dessas categorias; a palavra "projeto" isolada só denota a categoria específica quando contrastada com plano e programa.                                           |
| **Espinha dorsal**                          | Motor que consome produtos preparados pelos módulos de apoio e aplica as regras de triagem, hierarquização, ajuste e síntese. Não cria camadas nem indicadores.                                                                                                                                                                                     |
| **Restrição**                             | Ocorrência territorial com efeito**excludente ou segregador**; objetos de demanda que a intersectam são classificados como `restrito`.                                                                                                                                                                                                         |
| **Risco**                                   | Ocorrência territorial que**não exclui** o objeto de demanda, mas **gera ressalva** (`apto_com_ressalva`).                                                                                                                                                                                                                               |
| **Incidência factual**                     | Geometria oficialmente publicada/homologada de um critério; a Fase 1 não gera buffers ou faixas derivadas.                                                                                                                                                                                                                                             |
| **Operador Identity**                       | Overlay vetorial que particiona geometrias por sobreposição preservando os atributos de todas as camadas.                                                                                                                                                                                                                                              |
| **Favorabilidade territorial**              | Superfície raster contínua normalizada de 0 (menor) a 1 (maior favorabilidade).                                                                                                                                                                                                                                                                        |
| **Normalização (0–1)**                   | Reescalonamento de valores brutos para escala comparável:`(valor − mín)/(máx − mín)`.                                                                                                                                                                                                                                                            |
| **Inversão de critério negativo**         | Transformação`1 − valor_normalizado` para critérios em que valor maior é pior.                                                                                                                                                                                                                                                                    |
| **Álgebra de mapas**                       | Combinação de rasters normalizados por média ponderada dos pesos AHP.                                                                                                                                                                                                                                                                                 |
| **Completude**                              | Proporção de atributos válidos frente ao esperado, por objeto de demanda ou rodada.                                                                                                                                                                                                                                                                   |
| **Protocolo epistemológico**               | Estrutura invariante de fundamentação que todo critério percorre (premissa → critério → variável → relação com o escopo → dado → métrica → fonte). Constitui o núcleo metodológico permanente do sistema, ao passo que as dimensões e os critérios específicos constituem conteúdo temático, adaptável ao domínio de aplicação. |
| **AHP**                                     | *Analytic Hierarchy Process* — método de análise hierárquica para definição de pesos.                                                                                                                                                                                                                                                            |
| **MAMCA**                                   | *Multi-Actor Multi-Criteria Analysis* — análise multicritério multiator.                                                                                                                                                                                                                                                                            |
| **VDM**                                     | Volume Diário Médio de tráfego.                                                                                                                                                                                                                                                                                                                       |
| **NS / V/C**                                | Nível de Serviço / relação Volume-Capacidade.                                                                                                                                                                                                                                                                                                        |

### Classes de fator avaliativo

| Classe                                             | Definição                                                                                                           | Exemplos                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Grade** (`grade`)                        | Fator representável como superfície contínua em malha celular estadual.                                            | Empregos, produção, desigualdades regionais.                          |
| **Rede** (`rede`)                          | Fator calculado sobre segmentos, nós, corredores ou pares origem-destino.                                            | VDM, NS, congestionamento, acidentes, integração intermodal.          |
| **Atributo do objeto** (`atributo_objeto`) | Atributo intrínseco do objeto de demanda, sem rasterização. Não se confunde com a categoria de demanda "projeto". | Maturidade, prazo, custo, risco de execução.                          |
| **Híbrido** (`hibrido`)                   | Depende da combinação entre localização, rede e atributos do objeto de demanda.                                   | Competitividade, emissões, impacto ambiental, resiliência climática. |

### Relação de critério

| Relação             | Semântica           | Ação após normalização |
| --------------------- | -------------------- | --------------------------- |
| **↑ Positiva** | Valor maior = melhor | Usar o valor como está.    |
| **↓ Negativa** | Valor maior = pior   | Inverter:`1 − valor`.    |

---

## 7. Visão geral do sistema (espinha dorsal)

A **espinha dorsal** é a arquitetura conceitual que permite avaliar um conjunto grande
de objetos de demanda de forma automatizada, configurável e auditável. Ela **não cria** as
camadas ou os indicadores: consome produtos previamente preparados pelos módulos de
apoio (camadas consolidadas, superfícies de favorabilidade e tabelas de atributos) e
aplica as regras de triagem, hierarquização, ajuste e síntese.

O sistema é articulado em três fases **independentes e combináveis**. O usuário pode
executar qualquer combinação (somente F1; somente F2; somente F3; F1+F2; F1+F3; F2+F3;
F1+F2+F3). Quando mais de uma fase é executada, o sistema produz uma **síntese** com
pesos configuráveis e regras explícitas, sem apagar a leitura individual de cada fase.

---

## 8. Arquitetura metodológica em fases

### 8.1 Fase 1 — Triagem de restrição e risco

**Função.** Classificar a **elegibilidade territorial preliminar**; a Fase 1 **não
ranqueia** objetos de demanda. Ela cruza a geometria de cada objeto de demanda com
camadas consolidadas de restrição e de risco.

**Regra de classificação:**

```text
se o objeto de demanda intersecta camada de restrição:
    status_fase1 = restrito           # sai do ranking ordinário, salvo exceção explícita
senão, se intersecta camada de risco:
    status_fase1 = apto_com_ressalva  # segue; riscos registrados para a Fase 3
senão:
    status_fase1 = apto               # segue normalmente
```

- Restrição tem função **excludente/segregadora**; risco **não exclui**, apenas gera
  ressalva. A avaliação quantitativa do risco pertence à Fase 3.

**Produção das camadas consolidadas.** O módulo transforma múltiplas camadas vetoriais
oficiais/homologadas em **duas camadas consolidadas** (restrição e risco), usando o
operador **Identity** (ou overlay equivalente), que particiona as geometrias por
sobreposição preservando os atributos de origem.

**Fluxo de processamento:**

```text
Fontes vetoriais → Importação → Validação bruta → Normalização →
Correção geométrica/topológica → Classificação restrição/risco →
Identity das restrições → Identity dos riscos → Validação final →
Homologação → Publicação na biblioteca de camadas
```

**Princípio das incidências factuais.** A Fase 1 classifica apenas a **geometria
oficial publicada** de cada critério; ela **não materializa** zonas de amortecimento,
entornos ou faixas derivadas por buffer.

**Campos de controle padronizados:** `fonte_id`, `feicao_origem_id`, `criterio_id`,
`criterio_nome`, `tipo_tratamento`, `severidade`, `base_legal_ou_tecnica`,
`fonte_nome`, `data_referencia_dado`, `metodo_obtencao`.

**Saídas mínimas:** `status_fase1`, `restricoes_intersectadas`,
`riscos_intersectados`, `alertas_fase1`, `geometria_ou_area_afetada`,
`criterios_fase3_sugeridos`.

### 8.2 Fase 2 — Hierarquização por favorabilidade territorial

**Função.** Núcleo do **ranking técnico-territorial**. Consome uma ou mais superfícies
de favorabilidade e cruza-as com a geometria dos objetos de demanda, extraindo um valor
por objeto de demanda.

**Métodos de extração espacial:** extração pontual (projeto-ponto); média zonal
(polígono/linha/buffer); mediana, máximo, mínimo ou percentis quando justificável;
estatística por trecho, corredor ou área de influência (análise de rede).

**Construção da superfície de favorabilidade:**

```text
Camadas de entrada → Validação/compatibilização →
Operador espacial por critério → Raster contínuo por critério →
Reescalonamento 0–1 → Inversão de critérios negativos →
Aplicação dos pesos AHP → Média ponderada →
Raster final de favorabilidade → Homologação → Publicação
```

**Operadores espaciais por critério** (declarados individualmente): distância
euclidiana; distância ponderada; custo acumulado; densidade de kernel; densidade
simples; interpolação; agregação por unidade territorial; rasterização de atributo;
booleano de presença/ausência; estatística zonal; acessibilidade em rede; operador
customizado homologado.

**Reescalonamento 0–1:** `valor_normalizado = (valor − mín)/(máx − mín)`, com suporte a
winsorização, quebras naturais, curva fuzzy, limite saturado e normalização por meta.

**Inversão de critérios negativos:** `valor_favorabilidade = 1 − valor_normalizado`.

**Álgebra de mapas (média ponderada):**

```text
favorabilidade = Σ (raster_criterio_i × peso_i),  com  Σ pesos = 1
0 = menor favorabilidade territorial   |   1 = maior favorabilidade territorial
```

**Tratamento de NoData (regra recomendada):** NoData em critério **obrigatório**
bloqueia a homologação; NoData em critério **opcional** recalcula pesos locais ou
aplica regra homologada.

**Decomposição por dimensão:** o módulo pode gerar rasters por critério, por dimensão
e o consolidado final, permitindo explicar a contribuição de cada dimensão.

**Saídas mínimas:** `score_fase2` (0–1), `ranking_fase2`, `valor_por_dimensao`,
`valor_por_criterio`, `metodo_extracao`, `geometria_usada_na_extracao`.

### 8.3 Fase 3 — Ajuste por atributos do objeto de demanda

**Função.** **Opcional.** Incorpora informações que pertencem ao **próprio objeto de
demanda, à carteira, à governança ou à viabilidade de execução**, sem duplicar critérios
já avaliados na Fase 2. É também onde os **riscos herdados da Fase 1** podem ser
avaliados quantitativamente.

**Entrada:** arquivo tabular (CSV, XLSX, XLS, Parquet ou tabela do banco), uma linha
por objeto de demanda, uma coluna por atributo.

**Cálculo do escore:**

```text
score_fase3 = Σ (valor_atributo_normalizado × peso_atributo)
0 = pior ajuste por atributos   |   1 = melhor ajuste por atributos
```

**Normalização por tipo de atributo:** numérico (maior/menor melhor), booleano
(positivo/negativo) e ordinal/categórico com dicionário explícito (ex.: maturidade de
`ideia`=0,20 a `projeto_executivo`=1,00).

**Configuração de pesos:** modo **normalizado** (padrão, soma 1) ou **livre** (avançado,
score normalizado pela soma dos pesos ativos para evitar inflação artificial).

**Tratamento de ausentes:** atributo obrigatório ausente bloqueia a Fase 3 para o
objeto de demanda; opcional ausente é ignorado e os pesos locais são renormalizados
(registrado no relatório).

**Completude mínima:** `completude_projeto = atributos_validos / atributos_esperados`;
a Fase 3 só compõe o resultado se atingir o limite configurável (ex.: 60%).

**Saídas mínimas:** `score_fase3` (0–1), `ranking_fase3`, `atributos_utilizados`,
`atributos_ausentes`, `atributos_invalidos`, `grau_completude_fase3`, `pesos_fase3`,
`contribuicao_por_criterio`.

### 8.4 Síntese das fases

Quando mais de uma fase é executada, o sistema preserva as saídas separadas e,
opcionalmente, produz uma saída sintética — **sem apagar** a leitura por fase.

**Tratamento da Fase 1 (prioritariamente filtro):**

```text
restrito           → sai do ranking ordinário ou vai para bloco separado
apto_com_ressalva  → permanece; riscos enviados à Fase 3 (se executada)
apto               → permanece sem ressalva territorial
```

Forçar a inclusão de objetos de demanda restritos exige registro de **exceção metodológica**.

**Composição ponderada (Fases 2 e 3):**

```text
score_final = peso_fase2 × score_fase2 + peso_fase3 × score_fase3
com  peso_fase2 + peso_fase3 = 1
```

Alternativamente, ajuste limitado com teto e piso:
`score_final = score_fase2 + ajuste_fase3`, impedindo que atributos secundários
desfaçam o ranking técnico-territorial.

---

## 9. Método multicritério AHP

O sistema utiliza o **Método de Análise Hierárquica (AHP)** para determinar os pesos
dos critérios da Fase 2 (favorabilidade) e da Fase 3 (atributos). O AHP transforma
julgamentos qualitativos em valores numéricos comparáveis, com **consistência lógica**
e **rastreabilidade**.

**Regras mínimas dos pesos:**

- todo critério processado possui peso associado;
- os pesos são normalizados e somam 1 (salvo tolerância numérica);
- a matriz AHP e a **razão de consistência** são registradas;
- critério sem raster válido bloqueia a homologação ou recalcula pesos por regra
  explícita.

---

## 10. Matriz de critérios e premissas

A matriz de critérios e premissas é a **instância** do protocolo descrito na Seção 4,
aplicada ao domínio de logística e transportes: organiza **9 dimensões** e **55
critérios**, cada um construído segundo a mesma cadeia de fundamentação. As dimensões e
os critérios a seguir constituem o conteúdo temático desta aplicação; a estrutura que os
sustenta é invariante e transferível a outros domínios do conhecimento.

### Componentes do registro de cada critério

No plano metodológico, cada critério da matriz é uma unidade documentada de julgamento,
descrita por um conjunto fixo de componentes — a materialização operacional da cadeia de
fundamentação apresentada na Seção 4:

- **Código** — identificador hierárquico único que situa o critério na estrutura da
  análise e assegura referência inequívoca e rastreabilidade.
- **Etapa** e **subetapa** — localizam o critério no fluxo metodológico e determinam seu
  papel lógico: filtro eliminatório (não-compensatório) ou ponderação (compensatória).
- **Dimensão** — agrupa o critério por natureza temática, delimitando o escopo, evitando
  dupla contagem e sustentando a decomposição dos resultados por eixo de análise.
- **Premissa** — proposição teórica ou normativa, ancorada em referência, que fundamenta
  o critério e constitui a origem da cadeia.
- **Critério** — regra avaliativa derivada da premissa, que define o que será apreciado
  como mais ou menos favorável.
- **Variável** — grandeza observável que operacionaliza o critério.
- **Relação com o escopo** — sentido com que a variável afeta o objetivo: direção
  (positiva ou negativa) e caráter (mandatório ou compensatório).
- **Dado-fonte** e **dado derivado** — o registro empírico primário, tal como publicado
  pela origem oficial, e o valor processado que efetivamente alimenta a variável; a
  distinção documenta o tratamento aplicado.
- **Unidade de medida / métrica** — escala que torna o valor comparável entre critérios e
  entre objetos de demanda.
- **Fonte** — autoridade ou referência que autentica a premissa e o dado.
- **Observações** — registram limitações, decisões de método, ressalvas e exceções.

Cada critério declara ainda sua **classe** (grade, rede, `atributo_objeto` ou híbrido) e
sua **relação** (↑ positiva / ↓ negativa), conforme sintetizado nas tabelas por dimensão.

### 10.1 Técnica (7 critérios)

*Referências: HCM (TRB, 2016); HDM-4; AASHTO Green Book; UK DfT WebTAG.*

| # | Critério                                        | Classe             | Relação |
| - | ------------------------------------------------ | ------------------ | --------- |
| 1 | VDM — Volume Diário Médio                     | Rede               | ↑        |
| 2 | Nível de Serviço (NS) / Saturação            | Rede               | ↓        |
| 3 | Congestionamento real ("tempo lento")            | Rede               | ↓        |
| 4 | Estado de conservação do pavimento             | Rede               | ↓        |
| 5 | Deficiência geométrica (rampas, alças, raios) | Rede               | ↓        |
| 6 | Prontidão / maturidade do objeto de demanda     | Atributo do objeto | ↑        |
| 7 | Tráfego sazonal (fins de semana e feriados)     | Rede               | ↓        |

### 10.2 Financeira (6 critérios)

*Referências: US DOT BCA; HM Treasury Green Book (2022); HEATCO; World Bank PPP Guide v3.*

| # | Critério                                         | Classe             | Relação |
| - | ------------------------------------------------- | ------------------ | --------- |
| 1 | Capex (custo de investimento)                     | Atributo do objeto | ↓        |
| 2 | Opex (operação e manutenção)                  | Atributo do objeto | ↓        |
| 3 | Relação Benefício/Custo                        | Atributo do objeto | ↑        |
| 4 | Potencial de financiamento privado / concessão   | Atributo do objeto | ↑        |
| 5 | Custos logísticos diferenciados (porto/corredor) | Híbrido           | ↓        |
| 6 | Benefício social na priorização                | Atributo do objeto | ↑        |

### 10.3 Econômica (8 critérios)

*Referências: UK DfT WebTAG (wider economic impacts); HEATCO; Macharis & Bernardini (2015).*

| # | Critério                                                      | Classe   | Relação |
| - | -------------------------------------------------------------- | -------- | --------- |
| 1 | Empregos e produção envolvidos                               | Grade    | ↑        |
| 2 | Competitividade da produção paulista                         | Híbrido | ↑        |
| 3 | Redução de tempos de viagem                                  | Rede     | ↓        |
| 4 | Indução de produção e emprego regional                     | Híbrido | ↑        |
| 5 | Atendimento a cargas sem alternativa eficiente                 | Híbrido | ↑        |
| 6 | Suporte a cadeias estratégicas (Pré-Sal, agro, sucroenergia) | Híbrido | ↑        |
| 7 | Participação da hidrovia na matriz de transporte             | Rede     | ↑        |
| 8 | Desenvolvimento ferroviário estadual                          | Rede     | ↑        |

### 10.4 Social (6 critérios)

*Referências: Geurs & van Wee (2004); UK DfT WebTAG (Social & Distributional Impacts).*

| # | Critério                                           | Classe   | Relação | Mandatório   |
| - | --------------------------------------------------- | -------- | --------- | ------------- |
| 1 | Redução de desigualdades regionais                | Grade    | ↑        | **Sim** |
| 2 | População beneficiada                             | Híbrido | ↑        | Não          |
| 3 | Equidade no acesso ao transporte                    | Híbrido | ↑        | Não          |
| 4 | Acesso a serviços essenciais (saúde e educação) | Híbrido | ↑        | Não          |
| 5 | Acessibilidade a polos (portos e aeroportos)        | Rede     | ↑        | Não          |
| 6 | Atendimento a comunidades isoladas                  | Híbrido | ↑        | Não          |

### 10.5 Segurança (4 critérios)

*Referências: iRAP Star Ratings; UK DfT WebTAG (accidents); PNATRANS.*

| # | Critério                                          | Classe   | Relação |
| - | -------------------------------------------------- | -------- | --------- |
| 1 | Acidentes com vítimas (gravidade)                 | Rede     | ↓        |
| 2 | Acidentes com usuários vulneráveis               | Rede     | ↓        |
| 3 | Transporte de cargas perigosas                     | Híbrido | ↓        |
| 4 | Concentração de pontos críticos ("black spots") | Rede     | ↓        |

### 10.6 Ambiental (6 critérios)

*Referências: Lei 13.798/2009 (PEMC); GHG Protocol; IPCC; Lei 6.938/1981; Decreto 4.297/2002; CONAMA 237/1997.*

| # | Critério                                     | Classe             | Relação | Mandatório   |
| - | --------------------------------------------- | ------------------ | --------- | ------------- |
| 1 | Redução de emissões de GEE                 | Híbrido           | ↓        | **Sim** |
| 2 | Redução de poluentes locais                 | Híbrido           | ↓        | Não          |
| 3 | Eficiência energética                       | Híbrido           | ↑        | Não          |
| 4 | Otimização da matriz modal                  | Híbrido           | ↑        | Não          |
| 5 | Impacto sobre áreas sensíveis ou protegidas | Híbrido           | ↓        | **Sim** |
| 6 | Complexidade do licenciamento ambiental       | Atributo do objeto | ↓        | Não          |

### 10.7 Territorial (6 critérios)

*Referências: Lei 10.257/2001 (Estatuto da Cidade); HCM (TRB); ITE Trip Generation; Macharis & Bernardini (2015).*

| # | Critério                                      | Classe   | Relação |
| - | ---------------------------------------------- | -------- | --------- |
| 1 | Conflito com o tráfego urbano e conurbações | Rede     | ↓        |
| 2 | Conflito com o tráfego urbano portuário      | Rede     | ↓        |
| 3 | Integração intermodal                        | Rede     | ↑        |
| 4 | Conexão inter-regional e vazios logísticos   | Híbrido | ↑        |
| 5 | Aderência aos planos diretores municipais     | Híbrido | ↑        |
| 6 | Polos atratores e geradores de tráfego        | Híbrido | ↑        |

### 10.8 Institucional (6 critérios)

*Referências: Macharis & Bernardini (2015) — MAMCA; HM Treasury Green Book (stage-gate); Lei 14.133/2021.*

| # | Critério                                  | Classe             | Relação | Mandatório   |
| - | ------------------------------------------ | ------------------ | --------- | ------------- |
| 1 | Nível de complexidade                     | Atributo do objeto | ↓        | **Sim** |
| 2 | Prazo para implantação                   | Atributo do objeto | ↓        | **Sim** |
| 3 | Pendências jurídicas e jurisdicionais    | Atributo do objeto | ↓        | **Sim** |
| 4 | Alinhamento a planos (PPA, PEF, PAN, PNLT) | Atributo do objeto | ↑        | Não          |
| 5 | Consenso e apoio institucional dos atores  | Atributo do objeto | ↑        | Não          |
| 6 | Demanda social e contribuições recebidas | Atributo do objeto | ↑        | Não          |

### 10.9 Risco (6 critérios)

*Referências: Flyvbjerg (2009); HM Treasury Green Book (optimism bias); World Bank ESF (2017); Convenção 169 OIT; Decreto-Lei 3.365/1941.*

| # | Critério                                           | Classe             | Relação |
| - | --------------------------------------------------- | ------------------ | --------- |
| 1 | Resiliência climática (Blue Spot)                 | Híbrido           | ↑        |
| 2 | Risco de demanda (incerteza de projeção)          | Atributo do objeto | ↓        |
| 3 | Risco de execução (atrasos e sobrecustos)         | Atributo do objeto | ↓        |
| 4 | Risco de desapropriação e interferências         | Atributo do objeto | ↓        |
| 5 | Dependência de pré-requisitos (interdependência) | Atributo do objeto | ↓        |
| 6 | Risco socioambiental (comunidades tradicionais)     | Híbrido           | ↓        |

### 10.10 Estratégia híbrida de operacionalização

O ranqueamento final **não** se baseia em uma única grade estadual. O desenho
tecnicamente coerente é:

1. construir uma **grade** de favorabilidade apenas para fatores locacionais/territoriais;
2. construir **indicadores de rede** para acessibilidade, saturação, segurança e conectividade;
3. manter **atributos do objeto de demanda e de risco** fora da grade;
4. **agregar tudo no nível do objeto de demanda** antes da ponderação multicritério.

Assim, a grade é uma camada estruturante do modelo, mas não substitui a análise de rede
nem os atributos intrínsecos dos objetos de demanda.

---

## 11. Fluxo de dados ponta a ponta

```text
ENTRADA: Objeto de demanda (geometria + atributos)
│
├─ FASE 1 — Triagem de restrição e risco
│   entrada: camadas consolidadas de restrição e risco
│   processo: interseção objeto de demanda × camadas
│   saída: status_fase1 (apto | apto_com_ressalva | restrito)
│
├─ FASE 2 — Hierarquização por favorabilidade
│   entrada: raster final de favorabilidade territorial
│   processo: extração espacial (ponto, média zonal, corredor, ...)
│   saída: score_fase2, ranking_fase2, decomposição por dimensão
│
├─ FASE 3 — Ajuste por atributos
│   entrada: tabela de atributos do objeto de demanda
│   processo: normalização e ponderação de atributos
│   saída: score_fase3, ranking_fase3, contribuição por critério
│
└─ SÍNTESE
    entrada: saídas das fases executadas
    processo: pesos entre fases + filtros de elegibilidade
    saída: score_final, ranking_final, trilha de auditoria
```

**Contrato mínimo por objeto de demanda:** identificador único; nome/descrição; tipo
(se disponível); geometria (ponto/linha/polígono ou localização suficiente para buffer);
fases a executar; atributos de Fase 3 (se aplicável).

**Contrato mínimo de saída (auditável):** por fase, situação, escore e posição; síntese
com `score_final` e `posicao_final`.

**Configurabilidade por rodada:** fases a executar; conjunto de objetos de demanda;
camadas de restrição/risco; superfície de favorabilidade; método de extração; critérios
e pesos da Fase 3; pesos entre fases; regra para objetos de demanda restritos;
completude mínima.

---

## 12. Auditoria, versionamento e homologação

**Auditoria e transparência.** Todo ranking deve ser explicável. Para cada objeto de
demanda, o sistema responde: por que foi apto/apto com ressalva/restrito; quais camadas
intersectaram; qual valor espacial foi extraído na Fase 2; quais atributos foram usados
e quais faltaram na Fase 3; quais pesos foram aplicados; quanto cada fase contribuiu; e
se houve exceção metodológica.

**Versionamento.** Pacotes recebem identificador reprodutível, no padrão
`fase<n>_<produto>_<area>_<data>_v<numero>` (ex.: `fase1_restricao_risco_sp_2026_07_02_v1`),
com metadados de versão (`pacote_id`, `versao`, `data_criacao`, `data_homologacao`,
`responsavel_tecnico`, `status`, `hash_ou_assinatura_dos_insumos`, `observacoes`).

**Homologação.** Somente pacotes homologados aparecem na biblioteca de camadas. A
homologação registra: fontes utilizadas; camadas importadas/aprovadas/reprovadas;
critérios cobertos e ausentes; erros corrigidos e remanescentes; áreas de restrição e
risco; mapa de pré-visualização; amostra de atributos; aprovador e data.

---

## 13. Produtos e entregáveis

- **Pacote Fase 1:** camadas consolidadas de restrição e risco + relatório + metadados.
- **Pacote Fase 2:** raster final de favorabilidade + rasters por critério e por
  dimensão + pesos AHP + regras de normalização + relatório + metadados.
- **Pacote Fase 3:** tabela de escores por objeto de demanda + pesos + contribuição por
  critério + relatório de completude.
- **Resultado de rodada:** rankings por fase e ranking final sintético, com trilha de
  auditoria por objeto de demanda.

---

## 14. Considerações finais

A metodologia descrita provê um arcabouço **transparente, reprodutível e auditável**
para a hierarquização de demandas de infraestrutura, conciliando análise geoespacial e
análise multicritério. A modularidade em fases permite adequar a profundidade da
análise à disponibilidade de dados, e o versionamento garante a reprodutibilidade de
rankings mesmo diante da atualização das fontes.

Itens em aberto e melhorias metodológicas em curso serão incorporados nas próximas
versões desta nota técnica, conforme o *Histórico de Revisões*.

---

## 15. Referências

- AASHTO. *A Policy on Geometric Design of Highways and Streets (Green Book)*.
- BELTON, V.; STEWART, T. J. *Multiple Criteria Decision Analysis: An Integrated
  Approach*. Boston: Kluwer Academic Publishers, 2002.
- BOUYSSOU, D.; MARCHANT, T.; PIRLOT, M.; TSOUKIÀS, A.; VINCKE, P. *Evaluation and
  Decision Models with Multiple Criteria: Stepping Stones for the Analyst*. New York:
  Springer, 2006.
- BRASIL. Decreto-Lei nº 3.365, de 21 de junho de 1941 (desapropriações).
- BRASIL. Lei nº 6.938, de 31 de agosto de 1981 (Política Nacional do Meio Ambiente).
- BRASIL. Decreto nº 4.297, de 10 de julho de 2002 (Zoneamento Ecológico-Econômico).
- BRASIL. Lei nº 10.257, de 10 de julho de 2001 (Estatuto da Cidade).
- BRASIL. Lei nº 14.133, de 1º de abril de 2021 (Licitações e Contratos).
- CONAMA. Resolução nº 237, de 19 de dezembro de 1997 (licenciamento ambiental).
- FLYVBJERG, B. Survival of the unfittest: why the worst infrastructure gets built.
  *Oxford Review of Economic Policy*, 25(3):344-367, 2009.
- GEURS, K. T.; VAN WEE, B. Accessibility evaluation of land-use and transport
  strategies. *Journal of Transport Geography*, 12:127-140, 2004.
- HM TREASURY. *The Green Book: Central Government Guidance on Appraisal and
  Evaluation*, 2022.
- iRAP. *Star Ratings — Road Assessment Programme*.
- ITE. *Trip Generation Manual*. Institute of Transportation Engineers.
- KEENEY, R. L. *Value-Focused Thinking: A Path to Creative Decisionmaking*. Cambridge,
  MA: Harvard University Press, 1992.
- KEENEY, R. L.; RAIFFA, H. *Decisions with Multiple Objectives: Preferences and Value
  Tradeoffs*. New York: John Wiley & Sons, 1976.
- KRANTZ, D. H.; LUCE, R. D.; SUPPES, P.; TVERSKY, A. *Foundations of Measurement,
  Vol. 1: Additive and Polynomial Representations*. New York: Academic Press, 1971.
- MACHARIS, C.; BERNARDINI, A. Reviewing the use of MCDA for transport project
  evaluation. *Transport Policy*, 37:177-186, 2015.
- MUNDA, G. *Social Multi-Criteria Evaluation for a Sustainable Economy*. Berlin:
  Springer, 2008.
- POPPER, K. R. *The Logic of Scientific Discovery*. London: Hutchinson, 1959.
- ROY, B. *Multicriteria Methodology for Decision Aiding*. Dordrecht: Kluwer Academic
  Publishers, 1996.
- SAATY, T. L. *The Analytic Hierarchy Process*. New York: McGraw-Hill, 1980.
- SÃO PAULO (Estado). Lei nº 13.798, de 9 de novembro de 2009 (Política Estadual de
  Mudanças Climáticas).
- TRB. *Highway Capacity Manual (HCM)*. Transportation Research Board, 2016.
- UK DfT. *Transport Analysis Guidance (WebTAG)*. UK Department for Transport.
- US DOT. *Benefit-Cost Analysis Guidance for Discretionary Grant Programs*.
- WORLD BANK. *Public-Private Partnerships Reference Guide*, v3.
- WORLD BANK. *Environmental and Social Framework (ESF)*, 2017.
- WORLD BANK / PIARC. *HDM-4 — Highway Development and Management Model*.

---

*Fontes internas da metodologia: `documentacao/hierarquizacao/` (ESPINHA_DORSAL,
MODELO_HIERARQUIZACAO_ESPACIAL, MODULO_FASE1/2/3) e `data/matriz-criterios-premissas.json`.*
