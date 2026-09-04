# Taxonomia simplificada da Fase 1 para obras estaduais

> **Documento historico — nao e a regra vigente.**
>
> A classificacao de risco e restricao da Fase 1 e definida pelo *Arcabouco
> Teorico-Conceitual de Risco e Restricao*, em
> `/restrict/geoespacial/configuracao-risco-restricao/`, secao 2. Sao sete
> camadas de restricao e treze de risco, e a categoria e da CAMADA oficial.
> Em qualquer divergencia, prevalece o arcabouco.
>
> Este estudo precedeu o arcabouco e e mantido pelo registro do raciocinio.
> Os enquadramentos por grupo e as escalas de severidade que ele continha foram
> retirados por contradizerem a regra vigente.

## Premissa

A Fase 1 deve captar apenas geradores de risco e restricao com incidencia real sobre a implantacao de obra estadual, evitando condicionantes municipais ordinarias sem poder material de travamento estrategico.

## Regra de exclusao

Plano diretor, zoneamento municipal comum e regras locais ordinarias de uso do solo nao entram como eixo central desta triagem, salvo quando se converterem em restricao juridico-institucional forte ou interferencia material relevante.

## Dimensoes que entram

| Dimensao | O que entra | Exemplos tipicos | Natureza predominante | Entra na Fase 1 | Observacao operacional |
| --- | --- | --- | --- | --- | --- |
| Ambiental | Restricoes e riscos socioambientais com incidencia territorial direta sobre a obra. | UC, TI, quilombola, area contaminada, inundacao, erosao, escorregamento, cavidade. | Restricao e risco | Sim | Base principal da triagem espacial inicial. |
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
| Restricao | (Ver arcabouco, secao 2: a categoria e da camada oficial.) Alem da intersecao, um atributo juridico, territorial ou tecnico demonstra vedacao, incompatibilidade ou impossibilidade aplicavel a intervencao. Valor espacial `1` na camada de restricao. |

### Regra de precedencia

1. Detectar todas as intersecoes e preservar os atributos das feicoes pelo operador `Identity`.
2. Aplicar as regras de enquadramento a cada feicao individualmente.
3. Se alguma feicao for classificada como restricao, o objeto recebe restricao e nao segue para a avaliacao agregada de risco da Fase 1.
4. Na ausencia de restricao, consolidar e relatar todos os riscos encontrados.
5. Nunca inferir restricao apenas pela ausencia de informacao na camada.

### Enquadramento dos grupos

O enquadramento inicial que constava aqui atribuia risco a Unidade de
Conservacao de Protecao Integral, terra indigena, territorio quilombola,
ecossistema costeiro e patrimonio tombado, e listava zona de amortecimento e APP
como grupos proprios. Nada disso corresponde a regra vigente.

A classificacao valida esta na secao 2 do arcabouco: sete camadas de restricao
(restricao CETESB, embargo estadual, embargo federal, manguezal, territorio
quilombola, terra indigena e Unidade de Conservacao de Protecao Integral) e treze
de risco. Zona de amortecimento e APP nao sao camadas da Fase 1 — a pagina e
explicita em que zonas de amortecimento nao sao geradas nem classificadas.

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

## Restricao automatica de priorizacao (retirada)

Esta secao propunha derivar restricao de uma escala graduada — severidade 4 e
indice a partir de 3,50 seriam convertidos em restricao — e foi retirada por
contradizer a regra vigente.

No arcabouco, restricao e regra booleana nao compensatoria, aplicada antes da
ponderacao: ela vem da categoria da camada oficial, nunca de um escore
acumulado. A propria pagina fecha com "a restricao nunca e inferida pela simples
ausencia de informacao na camada". Escores graduam risco e so risco.

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

A escala que constava aqui ia de 0 a 4 com o valor 4 rotulado "Restricao", e
convertia o indice resultante em restricao a partir de 3,50. Foi retirada pelo
mesmo motivo da secao anterior: fazia a restricao emergir de um escore.

Na regra vigente as duas grandezas nao se misturam. A restricao e booleana e vem
da camada; o indice gradua exclusivamente o risco, e o objeto que intersecta uma
camada de restricao sequer chega a avaliacao agregada de risco. Sobre os objetos
sem restricao, a graduacao segue util:

| Valor | Classe |
| ---: | --- |
| 0 | Sem incidencia |
| 1 | Risco baixo |
| 2 | Risco medio |
| 3 | Risco alto |

```text
indice_risco = soma(valor x peso) / soma(pesos aplicaveis)
```

Falta de dado e falha de processamento significam `nao avaliado`, nunca zero. Pesos e limiares sao configuraveis, versionados e preservados no JSONB da rodada.
