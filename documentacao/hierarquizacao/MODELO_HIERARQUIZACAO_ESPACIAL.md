# Modelo de Hierarquizacao Espacial

## Objetivo

Este documento reclassifica os 55 fatores da aba Matriz de Criterios e Premissas em quatro tipos de modelagem:

- grade: fator que pode ser representado como superficie continua em uma malha celular cobrindo todo o estado;
- rede: fator que precisa ser calculado sobre segmentos, nos, corredores ou pares origem-destino;
- atributo_objeto: fator que existe como atributo intrinseco do projeto e nao deve ser rasterizado;
- hibrido: fator que depende de combinacao entre localizacao, rede e atributos do projeto.

Tambem define a variavel derivada recomendada a partir da premissa de cada fator. Nesta leitura, o campo Criterio da planilha e tratado como fator avaliativo, e a premissa e tratada como a regra que orienta a extracao da variavel.

## Tecnica

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| VDM - Volume Diario Medio | rede | indice de demanda por segmento ou corredor, combinando VDM observado e VDM modelado |
| Nivel de Servico (NS) / Saturacao | rede | indice de saturacao por segmento, com base em V/C, NS observado e NS projetado |
| Congestionamento real (tempo lento) | rede | razao entre tempo observado e tempo de fluxo livre por segmento, corredor ou OD |
| Estado de conservacao do pavimento | rede | indice de degradacao do pavimento por segmento, derivado de IRI, PCI e idade |
| Deficiencia geometrica (rampas, alcas e raios) | rede | indice de restricao geometrica por segmento, combinando rampa, curvatura, raio e velocidade operacional |
| Prontidao / maturidade do projeto | atributo_objeto | escore ordinal de maturidade, de ideia ate projeto executivo |
| Trafego sazonal (fins de semana e feriados) | rede | razao de sobrecarga sazonal por segmento ou corredor |

## Financeiro

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| Capex (custo de investimento) | atributo_objeto | custo total de investimento e custo por unidade de beneficio entregue |
| Opex (operacao e manutencao) | atributo_objeto | custo anual equivalente de operacao e manutencao ao longo do ciclo de vida |
| Relacao beneficio/custo | atributo_objeto | escore de retorno economico-financeiro derivado de B/C, VPL e TIR |
| Potencial de financiamento privado / concessao | atributo_objeto | percentual de alavancagem privada ou indice de atratividade para PPP/concessao |
| Custos logisticos diferenciados (porto/corredor) | hibrido | penalidade de custo logistico por corredor e mercadoria atendida pelo projeto |
| Beneficio social na priorizacao | atributo_objeto | VPL social ou B/C social consolidado do projeto |

## Economica

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| Empregos e producao envolvidos | grade | massa economica no entorno, combinando empregos e valor de producao por celula ou area de influencia |
| Competitividade da producao paulista | hibrido | ganho de competitividade derivado da reducao do custo logistico para cadeias e regioes atendidas |
| Reducao dos tempos de viagem | rede | economia de tempo por OD, corredor ou segmento critico |
| Inducao de producao e emprego regional | hibrido | potencial de inducao economica regional estimado para a area de influencia do projeto |
| Atendimento a cargas sem alternativa eficiente | hibrido | tonelagem cativa ou reprimida desbloqueada pelo projeto |
| Suporte a cadeias estrategicas (Pre-Sal, agro, sucroenergetico) | hibrido | tonelagem e valor economico de cadeias estrategicas efetivamente servidas |
| Participacao da hidrovia na matriz de transporte | rede | incremento esperado de TKM hidroviario atribuivel ao projeto |
| Desenvolvimento ferroviario estadual | rede | incremento de conectividade ferroviaria, km ativos e TKM ferroviario associado |

## Social

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| Reducao de desigualdades regionais | grade | indice territorial de prioridade social, derivado do inverso de IDH, renda e PIB per capita |
| Populacao beneficiada | hibrido | populacao adicional beneficiada dentro da area de influencia ou catchment do projeto |
| Equidade no acesso ao transporte | hibrido | ganho de cobertura sobre populacao subatendida por servico ou infraestrutura de transporte |
| Acesso a servicos essenciais (saude e educacao) | hibrido | populacao com melhoria de acessibilidade a saude e educacao apos o projeto |
| Acessibilidade a polos (portos e aeroportos) | rede | reducao do tempo generalizado de acesso terrestre aos polos logisticos prioritarios |
| Atendimento a comunidades isoladas | hibrido | numero e peso relativo de comunidades isoladas conectadas ou com acessibilidade ampliada |

## Seguranca

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| Acidentes com vitimas (gravidade) | rede | densidade de obitos e feridos graves por km ou por exposicao de trafego |
| Acidentes com usuarios vulneraveis | rede | densidade de ocorrencias com pedestres, ciclistas e motociclistas em segmentos e nos |
| Transporte de cargas perigosas | hibrido | indice de exposicao a risco com cargas perigosas, combinando ocorrencias, severidade e entorno sensivel |
| Concentracao de pontos criticos (black spots) | rede | densidade kernel ou clusterizacao de acidentes graves por km |

## Ambiental

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| Reducao de emissoes de gases de efeito estufa (GEE) | hibrido | tCO2eq/ano evitadas em funcao do projeto, da mudanca modal e do ganho operacional |
| Reducao de poluentes locais | hibrido | emissao local evitada ponderada pela exposicao populacional no entorno do corredor |
| Eficiencia energetica | hibrido | reducao da intensidade energetica por tonelada.km ou passageiro.km atribuivel ao projeto |
| Otimizacao da matriz modal | hibrido | percentual de migracao efetiva do rodoviario para modos mais eficientes |
| Impacto sobre areas sensiveis ou protegidas | hibrido | indice de conflito ambiental espacial, medido por sobreposicao, proximidade e area afetada |
| Complexidade do licenciamento ambiental | atributo_objeto | escore de carga licenciatoria, combinando tipologia, prazo e numero de condicionantes esperadas |

## Territorial

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| Conflito com o trafego urbano e conurbacoes | rede | indice de conflito urbano-regional, combinando pico, travessias urbanas e friccao com trafego local |
| Conflito com o trafego urbano portuario | rede | indice de interferencia urbano-portuaria no acesso a terminais e retroareas |
| Integracao intermodal | rede | indice de conectividade intermodal do projeto com portos, aeroportos, ferrovias e hidrovias |
| Conexao inter-regional e vazios logisticos | hibrido | ganho de conectividade territorial para regioes mal servidas e reducao de vazios logisticos |
| Aderencia aos planos diretores municipais | hibrido | escore de compatibilidade territorial e urbanistica ao longo da implantacao |
| Polos atratores e geradores de trafego | hibrido | pressao potencial de viagens e cargas geradas por polos no entorno da infraestrutura |

## Institucional

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| Nivel de complexidade | atributo_objeto | escore tecnico-institucional de complexidade de implantacao |
| Prazo para implantacao | atributo_objeto | meses ate entrada em operacao ou janela estimada de entrega |
| Pendencias juridicas e jurisdicionais | atributo_objeto | indice de impedimento juridico, combinando numero, gravidade e fase das pendencias |
| Alinhamento aos planos (PPA, PEF, PAN, PNLT) | atributo_objeto | escore de aderencia estrategica aos planos e carteiras vigentes |
| Consenso e apoio institucional dos atores | atributo_objeto | escore de alinhamento entre atores publicos, reguladores, operadores e municipios |
| Demanda social e contribuicoes recebidas | atributo_objeto | escore de legitimidade participativa baseado em mencoes, contribuicoes e apoio social |

## Risco

| Fator avaliativo | Classe | Variavel derivada recomendada |
| --- | --- | --- |
| Resiliencia climatica (Blue Spot) | hibrido | indice de resiliencia da rede, medido por pontos criticos mitigados e reducao da exposicao a eventos extremos |
| Risco de demanda (incerteza de projecao) | atributo_objeto | coeficiente de variacao entre cenarios de demanda e sensibilidade da viabilidade |
| Risco de execucao (atrasos e sobrecustos) | atributo_objeto | escore de risco de entrega por referencia historica de prazo e custo |
| Risco de desapropriacao e interferencias | atributo_objeto | indice de carga fundiaria e de interferencias com utilidades e infraestruturas existentes |
| Dependencia de pre-requisitos (interdependencia) | atributo_objeto | indice de dependencia de predecessores, licences e obras associadas |
| Risco socioambiental (comunidades tradicionais) | hibrido | indice de conflito socioambiental por presenca, proximidade e sensibilidade de comunidades tradicionais |

## Leitura sintetica

### Fatores naturalmente modelaveis em grade

- Empregos e producao envolvidos.
- Reducao de desigualdades regionais.

Esses fatores podem ser representados como superficie continua estadual e depois agregados por area de influencia do projeto.

### Fatores naturalmente modelaveis em rede

- demanda, saturacao, congestionamento, pavimento, geometria e sazonalidade;
- reducao de tempo, acessibilidade a polos, hidrovia, ferrovia;
- acidentes, pontos criticos e conflitos de trafego;
- integracao intermodal e parte relevante da conectividade territorial.

Esses fatores devem ser calculados sobre segmentos, nos, corredores ou matrizes OD.

### Fatores naturalmente modelaveis como atributos de projeto

- custos, retorno e potencial de financiamento;
- maturidade, prazo, complexidade e pendencias;
- alinhamento estrategico, consenso e participacao;
- riscos de demanda, execucao, desapropriacao e interdependencia.

Esses fatores nao devem ser rasterizados.

### Fatores hibridos

Os fatores hibridos exigem combinar localizacao, rede e escopo do projeto. Sao os casos em que a premissa depende simultaneamente de onde o projeto esta, como ele se conecta e que tipo de ativo ele entrega.

## Implicacao para o modulo

O ranqueamento final nao deve ser baseado em uma unica grade statewide. O desenho tecnicamente mais coerente e:

1. construir uma grade de favorabilidade apenas para os fatores locacionais e territoriais;
2. construir indicadores de rede para acessibilidade, saturacao, seguranca e conectividade;
3. manter atributos de projeto e risco fora da grade;
4. agregar tudo no nivel do projeto antes da ponderacao multicriterio.

Com isso, a grade vira uma camada estruturante do modelo, mas nao substitui a analise de rede nem os atributos intrinsecos dos projetos.
