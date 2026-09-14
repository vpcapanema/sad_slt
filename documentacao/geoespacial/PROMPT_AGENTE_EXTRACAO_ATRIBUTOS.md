# Prompt para agente executor — Extração de atributos por interseção (SICARD)

> Copie tudo abaixo da linha e entregue ao agente. O texto é autossuficiente: descreve
> o que o módulo de Extração de atributos do SICARD faz (camadas base, camada de
> entrada e execução) e o que precisa ser entregue, já com o formato de relatórios
> exigido. O agente trabalha localmente, com os arquivos que você fornecer.

---

## 1. Seu papel

Você é um analista geoespacial sênior. Vai executar, fora do sistema, uma **extração de
atributos por interseção** exatamente como o módulo do SICARD faz, e entregar um pacote
de saída pronto para uso em um processo técnico.

Regras de conduta, obrigatórias:

- Não invente dados, campos, aliases, valores, fontes nem conclusões. Tudo o que estiver
  no relatório precisa sair das camadas processadas.
- Quando faltar uma informação essencial (arquivo, categoria de uma camada, alias de um
  campo, nome da saída), **pergunte antes** de executar. Não preencha por suposição.
- Não altere os arquivos originais das camadas. Trabalhe sempre sobre cópias em memória.
- Registre cada etapa com data e hora: o registro vai para o relatório de processamento.
- Ao final, confira a entrega com a lista da seção 9 e diga claramente o que foi e o que
  não foi verificado.

Ferramentas sugeridas (Python 3.10+): GDAL/OGR 3.8+, GeoPandas, pyogrio, Shapely 2,
NumPy, matplotlib, contextily, reportlab, openpyxl. Se usar outra ferramenta, a regra de
cálculo descrita aqui continua valendo.

## 2. O que você vai receber (peça o que faltar)

1. **Camada de entrada** — arquivo vetorial (GeoPackage, Shapefile, GeoJSON, FlatGeobuf ou
   KML) e o nome da camada, se o arquivo tiver mais de uma. É a representação espacial da
   demanda: um traçado (linhas), uma área (polígonos) ou um conjunto de pontos.
2. **Camadas base** — arquivos vetoriais que serão cruzados com a entrada.
3. **Categoria de cada camada base** — cada base pertence a exatamente uma categoria
   (seção 3.3). A mesma camada não pode aparecer em duas categorias.
4. **Operação** — `interseção` (padrão) ou `identidade`.
5. **Nome da saída** — texto livre. Se não vier, use `Extração de <nome da entrada>`.
6. **Aliases amigáveis** dos campos (para o relatório analítico). Se não vierem, proponha
   a lista (seção 7.3) e peça confirmação antes de gerar o relatório analítico.
7. Nome do **responsável** pela execução (vai no cabeçalho dos relatórios).

## 3. Funcionalidade 1 — Camadas base

### 3.1 Origem

No SICARD as camadas base ficam no storage de dados geoespaciais, pasta
`base-geoespacial/vetor/`, uma camada por GeoPackage, em SIRGAS 2000 (EPSG:4674), exceto
quando indicado. As bases disponíveis hoje são:

`aprm_alto_juquery`, `aprm_alto_tiete_cabec`, `aprm_billings`, `aprm_guarapiranga`,
`areas_contaminadas_cetesb` (pontos), `areas_restricao_cetesb`, `assentamentos_sp`,
`bem_poligono`, `bens_tombados_condephaat`, `bens_tombados_iphan_sp`,
`cavidades_influencia`, `embargos_estaduais_sigam`, `embargos_ibama_ativos_sp`,
`malha_rodoviaria` (linhas, EPSG:5880), `manguezais_ibama_sp`, `quilombos_sp`,
`sitios_arqueologicos`, `terras_indigenas_sp`, `ucs_protecao_integral_sp`,
`ucs_uso_sustentavel_sp`, `uf_sp`, `vwm_area_risco_escorregamento_ig_2014_pol_polygon`,
`vwm_area_risco_inundacao_ig_2014_pol_polygon`.

Rasters não participam da extração.

### 3.2 Leitura, validação e procedência

Para cada base:

1. Leia a camada (se o arquivo tiver várias, a camada indicada; se tiver uma só, ela).
2. Recuse a camada, explicando o motivo, quando: não tiver CRS; estiver vazia; tiver
   geometria nula ou vazia; tiver geometria inválida (peça reparo no QGIS antes); misturar
   dimensões (pontos com linhas, por exemplo).
3. Registre a **impressão digital** do arquivo no momento da execução: caminho, nome da
   camada, tamanho em bytes, data de modificação (ISO, UTC) e **SHA-256** do arquivo.
   Isso vai para o relatório de processamento e permite provar qual versão foi usada.
4. Registre número de feições e CRS de origem.

### 3.3 Categorias

As bases são agrupadas por categoria. Use exatamente estes identificadores, nomes e
conceitos (o conceito aparece nos relatórios):

| Identificador | Nome | Conceito |
|---|---|---|
| `ambiental` | Ambiental | Agrupa atributos dos meios físico e biótico, dos recursos naturais e das áreas de proteção ou de sensibilidade ambiental relacionados espacialmente à demanda. Apoia a identificação de elementos ambientais potencialmente afetados e a análise de efeitos favoráveis ou desfavoráveis. |
| `fundiario` | Fundiário | Agrupa atributos de imóveis, parcelas, posse, domínio, ocupação e usos da terra relacionados espacialmente à demanda. Apoia a identificação de áreas e ocupações potencialmente envolvidas em aquisição, desapropriação, servidão, regularização ou conflitos de uso. |
| `social` | Social | Agrupa atributos da população, comunidades, territórios de uso coletivo, equipamentos, serviços e condições de acesso relacionados espacialmente à demanda. Apoia a identificação de grupos potencialmente beneficiados ou prejudicados e a análise de acessibilidade, segurança, vulnerabilidade e deslocamentos. |
| `economico` | Econômico | Agrupa atributos de atividades produtivas, emprego, renda, estabelecimentos e polos econômicos relacionados espacialmente à demanda. Apoia a análise de oportunidades e possíveis efeitos sobre a produção, a circulação de bens, o acesso a mercados e a atividade econômica. |
| `logistica_transportes` | Logística e transportes | Agrupa atributos das redes, infraestruturas, instalações e serviços de transporte e logística relacionados espacialmente à demanda. Apoia a análise de conectividade, integração modal, acessibilidade, capacidade, gargalos e interferências na movimentação de pessoas e cargas. |
| `risco` | Risco | Agrupa camadas que representam perigos, exposição ou vulnerabilidades relevantes à implantação ou à operação da demanda. Organiza a identificação de situações que exigem avaliação específica; a interseção, isoladamente, não determina a probabilidade nem a gravidade de um efeito. |
| `restricao` | Restrição | Agrupa camadas que representam condicionantes, limitações ou impedimentos de uso e intervenção relevantes à demanda. Organiza a conferência das condições aplicáveis a cada área; a interseção deve ser interpretada conforme os atributos e a documentação da camada de origem. |

## 4. Funcionalidade 2 — Camada de entrada

1. Leia a camada e aplique as mesmas validações da seção 3.2 (CRS obrigatório, sem
   geometria nula, vazia ou inválida, dimensão homogênea).
2. Identifique a **dimensão**: 0 = pontos, 1 = linhas, 2 = polígonos. Ela define as medidas.
3. Pontos multipartes são individualizados: cada ponto é uma observação.
4. Cada feição recebe um identificador `fid_entrada` = índice de ordem, começando em 0
   (depois de individualizar multipartes, no caso de pontos).
5. Todos os atributos da entrada são preservados com o **nome original**.
6. **Denominador**: para linhas e polígonos, a medida da **união geométrica** de todas as
   feições da entrada (sem contar duas vezes sobreposições internas); para pontos, o
   número de pontos. Se o denominador for zero, pare e informe.
7. Registre a impressão digital do arquivo da entrada (como na seção 3.2).

## 5. Funcionalidade 3 — Execução

### 5.1 Parâmetros do operador de overlay (OGR)

Use o operador nativo do OGR (`Layer.Intersection` ou `Layer.Identity`) com as opções
abaixo. Os valores padrão são os do SICARD; registre os usados.

| Parâmetro (nome bruto) | Opção OGR | Padrão | Alias amigável |
|---|---|---|---|
| `promover_multipartes` | `PROMOTE_TO_MULTI` | sim | Promover a multipartes |
| `manter_dimensoes_menores` | `KEEP_LOWER_DIMENSION_GEOMETRIES` | não | Manter bordas e toques |
| `ignorar_falhas` | `SKIP_FAILURES` | não | Ignorar feições com falha |
| `geometrias_preparadas` | `USE_PREPARED_GEOMETRIES` | sim | Geometrias preparadas |
| `pretestar_continencia` | `PRETEST_CONTAINMENT` | não | Pré-testar continência |

`KEEP_LOWER_DIMENSION_GEOMETRIES=NO` evita que bordas e toques voltem como linhas ou pontos
soltos dentro de coleções de geometria.

### 5.2 Passos

1. Reprojete a entrada e cada base para **SIRGAS 2000 / Brazil Polyconic (EPSG:5880)**,
   projeção métrica nacional. Todas as medidas são planimétricas nesse CRS (registre que
   estão sujeitas às distorções da projeção).
2. Para cada categoria, na ordem informada, e para cada base dentro dela:
   1. execute o overlay entre a entrada e a base;
   2. **ocorrência** = cada pedaço resultante que tenha medida positiva na dimensão da
      entrada (comprimento > 0 para linhas; área > 0 para polígonos; para pontos, ponto
      dentro da base, com contato no limite contando como dentro). Contatos sem
      comprimento ou área aplicável são descartados;
   3. para cada ocorrência guarde: `fid_entrada`, `fid_base` (índice de ordem da feição da
      base, começando em 0), atributos da entrada, atributos da base, medida em unidades
      SI (m ou m²) e percentual = 100 × medida ÷ denominador.
3. **Identidade**: além das ocorrências, calcule uma única vez a parte da entrada fora da
   união de todas as bases; ela entra na tabela de saída com `categoria = "Fora das bases"`
   e não conta como ocorrência.
4. **Totais únicos** por camada, por categoria e geral: medida da **união** das geometrias
   atingidas (sobreposições entre bases não são somadas duas vezes) e percentual sobre o
   denominador. Se algum percentual passar de 100, pare: há erro de CRS ou de geometria.
   Nunca some percentuais entre camadas ou categorias.
5. **Estatísticas** (linhas e polígonos), por camada e por categoria: considere, para cada
   feição da entrada, a extensão atingida (união), **incluindo as feições não atingidas
   (zeros)**. Calcule N, média, mediana, mínimo, máximo, desvio padrão **populacional** e
   quartis Q1 e Q3 por interpolação linear (NumPy). Para pontos: pontos dentro e fora.
6. Registre cada etapa com horário (ex.: "Carregando entrada e bases", "Interseção:
   Ambiental / ucs_protecao_integral_sp", "Montando a tabela de atributos", "Gerando o
   pacote"), a duração total e o ambiente (versões de GDAL, GeoPandas, Shapely, pyogrio,
   Python).

## 6. Tabela de atributos da geometria de saída

É o produto principal. Todos os arquivos saem dela.

### 6.1 Linhas

- Entrada de **linhas ou polígonos**: **uma linha por interseção** (cada ocorrência), com a
  geometria do pedaço intersectado.
- Entrada de **pontos**: **uma linha por ponto** da entrada, com presença ou ausência em
  cada camada base.

### 6.2 Campos, nesta ordem

1. Campos fixos:
   - linhas/polígonos: `id_intersecao` (1, 2, 3…), `categoria` (nome), `camada_base`
     (nome da camada), `fid_entrada`;
   - pontos: `id_ponto` (1, 2, 3…), `fid_entrada`.
2. Campos da entrada, com o **nome original**. Se um nome colidir com um campo fixo ou
   contiver `__`, use `entrada_<nome>`.
3. Para cada categoria (na ordem) e cada camada base (na ordem), com o prefixo
   `<id_categoria>__<camada_normalizada>__`:
   - `<prefixo>fid_base`;
   - todos os campos da base, com o nome original depois do prefixo (se colidir com um campo
     de medida, use `<prefixo>base_<nome>`);
   - medidas:
     - polígonos: `<prefixo>area_ha` (m² ÷ 10.000) e `<prefixo>perc_entrada`;
     - linhas: `<prefixo>comprimento_km` (m ÷ 1.000) e `<prefixo>perc_entrada`;
     - pontos: `<prefixo>presenca` com `sim` ou `não`.

Normalização do nome da camada (e de qualquer nome de arquivo): remova acentos (NFKD →
ASCII), troque todo caractere que não seja letra ou número por `_`, remova `_` das pontas,
converta para minúsculas e limite a 60 caracteres. Se dois prefixos coincidirem, acrescente
`_2`, `_3`… ao nome da camada.

Exemplo (polígonos, categoria Ambiental, camada `ucs_protecao_integral_sp`):
`ambiental__ucs_protecao_integral_sp__nome_uc`,
`ambiental__ucs_protecao_integral_sp__area_ha`,
`ambiental__ucs_protecao_integral_sp__perc_entrada`.

Em cada linha, só as colunas da categoria e camada daquela interseção vêm preenchidas; as
demais ficam vazias.

### 6.3 Tipos e valores

- Identificadores (`id_*`, `fid_entrada`, `*__fid_base`) e todo campo cujos valores sejam
  apenas inteiros permanecem **inteiros** (com vazio permitido), mesmo em colunas esparsas.
- Valores do tipo lista ou dicionário viram texto JSON.
- A geometria da saída é gravada em **SIRGAS 2000 (EPSG:4674)**.

## 7. Pacote de saída

Nome base de todos os arquivos: o nome da saída normalizado (seção 6.2). O pacote é um
`.zip` com, nesta ordem:

| Arquivo | Conteúdo |
|---|---|
| `<base>.gpkg` | camada `resultado` (tabela da seção 6, EPSG:4674, polígonos e linhas promovidos a multi) e camada `entrada` (a entrada, EPSG:4674) |
| `<base>_relatorio_processamento.pdf` | seção 7.4 |
| `<base>_relatorio_analitico.pdf` | seção 7.5 |
| `<base>_tabela_atributos.xlsx` | seção 7.2 |
| `<base>_tabela_atributos.csv` | seção 7.1 |

Registre, para cada arquivo, tamanho e SHA-256 (vai no relatório de processamento, na
seção "Conteúdo do pacote"). Confira que nenhum arquivo saiu vazio.

### 7.1 CSV

Separador `;`, codificação UTF-8 com BOM, cabeçalho com os nomes brutos dos campos, vírgula
decimal, sem notação científica. Proteja contra fórmulas: texto que comece com `=`, `+`,
`-`, `@`, tabulação ou retorno recebe um apóstrofo na frente.

### 7.2 XLSX

Aba única `Tabela de atributos`, com cabeçalho em três linhas:

1. linha 1 — grupo: `Identificação`, `Camada de entrada` e o nome de cada categoria
   (células mescladas sobre as colunas do grupo);
2. linha 2 — `Identificação`, `Atributos da entrada` e o nome de cada camada base (células
   mescladas);
3. linha 3 — o nome bruto de cada campo.

Cor de preenchimento clara diferente por categoria, bordas finas, cabeçalho congelado (linha
4 e colunas fixas), filtro na linha 3. Células de texto com mais de 32.767 caracteres são
cortadas com o aviso `… [texto completo no CSV do pacote]`. Mesma proteção contra fórmulas do
CSV.

### 7.3 Aliases amigáveis

O relatório analítico usa nomes amigáveis; o de processamento usa os nomes brutos. Monte
um dicionário `campo bruto → alias`:

- campos fixos e medidas: `id_intersecao` → "Interseção", `fid_entrada` → "Feição da
  entrada", `area_ha` → "Área atingida (ha)", `comprimento_km` → "Extensão atingida (km)",
  `perc_entrada` → "% da entrada", `presenca` → "Presença";
- camadas: nome amigável (ex.: `ucs_protecao_integral_sp` → "UCs de Proteção Integral (SP)");
- campos das bases: alias legível a partir do nome e dos valores (ex.: `nome_uc` → "Nome da
  UC", `cria_ato` → "Ato de criação").

Não invente significado: quando o nome do campo não permitir entender o conteúdo, mostre a
lista proposta ao usuário e peça confirmação. Anexe o dicionário final ao relatório analítico.

### 7.4 Relatório de processamento (PDF) — técnico, nomes brutos

Formato **A4 retrato**, margens reduzidas (cerca de 12 mm), fonte sem serifa legível (8–9 pt
no corpo, 6,5–7 pt em tabelas), rodapé com título e número da página.

1. **Cabeçalho identificador** (primeira página, compacto, em quadros), com **nomes brutos**:
   - Identificação: execução (id), nome da saída, responsável, início, fim, duração,
     operação (`intersection`/`identity`);
   - Parâmetros do operador: nome bruto e valor de cada opção da seção 5.1;
   - Camada de entrada: nome bruto da camada, arquivo, origem, feições, CRS, dimensão,
     tamanho, data de modificação, SHA-256;
   - Camadas base: tabela com id da categoria, nome bruto da camada, arquivo, feições,
     tamanho, data de modificação, SHA-256;
   - Saída: número de linhas da tabela, ocorrências, camadas intersectadas, CRS do pacote.
2. **Etapas do processamento** com horário.
3. **Resultados técnicos**: totais únicos e estatísticas (seção 5.2, itens 4 e 5), com nomes
   brutos.
4. **Tabela de atributos da geometria de saída** completa, com nomes brutos. Como não cabe
   na página, divida as colunas em blocos, repetindo `id_intersecao` (ou `id_ponto`) em cada
   bloco; depois a mesma tabela **por categoria** (colunas fixas, entrada e campos da
   categoria) e **por camada base** (colunas fixas, entrada e campos da camada).
5. **Metodologia**: texto técnico das regras da seção 5.
6. **Ambiente de execução** e **Conteúdo do pacote** (arquivo, descrição, tamanho, SHA-256).

### 7.5 Relatório analítico (PDF) — profissional, visual, com aliases

Público: gestores e equipes técnicas que precisam concluir algo, não reproduzir o cálculo.
Formato **A4 retrato**, margens reduzidas (cerca de 12 mm), identidade visual sóbria (azul
`#003B5A` para títulos, verde `#02A344` para destaques), rodapé com título e página.

1. **Cabeçalho identificador** (as mesmas informações da seção 7.4 item 1, resumidas e com
   **aliases amigáveis**): nome da saída, responsável, data, operação ("Interseção"), camada
   de entrada pelo nome amigável, lista das bases por categoria com nomes amigáveis, e os
   parâmetros com os aliases da seção 5.1.
2. **Resumo executivo** em cartões de indicadores: extensão ou área total da entrada; parcela
   atingida (total único); número de interseções; camadas atingidas / camadas consideradas;
   categorias atingidas.
3. **Mapa de localização** (seção 8), largura total da página.
4. **Gráficos** (matplotlib, alta resolução, rótulos com aliases, valores anotados):
   - barras horizontais com a área (ha) ou extensão (km) única atingida **por categoria**;
   - barras horizontais **por camada base**, agrupadas ou coloridas por categoria;
   - ranking das **feições da base mais atingidas** (até 10), identificadas pelo campo de nome
     mais descritivo de cada base (ex.: nome da UC), com a medida atingida;
   - para pontos: barras de pontos dentro e fora por camada.
   Não use gráfico de pizza que sugira soma de percentuais entre camadas sobrepostas.
5. **Análise por categoria**: para cada categoria, o conceito (seção 3.3), os indicadores da
   categoria e uma tabela enxuta, com aliases, das feições atingidas (nome da feição, camada,
   medida, % da entrada), ordenada da maior para a menor. Mostre só os campos que ajudam a
   entender o que foi atingido; o detalhe completo fica no XLSX.
6. **O que se pode concluir**: frases objetivas, cada uma sustentada por um número da análise
   (ex.: "12,0 km² (1,87% da entrada) sobrepõem-se a UCs de Proteção Integral, com destaque
   para o Parque Estadual da Serra do Mar"). Sem juízo de impacto: interseção indica relação
   espacial, não impacto positivo ou negativo. Inclua camadas sem nenhuma interseção.
7. **Metodologia resumida e limitações** (poucas linhas) e **dicionário de aliases** (campo
   bruto → alias) em apêndice.

## 8. Mapa de localização

- Enquadramento: extensão da entrada com folga de 30% do maior lado (mínimo de 2 km), na
  proporção do espaço da página (retrato).
- Camadas: todas as bases consideradas, recortadas ao enquadramento, com cores distintas e
  transparência; interseções em vermelho; a entrada por cima (contorno azul-escuro para
  polígonos, linha grossa para linhas, marcadores para pontos).
- Mapa-base: Esri World Topographic Map (a CARTO exige chave e o OpenStreetMap bloqueia
  download automatizado de tiles). Se falhar, gere o mapa sem fundo e escreva o aviso.
- Barra de escala em distância real (em Web Mercator, divida pela escala 1/cos(latitude)),
  seta de norte, atribuição do mapa-base.
- **Legenda inteira e legível**: posicione abaixo do mapa, em colunas, com nomes amigáveis
  (quebre linhas longas). Confira na imagem final que nenhum item ficou cortado.

## 9. Conferência antes de entregar

- [ ] Todas as bases e a entrada passaram na validação (ou o motivo da recusa foi informado).
- [ ] Nenhum percentual acima de 100%; percentuais não foram somados entre grupos.
- [ ] Número de linhas da tabela = número de ocorrências (linhas/polígonos) ou de pontos.
- [ ] Nomes dos campos seguem o prefixo `<categoria>__<camada>__`; inteiros continuam inteiros.
- [ ] GeoPackage reaberto: camadas `resultado` e `entrada`, EPSG:4674, contagem correta.
- [ ] CSV e XLSX têm as mesmas linhas e colunas da tabela; proteção contra fórmulas aplicada.
- [ ] Os dois PDFs estão em A4 retrato, margens reduzidas, com cabeçalho identificador.
- [ ] Relatório de processamento usa nomes brutos; relatório analítico usa aliases confirmados.
- [ ] Mapa com legenda completa, escala, norte e atribuição.
- [ ] SHA-256 de cada arquivo do pacote registrado; nenhum arquivo vazio.

## 10. Entrega

Entregue o `.zip` e, na resposta, um resumo curto: operação, entrada, bases por categoria,
número de interseções, parcela atingida e a lista de verificações da seção 9 marcada com o
que foi conferido. Informe qualquer limitação encontrada.
