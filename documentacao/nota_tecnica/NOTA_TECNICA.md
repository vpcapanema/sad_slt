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
| **Versão**                 | 1.9                                                                                                                                                                      |
| **Data de emissão**        | 14/08/2026                                                                                                                                                               |
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
| 1.6     | 10/08/2026 | `[preencher]` | Registro da operacionalização do reescalonamento vetorial da Fase 2: normalização min–max, densidades de segurança por quilômetro, proporções territoriais, inversão dos atributos de relação negativa, preservação de NoData e limitação da composição final à disponibilidade de pesos AHP homologados. |
| 1.7     | 10/08/2026 | `[preencher]` | Vinculação dos produtos reescalonados aos critérios explícitos da matriz v3, consolidação prévia dos indicadores pertencentes ao mesmo critério e geração de superfícies não ponderadas de grade e rede por média simples dos critérios calculáveis. |
| 1.8     | 13/08/2026 | `[preencher]` | Revisão metodológica da matriz v3 (50 critérios em 11 dimensões): adoção do modelo de enquadramento em duas classes (risco e restrição, sem gradações); unificação dos critérios de cavidade natural subterrânea; alinhamento de métricas, unidades, operadores e fontes de dado às variáveis implementadas; padronização da coluna Relação. Separação das camadas de Unidades de Conservação por esfera (estadual e federal) e exclusão da vegetação nativa do rol de critérios da Fase 1. Atualização da camada de sítios arqueológicos com a base integral do IPHAN. Ampliação da cobertura do critério de lentidão recorrente por imputação hierárquica e normalização por percentil dos atributos de tráfego. |
| 1.9     | 14/08/2026 | `[preencher]` | Formalização do preenchimento colaborativo da matriz de comparação pareada do AHP: coleta de julgamentos individuais de especialistas convidados, com exigência de razão de consistência inferior a 0,10 por resposta, e consolidação do julgamento do grupo por média geométrica elemento a elemento das matrizes individuais (agregação de julgamentos individuais — AIJ), com registro da matriz consolidada, dos pesos resultantes e dos indicadores de consistência. |

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
sistema: o conjunto de 11 dimensões e 50 critérios aqui adotado é a instância aplicada à
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

**Operacionalização vetorial dos insumos vigentes.** Enquanto as superfícies raster
finais e os pesos AHP não estão homologados, os valores disponíveis são preservados nas
unidades espaciais de origem — setor censitário para a grade e subtrecho para a rede —
e reescalonados pelo método linear min–max. Na rede, as contagens de segurança são
convertidas em densidades por quilômetro; extensões urbanas, em proporções do subtrecho;
e distâncias de acessibilidade, após reescalonadas, são invertidas. Os atributos de
tráfego observado (atraso, razão de tempos e velocidade corrente) recebem tratamento
próprio: os segmentos sem retorno da fonte de tráfego são preenchidos por imputação
hierárquica — mediana da taxa por quilômetro na mesma rodovia, em seguida no mesmo
tipo de rodovia e, por fim, mediana global — com marcação explícita das feições
imputadas; e o reescalonamento desses atributos é feito por percentil (posto ordenado),
robusto à distribuição de cauda pesada dos tempos de atraso. Cada campo de
critério é vinculado nominalmente à etapa "Favorabilidade territorial em grade e da
rede" da
matriz v3. Indicadores alternativos do mesmo critério são consolidados antes da síntese,
de modo que a quantidade de colunas de origem não altere seu peso. Na grade, a massa
econômica é representada pelo PIB setorial e a vulnerabilidade pelo PIB per capita
invertido; os demais indicadores permanecem auxiliares. Os valores ausentes permanecem
como NoData.

Para análise do cenário sem pesos AHP, são produzidas duas superfícies vetoriais
identificadas como **média simples**. A superfície de grade combina seus dois critérios;
a superfície de rede combina os 14 critérios calculáveis, mantendo pavimento e
sobrecarga sazonal como lacunas. Em cada unidade espacial, a média é calculada sobre os
critérios válidos e o denominador é registrado em `n_criterios`. Esses produtos são
cenários não ponderados e não constituem superfícies homologadas; a composição oficial
permanece dependente dos pesos AHP e da regra de NoData homologados.

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

### Preenchimento colaborativo e consolidação de julgamentos

A matriz de comparação pareada pode ser preenchida de forma **individual** ou
**colaborativa**. No modo colaborativo, o responsável pela análise abre um ambiente de
preenchimento com prazo definido e lista nominal de especialistas convidados,
identificados por endereço eletrônico. Cada convidado registra sua própria matriz de
comparação, e o sistema somente aceita respostas cuja **razão de consistência (RC)**
seja inferior a 0,10, garantindo a consistência lógica de cada julgamento individual.

Os julgamentos individuais são consolidados pelo método de **agregação de julgamentos
individuais (AIJ)**: cada elemento da matriz consolidada é a **média geométrica** dos
elementos correspondentes das matrizes individuais aceitas. A média geométrica é o
único operador de agregação que preserva a propriedade recíproca da matriz pareada
(Aczél; Saaty, 1983), assegurando que a matriz do grupo permaneça uma matriz AHP
válida. Sobre a matriz consolidada calculam-se os pesos e os indicadores de
consistência (λ_max, IC, IA e RC), registrados com a matriz, o número de respostas
agregadas e a data da consolidação, para fins de auditoria e rastreabilidade.

---

## 10. Matriz de critérios e premissas

A matriz de critérios e premissas é a **instância** do protocolo descrito na Seção 4,
aplicada ao domínio de logística e transportes: organiza **11 dimensões** e **50
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

Cada critério declara ainda sua **fase** (Fase 1 — triagem; Fase 2 — favorabilidade;
Fase 3 — atributos), sua **classificação** (restrição ou risco, na Fase 1; grade ou
rede, na Fase 2; estático ou dinâmico, na Fase 3) e sua **relação** (↑ positiva /
↓ negativa), conforme sintetizado nas tabelas por dimensão.

### 10.1 Ambiental (8 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Sobreposição com Unidade de Conservação de Proteção Integral estadual | Fase 1 | Restrição | ↓ Negativa | **Sim** |
| 2 | Sobreposição com Unidade de Conservação de Proteção Integral federal | Fase 1 | Restrição | ↓ Negativa | **Sim** |
| 3 | Sobreposição com Unidade de Conservação de Uso Sustentável estadual | Fase 1 | Risco | ↓ Negativa | **Sim** |
| 4 | Sobreposição com Unidade de Conservação de Uso Sustentável federal | Fase 1 | Risco | ↓ Negativa | **Sim** |
| 5 | Sobreposição com Área de Proteção e Recuperação de Mananciais | Fase 1 | Risco | ↓ Negativa | **Sim** |
| 6 | Sobreposição com manguezal, restinga ou ecossistema costeiro sensível | Fase 1 | Restrição | ↓ Negativa | **Sim** |
| 7 | Sobreposição com cavidade natural subterrânea ou respectiva área de influência | Fase 1 | Risco | ↓ Negativa | **Sim** |
| 8 | Sobreposição com área contaminada ou com passivo ambiental cadastrado | Fase 1 | Risco | ↓ Negativa | Não |

### 10.2 Social (4 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Sobreposição com Terra Indígena | Fase 1 | Restrição | ↓ Negativa | **Sim** |
| 2 | Sobreposição com território quilombola | Fase 1 | Restrição | ↓ Negativa | **Sim** |
| 3 | Localização em áreas de maior vulnerabilidade territorial | Fase 2 | Grade | ↑ Positiva | **Sim** |
| 4 | Maior acessibilidade funcional a polos logísticos estratégicos | Fase 2 | Rede | ↑ Positiva | Não |

### 10.3 Risco (6 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Sobreposição com área suscetível a inundação, enxurrada ou alagamento | Fase 1 | Risco | ↓ Negativa | Não |
| 2 | Sobreposição com área suscetível a escorregamento, erosão ou movimento de massa | Fase 1 | Risco | ↓ Negativa | Não |
| 3 | Menor incerteza quanto à projeção de demanda futura | Fase 3 | Dinâmico | ↓ Negativa | Não |
| 4 | Menor risco de atraso e sobrecusto na implantação | Fase 3 | Dinâmico | ↓ Negativa | Não |
| 5 | Menor carga de desapropriações e interferências físicas | Fase 3 | Dinâmico | ↓ Negativa | Não |
| 6 | Menor dependência de demandas predecessoras ou de entregas externas | Fase 3 | Dinâmico | ↓ Negativa | Não |

### 10.4 Territorial (6 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Sobreposição com bem tombado ou área envoltória de proteção | Fase 1 | Risco | ↓ Negativa | **Sim** |
| 2 | Sobreposição com sítio arqueológico cadastrado ou área de interesse arqueológico | Fase 1 | Risco | ↓ Negativa | **Sim** |
| 3 | Proximidade com segmentos de alto conflito urbano-regional | Fase 2 | Rede | ↑ Positiva | Não |
| 4 | Proximidade com segmentos de alta interferência urbano-portuária | Fase 2 | Rede | ↑ Positiva | Não |
| 5 | Maior acessibilidade funcional a nós intermodais estratégicos | Fase 2 | Rede | ↑ Positiva | Não |
| 6 | Maior compatibilidade territorial e urbanística com o planejamento local | Fase 3 | Dinâmico | ↑ Positiva | Não |

### 10.5 Fundiário-patrimonial (1 critério)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Sobreposição com assentamento rural ou área sob regime fundiário especial | Fase 1 | Risco | ↓ Negativa | Não |

### 10.6 Jurídico-institucional (3 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Sobreposição com área sob embargo ambiental federal ativo | Fase 1 | Restrição | ↓ Negativa | **Sim** |
| 2 | Sobreposição com área sob embargo ambiental estadual ativo | Fase 1 | Restrição | ↓ Negativa | **Sim** |
| 3 | Sobreposição com área de restrição cadastrada pela CETESB | Fase 1 | Restrição | ↓ Negativa | **Sim** |

### 10.7 Técnica (5 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Proximidade com segmentos rodoviários de VDM alto | Fase 2 | Rede | ↑ Positiva | Não |
| 2 | Proximidade com segmentos de saturação elevada | Fase 2 | Rede | ↑ Positiva | Não |
| 3 | Proximidade com segmentos de lentidão recorrente | Fase 2 | Rede | ↑ Positiva | Não |
| 4 | Proximidade com segmentos de geometria deficiente | Fase 2 | Rede | ↑ Positiva | Não |
| 5 | Maior prontidão para implantação | Fase 3 | Estático | ↑ Positiva | Não |

### 10.8 Financeiro (5 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Menor custo de investimento por benefício esperado | Fase 3 | Estático | ↓ Negativa | Não |
| 2 | Menor custo operacional ao longo da vida útil | Fase 3 | Dinâmico | ↓ Negativa | Não |
| 3 | Maior retorno econômico por unidade investida | Fase 3 | Dinâmico | ↑ Positiva | Não |
| 4 | Maior atratividade para financiamento privado | Fase 3 | Dinâmico | ↑ Positiva | Não |
| 5 | Maior benefício social líquido do empreendimento | Fase 3 | Dinâmico | ↑ Positiva | Não |

### 10.9 Econômica (4 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Localização em áreas de alta massa econômica | Fase 2 | Grade | ↑ Positiva | Não |
| 2 | Maior acessibilidade temporal aos destinos relevantes | Fase 2 | Rede | ↑ Positiva | Não |
| 3 | Maior acessibilidade funcional a eixos hidroviários eficientes | Fase 2 | Rede | ↑ Positiva | Não |
| 4 | Maior acessibilidade funcional à malha ferroviária estratégica | Fase 2 | Rede | ↑ Positiva | Não |

### 10.10 Segurança (3 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Proximidade com segmentos de alta gravidade de acidentes | Fase 2 | Rede | ↑ Positiva | Não |
| 2 | Proximidade com segmentos de alta incidência de acidentes com usuários vulneráveis | Fase 2 | Rede | ↑ Positiva | Não |
| 3 | Proximidade com concentração elevada de pontos críticos de acidentes | Fase 2 | Rede | ↑ Positiva | Não |

### 10.11 Institucional (5 critérios)

| # | Critério | Fase | Classificação | Relação | Mandatório |
| - | -------- | ---- | ------------- | ------- | ---------- |
| 1 | Menor prazo até a entrada em operação | Fase 3 | Estático | ↓ Negativa | **Sim** |
| 2 | Menor complexidade técnica e institucional do empreendimento | Fase 3 | Dinâmico | ↓ Negativa | **Sim** |
| 3 | Maior aderência estratégica aos planos vigentes | Fase 3 | Dinâmico | ↑ Positiva | Não |
| 4 | Maior consenso institucional para viabilização da demanda | Fase 3 | Dinâmico | ↑ Positiva | Não |
| 5 | Maior legitimidade social e participativa do empreendimento | Fase 3 | Dinâmico | ↑ Positiva | Não |

### 10.12 Estratégia híbrida de operacionalização

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
- ACZÉL, J.; SAATY, T. L. Procedures for synthesizing ratio judgements. *Journal of
  Mathematical Psychology*, v. 27, n. 1, p. 93–102, 1983.
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
