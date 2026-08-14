# Roteiro da apresentação — Metodologia de hierarquização e espacialização de critérios

Documento de planejamento detalhado (conteúdo por slide), preparatório para a
implementação da apresentação em Reveal.js/Markdown. Público-alvo: cliente/gestores
institucionais, com apêndice técnico completo por critério espacializado.

Fonte de verdade para os critérios: `data/matriz-criterios-premissas-v3.json`
(50 critérios: 18 Fase 1, 2 Fase 2-grade, 14 Fase 2-rede, 16 Fase 3).
Fonte das saídas visuais: manifestos em `data/geoespacial/relatorios/mapas_fase1/`,
`mapas_fase2/` e `mapas_fase2_normalizados/`.

---

## Bloco 0 — Abertura

1. **Capa** — título, subtítulo ("Hierarquização e ranqueamento de projetos do PLI-SP"),
   versão/data.
2. **Objetivo da apresentação** — explicar o processo de hierarquização, a construção
   conceitual dos critérios e como foi feita a espacialização de cada um.
3. **O que é o SICARD** — sistema de apoio à tomada de decisão; papel na carteira do PLI-SP.

## Bloco 1 — Construção conceitual do processo (espinha dorsal)

4. Três fases independentes e combináveis: Fase 1 (elegibilidade territorial),
   Fase 2 (mérito técnico-territorial), Fase 3 (ajuste por atributos do projeto).
5. Regra de decisão da Fase 1: `restrito` / `apto_com_ressalva` / `apto` (diagrama de fluxo).
6. Papel de cada fase na síntese final — Fase 1 como filtro, Fase 2 e 3 como pesos
   combináveis (`score_final = peso_fase2*score_fase2 + peso_fase3*score_fase3`).
7. Auditoria e transparência — o que o sistema precisa conseguir explicar para cada projeto.

## Bloco 2 — Construção conceitual dos critérios (Modelo de Hierarquização Espacial)

8. Por que nem todo critério pode virar um mapa — quatro classes de modelagem:
   **grade**, **rede**, **atributo_objeto**, **híbrido**.
9. Grade: fenômeno contínuo representável em malha (ex.: massa econômica, vulnerabilidade).
10. Rede: fenômeno calculado sobre segmentos/nós da malha rodoviária (ex.: VDM, acidentes).
11. Atributo do objeto: pertence ao projeto, não deve ser rasterizado (ex.: maturidade, Capex).
12. Implicação prática: a favorabilidade final combina grade + rede; atributos ficam fora
    da superfície territorial e entram apenas na Fase 3.

## Bloco 3 — FASE 1: Elegibilidade territorial (restrição e risco)

13. Conceito — Fase 1 não ranqueia, classifica elegibilidade; restrição é excludente,
    risco gera ressalva (não exclui).
14. Fluxo de processamento do módulo gerador: importação → validação bruta → normalização
    → correção geométrica/topológica → classificação restrição/risco → consolidação por
    **Identity** → validação final → homologação → publicação.
15. Operador **Identity**: por que essa escolha (preserva atributos de origem, permite
    rastrear cada incidência até a fonte).

### 3.1 — Restrições (impedimento jurídico) — 8 critérios com imagem própria

Cada slide segue o template: **Critério → Dado inicial/Fonte → Operador → Regra de
classificação (equação lógica) → Relação → Mapa**.

| # | Critério (matriz v3) | Dado inicial / Fonte | Operador | Mapa de saída |
|---|---|---|---|---|
| 16 | Sobreposição com UC de Proteção Integral estadual | Polígonos DataGeo/IDEA-SP e Fundação Florestal; Lei 9.985/2000 | Identity + interseção binária (0/1) | `mapas_fase1/19_restricao_ucs_protecao_integral_estadual_sp.png` |
| 17 | Sobreposição com UC de Proteção Integral federal | Polígonos ICMBio/CNUC; Lei 9.985/2000 | Identity + interseção binária | `mapas_fase1/20_restricao_ucs_protecao_integral_federal_sp.png` |
| 18 | Sobreposição com manguezal/restinga/ecossistema costeiro | IBAMA (ecossistema costeiro); Lei 11.428/2006 e 12.651/2012 | Identity + interseção binária | `mapas_fase1/15_restricao_manguezais_ibama_sp.png` |
| 19 | Sobreposição com Terra Indígena | FUNAI; CF 1988, Convenção 169 OIT | Identity + interseção binária | `mapas_fase1/18_restricao_terras_indigenas_sp.png` |
| 20 | Sobreposição com território quilombola | INCRA/Fundação Cultural Palmares; ADCT art. 68 | Identity + interseção binária | `mapas_fase1/16_restricao_quilombos_sp.png` |
| 21 | Embargo ambiental federal ativo | IBAMA — áreas embargadas | Filtro de vigência + Identity + interseção | `mapas_fase1/14_restricao_embargos_ibama_ativos_sp.png` |
| 22 | Embargo ambiental estadual ativo | SEMIL/PM Ambiental/SIGAM | Filtro de vigência + Identity + interseção | `mapas_fase1/13_restricao_embargos_estaduais_sigam.png` |
| 23 | Área de restrição cadastrada pela CETESB | CETESB/SEMIL DataGeo | Filtro de vigência + Identity + interseção | `mapas_fase1/09_restricao_areas_restricao_cetesb.png` |

Equação lógica comum às restrições:
```
se interseção(demanda, camada_restricao) = 1:
    status_fase1 = restrito
```

### 3.2 — Riscos (condicionante material, não exclui) — 10 critérios com imagem própria

| # | Critério (matriz v3) | Dado inicial / Fonte | Operador | Mapa de saída |
|---|---|---|---|---|
| 24 | UC de Uso Sustentável estadual | DataGeo/IDEA-SP; Lei 9.985/2000 | Identity + interseção binária | `mapas_fase1/21_risco_ucs_uso_sustentavel_estadual_sp.png` |
| 25 | UC de Uso Sustentável federal | ICMBio/CNUC | Identity + interseção binária | `mapas_fase1/22_risco_ucs_uso_sustentavel_federal_sp.png` |
| 26 | Área de Proteção e Recuperação de Mananciais (4 APRMs) | SEMIL/SIMA-SP; Lei 9.866/1997 | Identity + interseção binária (por subárea) | `04_risco_aprm_alto_juquery.png`, `05_..._alto_tiete_cabec.png`, `06_..._billings.png`, `07_..._guarapiranga.png` |
| 27 | Cavidade natural subterrânea / área de influência | CECAV/ICMBio; Decreto 99.556/1990 | Área de influência oficial + Identity | `mapas_fase1/01_risco_cavidades_influencia.png` |
| 28 | Área contaminada / passivo ambiental cadastrado | CETESB — Relação de Áreas Contaminadas | Interseção + buffer técnico quando aplicável | `mapas_fase1/08_risco_areas_contaminadas_cetesb.png` |
| 29 | Área suscetível a inundação/enxurrada/alagamento | Defesa Civil, IPT, CPRM/SGB, DAEE | Identity + interseção binária | `mapas_fase1/02_risco_inundacao.png` |
| 30 | Área suscetível a escorregamento/erosão/movimento de massa | IPT, CPRM/SGB, Defesa Civil | Identity + interseção binária | `mapas_fase1/03_risco_movimento_massa.png` |
| 31 | Bem tombado / área envoltória de proteção | CONDEPHAAT / IPHAN | Identity + interseção binária | `11_risco_bens_tombados_condephaat.png`, `12_..._iphan_sp.png` |
| 32 | Sítio arqueológico cadastrado / área de interesse | IPHAN/CNSA; Lei 3.924/1961 | Interseção + faixa de cautela técnica | `mapas_fase1/17_risco_sitios_arqueologicos.png` |
| 33 | Assentamento rural / regime fundiário especial | INCRA / ITESP | Identity + interseção binária | `mapas_fase1/10_risco_assentamentos_sp.png` |

Equação lógica comum aos riscos:
```
se interseção(demanda, camada_restricao) = 0 e interseção(demanda, camada_risco) = 1:
    status_fase1 = apto_com_ressalva
    registrar risco em criterios_fase3_sugeridos
senao:
    status_fase1 = apto
```

34. **Mapas consolidados da Fase 1** — camada única de restrição e camada única de
    risco, obtidas por Identity iterativo sobre os 18 critérios (`23_restricao_...png`
    e `23/24_risco_consolidada_fase1.png`), preservando atributo de origem de cada
    incidência.

## Bloco 4 — FASE 2: Favorabilidade territorial

35. Conceito geral — superfície contínua 0–1, por grade (malha territorial) e por rede
    (malha rodoviária), combinadas por álgebra de mapas com pesos AHP.
36. Fluxo do módulo: importação → validação → compatibilização (CRS/recorte) → operador
    espacial por critério → raster bruto → reescalonamento 0–1 → inversão de critérios
    de relação negativa → pesos AHP → média ponderada → raster final.
37. Regra de reescalonamento padrão: `valor_normalizado = (valor - min) / (max - min)`;
    inversão quando a relação é negativa: `favorabilidade = 1 - normalizado`.

### 4.1 — Grade (2 critérios, unidade de análise: 103.620 setores censitários)

| # | Critério | Dado inicial / Fonte | Operador | Equação | Mapa (bruto → normalizado) |
|---|---|---|---|---|---|
| G01 | Localização em áreas de alta massa econômica | PIB municipal 2023 (IBGE) desagregado por setor censitário | Agregação por setor + normalização min-max | `g_pib_setor = PIB_mun × (pop_setor/pop_mun)`; `crit_g01 = (g_pib_setor - min)/(max - min)` | `mapas_fase2/13-15_grade_g_pib_*.png` → `mapas_fase2_normalizados/001_grade_g01_...png` |
| G02 | Localização em áreas de maior vulnerabilidade territorial (**mandatório**) | 5 componentes IBGE Censo 2022: PIB per capita (invertido), déficit água/esgoto/lixo, adensamento domiciliar | Agregação por setor + média simples dos 5 componentes normalizados | `crit_g02 = média(pib_pc_inv, agua_def, esg_def, lixo_def, adens_norm)` | `mapas_fase2/01-12_grade_g_*.png` → `mapas_fase2_normalizados/002_grade_g02_...png` |

### 4.2 — Rede (14 critérios, unidade de análise: 4.782 subtrechos DER-SP)

| # | Critério | Dimensão | Dado inicial / Fonte | Operador | Mapa normalizado |
|---|---|---|---|---|---|
| R01 | Proximidade com VDM alto | Técnica | VDM por subtrecho (DER-SP) | Cálculo por subtrecho + normalização min-máx | `003_rede_r01_...png` |
| R02 | Saturação elevada | Técnica | V/C de pico e nível de serviço (DER-SP) | Cálculo por subtrecho + normalização min-máx | `004_rede_r02_...png` |
| R03 | Lentidão recorrente | Técnica | Tempo observado × fluxo livre (TomTom) | `c3_delay_s = tempo_atual - tempo_fluxo_livre`; normalização min-máx | `005_rede_r03_...png` |
| R05 | Geometria deficiente | Técnica | Classe de relevo + velocidade livre (DER-SP) | Cálculo por subtrecho + normalização min-máx | `006_rede_r05_...png` |
| R07 | Acessibilidade temporal a polos (porto/aeroporto) | Econômica | Distância ao polo mais próximo (ANTAQ/ANAC) | Distância euclidiana + inversão `(1-n)` | `007_rede_r07_...png` |
| R08 | Acessibilidade a eixos hidroviários | Econômica | Distância a terminal hidroviário (SEMIL) | Distância euclidiana + inversão | `008_rede_r08_...png` |
| R09 | Acessibilidade à malha ferroviária | Econômica | Distância à ferrovia ativa | Distância euclidiana + inversão | `009_rede_r09_...png` |
| R10 | Acessibilidade a polos logísticos estratégicos | Social | Distância a porto + aeroporto (ANTAQ/ANAC) | Distância euclidiana + inversão (média de 2 componentes) | `010_rede_r10_...png` |
| R11 | Alta gravidade de acidentes | Segurança | Óbitos + feridos graves por subtrecho (InfoSiga 2022–2026) | Densidade por km + normalização min-máx | `011_rede_r11_...png` |
| R12 | Acidentes com usuários vulneráveis | Segurança | Pedestres/ciclistas/motociclistas (InfoSiga) | Densidade por km + normalização min-máx | `012_rede_r12_...png` |
| R13 | Concentração de pontos críticos (black spots) | Segurança | Sinistros graves/fatais por subtrecho (InfoSiga) | Densidade por km + normalização min-máx | `013_rede_r13_...png` |
| R14 | Conflito urbano-regional | Territorial | Fração do subtrecho em área urbanizada (IBGE 2019) | Interseção linha×polígono + normalização | `014_rede_r14_...png` |
| R15 | Interferência urbano-portuária | Territorial | Fração urbana em município portuário (IBGE + ANTAQ) | Interseção linha×polígono + normalização | `015_rede_r15_...png` |
| R16 | Acessibilidade a nós intermodais | Territorial | Distância ao nó mais próximo (porto/aeroporto/ferrovia/hidrovia) | Distância euclidiana + inversão (mínimo de 4 componentes) | `016_rede_r16_...png` |

38. **Nota de completude metodológica** — dois fatores previstos na matriz técnica
    (pavimento/IRI-PCI e sazonalidade de tráfego) não foram espacializados por
    indisponibilidade de dado bruto consolidado; registrados como pendência aberta
    (ver `DIAGNOSTICO_DADOS_FAVORABILIDADE_REDE.md`).
39. **Consolidação final** — média simples ponderada de grade e rede
    (`017_grade_favorabilidade_media_simples.png`, `018_rede_favorabilidade_media_simples.png`);
    caminho para evolução com pesos AHP por critério.

## Bloco 5 — FASE 3: Ajuste por atributos do projeto (conceitual, sem mapa)

40. Por que a Fase 3 não é espacializada — atributos pertencem ao projeto, não ao território.
41. Fórmula: `score_fase3 = Σ(atributo_normalizado_i × peso_i) / Σ(pesos_ativos)`.
42. Atributos estáticos (informados uma vez): maturidade/prontidão, Capex, prazo
    (**mandatório**), complexidade técnica/institucional (**mandatório**).
43. Atributos dinâmicos (complementação de cadastro): Opex, B/C, potencial de PPP,
    benefício social líquido, aderência a planos diretores, aderência a planos
    vigentes (PPA/PEF/PAN/PNLT), consenso institucional, legitimidade social,
    incerteza de demanda, risco de execução, desapropriações/interferências,
    dependência de predecessoras.
44. Regra de completude mínima — Fase 3 só compõe o resultado final se atingir o
    grau de completude configurado.

## Bloco 6 — Síntese multicritério e governança

45. Como as 3 fases se combinam no resultado final — Fase 1 como filtro,
    `score_final = peso_fase2×score_fase2 + peso_fase3×score_fase3`.
46. Exemplo numérico ilustrativo (projeto fictício passando pelas 3 fases).
47. Auditoria — o que fica registrado para cada projeto (camadas intersectadas,
    valores extraídos, atributos usados/ausentes, pesos aplicados, exceções).
48. Homologação e versionamento — cada pacote de Fase 1/Fase 2 é versionado e
    homologado antes da publicação na biblioteca de camadas.

## Bloco 7 — Encerramento

49. Considerações finais — o que já está implementado x pendências conhecidas
    (pavimento/IRI-PCI, sazonalidade, pesos AHP finais da Fase 2).
50. Próximos passos.
51. Anexo — glossário (Identity, favorabilidade, reescalonamento, AHP, etc.).
52. Anexo — tabela-resumo com os 50 critérios da matriz v3 (dimensão, fase,
    classificação, mandatório).
53. Anexo — fontes institucionais consultadas (DataGeo, IBGE, DER-SP, InfoSiga,
    ICMBio, IBAMA, CETESB, ANTAQ, ANAC, IPHAN, CONDEPHAAT etc.).

---

## Contagem final de slides do apêndice técnico (1 por critério espacializado)

- Fase 1 — Restrições: 8 slides + 1 slide de APRM com 4 mapas + demais riscos = ver tabelas acima (18 critérios, alguns com múltiplas imagens no mesmo slide) + 1 slide de mapas consolidados.
- Fase 2 — Grade: 2 slides.
- Fase 2 — Rede: 14 slides.
- **Total apêndice técnico: 18 (Fase 1) + 2 (Grade) + 14 (Rede) = 34 slides individuais**,
  mais os conceituais/síntese/anexos do restante do roteiro (~19 slides) = **~53 slides**.

## Observações para a etapa de implementação (fora do escopo deste documento)
- Formato definido: Reveal.js/Markdown (HTML autocontido, imagens referenciadas por
  caminho relativo às pastas `data/geoespacial/relatorios/mapas_fase1|fase2|fase2_normalizados`).
- Cada slide de critério deve reutilizar o template fixo definido no plano anterior
  (`/memories/session/plan.md`): Título → Fase/Dimensão/Classificação → Dado inicial/Fonte
  → Operador → Equação/Normalização → Relação (↑/↓) → Mapa de saída.
- Corrigir/checar nomes de arquivo duplicados/ambíguos nos mapas consolidados da Fase 1
  (`22_risco_consolidada_fase1.png` vs `23_risco_consolidada_fase1.png`; `23_restricao_...`
  vs `24_restricao_...`) antes de referenciá-los no HTML final.
