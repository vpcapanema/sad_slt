# Espinha dorsal do sistema de hierarquizacao e ranqueamento PLI

## Objetivo do documento

Este documento define a arquitetura conceitual da espinha dorsal do sistema de apoio
a tomada de decisao para hierarquizar e ranquear projetos propostos no ambito do PLI.

A ideia central e permitir que um conjunto grande de projetos seja avaliado de forma
automatizada, configuravel e auditavel, sem depender necessariamente de analise manual
projeto a projeto. Para isso, o sistema deve operar por fases independentes, mas
correlacionadas, cada uma com entradas, regras de processamento e saidas proprias.

A espinha dorsal nao e o modulo que cria as camadas ou os indicadores. Ela e o motor
que consome produtos previamente preparados pelos modulos de apoio e aplica as regras
de triagem, hierarquizacao, ajuste e sintese.

## Principio geral

O sistema deve ser articulado em tres fases metodologicas:

1. Fase 1: filtros territoriais de restricao e risco.
2. Fase 2: hierarquizacao por favorabilidade territorial.
3. Fase 3: ajuste por atributos do projeto, incluindo riscos identificados na Fase 1.

As fases devem ser independentes. O usuario pode executar:

- somente a Fase 1;
- somente a Fase 2;
- somente a Fase 3;
- Fase 1 + Fase 2;
- Fase 1 + Fase 3;
- Fase 2 + Fase 3;
- Fase 1 + Fase 2 + Fase 3.

Quando mais de uma fase for executada, o sistema deve permitir a sintese das saidas
em um resultado final unico, com pesos configuraveis e regras explicitas.

## Papel de cada fase

### Fase 1 - Triagem de restricao e risco

A Fase 1 nao deve ranquear projetos. Sua funcao e classificar a elegibilidade
territorial preliminar.

Ela consome camadas de restricao e camadas de risco e cruza essas camadas com a
geometria de cada projeto.

Regra conceitual:

```text
se o projeto intersecta camada de restricao:
    status_fase1 = restrito
    o projeto nao segue para o ranking ordinario, salvo decisao explicita do usuario

senao, se o projeto intersecta camada de risco:
    status_fase1 = apto_com_ressalva
    o projeto segue para as demais fases
    os riscos encontrados sao registrados para eventual avaliacao na Fase 3

senao:
    status_fase1 = apto
    o projeto segue normalmente
```

Portanto:

- restricao tem funcao excludente ou segregadora;
- risco nao exclui;
- risco gera ressalva;
- a avaliacao quantitativa do risco pertence a Fase 3, quando aplicavel.

Saidas minimas da Fase 1:

- `status_fase1`: `apto`, `apto_com_ressalva` ou `restrito`;
- `restricoes_intersectadas`;
- `riscos_intersectados`;
- `alertas_fase1`;
- `geometria_ou_area_afetada`, quando aplicavel;
- `criterios_fase3_sugeridos`, derivados dos riscos encontrados.

Exemplo:

```text
Projeto A -> apto
Projeto B -> apto_com_ressalva: area suscetivel a inundacao
Projeto C -> restrito: unidade de conservacao de protecao integral
```

### Fase 2 - Hierarquizacao por favorabilidade territorial

A Fase 2 e o nucleo do ranking tecnico-territorial.

Ela consome uma ou mais superficies de favorabilidade territorial e cruza essas
superficies com a geometria dos projetos. A favorabilidade pode ter sido gerada por
algebra de mapas, AHP, media ponderada, modelo de rede ou outro procedimento
homologado.

Operacoes possiveis:

- extracao pontual, quando o projeto for representado por ponto;
- media zonal, quando houver poligono, linha ou buffer;
- mediana, maximo, minimo ou percentis, quando tecnicamente justificavel;
- estatistica por trecho, corredor ou area de influencia.

Saidas minimas da Fase 2:

- `score_fase2`, normalizado de 0 a 1;
- `ranking_fase2`;
- `valor_por_dimensao`, se a superficie tiver decomposicao tematica;
- `valor_por_criterio`, se disponivel;
- `metodo_extracao`: ponto, media zonal, buffer, corredor, area de influencia etc.;
- `geometria_usada_na_extracao`.

A Fase 2 pode ser usada sozinha para produzir um ranking tecnico-territorial, desde
que os projetos tenham localizacao suficiente para extracao espacial.

### Fase 3 - Ajuste por atributos do projeto

A Fase 3 e opcional e deve ser executada somente quando os projetos possuirem
atributos suficientes para sua aplicacao.

Ela nao deve duplicar criterios ja avaliados diretamente na Fase 2. Sua funcao e
incorporar informacoes que pertencem ao projeto, a carteira, a governanca ou a
viabilidade de execucao.

Tambem e nesta fase que os riscos identificados na Fase 1 podem ser avaliados
quantitativamente, caso o usuario queira considerar seus efeitos no ranking final.

Exemplos de criterios adequados para Fase 3:

- maturidade do projeto;
- prazo estimado de implantacao;
- fonte de recurso identificada;
- existencia de projeto basico ou executivo;
- existencia de licenca, autorizacao ou anuencia;
- status fundiario;
- risco de judicializacao conhecido;
- dependencia de projeto predecessor;
- sinergia com obra em andamento;
- aderencia a PPA, PEF, PAN, PLI, PAC ou outro instrumento homologado;
- existencia de convenio, acordo ou instrumento institucional;
- janela orcamentaria;
- risco ambiental, fundiario ou de interferencia registrado na Fase 1.

Operacao conceitual:

```text
score_fase3 = soma(valor_atributo_normalizado * peso_criterio)
```

Regras recomendadas:

- cada atributo deve ter tipo, unidade, faixa valida e regra de normalizacao;
- cada criterio deve informar se maior valor e melhor ou pior;
- campos ausentes devem ser registrados;
- o sistema deve calcular grau de completude da Fase 3;
- a Fase 3 so deve compor resultado final se atingir completude minima configurada.

Saidas minimas da Fase 3:

- `score_fase3`, normalizado de 0 a 1;
- `ranking_fase3`;
- `atributos_utilizados`;
- `atributos_ausentes`;
- `atributos_invalidos`;
- `grau_completude_fase3`;
- `pesos_fase3`;
- `contribuicao_por_criterio`.

## Sintese das fases

Quando mais de uma fase for executada, o sistema deve preservar as saidas separadas
e, opcionalmente, produzir uma saida sintetica.

A sintese nao deve apagar a leitura por fase. O usuario deve conseguir ver:

- resultado da Fase 1;
- ranking da Fase 2;
- ranking da Fase 3;
- ranking final composto;
- motivos da diferenca entre ranking tecnico e ranking ajustado.

### Tratamento da Fase 1 na sintese

A Fase 1 deve ser tratada prioritariamente como filtro, nao apenas como peso.

Regra recomendada:

```text
se status_fase1 = restrito:
    projeto sai do ranking ordinario
    ou aparece em bloco separado de projetos restritos

se status_fase1 = apto_com_ressalva:
    projeto permanece no ranking
    riscos sao enviados para Fase 3, se a Fase 3 for executada

se status_fase1 = apto:
    projeto permanece no ranking sem ressalva territorial
```

Caso o usuario queira forcar a inclusao de projetos restritos, essa decisao deve ser
registrada como excecao metodologica.

### Composicao ponderada

Quando Fase 2 e Fase 3 forem executadas, a sintese pode usar pesos entre fases.

Exemplo:

```text
score_final = peso_fase2 * score_fase2 + peso_fase3 * score_fase3
```

Com restricao metodologica:

```text
peso_fase2 + peso_fase3 = 1
```

Se a Fase 1 for usada como filtro, ela nao precisa ter peso numerico.

Tambem e possivel aplicar a Fase 3 como ajuste limitado:

```text
score_final = score_fase2 + ajuste_fase3
```

em que `ajuste_fase3` possui teto e piso configuraveis, para impedir que atributos
completamente secundarios desfacam o ranking tecnico-territorial.

## Modulos de apoio

A espinha dorsal depende de tres grandes modulos produtores de entrada.

### 1. Modulo gerador de camadas de restricao e risco

Responsavel por produzir os insumos da Fase 1.

Produtos esperados:

- camada consolidada de restricoes;
- camada consolidada de riscos;
- metadados por camada de origem;
- classificacao por severidade;
- regra de tratamento: restricao ou risco;
- validade temporal da fonte;
- fonte oficial ou referencia de origem.

Este modulo nao ranqueia projetos. Ele prepara o universo espacial de triagem.

### 2. Modulo gerador de favorabilidade territorial

Responsavel por produzir os insumos da Fase 2.

Produtos esperados:

- superficies normalizadas de criterios;
- pesos dos criterios;
- superficie consolidada de favorabilidade;
- decomposicao por dimensao, se aplicavel;
- metadados de normalizacao;
- resolucao espacial;
- metodo de algebra de mapas ou modelo de rede utilizado.

Este modulo deve seguir metodologia homologada, como a logica de variaveis
geoespaciais continuas, reescalonamento para 0 a 1, ponderacao por AHP e extracao
por estatistica espacial.

### 3. Modulo de recepcao e validacao de atributos de projeto

Responsavel por produzir os insumos da Fase 3.

Produtos esperados:

- tabela de atributos dos projetos;
- dicionario de criterios da Fase 3;
- tipos de dados esperados;
- faixas validas;
- regras de normalizacao;
- pesos por criterio;
- diagnostico de completude;
- diagnostico de inconsistencias.

Este modulo nao deve exigir que todos os projetos possuam todos os atributos. Ele
deve informar se ha dados suficientes para executar a Fase 3 com confiabilidade.

## Contrato minimo de dados por projeto

Para participar da espinha dorsal, cada projeto deve possuir pelo menos:

- identificador unico;
- nome ou descricao curta;
- tipo de projeto, se disponivel;
- geometria, ponto, linha, poligono ou localizacao suficiente para criar buffer;
- fase(s) que o usuario deseja executar;
- atributos de Fase 3, somente se a Fase 3 for executada.

Exemplo conceitual:

```json
{
  "projeto_id": "PLI-001",
  "nome": "Ligacao regional exemplo",
  "tipo": "rodoviario",
  "geometria": "...",
  "atributos_fase3": {
    "maturidade": "projeto_basico",
    "prazo_meses": 24,
    "fonte_recurso": "identificada",
    "dependencia_predecessor": false
  }
}
```

## Contrato minimo de saida

Cada execucao deve gerar um resultado auditavel.

Exemplo conceitual:

```json
{
  "projeto_id": "PLI-001",
  "fase1": {
    "executada": true,
    "status": "apto_com_ressalva",
    "restricoes": [],
    "riscos": ["area_suscetivel_inundacao"]
  },
  "fase2": {
    "executada": true,
    "score": 0.73,
    "posicao": 12
  },
  "fase3": {
    "executada": true,
    "score": 0.61,
    "completude": 0.82
  },
  "sintese": {
    "executada": true,
    "score_final": 0.70,
    "posicao_final": 15
  }
}
```

## Regras de configurabilidade

O sistema deve permitir configuracao por rodada de analise.

Configuracoes minimas:

- fases a executar;
- conjunto de projetos;
- camadas de restricao e risco;
- superficie de favorabilidade;
- metodo de extracao espacial;
- criterios da Fase 3;
- pesos da Fase 3;
- pesos entre fases na sintese;
- regra para projetos restritos;
- completude minima para aplicar Fase 3.

## Regras de auditoria e transparencia

Todo ranking deve ser explicavel.

Para cada projeto, o sistema deve permitir responder:

- por que o projeto foi considerado apto, apto com ressalva ou restrito;
- quais camadas intersectaram o projeto;
- qual valor espacial foi extraido na Fase 2;
- quais atributos foram usados na Fase 3;
- quais atributos estavam ausentes;
- quais pesos foram aplicados;
- quanto cada fase contribuiu para a nota final;
- se houve excecao metodologica.

## Decisao conceitual consolidada

A arquitetura adotada separa tres naturezas distintas de avaliacao:

- Fase 1: elegibilidade territorial.
- Fase 2: merito tecnico-territorial.
- Fase 3: ajuste por atributos do projeto e avaliacao de riscos.

Essa separacao evita redundancia metodologica e permite que o sistema funcione com
diferentes niveis de maturidade dos dados.

Em um cenario minimo, o sistema pode apenas filtrar projetos por restricao.
Em um cenario intermediario, pode ranquear por favorabilidade territorial.
Em um cenario completo, pode combinar restricao, favorabilidade e atributos do
projeto em uma sintese final ponderada.

Assim, o sistema permanece automatizavel, configuravel e tecnicamente defensavel para
diferentes conjuntos de projetos do PLI.
