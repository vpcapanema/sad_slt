# Municipios de Sao Paulo — Censo Demografico 2022

Base gerada em 2026-09-10T01:36:10.299714+00:00. Fontes: IBGE, malha municipal 2022 e SIDRA, periodo 2022.
**645 municipios; 6,159 campos de dados; 114 tabelas; 18 temas; 39 camadas espaciais.**

## Abrir os dados
- QGIS: abra `SP_Censo2022.gpkg` e escolha as camadas tematicas.
- Shapefile: abra o `.shp` na subpasta do tema em `shapefiles/`. Mantenha juntos `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg` e `.qml`.
- A juncao ja esta materializada em cada camada: uma feicao por municipio, chave textual `CD_MUN` com 7 digitos. Nao e necessario fazer novo join.
- `malha_original/` conserva os arquivos originais do IBGE; `fontes/SP_Municipios_2022.zip` conserva o download original.
- `tabelas/` contem os mesmos dados sem geometria, por tema. Codificacao UTF-8, separador virgula, decimal ponto. Ao importar, mantenha CD_MUN como texto.
- `documentacao/dicionario_variaveis.csv` relaciona campo, camada, tabela, variavel, unidade, categorias e divulgacao oficial. Ha uma copia dessa tabela no GeoPackage.
- Os arquivos `.qml` oferecem aliases descritivos dos campos no QGIS. Sao auxiliares; os nomes fisicos dos campos continuam sendo os codigos do dicionario.

## Escopo da selecao
Selecao tematica ampla de 114 das 371 tabelas do catalogo municipal retornado pela API para 2022. Nao e uma extracao integral de todas as tabelas do Censo. A cobertura, incluindo tabelas nao selecionadas, esta em `documentacao/cobertura_catalogo.csv`.
Foram extraidas todas as variaveis das tabelas selecionadas e todas as categorias de cada classificacao, abrindo uma classificacao de cada vez e mantendo as demais no Total. Quando uma classificacao nao possui Total, suas categorias sao mantidas explicitamente. Nao foram extraidos todos os cruzamentos simultaneos entre sexo, idade, cor/raca e outras dimensoes.
Um campo representa uma combinacao de tabela + variavel + categorias. Portanto, a contagem de campos inclui desdobramentos, totais, percentuais oficiais e indicadores repetidos em tabelas diferentes. Nao corresponde a indicadores conceitualmente distintos.
Os nomes V01000001, por exemplo, sao identificadores de campos da entrega, nao codigos de variaveis do IBGE. Os codigos oficiais constam no dicionario. Partes numeradas de um mesmo tema continuam tendo todos os 645 municipios; a divisao e de colunas, em ate 200 campos censitarios por arquivo.

## Cuidados para a analise
- Os resultados do universo e os resultados preliminares da amostra sao identificados pela divulgacao no dicionario. A amostra contem estimativas; preserve essa distincao e consulte as notas oficiais antes de comparacoes.
- Os percentuais sao os publicados pelo IBGE, com os denominadores e recortes das respectivas tabelas. Nenhum percentual foi recalculado nesta entrega.
- Categorias podem conter totais, subtotais e faixas etarias sobrepostas. Nao some todas as colunas indiscriminadamente.
- Favelas, entorno urbano, populacao indigena e quilombola e outros recortes nao representam necessariamente toda a populacao ou todo o territorio do municipio.
- Simbolo SIDRA `-` foi convertido em zero absoluto. `X`, `..`, `...`, faixas alfabeticas e municipios sem registro ficam nulos nos campos numericos; nunca foram imputados como zero.
- `tabelas/*_originais.csv.gz` preserva os valores textuais; `documentacao/ausencias_e_simbolos.csv.gz` distingue os motivos de ausencia. Os JSON originais das consultas tambem estao preservados.
- CRS mantido: EPSG:4674. Geometrias originais preservadas, sem simplificacao ou reparo. Para medir distancias/areas, use um CRS projetado apropriado; AREA_KM2 e atributo original do IBGE.

## Temas
| Tema | Tabelas | Campos | Camadas |
|---|---:|---:|---:|
| 01_populacao | 5 | 291 | 2 |
| 02_cor_raca | 3 | 312 | 2 |
| 03_domicilios | 7 | 138 | 1 |
| 04_saneamento | 10 | 524 | 3 |
| 05_educacao | 8 | 486 | 3 |
| 06_renda | 7 | 430 | 3 |
| 07_trabalho | 8 | 523 | 3 |
| 08_habitacao_internet | 7 | 272 | 2 |
| 09_entorno_urbano | 5 | 359 | 2 |
| 10_indigenas | 6 | 359 | 2 |
| 11_quilombolas | 5 | 244 | 2 |
| 12_deficiencia_autismo | 9 | 300 | 2 |
| 13_migracao | 7 | 814 | 5 |
| 14_familias_fecundidade | 7 | 363 | 2 |
| 15_religiao | 3 | 161 | 1 |
| 16_deslocamentos | 6 | 250 | 2 |
| 17_favelas | 8 | 167 | 1 |
| 18_registro_obitos | 3 | 166 | 1 |

## Validacao
Verificadas: 645 chaves unicas e validas, join 1:1, ausencia de codigos estranhos a malha, periodo 2022, nivel municipal, consistencia entre resultados repetidos, releitura dos shapefiles e do GeoPackage, preservacao dos valores numericos, CRS e geometrias dos shapefiles.
Soma da populacao dos municipios na tabela 4714: 44,411,238; identica ao total estadual retornado pelo IBGE. Geometrias invalidas na origem: 0. Campos integralmente sem valor numerico: 46.
Resultados detalhados: `documentacao/validacao.json`. Nao foi feita validacao visual no aplicativo QGIS.

## Fontes e reproducao
- Malha: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/SP/
- Censo: https://sidra.ibge.gov.br/pesquisa/censo-demografico/demografico-2022/inicial
- API: https://servicodados.ibge.gov.br/api/docs/agregados?versao=3
- Cada URL de consulta esta em `documentacao/consultas.json`; paginas tematicas e metadados foram preservados em `fontes/`.
- Scripts: `preparar.py`, `documentar_fontes.py`, `gerar.py`, `finalizar.py`, nesta ordem. Dependencias utilizadas: requests, pandas, geopandas, numpy e pyogrio. Os scripts reutilizam as fontes baixadas; para uma atualizacao, execute em uma copia limpa para preservar esta entrega.
- O ZIP de entrega contem os produtos e documentacao; as fontes brutas e os scripts permanecem nesta pasta.
