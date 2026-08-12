# Diagnóstico Metodológico — Camada de Favorabilidade da Grade (Fase 2)

> Documento vivo. Registra o diagnóstico dos dados necessários para produzir a
> **camada de favorabilidade da grade** da Fase 2 do sistema de hierarquização, as
> fontes utilizadas, os passos metodológicos executados e as lacunas. Deve ser
> atualizado a cada avanço.

- **Etapa:** Fase 2 — Favorabilidade territorial e da rede
- **Camada em foco:** Favorabilidade da **grade** (a camada de **rede** é tratada em documento próprio)
- **Unidade de análise:** **setor censitário** (Censo 2022), escolhido para máxima variabilidade espacial
- **Matriz de referência:** `documentacao/matrizes/Matriz_Criterios_Premissas_PLI-SP_v3.xlsx`, aba `Matriz Crit Premissas v3`
- **Última atualização:** 2026-08-10

---

## 1. Objetivo da seção

Produzir a **superfície contínua de favorabilidade da grade**: uma camada que
atribui, a cada unidade territorial (setor censitário), um grau de favorabilidade
socioeconômica para receber investimento em infraestrutura, com base na massa
econômica e na vulnerabilidade territorial. Assim como a rede, é uma etapa
**compensatória/graduada** (pontua, não elimina).

## 2. Composição dos critérios (2 critérios de classificação "grade")

| # | Dimensão | Critério | Operador (matriz) | Relação | Mandatório |
|---|----------|----------|-------------------|---------|------------|
| 1 | Econômica | Localização em áreas de alta massa econômica | Interpolação areal / rasterização com estatística zonal | ↑ Positiva | Não |
| 2 | Social | Localização em áreas de maior vulnerabilidade territorial | Interpolação areal / rasterização por unidade espacial | ↑ Positiva | **Sim** |

- **Critério 1 (massa econômica):** dado = empregos e produção; variável = superfície
  contínua de empregos e produção por célula; métricas = nº de empregos, R$/ano.
- **Critério 2 (vulnerabilidade):** dado = redução de desigualdades regionais; variável
  = prioridade social derivada de **IDH e PIB per capita invertidos**; métricas = IDH,
  PIB per capita regional.

## 3. Base espacial (unidade de análise)

- **Arquivo canônico:** `data/geoespacial/outputs/favorabilidade_grade.gpkg` (layer `favorabilidade_grade`)
- **Origem:** IBGE — Malha de setores censitários do Censo 2022, UF SP
  (`SP_setores_CD2022.gpkg`), variante **com atributos básicos** do Censo
- **Feições:** **103.620 setores censitários**, CRS EPSG:4674
- **Atributos-base:** `CD_SETOR`, `SITUACAO`, `AREA_KM2`, `CD_MUN`/`NM_MUN`, hierarquia regional (`RGI`, `RGINT`)
- **Estado:** apenas **valores brutos** (sem reescalonamento; normalização virá nas etapas seguintes)

## 4. Fontes utilizadas

| Fonte | Arquivo | Uso |
|-------|---------|-----|
| IBGE — Malha de setores c/ atributos (Censo 2022) | `SP_setores_atributos_CD2022.gpkg` | base + população/domicílios (crit. 2) |
| IBGE — Agregados por setor: alfabetização | `Agregados_por_setores_alfabetizacao_BR.csv` | alfabetização (crit. 2) |
| IBGE — Agregados por setor: características do domicílio (Partes 2 e 3) | `..._caracteristicas_domicilio2/3_BR.csv` | saneamento água/esgoto/lixo (crit. 2) |
| IBGE — PIB dos Municípios 2010–2023 | `PIB dos Municípios - base de dados 2010-2023.xlsx` | massa econômica + PIB per capita (crit. 1 e 2) |

Todas em `data/geoespacial/local/favorabilidade_grade/`.

## 5. Passos metodológicos executados

### 5.1 Critério 2 — vulnerabilidade (mandatório)

Medidas brutas por setor, mantidas **granulares** (sem combinar em índice):

| Coluna | Medida | Origem |
|--------|--------|--------|
| `g_pop` | população do setor | Censo básico (`v0001`) |
| `g_mond` | média de moradores/domicílio (adensamento) | Censo básico (`v0005`) |
| `g_alfab15` | pessoas alfabetizadas de 15+ | soma `V00644`–`V00656` (alfabetização) |
| `g_agua_rede` / `g_agua_tot` | domicílios com água por rede geral / total | `V00111…` (domicílio Parte 2) |
| `g_esg_adeq` / `g_esg_tot` | esgoto adequado (rede + fossa séptica ligada) / total | `V00309`,`V00310` / `V00309…V00316` |
| `g_lixo_adeq` / `g_lixo_tot` | lixo coletado / total | `V00397`,`V00398` / `V00397…V00402` |
| `g_pib_pc` | PIB per capita municipal (R$/hab) | PIB dos Municípios |

Associação por `CD_SETOR` (Censo) e por `CD_MUN` (PIB per capita). Filtro SP por
`CD_SETOR` iniciando em `35`.

### 5.2 Critério 1 — massa econômica

Desagregação do PIB municipal para os setores, por participação populacional:

| Coluna | Medida |
|--------|--------|
| `g_pib_setor` | PIB desagregado por setor = PIB_mun × (pop_setor / pop_mun) (R$) |
| `g_pib_mun` | PIB municipal (R$, contexto) |

- **Ano:** 2023 (mais recente); 645 municípios de SP.
- **Validação:** a soma de `g_pib_setor` reproduz o **PIB estadual (~R$ 3,445 trilhões)**, confirmando a desagregação.

**Decisões metodológicas assumidas (a revisar quando conveniente):**
- **Unidade = setor censitário** (não grade regular nem município), pela variabilidade.
- **Medidas mantidas granulares** (adequado + total por serviço; componentes separados);
  a combinação em índices ocorre nas etapas seguintes.
- **Desagregação por população** para dados nativos municipais (PIB); assume per capita
  uniforme dentro do município.
- **Saneamento** guardado como adequado + total, permitindo derivar % inadequado depois.

## 6. Lacunas de dados (o que ainda falta / pode enriquecer)

| Item | Situação | Origem candidata |
|------|----------|------------------|
| Renda por setor | Indisponível no Censo 2022 básico (vem da amostra, futura) | IBGE amostra |
| Número de empregos por setor/município | A obter (complementa massa econômica) | RAIS/CAGED, SEADE |
| IDH municipal (IDHM) | Opcional (PIB per capita já cobre parte da vulnerabilidade) | Atlas Brasil / PNUD |
| IPVS/IPRS (SEADE) | Opcional (índice de vulnerabilidade paulista consolidado) | SEADE |

## 7. Roteiro metodológico da favorabilidade (etapas nomeadas)

Aplicável às duas camadas (rede e grade). Sem nomes de grupos de etapas.

1. **Obtenção das medidas específicas brutas das variáveis** — *concluída na grade*
   (critérios 1 e 2); *quase concluída na rede* (14/16).
2. **Reescalonamento das variáveis** — levar cada variável bruta a escala comparável (0–1).
3. **Ajuste da relação variável/fenômeno** — orientar cada variável pelo sentido
   (↑/↓) da matriz, invertendo o que for negativo.
4. **Obtenção dos pesos das variáveis** — aplicação da técnica de análise
   multicritério (AHP).
5. **Obtenção do índice de favorabilidade** — álgebra de campos (*map algebra*) por
   unidade de análise, combinando as variáveis reescalonadas e ajustadas por um
   operador de média ponderada, cujos pesos derivam da análise multicritério (AHP).

### 7.1 Produto reescalonado

- **Arquivo:** `data/geoespacial/outputs/favorabilidade_grade_normalizada.gpkg`
  (layer `favorabilidade_grade_normalizada`).
- **Método:** reescalonamento linear min–max por atributo, segundo
  `n = (x - mínimo) / (máximo - mínimo)`, calculado sobre os valores válidos da
  camada; valores ausentes são preservados.
- **Ajuste de relação:** componentes de prioridade por vulnerabilidade recebem
  orientação negativa (`1 - n`) quando valor bruto maior representa menor prioridade,
  como no PIB per capita. As proporções de adequação de água, esgoto e coleta de
  resíduos permanecem como indicadores auxiliares e não recebem peso autônomo no
  índice, pois não constituem critérios adicionais na matriz v3.
- **Rastreabilidade:** os atributos brutos são preservados, os reescalonados recebem
  sufixo `_n`, os componentes orientados recebem prefixo `f_` e cada critério recebe
  um campo `crit_*`; as regras aplicadas constam na tabela interna
  `metadados_normalizacao`.

### 7.2 Superfície por média simples dos critérios

- **Arquivo:** `data/geoespacial/outputs/favorabilidade_grade_media_simples.gpkg`
  (layer `favorabilidade_grade_media_simples`).
- **Critérios:** `crit_g01_massa_economica`, representado pelo PIB setorial
  reescalonado, e `crit_g02_vulnerabilidade`, composto pela média simples do PIB per
  capita municipal reescalonado e invertido, inadequação setorial de água, esgoto e
  coleta de resíduos e adensamento domiciliar setorial. Assim, o contexto econômico
  municipal é preservado, mas o G02 passa a apresentar variação intramunicipal.
- **Operação:** média aritmética simples dos dois critérios, gravada em
  `fav_media_simples`; `n_criterios` registra o denominador efetivamente utilizado.
- **Natureza:** cenário não ponderado solicitado para análise. Não substitui a média
  ponderada por pesos AHP nem constitui superfície homologada.

## 8. Histórico de atualização

| Data | Alteração |
|------|-----------|
| 2026-08-07 | Criação do diagnóstico da grade; base de setores censitários (103.620); critério 2 (vulnerabilidade) com demografia, alfabetização e saneamento; critério 1 (massa econômica) por desagregação do PIB; PIB per capita incorporado; roteiro metodológico registrado. |
| 2026-08-10 | Geração do produto vetorial reescalonado `favorabilidade_grade_normalizada.gpkg`, com normalização min–max, orientação dos componentes de vulnerabilidade, preservação de NoData e metadados internos de auditoria. |
| 2026-08-10 | Vinculação explícita dos campos `crit_*` aos dois critérios de grade da matriz v3 e geração da superfície `favorabilidade_grade_media_simples.gpkg`, sem atribuir peso próprio aos indicadores auxiliares. |
