# Espinha dorsal do motor de hierarquização do SICARD

## Objetivo do documento

Este documento define a arquitetura conceitual do motor de hierarquização do
SICARD — Sistema Inteligente de Cadastro e Ranking de Demandas, no domínio de
logística e transportes e no contexto de origem do PLI-SP.

Objeto de demanda é o termo geral para plano, programa ou projeto. Os exemplos
de projetos e os identificadores técnicos deste documento são preservados.
O vocabulário de referência está em [Terminologia oficial](../geral/TERMINOLOGIA.md).
Esta especificação do motor é complementar à página pública de
[Visão geral do SICARD](/public/documentacao/visao-geral/), que apresenta o sistema inteiro.

A ideia central e permitir que um conjunto grande de projetos seja avaliado de forma
automatizada, configuravel e auditavel, sem depender necessariamente de analise manual
projeto a projeto. Para isso, o sistema deve operar por fases independentes, mas
correlacionadas, cada uma com entradas, regras de processamento e saidas proprias.

A espinha dorsal nao e o modulo que cria as camadas ou os indicadores. Ela e o motor
que consome produtos previamente preparados pelos modulos de apoio e aplica as regras
de triagem, hierarquizacao, ajuste e sintese.

## Principio geral

O sistema deve ser articulado em tres fases metodologicas:

1. Fase 1: Elegibilidade territorial.
2. Fase 2: Favorabilidade territorial — município e rede rodoviária.
3. Fase 3: Priorização de demandas por atributos, incluindo riscos identificados na Fase 1.

O nome da Fase 2 não altera a representação dos insumos: município, grade e
rede são identificados conforme a unidade espacial efetivamente utilizada.

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

### Matriz independente e julgamentos AHP

A matriz de critérios e premissas enviada constitui um registro próprio e
imutável, identificado por UUID. Cada hierarquização referencia uma única
matriz por vez; uma mesma matriz pode ser utilizada por várias hierarquizações.
O julgamento AHP referencia diretamente essa matriz, independentemente da
existência de uma hierarquização. Sem processo associado à matriz, o julgamento
é avulso. Os critérios e as premissas não são obtidos por dependência da rodada.

A troca de matriz exige nova verificação dos critérios, da estrutura e das
premissas. Pesos de outra matriz não são transferidos automaticamente. O reuso
somente é admitido quando o conteúdo é equivalente e há confirmação explícita;
mudanças de critérios, estrutura ou premissas exigem novos julgamentos e
recálculo dos pesos. Os resultados derivados devem ser recalculados após a troca,
mantendo-se os julgamentos originais associados à matriz que avaliaram.
Metadados de arquivo e aba não caracterizam alteração metodológica.
O julgamento AHP destina-se exclusivamente aos critérios da Fase 3
(Priorização de demandas por atributos). Critérios espaciais destinam-se à
Fase 2 e não participam da comparação pareada. A coluna Etapa identifica o
enquadramento; sua ausência ou inconsistência com a coluna Fase exige correção.
A matriz integral permanece imutável, enquanto o julgamento conserva somente
as linhas da Fase 3, na ordem original, com ao menos dois critérios.
Registros históricos de superfícies ou julgamentos com critérios de outras
fases permanecem consultáveis, sem novas respostas, convites, análises ou
homologação. Não se reinterpretam respostas históricas nem se removem linhas
de matrizes já respondidas. Na Fase 2 permanecem a média simples e os pesos
explicitamente informados, sem nova derivação por comparação pareada.

Nos novos convites de julgamentos por dimensão, o responsável seleciona uma ou
mais dimensões do recorte da Fase 3 para cada colaborador. O recorte contém os critérios
dessas dimensões, na ordem original, e deve conter ao menos dois critérios.
O convite individual e o formulário autenticado pelo e-mail e código de acesso
apresentam somente esse recorte. A resposta conserva um snapshot dos critérios
atribuídos; o recorte não pode ser alterado após o início do preenchimento.
Convites integrais cobrem o conjunto completo da Fase 3, desde que o julgamento
atenda ao enquadramento vigente.

Análises agregam somente respostas do mesmo recorte, inclusive quando recortes
distintos possuem o mesmo número de critérios. Os pesos resultantes de recortes
parciais são locais e não substituem os pesos do conjunto completo da Fase 3.
A homologação integral exige a avaliação desse conjunto; não se presume peso
entre dimensões nem se aplica peso AHP da Fase 3 aos critérios da Fase 2.

No formulário público, a ajuda de consistência aparece somente após mais de
70% dos pares efetivamente respondidos e quando RC ≥ 0,10. Até oito pares
respondidos com maior desvio logarítmico em relação às razões dos pesos são
avaliados mediante simulações isoladas na escala oferecida pelo formulário;
os três com maior potencial de redução do RC são indicados para revisão.
O diagnóstico é provisório enquanto houver pares não respondidos, cujos
valores iniciais de igualdade não são contabilizados como respostas.
A ajuda não modifica julgamentos, não garante consistência por uma revisão
isolada e mantém o requisito de envio RC < 0,10.

### Fase 1 — Elegibilidade territorial

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

### Fase 2 — Favorabilidade territorial — município e rede rodoviária

A Fase 2 e o nucleo do ranking tecnico-territorial.

Ela consome uma ou mais superficies de favorabilidade territorial e cruza essas
superficies com a geometria dos projetos. A favorabilidade pode ter sido gerada por
algebra de mapas, media ponderada com pesos explicitamente informados, modelo de rede ou outro procedimento
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

### Fase 3 — Priorização de demandas por atributos

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

### Consulta por demanda e ciclo de vida

Os resultados permanecem associados à demanda em cada rodada, preservando a
leitura separada das fases, dos pesos, do índice final e da posição no grupo.
Uma demanda pode participar de várias hierarquizações; os resultados de uma
rodada não substituem os de outra. O painel restrito organiza a
consulta por tipo de demanda, hierarquização e demanda desde a criação da rodada,
com uma única geometria cadastral por demanda e apresentação da situação da rodada.
Demandas sem hierarquização continuam disponíveis na raiz de seu tipo.

A homologação explícita conclui o status técnico das demandas ainda em
hierarquização na mesma transação da homologação. Situações de execução, suspensão,
retirada ou publicação não são sobrescritas. Conclusão do cálculo não equivale a
homologação nem a publicação.

### Gestão das pendências de atributos

A Central de pendências identifica automaticamente as demandas cujo status
pertence à fase `hierarquizacao` no domínio oficial e que apresentam atributos
cadastrais ou dinâmicos não preenchidos. A identificação utiliza o cadastro
oficial e as colunas vigentes de cada rodada, independentemente da existência
de solicitação. Zero e falso são valores preenchidos; nulos e textos vazios
permanecem pendentes. Demandas de outras fases e contextos com atributos
completos não integram o bloco de atributos.

A consulta não cria solicitações, não altera status e não envia notificações.
O gestor ou administrador seleciona a pendência, preenche o motivo e a mensagem
externa e salva o pedido; o envio exige ação explícita posterior. As anotações
técnicas da pendência permanecem internas. O envio pela Central anexa o PDF já
gerado na análise cadastral, sem gerar outro documento; sua ausência impede a
notificação. A notificação registra responsável, data, destinatário e identificação
do anexo, separadamente do solicitante e da data do cadastro. A prévia abaixo da
tabela apresenta destinatário, texto integral e anexo, sem enviar mensagem.
O envio confirmado revalida o conteúdo e utiliza o feedback de processos do SICARD;
somente a resposta do servidor atualiza o resultado da notificação. Assunto,
texto integral, revisão, identificação do anexo e tentativas anteriores são
preservados no registro de auditoria. No bloco cadastral, a mensagem é o próprio
texto do parecer da análise; no bloco de atributos, é a mensagem salva do gestor.
O ciclo interno do pedido permanece separado da comunicação: `registrada` indica registro ainda aberto
e `atendida` indica sua conclusão. A migração 154 renomeia o antigo estado
`solicitada`, preservando o histórico; não o utiliza como prova de comunicação.
Na Central, apresenta-se somente o estado da notificação, inicialmente
`nao_enviado` quando não houver evidência de envio.
No bloco cadastral, a página de gerenciamento apresenta diretamente a
notificação e permite reemitir o parecer da análise com as perguntas vigentes,
preservando respostas e decisões. A migração 155 mantém versões anteriores,
fontes e hashes. O envio exige confirmação humana da revisão da versão vigente;
alterações nas fontes ou no PDF invalidam essa liberação. Essa reemissão não se
aplica a pedidos de atributos, atendidos ou com envio em andamento, aceito ou
indeterminado e não modifica a metodologia de pontuação da hierarquização.
O parecer PDF adota a identidade visual dos relatórios da Fase 3 e apresenta a
identificação seguida de um único bloco de análise e parecer. Nesse bloco,
destacam-se primeiro a conclusão, seu motivo e a lista do que enviar ou corrigir,
quando aplicável; a fundamentação reúne perguntas, respostas e geometria em uma
única tabela. Na complementação, o resultado dos critérios é distinguido da
decisão final do analista. Ao final, a assinatura apresenta analista, local e
data em texto simples, sem seção numerada ou quadro de responsabilidade.
As respostas negativas aplicáveis são expressas em frases declarativas que
explicitam a condição não atendida; respostas ausentes não são convertidas em
reprovação. A conclusão geométrica explicita adequação, necessidade de ajuste ou
confirmação pendente, conforme o registro do analista. O bloco da conclusão
utiliza as cores do status efetivamente adquirido pela demanda após a análise,
lidas da paleta oficial única em `assets/js/status-colors.js`, sem inferência
pelo resultado classificatório. As cores utilizadas integram as fontes
versionadas e sua alteração exige nova revisão do documento.
As orientações repetidas são consolidadas; a descrição pública da solicitação
de complementação integra o encaminhamento, sem exposição das anotações internas.
A autoria é obtida pelo nome da pessoa vinculada ao ID do analista no SIGMA;
ausência de identificação é explicitada. O local institucional é São Paulo - SP.
A migração 156 persiste a data da análise separadamente da emissão do documento,
utilizando o registro legado anterior às reemissões quando aplicável. A reemissão
não altera essa data. Modelo, autoria, data e descrição da solicitação integram
as fontes verificadas para a revisão, sem alteração das perguntas ou da pontuação.
A coleta de retornos
DSN/MDN correlaciona a mensagem e o destinatário em caixa IMAP somente leitura,
sem presumir abertura quando não houver confirmação. O cumprimento decorre das
categorias salvas e da conclusão registrada, não do envio ou da leitura do e-mail.
O registro revalida o contexto, as ausências e a
inexistência de pedido aberto, preservando autoria e histórico. Pendências sem
rodada aberta permanecem visíveis com indicação do impedimento; a consulta
não reabre resultados homologados, suspensões ou retiradas. O cadastro e a
geometria mantêm fluxo independente, gerido pelo analista ou administrador.

### Publicação dos resultados homologados

A divulgação exige ação explícita **Publicar**, na barra de controles de
**Homologação, Ranking e Publicação**, com uma única hierarquização homologada
selecionada. Gestores e administradores podem publicar; analistas têm somente
leitura no MAD e operadores não têm acesso. A API aplica as mesmas restrições.
Ranking ausente, fases ou síntese desatualizadas, complementação pendente,
divergência de composição do grupo ou configuração de atributos desatualizada
impedem a publicação.

A publicação controla somente os resultados individuais no painel público:
elegibilidade e índice de risco, favorabilidade de rede e territorial,
priorização, índice geral e posição efetivamente registrada no ranking.
Os índices originais são preservados, sem recálculo, renormalização ou posições
presumidas. Cada resultado identifica a rodada e o grupo comparável; múltiplas
rodadas publicadas são apresentadas separadamente. A ausência de publicação não
oculta os dados cadastrais da demanda nem altera o painel restrito.

O estado é persistido em `cabecalho_grupo.publicacao`, no JSON da rodada, com
autoria, data e assinatura dos resultados. Publicação e revogação utilizam
`historico_homologacao`. A operação é transacional e idempotente para a mesma
versão. A reversão da homologação revoga a publicação na mesma transação;
alterações dos resultados invalidam a versão divulgada. Recalcular e homologar
novamente não publica os novos resultados: exige-se nova ação explícita.
A consulta pública rejeita publicação sem vínculo com a versão corrente,
resultados desatualizados e composição divergente do grupo.
Somente o resumo individual é divulgado, sem documentos internos, caminhos de
arquivos, autoria da publicação ou dados pessoais. Essas regras de divulgação
não alteram a metodologia de cálculo.

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
geoespaciais continuas, reescalonamento para 0 a 1, ponderacao explicitamente informada e extracao
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

- Fase 1: Elegibilidade territorial, para avaliar restrições e riscos.
- Fase 2: Favorabilidade territorial — município e rede rodoviária, para avaliar o mérito técnico-territorial.
- Fase 3: Priorização de demandas por atributos, para incorporar atributos próprios e avaliar riscos.

Essa separacao evita redundancia metodologica e permite que o sistema funcione com
diferentes niveis de maturidade dos dados.

Em um cenario minimo, o sistema pode apenas filtrar projetos por restricao.
Em um cenario intermediario, pode ranquear por favorabilidade territorial.
Em um cenario completo, pode combinar restricao, favorabilidade e atributos do
projeto em uma sintese final ponderada.

Assim, o sistema permanece automatizavel, configuravel e tecnicamente defensavel para
diferentes conjuntos de projetos do PLI.
