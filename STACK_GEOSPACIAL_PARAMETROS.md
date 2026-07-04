# Stack Geoespacial e Variáveis de Operações

## Conceitos e Definições do Sistema

| Conceito | Definição |
|---------|-----------|
| **Operador** | Operação geoespacial específica (ex: overlay, buffer, rasterização) |
| **Variável** | Elemento que armazena um valor ou referência a dados (ex: camada, número, string, CRS) |
| **Parâmetro** | Valor específico de uma variável ou configuração de entrada de um operador |
| **Parâmetro de Função** | Variável exposta como parâmetro de um algoritmo/função (visível na interface) |
| **Algoritmo/Função** | Rotina que combina operadores e variáveis (ex: "Importar Camada") |
| **Processo** | Um operador/função e todas as variáveis conectadas a ele |
| **Conector** | Ligação entre variáveis e operadores que indica fluxo de dados |
| **Fluxo** | Sequência completa de processamento (ex: Fase 1, Fase 2) |
| **Tarefa** | Passo de um fluxo maior |

---

## Stack Tecnológico Python

### Core Geoprocessamento (Obrigatório)

#### **GDAL** (Geospatial Data Abstraction Library)
- **Função**: Biblioteca base para geoprocessamento
- **Responsabilidades**:
  - Leitura/escrita de +200 formatos (vetoriais e raster)
  - Reprojeção CRS
  - Transformações geométricas
  - Operações raster avançadas
  - Rasteirização/vetorização
  - Recortes e warping
- **Instalação**: `conda install -c conda-forge gdal` ou `pip install gdal`
- **Uso**: Base para todas as outras bibliotecas

#### **GeoPandas**
- **Função**: Operações vetoriais complexas
- **Responsabilidades**:
  - Overlay (identity, intersection, union, difference)
  - Buffer espacial
  - Dissolve
  - Explode multipartes
  - Reprojeção (to_crs)
  - Clipping
  - Seleção espacial
- **Instalação**: `pip install geopandas`
- **Dependências**: GDAL, Fiona, Shapely, Pandas

#### **NumPy**
- **Função**: Operações matriciais e matemáticas
- **Responsabilidades**:
  - Álgebra de mapas
  - Operações matemáticas em rasters
  - Manipulação de arrays NumPy
- **Instalação**: `pip install numpy`

#### **SciPy**
- **Função**: Estatística, interpolação, filtros
- **Responsabilidades**:
  - Interpolação (griddata)
  - Densidade de kernel (gaussian_kde)
  - Filtros (convolve, ndimage)
  - Estatísticas (winsorização)
- **Instalação**: `pip install scipy`

### Operações Específicas (Conforme necessidade)

#### **Scikit-learn**
- **Função**: Normalização e escalonamento
- **Responsabilidades**:
  - Normalização MinMaxScaler (0-1)
  - Escalonamento de valores
- **Instalação**: `pip install scikit-learn`

#### **Scipy.spatial**
- **Função**: Distância e análise espacial
- **Responsabilidades**:
  - Distância euclidiana
  - KD-tree para busca espacial
- **Instalação**: incluído no SciPy

#### **NetworkX**
- **Função**: Análise de redes e grafos
- **Responsabilidades**:
  - Custo acumulado em redes
  - Dijkstra shortest path
- **Instalação**: `pip install networkx`

#### **Xarray-spatial**
- **Função**: Operações raster de alto nível
- **Responsabilidades**:
  - Estatísticas zonais
  - Proximity (distância raster)
  - Slope e análise de terreno
- **Instalação**: `pip install xarray-spatial`

#### **Rioxarray**
- **Função**: Interface Xarray para Rasterio
- **Responsabilidades**:
  - Análise raster avançada
  - Reprojeção raster
  - Clipping raster
- **Instalação**: `pip install rioxarray`

### Wrappers Convenientes (Opcional)

#### **Rasterio**
- **Função**: Interface amigável para GDAL raster
- **Responsabilidades**:
  - I/O raster simples
  - Rasterização (rasterize)
  - Recorte por máscara (mask)
- **Instalação**: `pip install rasterio`

#### **Fiona**
- **Função**: Interface amigável para GDAL/OGR
- **Responsabilidades**:
  - I/O vetorial simples
  - Suporte a múltiplos formatos
- **Instalação**: `pip install fiona`

#### **Shapely**
- **Função**: Operações geométricas individuais
- **Responsabilidades**:
  - Validação de geometria (is_valid, make_valid)
  - Operações geométricas básicas
- **Instalação**: incluído no GeoPandas

---

## Frontend: MapLibre GL

### **Características**
- WebGL-based (GPU-accelerated)
- Open source (fork do Mapbox GL)
- Estilização avançada
- Suporte a vetor (Vector tiles) e raster (raster tiles)
- Painel de camadas customizável
- Performance alta para grande volume

### **Instalação**
```bash
npm install maplibre-gl
```

### **Uso**
- Visualização de camadas vetoriais (GeoJSON)
- Visualização de rasters (XYZ tiles)
- Painel de camadas com opacidade e visibilidade
- Filtros dinâmicos
- Zoom-dependente styling

---

## Operações de Geoprocessamento e Variáveis

### Operações sobre Geo-objetos (Vetoriais)

#### **OP-01: Carregar Camada**
**Mapeamento Python**: GeoPandas/Fiona (`read_file`, `open`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `informar_tipo_entrada` | engine | Tipo de entrada: local/WFS |
| `informar_caminho_arquivo` | filename | Caminho do arquivo ou URL |
| `informar_crs_origem` | crs | CRS do dado (auto-detectado ou manual) |
| `definir_filtro_espacial` | bbox/mask | Bbox para filtro espacial (opcional) |
| `definir_filtro_atributivo` | columns | Condição SQL para filtro (opcional) |

---

#### **OP-02: Validar Camada**
**Mapeamento Python**: Shapely (`is_valid`, `explain_validity`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `validar_sobreposicoes` | overlay | Detectar sobreposições indevidas |
| `validar_lacunas` | gap analysis | Detectar lacunas entre polígonos |
| `validar_intersecoes_invalidas` | is_valid | Detectar auto-interseções |
| `validar_gaps` | gap analysis | Detectar gaps em linhas |
| `validar_dangles` | topology analysis | Detectar linhas não conectadas |
| `validar_crs` | crs | Validar CRS |
| `validar_tipo_geometrico` | geometry.type | Validar tipo geométrico |
| `validar_campos_obrigatorios` | schema | Validar campos obrigatórios |
| `definir_tolerancia_topologica` | tolerance | Tolerância para validação |
| `definir_percentual_critico_erros` | threshold | Limite percentual de erros |

---

#### **OP-02-CORR: Reparar Geometrias (Topologia)**
**Mapeamento Python**: Shapely (`make_valid`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `corrigir_geometrias_invalidas` | make_valid | Corrigir geometrias inválidas |
| `corrigir_orientacao_aneis` | orientation | Corrigir orientação de polígonos |
| `corrigir_fechamento_aneis` | close_rings | Fechar anéis abertos |
| `corrigir_repeticao_pontos` | remove_duplicate_points | Remover pontos duplicados |
| `corrigir_auto_intersecoes` | make_valid | Corrigir auto-interseções |
| `corrigir_geometrias_degeneradas` | remove_degenerate | Corrigir geometrias degeneradas |
| `corrigir_vertices_colineares` | simplify | Remover vértices colineares |
| `definir_tolerancia_correcao` | tolerance | Tolerância para correção |
| `manter_geometria_original_falha` | fallback | Manter original se falhar correção |

---

#### **OP-03: Normalizar Camada (Rescalonamento)**
**Mapeamento Python**: GeoPandas (`to_crs`, `clip`, `explode`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_crs_destino` | to_crs | CRS oficial de destino (fixo) |
| `recortar_area_estudo` | clip | Recortar para área de estudo |
| `definir_area_estudo` | bbox | Bbox automático (fixo) |
| `corrigir_geometrias_invalidas` | make_valid | Corrigir geometrias automaticamente |
| `remover_geometrias_vazias` | filter | Remover geometrias vazias |
| `explodir_multipartes` | explode | Explodir multipartes |
| `padronizar_nomes_campos` | rename columns | Padronizar nomes de campos |
| `definir_regra_nomenclatura` | prefix | Regra: `<fonte_id>__<nome_campo>` (fixo) |

---

#### **OP-04: Criar Buffer**
**Mapeamento Python**: GeoPandas (`buffer`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_distancia_buffer` | distance | Distância do buffer |
| `definir_unidade_buffer` | distance | Unidade: metros/graus |
| `selecionar_tipo_buffer` | single_sided | Tipo: cheio/externo |
| `dissolver_geometrias` | dissolve | Dissolver após buffer |
| `recortar_area_estudo` | clip | Recortar para área de estudo |

---

#### **OP-05: Sobrepor Camadas**
**Mapeamento Python**: GeoPandas (`overlay`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_tipo_overlay` | how | Tipo: identity/intersection/union/difference |
| `resolver_conflitos_campos` | make_valid | Resolver conflitos de campos |
| `definir_regra_nomenclatura_conflito` | suffix | Regra: `<fonte_id>__<nome_campo>` (fixo) |

---

#### **OP-06: Dissolver**
**Mapeamento Python**: GeoPandas (`dissolve`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_campo_agrupamento` | by | Campo(s) para agrupamento |
| `manter_atributos` | aggfunc | Função de agregação |
| `manter_geometria_multi` | dropna, as_index | Manter geometria multi |

---

#### **OP-07: Selecionar por Localização**
**Mapeamento Python**: GeoPandas (`sjoin`, spatial predicates)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_tipo_selecao` | predicate | Tipo: intersects/contains/within/touches |
| `inverter_selecao` | ~mask | Inverter seleção |

---

### Operações de Transformação

#### **OP-08: Converter para Raster**
**Mapeamento Python**: Rasterio (`rasterize`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_resolucao_raster` | out_shape | Resolução do raster |
| `definir_crs_destino` | transform | CRS de destino (fixo) |
| `selecionar_metodo_rasterizacao` | all_touched | Método: ponto_central/area_ponderada/maioria |
| `selecionar_atributo_rasterizacao` | shapes | Campo com valor a rasterizar |
| `definir_valor_preenchimento` | fill | Valor para preenchimento |
| `processar_todas_celulas_tocadas` | all_touched | Processar todas as células tocadas |

---

### Operações sobre Geo-campos (Raster)

#### **OP-10: Calcular Distância**
**Mapeamento Python**: GDAL (`gdal_proximity`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_resolucao_distancia` | resolution | Resolução da distância |
| `definir_distancia_maxima` | max_distance | Distância máxima (opcional) |
| `definir_unidade_distancia` | CRS | Unidade: metros/graus |

---

#### **OP-11: Calcular Distância Ponderada**
**Mapeamento Python**: Custom (ponderação por atributo)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_atributo_peso` | campo | Campo com peso |
| `definir_resolucao_distancia` | resolution | Resolução da distância |
| `normalizar_resultado` | scale | Normalizar resultado |

---

#### **OP-12: Calcular Densidade**
**Mapeamento Python**: SciPy (`gaussian_kde`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_tipo_kernel` | kernel type | Tipo: gaussiano/epanechnikov/quadratic |
| `definir_largura_kernel` | bandwidth | Largura do kernel |
| `definir_resolucao_kernel` | grid resolution | Resolução do grid |
| `normalizar_resultado` | scale | Normalizar resultado |

---

#### **OP-13: Calcular Custo Acumulado**
**Mapeamento Python**: NetworkX (`dijkstra_path_length`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `informar_raster_custo` | graph weights | Raster de custo (fricção) |
| `informar_pontos_origem` | source nodes | GeoDataFrame de pontos de origem |
| `definir_custo_maximo` | cutoff | Custo máximo (opcional) |

---

#### **OP-14: Interpolar Valores**
**Mapeamento Python**: SciPy (`griddata`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_metodo_interpolacao` | method | Método: idw/kriging/spline |
| `definir_resolucao_interpolacao` | xi (grid) | Resolução do grid |
| `definir_potencia_interpolacao` | power | Potência (para IDW custom) |
| `definir_raio_busca` | radius | Raio de busca |

---

#### **OP-15: Agregar por Território**
**Mapeamento Python**: GeoPandas/Pandas (`groupby.agg`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_campo_unidade` | groupby | Campo de unidade territorial |
| `selecionar_funcao_agregacao` | aggfunc | Função: soma/media/mediana/max/min |
| `selecionar_atributo_agregacao` | column | Campo a agregar |
| `definir_resolucao_saida` | (se raster) | Resolução de saída (se raster) |

---

#### **OP-16: Criar Camada Booleana**
**Mapeamento Python**: Rasterio (`rasterize`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_resolucao_raster` | out_shape | Resolução do raster |
| `definir_valor_presenca` | 1 (fixo) | Valor para presença |
| `definir_valor_ausencia` | 0 (fixo) | Valor para ausência |

---

#### **OP-17: Combinar Rasters**
**Mapeamento Python**: NumPy (soma ponderada)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_metodo_combinacao` | operation | Método: soma/media_ponderada/multiplicacao |
| `definir_pesos_criterios` | weights array | Array de pesos |
| `normalizar_pesos` | normalize | Normalizar pesos para soma=1 |

---

#### **OP-20: Normalizar Raster**
**Mapeamento Python**: Scikit-learn (`MinMaxScaler`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_escala_normalizacao` | feature_range | Escala: 0-1 (fixo) |
| `selecionar_metodo_normalizacao` | method | Método: linear/winsorização/quebras_naturais |
| `definir_limite_superior` | clip | Limite superior (opcional) |
| `inverter_valores` | 1 - x | Inverter valores (para critérios negativos) |

---

#### **OP-21: Recortar Raster**
**Mapeamento Python**: Rasterio (`mask`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `manter_extensao_original` | crop=False | Manter extensão original |
| `recortar_bbox` | crop=True | Recortar para bbox |
| `definir_valor_nodata_mask` | nodata | Valor para áreas fora do polígono |

---

#### **OP-22: Calcular Estatísticas por Zona**
**Mapeamento Python**: Rasterio/Xarray (`zonal_stats`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_estatisticas` | stats list | Estatísticas: min/max/media/mediana/soma/desvio/percentis |
| `definir_percentis` | percentiles array | Array de percentis |

---

### Operações Mistas

#### **OP-23: Amostrar Raster em Pontos**
**Mapeamento Python**: Rasterio (`sample`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_metodo_amostragem` | interpolation | Método: valor_ponto/interpolado |
| `tratar_valores_nodata` | fill_value | Tratamento de NoData |

---

#### **OP-24: Extrair Valores em Polígono**
**Mapeamento Python**: Rasterio/Zonal (`zonal_stats`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `selecionar_metodo_extracao` | stat type | Método: media/mediana/max/min/soma |
| `selecionar_geometria_utilizada` | geometry | Geometria: ponto_central/centroide/poligono_completo |

---

### Operações de Exportação

#### **OP-25: Exportar Camada Vetorial**
**Mapeamento Python**: GeoPandas/Fiona (`to_file`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_nome_arquivo` | path | Nome do arquivo |
| `selecionar_formato_saida` | driver | Formato: shapefile/geopackage/geojson |
| `definir_crs_saida` | crs | CRS de destino |
| `selecionar_opcao_salvamento` | memory/database | Opção: memoria/persistir_sistema |

---

#### **OP-26: Exportar Raster**
**Mapeamento Python**: Rasterio (`write`)

| Variável Amigável | Mapeamento Python | Descrição |
|-------------------|-------------------|-----------|
| `definir_nome_arquivo` | path | Nome do arquivo |
| `selecionar_formato_saida` | driver | Formato: geotiff |
| `comprimir_arquivo` | compress | Comprimir arquivo |
| `selecionar_opcao_salvamento` | memory/database | Opção: memoria/persistir_sistema |

---

## Resumo

- **Total de operações**: 23 operações essenciais
- **Total de parâmetros**: ~120 parâmetros organizados
- **Stack Python**: GDAL, GeoPandas, NumPy, SciPy, Scikit-learn, NetworkX, Xarray-spatial, Rioxarray, Rasterio, Fiona, Shapely
- **Frontend**: MapLibre GL
- **Padrão de nomenclatura**: Verbos no infinitivo em português
