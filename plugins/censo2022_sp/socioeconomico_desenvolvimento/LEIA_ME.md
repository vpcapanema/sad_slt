# São Paulo — dados socioeconômicos e desenvolvimento

Abra `SP_Socioeconomico_Desenvolvimento.fgb`: uma camada, 645 municípios, 2399 campos de indicadores, mais quatro atributos da malha.

Os campos estão juntos por tema: IDHM; pobreza e desigualdade; desenvolvimento humano; PIB e estrutura econômica; empresas e emprego; finanças públicas; IDEB; e os cinco grupos socioeconômicos do Censo 2022. O ano faz parte de todos os nomes dos indicadores.

**Esta é uma base multitemporal, não uma fotografia de um único ano.** IDHM e indicadores do Atlas usam 2010; PIB e PIB per capita usam 2023 e 2022, com estrutura setorial de 2021; Cadastro Central de Empresas usa 2024; finanças públicas e IDEB usam 2025, conforme períodos retornados pela API oficial na coleta. Censo: 2022.

O IDHM inclui os componentes educação, longevidade e renda. Gini, Theil, pobreza, renda per capita e os demais indicadores históricos preservam as definições do Atlas, inclusive as linhas monetárias e os preços de 2010. Não interprete esses indicadores históricos como condições atuais.

PIB per capita mede produção econômica por habitante, não renda domiciliar. Os valores de PIB, valor adicionado e impostos estão em MIL REAIS; não foram multiplicados. Outras unidades e multiplicadores estão no dicionário. Valores de anos diferentes não foram deflacionados.

Os totais e subtotais oficiais foram preservados. Não somar total com componentes. O emprego do Cadastro Central de Empresas tem universo e referência diferentes da ocupação medida no Censo. As notas por indicador, período e origem estão no dicionário e nos JSON preservados.

Nas fontes adicionais, ausências e símbolos não numéricos permanecem nulos, sem imputação. Os valores textuais da API IBGE são preservados em `valores_originais_ibge.csv.gz`. Indicadores integralmente sem dados numéricos foram excluídos e listados em `validacao.json`. Na parcela do Censo mantém-se o tratamento anterior: o símbolo SIDRA "-" como zero absoluto.

A API de Pesquisas do IBGE retorna códigos de seis dígitos. Eles foram associados de maneira unívoca aos códigos de sete dígitos da malha, sem correspondência por nomes. O Ipeadata fornece códigos municipais de sete dígitos. Veja `correspondencia_codigos.csv`. Geometria e CRS SIRGAS 2000, EPSG:4674, mantidos da camada validada.

A API do IVS consultada no Ipeadata não retornou nível municipal. IVS não foi incluído nem substituído por valores estaduais.

Validação: 645 chaves únicas, cobertura por indicador, igualdade exata de valores/nulos e ordem após exportação, geometrias e CRS. IDHM de São Caetano do Sul, São Paulo e Águas de São Pedro conferido com a tabela pública do PNUD (https://www.undp.org/pt/brazil/idhm-municipios-2010). Não houve inspeção visual no QGIS.

`dicionario_campos.csv`: descrição, ano, unidade, fonte, notas e posição de cada campo. `indicadores_adicionais.csv`: somente os novos indicadores, sem geometria. `fontes/` e `consultas.json`: respostas e URLs de origem. O arquivo .qml oferece aliases auxiliares. As fontes brutas do Censo permanecem em `../fontes/`.

## Cobertura

| Tema | Ano | Campos | Municípios com valor (mín.–máx.) |
|---|---:|---:|---:|
| idh | 2010 | 4 | 645–645 |
| pobreza_desigualdade | 2010 | 15 | 645–645 |
| desenvolvimento_humano | 2010 | 7 | 645–645 |
| economia | 2021 | 8 | 645–645 |
| economia | 2022 | 2 | 645–645 |
| economia | 2023 | 2 | 645–645 |
| empresas_emprego | 2024 | 86 | 2–645 |
| financas_publicas | 2025 | 28 | 5–641 |
| ideb | 2025 | 12 | 1–641 |
| 05_educacao | 2022 | 486 | 645–645 |
| 06_renda | 2022 | 430 | 645–645 |
| 07_trabalho | 2022 | 523 | 645–645 |
| 08_habitacao_internet | 2022 | 272 | 645–645 |
| 04_saneamento | 2022 | 524 | 645–645 |
