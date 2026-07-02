# Modulo Fase 3 - Atributos de projeto e ajuste por pesos

## Objetivo do modulo

Este documento define o modulo responsavel por receber, validar, normalizar e ponderar
atributos de projetos utilizados na Fase 3 da espinha dorsal do sistema de
hierarquizacao e ranqueamento de projetos do PLI.

A Fase 3 e opcional. Ela so deve ser executada quando os projetos em julgamento
possuirem atributos suficientes para gerar um indice de ajuste por projeto.

Enquanto a Fase 1 trata restricoes e riscos territoriais e a Fase 2 trata
favorabilidade territorial, a Fase 3 trata atributos proprios do projeto, da carteira
ou da governanca de execucao.

## Produto final do modulo

O modulo deve produzir um pacote de Fase 3 contendo:

- tabela validada de atributos dos projetos;
- dicionario de atributos/criterios;
- atributos normalizados;
- pesos configurados pelo usuario;
- score de Fase 3 por projeto;
- ranking de Fase 3;
- diagnostico de completude;
- diagnostico de inconsistencias;
- relatorio de processamento;
- identificador de versao ou rodada.

## Conceito metodologico

O modulo recebe um arquivo tabular com a lista de projetos e seus atributos. Cada
atributo selecionado para a Fase 3 vira um criterio ajustavel por controle de peso.

Na interface, cada atributo deve aparecer com uma chave ou controle deslizante de
intensidade de peso entre 0 e 1.

Conceito:

```text
valor_ponderado_atributo = valor_atributo_normalizado * peso_atributo
```

O score da Fase 3 e calculado pela soma dos valores ponderados, com pesos
normalizados ou por regra configurada.

```text
score_fase3 =
    atributo_1_normalizado * peso_1 +
    atributo_2_normalizado * peso_2 +
    ...
    atributo_n_normalizado * peso_n
```

Resultado esperado:

```text
0 = pior ajuste por atributos de projeto
1 = melhor ajuste por atributos de projeto
```

## Entradas aceitas

O modulo deve aceitar arquivos tabulares, no minimo:

- CSV;
- XLSX;
- XLS;
- parquet, se adotado pelo backend;
- tabela proveniente de banco de dados interno.

Cada linha representa um projeto. Cada coluna representa um atributo ou campo de
identificacao.

## Estrutura minima da tabela de entrada

A tabela deve possuir, no minimo:

- identificador unico do projeto;
- nome ou descricao curta do projeto;
- atributos candidatos a criterio de Fase 3.

Exemplo:

```text
projeto_id,nome,maturidade,prazo_meses,fonte_recurso,risco_judicializacao,dependencia_predecessor
PLI-001,Ligacao regional A,projeto_basico,24,identificada,baixo,nao
PLI-002,Contorno urbano B,estudo,48,nao_identificada,medio,sim
```

## Cadastro minimo do atributo/criterio

Cada atributo usado como criterio deve possuir cadastro minimo:

- `atributo_id`;
- `nome_coluna`;
- `rotulo`;
- `tipo_dado`: numerico, ordinal, booleano, categorico, data;
- `criterio_fase3`;
- `direcao`: maior_melhor ou menor_melhor;
- `regra_normalizacao`;
- `valores_validos`, quando aplicavel;
- `valor_padrao`, se houver;
- `obrigatorio`: sim ou nao;
- `peso_inicial`;
- `peso_minimo`;
- `peso_maximo`;
- `observacao_metodologica`.

## Importacao

Durante a importacao, o modulo deve:

- identificar delimitador e codificacao, no caso de CSV;
- identificar planilha ativa, no caso de XLSX/XLS;
- validar cabecalho;
- detectar colunas vazias;
- detectar linhas duplicadas;
- validar identificador unico do projeto;
- preservar arquivo original como evidencia;
- registrar usuario, data e hora da importacao.

## Validacao do conteudo

O modulo deve validar o conteudo do arquivo imputado antes de permitir ponderacao.

Validacoes minimas:

- projetos possuem identificador unico;
- nao ha projetos duplicados;
- colunas obrigatorias estao presentes;
- tipos de dados sao compativeis com o dicionario;
- valores numericos estao em faixa valida;
- valores categoricos pertencem ao vocabulario definido;
- campos booleanos sao interpretaveis;
- datas, quando existirem, sao validas;
- percentual de dados ausentes e calculado;
- atributos com muitos ausentes sao sinalizados.

Linhas ou campos invalidos nao devem ser corrigidos silenciosamente. O sistema deve
registrar erro, aviso ou substituicao aplicada.

## Transformacao dos atributos em criterios ponderaveis

Apos a validacao, cada atributo selecionado deve ser convertido em criterio de Fase 3.

Na interface, o usuario deve ver uma lista de atributos com controles de peso:

```text
[0.00 ---------------- 1.00] maturidade do projeto
[0.00 ---------------- 1.00] prazo estimado
[0.00 ---------------- 1.00] fonte de recurso identificada
[0.00 ---------------- 1.00] risco de judicializacao
[0.00 ---------------- 1.00] dependencia de projeto predecessor
```

Ao mover a chave de intensidade de peso, o valor selecionado multiplica o valor do
atributo correspondente para cada projeto.

```text
contribuicao = peso_selecionado * valor_normalizado_do_atributo_no_projeto
```

## Normalizacao dos atributos

Como os atributos podem possuir unidades diferentes, o modulo deve normalizar os
valores antes da aplicacao dos pesos.

Exemplos:

- prazo em meses;
- CAPEX em reais;
- maturidade em categorias;
- risco em classes;
- fonte de recurso como booleano;
- dependencia de predecessor como sim/nao.

Regras possiveis:

### Numerico maior_melhor

```text
valor_normalizado = (valor - minimo) / (maximo - minimo)
```

### Numerico menor_melhor

```text
valor_normalizado = 1 - ((valor - minimo) / (maximo - minimo))
```

### Booleano positivo

```text
sim = 1
nao = 0
```

### Booleano negativo

```text
sim = 0
nao = 1
```

### Ordinal

Exemplo para maturidade:

```text
ideia = 0.20
estudo = 0.40
anteprojeto = 0.60
projeto_basico = 0.80
projeto_executivo = 1.00
```

### Categorico

Deve usar tabela de conversao homologada.

Exemplo para fonte de recurso:

```text
nao_identificada = 0.00
em_prospeccao = 0.40
identificada = 0.75
assegurada = 1.00
```

## Pesos dos atributos

Cada atributo selecionado recebe um peso entre 0 e 1.

O modulo deve permitir dois modos:

### Pesos livres

O usuario controla cada peso de 0 a 1. O score pode ser normalizado pela soma dos
pesos ativos.

```text
score_fase3 = soma(valor_normalizado * peso) / soma(pesos_ativos)
```

Esse modo evita que o score cresca artificialmente quando muitos criterios sao
ativados.

### Pesos normalizados

O usuario define intensidades e o sistema normaliza automaticamente para soma 1.

```text
peso_normalizado = peso_informado / soma(pesos_informados)
score_fase3 = soma(valor_normalizado * peso_normalizado)
```

Regra recomendada:

```text
usar pesos normalizados por padrao
permitir pesos livres somente como modo avancado
```

## Tratamento de atributos ausentes

O modulo deve possuir regra explicita para valores ausentes.

Opcoes possiveis:

- bloquear Fase 3 quando atributo obrigatorio estiver ausente;
- excluir atributo ausente do calculo daquele projeto e renormalizar pesos locais;
- imputar valor neutro;
- imputar pior valor;
- imputar valor medio;
- exigir correcao manual.

Regra recomendada:

```text
atributo obrigatorio ausente -> bloqueia Fase 3 para o projeto
atributo opcional ausente -> ignora atributo no projeto e renormaliza pesos locais
```

Toda imputacao ou renormalizacao local deve aparecer no relatorio.

## Completude minima

A Fase 3 so deve compor o resultado final se houver dados suficientes.

O modulo deve calcular:

```text
completude_projeto = atributos_validos / atributos_esperados
completude_rodada = media(completude_projeto)
```

Regra recomendada:

```text
se completude_projeto < limite_minimo:
    score_fase3 do projeto fica indisponivel
    projeto permanece com ranking das fases disponiveis
```

O limite minimo deve ser configuravel, por exemplo 60%.

## Riscos herdados da Fase 1

Quando a Fase 1 identificar riscos, esses riscos podem entrar na Fase 3 como
atributos/criterios.

Exemplo:

```text
risco_inundacao = 1 se houve intersecao com camada de inundacao
risco_fundiario = 1 se houve intersecao com assentamento, quilombola ou area sensivel
risco_interferencia = 1 se houve intersecao com infraestrutura ou servidao
```

Esses atributos devem seguir as mesmas regras da Fase 3:

- validacao;
- normalizacao;
- direcao do criterio;
- peso ajustavel;
- contribuicao ao score.

Como risco e normalmente penalizador, a direcao tende a ser `menor_melhor`.

## Calculo do score de Fase 3

Para cada projeto:

```text
para cada atributo ativo:
    validar valor
    normalizar valor
    aplicar direcao do criterio
    multiplicar pelo peso

score_fase3 = soma(contribuicoes) / soma(pesos_aplicaveis)
```

Exemplo:

```text
maturidade_normalizada = 0.80
peso_maturidade = 0.30
contribuicao_maturidade = 0.24

prazo_normalizado = 0.60
peso_prazo = 0.20
contribuicao_prazo = 0.12

score_fase3 = soma(contribuicoes) / soma(pesos)
```

## Ranking de Fase 3

O modulo deve gerar ranking proprio da Fase 3:

- `score_fase3`;
- `posicao_fase3`;
- `contribuicao_por_atributo`;
- `atributos_ausentes`;
- `atributos_invalidos`;
- `completude_projeto`.

Esse ranking pode ser usado sozinho ou como entrada para a sintese final da espinha
dorsal.

## Homologacao da rodada de Fase 3

Antes de disponibilizar o resultado para a sintese final, o modulo deve gerar etapa de
homologacao.

Itens minimos:

- arquivo importado;
- numero de projetos;
- atributos reconhecidos;
- atributos selecionados;
- pesos aplicados;
- regras de normalizacao;
- registros invalidos;
- percentual de completude;
- projetos sem score de Fase 3;
- ranking resultante;
- responsavel pela homologacao;
- data da homologacao.

## Versionamento

Cada rodada de Fase 3 deve possuir identificador.

Padrao recomendado:

```text
fase3_atributos_<carteira>_<data>_v<numero>
```

Exemplo:

```text
fase3_atributos_pli_2026_07_02_v1
```

Metadados minimos:

- `rodada_id`;
- `versao`;
- `arquivo_origem`;
- `data_importacao`;
- `data_homologacao`;
- `responsavel`;
- `status`: rascunho, validado, homologado, arquivado;
- `atributos_ativos`;
- `pesos_ativos`;
- `observacoes`.

## Contrato de saida para a espinha dorsal

O modulo deve expor, no minimo:

```json
{
  "rodada_id": "fase3_atributos_pli_2026_07_02_v1",
  "status": "homologado",
  "criterios": [
    {
      "atributo_id": "maturidade",
      "nome_coluna": "maturidade",
      "tipo_dado": "ordinal",
      "direcao": "maior_melhor",
      "peso": 0.30
    }
  ],
  "projetos": [
    {
      "projeto_id": "PLI-001",
      "score_fase3": 0.72,
      "completude": 0.86,
      "posicao_fase3": 4,
      "contribuicao_por_atributo": {
        "maturidade": 0.24,
        "prazo_meses": 0.12
      },
      "atributos_ausentes": [],
      "atributos_invalidos": []
    }
  ]
}
```

## Consumo pela espinha dorsal

A espinha dorsal pode consumir a Fase 3 de tres formas:

1. como ranking independente de atributos de projeto;
2. como componente da sintese final;
3. como avaliacao quantitativa dos riscos levantados na Fase 1.

Exemplo de sintese:

```text
score_final = peso_fase2 * score_fase2 + peso_fase3 * score_fase3
```

Quando a Fase 3 nao atingir completude minima, ela deve ser marcada como nao aplicada
para o projeto ou para a rodada, conforme regra configurada.

## Regras de auditoria

Toda execucao deve registrar:

- usuario responsavel;
- arquivo importado;
- data e hora;
- colunas reconhecidas;
- colunas ignoradas;
- validacoes executadas;
- erros e avisos;
- regras de normalizacao;
- pesos definidos;
- alteracoes de pesos feitas pelo usuario;
- score calculado;
- decisao de homologacao.

## Decisoes conceituais consolidadas

1. A Fase 3 e opcional.
2. A Fase 3 usa atributos de projeto, carteira ou risco herdado da Fase 1.
3. Cada atributo selecionado vira criterio ponderavel.
4. Cada criterio possui controle de peso entre 0 e 1.
5. O valor do atributo deve ser normalizado antes de receber peso.
6. O score deve ser calculado por soma ponderada, preferencialmente com pesos
   normalizados.
7. Dados ausentes devem ser explicitados e nunca ocultados.
8. A Fase 3 so deve compor a sintese final quando houver completude suficiente.

## Proximos detalhamentos

Este documento define o modulo de recepcao, validacao e ponderacao de atributos de
projeto da Fase 3. Os proximos documentos devem detalhar:

- modelo de dados para biblioteca de camadas e rodadas;
- contrato de API para execucao da Fase 3;
- interface de controles de peso;
- regras de sintese entre Fase 1, Fase 2 e Fase 3.
