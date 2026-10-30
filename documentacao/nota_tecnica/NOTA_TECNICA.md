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
| **Versão**                 | 1.76                                                                                                                                                                      |
| **Data de emissão**        | 30/10/2026                                                                                                                                                               |
| **Classificação**         | Documento técnico-metodológico de entrega ao cliente                                                                                                                   |
| **Sistema**                 | SICARD — Sistema Inteligente de Cadastro e Ranking de Demandas                                                                                                        |
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

| 1.10    | 26/09/2026 | `[preencher]` | Registro dos operadores nativos da extração geoespacial, preservação das correspondências na saída e distinção entre atributo nulo e ausência de incidência territorial. |
| 1.11    | 05/10/2026 | `[preencher]` | Registro do cenário exploratório municipal segregado, com matriz retificada, superfícies por média simples, preservação de ausências e bloqueio de uso do TomTom com cobertura observada inferior a 95%, sem substituição da metodologia operacional vigente. |
| 1.12    | 05/10/2026 | `[preencher]` | Retificação do cenário exploratório: favorabilidade da rede calculada por trecho DER, mantendo o território municipal; registro da coleta real TomTom, cobertura insuficiente e exclusão do componente da síntese. |
| 1.13    | 17/10/2026 | `[preencher]` | Registro da preparação operacional da Elegibilidade v2: entradas do storage ou da hierarquização, preservação das geometrias cadastrais, listas separadas de restrição e risco, prévia e envio explícito à bancada, sem classificação automática ou homologação nesta entrega. |
| 1.14    | 17/10/2026 | `[preencher]` | Explicitação da exclusividade entre as origens de entrada da Elegibilidade v2: camadas selecionadas ou demandas de uma hierarquização, com limpeza prévia para troca de origem e substituição integral da entrada no envio à bancada. |
| 1.15    | 17/10/2026 | `[preencher]` | Separação dos estados de seleção, prévia e bancada na Elegibilidade v2, com envio por grupo à prévia e confirmação única das camadas marcadas no rodapé de seu painel, sem classificação automática ou homologação. |
| 1.16    | 17/10/2026 | `[preencher]` | Transferência de referências sem leitura geométrica na confirmação do explorador; identificação dos componentes e validação no envio à prévia, com preservação dos estados anteriores em caso de falha e controle de conflitos entre arquivos e camadas internas. |
| 1.17    | 18/10/2026 | `[preencher]` | Aplicação da normalização cadastral poligonal às demandas no envio da prévia à bancada, com parâmetros explícitos, arquivo derivado integral e rastreabilidade; acompanhamento dos dois envios e preservação dos conjuntos anteriores em caso de falha ou cancelamento. |
| 1.18    | 18/10/2026 | `[preencher]` | Tratamento recursivo de coleções geométricas na normalização das demandas, com conversão de todos os componentes segundo seu tipo, união por feição e rastreabilidade, sem perda de pontos, linhas, atributos ou identificadores de origem. |
| 1.19    | 19/10/2026 | `[preencher]` | Produção da camada de elegibilidade territorial mediante interseções GDAL/OGR independentes, soma de áreas por feição, campos de restrição e risco, preservação integral da entrada e inclusão automática da saída persistida na bancada. |
| 1.20    | 19/10/2026 | `[preencher]` | Apresentação dinâmica dos resultados por base, revisão explícita de aliases em português brasileiro, mapa-síntese e relatório PDF completo, com pacote de geometrias e verificação de integridade das saídas. |
| 1.21    | 19/10/2026 | `[preencher]` | Persistência das áreas totais e interseções vinculadas no GeoPackage, painel integrado de mapa, tabela e gráfico por feição, apresentação em km² e hectares, percentuais por demanda e persistência da revisão dos nomes. |
| 1.22    | 19/10/2026 | `[preencher]` | Consolidação integral das demandas de uma hierarquização em um único GeoPackage e uma única camada no envio confirmado da prévia à bancada, preservando registros, atributos e rastreabilidade das fontes, sem dissolução entre demandas. |
| 1.23    | 19/10/2026 | `[preencher]` | Persistência do acompanhamento das execuções entre processos e reinícios, preservação dos nomes cadastrais na apresentação e limitação da complexidade dos tiles por fragmentação visual, sem alteração dos arquivos, áreas ou geometrias de cálculo. |
| 1.24    | 20/10/2026 | `[preencher]` | Explicitação dos limites da documentação pública: distinção entre especificação metodológica, disponibilidade operacional e homologação, sem alteração dos critérios, operadores ou cálculos. |
| 1.25    | 21/10/2026 | `[preencher]` | Operacionalização do bloco de conferência e execução da Favorabilidade V2, com preparação cadastral da entrada, interseções independentes, soma de áreas e preservação dos atributos das superfícies por fragmento, sem agregação de classes ou índices nem alteração dos resultados registrados. |
| 1.26    | 21/10/2026 | `[preencher]` | Apresentação conjunta de todas as sobreposições em rosca única por análise nas páginas de Elegibilidade e Favorabilidade, com uma fatia por combinação demanda e feição de origem, sem agrupamento por nome, camada, classe ou índice. |
| 1.27    | 21/10/2026 | `[preencher]` | Distinção entre a revisão física das fontes do Storage e o token temporário de visualização na preparação e execução da Favorabilidade, preservando o bloqueio de alterações reais sem acusar mudança pela simples geração da prévia. |
| 1.28    | 21/10/2026 | `[preencher]` | Integração dos resultados da Favorabilidade ao painel de mapa, tabela, detalhes e rosca da Elegibilidade, com revisão persistida de nomes, reabertura de GeoPackages e pacote PDF/camadas segregados da Fase 1; preservação dos índices registrados como última subseção, sem agregação ou alteração de seus valores. |
| 1.29    | 21/10/2026 | `[preencher]` | Apresentação dos atributos originais de índice por dimensões e classe de grade e rede nos resultados da Favorabilidade; substituição da rosca por gráfico de pontos por demanda e feição, rampa contínua de 0 a 1 no mapa e relatório por índices e classes, com sinalização de dados ausentes ou inválidos e área restrita à informação técnica complementar. |
| 1.30    | 21/10/2026 | `[preencher]` | Simplificação e ordenação decrescente das listas de Favorabilidade; substituição da consulta de índices registrados por conjuntos de índices e classes das interseções por demanda, separando grade e rede, com seleção exclusiva de medidas exploratórias de tendência central, dispersão e posição, sem persistência ou alteração dos índices oficiais. |
| 1.31    | 22/10/2026 | `[preencher]` | Padronização editorial da denominação do SICARD, do termo objeto de demanda e dos nomes das três fases; distinção entre ciclo de vida, fases metodológicas e representações espaciais; preservação dos cálculos, contratos e regras de homologação. |
| 1.32    | 22/10/2026 | `[preencher]` | Padronização das tabelas de resultados da Elegibilidade, inclusão de resumo nominal das feições de Restrição e Risco por demanda, apresentação de km² com duas casas e hectares com quatro casas decimais e simplificação da legenda visível da rosca, sem alteração dos cálculos ou produtos exportados. |
| 1.33    | 22/10/2026 | `[preencher]` | Correção da aderência visual das barras de filtros à referência de Agrupamento de Demandas; inclusão de consulta pelo modal de objetos e edição inline exclusiva do nome no cadastro original, mediante vínculo confirmado e permissão de operação, preservando interseções e produtos da análise. |
| 1.34    | 22/10/2026 | `[preencher]` | Extensão do padrão de tabelas à Favorabilidade: conferência das camadas, índices por feição e conjuntos por demanda com filtros independentes, paginação e contadores; consulta pelo modal de objetos e edição exclusiva do nome cadastral, sem alterar a composição da execução, estatísticas, índices, classes ou produtos geoespaciais. |
| 1.35    | 23/10/2026 | `[preencher]` | Ampliação do resumo da Elegibilidade com seleção individual, perímetro em metros, áreas totais em km² e hectares e cores nominais de Restrição e Risco; persistência da revisão do nome de demandas sem vínculo cadastral, vinculada ao usuário e à assinatura da saída, com reaplicação na reabertura e nos relatórios regenerados, preservando o GeoPackage original. |
| 1.36    | 23/10/2026 | `[preencher]` | Alteração da rosca da Elegibilidade para representar todas as demandas pela área total, inclusive sem interseção, com cada feição intersectada sobreposta à própria fatia por transparência e proporção da área da demanda, sem segundo anel, normalização pela soma das interseções ou atribuição de cobertura exclusiva; preservação das áreas e da seleção sincronizada com mapa e tabelas. |
| 1.37    | 23/10/2026 | `[preencher]` | Apresentação da Favorabilidade com gráficos de barras verticais por superfície, colunas separadas de municípios e rede, conjuntos de valores separados por vírgulas e controles de simbologia para índice original, dimensionado e classes; distinção explícita entre bases integrais atuais e recortes históricos, preservando índices, classes e cálculos da rodada. |
| 1.38    | 23/10/2026 | `[preencher]` | Individualização das cores das barras de Favorabilidade e inclusão de legendas interativas em grade uniforme, exibindo somente o nome da demanda; alinhamento dos seletores de superfície e simbologia e carregamento automático da camada oficial referenciada pela execução, sem escolha de origem, preservando a identidade das combinações e a escala dos índices. |
| 1.39    | 23/10/2026 | `[preencher]` | Remoção dos nomes e classes sob as barras de Favorabilidade, mantendo os nomes exclusivamente na legenda, os valores numéricos sobre as barras e a identificação completa nos detalhes e descrições acessíveis, sem alteração dos índices. |
| 1.40    | 23/10/2026 | `[preencher]` | Substituição das barras de Favorabilidade por intervalos com pontos, com uma linha por demanda identificada somente pelo nome, um ponto por feição e traço entre extremos válidos; cores e legenda por feição, separação visual de pontos próximos e preservação dos índices, das identidades, das ausências e da seleção sincronizada. |
| 1.41    | 23/10/2026 | `[preencher]` | Registro, por objeto de demanda, dos resultados das Fases 1 e 2 em `dados_hierarquizacao` ao fim do cálculo, com histórico acumulado das execuções; conversão de cada camada de risco sobreposta na Fase 1 em critério da Fase 3 (área sobreposta, em hectares, menor é melhor, escala absoluta), em grupo próprio de pesos, com participação equivalente à dos demais grupos; substituição do tratamento gerencial de risco (penalizar, ignorar ou barrar) por esses critérios ponderados; proteção das hierarquizações homologadas e arquivadas contra regravação e sinalização de síntese desatualizada. |
| 1.42    | 23/10/2026 | `[preencher]` | Inclusão do Resumo da Elegibilidade nos resultados da Fase 1: uma linha por objeto de demanda sem restrição, com camadas de risco, área de sobreposição (união, em hectares), porcentagem sobreposta e índice de risco ambiental e territorial (1 − área sobreposta ÷ área da demanda, de 0 a 1); inclusão da tabela no PDF, no pacote de saída e no relatório da Fase 1 da hierarquização, sem alteração da classificação de elegibilidade. |
| 1.43    | 24/10/2026 | `[preencher]` | Vinculação temática das bases da Fase 1 às famílias e aos tipos de adversidade, com manutenção administrativa e preservação da taxonomia nos metadados dos resultados; independência em relação ao papel de risco ou restrição escolhido pelo usuário, sem alteração do índice ou de seus pesos. |
| 1.44    | 24/10/2026 | `[preencher]` | Substituição dos critérios de área sobreposta por camada da Fase 3 pelo Índice de risco ambiental e territorial do Resumo da Elegibilidade de cada demanda; preservação da escala de 0 a 1, com relação positiva e peso único no grupo de risco; manutenção de valores ausentes para demandas sem resumo ou com restrição e preservação dos resultados históricos. |
| 1.45    | 25/10/2026 | `[preencher]` | Inclusão da documentação de transparência das camadas territoriais: distinção entre a prévia histórica de 46 indicadores e o catálogo da carga aplicada e auditada, com 204 atributos setoriais e 18 combinados municipais persistidos; registro de fontes, fórmulas, períodos, cobertura, sigilos, proveniência e percentuais municipais de baixa renda, sem alteração das regras das fases ou homologação automática de combinações. |
| 1.46    | 25/10/2026 | `[preencher]` | Ampliação do acervo setorial de 2022 para os campos integrais de 18 conjuntos oficiais, incluindo rendimento do responsável, entorno e registro de nascimento, com auditoria de valores e sinais por arquivo, preservação da malha e recálculo dos combinados existentes, sem homologação de novos critérios. |
| 1.47    | 25/10/2026 | `[preencher]` | Reformulação dos 55 critérios do modelo de nove dimensões como regras avaliativas derivadas das premissas, com sincronização das duas tabelas do modelo e do documento de modelagem espacial; preservação das premissas, relações, métricas, fontes e caráter mandatório, sem alteração de pesos, da matriz espacial v3 ou dos resultados históricos. |
| 1.48    | 25/10/2026 | `[preencher]` | Adequação da redação dos 55 critérios à relação explícita entre a grandeza medida e a favorabilidade territorial, na forma “Quanto maior [...], maior/menor a favorabilidade territorial”; preservação dos demais campos e das classes de modelagem, sem mudança de cálculo ou homologação automática de indicadores. |
| 1.49    | 25/10/2026 | `[preencher]` | Generalização da definição de critério pela relação entre a grandeza medida e o fenômeno avaliado; sincronização do glossário público quanto a premissa, critério, variável, relação, fenômeno avaliado e dimensão de critérios, sem alteração das regras ou dos cálculos do modelo. |
| 1.50    | 25/10/2026 | `[preencher]` | Retificação conceitual das revisões 1.47 a 1.49: critério como propriedade avaliada; frase direcional como premissa de avaliação, distinta de seu fundamento. Restauração dos nomes dos 55 fatores do acervo anterior e correção do glossário para as 12 dimensões oficiais, sem alteração das premissas originais, dos cálculos ou dos resultados históricos. |
| 1.51    | 26/10/2026 | `[preencher]` | Documentação do gerador autônomo de superfícies vetoriais: critérios e premissas separados, cobertura comprovada, transformação mínimo–máximo, persistência de valores e composição por média simples ou AHP; julgamentos vinculados ao conjunto salvo sem sobrescrita da hierarquização ou homologação automática. |
| 1.52    | 27/10/2026 | `[preencher]` | Separação da complementação cadastral/geometria e da coleta de atributos da hierarquização; registro das pendências por demanda a partir da matriz enviada, solicitação imediata ou adiada, validação da conclusão e rastreabilidade das notificações, sem reabertura da aprovação cadastral ou alteração das fórmulas de escore. |
| 1.53    | 27/10/2026 | `[preencher]` | Unificação das colunas da Fase 3 e da complementação nos grupos Cadastro e Dinâmicos, incluindo o Configurador; conclusão automática ao salvar todos os valores válidos, separação do risco derivado da Fase 1, preservação das escalas ordinais declaradas e verificação de compatibilidade dos critérios antes da síntese. |
| 1.54    | 27/10/2026 | `[preencher]` | Descarte imediato dos resultados calculados da Fase 3 e da síntese quando atributos, critérios, pesos ou fases de origem mudam; limpeza dos respectivos relatórios e ranking e apresentação somente de valores correntes, sem preservar ou exibir cálculos anteriores como atuais. |
| 1.55    | 27/10/2026 | `[preencher]` | Registro de produto exploratório avulso de influência da rede em células de 200 m, derivado dos índices por trecho da rodada TomTom de 27/10/2026, com alocação euclidiana, pertinência fuzzy linear, identificação das lacunas originais e auditoria dos rasters, sem homologação ou alteração dos resultados cadastrais. |
| 1.56    | 27/10/2026 | `[preencher]` | Inclusão de superfícies raster na Fase 2, com média ponderada pela área efetivamente intersectada das células, justificativa para o tratamento das bordas, cobertura válida, distinção entre zero e NoData e preservação dos recortes para auditoria e registro explícito. |
| 1.57    | 27/10/2026 | `[preencher]` | Reestruturação metodológica dos relatórios das Fases 1 e 2 com cabeçalho contextualizador padronizado, apresentação dos resultados principais por demanda, mapas completos das fontes no contexto estadual (incluindo superfícies de grade e rede na Fase 2), seção explícita dos critérios utilizados e reforço da rastreabilidade por revisão física das fontes e metadados. |
| 1.58    | 27/10/2026 | `[preencher]` | Padronização institucional dos relatórios das Fases 1 e 2 com marca, nome completo do sistema, slogan, títulos contextualizados, identificação em campos e tópicos justificados; aplicação das cores de situação na Fase 1 e legenda em duas colunas com gradações e texturas cartográficas nas camadas extensas, sem alteração de resultados ou classificação. |
| 1.59    | 27/10/2026 | `[preencher]` | Explicitação da finalidade de implantação/execução nos títulos dos relatórios das Fases 1 e 2 e extensão do padrão institucional à emissão autenticada do relatório da Fase 3, com prioridade, ranking, completude, critérios, pesos, contribuições e pendências persistidos; bloqueio de emissão com resultados desatualizados, sem alteração de cálculo ou homologação. |
| 1.60    | 28/10/2026 | `[preencher]` | Vinculação da consulta dos resultados individuais às respectivas rodadas nos painéis público e restrito, com agrupamento por tipo e hierarquização, geometria cadastral única por demanda e distinção entre conclusão técnica, homologação e controle de publicação pública, sem alteração das fórmulas ou dos pesos. |
| 1.61    | 28/10/2026 | `[preencher]` | Individualização das matrizes de critérios e premissas, vínculo direto dos julgamentos AHP à matriz e associação de uma matriz por hierarquização; verificação de equivalência e confirmação explícita para reuso de pesos, com novos julgamentos e recálculo quando houver alteração metodológica. |
| 1.62    | 28/10/2026 | `[preencher]` | Substituição da carga antecipada dos valores setoriais pela disponibilização integral dos metadados e obtenção, validação e persistência dos atributos originais sob demanda, sem alteração das fórmulas ou dos critérios metodológicos. |
| 1.63    | 28/10/2026 | `[preencher]` | Individualização dos convites AHP por uma ou mais dimensões da matriz; preservação do recorte respondido e agregação somente entre respostas de critérios equivalentes, sem conversão automática de pesos locais em pesos globais. |
| 1.64    | 28/10/2026 | `[preencher]` | Inclusão de ajuda consultiva de consistência após mais de 70% dos pares respondidos, com indicação de pares para revisão sem alteração automática dos julgamentos. |
| 1.65    | 28/10/2026 | `[preencher]` | Restrição dos julgamentos AHP aos critérios da Fase 3, filtragem anterior à atribuição de dimensões e preservação dos registros históricos incompatíveis sem novas operações de julgamento. |
| 1.66    | 29/10/2026 | `[preencher]` | Publicação explícita de resultados homologados por gestor ou administrador, com autoria, data e vínculo à versão dos resultados; separação entre consulta pública e restrita, revogação na reversão e exigência de nova publicação após recálculo, sem alteração da metodologia de cálculo. |
| 1.67    | 29/10/2026 | `[preencher]` | Identificação automática das demandas da fase de hierarquização com atributos não preenchidos na Central de pendências, independentemente de solicitação prévia; registro e envio explícitos, com revalidação do contexto, autoria e histórico, sem alteração das fórmulas ou reabertura automática de resultados. |
| 1.68    | 29/10/2026 | `[preencher]` | Separação dos dados do cadastro e da notificação de pendências; envio do parecer PDF já emitido na análise, rastreabilidade do anexo e acompanhamento de entrega, leitura e cumprimento por evidências registradas, sem alteração dos critérios ou das fórmulas. |
| 1.69    | 29/10/2026 | `[preencher]` | Prévia e confirmação explícita da notificação, revalidação de destinatário, mensagem e anexo, preservação das tentativas de envio e do conteúdo integral na auditoria, sem alteração da metodologia de pontuação. |
| 1.70    | 29/10/2026 | `[preencher]` | Distinção explícita entre pendência registrada e notificação enviada, com migração auditada do estado interno e apresentação do estado da comunicação sem inferir envio a partir do registro. |
| 1.71    | 29/10/2026 | `[preencher]` | Versionamento dos pareceres cadastrais reemitidos conforme as perguntas vigentes da análise e revisão humana obrigatória antes da notificação, preservando respostas, decisões, documentos anteriores e metodologia de pontuação. |
| 1.72    | 29/10/2026 | `[preencher]` | Padronização institucional do parecer PDF em cinco blocos, consolidação de orientações repetidas, identificação do analista pela pessoa vinculada ao usuário e separação da data da análise e da emissão do documento, sem alteração das perguntas ou da pontuação. |
| 1.73    | 29/10/2026 | `[preencher]` | Reorganização visual do parecer em bloco único de análise, com destaque para conclusão, motivo e providências, fundamentação consolidada e assinatura simplificada; distinção entre resultado dos critérios e decisão final, sem alteração das regras de análise. |
| 1.74    | 29/10/2026 | `[preencher]` | Explicitação das condições não atendidas em frases declarativas e da conclusão geométrica; aplicação da paleta oficial ao status efetivamente registrado e inclusão das cores nas fontes versionadas, sem alteração dos critérios ou das fórmulas. |
| 1.75    | 29/10/2026 | `[preencher]` | Distinção dos estados Homologada e Publicada no ciclo das demandas e inclusão da despublicação auditável, preservando a homologação, os resultados e a situação sustentada por outras rodadas. |
| 1.76    | 30/10/2026 | `[preencher]` | Explicitação do formulário-modelo como simulação dos sete critérios D1–D7 da matriz PLI v6 de blocos e dimensões, sem gravação ou aplicação de pesos, preservando o recorte da Fase 3 nos julgamentos reais. |

---

## Sumário

1. [Sumário executivo](#1-sumário-executivo)
2. [Contexto e justificativa](#2-contexto-e-justificativa)
3. [Objetivo](#3-objetivo)
4. [Fundamentação teórica](#4-fundamentação-teórica)
5. [Fundamentação legal, normativa e metodológica](#5-fundamentação-legal-normativa-e-metodológica)
6. [Definições e siglas](#6-definições-e-siglas)
7. [Visão geral do motor de hierarquização (espinha dorsal)](#7-visão-geral-do-motor-de-hierarquização-espinha-dorsal)
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

A documentação e as apresentações públicas descrevem fundamentos e requisitos do
modelo. Sua publicação não comprova execução integral da especificação nem
homologação de pesos ou produtos. Conforme os módulos das Fases 2 e 3, a composição
ponderada depende dos pesos definidos e de sua validação; produtos não ponderados
de referência não os substituem. A disponibilidade operacional deve ser conferida
nas ferramentas implementadas e na procedência de cada execução.

O Sistema de Hierarquização de Demandas do SICARD é o motor de apoio à decisão que
cadastra, analisa, hierarquiza e acompanha **objetos de demanda — planos, programas e
projetos — no contexto de logística e transportes**. Concebido inicialmente no âmbito
do Plano de Logística Integrada do Estado de São Paulo (PLI-SP), o sistema aplica-se a
qualquer objeto de demanda desse domínio. A metodologia permite que um grande conjunto
de objetos de demanda seja avaliado de forma **automatizada, configurável e
auditável**, sem depender de análise manual objeto a objeto.

A avaliação é organizada em **três fases metodológicas independentes e combináveis**:

- **Fase 1 — Elegibilidade territorial:** classifica a elegibilidade territorial
  preliminar de cada objeto de demanda (apto, apto com ressalva ou restrito).
- **Fase 2 — Favorabilidade territorial — município e rede rodoviária:** produz o ranking
  técnico-territorial a partir de superfícies contínuas de favorabilidade.
- **Fase 3 — Priorização de demandas por atributos:** incorpora informações de
  maturidade, custo, governança e viabilidade, além dos riscos herdados da Fase 1.

As denominações seguem a [terminologia oficial do SICARD](../geral/TERMINOLOGIA.md).
Objeto de demanda designa plano, programa ou projeto. As três fases metodológicas
não se confundem com as etapas do ciclo de vida cadastral. Na Fase 2, município
designa um recorte administrativo; grade e rede conservam suas representações e
unidades espaciais próprias. A padronização dos nomes não altera operadores,
pesos, regras de síntese ou contratos de dados.

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

O critério identifica a propriedade pela qual as alternativas são avaliadas,
como atendimento à população. A variável operacionaliza essa propriedade,
por exemplo, pelo número de habitantes beneficiados. A frase “Quanto maior
a população beneficiada, maior a favorabilidade territorial” constitui uma
**premissa de avaliação**: declara a orientação assumida, mas não é o nome
do critério nem constitui, por si só, justificativa técnica ou científica.
O fundamento explica por que essa premissa é adotada e requer referências
e limites de aplicação. Gerar a frase a partir da variável, da relação e do
fenômeno avaliado não gera automaticamente seu fundamento.

O arquivo `config/matriz-criterios-premissas.json` conserva os nomes e as
premissas originais dos 55 fatores do acervo anterior de nove dimensões.
Esse acervo não deve ser confundido com a relação oficial de 12 dimensões
da aba “Dimensões de Critérios” do modelo publicado: Técnica, Financeiro,
Econômica, Social, Segurança, Ambiental, Territorial, Institucional, Risco,
Fundiário-patrimonial, Infraestrutura e servidões e Jurídico-institucional.
A correção não altera a matriz espacial v3 nem homologa variáveis. A direção
de avaliação depende da variável efetiva: necessidade atual e benefício
esperado não devem ser confundidos ou invertidos automaticamente.

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
| **SICARD**                                  | Sistema Inteligente de Cadastro e Ranking de Demandas. |
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
| **Álgebra de mapas**                       | Combinação de rasters normalizados por média ponderada com pesos explicitamente informados. |                                                                                                                                                                                                                                                                                 |
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

## 7. Visão geral do motor de hierarquização (espinha dorsal)

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

### 8.1 Fase 1 — Elegibilidade territorial

**Preparação operacional na interface v2.** A página de elegibilidade passa a
receber camadas vetoriais do storage ou as demandas de uma hierarquização
cadastrada, recuperando suas informações e geometrias atuais do cadastro. Não se
admitem as duas origens na mesma composição de entrada. A seleção de uma origem
bloqueia a outra até a limpeza da seleção; o envio à prévia substitui
integralmente a entrada anteriormente apresentada nessa etapa. Não se
substituem geometrias ausentes por pontos aproximados. As bases são organizadas
em listas distintas de restrição e risco, vedada a utilização da mesma camada em
ambos os papéis ou simultaneamente como entrada. As listas de referências podem
ser salvas no storage e recuperadas em novos acessos, com nova validação geométrica
no envio à prévia. Ao salvar arquivos com múltiplas camadas, identificam-se seus
componentes para registrar as referências individualmente.
As bases possuem vínculo temático com famílias e tipos de adversidade,
mantido no domínio administrativo. A referência exata da camada tem precedência
sobre o identificador canônico do componente ou do arquivo. A família e o tipo
não determinam o papel de risco ou restrição escolhido pelo usuário, nem
atribuem pesos. A taxonomia consultada na execução acompanha os metadados do
GeoPackage e as fontes dos resultados, preservando o registro histórico mesmo
após alterações no domínio. Bases sem vínculo ativo são identificadas
explicitamente e permanecem disponíveis; indisponibilidade do domínio é
informada como falha, não como ausência de vínculo.
O fluxo distingue seleção, prévia e bancada. Os controles das seções de entrada
e bases enviam cada grupo à prévia; alterações na seleção não se propagam
automaticamente. O envio de uma seleção vazia retira o respectivo grupo da prévia.
Confirmar a escolha no explorador transfere somente referências dos arquivos.
A identificação das camadas internas e a validação geométrica ocorrem no envio
à prévia, preservando a seleção e a prévia anterior em caso de falha. A seleção
de um arquivo inteiro também respeita os conflitos de papel de suas camadas internas.
Após a conferência, um único controle no rodapé do painel de camadas da prévia
solicita confirmação para enviar as camadas marcadas à bancada. Esse envio
substitui o conjunto anteriormente enviado pela página, preservando os papéis
e excluindo desse conjunto as camadas desmarcadas, sem substituir outras camadas
adicionadas diretamente na bancada. O cancelamento mantém a bancada anterior.
Quando a entrada provém de uma hierarquização, exige-se que todas as demandas
do grupo estejam na prévia e marcadas para envio, impedindo a apresentação de
um subconjunto como se representasse o grupo integral.
Essa atribuição de papel não constitui homologação.

O estado e o resultado das execuções são registrados no storage por usuário
e identificador, com substituição atômica. A consulta e o cancelamento são
compartilhados entre os processos da API, e os resultados concluídos permanecem
consultáveis após reinício. Um bloqueio por usuário impede cálculos simultâneos
em processos distintos; falhas na persistência do acompanhamento são explícitas.
Os nomes cadastrais das demandas, inclusive barras de identificação territorial,
são preservados na apresentação, sem aplicar-lhes a validação dos aliases
revisados das camadas.

Os tiles constituem somente representações cartográficas: são recortados na
extensão de exibição, com separação de componentes multipartes e subdivisão de
representações complexas em fragmentos de até 16.000 vértices, preservando o
identificador de origem. A simplificação observa a resolução do tile; não altera
os arquivos, as geometrias integrais, as áreas calculadas nem os relatórios.

**Normalização geométrica das demandas.** A prévia conserva a representação da
fonte. No envio confirmado à bancada, as demandas de entrada são representadas
exclusivamente por `Polygon` ou `MultiPolygon`, pela mesma rotina utilizada no
cadastro. Pontos e multipontos recebem buffer de raio de 50 m; linhas e
multilinhas recebem buffer de 25 m de cada lado, com extremidades e junções
arredondadas. Polígonos e multipolígonos não recebem buffer. O processamento
GDAL/OGR ocorre em EPSG:5880, com 32 segmentos por quadrante, redução a 2D,
reparo `MakeValid`, coleta de componentes poligonais e consolidação
`UnionCascaded` por feição. A saída é gravada em EPSG:4674, sem dissolver
demandas distintas. Essas regras constam do módulo interno da Fase 1 e da
rotina cadastral `normalizacao_demanda`.

Coleções `GeometryCollection`, inclusive aninhadas, são processadas
recursivamente: os componentes pontuais e lineares recebem os respectivos
buffers cadastrais, e os componentes poligonais não recebem buffer adicional.
Os resultados poligonais são reunidos em uma única geometria por feição,
mantendo os atributos e o identificador de origem. Não se extraem apenas os
polígonos da coleção, pois esse procedimento eliminaria componentes pontuais
e lineares. A quantidade de coleções tratadas e os tipos de seus componentes
são registrados nos metadados do arquivo e no acompanhamento do envio.

Utilizam-se todas as feições da fonte integral, com preservação dos atributos
e registro dos identificadores de origem. As geometrias cadastradas são
recuperadas novamente no servidor. Para camadas escolhidas no explorador,
cada camada produz um GeoPackage derivado. Quando a entrada provém de uma
hierarquização, o envio confirmado reúne todas as demandas do grupo em um único
GeoPackage, com uma única camada vetorial `demandas`; a prévia conserva as fontes
individuais. Confere-se a composição atual do grupo no servidor, interrompendo
o envio se houver divergência de membros. Cada fonte é normalizada a partir
de seu CRS original; a concatenação em EPSG:4674 conserva todas as feições e a
união dos campos, com nulos nos atributos ausentes em determinada fonte, sem
dissolver demandas distintas. Preservam-se o objeto da rodada e os atributos
por registro; campos de rastreio identificam a demanda, a camada e o FID de
origem, sem sobrescrever campos existentes. O arquivo é reaberto e conferido antes do registro no ciclo de vida
oficial das saídas. Registram-se os parâmetros e a origem nos metadados do
arquivo. A bancada recebe o caminho e a revisão do arquivo derivado para os
geoprocessamentos, sem substituir a fonte original. Não se calculam áreas de
incidência com tiles ou simplificações da prévia. CRS ausente, coordenadas
incompatíveis, registros sem geometria utilizável, componentes vazios ou não suportados e
impossibilidade de gerar polígono válido interrompem o envio, sem descarte
silencioso de demandas. Essa conversão aplica-se somente às demandas; as bases
de risco e restrição mantêm suas geometrias factuais, sem buffers adicionais.

Os envios da seleção à prévia e da prévia à bancada apresentam acompanhamento
por etapas, identificação da camada corrente e resultado explícito. Falha em
qualquer entrada impede o envio parcial. O cancelamento aguarda a operação
corrente e preserva os conjuntos anteriores; arquivos derivados já produzidos
permanecem registrados. O reenvio da mesma revisão da prévia pode reutilizar o
arquivo derivado na sessão da página, sem reaplicar buffer à geometria normalizada.

**Produção da camada de saída.** A execução utiliza exclusivamente as entradas
e bases confirmadas e marcadas na bancada, exigindo ao menos uma entrada e uma
base de restrição ou risco. Produz-se uma saída para cada entrada. Verifica-se
a unicidade e a ausência de valores nulos em `ID_FEICAO`; quando inexistente,
acrescenta-se um identificador sequencial à cópia, sem alterar a fonte.

Processam-se primeiro as bases de restrição e depois as de risco, uma por vez,
sempre pela interseção GDAL/OGR da entrada integral com a base corrente.
Calcula-se a área dos fragmentos em EPSG:5880, em metros quadrados, e soma-se
por identificador da entrada, sem união ou dissolução. Sobreposições internas
da mesma base participam dessa soma. Não se encadeiam os resultados de
interseções. Cada base acrescenta um campo `re_*` ou `ri_*`, com mapeamento
registrado nos metadados e sufixos numéricos em caso de colisão de nomes.
Feições sem interseção conservam `NULL`; interseções sem área recebem zero.

A saída conserva todas as geometrias, atributos e o CRS da entrada poligonal
da bancada. Os intermediários de cada base são descartados após a transferência
dos valores. O GeoPackage é serializado em memória e reaberto para conferência
antes do registro no storage oficial, sem temporários em disco local.
O arquivo recebe o nome `[nome da camada de entrada]_elegibilidade_territorial.gpkg`,
sem a extensão original, em pasta exclusiva para evitar sobrescrita, e é adicionado
automaticamente à bancada sem remover os insumos. A execução apresenta etapas
e cancelamento seguro antes da gravação final; saídas anteriormente concluídas
permanecem registradas em caso de interrupção posterior.

**Apresentação e relatório de resultados.** A seção de resultados utiliza a
composição registrada na execução, independentemente de alterações posteriores
na seleção de camadas. Os nomes amigáveis são sugeridos a partir da biblioteca,
do dicionário ou de formatação automática e submetidos à revisão explícita do
usuário quanto ao significado, à ortografia e à gramática. Emprega-se title case
em português brasileiro, com conectivos internos em minúsculas e preservação
de siglas, sem expansão presumida de abreviações desconhecidas. Os mesmos
aliases identificam as camadas na tela, no mapa e no PDF, mantendo intactos os
nomes técnicos dos arquivos e campos.

O GeoPackage de saída inclui a camada integral das demandas, um campo de área
total em metros quadrados, sem sobrescrita dos atributos originais, e uma camada
de interseções em EPSG:5880. Cada recorte registra sua área e os vínculos com a
posição da demanda, a camada de base e a feição de origem. A soma dos recortes é
conferida contra os campos por base antes da apresentação. Mantém-se a soma
independente, sem união ou dissolução.

Para cada entrada apresentam-se resumo, fontes em colunas de Restrição e Risco,
mapa Leaflet e tabela paginada, com seleção sincronizada e
enquadramento das geometrias selecionadas. Categoria designa Restrição ou Risco;
classe designa a própria feição da base, identificada por sua origem, sem reunir
feições distintas apenas por possuírem nomes iguais. Uma única rosca reúne todas
as entradas e demandas da análise, inclusive sem interseção, sem limitação pela
entrada selecionada, paginação ou filtros da tabela. Cada fatia azul corresponde
à área total de uma demanda dividida pela soma das áreas totais de todas as
demandas, mantendo identidades distintas mesmo quando os nomes são iguais.
Cada feição intersectada é representada sobre a própria fatia da demanda,
com os mesmos raios da rosca, transparência e hachuras, proporcionalmente à área da
interseção dividida pela área total da demanda. As representações partem do mesmo
início do setor e podem coincidir; não reproduzem a posição geográfica das
feições, não formam um segundo anel nem parcelas exclusivas e não são normalizadas
pela soma das interseções. Vermelho indica Restrição e amarelo, Risco,
em correspondência com o mapa; hachuras em direções distintas facilitam a
leitura das coincidências. A legenda visível
apresenta somente o nome da demanda com iniciais maiúsculas; entrada, demanda,
área total e participação na soma das áreas das demandas permanecem disponíveis
no título e no rótulo acessível da fatia. As interseções conservam sua origem
e área nos respectivos títulos e rótulos. A lista da demanda selecionada
relaciona todas as feições intersectadas, camadas, categorias, áreas e percentuais,
permitindo consultar inclusive representações coincidentes. A seleção de uma
demanda ou interseção atualiza os detalhes, as tabelas e o enquadramento,
inclusive em outra entrada, sem retirar as demais fatias.
Nos detalhes, o percentual corresponde à área sobreposta dividida pela
área total da demanda. A soma das áreas de diferentes feições pode superar a
área da demanda, conforme o operador de agregação adotado.

Nos detalhes e na tabela da tela, as áreas são apresentadas em km² com duas
casas decimais, com equivalência em hectares com quatro casas decimais.
O arredondamento é exclusivamente visual. No título e no rótulo acessível
dos itens da rosca, as áreas são apresentadas nas mesmas unidades da tela. Os cálculos e os
campos do GeoPackage permanecem em metros quadrados. O travessão representa nulo,
distinguindo-se do contato de área zero, apresentado na lista da demanda sem
área gráfica fictícia. O PDF inclui todas as demandas, bases e feições sobrepostas, suas
áreas e percentuais, além de mapas das demandas e recortes em EPSG:5880, com
escala e norte, sem mapa-base. Não se atribui classificação de elegibilidade.
A revisão dos nomes das camadas e feições é recolhida após confirmação e
persistida no storage, vinculada ao usuário e à assinatura da saída, sem alterar
o arquivo geoespacial processado. Saídas anteriores sem interseções persistidas
exigem nova execução para utilização do painel.

Apresenta-se também uma tabela de resumo com seleção individual e as colunas
Demanda, Perímetro (m), Área (km²), Área (ha), Restrição e Risco.
O perímetro é calculado sobre uma cópia da geometria em EPSG:5880, considerando
todos os contornos, inclusive anéis internos e componentes, sem união ou dissolução.
As áreas totais são lidas do campo persistido da análise. Perímetro e km²
apresentam duas casas decimais; hectares, quatro, sem arredondamento na origem.
Cada categoria relaciona os nomes das feições intersectadas, incluindo
contatos sem área e sem repetir nomes na mesma célula; a ausência de interseção
é indicada explicitamente. Os nomes são apresentados em vermelho escuro para
Restrição e amarelo escuro para Risco; ausências não recebem essas cores.
A deduplicação nominal aplica-se somente a esse
resumo, sem agregar feições, áreas ou fatias do gráfico. As duas tabelas
possuem contêineres próprios com filtros independentes, barra de controles,
paginação e contador. Esses filtros não alteram o mapa, o conjunto da rosca
ou os produtos exportados, cuja precisão permanece inalterada.

A barra de filtros mantém o padrão de Agrupamento de Demandas, com a limpeza
restrita a essa barra. No resumo, os controles permitem visualizar a demanda
no modal de objetos e editar, cancelar ou salvar exclusivamente seu nome.
Para análises vinculadas à hierarquização, o código cadastral original é
conferido contra os membros do grupo, sem inferência por nome ou identificador
da feição. A edição exige permissão de operação e utiliza a rota cadastral
do tipo correspondente: plano, programa ou projeto. O resumo consulta os nomes
atuais do cadastro ao reabrir. Feições sem vínculo cadastral confirmado também
permitem editar o nome e são identificadas como dados da análise no modal.
Nesse caso, a gravação produz uma revisão por posição da feição, vinculada ao
usuário, caminho e SHA-256 da saída, na pasta de revisões da análise. O mesmo
usuário recupera a revisão ao reabrir; os relatórios regenerados utilizam os nomes
revisados, que também integram os metadados exportados. Não se infere vínculo
cadastral por coincidência nominal ou de identificador. As categorias de Restrição
e Risco, as interseções e o GeoPackage original são preservados; PDFs já emitidos
não são reescritos. O cancelamento não grava alterações.

O controle de download ao final da seção entrega um ZIP com o PDF completo,
os GeoPackages processados e metadados com aliases e assinaturas de integridade.
O PDF reúne identificação, datas, fontes, metodologia, resumos, mapas e tabelas.
Cada GeoPackage é incluído sem alteração de seu conteúdo binário. A comparação
do SHA-256 com a assinatura da produção impede a emissão sobre saída modificada.
Não se repetem interseções na exportação; o pacote é persistido e conferido no
storage antes do download. Lotes parcialmente concluídos são assim identificados.

Esta entrega produz a camada vetorial e seu relatório, sem classificação automática ou alteração
de resultados anteriores da hierarquização. A apresentação de classificações e
a vinculação às fases seguintes dependem de definição posterior. A regra abaixo
permanece como referência metodológica, conforme o módulo interno da Fase 1.

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

**Registro por objeto de demanda.** Ao final do cálculo, o resultado de cada objeto de
demanda é gravado em `dados_hierarquizacao`, no campo da Fase 1: `status_fase1`,
`restricoes_intersectadas` e `riscos_intersectados` (com camada, feição, área em m², área
em ha e percentual da demanda), `sobreposicoes_restricao` e `sobreposicoes_risco` (área
total sobreposta por camada, incluindo as de área zero) e `criterios_fase3_sugeridos`. A
correspondência entre a saída geoespacial e o objeto é feita pelo código da demanda. As
execuções acumulam histórico (arquivo e assinatura) no relatório da fase. Hierarquizações
homologadas ou arquivadas não são regravadas, e a síntese ou o consolidado já emitidos
são marcados como desatualizados quando o resultado de uma fase é regravado.

**Resumo da Elegibilidade.** Os resultados da Fase 1 incluem uma tabela final, com uma
linha por objeto de demanda **sem restrição** (com risco ou livre de restrições e riscos);
objetos com restrição não constam. As colunas são: objeto de demanda; camadas de risco
atingidas; área de sobreposição, em hectares; porcentagem sobreposta; e índice de risco
ambiental e territorial. A área de sobreposição é a **união** das áreas atingidas por todas
as camadas de risco (EPSG:5880), sem dupla contagem de áreas coincidentes. O índice é
calculado por:

```text
indice_risco_ambiental_territorial = 1 − (area_sobreposta_por_camadas_de_risco / area_total_da_demanda)
0 = demanda inteiramente sobreposta (menor elegibilidade)  |  1 = sem sobreposição (maior elegibilidade)
```

A tabela integra o relatório em PDF, o pacote de saída (planilha e CSV) e o relatório da
Fase 1 da hierarquização, em planilha própria vinculada à camada geoespacial e com as
linhas gravadas no registro, sem alterar a classificação `status_fase1`.

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


**Rastreabilidade da extração geoespacial.** No módulo de extração de atributos,
o modo sem recorte utiliza junção espacial esquerda com `ST_Intersects`, executada
por GDAL/OGR e SQLite/SpatiaLite. Preservam-se os registros e as geometrias das
demandas, inclusive quando não há correspondência. No modo com recorte, o operador
nativo `OGR.Layer.Identity` fornece os fragmentos e a identificação da unidade de
recorte. As correspondências conservam os atributos de origem na camada de saída;
relações múltiplas também são registradas em campos JSON.

Quando as categorias de risco e restrição são selecionadas na extração, seus
indicadores registram a existência de correspondência espacial: 1 para presença
e 0 para ausência. Um atributo nulo na base intersectada não significa ausência
de incidência. Os campos `sicard_vinculos` e `sicard_esquema` preservam as relações
e sua estrutura analítica, permitindo consultar painéis e mapas a partir da saída
materializada. Esses indicadores descritivos subsidiam a avaliação territorial;
a classificação da Fase 1 segue as regras de elegibilidade descritas acima.
O contrato operacional é detalhado em
`documentacao/geoespacial/FLUXO_CRUZAMENTO_ESPACIAL_CONFIGURAVEL.md`.

**Documentação de transparência das camadas territoriais.** A página
`/restrict/geoespacial/documentacao-camadas-territoriais/` apresenta a matriz
de viabilidade auditada em 25/10/2026, preservada em
`config/documentacao-camadas-territoriais.json`, com versão CSV equivalente.
O registro explicita campos de origem, fórmulas, fontes, universo, período,
unidade, cobertura e ressalvas de 46 indicadores originais ou combinados.
Esse registro preliminar é mantido sem alterações como prévia histórica,
distinta do catálogo de metadados versionado em
`config/catalogo-setorial-on-demand.json`. O catálogo descreve 3.529 atributos
setoriais (3.519 originais e 10 combinados), com identificadores, descrições,
fontes e fórmulas. A presença de metadados não significa que todos os valores
estejam carregados. Os originais são obtidos quando um processamento os solicita,
validados contra os códigos da malha e persistidos com cobertura e procedência
SHA-256 para reutilização. As dez combinações são recalculadas após a obtenção
dos respectivos insumos. O banco municipal mantém 18 combinados, todos com
645/645 valores; o catálogo municipal totaliza 6.393 atributos, dos quais
6.375 originais. Persistência e conferência não constituem homologação de
combinações, pesos AHP ou critérios.

O retrato compreende 645 municípios. A camada oficial setorial de 2022 reúne
103.319 códigos e 103.620 partes geométricas, com 8 geometrias oficiais inválidas.
As medidas demográficas são consideradas uma única vez por código de setor;
as áreas das partes são somadas para os indicadores do setor lógico. A
calculabilidade numérica não certifica validade geométrica. Não se replicam
atributos municipais nos setores. A incorporação aditiva em
`base_territorial.setor` contempla os nove básicos `v0001–v0009`, demografia,
alfabetização, domicílios Partes 1, 2 e 3, cor ou raça, parentesco, óbitos,
pessoas e domicílios indígenas e quilombolas, rendimento do responsável,
entorno por domicílios, moradores e faces de via e registro de nascimento.
O catálogo completo de metadados não pressupõe a carga integral dos valores
desses 18 conjuntos. Como as fontes configuradas são arquivos oficiais, o
SICARD obtém o arquivo que contém a variável solicitada, extrai as colunas
necessárias e compara os códigos e valores com a malha antes da gravação.
Ausência de linha não produz estimativa; símbolos de sigilo `X` são mantidos
como sinais, não como zero. A cobertura, a procedência e o hash são registrados
para os atributos carregados. Solicitações posteriores reutilizam os valores
persistidos; a operação não desagrega amostras municipais.
Não se trata de desagregação de amostra municipal; temas comuns nas duas
escalas não significam mesmos identificadores, períodos ou universos.
O rendimento nominal médio e mediano do responsável, suas variâncias e
contagens não equivalem à renda domiciliar per capita nem a uma medida de
pobreza. O indicador de baixa renda anteriormente calculado permanece municipal.
As datas de divulgação ou revisão em 2025 e 2026 não alteram a referência
censitária de 2022; períodos específicos permanecem nas descrições oficiais.
A disponibilidade operacional e a cobertura dos atributos carregados podem ser consultadas no catálogo API
`/api/geoespacial/extracao-atributos/municipal/catalog?territorialidade=setores_2022`.
A incorporação não implica homologação automática das combinações.
O catálogo de metadados é reproduzível por
`scripts/preparar_catalogo_setorial_on_demand.py --insumos DIR`. A consulta
operacional baixa o pacote oficial correspondente, valida a fonte e persiste
somente as chaves solicitadas, sob trava consultiva e em transação. As
combinações setoriais são recalculadas quando solicitadas após a obtenção dos
insumos. A página documental não executa cargas nem modifica os procedimentos
das fases de hierarquização.

O CSV municipal de baixa renda de 2022 conserva as contagens da tabela SIDRA
10296: soma dos moradores até um quarto de salário mínimo, dos moradores acima
de um quarto até meio salário mínimo e dos moradores sem rendimento, dividida
pelo total do mesmo universo e multiplicada por 100. Excluem-se do universo
pensionistas, empregados domésticos e parentes desses empregados. O indicador
não equivale a linha oficial de pobreza monetária ou índice social homologado.
A não aditividade dos percentuais publicados, de até 0,16 ponto percentual na
auditoria, é registrada sem renormalização. Entradas ausentes e denominadores
não positivos permanecem não calculáveis, sem substituição por zero.
A normalização e a inversão dos indicadores de relação negativa são etapas
posteriores de favorabilidade, não implementadas por esta documentação;
permanecem aplicáveis as exigências metodológicas da Seção 8.2.

### 8.2 Fase 2 — Favorabilidade territorial — município e rede rodoviária

**Função.** Núcleo do **ranking técnico-territorial**. Consome uma ou mais superfícies
de favorabilidade e cruza-as com a geometria dos objetos de demanda, extraindo um valor
por objeto de demanda.

**Preparação vetorial autônoma.** O gerador de superfícies por critérios
territoriais constitui uma etapa independente da bancada operacional. Selecionam-se
variáveis municipais ou setoriais de 2022 com cobertura de levantamento comprovada,
geram-se separadamente o critério e sua premissa direcional e associa-se uma das
12 dimensões oficiais. A camada preparada é salva antes do índice, preservando
geometrias, campos cadastrais, conceitos identificados por critério e valores
originais e reescalonados. Aplica-se exclusivamente transformação linear
mínimo–máximo, com inversão dos critérios negativos; variáveis constantes são
rejeitadas. Zero observado é válido; valores desconhecidos ou protegidos por
sigilo não são convertidos em zero.

A composição utiliza média simples ou pesos explicitamente informados,
correspondentes exatamente aos critérios salvos. Não se admite novo julgamento
individual ou colaborativo para os critérios espaciais da Fase 2; o julgamento
AHP destina-se exclusivamente à Fase 3. Registros anteriores são preservados
para consulta, sem transferência de seus pesos para novos cálculos.
Valores ausentes mantêm o índice nulo, sem redistribuição.
Registram-se operador, pesos e origem no produto derivado; sua produção não
implica homologação. O detalhamento consta no
[módulo da Fase 2](../hierarquizacao/MODULO_FASE2_GERADOR_FAVORABILIDADE_TERRITORIAL.md).
As alternativas de modelagem espacial apresentadas a seguir não se confundem
com o conjunto de operações atualmente disponível nesse gerador vetorial.

**Métodos de extração espacial:** extração pontual (projeto-ponto); média zonal
(polígono/linha/buffer); mediana, máximo, mínimo ou percentis quando justificável;
estatística por trecho, corredor ou área de influência (análise de rede).

**Construção da superfície de favorabilidade:**

```text
Camadas de entrada → Validação/compatibilização →
Operador espacial por critério → Raster contínuo por critério →
Reescalonamento 0–1 → Inversão de critérios negativos →
Aplicação dos pesos explicitamente informados → Média ponderada →
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
finais e os pesos de composição não estão homologados, os valores disponíveis são preservados nas
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

Para análise do cenário sem pesos diferenciados, são produzidas duas superfícies vetoriais
identificadas como **média simples**. A superfície de grade combina seus dois critérios;
a superfície de rede combina os 14 critérios calculáveis, mantendo pavimento e
sobrecarga sazonal como lacunas. Em cada unidade espacial, a média é calculada sobre os
critérios válidos e o denominador é registrado em `n_criterios`. Esses produtos são
cenários não ponderados e não constituem superfícies homologadas; a composição oficial
permanece dependente dos pesos de composição e da regra de NoData homologados.

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

**Etapa operacional da bancada V2.** O bloco “Conferir e executar”, acionado pelo
comando “Calcular Favorabilidade Territorial”, reutiliza o motor de interseções
independentes da Elegibilidade. Consideram-se somente as entradas e superfícies
confirmadas pela página e visíveis na bancada. As fontes permanecem inalteradas na
seleção, na prévia e no envio; após a confirmação do cálculo, produz-se a entrada
derivada pelas regras cadastrais poligonais da Elegibilidade, com auditoria. Para
uma hierarquização, exige-se o conjunto completo de demandas, consolidado sem
dissolução entre demandas.

Cada superfície poligonal de grade ou rede é intersectada separadamente com a
entrada integral em EPSG:5880. Somam-se apenas as áreas dos fragmentos por feição,
em m², sem união ou dissolução, nos campos `fg_*` e `fr_*`, respectivamente. A
ausência de interseção permanece `NULL`; o contato sem área é registrado como
zero. Sobreposições internas podem produzir somas superiores à área da demanda.
Bases lineares podem ser visualizadas, mas não integram este cálculo.
Superfícies raster seguem a extração ponderada por área descrita na seção 10.15.

A conferência de versão distingue o token temporário de visualização da revisão
física do arquivo original do Storage, identificada pela data de modificação em
nanossegundos e pelo tamanho. A preparação da prévia confere essa revisão antes e
depois da leitura e da representação; entradas avulsas e superfícies utilizam a
revisão física no cálculo. A criação de tiles não constitui alteração da fonte.
Mudanças reais dos arquivos permanecem impeditivas para a execução.

O GeoPackage conserva a entrada preparada na camada `favorabilidade_territorial`
e os fragmentos na camada `intersecoes`, com vínculos às demandas e às feições de
origem. Todos os atributos não geométricos das superfícies, inclusive a classe
nominal e os campos normalizados, são preservados individualmente nos fragmentos.
Os metadados registram a correspondência dos campos para evitar colisões. Para vetores, não se
calculam médias, modas, reescalonamentos ou agregações de classes ou índices nesta
etapa, que não produz as saídas de ranking especificadas acima.

Há acompanhamento persistente por usuário, cancelamento em ponto seguro e
conferência das geometrias e dos atributos por reabertura antes da persistência
final no Storage. Os produtos são incluídos na bancada, com armazenamento
segregado de análises avulsas ou na pasta `fase-2` da hierarquização. Não são
registrados como resultados de Fase 1 nem substituem índices, escores, ranking ou
homologação existentes.

O painel da Favorabilidade apresenta os atributos originais
`fav_territorial_dim` e `fav_territorial_classe` para superfícies de grade, e
`fav_rede_dim` e `fav_rede_classe` para superfícies de rede. A leitura utiliza o
mapa de atributos preservados nos metadados do GeoPackage. Área, índice sem
sufixo `_dim` e classe inferida não substituem esses campos. O cálculo espacial
vetorial não agrega índices ou classes; as estatísticas opcionais de consulta são
descritas adiante e não modificam os produtos. Fragmentos da mesma
combinação demanda e feição devem concordar nos atributos; divergências ou
colunas declaradas mas inexistentes impedem a apresentação.

Todas as entradas, demandas e superfícies das saídas concluídas no lote compõem
gráficos de intervalos com pontos separados por superfície. Cada demanda ocupa
uma linha, identificada somente pelo nome, sem anexar códigos ou o nome da entrada.
A identidade interna considera a entrada e a chave da demanda, preservando
linhas distintas para demandas homônimas. Cada ponto representa o índice
dimensionado original de uma feição intersectada na escala horizontal fixa de
0 a 1. O traço liga o menor ao maior índice válido da demanda, sem calcular média,
somar, ponderar ou substituir valores. Um único valor não recebe intervalo
fictício. Pontos próximos são separados verticalmente e ligados ao traço por
guias, mantendo inalterada sua posição horizontal; essa separação não representa
outra variável.

As cores categóricas identificam as feições de origem, sem significado de índice
ou classe. Feições compartilhadas por demandas mantêm a mesma cor e uma única
entrada de legenda por identidade de feição e superfície; feições homônimas não
são fundidas. A legenda interativa utiliza células uniformes, quebra de nomes
longos e adaptação a telas estreitas. Os valores numéricos aparecem junto aos
pontos; classes e identificação completa permanecem nos detalhes, nos títulos
de consulta e nas descrições acessíveis. A seleção por ponto, nome da demanda
ou legenda preserva a correspondência com mapa, detalhes e tabelas. Na legenda,
prefere-se a combinação da demanda ativa quando a feição estiver presente nela.
As cores permanecem estáveis durante a seleção.

Zero válido permanece no início do eixo. Ausências e índices inválidos são
sinalizados na própria linha, sem pontos fictícios nem conversão em zero.
Demandas sem interseção mantêm uma linha com indicação explícita, sem ponto.
A rolagem interna permite consultar todas as demandas e o eixo em telas
estreitas, mantendo nomes e cabeçalho de referência. As linhas seguem a ordem
das entradas e demandas; a tabela detalhada permanece ordenada pelo índice em
ordem decrescente antes da paginação. Cada combinação demanda e feição permanece
individualizada, inclusive com nomes, classes ou valores iguais. Zero válido e
contatos sem área permanecem identificados. As saídas parciais são indicadas e os dados são lidos dos
GeoPackages assinados, com conferência dos vínculos e das somas geométricas, sem
repetir interseções ou alterar os valores dos produtos.

A seção de resultados incorpora mapa interativo, seleção de entrada e superfície,
detalhamento dos índices e classes e tabela paginada por combinação, sincronizados
com os gráficos. A tabela identifica a demanda e o município de origem (feição),
com pares de colunas de índice dimensionado e classe para municípios e rede
rodoviária. Mantém-se uma linha por feição, com travessão nas colunas da outra
superfície; não se associam feições municipais e de rede por posição ou nome.
A superfície permanece identificada nos detalhes e no título de consulta da linha;
a nomenclatura municipal não reidentifica nem modifica as feições originais.
Área e percentual da interseção são informação técnica complementar
nos detalhes, não medidas de favorabilidade. A ocultação de registros sem índice
e classe mantém zero válido e índices inválidos sinalizados, sem filtrar os gráficos.
O mapa permite alternar a superfície e a simbologia entre índice original
(`fav_territorial` ou `fav_rede`), dimensionado e classes nominais. O dimensionado
utiliza rampa Viridis contínua de 0 a 1. O original utiliza os extremos válidos
da superfície consultada e dos recortes históricos apenas para atribuir cores,
sem alterar os valores. As classes são categóricas, sem inferência por limiares;
cinza indica valor ausente ou inválido. Os seletores de superfície e simbologia
permanecem na mesma linha, sem seletor de origem das geometrias.
As bases integrais são carregadas automaticamente da camada oficial referenciada
no processamento, mediante análise autorizada, sem escolha de fontes alternativas.
A referência identifica a camada utilizada, mas não constitui cópia histórica
do conteúdo integral da fonte. Os recortes preservados na saída destacam a
combinação selecionada sobre a base, sem modificar os produtos. Falhas de acesso à fonte são explícitas,
com tentativa de recarga e preservação dos resultados históricos.
Os polígonos são opacos e
sem bordas; contatos lineares e pontuais permanecem representados. As geometrias
são apresentadas sem simplificação.
A revisão dos nomes das camadas e feições exige confirmação e é persistida por
usuário e assinatura da saída, sem modificar as fontes.

Permite-se reabrir um GeoPackage de Favorabilidade previamente gravado, após
conferência dos metadados, vínculos, áreas e geometrias. A exportação reúne PDF
de Favorabilidade Territorial com os índices e classes originais por combinação,
GeoPackages integrais e manifesto em pacote
conferido no Storage, com identificação de resultados parciais. Não há repetição
das interseções para consulta ou exportação, nem registro de relatório da Fase 1.

Imediatamente abaixo da tabela por feição, a tabela **Índices e Classes Agregados
por Demanda** substitui nesta página a consulta dos índices oficiais registrados.
Apresenta conjuntos de índices e classes das interseções da camada de demandas
selecionada, separando grade e rede. Demandas homônimas não são agrupadas. Os
valores originais permanecem em ordem decrescente, com repetições, separados por
vírgulas e pela conjunção “e” antes do último valor, inclusive nas classes; as linhas são
ordenadas pelo maior índice original válido da demanda, com ausências ao final.

As três tabelas de conferência das camadas e as duas tabelas de resultados
possuem contêineres independentes, com filtros por coluna e valor, inversão e
limpeza na própria barra de filtros, barra de controles e rodapé com paginação
de 50 registros e contador, segundo o padrão de Agrupamento de Demandas.
Os filtros da conferência não alteram as camadas consideradas no cálculo.
Os filtros das tabelas de resultados são independentes, não limitam o mapa ou a
lista integral e não mudam o conjunto de interseções utilizado nas estatísticas.
A alteração da medida estatística reinicia os filtros e a paginação da tabela
agregada, evitando seleção baseada em valores de uma medida anterior.

Na tabela agregada, os controles permitem visualizar a demanda no modal de
objetos e editar, cancelar ou salvar exclusivamente seu nome no cadastro
original. Nas análises vinculadas à hierarquização, o código original é conferido
contra os membros do grupo e a edição exige permissão de operação. Demandas sem
vínculo confirmado permanecem somente para consulta. Os nomes cadastrais atuais
são consultados ao reabrir o resumo, sem modificar o registro da análise no
GeoPackage ou no PDF. A troca de entrada, os filtros da tabela agregada e os seletores estatísticos
permanecem bloqueados durante a edição para preservar o rascunho.

Três seletores independentes permitem escolher uma única medida ativa no total:
tendência central (média aritmética simples, mediana ou moda), dispersão
(amplitude, variância populacional, desvio-padrão populacional, coeficiente de
variação percentual ou intervalo interquartil) e posição (mínimo, Q1, Q2, Q3,
máximo ou percentil personalizado). A seleção reinicia os demais seletores e
substitui os conjuntos nas colunas numéricas. O estado neutro restaura os valores
originais. As classes originais permanecem listadas, sem inferência de nova classe.

Cada combinação demanda e feição contribui uma observação, sem ponderação por
área; repetições e zero válido são mantidos. Índices ausentes, nulos ou inválidos
são excluídos com indicação da contagem válida por célula, sem atribuir zero a
conjuntos vazios. Variância e desvio-padrão usam divisor N. Quartis e percentis
usam interpolação linear na posição (N − 1) × p da sequência crescente; percentis
personalizados devem estar entre 0 e 100. A moda preserva todos os empates na maior
frequência; conjuntos com mais de uma observação, todas distintas, são indicados
como sem moda. O coeficiente de variação é indefinido quando a média é zero.
Essas estatísticas são exclusivamente exploratórias no navegador: não gravam
valores, não repetem interseções e não alteram classes, índices oficiais,
homologação, PDF ou GeoPackages.

**Registro por objeto de demanda.** Ao final do cálculo, a extração de cada objeto de
demanda é gravada em `dados_hierarquizacao`, no campo da Fase 2, por dimensão (grade e
rede): feição intersectada, área e percentual da demanda, campo e valor do índice, estado
do índice, classe e estado da classe, além de estatísticas descritivas dos índices válidos
(mínimo, máximo, média, mediana e média ponderada pela área). O índice oficial da dimensão
só é preenchido quando há um único valor válido; na ausência de regra metodológica de
agregação, o sistema não agrega valores de várias feições, e a síntese permanece sem
resultado para o objeto até que o índice seja definido.
### 8.3 Fase 3 — Priorização de demandas por atributos

**Função.** **Opcional.** Incorpora informações que pertencem ao **próprio objeto de
demanda, à carteira, à governança ou à viabilidade de execução**, sem duplicar critérios
já avaliados na Fase 2. É também onde os **riscos herdados da Fase 1** são avaliados
quantitativamente.

**Critério de risco ambiental e territorial.** O **Índice de risco ambiental e
territorial** do Resumo da Elegibilidade substitui os critérios de área sobreposta
por camada. Consome-se o valor registrado na Fase 1 do próprio objeto, cuja
correspondência é estabelecida pelo código da demanda, sem associação por nome.
Preserva-se a escala de 0 a 1, com relação positiva (maior é melhor), sem novo
reescalonamento entre objetos: o valor normalizado é igual ao índice registrado,
inclusive quando existe apenas um objeto ou todos possuem o mesmo valor.
O índice constitui o grupo **Critérios de Risco Ambiental e Territorial**, com
peso único igual a 1 no grupo e participação equivalente à dos grupos de atributos
do cadastro e de atributos dinâmicos, sem vínculo com os pesos da matriz homologada.
Zero é um valor válido; índices fora da escala são sinalizados como inválidos.
Objetos sem execução da Fase 1, sem resumo registrado ou com restrição, que não
constam do resumo, permanecem com valor ausente, sem preenchimento automático por
zero ou por valor manual. A substituição dos critérios antigos na configuração
ativa ocorre ao salvar pesos ou executar pela interface; resultados históricos
não são recalculados automaticamente.
A penalização do escore por índice de risco e as decisões gerenciais de ignorar
ou barrar não compõem mais o procedimento; decisões já gravadas em rodadas anteriores
permanecem registradas e são respeitadas.

**Entrada:** arquivo tabular (CSV, XLSX, XLS, Parquet ou tabela do banco), uma linha
por objeto de demanda, uma coluna por atributo.

**Complementação dos atributos.** O cadastro da hierarquização materializa, por
demanda, os atributos dinâmicos da matriz enviada e preserva os valores nativos
do cadastro oficial. A coleta reúne maturidade, CAPEX estimado e sua base,
prazo de referência e sua base, conforme a aplicabilidade por tipo, além das
métricas dinâmicas da rodada e do Configurador da Fase 3, conforme a tabela
“Critérios de atributo de demanda”. A matriz prevalece em identificadores
duplicados. O grupo Risco provém da Fase 1 e não integra a coleta manual.
Planos não possuem CAPEX e base de CAPEX nesse
contrato. Atributos já atendidos pelo cadastro não originam coleta duplicada.
Pendências são registradas ao salvar a hierarquização no status
`hierarq_aguardando_complementacao`, distinto dos status `analise_*` da avaliação
cadastral. A solicitação pode ser registrada e notificada imediatamente ou
adiada para a Fase 3, sem adiar o registro da pendência.

A Central de pendências apresenta automaticamente as demandas cujo status
pertence à fase de hierarquização no domínio oficial e que possuem atributos
cadastrais ou dinâmicos não preenchidos, por contexto de rodada. A ausência de
solicitação prévia não impede a apresentação. Demandas de outras fases e
contextos com atributos completos não integram esse bloco. A consulta não
altera status nem cria pedidos: o gestor ou administrador registra a solicitação
e, por ação explícita posterior, envia a mensagem externa com o parecer PDF
previamente gerado na análise cadastral, sem incluir as anotações técnicas
internas da pendência. A ausência do PDF impede o envio pela Central. Os dados
do solicitante e da data do cadastro permanecem separados da autoria, data e
destinatário da notificação. A identificação do anexo e os retornos de entrega e
leitura são registrados por mensagem; ausência de confirmação não constitui
evidência de que o e-mail não foi aberto. Antes do envio, a prévia apresenta o
conteúdo integral, o destinatário e a identificação do anexo. A confirmação
revalida esses dados e registra o resultado comunicado pelo servidor; tentativas
anteriores e conteúdo enviado são preservados na auditoria. No bloco cadastral,
o texto do parecer da análise constitui a mensagem; para atributos, utiliza-se
a mensagem salva do gestor. O cumprimento é acompanhado pelas
categorias salvas e pela conclusão registrada. O estado interno de um pedido
aberto é denominado `registrada`, sem comprovar que houve comunicação. A migração
154 preserva no histórico a denominação anterior; somente o estado e as evidências
da notificação permitem informar seu envio, conforme a fonte interna do motor.
Para pendências cadastrais abertas, a reemissão utiliza as perguntas vigentes da
análise e as respostas registradas, sem alterar estas respostas ou a decisão. As
versões anteriores são preservadas, e a revisão humana vinculada ao documento e
às fontes vigentes é obrigatória antes da notificação. Esse procedimento não
reabre resultados da hierarquização nem altera fórmulas ou critérios de pontuação.
O parecer apresenta identificação seguida de um único bloco de análise e parecer,
com a identidade visual dos relatórios da Fase 3. A conclusão, seu motivo e as
providências requeridas recebem destaque antes da fundamentação, que reúne
perguntas, respostas e geometria em tabela única. Na complementação, distingue-se
o resultado dos critérios da decisão final. A assinatura apresenta analista,
local e data em texto simples, sem seção numerada ou quadro. As orientações repetidas são consolidadas e a
solicitação pública de complementação é apresentada sem expor anotações internas.
As condições não atendidas são explicitadas em frases declarativas, baseadas
somente nas respostas negativas aplicáveis. A conclusão geométrica distingue
adequação, necessidade de ajuste e confirmação pendente. O bloco da conclusão
adota as cores do status efetivamente registrado após a análise, lidas da paleta
oficial única, conforme a fonte interna do motor; não se infere a cor a partir
do placar. A paleta utilizada integra as fontes versionadas, sujeitas à revisão.
O nome do analista corresponde à pessoa vinculada ao seu ID de usuário no SIGMA;
identificação ausente é explicitada. O local institucional é São Paulo - SP.
A data da análise é persistida separadamente da emissão e não é alterada pela
reemissão do documento, conforme a fonte interna do motor. Modelo, autoria, data
e solicitação integram as fontes verificadas para a liberação da notificação.
O registro revalida as pendências e a inexistência de pedido
aberto, preservando autoria e histórico. A ausência de rodada aberta é
apresentada como impedimento ao registro, sem reabertura automática de resultados,
suspensões ou retiradas, conforme a fonte interna do motor de hierarquização.

O criador ou representante legal preenche e salva os atributos; o
administrador pode selecionar a hierarquização e suas demandas. A conclusão
é automática quando todos os valores cadastrais e dinâmicos estão preenchidos
e válidos; a gravação parcial mantém o status de espera. A conclusão
valida os valores coletados e seus domínios, registra autoria e data e devolve
a demanda a `hierarq_em_andamento`, sem nova aprovação cadastral. Havendo outra
rodada pendente, mantém-se a espera até sua conclusão. Zero e falso são valores
válidos; nulos e textos vazios, inclusive os compostos apenas por espaços, não
são preenchimento. Uma conclusão anteriormente registrada não oculta novas
ausências nas colunas vigentes. Coletas abertas devem estar completas antes da
execução da Fase 3. O histórico das
solicitações e dos resultados das notificações é preservado; aceitação pelo
servidor SMTP não constitui confirmação de entrega. O procedimento é detalhado
na fonte interna do módulo da Fase 3 e não modifica a normalização, os pesos ou
as fórmulas de escore apresentados a seguir.
Alterações de atributos, critérios ou pesos descartam imediatamente os
resultados calculados da Fase 3 e da síntese, incluindo relatórios e ranking;
nenhum cálculo anterior permanece armazenado ou é apresentado como atual. A
tela mantém os atributos e pendências da tabela vigente e apresenta os índices
sem resultado até nova execução da Fase 3. Alterações na Fase 1 descartam também
o cálculo da Fase 3, pois seu grupo Risco depende daquela fase; alterações nas
Fases 1 e 2 descartam a síntese. A nova execução considera a rodada inteira.
As escalas ordinais explicitadas na matriz são preservadas ainda que sua
descrição esteja no campo Dado, em vez do título da métrica. Ausências, valores
inválidos e resultados de risco ausentes são apresentados separadamente.
O cálculo utiliza os critérios e pesos da tabela vigente, preservando a
homologação aplicável. Mudanças no conjunto de critérios ou em suas escalas
também exigem recálculo antes da síntese, sem alteração das fórmulas de escore.

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
exclusivamente dos critérios da Fase 3 (atributos). O AHP transforma
julgamentos qualitativos em valores numéricos comparáveis, com **consistência lógica**
e **rastreabilidade**.

**Regras mínimas dos pesos:**

- todo critério processado possui peso associado;
- os pesos são normalizados e somam 1 (salvo tolerância numérica);
- a matriz AHP e a **razão de consistência** são registradas;
- critério sem raster válido bloqueia a homologação ou recalcula pesos por regra
  explícita.

### Preenchimento colaborativo e consolidação de julgamentos

O formulário-modelo público constitui demonstração isolada, sem gravação de
respostas nem aplicação dos pesos às hierarquizações. Conforme a espinha dorsal,
utiliza os sete critérios D1–D7 da planilha
`Matriz_PLI_v6_Blocos_Dimensoes.xlsx`, organizados em três blocos e comparados em
21 pares, sem filtro por fase. Essa simulação não modifica a exclusividade da
Fase 3 nos julgamentos reais.

A matriz de critérios e premissas constitui um registro independente e imutável.
Os convites podem delimitar uma ou mais dimensões por colaborador, apresentando
no formulário apenas os critérios atribuídos, na ordem original da matriz. Cada
recorte deve conter ao menos dois critérios e é preservado com a resposta. Após
o início do preenchimento, não se admite alterar o recorte desse colaborador.
A agregação admite somente respostas do mesmo conjunto ordenado de critérios.
O julgamento AHP contempla exclusivamente os critérios da Fase 3, identificados
pela coluna Etapa, sem incorporar critérios espaciais da Fase 2. A matriz integral
permanece preservada; a filtragem antecede a atribuição de dimensões e exige ao
menos dois critérios elegíveis. Pesos de recortes parciais são locais e não
substituem os pesos do conjunto completo da Fase 3; não se estabelece
automaticamente importância relativa entre dimensões. Registros históricos
incompatíveis, inclusive julgamentos de superfícies, permanecem disponíveis
para consulta, mas não admitem novas respostas, convites, análises ou homologação.
Na Fase 2 não se derivam novos pesos por comparação pareada; permanecem a média
simples e a ponderação por pesos explicitamente informados.
O formulário público oferece ajuda consultiva quando mais de 70% dos pares
foram efetivamente respondidos e RC ≥ 0,10. São simuladas revisões isoladas
dos oito pares respondidos com maior desvio logarítmico em relação às razões
dos pesos; até três pares com maior potencial de redução do RC são indicados.
Enquanto houver pares não respondidos, o diagnóstico é provisório, pois esses
pares mantêm valores iniciais de igualdade. Não se alteram respostas
automaticamente nem se garante consistência por uma revisão isolada.
Permanece o requisito de envio RC < 0,10.
Cada hierarquização associa-se a uma única matriz por vez, enquanto os julgamentos
AHP se vinculam diretamente à matriz avaliada. Uma matriz pode atender a vários
processos e julgamentos; estes podem existir de forma avulsa, antes da associação
a uma hierarquização. A troca da matriz não altera o vínculo dos julgamentos
anteriores. O reaproveitamento dos pesos exige equivalência dos critérios, da
estrutura e das premissas, além de confirmação explícita. Quando houver alteração
metodológica, os julgamentos devem ser revistos e os pesos recalculados; os
resultados derivados não permanecem válidos automaticamente. Essa organização
segue a especificação da espinha dorsal do motor de hierarquização.

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
- **Premissa** — proposição assumida na análise que sustenta a escolha ou a
  interpretação de um critério; seu fundamento e suas referências devem ser explicitados.
- **Premissa de avaliação** — proposição que estabelece como a grandeza medida
  deve ser interpretada em relação ao fenômeno avaliado. Pode ser redigida como
  “Quanto maior [grandeza medida pela variável], maior/menor [fenômeno avaliado]”,
  sem que isso comprove causalidade ou substitua a justificativa.
- **Fundamento da premissa** — justificativa teórica, empírica ou normativa
  que sustenta a proposição, com referências e limites de aplicação.
- **Critério** — propriedade pela qual as alternativas são avaliadas e comparadas,
  operacionalizada por uma variável e interpretada segundo uma premissa de avaliação.
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

### 10.13 Cenário exploratório territorial e por trecho DER

O [estudo de favorabilidade territorial e por trecho DER](../saidas_modelos/gpt_61_sol/index.html)
constitui um cenário experimental independente, não homologado, que preserva a
separação entre contexto territorial, indicadores de rede e atributos do objeto
de demanda. A matriz retificada mantém a rastreabilidade dos 50 critérios de origem;
apenas quatro são calculados nesta rodada. Os demais permanecem classificados como
triagem, atributos de projeto ou pendências de insumo e validação.

O cenário utiliza 645 municípios, com PIB municipal de 2023 e componentes sociais
do Censo 2022, sem desagregação por setor censitário. A superfície territorial
combina massa econômica e um indicador exploratório de privação educacional e de
coleta domiciliar; este último não equivale a um índice validado de vulnerabilidade.
A superfície de rede utiliza 4.782 trechos lineares da malha DER, preservados
em snapshot disponível no repositório, com rodovia, subtrecho e quilometragem.
São normalizados os atributos modelados de demanda e volume/capacidade
previamente associados a cada trecho, sem agregação ou redistribuição municipal.
Há 4.496 trechos com índice completo e 286 sem nota. O ano-base e a calibração
dos atributos modelados não foram comprovados nesta tarefa.

Os critérios são orientados e normalizados por min–max antes da síntese por média
simples, mantendo as duas superfícies separadas. Trechos com indicadores ausentes
não recebem valor zero. As médias exigem todos os critérios ativos e não
renormalizam pesos localmente para encobrir ausências. A ponderação posterior por
AHP depende de julgamentos documentados, verificação de consistência e análise de
sensibilidade, incluindo a dependência entre demanda e volume/capacidade.

Neste cenário, qualquer cálculo baseado no TomTom exige cobertura observada mínima
de 95%, simultaneamente em amostras e extensão elegível, além de comparabilidade
temporal e qualidade geométrica. Imputação não constitui observação para esse
requisito. Com a chave informada, foram realizadas 2.580 consultas instantâneas
em pontos médios dos trechos DER, com 2.339 amostras válidas. A cobertura do
universo é de 48,91% em pontos e 48,90% em extensão representada. As respostas
inválidas superaram 5% do universo; mantendo-as, o teto possível mesmo com todas
as consultas restantes válidas seria de 94,96%, motivando a interrupção desta
tentativa. A extensão representada por pontos médios não comprova medição
contínua de toda a geometria, e a amostra instantânea não caracteriza recorrência.
O critério permanece bloqueado e não participa dos índices. Essa regra experimental não altera
retroativamente os procedimentos descritos nas versões anteriores da nota técnica.

Os insumos, hashes, equações, valores brutos, mapas e testes encontram-se segregados
na pasta do estudo. As superfícies não constituem ranking final de investimentos
nem comprovam benefício incremental de intervenções. Não houve substituição da
matriz operacional, dos operadores ou da síntese vigente do sistema.

---

### 10.14 Produto avulso de influência espacial da rede em 200 m

Em 27/10/2026, produziu-se uma superfície exploratória a partir da camada
linear recalculada com observações TomTom da mesma data, sem mistura com as
janelas anteriores. A nova rodada obteve dados TomTom válidos em 4.752 dos
4.782 trechos (99,37%) e em 99,29% da extensão. Mantida a exigência de
completude dos 11 critérios, 4.471 trechos possuem índice e 311 permanecem
sem índice. Não se preencheram atributos por estimativa nem se corrigiram
automaticamente as associações históricas de VDM.

Conforme o [diagnóstico da rede, seção 6.4](../hierarquizacao/DIAGNOSTICO_DADOS_FAVORABILIDADE_REDE.md),
o campo `fav_rede_dim` é rasterizado em EPSG:5880, com células de 200 × 200 m.
Cada célula do domínio estadual recebe o índice da célula de rede válida mais
próxima, multiplicado por pertinência fuzzy linear decrescente: valor um na
distância zero e zero na maior distância válida do domínio, de 40.526,53 m
nesta grade. Em colisões de linhas na mesma célula, conserva-se o maior
índice. A distância é discretizada pela grade; não representa distância
vetorial exata nem acessibilidade por rede. O alcance automático depende do
domínio de cálculo e não constitui parâmetro empiricamente calibrado.

A superfície representa influência modelada fora das sementes, não dados
observados ou imputação dos índices dos trechos. As lacunas de origem
permanecem no vetor e são identificadas em raster auxiliar. Conservam-se
rasters de distância, pertinência e trecho de origem, além da superfície,
com parâmetros, fontes e hashes no Storage. O exterior do limite estadual
é NoData; zero válido não representa ausência de informação. A operação
não aplica a triagem de elegibilidade, não atualiza ranking ou índices
cadastrais e não constitui homologação. O cenário histórico descrito
anteriormente permanece preservado.

### 10.15 Extração de favorabilidade raster por demanda

A bancada da Fase 2 admite superfícies raster de índices em banda única,
georreferenciada e com valores físicos em [0,1]. Por dimensão, utiliza-se uma
única superfície raster, sem combinação com outras bases no mesmo papel.
Permite-se utilizar raster em uma dimensão e vetor na outra. Para o produto
de rede descrito na seção 10.14, utiliza-se a superfície de índice final;
distância, pertinência, identificação de origem e máscara são produtos auxiliares.
As regras de interseção e agregação vetorial permanecem preservadas.

Conforme o [módulo operacional da Fase 2](../hierarquizacao/MODULO_FASE2_GERADOR_FAVORABILIDADE_TERRITORIAL.md),
adota-se a média ponderada pela área efetiva de interseção:

\[
F_d = \frac{\sum_{i \in V_d} f_i A_{di}}{\sum_{i \in V_d} A_{di}},
\qquad
C_d = 100\,\frac{\sum_{i \in V_d} A_{di}}{A_d}.
\]

Nessas expressões, \(f_i\) é o índice original da célula, \(A_{di}\) é sua
área dentro da demanda, \(A_d\) é a área total da demanda e \(V_d\) contém
células válidas com interseção de área positiva. \(C_d\) informa a cobertura
válida em percentual. A ponderação impede que um pixel que intersecta somente
uma pequena borda tenha o mesmo peso de outro inteiramente contido na demanda.
Representa-se, assim, a favorabilidade da área coberta da demanda, não o melhor
ponto de acesso à rede. Não se atribui precisão espacial superior à da fonte.

Utiliza-se a banda original, sem reamostragem ou leitura da imagem reduzida de
prévia. Os recortes e suas áreas são calculados em EPSG:5880, preservando os
anéis internos das demandas. Zero válido integra a média; NoData e exterior
da fonte são excluídos, sem conversão em zero. Sem área válida, o índice é nulo
e a cobertura é zero. Em cobertura parcial, a média descreve somente a parcela
com dados e deve ser interpretada junto à cobertura, sem imputação ou limiar
automático de aceitação.

Os recortes das células, os valores originais, linha e coluna, a média e a
cobertura são preservados no GeoPackage, com banda, CRS, transformação espacial,
NoData, dimensões e revisão física da fonte nos metadados. A leitura posterior
confere a média e a cobertura contra os recortes persistidos. Os resultados de
tela, PDF, Excel e CSV distinguem a síntese raster do detalhe por célula, sem
inferir classes nominais. A regra raster não é substituída pela medida
exploratória escolhida para vetores. A operação não homologa a superfície nem
altera automaticamente índices cadastrais; o registro continua sujeito à
conferência e confirmação explícitas.

## 11. Fluxo de dados ponta a ponta

```text
ENTRADA: Objeto de demanda (geometria + atributos)
│
├─ FASE 1 — Elegibilidade territorial
│   entrada: camadas consolidadas de restrição e risco
│   processo: interseção objeto de demanda × camadas
│   saída: status_fase1 (apto | apto_com_ressalva | restrito)
│
├─ FASE 2 — Favorabilidade territorial — município e rede rodoviária
│   entrada: raster final de favorabilidade territorial
│   processo: extração espacial (ponto, média zonal, corredor, ...)
│   saída: score_fase2, ranking_fase2, decomposição por dimensão
│
├─ FASE 3 — Priorização de demandas por atributos
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

**Consulta individual das rodadas.** Os resultados das fases, os pesos registrados,
o índice final e a posição são consultados por demanda e hierarquização, sem
substituir os resultados de outras rodadas. O painel restrito organiza a navegação
por tipo de demanda, hierarquização e demanda desde a criação da rodada,
preservando uma única geometria cadastral por demanda. A homologação explícita
atualiza o status técnico das demandas ainda em hierarquização na mesma
transação, sem sobrescrever situações posteriores ou suspensas. A conclusão do
cálculo não implica homologação nem publicação.

**Publicação dos resultados homologados.** Conforme a espinha dorsal, a
homologação registra o estado Homologada nas demandas e a publicação registra
Publicada, mediante transições dedicadas no domínio. A despublicação revoga
a divulgação sem desfazer a homologação ou modificar os resultados salvos,
retornando a demanda ao estado Homologada. Quando outra rodada conserva
publicação vigente, preserva-se o estado Publicada. Situações de execução,
suspensão ou retirada não são sobrescritas. As operações e seus responsáveis
são registrados no histórico da rodada.

A divulgação pública exige seleção de uma única rodada homologada e ação explícita
de gestor ou administrador. Analistas têm somente leitura no MAD; operadores
não têm acesso. A publicação é bloqueada quando não há ranking, quando os
resultados ou a configuração de atributos estão desatualizados, quando há
complementação pendente ou divergência na composição do grupo.
Divulgam-se elegibilidade e índice de risco, favorabilidade de rede e territorial,
priorização, índice geral e posição registrada, com identificação da rodada e
do grupo comparável. Preservam-se os valores originais e a leitura independente
de múltiplas rodadas, sem presumir posições ausentes.

O estado, a autoria, a data e a assinatura dos resultados são persistidos no JSON
da rodada, com histórico das ações de publicação e revogação. A reversão da
homologação revoga a publicação na mesma transação. Resultados alterados ou
desatualizados deixam de ser divulgados; o recálculo e a nova homologação exigem
nova ação de publicação. A restrição aplica-se somente aos resultados públicos,
sem ocultar o cadastro da demanda nem limitar a consulta restrita. A divulgação
não inclui documentos internos, caminhos de arquivos, autoria da publicação ou
dados pessoais e não modifica fórmulas, índices, pesos ou operadores de cálculo.

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
  dimensão + pesos de composição + regras de normalização + relatório + metadados.
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
MODELO_HIERARQUIZACAO_ESPACIAL, MODULO_FASE1/2/3) e `config/matriz-criterios-premissas.json`.*
