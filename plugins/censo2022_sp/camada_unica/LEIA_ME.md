# Camada unica — Censo 2022, municipios de Sao Paulo

Abra `SP_Censo2022_completo.fgb` como camada vetorial. Todos os 645 municipios e os 6.159 campos censitarios estao na mesma camada e na mesma tabela de atributos, sem necessidade de joins.

As quatro primeiras colunas identificam o municipio e a area original. Em seguida, os campos estao lado a lado por tema e, dentro do tema, por tabela de origem. Os prefixos dos nomes identificam os temas. `dicionario_campos.csv` informa a ordem exata, a descricao, a unidade, as categorias e as fontes de cada campo.

O arquivo e FlatGeobuf (.fgb), nao ESRI Shapefile (.shp). Foi utilizado para preservar todos os 6.159 campos numa unica camada, sem exceder as limitacoes do DBF do shapefile. Os arquivos anteriores foram preservados.

O arquivo .qml fornece aliases auxiliares para QGIS; a ordem tematica ja esta fisicamente gravada no .fgb e independe dele. Nao houve validacao visual no QGIS. A releitura pelo GDAL/GeoPandas confirmou os valores, nulos, ordem das colunas, codigos, coordenadas e CRS, sem diferencas. Poligonos simples foram representados como MultiPolygon de uma parte para uniformizar o tipo geometrico, sem alterar limites ou coordenadas.

O conteudo e a selecao de 114 tabelas sao os mesmos da entrega anterior. Permanecem as distincoes entre universo e amostra, os 46 campos integralmente nulos e os cuidados com totais/subtotais e categorias sobrepostas. Consulte tambem `../LEIA_ME.md` para as notas completas.
