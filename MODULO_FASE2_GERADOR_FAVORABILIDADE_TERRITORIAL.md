# Modulo Fase 2 - Gerador da superficie de favorabilidade territorial

## Objetivo do modulo

Este documento define o modulo responsavel por gerar, validar, homologar e publicar
a superficie consolidada de favorabilidade territorial consumida pela Fase 2 da
espinha dorsal do sistema de hierarquizacao e ranqueamento de projetos do PLI.

A Fase 2 e o nucleo do ranking tecnico-territorial. Ela cruza os projetos com uma
superficie de favorabilidade territorial previamente gerada e extrai, para cada
projeto, um indice espacial normalizado.

O papel deste modulo e produzir essa superficie de favorabilidade a partir de camadas
geoespaciais, operadores espaciais, reescalonamento, pesos AHP e algebra de mapas.

## Produto final do modulo

O modulo deve produzir um pacote homologado de Fase 2 contendo:

- raster final de favorabilidade territorial;
- rasters intermediarios por criterio;
- rasters intermediarios normalizados;
- pesos AHP utilizados;
- metadados das camadas de origem;
- regras de transformacao por criterio;
- relatorio de processamento;
- relatorio de validacao;
- identificador de versao;
- status de homologacao.

O raster final deve ser publicado na biblioteca de camadas de indice de favorabilidade
territorial, ficando disponivel para consumo pela Fase 2 da espinha dorsal.

## Conceito metodologico

O modulo deve transformar dados geoespaciais de entrada em superficies raster
continuas e comparaveis. Cada criterio gera um raster normalizado entre 0 e 1. Em
seguida, os rasters sao ponderados por pesos AHP e combinados por algebra de mapas,
preferencialmente por operador de media ponderada.

Fluxo conceitual:

```text
camadas de entrada
    -> validacao e compatibilizacao
    -> operador espacial por criterio
    -> raster continuo por criterio
    -> reescalonamento 0-1
    -> inversao de criterios de relacao negativa
    -> aplicacao dos pesos AHP
    -> media ponderada
    -> raster final de favorabilidade territorial
    -> homologacao
    -> publicacao na biblioteca
```

## Entradas aceitas

O modulo deve aceitar, no minimo:

- WFS;
- Shapefile compactado;
- GeoPackage;
- GeoJSON;
- raster externo ja homologado, quando tecnicamente justificavel;
- outras fontes suportadas pelo motor geoespacial adotado.

Cada insumo deve ser associado a um criterio da Fase 2.

## Cadastro minimo do criterio

Cada criterio processado pelo modulo deve possuir cadastro minimo:

- `criterio_id`;
- `criterio_nome`;
- `dimensao`;
- `fonte_id`;
- `tipo_dado_entrada`: ponto, linha, poligono, tabela, raster;
- `operador_espacial`;
- `relacao`: positiva ou negativa;
- `peso_ahp`;
- `unidade_original`;
- `regra_normalizacao`;
- `resolucao_saida`;
- `crs_saida`;
- `extensao_processamento`;
- `observacao_metodologica`.

## Importacao e recepcao das camadas

O modulo deve conter um motor de input/importacao capaz de receber camadas por WFS ou
upload de arquivos geoespaciais.

### WFS

Para fontes WFS, o modulo deve:

- registrar URL consultada;
- registrar layer/typeName;
- registrar parametros de consulta;
- registrar data e hora da requisicao;
- validar retorno;
- armazenar snapshot do dado importado;
- registrar filtros espaciais ou atributivos aplicados.

### Upload de arquivo

Para arquivos enviados pelo usuario, o modulo deve:

- aceitar Shapefile compactado;
- aceitar GeoPackage;
- aceitar GeoJSON;
- identificar camadas internas quando houver mais de uma;
- validar geometria;
- validar CRS;
- armazenar arquivo original como evidencia.

## Validacao inicial

Cada camada importada deve passar por validacoes antes de gerar raster.

Validacoes minimas:

- camada possui feicoes;
- geometria esta presente;
- CRS esta definido;
- extensao espacial e compativel com a area de estudo;
- tipo geometrico e compativel com o operador definido;
- campos necessarios para ponderacao existem;
- valores numericos esperados sao validos;
- nao ha percentual critico de geometrias nulas ou vazias.

Camadas reprovadas nao devem seguir para o processamento do criterio.

## Compatibilizacao

Antes da aplicacao dos operadores, o modulo deve compatibilizar todos os insumos.

Operacoes minimas:

- reprojetar para o CRS oficial do pacote;
- recortar para a area de estudo;
- corrigir geometrias invalidas;
- remover geometrias vazias;
- padronizar campos de controle;
- aplicar filtros atributivos configurados;
- resolver duplicidades quando houver regra definida.

## Operadores espaciais por criterio

Cada criterio deve declarar qual operador espacial sera usado para gerar sua superficie
continua.

Operadores possiveis:

- distancia euclidiana;
- distancia ponderada;
- custo acumulado;
- densidade de kernel;
- densidade simples;
- interpolacao;
- agregacao por unidade territorial;
- rasterizacao de atributo;
- booleano de presenca/ausencia;
- estatistica zonal;
- modelo de acessibilidade em rede;
- operador customizado homologado.

Exemplos:

```text
proximidade a polos logisticos -> distancia euclidiana ou custo acumulado
acidentes graves -> densidade de kernel
producao agropecuaria -> agregacao municipal ou regional
VDM alto -> distancia ponderada pelo VDM do segmento
vulnerabilidade social -> rasterizacao de indice por setor/municipio
```

## Geracao do raster bruto por criterio

Cada operador deve produzir um raster bruto, ainda na unidade original ou em escala
derivada.

Exemplos:

- metros ate a feicao mais proxima;
- acidentes por km2;
- toneladas por municipio;
- minutos de deslocamento;
- indice de vulnerabilidade;
- valor de producao;
- densidade de equipamentos.

O raster bruto deve ser armazenado como evidencia intermediaria.

## Reescalonamento para 0 a 1

Todos os rasters brutos devem ser reescalonados para a escala comum de 0 a 1.

Regra basica:

```text
valor_normalizado = (valor - minimo) / (maximo - minimo)
```

O modulo deve permitir outras regras quando tecnicamente justificadas:

- winsorizacao por percentis;
- classificacao por quebras naturais;
- curva fuzzy;
- limite maximo saturado;
- normalizacao por meta;
- normalizacao por faixa regulatoria ou tecnica.

Toda regra diferente da transformacao linear simples deve ser registrada no relatorio
metodologico.

## Inversao de criterios de relacao negativa

Depois da normalizacao, criterios de relacao negativa devem ser invertidos.

Regra:

```text
valor_favorabilidade = 1 - valor_normalizado
```

Exemplo:

- quanto maior a distancia ate infraestrutura desejada, pior;
- quanto maior a exposicao a congestionamento, maior a necessidade, quando o criterio
  for necessidade de intervencao;
- quanto maior o custo de acesso, pior.

A inversao deve respeitar a semantica do criterio. O cadastro do criterio deve
informar se o valor maior representa maior ou menor favorabilidade.

## Pesos AHP

Os pesos dos criterios devem ser gerados pelo modulo de pesos AHP ja existente e
consumidos por este modulo.

Regras minimas:

- cada criterio processado deve possuir peso associado;
- pesos devem estar normalizados;
- soma dos pesos deve ser igual a 1, salvo tolerancia numerica;
- a matriz AHP e a razao de consistencia devem ser registradas;
- se houver criterio sem raster valido, o sistema deve bloquear a homologacao ou
  recalcular pesos conforme regra explicita.

## Algebra de mapas

O raster final de favorabilidade territorial deve ser produzido por media ponderada.

Regra conceitual:

```text
favorabilidade =
    raster_criterio_1 * peso_1 +
    raster_criterio_2 * peso_2 +
    ...
    raster_criterio_n * peso_n
```

Com:

```text
soma(pesos) = 1
```

Resultado esperado:

```text
0 = menor favorabilidade territorial
1 = maior favorabilidade territorial
```

## Variáveis do Modulo

### Variáveis de Cadastro de Critério
- `criterio_id`
- `criterio_nome`
- `dimensao`
- `fonte_id`
- `tipo_dado_entrada`
- `operador_espacial`
- `relacao`
- `peso_ahp`
- `unidade_original`
- `regra_normalizacao`
- `resolucao_saida`
- `crs_saida`
- `extensao_processamento`
- `observacao_metodologica`

### Variáveis de Importação de Camada
- `informar_tipo_entrada`
- `informar_caminho_arquivo`
- `informar_crs_origem`
- `definir_filtro_espacial`
- `definir_filtro_atributivo`

### Variáveis de Validação
- `validar_sobreposicoes`
- `validar_lacunas`
- `validar_intersecoes_invalidas`
- `validar_gaps`
- `validar_dangles`
- `validar_crs`
- `validar_tipo_geometrico`
- `validar_campos_obrigatorios`
- `definir_tolerancia_topologica`
- `definir_percentual_critico_erros`

### Variáveis de Compatibilização
- `recortar_area_estudo`
- `corrigir_geometrias_invalidas`
- `remover_geometrias_vazias`
- `padronizar_nomes_campos`
- `reprojetar_crs_destino`

### Variáveis de Operador Espacial
- `selecionar_operador_espacial` (distancia_euclidiana, densidade_kernel, interpolacao, etc.)
- `definir_parametros_operador` (ex: banda, raio, etc.)
- `definir_resolucao_raster`
- `definir_crs_saida`

### Variáveis de Reescalonamento
- `selecionar_regra_normalizacao` (linear, winsorizacao, quebras_naturais, fuzzy, etc.)
- `definir_percentil_inferior` (para winsorização)
- `definir_percentil_superior` (para winsorização)
- `definir_limite_minimo` (para limite saturado)
- `definir_limite_maximo` (para limite saturado)

### Variáveis de Inversão
- `selecionar_regra_inversao` (1 - valor_normalizado)
- `definir_fator_inversao` (opcional)

### Variáveis de Álgebra de Mapas
- `selecionar_operador_algebra` (media_simples, media_ponderada, fuzzy_membership, fuzzy_or, fuzzy_and, fuzzy_gamma)
- `definir_regra_nodata` (bloquear, neutro, minimo, interpolacao)
- `definir_valor_neutro`
- `definir_gamma` (para fuzzy gamma)

### Variáveis de Exportação
- `definir_nome_arquivo_favorabilidade`
- `selecionar_formato_saida` (tiff, geotiff, etc.)
- `definir_crs_saida`
- `selecionar_opcao_salvamento`

### Variáveis de Metadados
- `definir_nome_versao`
- `informar_responsavel_tecnico`
- `informar_observacoes_homologacao`

---

## Funções do Fluxo

O sistema deve ser maleável, permitindo que o usuário:
- Crie novas funções combinando operações disponíveis (construtor de funções)
- Crie novos fluxos combinando funções (construtor de fluxo)

### Funções Padrão da Fase 2

#### FUN-01: Cadastrar Critério
- Entrada: metadados do critério
- Operações: nenhum (apenas cadastro)
- Saída: `criterio_id` e metadados registrados

#### FUN-02: Importar e Validar Camada de Critério
- Entrada: `informar_tipo_entrada`, `informar_caminho_arquivo`, `informar_crs_origem`, `definir_filtro_espacial`, `definir_filtro_atributivo`
- Operações: OP-01 (Carregar Camada) + OP-02 (Validar Camada)
- Saída: camada validada

#### FUN-03: Compatibilizar Camada
- Entrada: camada validada
- Operações: OP-03 (Normalizar Camada)
- Saída: camada compatibilizada (CRS oficial, recortada)

#### FUN-04: Gerar Raster Bruto por Critério
- Entrada: camada compatibilizada, `selecionar_operador_espacial`, `definir_parametros_operador`, `definir_resolucao_raster`, `definir_crs_saida`
- Operações: variável conforme operador (OP-08, OP-09, OP-10, OP-11, OP-12, OP-13, OP-14, OP-15, OP-16, OP-17, OP-18)
- Saída: raster bruto

#### FUN-05: Normalizar Raster (0-1)
- Entrada: raster bruto, `selecionar_regra_normalizacao`, parâmetros específicos da regra
- Operações: OP-23 (Normalizar Raster)
- Saída: raster normalizado (0-1)

#### FUN-06: Inverter Critério Negativo
- Entrada: raster normalizado, `selecionar_regra_inversao`, `definir_fator_inversao`
- Operações: OP-26 (Subtrair) ou cálculo aritmético
- Saída: raster invertido

#### FUN-07: Combinar Rasters (Álgebra de Mapas)
- Entrada: rasters normalizados, `selecionar_operador_algebra` (media_simples, media_ponderada, fuzzy_membership, fuzzy_or, fuzzy_and, fuzzy_gamma), `definir_regra_nodata`, `definir_valor_neutro`, `definir_gamma`
- Operações: OP-27 (Somar Rasters) + OP-28 (Multiplicar Raster por Escalar) + operadores fuzzy
- Saída: raster final de favorabilidade

#### FUN-08: Exportar Raster Final
- Entrada: raster final, `definir_nome_arquivo_favorabilidade`, `selecionar_formato_saida`, `definir_crs_saida`, `selecionar_opcao_salvamento`
- Operações: OP-26 (Exportar Raster)
- Saída: arquivo exportado

#### FUN-09: Gerar Metadados de Versão
- Entrada: `definir_nome_versao`, `informar_responsavel_tecnico`, `informar_observacoes_homologacao`
- Operações: nenhum (geração de metadados)
- Saída: pacote versionado

---

## Fluxo da Fase 2

```text
cadastrar criterio
    -> importar e validar camada
    -> compatibilizar camada
    -> gerar raster bruto por criterio
    -> normalizar raster (0-1)
    -> inverter criterio negativo (se aplicavel)
    -> combinar rasters (algebra de mapas)
    -> exportar raster final
    -> gerar metadados de versao
    -> homologacao
    -> publicacao na biblioteca
```

---

## Tratamento de NoData

O modulo deve possuir regra explicita para valores NoData.

Opcoes possiveis:

- bloquear processamento quando houver NoData em area relevante;
- preencher com valor neutro;
- preencher com minimo;
- preencher por interpolacao;
- recalcular media ponderada apenas com criterios validos na celula;
- aplicar mascara de area elegivel.

A regra adotada deve ser registrada no pacote.

Regra recomendada para o primeiro desenho:

```text
NoData em criterio obrigatorio -> bloqueia homologacao
NoData em criterio opcional -> recalcula pesos locais ou aplica regra homologada
```

## Decomposicao por dimensao

Quando os criterios estiverem organizados por dimensoes, o modulo deve permitir gerar:

- raster por criterio;
- raster por dimensao;
- raster final consolidado.

Isso permite que a Fase 2 da espinha dorsal explique a contribuicao de cada dimensao
para o ranking.

Exemplo:

```text
favorabilidade_tecnica
favorabilidade_economico_financeira
favorabilidade_social
favorabilidade_seguranca
favorabilidade_ambiental
favorabilidade_territorial
favorabilidade_final
```

## Validacao do raster final

Antes da homologacao, o raster final deve ser validado.

Validacoes minimas:

- valores dentro da faixa 0 a 1;
- CRS correto;
- resolucao correta;
- extensao correta;
- alinhamento de grade entre rasters;
- ausencia de NoData indevido;
- estatisticas basicas calculadas;
- distribuicao de valores coerente;
- pesos aplicados corretamente;
- metadados completos;
- rastreabilidade ate os insumos originais.

Estatisticas recomendadas:

- minimo;
- maximo;
- media;
- mediana;
- desvio padrao;
- percentis;
- histograma;
- area por classe de favorabilidade.

## Analise de sensibilidade

O modulo deve permitir armazenar ou executar analise de sensibilidade quando
disponivel.

Possibilidades:

- simulacao de variacao de pesos;
- comparacao entre cenarios AHP;
- mapa de sensibilidade espacial;
- identificacao de criterios mais sensiveis;
- comparacao entre ranking original e ranking por cenario.

A analise de sensibilidade pode ser opcional, mas deve ser prevista no contrato do
pacote.

## Homologacao

Antes de publicar o raster final, o modulo deve gerar uma etapa de homologacao.

Itens minimos da homologacao:

- criterios processados;
- criterios reprovados;
- fontes utilizadas;
- operadores aplicados;
- regras de normalizacao;
- criterios invertidos;
- pesos AHP aplicados;
- razao de consistencia AHP;
- regra de NoData;
- estatisticas do raster final;
- visualizacao do raster final;
- amostra de valores por localidade;
- responsavel tecnico;
- data de homologacao.

Somente pacotes homologados devem aparecer na biblioteca de indice de favorabilidade
territorial.

## Versionamento

Todo pacote publicado deve possuir identificador de versao.

Padrao recomendado:

```text
fase2_favorabilidade_<area_estudo>_<data>_v<numero>
```

Exemplo:

```text
fase2_favorabilidade_sp_2026_07_02_v1
```

Metadados minimos de versao:

- `pacote_id`;
- `versao`;
- `data_criacao`;
- `data_homologacao`;
- `responsavel_tecnico`;
- `status`: rascunho, validado, homologado, arquivado;
- `criterios_incluidos`;
- `pesos_ahp_id`;
- `hash_ou_assinatura_dos_insumos`, se disponivel;
- `observacoes`.

## Publicacao na biblioteca

Apos homologacao, o pacote deve ser publicado na biblioteca de camadas de indice de
favorabilidade territorial.

A biblioteca deve permitir:

- listar pacotes homologados;
- consultar metadados;
- visualizar raster final;
- consultar rasters intermediarios;
- consultar pesos AHP;
- consultar relatorio de processamento;
- selecionar pacote para uma rodada da Fase 2.

## Contrato de saida para a espinha dorsal

O pacote homologado deve expor, no minimo:

```json
{
  "pacote_id": "fase2_favorabilidade_sp_2026_07_02_v1",
  "status": "homologado",
  "crs": "EPSG:XXXX",
  "resolucao": 50,
  "unidade_resolucao": "m",
  "raster_final": {
    "nome": "favorabilidade_territorial",
    "valor_minimo": 0,
    "valor_maximo": 1,
    "nodata": null
  },
  "criterios": [
    {
      "criterio_id": "criterio_001",
      "criterio_nome": "Proximidade com segmentos rodoviarios de VDM alto",
      "dimensao": "Tecnica",
      "operador": "distancia_ponderada",
      "relacao": "positiva",
      "peso_ahp": 0.12,
      "raster_normalizado": "criterio_001_norm"
    }
  ],
  "relatorio_processamento": "...",
  "metadados": "..."
}
```

## Consumo pela Fase 2 da espinha dorsal

Ao consumir o pacote, a espinha dorsal deve extrair o valor do raster final para cada
projeto.

Operadores de extracao possiveis:

- valor no ponto;
- media zonal;
- mediana zonal;
- maximo;
- minimo;
- percentil;
- media ponderada por extensao;
- extracao por corredor ou area de influencia.

Regra conceitual:

```text
score_fase2_projeto = extrair(favorabilidade_territorial, geometria_projeto)
```

O metodo de extracao deve ser registrado na rodada de analise.

## Regras de auditoria

Toda execucao do modulo deve gerar trilha de auditoria:

- usuario responsavel;
- data e hora de importacao;
- fontes importadas;
- parametros de operadores espaciais;
- CRS de origem e destino;
- resolucao adotada;
- extensao de processamento;
- regras de normalizacao;
- criterios invertidos;
- pesos AHP aplicados;
- algebra de mapas executada;
- erros e avisos;
- decisao de homologacao.

## Decisoes conceituais consolidadas

1. A Fase 2 e a etapa de ranking tecnico-territorial.
2. Cada criterio deve gerar uma superficie raster continua ou uma superficie
   homologada equivalente.
3. Todos os criterios devem ser normalizados para 0 a 1.
4. Criterios de relacao negativa devem ser invertidos antes da ponderacao.
5. Pesos AHP devem ser consumidos do modulo de pesos ja existente.
6. O raster final deve ser gerado por algebra de mapas, preferencialmente media
   ponderada.
7. O pacote deve preservar rasters intermediarios, pesos e metadados para auditoria.
8. Somente superficies homologadas devem ser publicadas na biblioteca e consumidas
   pela espinha dorsal.

## Proximos detalhamentos

Este documento define o modulo gerador da superficie de favorabilidade territorial da
Fase 2. Os proximos documentos devem detalhar:

- modulo de recepcao, validacao e normalizacao de atributos de projeto da Fase 3;
- modelo de dados para biblioteca de camadas;
- contrato de API para execucao da Fase 2;
- relacao entre pesos AHP, cenarios e superficies homologadas.

## Implementação da página geradora

A página `geoespacial/gerador-favorabilidade.html` cadastra a superfície territorial,
incluindo grade, CRS, resolução, política de NoData e método de combinação. Ela também
oferece a configuração sequencial de funções/algoritmos, incorpora a bancada de
geoprocessamento e acompanha seus eventos. A superfície é o produto deste módulo; o
índice `score_fase2` por projeto continua sendo produzido posteriormente pela camada
consumidora, mediante extração espacial sobre a geometria do projeto.

Produtos e receitas são persistidos nas tabelas `geoprocessamento.produto`,
`geoprocessamento.produto_fase2`, `geoprocessamento.configuracao_fluxo` e
`geoprocessamento.configuracao_fluxo_item`. Critérios e seus vínculos com a superfície
utilizam `geoprocessamento.criterio_fase2` e
`geoprocessamento.produto_criterio_fase2`.
