# Fluxo geral de cruzamento espacial configurável

## 1. Configurar as entradas

- Uma ou mais **camadas de entrada**, de qualquer tipo: ponto, linha ou polígono.
- Para cada uma: o **identificador** do registro (por exemplo `proj_id`), o **filtro** de seleção e os **campos** a manter.

## 2. Configurar as bases

Agrupar as bases em **temas**, por exemplo socioeconômico, ambiental, fundiário, patrimônio e risco. Para cada base, definir:

- **Papel:**
  - *unidade de recorte*: divide as entradas, como município, bacia ou zona de transporte;
  - *base de atributos*: só acrescenta informação.
- **Forma de ligação:**
  - *por atributo*, com uma chave comum (código IBGE, por exemplo);
  - *por localização*, com um predicado: intersecta, contém ou está dentro.
- **Regra de multiplicidade**, quando o registro toca mais de uma feição:
  - maior sobreposição, primeira feição, todas (um registro por feição) ou preservação de valores distintos (padrão); cálculos são escolhidos por campo.
- **Campos** a trazer, com **prefixo** e **apelidos**.
- **Preparação** necessária, como buffer, reprojeção ou separação por tipo de geometria.

## 3. Recortar pela unidade de análise (opcional)

Quando houver uma unidade de recorte, dividir linhas e polígonos nos seus limites. Cada pedaço pertence a uma única unidade e guarda o vínculo com a feição de origem.

## 4. Enriquecer os registros

Percorrer os temas e as bases na ordem configurada. Em cada base, aplicar a forma de ligação e a regra de multiplicidade. Registros sem correspondência são mantidos, com os campos vazios.

## 5. Validar

- Número de registros e unicidade do identificador.
- Coerência entre cada registro e a unidade de recorte.
- Regra de multiplicidade aplicada corretamente.
- Conferência da escolha de atributos contra as correspondências já materializadas, sem refazer a busca espacial.

## 6. Consolidar as saídas

- **Arquivo completo:** um arquivo geográfico com uma camada por tipo de geometria de entrada.
- **Recortes por finalidade:** subconjuntos de campos definidos na configuração, como os campos de um conjunto de indicadores.

## 7. Exportar e documentar

- Tabelas de atributos em formatos tabulares, como CSV e XLSX.
- Dicionário de campos: nome, apelido, tema, base de origem e regra aplicada.
- Registro da configuração usada, para que o processamento possa ser reproduzido.


## Motor e unidade de referência

As operações espaciais dos dois fluxos são executadas por GDAL/OGR e as
reprojeções por OSR. A demanda é a referência: pontos são associados por posição;
linhas por extensão e polígonos por área. Contatos na borda são descritos
separadamente. Todo trecho conserva a identificação da demanda original e os
percentuais usam essa demanda como denominador. A saída registra todas as
correspondências mesmo quando se escolhe uma feição para os atributos principais.

## Álgebra nativa de camadas e reaproveitamento

A busca por envelopes e o recorte iterativo próprios foram removidos. O adaptador
`extracao_ogr.LayerOverlay` apenas transfere geometrias/posições de registros
e invoca `OGR.Layer.Intersection` (correspondências) ou `OGR.Layer.Identity`
(recorte, incluindo as partes fora das unidades). A seleção espacial e o overlay
são executados pela biblioteca, sem algoritmo geométrico Python.

No modo sem recorte, GDAL/OGR executa uma junção espacial esquerda pelo driver
SQLite/SpatiaLite: `LEFT JOIN` com `ST_Intersects` e índice espacial nativo.
Não utiliza `OGR.Layer.Intersection` para associar as feições. Todas as demandas,
inclusive sem geometria ou sem correspondência, são mantidas. Múltiplos vínculos
são reunidos nos campos configurados, sem multiplicar os registros. Campos das
bases sem correspondência permanecem nulos. A geometria da saída é a da demanda;
interseções geométricas por par são usadas apenas nas medidas descritivas. No modo
com recorte, Identity fornece os fragmentos e o identificador da unidade.
Contatos de dimensão menor são mantidos como correspondências, mas não viram
fragmentos de linha/polígono de área ou comprimento zero.

As correspondências são gravadas na tabela de saída, com os atributos originais
preservados e prefixos para evitar colisões. Múltiplas correspondências mantêm
os valores originais no campo JSON, inclusive quando uma agregação é solicitada.
A categoria não altera o algoritmo nem a agregação configurada.

Após o geoprocesso, `risco` e `restricao` são materializados quando as respectivas
categorias foram selecionadas: 1 quando há correspondência espacial registrada,
0 quando não há. Um atributo nulo na base não implica ausência de correspondência.
Os campos `sicard_vinculos` e `sicard_esquema` preservam as relações e o esquema
analítico. Painel, mapas e análises complementares leem a camada de saída; não
fazem nova busca espacial nem dependem de um relatório separado de interseções.
Execuções históricas conservam seu contrato anterior de leitura.

Referência: https://gdal.org/en/stable/api/ogrlayer_cpp.html

## Identificação, lote e análise por demanda

A seção 1.1 inspeciona nomes, preenchimento, repetição e amostras dos atributos de
cada camada do arquivo. A sugestão de identificador exige confirmação. FIDs
nativos dos arquivos locais são preservados em um campo próprio; uma demanda
por feição pode usar esse identificador. Códigos repetidos agrupam registros da
mesma camada como uma demanda. A chave analítica inclui a camada de origem.
A escolha opcional de categoria dos pontos permite contagens por categoria.

A seção 1.3 permite definir o algoritmo e nome da saída por camada, herdando o
modo do lote quando não há sobrescrita. Identity exige a escolha explícita da
base de recorte. Cada camada é enviada separadamente ao motor GDAL/OGR.
Um ZIP por entrada contém seu GeoPackage, elementos de base relacionados,
tabelas, dicionário, validação, configuração e análise descritiva. O ZIP geral
reúne os pacotes, GeoPackages e arquivos analíticos unificados.

O painel apresenta restrições antes de riscos, ordenando pela quantidade de
pares únicos demanda × elemento de base. Empates conservam a mesma posição;
nenhuma posição expressa gravidade ou viabilidade. Nas demais categorias, o
atributo escolhido aparece na matriz, nos gráficos e na ficha cadastral.
Ausência de correspondência é distinta de atributo nulo numa feição relacionada.

As métricas por par são contagens de pontos, comprimentos para linhas e
área/perímetro para polígonos. Fragmentos da mesma feição de origem são reunidos
por Union nativa do OGR exclusivamente sobre evidências materializadas na saída;
não se refaz busca espacial contra as bases. Os percentuais usam a demanda
inteira, incluindo as partes sem correspondência. Evidências geométricas estão
em `sicard_demanda` e nas correspondências serializadas, com medidas em EPSG:5880.
A tabela exportada e o painel leem o mesmo contrato. A geometria auxiliar de cada
elemento permite desenhar a base sem consultar novamente o acervo.
