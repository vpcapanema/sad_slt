# Status atual da implementação

Atualizado em 24 de outubro de 2026. Este documento descreve o código executável
do SICARD. Os documentos de especificação dos módulos continuam válidos como
referência metodológica, mas podem conter propostas ainda não integradas.

As denominações seguem a [terminologia oficial](geral/TERMINOLOGIA.md).
Objeto de demanda é o termo geral para plano, programa ou projeto.

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
`/public/analise-multicriterio/{token}/`. O cálculo do servidor é a fonte da
verdade para os resultados persistidos.

### Hierarquização

Implementada como rodada persistida em
`hierarquizacao_demandas.hierarquizacao_portfolio`. A rodada mantém um documento
JSONB autocontido com cabeçalho, objetos e resultados das fases.

- Fase 1 — Elegibilidade territorial: preparação da entrada, interseções
  independentes e relatório das sobreposições com restrições e riscos.
- Fase 2 — Favorabilidade territorial — município e rede rodoviária:
  preparação da entrada, interseções e consulta dos atributos de grade e rede,
  preservados por fragmento.
- Fase 3 — Priorização de demandas por atributos: normalização, ponderação e
  tratamento de completude dos atributos dos objetos de demanda.
- Síntese: combinação dos resultados e geração do ranking.
- Homologação: fechamento e registro da rodada; o ciclo cadastral das demandas
  permanece sob o serviço próprio de transições de situação.

As interfaces vigentes são a gestão das hierarquizações em `/restrict/hierarquizacao/processos/`,
as três fases em `/restrict/hierarquizacao/fase-1/`, `/fase-2/` e `/fase-3/`
e a página Homologação, Ranking e Publicação em `/restrict/hierarquizacao/homologacao-ranking-publicacao/`. As cinco telas antigas
de etapas avulsas do portfólio foram removidas.

As fases da rodada são selecionáveis e independentes. As interfaces atuais das
Fases 1 e 2 preservam as interseções em produtos geoespaciais; sua execução não
substitui os resultados registrados da rodada nem aplica homologação automática.
Na Fase 2, estatísticas exploratórias não alteram os índices oficiais.
A Fase 3 distingue ausência de valor e valor inválido, aplica obrigatoriedade,
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
| `/api/dominios` | Status, tipos, transições e famílias/tipos de adversidade |
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
- `/public/documentacao/visao-geral/`, `/public/documentacao/glossario/`
  e `/public/documentacao/tutoriais/`;
- `/restrict/`, `/restrict/painel/` e `/restrict/demandas/`;
- `/restrict/hierarquizacao/` e `/restrict/hierarquizacao/processos/`;
- `/restrict/ahp/` e as etapas nomeadas da configuração;
- `/restrict/geoespacial/` e suas páginas `gerador-camadas-territoriais`,
  `extracao-atributos`, `extracoes-atributos`, `visualizador-camadas`,
  `explorador-camadas`, `visualizador-bases-geoespaciais` e `bancada`.
  `produtos` redireciona para `visualizador-camadas`; os antigos geradores
  de risco/restrição e favorabilidade e o configurador de ajuste estão arquivados.

## Persistência atual

| Esquema | Conteúdo principal |
|---|---|
| `demandas` | Planos, programas, projetos, indicadores e domínios |
| `ahp` | Objetos, configurações e comparação colaborativa |
| `hierarquizacao_demandas` | Rodadas e resultados autocontidos |
| `dominios` | Famílias e tipos de adversidade das camadas |
| `geo` | Tipos de regionalização e unidades espaciais |
| `geoprocessamento` | Catálogo, conteúdo, execução e homologação de camadas |
| `auditoria` | Trilha de operações do sistema |

As camadas da Fase 1 são vinculadas aos tipos de adversidade por
`dominios.camada_adversidade`, editável na área administrativa. A consulta
`POST /api/dominios/adversidades/camadas/resolver` resolve referências exatas ou
identificadores canônicos dos componentes/arquivos. Família e tipo são exibidos na
seleção e na revisão das fontes e preservados no GeoPackage e nos metadados dos
resultados. Não determinam risco, restrição ou peso; bases sem vínculo são
identificadas explicitamente, sem alterar o cálculo.

O esquema inicial `cadastro` e o antigo espelho `demandas_aprovadas` são etapas
históricas das migrations. Após a migration `015`, o modelo vigente usa o
esquema único `demandas`.

## Limites conhecidos

- A execução atual da Fase 2 preserva índices e classes por fragmento das
  interseções, sem agregá-los em um novo índice oficial por objeto de demanda.
- Alguns documentos de especificação descrevem o desenho-alvo e não devem ser
  interpretados como comprovação de endpoint pronto.
- A cobertura automatizada concentra-se em autenticação, painel, política de
  caminhos, geoprocessamento e registro de rotas; não cobre todas as operações
  geoespaciais com dados reais.
