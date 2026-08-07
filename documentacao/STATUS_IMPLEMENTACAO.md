# Status atual da implementação

Atualizado em 19 de julho de 2026. Este documento descreve o código executável
do SICARD. Os documentos de especificação dos módulos continuam válidos como
referência metodológica, mas podem conter propostas ainda não integradas.

## Arquitetura executada

- FastAPI serve a API e as páginas HTML/CSS/JavaScript.
- PostgreSQL 17 com PostGIS 3.5 persiste demandas, configurações AHP,
  hierarquizações, auditoria, catálogo territorial e conteúdo geoespacial.
- SIGMA-PLI é externo e somente leitura para autenticação, pessoas e
  instituições. O SICARD não grava no banco SIGMA.
- A API segue o prefixo `/api`.
- Páginas públicas usam `/public/`; páginas operacionais usam `/restrict/`.
- URLs canônicas de páginas terminam em `/` e não expõem `.html`.
- URLs antigas conhecidas respondem com redirecionamento permanente `308` e
  preservam a query string.

## Blocos funcionais

### Cadastro de demandas

Implementado para plano, programa e projeto, cada um persistido em uma única
linha no esquema `demandas`. O registro avança no ciclo de vida sem criar uma
cópia em outro esquema. Estão implementados cadastro, consulta pública e
interna, atualização, exclusão, análise, aprovação e transições de status.

O domínio de status possui três fases: `cadastro_analise`, `hierarquizacao` e
`execucao`. A matriz de transições fica no banco e a aprovação usa uma ação
dedicada, que promove a demanda para `analise_aprovada` — status que passa a
compor o universo comparável da hierarquização.

### Configuração AHP e comparação colaborativa

Implementados:

- configurações avulsas e de portfólio;
- seleção do universo comparável;
- critérios, premissas e matriz de comparação pareada;
- cálculo de pesos e razão de consistência;
- homologação da configuração;
- ambientes colaborativos com convite, prazo e token público;
- submissão e consulta das respostas dos colaboradores.

A página pública de colaboração é
`/public/ahp/colaborativa/?token=...`. O cálculo do servidor é a fonte da
verdade para os resultados persistidos.

### Hierarquização

Implementada como rodada persistida em
`hierarquizacao_demandas.hierarquizacao_portfolio`. A rodada mantém um documento
JSONB autocontido com cabeçalho, objetos e resultados das fases.

- Fase 1: configuração de fatiamento, interseções territoriais e relatório de
  elegibilidade.
- Fase 2: extração de favorabilidade a partir de pacote homologado.
- Fase 3: ajuste fino por atributos e completude mínima.
- Síntese: combinação dos resultados e geração do ranking.
- Homologação: fechamento e registro da rodada; o ciclo cadastral das demandas
  permanece sob o serviço próprio de transições de situação.

Há também o fluxo clássico de portfólio em cinco telas: configuração, objetos,
avaliação, ranking e homologação.

As fases da rodada são selecionáveis e independentes. A Fase 1 preserva as
interseções e usa o máximo dos valores restritivos e a média ponderada dos riscos.
A Fase 2 rejeita valores não finitos ou fora da escala homologada de 0 a 1. A
Fase 3 distingue ausência de valor e valor inválido, aplica obrigatoriedade,
completude mínima, imputação ou renormalização local e incorpora riscos sugeridos
pela Fase 1. A síntese registra as contribuições e a justificativa por objeto.

O dicionário de atributos e as rodadas auxiliares da Fase 3 são persistidos em
PostgreSQL; não dependem mais da memória do processo.

### Geoprocessamento

Implementados catálogo de algoritmos, operações vetoriais e raster, execução em
jobs, funções e fluxos, importação de arquivos, carregamento de camadas,
atributos, visualização GeoJSON/raster, cálculo de campos e homologação.

O ciclo físico separa:

1. `camada_importada` e seu conteúdo;
2. `camada_processada` e seu conteúdo;
3. `camada_homologada` e seu snapshot imutável.

As fases metodológicas consomem a biblioteca de camadas homologadas. Vetores são
armazenados como feições PostGIS; rasters são armazenados como GeoTIFF binário.
A memória do processo é cache, não fonte definitiva.

Para processamento real, o frontend usa os endpoints de algoritmos, operações
e jobs.

### Painéis e transparência

O painel público consulta somente registros marcados para publicação e omite
dados pessoais. O painel interno exige sessão e expõe o conjunto operacional.
A decisão de publicar não é automática após aprovação ou homologação.

## Famílias de API registradas

| Prefixo | Finalidade |
|---|---|
| `/api/auth` | Login, sessão, usuário atual e logout |
| `/api/instituicoes`, `/api/pessoas` | Proxy de leitura do SIGMA |
| `/api/demandas`, `/api/planos`, `/api/programas` | Ciclo de vida das demandas |
| `/api/dominios` | Status, tipos e transições |
| `/api/painel` | Projeções pública e interna |
| `/api/geo` | Catálogo territorial e análises espaciais |
| `/api/geoespacial` | Camadas, algoritmos, operações, jobs e produtos |
| `/api/ahp/objetos` | Objetos aptos ao AHP |
| `/api/ahp/universo` | Campos e objetos do universo comparável |
| `/api/ahp/configuracoes` | Configurações, cálculo e homologação AHP |
| `/api/ahp/comparacao-colaborativa` | Ambientes e respostas colaborativas |
| `/api/ahp/hierarquizacoes` | Rodadas, fases, síntese e homologação |

O contrato detalhado e testável está disponível em `/docs` e
`/openapi.json` enquanto a aplicação está em execução.

## Rotas canônicas de páginas

- `/public/`, `/public/cadastro/`, `/public/painel/`,
  `/public/transparencia/`, `/public/documentacao/` e `/public/login/`;
- `/restrict/`, `/restrict/painel/` e `/restrict/demandas/`;
- `/restrict/hierarquizacao/` e `/restrict/hierarquizacao/processos/`;
- `/restrict/ahp/` e as etapas nomeadas da configuração;
- `/restrict/geoespacial/` e suas páginas `visualizador-inputs`,
  `gerador-risco-restricao`, `configuracao-risco-restricao`,
  `gerador-favorabilidade`, `bancada`, `produtos` e `configurador-ajuste`.

## Persistência atual

| Esquema | Conteúdo principal |
|---|---|
| `demandas` | Planos, programas, projetos, indicadores e domínios |
| `ahp` | Objetos, configurações e comparação colaborativa |
| `hierarquizacao_demandas` | Rodadas e resultados autocontidos |
| `geo` | Tipos de regionalização e unidades espaciais |
| `geoprocessamento` | Catálogo, conteúdo, execução e homologação de camadas |
| `auditoria` | Trilha de operações do sistema |

O esquema inicial `cadastro` e o antigo espelho `demandas_aprovadas` são etapas
históricas das migrations. Após a migration `015`, o modelo vigente usa o
esquema único `demandas`.

## Limites conhecidos

- A integração ponta a ponta das três fases existe nos serviços e telas, mas
  ainda há dois fluxos de interface: o fluxo metodológico em três fases e o
  fluxo clássico de portfólio em cinco etapas.
- A extração territorial da Fase 2 está operacional para projetos pontuais. Os
  métodos zonais previstos na metodologia dependem de geometrias lineares ou
  poligonais consolidadas no contrato das demandas.
- Alguns documentos de especificação descrevem o desenho-alvo e não devem ser
  interpretados como comprovação de endpoint pronto.
- A cobertura automatizada concentra-se em autenticação, painel, política de
  caminhos, geoprocessamento e registro de rotas; não cobre todas as operações
  geoespaciais com dados reais.
