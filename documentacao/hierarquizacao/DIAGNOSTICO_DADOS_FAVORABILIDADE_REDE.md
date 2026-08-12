# Diagnóstico Metodológico — Camada de Favorabilidade da Rede (Fase 2)

> Documento vivo. Registra o diagnóstico dos dados necessários para produzir a
> **camada de favorabilidade da rede** da Fase 2 do sistema de hierarquização, o
> confronto com os insumos disponíveis e as lacunas a resolver. Deve ser
> atualizado a cada avanço.

- **Etapa:** Fase 2 — Favorabilidade territorial e da rede
- **Camada em foco:** Favorabilidade da **rede** (a camada de **grade** será tratada à parte)
- **Matriz de referência:** `documentacao/matrizes/Matriz_Criterios_Premissas_PLI-SP_v3.xlsx`, aba `Matriz Crit Premissas v3`
- **Última atualização:** 2026-08-10

---

## 1. Objetivo da seção

Produzir a **superfície contínua de favorabilidade da rede**: uma camada que
atribui, em todo o território elegível herdado da Fase 1, um grau de
favorabilidade para receber investimento em infraestrutura, com base nas
condições da malha de transporte (demanda, saturação, segurança, acessibilidade
funcional, conflito urbano). Diferentemente da Fase 1 (eliminatória), esta etapa
é **compensatória/graduada**: não elimina áreas, apenas as pontua.

## 2. Composição dos critérios (16 critérios de classificação "rede")

Os 16 critérios se dividem em dois blocos, conforme o operador espacial exigido
pela matriz.

### Bloco A — Distância euclidiana ponderada por atributo (11 critérios)

Exige feições (linhas de segmento ou pontos) com um **atributo numérico** que
pondera a superfície de proximidade, com decaimento gaussiano.

| # | Dimensão | Critério | Atributo/variável necessária | Unidade | Relação |
|---|----------|----------|------------------------------|---------|---------|
| 1 | Técnica | Proximidade com segmentos de VDM alto | Volume Diário Médio por trecho | veículos/dia | ↑ |
| 2 | Técnica | Proximidade com segmentos de saturação elevada | Nível de Serviço (A–F) ou relação V/C | V/C | ↑ |
| 3 | Técnica | Proximidade com segmentos de lentidão recorrente | Excedente de tempo vs. fluxo livre | minutos | ↑ |
| 4 | Técnica | Proximidade com segmentos de pavimento degradado | Índice IRI/PCI (ou idade do pavimento) | índice | ↑ |
| 5 | Técnica | Proximidade com segmentos de geometria deficiente | Índice de deficiência (inclinação, raio, velocidade) | índice | ↑ |
| 6 | Técnica | Proximidade com segmentos de sobrecarga sazonal | Razão VDM sazonal / VDM médio | razão | ↑ |
| 11 | Segurança | Proximidade com segmentos de alta gravidade de acidentes | Densidade de óbitos + feridos graves por km | ocorr./km | ↑ |
| 12 | Segurança | Proximidade com acidentes de usuários vulneráveis | Ocorrências/ano com pedestres/ciclistas/motociclistas | ocorr./ano | ↑ |
| 13 | Segurança | Proximidade com concentração de pontos críticos | Densidade kernel de acidentes graves | ocorr./km | ↑ |
| 14 | Territorial | Proximidade com segmentos de conflito urbano-regional | Índice de conflito passagem × tráfego local | horas de pico | ↑ |
| 15 | Territorial | Proximidade com segmentos de interferência urbano-portuária | Índice de conflito urbano-portuário | índice | ↑ |

### Bloco B — Custo acumulado em rede / acessibilidade potencial (5 critérios)

Exige uma **rede roteável (grafo com custo/tempo de percurso)** e **pontos de
destino/polos**.

| # | Dimensão | Critério | Rede necessária | Destinos/pontos necessários | Relação |
|---|----------|----------|-----------------|-----------------------------|---------|
| 7 | Econômica | Maior acessibilidade temporal aos destinos relevantes | Rede com tempo de percurso | Destinos O-D relevantes | ↓ |
| 8 | Econômica | Maior acessibilidade funcional a eixos hidroviários | Rede multimodal | Terminais/eixos hidroviários | ↑ |
| 9 | Econômica | Maior acessibilidade funcional à malha ferroviária | Rede multimodal | Malha ferroviária ativa | ↑ |
| 10 | Social | Maior acessibilidade funcional a polos logísticos | Rede com tempo | Portos e aeroportos | ↑ |
| 16 | Territorial | Maior acessibilidade funcional a nós intermodais | Rede com tempo | Portos, aeroportos, terminais, pátios | ↑ |

## 3. Insumos-base necessários (consolidação)

Reduzindo os 16 critérios às fontes reais, são necessários **4 conjuntos de dados**:

1. **Malha rodoviária estadual segmentada** com atributos operacionais por trecho
   (VDM, NS/V-C, tempo real vs. fluxo livre, IRI/PCI, geometria, sazonalidade,
   índices de conflito). → critérios 1–6, 14, 15.
2. **Base de acidentes georreferenciada (InfoSiga)** com gravidade e tipo de
   usuário. → critérios 11, 12, 13.
3. **Rede de transporte roteável (grafo com custo/tempo)**, idealmente multimodal
   (rodo + ferro + hidro). → critérios 7, 8, 9, 10, 16.
4. **Pontos/eixos de destino logístico**: portos, aeroportos, terminais
   intermodais, pátios, malha ferroviária e hidroviária. → critérios 8, 9, 10, 16.

## 4. Inventário de insumos disponíveis

### 4.1 Malha rodoviária estadual (DISPONÍVEL)

- **Arquivo:** `data/geoespacial/uploads/datastorage/vetor/sistema_rodoviario_estadual.zip.contents/MALHA_RODOVIARIA.shp`
- **Fonte:** DER-SP — Sistema Rodoviário Estadual
- **Feições:** 4.782 segmentos (Line/MultiLineString)
- **CRS:** EPSG:5880 (SIRGAS 2000 / Brazil Polyconic)
- **Segmentação:** por trecho com quilometragem (`KmInicial`, `KmFinal`, `Extensao`, `Subtrecho`)

**Atributos presentes e úteis:**

| Atributo | Uso na metodologia |
|----------|--------------------|
| `TipoPista` (PAV/DUP…) | insumo parcial de capacidade/geometria (crit. 5) |
| `PerimetroU` (Sim/Não) | insumo dos critérios de conflito urbano (crit. 14 e 15) |
| `Rodovia`, `Subtrecho`, `KmInicial`, `KmFinal` | chave para junção de dados externos por trecho |
| `Jurisdicao`, `Administra`, `Conservado` | recorte/filtro da rede estadual |
| geometria + topologia | base para construção da rede roteável (Bloco B) |

**Conclusão:** a malha resolve a **geometria-base** (esqueleto linear e base do
grafo roteável), mas **não** contém os atributos operacionais que ponderam os
critérios do Bloco A.

**Estratégia de segmentação (decidida):** a unidade de análise da rede é o
**subtrecho já existente na malha** (`Subtrecho`, 4.782 feições). Os atributos
externos (acidentes, VDM etc.) são agregados por subtrecho, sem re-segmentação.

### 4.2 Base de acidentes InfoSiga (DISPONÍVEL — repositório externo somente-leitura)

- **Local:** `D:/REPOSITORIOS/acidentes_infosiga_analise_exploratoria/dados/dados_infosiga/`
- **Fonte:** CGSV — Infosiga SP (Governo do Estado de São Paulo)
- **Tabela-chave:** `sinistros_2015-2021.csv` (535.566) e `sinistros_2022-2026.csv` (828.504); 48 colunas; encoding latin-1; separador `;`
- **Tabelas de apoio:** `pessoas_*` (vítimas, gravidade da lesão, tipo de vítima) e `veiculos_*`

**Validação (janela 2022-2026):**

| Verificação | Resultado |
|-------------|-----------|
| Coordenada válida em SP (`latitude`/`longitude`) | 727.371 / 828.504 (**87,8%**) |
| `tipo_via` = ESTRADAS E RODOVIAS | 132.727 (recorte de rede) |
| Filtro fino de rede | `administracao` = DER, CONCESSIONÁRIA, ARTESP, DNIT |
| `qtd_gravidade_fatal` | soma 24.446 |
| `qtd_gravidade_grave` | soma 55.979 |
| `qtd_pedestre` / `qtd_bicicleta` / `qtd_motocicleta` | 49.735 / 19.026 / 332.843 |

**Encaixe dos critérios (Bloco A — segurança):**

| # | Critério | Campos InfoSiga | Agregação por subtrecho |
|---|----------|-----------------|--------------------------|
| 11 | Gravidade de acidentes | `qtd_gravidade_fatal` + `qtd_gravidade_grave` | densidade ponderada de óbitos/feridos graves por km |
| 12 | Usuários vulneráveis | `qtd_pedestre` + `qtd_bicicleta` + `qtd_motocicleta` | ocorrências/ano com vulneráveis por km |
| 13 | Pontos críticos (black spots) | todos os sinistros graves/fatais georreferenciados | densidade kernel de acidentes graves |

**Fluxo previsto:** (1) ler sinistros → (2) filtrar rodovias estaduais + coordenada
válida → (3) construir pontos e reprojetar para EPSG:5880 → (4) associar cada ponto
ao subtrecho mais próximo dentro de tolerância → (5) agregar as contagens por
subtrecho → (6) gerar a superfície de distância euclidiana ponderada com decaimento
gaussiano (etapa posterior, fora deste passo de brutos).

## 4.3 Produto gerado — camada de favorabilidade da rede

- **Arquivo:** `data/geoespacial/outputs/favorabilidade_rede.gpkg` (layer `favorabilidade_rede`)
- **Origem:** cópia da malha DER-SP (4.782 subtrechos, EPSG:5880); recebe uma coluna por critério
- **Estado atual:** apenas **valores brutos** (sem reescalonamento; normalização será aplicada ao final, quando todos os critérios estiverem prontos)
- **Script gerador:** `tmp/fase2_rede_criterios_seguranca.py`

**Parâmetros da associação (critérios 11/12/13):**

| Parâmetro | Valor |
|-----------|-------|
| Janela temporal | 2022–2026 |
| Filtro de via | `tipo_via` = ESTRADAS E RODOVIAS + coordenada válida em SP |
| Associação ponto→subtrecho | vizinho mais próximo (`sjoin_nearest`) |
| Tolerância máxima | 200 m |
| Sinistros associados | 121.055 de 128.502 (**90,0%**) |

**Colunas brutas incorporadas:**

| Coluna | Critério | Definição (bruto) | Soma | Subtrechos > 0 |
|--------|----------|-------------------|------|-----------------|
| `c11_fatal` | 11 | Σ `qtd_gravidade_fatal` no subtrecho | 10.441 | 2.490 |
| `c11_grave` | 11 | Σ `qtd_gravidade_grave` no subtrecho | 14.743 | 2.620 |
| `c12_pedes` | 12 | Σ `qtd_pedestre` no subtrecho | 4.548 | 1.418 |
| `c12_bike` | 12 | Σ `qtd_bicicleta` no subtrecho | 2.127 | 954 |
| `c12_moto` | 12 | Σ `qtd_motocicleta` no subtrecho | 47.902 | 3.040 |
| `c13_nsin_gr` | 13 | nº de sinistros graves/fatais no subtrecho | 22.823 | 3.241 |
| `n_sin_tot` | apoio | total de sinistros associados ao subtrecho | 121.055 | 3.953 |
| `c14_urb_m` | 14 | extensão (m) do subtrecho dentro de área urbanizada IBGE | 3.391.378 m | 2.929 |
| `c14_dens_m` | 14 | extensão (m) do subtrecho dentro de área urbanizada **densa** | 2.905.276 m | 2.595 |
| `c14_urb_fr` | 14 | fração urbana do subtrecho (`c14_urb_m / ext_m`) | média 0,26 | 430 (100% urbano) |
| `ext_m` | apoio | extensão do subtrecho em metros (EPSG:5880) | — | 4.782 |
| `c15_port` | 15 | flag: subtrecho em município portuário | 44 | 44 |
| `c15_urb_m` | 15 | extensão urbana (m) do subtrecho em município portuário | 90.225 m | 36 |
| `c15_dens_m` | 15 | extensão urbana **densa** (m) em município portuário | 85.003 m | 33 |
| `c1_vdm` | 1 | VDM médio do subtrecho (média de `vol_inter`) | méd. 9.275 | 4.496 |
| `c1_vdm_max` | 1 | VDM de pico no subtrecho (máx. de `vol_inter`) | máx. 152.346 | 4.496 |
| `n_amostra` | apoio | nº de pontos de amostragem com VDM no subtrecho | — | 4.496 |
| `c2_vc` | 2 | relação V/C média do subtrecho | méd. 0,284 | 4.496 |
| `c2_vc_max` | 2 | relação V/C de pico no subtrecho | máx. 2,951 | 4.496 |
| `c2_los` | 2 | pior Nível de Serviço (A=1 … F=6) | 239 trechos LOS F | 4.496 |
| `c5_relevo` | 5 | pior relevo (Plana=1, Ondulada=2, Montanhosa=3) | 100 montanhosos | 4.496 |
| `c5_v0` | 5 | velocidade livre média (km/h; menor = pior geometria) | méd. 72,6 | 4.496 |
| `c7_polo_m` | 7 | distância (m) ao polo relevante mais próximo (porto/aeroporto) | — | 4.782 |
| `c8_hidrov_m` | 8 | distância (m) ao terminal hidroviário mais próximo | méd. 117.951 | 4.782 |
| `c9_ferrov_m` | 9 | distância (m) à ferrovia ativa mais próxima | méd. 12.971 | 4.782 |
| `c10_porto_m` | 10 | distância (m) ao porto mais próximo | méd. 84.918 | 4.782 |
| `c10_aero_m` | 10 | distância (m) ao aeroporto público mais próximo | méd. 22.630 | 4.782 |
| `c16_interm_m` | 16 | distância (m) ao nó intermodal mais próximo | méd. 10.599 | 4.782 |
| `c3_cur` | 3 | velocidade atual (km/h) no ponto médio (TomTom) | — | 3.001 |
| `c3_free` | 3 | velocidade de fluxo livre (km/h) | — | 3.001 |
| `c3_ratio` | 3 | razão fluxo livre/atual (maior = mais congestionado) | méd. 1,01 · máx. 3,59 | 3.001 |
| `c3_delay_s` | 3 | tempo perdido no segmento (s) = atual − fluxo livre | — | 3.001 |

> Observação: a soma por rodovias estaduais é menor que o total InfoSiga porque o
> recorte considera apenas sinistros a até 200 m da malha estadual (exclui malha
> federal/municipal e concessões fora da malha DER).

## 4.4 Passos metodológicos executados (critérios 11, 12 e 13)

Registro reproduzível do procedimento aplicado para gerar os valores brutos de
segurança. Script de referência: `tmp/fase2_rede_criterios_seguranca.py`.

**Passo 1 — Base canônica (unidade de análise).**
Leitura da malha DER-SP (`MALHA_RODOVIARIA.shp`) e reprojeção para EPSG:5880
(métrico). Cada uma das 4.782 feições é um subtrecho e recebe um identificador
interno estável (`sub_id`) para as junções. A malha é a base canônica: os
critérios entram como colunas, sem re-segmentar a geometria.

**Passo 2 — Leitura e recorte dos sinistros.**
Leitura de `sinistros_2022-2026.csv` (separador `;`, encoding latin-1). Aplicados
dois filtros de recorte:
- `tipo_via` igual a "ESTRADAS E RODOVIAS" (descarta vias urbanas e não disponíveis);
- coordenada válida: `latitude`/`longitude` convertidas para número (vírgula → ponto)
  e restritas à caixa envolvente do Estado de São Paulo
  (lat ∈ [−25,5; −19,5], lon ∈ [−53,5; −44,0]).

Resultado do recorte: 128.502 sinistros elegíveis.

**Passo 3 — Preparo dos campos dos critérios.**
Conversão para numérico (com zero para ausências) das colunas:
`qtd_gravidade_fatal`, `qtd_gravidade_grave`, `qtd_pedestre`, `qtd_bicicleta`,
`qtd_motocicleta`.

**Passo 4 — Espacialização.**
Construção de geometria de ponto a partir de `longitude`/`latitude` em EPSG:4326 e
reprojeção para EPSG:5880, garantindo mesma referência métrica da malha.

**Passo 5 — Associação ponto → subtrecho.**
Junção espacial por vizinho mais próximo (`sjoin_nearest`) entre cada sinistro e o
subtrecho mais próximo, com **tolerância máxima de 200 m** e registro da distância
de associação (`dist_m`). Sinistros além de 200 m de qualquer subtrecho estadual
são descartados (evita atribuir acidentes de malha federal/municipal). Foram
associados 121.055 sinistros (90,0% dos elegíveis).

**Passo 6 — Marcação de gravidade (apoio ao critério 13).**
Cada sinistro recebe um marcador `is_grave = 1` quando
`qtd_gravidade_fatal + qtd_gravidade_grave > 0`; caso contrário `0`. Esse marcador
é a base da contagem de sinistros graves/fatais por subtrecho (black spots).

**Passo 7 — Agregação bruta por subtrecho.**
Agrupamento por `sub_id` com somatórios/contagens, sem qualquer normalização:

| Critério | Coluna(s) | Operação de agregação |
|----------|-----------|-----------------------|
| 11 — gravidade | `c11_fatal`, `c11_grave` | soma de fatais e de graves no subtrecho |
| 12 — vulneráveis | `c12_pedes`, `c12_bike`, `c12_moto` | soma de pedestres, ciclistas e motociclistas |
| 13 — black spots | `c13_nsin_gr` | contagem de sinistros com `is_grave = 1` |
| apoio | `n_sin_tot` | contagem total de sinistros associados |

**Passo 8 — Junção na malha e preenchimento.**
Junção das colunas agregadas de volta na malha por `sub_id` (`left join`).
Subtrechos sem sinistros recebem `0` (não `nulo`), e as colunas são convertidas
para inteiro.

**Passo 9 — Persistência.**
Gravação em `data/geoespacial/outputs/favorabilidade_rede.gpkg`, layer
`favorabilidade_rede`, driver GPKG, preservando geometria e todos os atributos
originais da malha acrescidos das colunas brutas.

**Decisões metodológicas assumidas (a revisar quando conveniente):**
- **Janela temporal:** 2022–2026 (série mais recente); a série 2015–2021 fica
  disponível para eventual consolidação histórica.
- **Tolerância de 200 m:** compromisso entre a imprecisão de georreferência do
  InfoSiga e o risco de atribuir sinistros à rodovia errada.
- **Gravidade mantida desagregada** (`fatal` e `grave` em colunas separadas) para
  permitir, na etapa de reescalonamento, pesos distintos (ex.: óbito > ferido grave).
- **Sem normalização por extensão (por km) nesta etapa:** os brutos são contagens
  absolutas; a conversão para densidade (por km) e o reescalonamento 0–1 ocorrerão
  na etapa de síntese, com todos os critérios prontos.

## 4.5 Base de áreas urbanizadas (IBGE) — critério 14

- **Produto:** IBGE — Áreas Urbanizadas do Brasil 2019 (vetorial de polígonos)
- **Download:** `https://geoftp.ibge.gov.br/organizacao_do_territorio/tipologias_do_territorio/areas_urbanizadas_do_brasil/2019/Shapefile/AreasUrbanizadas2019_Brasil.zip`
- **Local:** `data/geoespacial/local/favorabilidade_rede/` (shape `AU_2022_AreasUrbanizadas2019_Brasil.shp`)
- **Feições:** 128.459 polígonos (Brasil), **CRS EPSG:4674** (SIRGAS 2000 geográfico)
- **Campos:** `Tipo` (Área urbanizada; Outros equipamentos urbanos; Loteamento vazio; Vazio intraurbano) e `Densidade` (Densa; Pouco densa; Loteamento vazio)
- **Motivação:** substitui/corrige o campo binário `PerimetroU` do DER por polígonos
  reais de urbanização, capturando a **intensidade** de exposição urbana por trecho.

## 4.6 Passos metodológicos executados (critério 14)

Script de referência: `tmp/fase2_rede_criterio14.py`.

**Passo 1 — Base.** Leitura da camada `favorabilidade_rede.gpkg` (já com 11/12/13)
em EPSG:5880.

**Passo 2 — Máscara urbana.** Pré-filtro dos polígonos do IBGE pela caixa
envolvente da malha (recorte SP), seleção de `Tipo ∈ {Área urbanizada, Outros
equipamentos urbanos}` (exclui loteamento/vazio intraurbano), reprojeção para
EPSG:5880 e correção de geometrias inválidas (`buffer(0)`). Resultado: 21.467
polígonos urbanos na máscara.

**Passo 3 — Interseção linha × polígono.** Para cada subtrecho, cálculo do
comprimento (m) que cai dentro da máscara urbana, via junção espacial indexada
(`sjoin` por `intersects`) seguida de interseção vetorizada (`shapely.intersection`)
apenas nos pares que se cruzam — abordagem eficiente para 4.782 linhas × 21 mil
polígonos.

**Passo 4 — Colunas brutas.**
- `c14_urb_m` = comprimento urbano total do subtrecho;
- `c14_dens_m` = comprimento dentro de área **Densa** (para ponderar intensidade depois);
- `c14_urb_fr` = `c14_urb_m / ext_m` (fração urbana, 0–1);
- `ext_m` = extensão do subtrecho em metros (apoio).

**Passo 5 — Persistência.** Regravação na mesma camada/layer do GeoPackage.

**Cruzamento de validação (DER × IBGE):** o campo `PerimetroU` do DER marca apenas
**251** subtrechos como urbanos (`Sim`) contra **4.531** `Não`; a mancha do IBGE,
porém, detecta exposição urbana em **2.929** subtrechos. Ou seja, o `PerimetroU`
subestima fortemente o conflito urbano, o que confirma a decisão de usar a mancha do
IBGE como base do critério (o `PerimetroU` fica apenas como coluna de conferência).

**Decisões metodológicas assumidas (a revisar quando conveniente):**
- **Máscara urbana** limitada a `Área urbanizada` + `Outros equipamentos urbanos`
  (urbanização efetiva); loteamento/vazio intraurbano ficam de fora.
- **Densidade preservada** (`c14_dens_m`) para permitir ponderar, na síntese,
  áreas densas com peso maior que áreas pouco densas.
- **Sem normalização nesta etapa:** os valores são comprimentos absolutos e fração;
  o reescalonamento 0–1 ocorrerá na etapa de síntese.

## 4.7 Passos metodológicos executados (critério 15)

Critério 15 (conflito urbano-**portuário**) — corresponde, na prática, ao conflito
urbano (critério 14) **restrito às cidades portuárias**. Como não há, nos portais
oficiais consultados, um vetor de portos com extração vetorial aberta (o DataGEO
tem a camada `VWM_INFRAESTRUTURA_TRANSPORTE_HIDROVIAS_2022_PTO_LN`, porém com WFS
desabilitado; CETESB/SEMIL/SP Águas não publicam a camada de forma baixável), o
critério foi derivado dos dados já disponíveis na própria camada.

Script de referência: `tmp/fase2_rede_criterio15.py`.

**Passo 1 — Municípios portuários.** Definição do conjunto de municípios com
operação portuária em SP: Complexo Portuário de Santos (Santos, Guarujá, Cubatão,
São Vicente) e Porto de São Sebastião. Confronto por nome normalizado (sem acento,
minúsculas) contra o campo `Municipio` da malha.

**Passo 2 — Máscara portuária.** Marcação dos subtrechos cujo `Municipio` pertence
ao conjunto (`c15_port = 1`); 44 subtrechos.

**Passo 3 — Colunas brutas.** Reaproveitamento da exposição urbana do IBGE
(critério 14), restrita aos subtrechos portuários:
- `c15_port` = flag município portuário (0/1);
- `c15_urb_m` = `c14_urb_m` nos subtrechos portuários (senão 0);
- `c15_dens_m` = `c14_dens_m` nos subtrechos portuários (senão 0).

**Passo 4 — Persistência.** Regravação na mesma camada/layer do GeoPackage.

**Resultado por município portuário:**

| Município | Subtrechos | `c15_urb_m` | `c15_dens_m` |
|-----------|-----------:|------------:|-------------:|
| São Sebastião | 15 | 42.504 m | 38.998 m |
| Cubatão | 16 | 18.782 m | 18.745 m |
| Guarujá | 4 | 13.716 m | 13.617 m |
| São Vicente | 4 | 7.742 m | 6.683 m |
| Santos | 5 | 7.481 m | 6.960 m |
| **Total** | **44** | **90.225 m** | **85.003 m** |

**Decisões metodológicas assumidas (a revisar quando conveniente):**
- **Conjunto portuário** restrito a Santos (complexo) e São Sebastião; Praia Grande
  e Bertioga ficaram de fora por não terem operação portuária de carga.
- **Reuso da mancha IBGE** como proxy de conflito urbano-portuário: quando houver
  uma camada vetorial de instalações portuárias (ex.: liberação do WFS do DataGEO
  ou dado ANTAQ), o critério pode ser refinado por proximidade real aos terminais.
- **Sem normalização nesta etapa.**

## 4.8 Base de capacidade rodoviária (cap_rodo) — critério 1 (VDM)

- **Arquivo:** `data/geoespacial/local/cap_rodo/cap_rodo_painel.shp`
- **Conteúdo:** rede de capacidade rodoviária modelada; 6.922 segmentos, CRS EPSG:3857
- **Campos úteis:** `vol_inter` (volume/VDM), `v_c` (relação volume/capacidade),
  `los` (Nível de Serviço A–F), `capdiasent` (capacidade dia/sentido), `v0`
  (velocidade livre), `relevo`, `tipologia`, `pavim`, `cod_rod`
- **Critérios que a base destrava:** 1 (VDM, via `vol_inter`), 2 (saturação, via
  `v_c`/`los`) e parcialmente 5 (geometria, via `relevo`/`tipologia`/`v0`)

## 4.9 Passos metodológicos executados (critério 1 — VDM)

Script de referência: `tmp/fase2_rede_criterio1_vdm.py`. A base `cap_rodo` tem
segmentação própria (6.922 segmentos) diferente dos 4.782 subtrechos da malha, o
que exige transferência espacial dos atributos.

**Passo 1 — Bases.** Leitura da camada `favorabilidade_rede.gpkg` e do
`cap_rodo_painel.shp`, ambas reprojetadas para EPSG:5880; `vol_inter` convertido
para número.

**Passo 2 — Amostragem ao longo do subtrecho.** Geração de pontos a cada 200 m ao
longo de cada subtrecho (115.853 pontos), para capturar a variação de VDM em
trechos longos.

**Passo 3 — Junção espacial.** Cada ponto é associado ao segmento `cap_rodo` mais
próximo (`sjoin_nearest`) dentro de tolerância de 150 m, herdando `vol_inter`,
`v_c` e `los`.

**Passo 4 — Agregação por subtrecho.**
- `c1_vdm` = VDM médio dos pontos do subtrecho;
- `c1_vdm_max` = VDM de pico no subtrecho;
- `n_amostra` = nº de pontos com VDM (apoio/qualidade).

**Passo 5 — Persistência.** Junção na camada e regravação no GeoPackage.
Cobertura: **4.496 de 4.782 subtrechos (94,0%)** com VDM associado; VDM médio 9.275,
máximo 152.346.

**Decisões metodológicas assumidas (a revisar quando conveniente):**
- **Amostragem a 200 m + vizinho mais próximo a 150 m:** transfere o VDM da rede
  de capacidade para os subtrechos preservando a variação ao longo do trecho.
- **VDM médio e de pico** guardados separadamente (`c1_vdm`, `c1_vdm_max`) para
  permitir, na síntese, escolher entre exposição média ou de pico.
- **Sem normalização nesta etapa.**
- Os campos `v_c`/`los` já ficam disponíveis para o **critério 2 (saturação)**.

## 4.10 Passos metodológicos executados (critérios 2 e 5)

Ambos extraídos da base `cap_rodo` na **mesma associação espacial** do critério 1
(amostragem a 200 m + `sjoin_nearest` a 150 m). Script de referência:
`tmp/fase2_rede_criterios2e5.py`.

**Critério 2 — saturação (V/C e LOS).**
- `c2_vc` = relação V/C média do subtrecho (`v_c`);
- `c2_vc_max` = V/C de pico;
- `c2_los` = pior Nível de Serviço do subtrecho, com `los` codificado A=1 … F=6 e
  agregado por máximo (o pior nível manda).
- Cobertura 94,0%; V/C médio 0,284; 239 subtrechos operam em LOS F.

**Critério 5 — geometria deficiente (proxy).**
A base não tem raio de curva/rampa explícitos; usa-se um **proxy** de dificuldade
geométrica:
- `c5_relevo` = pior relevo do subtrecho (`relevo` codificado Plana=1, Ondulada=2,
  Montanhosa=3, agregado por máximo);
- `c5_v0` = velocidade livre média (`v0`); velocidades menores indicam geometria
  mais restritiva (relação a inverter na síntese).
- Cobertura 94,0%; 100 subtrechos em relevo montanhoso; `v0` médio 72,6 km/h.

**Decisões metodológicas assumidas (a revisar quando conveniente):**
- **LOS e relevo agregados pelo pior valor** no subtrecho (abordagem conservadora,
  coerente com a lógica de exposição a gargalos).
- **Critério 5 é proxy** (relevo + velocidade), não geometria fina; poderá ser
  refinado se houver dados de raio/rampa por trecho.
- **Sem normalização nesta etapa.**

## 4.11 Bases do Bloco B (acessibilidade)

Fornecidas pelo cliente (acervo Vitor Rozante) e copiadas para
`data/geoespacial/local/favorabilidade_rede/bloco_b/`, mais os aeroportos do DataGEO:

| Base | Arquivo | Feições | Uso |
|------|---------|--------:|-----|
| Ferrovias (linhas) | `ferrovia_linhas/LinhaEstação.shp` | 1.865 c/ geometria (`CodigoSitu`=1) | crit. 9 |
| Estações ferroviárias | `ferrovia_estacoes/Estação.shp` | 2.102 pontos | crit. 16 |
| Instalações portuárias (ANTAQ) | `instalações_portuarias.xlsx` | 38 em SP (lat/long) | crit. 10, 16 |
| Aeroportos públicos (ANAC) | `aeroportos_anac_2021.geojson` (DataGEO WFS) | 72 públicos (de 290) | crit. 10 |
| Hidrovia Tietê (terminais) | `Dados hidrovia Tietê.csv` | 48 pontos (WKT) | crit. 8 |

Observações: os shapefiles de ferrovia não têm `.prj` — assumido EPSG:4674 (as
coordenadas WKT são geográficas SIRGAS). Portos e hidrovia vêm em lat/long
(EPSG:4326). Todas as bases foram reprojetadas para EPSG:5880.

## 4.12 Passos metodológicos executados (critérios 7, 8, 9, 10, 16)

Script de referência: `tmp/fase2_rede_bloco_b.py`.

O operador da matriz para estes critérios é "custo acumulado **em rede**", que
exigiria um grafo roteável. Para o **bruto** desta etapa adota-se um proxy de
acessibilidade: a **distância euclidiana de cada subtrecho ao destino mais
próximo** (via `sjoin_nearest`), em metros. Como a acessibilidade é o **inverso**
da distância, a inversão e a normalização ficam para a etapa de síntese.

**Colunas geradas (distância em metros ao destino mais próximo):**

| Coluna | Critério | Destino | Dist. média |
|--------|----------|---------|------------:|
| `c9_ferrov_m` | 9 | ferrovia ativa (linha) | 12.971 m |
| `c8_hidrov_m` | 8 | terminal hidroviário (Tietê) | 117.951 m |
| `c10_porto_m` | 10 | porto (ANTAQ) | 84.918 m |
| `c10_aero_m` | 10 | aeroporto público (ANAC) | 22.630 m |
| `c16_interm_m` | 16 | nó intermodal (portos+aeroportos+estações+hidrovia; 2.020 nós) | 10.599 m |
| `c7_polo_m` | 7 | polo relevante = min(porto, aeroporto público) | — |

**Decisões metodológicas assumidas (a revisar quando conveniente):**
- **Proximidade euclidiana como proxy** do custo em rede; o custo/tempo em rede
  roteável fica como refino posterior (a `cap_rodo` já traz `v0` para isso).
- **Critério 7** interpretado como acessibilidade aos polos logísticos relevantes
  (portos e aeroportos públicos); a definição dos "destinos relevantes" pode ser
  ampliada (centros urbanos, O-D) quando houver a matriz O-D consolidada.
- **Ferrovias filtradas por `CodigoSitu`=1** (todas ativas na base federal); a base
  cobre o Brasil, mas a distância ao vizinho mais próximo isola naturalmente o
  contexto de SP.
- **Sem normalização nesta etapa.**

## 4.13 Critério 3 (lentidão/congestionamento) — TomTom Traffic Flow

- **Fonte:** TomTom **Traffic Flow API — Segment Data** (free tier: 20.000 req/mês)
- **Script:** `tmp/fase2_rede_criterio3_tomtom.py` (chave lida de `tmp/tomtom_key.txt`,
  fora do versionamento; cache resumível em `tmp/tomtom_flow_cache.csv`)
- **O que a API retorna por ponto:** `currentSpeed` × `freeFlowSpeed` e os tempos
  de viagem correspondentes — exatamente o "minutos adicionais em relação ao fluxo
  livre" pedido pela matriz.

**Passos executados:**
1. Ponto médio de cada subtrecho reprojetado para lat/long (EPSG:4326).
2. Consulta à Flow API (zoom 10, unidade km/h) — 1 requisição por subtrecho.
3. Cálculo dos brutos por subtrecho:
   - `c3_cur` = velocidade atual; `c3_free` = fluxo livre;
   - `c3_ratio` = `c3_free / c3_cur` (≥1; maior = mais congestionado);
   - `c3_delay_s` = `currentTravelTime − freeFlowTravelTime` (s).
4. Consolidação e gravação na camada.

**Resultado:** cobertura **3.001 de 4.782 subtrechos (62,8%)**; os ~1.780 sem
retorno são trechos rurais sem cobertura de fluxo da TomTom. `c3_ratio` médio 1,01
(a maioria das rodovias flui livre), máximo 3,59.

**Decisões metodológicas assumidas (a revisar quando conveniente):**
- **Uma amostra por subtrecho (ponto médio)** e **um único instante de coleta** —
  é uma "foto" do trânsito no momento da execução, não trânsito típico. Para robustez,
  o ideal é amostrar várias janelas de horário e tirar média (ou migrar para o
  histórico Waze/BigQuery quando o credenciamento sair).
- **Cobertura parcial (rural sem dado):** subtrechos sem retorno ficam nulos; a
  síntese deverá tratar ausência (ex.: assumir congestionamento nulo em via rural).
- **Sem normalização nesta etapa.**

## 5. Lacunas de dados (o que ainda falta)

| # | Critério | Atributo/insumo faltante | Origem candidata | Situação |
|---|----------|--------------------------|------------------|----------|
| 1 | VDM alto | Volume Diário Médio por trecho | cap_rodo (`vol_inter`) | **Bruto gerado** |
| 2 | Saturação | Nível de Serviço / relação V/C | cap_rodo (`v_c`/`los`) | **Bruto gerado** |
| 3 | Lentidão | tempo real vs. fluxo livre | TomTom Traffic Flow | **Bruto gerado** |
| 4 | Pavimento | IRI/PCI/IGG por trecho | **Solicitar ao DER-SP** (Ger. de Pavimentos) — não publicado | A solicitar |
| 5 | Geometria | rampa/raio/velocidade | cap_rodo (`relevo`/`v0`) — proxy | **Bruto gerado (proxy)** |
| 6 | Sazonalidade | VDM sazonal / médio | **Solicitar ao DER-SP/ARTESP** (contagens mensais) — não publicado | A solicitar |
| 11 | Gravidade de acidentes | óbitos/feridos por km | InfoSiga | **Bruto gerado** |
| 12 | Vulneráveis | acidentes com pedestres/ciclistas/motociclistas | InfoSiga | **Bruto gerado** |
| 13 | Black spots | densidade de acidentes graves | InfoSiga | **Bruto gerado** |
| 14 | Conflito urbano-regional | índice passagem × local | mancha urbana IBGE 2019 (+ `PerimetroU`) | **Bruto gerado** |
| 15 | Conflito urbano-portuário | índice urbano-portuário | criterio 14 restrito a municípios portuários | **Bruto gerado** |
| 7 | Acessibilidade temporal | rede roteável + destinos O-D | proximidade a portos/aeroportos (proxy) | **Bruto gerado (proxy)** |
| 8 | Acessibilidade hidroviária | rede multimodal + terminais hidroviários | Hidrovia Tietê (48 terminais) | **Bruto gerado** |
| 9 | Acessibilidade ferroviária | rede multimodal + malha ferroviária | Malha Ferroviária Federal | **Bruto gerado** |
| 10 | Polos logísticos | pontos de portos e aeroportos | ANTAQ (portos) + ANAC (aeroportos) | **Bruto gerado** |
| 16 | Nós intermodais | portos, aeroportos, terminais, pátios | união dos nós logísticos | **Bruto gerado** |

## 6. Próximos passos

1. ~~**Produzir os critérios 11, 12 e 13** a partir do InfoSiga~~ — **concluído**
   (ver seções 4.3 e 4.4).
2. ~~**Derivar o critério 14** (conflito urbano-regional) da mancha urbana IBGE~~
   e ~~**o critério 15** (conflito urbano-portuário)~~ — **concluídos** (ver seções
   4.5–4.7). O critério 15 poderá ser refinado quando houver vetor de instalações
   portuárias (WFS DataGEO ou ANTAQ).
3. ~~**Construir a rede roteável** e **levantar os pontos de destino logístico**~~
   — Bloco B (crit. 7, 8, 9, 10, 16) **concluído como bruto** por proximidade
   euclidiana (ver seções 4.11–4.12); o custo em rede roteável fica como refino.
4. **Refinos futuros:** custo/tempo em rede (Bloco B), critério 15 por proximidade
   real aos terminais portuários, critério 5 com geometria fina.
5. ~~**Obter os atributos operacionais** dos trechos (VDM, NS, IRI, sazonalidade)~~
   — VDM (crit. 1), saturação (crit. 2), geometria-proxy (crit. 5) e lentidão
   (crit. 3, TomTom) **concluídos**. Restam **4 (pavimento IRI/PCI) e 6 (sazonalidade)**.
6. **Refino do critério 3:** migrar de "foto" única para trânsito típico/histórico
   (múltiplas janelas TomTom ou histórico Waze/BigQuery após credenciamento).

## 6.1 Roteiro metodológico da favorabilidade (etapas nomeadas)

Sequência oficial, sem nomes de grupos de etapas (aplicável a rede e grade):

1. **Obtenção das medidas específicas brutas das variáveis** — *rede: 14/16 concluídas*.
2. **Reescalonamento das variáveis** — escala comparável 0–1.
3. **Ajuste da relação variável/fenômeno** — sentido (↑/↓) da matriz, invertendo o negativo.
4. **Obtenção dos pesos das variáveis** — técnica de análise multicritério (AHP).
5. **Obtenção do índice de favorabilidade da rede** — álgebra de campos por subtrecho,
   média ponderada das variáveis reescalonadas/ajustadas, pesos vindos do AHP.

### 6.2 Produto reescalonado

- **Arquivo:** `data/geoespacial/outputs/favorabilidade_rede_normalizada.gpkg`
  (layer `favorabilidade_rede_normalizada`).
- **Método:** reescalonamento linear min–max por atributo, segundo
  `n = (x - mínimo) / (máximo - mínimo)`, calculado sobre os valores válidos da
  camada; valores ausentes são preservados.
- **Segurança viária:** as contagens dos critérios 11, 12 e 13 são convertidas em
  densidades por quilômetro de subtrecho antes do reescalonamento, conforme a unidade
  definida para esses critérios.
- **Acessibilidade:** os atributos de distância dos critérios 7, 8, 9, 10 e 16 são
  reescalonados e invertidos (`1 - n`), de modo que menor distância resulte em maior
  favorabilidade. A velocidade observada do critério 3 e a velocidade livre usada como
  proxy do critério 5 seguem a mesma orientação negativa.
- **Conflito territorial:** as extensões urbanas são convertidas em proporções da
  extensão do subtrecho; flags booleanas já compreendidas em `[0,1]` são preservadas.
- **Rastreabilidade:** os atributos brutos são preservados, os reescalonados recebem
  sufixo `_n`, os componentes orientados recebem prefixo `f_` e cada critério
  calculável recebe um único campo `crit_*`; as regras aplicadas constam na tabela
  interna `metadados_normalizacao`. Quando um critério possui mais de um indicador,
  estes são consolidados antes da composição, impedindo que o critério receba peso
  maior apenas por possuir mais colunas.
- **Limite:** os critérios 4 (pavimento) e 6 (sobrecarga sazonal) permanecem sem dado.

### 6.3 Superfície por média simples dos critérios

- **Arquivo:** `data/geoespacial/outputs/favorabilidade_rede_media_simples.gpkg`
  (layer `favorabilidade_rede_media_simples`).
- **Composição:** média aritmética simples dos 14 campos `crit_*` calculáveis da matriz
  v3. Os indicadores de VDM, saturação, lentidão, geometria, acessibilidade, segurança
  e conflito territorial são primeiro consolidados dentro do respectivo critério.
- **NoData:** a média usa os critérios válidos por subtrecho e registra o denominador
  em `n_criterios`; a cobertura observada varia de 11 a 14 critérios. Os critérios 4 e
  6 não entram no denominador por inexistência do atributo bruto.
- **Natureza:** cenário não ponderado solicitado para análise. Não substitui a média
  ponderada por pesos AHP nem constitui superfície homologada.

## 7. Histórico de atualização

| Data | Alteração |
|------|-----------|
| 2026-08-06 | Criação do diagnóstico: critérios da rede (Blocos A e B), insumos-base, inventário da malha rodoviária DER-SP e mapa de lacunas. |
| 2026-08-06 | InfoSiga localizado e validado (seção 4.2); decisão de segmentação por subtrecho; critérios 11/12/13 marcados como disponíveis; próximos passos atualizados. |
| 2026-08-06 | Gerada a camada `favorabilidade_rede.gpkg` (seção 4.3) com os valores brutos dos critérios 11/12/13 por subtrecho; parâmetros de associação e resultados registrados. |
| 2026-08-06 | Documentados os passos metodológicos reproduzíveis (seção 4.4) da construção dos critérios 11/12/13 e as decisões metodológicas assumidas. |
| 2026-08-06 | Critério 14 (conflito urbano-regional) gerado a partir da mancha urbana IBGE 2019 (seções 4.5 e 4.6); colunas `c14_urb_m`, `c14_dens_m`, `c14_urb_fr` e `ext_m` incorporadas; cruzamento de validação DER×IBGE registrado. |
| 2026-08-06 | Critério 15 (conflito urbano-portuário) derivado do critério 14 restrito aos municípios portuários (seção 4.7); colunas `c15_port`, `c15_urb_m`, `c15_dens_m` incorporadas. Registrada a indisponibilidade de vetor de portos nos portais oficiais (DataGEO WFS off; CETESB/SEMIL/SP Águas sem camada baixável). |
| 2026-08-06 | Critério 1 (VDM alto) gerado a partir da base cap_rodo (`vol_inter`) por junção espacial (seções 4.8 e 4.9); colunas `c1_vdm`, `c1_vdm_max`, `n_amostra` incorporadas (cobertura 94%). Identificado que a base cap_rodo também destrava os critérios 2 e parcialmente 5. |
| 2026-08-06 | Critérios 2 (saturação: `c2_vc`, `c2_vc_max`, `c2_los`) e 5 (geometria proxy: `c5_relevo`, `c5_v0`) extraídos da cap_rodo na mesma associação espacial (seção 4.10); cobertura 94%. |
| 2026-08-06 | Bloco B (critérios 7, 8, 9, 10, 16) gerado por proximidade ao destino mais próximo (seções 4.11 e 4.12), com bases de ferrovias, portos ANTAQ, hidrovia Tietê e aeroportos ANAC; colunas `c7_polo_m`, `c8_hidrov_m`, `c9_ferrov_m`, `c10_porto_m`, `c10_aero_m`, `c16_interm_m`. |
| 2026-08-06 | Critério 3 (lentidão) coletado via TomTom Traffic Flow (seção 4.13); colunas `c3_cur`, `c3_free`, `c3_ratio`, `c3_delay_s`; cobertura 62,8% (rural sem dado). |
| 2026-08-06 | Confirmada a indisponibilidade pública dos dados de pavimento (crit. 4) e sazonalidade (crit. 6) após raspagem de DER-SP, ARTESP e portal de dados abertos SP; ambos marcados como "A solicitar" ao DER/ARTESP. |
| 2026-08-10 | Geração do produto vetorial reescalonado `favorabilidade_rede_normalizada.gpkg`, com normalização min–max, densidades de segurança por quilômetro, inversão dos atributos de distância, preservação de NoData e metadados internos de auditoria. |
| 2026-08-10 | Vinculação explícita dos campos `crit_*` aos critérios de rede da matriz v3 e geração da superfície `favorabilidade_rede_media_simples.gpkg` com 14 critérios calculáveis, mantendo pavimento e sazonalidade como lacunas. |
