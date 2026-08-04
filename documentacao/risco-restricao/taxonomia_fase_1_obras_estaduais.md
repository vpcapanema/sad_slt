# Taxonomia simplificada da Fase 1 para obras estaduais

## Premissa

A Fase 1 deve captar apenas geradores de risco e restricao com incidencia real sobre a implantacao de obra estadual, evitando condicionantes municipais ordinarias sem poder material de travamento estrategico.

## Regra de exclusao

Plano diretor, zoneamento municipal comum e regras locais ordinarias de uso do solo nao entram como eixo central desta triagem, salvo quando se converterem em restricao juridico-institucional forte ou interferencia material relevante.

## Dimensoes que entram

| Dimensao | O que entra | Exemplos tipicos | Natureza predominante | Entra na Fase 1 | Observacao operacional |
| --- | --- | --- | --- | --- | --- |
| Ambiental | Restricoes e riscos socioambientais com incidencia territorial direta sobre a obra. | UC, zona de amortecimento, TI, quilombola, vegetacao protegida, area contaminada, inundacao, erosao, escorregamento, cavidade. | Restricao e risco | Sim | Base principal da triagem espacial inicial. |
| Fundiario-patrimonial | Entraves de dominio, ocupacao, desapropriacao complexa e protecao patrimonial que possam deslocar, encarecer ou travar a implantacao. | Conflito dominial, assentamento, ocupacao consolidada critica, bem tombado, area envoltoria, sitio arqueologico. | Restricao e risco | Sim | Importa quando afeta diretamente o tracado, a implantacao ou o licenciamento. |
| Juridico-institucional forte | Restricoes legais expressas, embargos e exigencias de anuencia setorial com potencial real de travamento. | Embargo ambiental, regime especial, anuencia obrigatoria de orgao federal ou estadual, area sob protecao especifica. | Restricao | Sim | So entram condicionantes com efeito concreto sobre a decisao estadual. |

## Dimensao que nao entra como nucleo da Fase 1

| Dimensao | O que fica de fora | Exemplos tipicos | Natureza predominante | Entra na Fase 1 | Observacao operacional |
| --- | --- | --- | --- | --- | --- |
| Contexto municipal ordinario | Condicionantes locais sem poder material de veto estrategico nesta etapa. | Plano diretor, zoneamento municipal comum, parametro edilicio, regra local ordinaria de parcelamento e uso. | Contexto | Nao | Ficam fora do nucleo da Fase 1, salvo quando virarem entrave juridico ou fisico relevante. |
| Infraestrutura e servidoes | Faixas de dominio, servidoes e interferencias com ativos existentes. | Rodovia, ferrovia, dutovia, linha de transmissao, aeroporto, barragem e redes. | Contexto de engenharia | Nao | Devem ser tratadas no projeto e no licenciamento; por si so, nao representam risco ou restricao territorial na Fase 1. |

## Sintese de uso

A Fase 1 deve responder se existe restricao forte, risco relevante ou interferencia territorial material capaz de impedir, deslocar, condicionar fortemente ou encarecer de modo substantivo uma obra estadual.

## Revisao segundo o licenciamento rodoviario da CETESB

Revisao realizada em 15/07/2026 a partir do **Manual para Elaboracao de Estudos para o Licenciamento com Avaliacao de Impacto Ambiental**, versao disponibilizada pela CETESB em agosto de 2024.

Fonte: [Manual da CETESB para elaboracao de estudos com AIA](https://www2.cetesb.sp.gov.br/licenciamentoambiental/wp-content/uploads/sites/32/2024/08/Manual-para-Elaboracao-de-Estudos-com-AIA.pdf).

### Correcao conceitual

No licenciamento de rodovias, a sobreposicao com uma area ambientalmente sensivel nao significa, isoladamente, inviabilidade. A CETESB usa essas incidencias para comparar alternativas locacionais, definir o estudo ambiental aplicavel, quantificar impactos, exigir autorizacoes e estabelecer medidas mitigadoras ou compensatorias.

Por isso, a taxonomia passa a distinguir:

| Resultado | Regra operacional |
| --- | --- |
| Sem incidencia | A geometria da demanda nao intersecta a feicao. Valor espacial `0`. |
| Risco | Existe intersecao e a ocorrencia pode aumentar custo, prazo, complexidade, estudos, anuencias ou medidas de controle, mas nao comprova impedimento. Valor espacial `1` na camada de risco. |
| Restricao | Alem da intersecao, um atributo juridico, territorial ou tecnico demonstra vedacao, incompatibilidade ou impossibilidade aplicavel a intervencao. Valor espacial `1` na camada de restricao. |
| Risco pendente de analise | Houve intersecao, mas a camada nao possui atributos suficientes para decidir entre risco e restricao. Deve permanecer como risco ate analise competente. |

### Regra de precedencia

1. Detectar todas as intersecoes e preservar os atributos das feicoes pelo operador `Identity`.
2. Aplicar as regras de enquadramento a cada feicao individualmente.
3. Se alguma feicao for classificada como restricao, o objeto recebe restricao e nao segue para a avaliacao agregada de risco da Fase 1.
4. Na ausencia de restricao, consolidar e relatar todos os riscos encontrados.
5. Nunca inferir restricao apenas pela ausencia de informacao na camada.

### Enquadramento inicial dos grupos

| Grupo | Enquadramento inicial | Atributo que pode elevar para restricao |
| --- | --- | --- |
| UC de Protecao Integral | Risco | Categoria, zona, plano de manejo ou manifestacao do gestor que torne a obra incompatível. |
| UC de Uso Sustentavel | Risco | Zona ou norma especifica que vede a intervencao. |
| Zona de amortecimento | Risco | Regra especifica de uso que vede a intervencao. |
| APP | Risco | Nao enquadramento em hipotese legal admissivel ou descumprimento de condicao obrigatoria. |
| Vegetacao nativa | Risco | Bioma, fitofisionomia, estagio e hipotese legal que nao admitam supressao. |
| APRM | Risco | Classe territorial e lei especifica incompatíveis com a intervencao. |
| Ecossistema costeiro sensivel | Risco | Categoria legal e condicao concreta que nao admitam intervencao. |
| Cavidade natural | Risco | Relevancia maxima ou outra classe legalmente impeditiva. |
| Terra indigena e territorio quilombola | Risco socioambiental e institucional | Impedimento reconhecido no processo e pela autoridade competente. |
| Area contaminada | Risco | Impossibilidade de gerenciamento seguro ou incompatibilidade comprovada. |
| Inundacao, erosao e movimentos de massa | Risco tecnico-ambiental | Risco residual inaceitavel ou impossibilidade tecnica demonstrada. |
| Patrimonio tombado ou arqueologico | Risco patrimonial | Ato de protecao ou decisao competente que vede a intervencao. |
| Assentamento e regime fundiario especial | Risco fundiario | Impedimento dominial ou institucional que inviabilize a alternativa. |

### Aplicacao correta no SICARD

O criterio representa a classe espacial verificavel. A feicao interseccionada fornece os atributos usados na decisao. Assim, duas feicoes da mesma camada podem produzir resultados diferentes: uma pode ser apenas risco e outra pode constituir restricao, conforme categoria, zoneamento, relevancia ou ato de protecao.

A classificacao e uma triagem para hierarquizacao e nao substitui a Licenca Previa, a analise da CETESB, autorizacoes setoriais ou manifestacoes dos orgaos competentes.

## Ajuste de escopo: APPs e cavernas

- Intersecao com APP hidrica e intersecao com APP associada ao relevo foram retiradas dos criterios de risco/restricao da Fase 1. Permanecem como informacao de apoio ao licenciamento e ao projeto de engenharia.
- O alias do criterio de cavidade de relevancia maxima e **Impacto em caverna de relevancia maxima**.
- Esse criterio e classificado como **risco critico / restricao condicionada**. O Decreto Federal nº 10.935/2022 admite autorizacao de impacto irreversivel em condicoes especificas; portanto, nao existe bloqueio automatico por simples incidencia.
- Converte-se em restricao quando faltar alternativa tecnica e locacional viavel, os requisitos legais nao forem atendidos, houver risco de extincao de especie ou o orgao licenciador negar a autorizacao.

## Arvore deterministica de competencia

Conforme a Lei Complementar nº 140/2011, o licenciamento pertence a um unico ente federativo. Para obra rodoviaria estadual:

1. Dentro de Terra Indigena: IBAMA licencia; FUNAI intervem.
2. Dentro de UC federal, exceto APA: IBAMA licencia; ICMBio intervem como gestor.
3. Dentro de APA federal, sem outro gatilho federal: CETESB licencia; ICMBio participa conforme o impacto e o procedimento aplicavel.
4. Dentro de territorio quilombola, sem outro gatilho federal: CETESB licencia; Fundacao Cultural Palmares atua nos impactos culturais e sociais; INCRA fornece informacoes e atua nas questoes fundiarias.
5. Sobre sitio arqueologico, sem outro gatilho federal: CETESB licencia; IPHAN atua sobre o patrimonio arqueologico.
6. Sem hipotese federal e sendo obra estadual em Sao Paulo: CETESB licencia.

FUNAI, ICMBio, IPHAN, Fundacao Cultural Palmares e INCRA nao devem ser registrados como colicenciadores.

Referencias: [Lei Complementar nº 140/2011](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp140.htm) e [Decreto Federal nº 8.437/2015](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/decreto/d8437.htm).

## Restricao automatica de priorizacao

Alem da restricao legal, o SICARD pode produzir uma restricao administrativa de priorizacao quando o conjunto de incidencias indicar prazo, coordenacao institucional ou exigencias incompatíveis com o horizonte da carteira.

O calculo deve ocorrer depois da deteccao espacial e conter:

- licenciador determinado;
- estudo ambiental exigido ou ainda pendente de enquadramento;
- lista de intervenientes;
- autorizacoes especificas;
- consultas e audiencias;
- compensacoes previsiveis;
- necessidade de alternativa locacional;
- numero de incidencias acumuladas.

| Classe | Tratamento |
| --- | --- |
| Baixa | Sem restricao de priorizacao. |
| Media | Risco de prazo. |
| Alta | Restricao automatica de priorizacao. |
| Critica | Inelegivel na rodada, salvo decisao motivada. |

Pesos, limites e excecoes devem vir de configuracao versionada e aprovada, nunca de valores fixos inventados no codigo. A decisao e seus fatores devem ser gravados no JSONB da hierarquizacao.

## Embargos e interdicoes

Tres criterios juridicos espaciais passam a integrar obrigatoriamente a Fase 1:

| Criterio | Fonte | Classificacao | Automatizacao |
| --- | --- | --- | --- |
| Area sob embargo ambiental federal ativo | IBAMA | Restricao juridica | Automatica quando o registro estiver ativo e possuir geometria valida. |
| Area sob embargo ambiental estadual ativo | SEMIL/Policia Militar Ambiental/SIGAM | Restricao juridica | Depende de camada oficial, integracao institucional ou carga validada. Nao inferir geometria. |
| Area ou estabelecimento sob interdicao ativa da CETESB | CETESB | Restricao juridica condicionada ao alcance do ato | Depende de geometria oficial ou carga institucional validada. Preservar a especie do ato; nao chamar toda interdicao de embargo. |

### Regra operacional

1. Consultar apenas atos ativos.
2. Confirmar que a geometria e o alcance material do ato atingem a demanda.
3. Preservar numero, processo, orgao, data, fundamento, situacao e geometria.
4. Classificar como restricao antes da consolidacao dos riscos comuns.
5. Permitir revisao somente mediante prova formal de levantamento, suspensao, cancelamento, inaplicabilidade ou erro de geometria.
6. Registrar a revisao e manter o resultado anterior no historico.

Fonte federal: [consulta de areas embargadas do IBAMA](https://www.gov.br/ibama/pt-br/assuntos/fiscalizacao-e-protecao-ambiental/areas-embargadas).

## Indices simplificados para decisao do gestor

Cada objeto guarda os valores detalhados, mas segue para as fases posteriores com uma classe arredondada simples.

| Valor | Classe |
| ---: | --- |
| 0 | Sem incidencia |
| 1 | Risco baixo |
| 2 | Risco medio |
| 3 | Risco alto |
| 4 | Restricao |

O indice de risco e calculado pela media ponderada dos criterios avaliados. O indice de restricao e o maior valor restritivo confirmado, evitando que embargo ou interdicao sejam diluidos pela media.

```text
indice_risco = soma(valor × peso) / soma(pesos aplicaveis)
indice_restricao = maximo(valores restritivos confirmados)
valor_resultante = maximo(indice_risco, indice_restricao)
```

| Valor resultante | Arredondamento operacional |
| ---: | --- |
| 0 | Sem risco |
| maior que 0 e menor que 1,50 | Risco baixo |
| de 1,50 ate menor que 2,50 | Risco medio |
| de 2,50 ate menor que 3,50 | Risco alto |
| de 3,50 ate 4,00 | Restricao |

Falta de dado e falha de processamento significam `nao avaliado`, nunca zero. Pesos e limiares sao configuraveis, versionados e preservados no JSONB da rodada.
