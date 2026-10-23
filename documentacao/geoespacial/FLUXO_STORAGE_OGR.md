# Storage, prévia e bancada com GDAL/OGR

O fluxo de seleção de camadas do storage, validação da prévia e abertura na
bancada usa `fluxo_camadas_ogr` e `analise_territorial_ogr`. Arquivos vetoriais
simples e subcamadas de pacotes compartilham o leitor nativo. Não há retorno
automático ao leitor baseado em GeoDataFrame quando a validação falha.

- OGR conserva o esquema, os valores nulos, inteiros de 64 bits, geometrias e
  FIDs. As cópias de prévia são reabertas e conferidas antes de serem entregues.
- OSR transforma coordenadas e valida sua compatibilidade com o CRS declarado.
- A ficha descritiva mede área e comprimento sobre WGS84 por OGR SQL/SpatiaLite,
  disponível no GDAL 3.8.4 do servidor. Esses valores descritivos não substituem
  as áreas de processamento territorial calculadas em EPSG:5880.
- A bancada lê tabelas e tiles do original, inclusive em pacotes. Geometrias
  ausentes permanecem na tabela; a validação para processamento as rejeita.
- A normalização de demandas opera diretamente em OGR, mantendo os buffers
  existentes de 50 m para pontos e 25 m para linhas. O resultado é uma camada
  derivada; a fonte não é alterada.
- A prévia raster usa Warp, DEMProcessing e Translate do GDAL.

Um fluxo comum significa compartilhar leitura e validação, preservando a
distinção entre o original, a representação de mapa e os produtos de análise.
Não significa aplicar buffers ou reparos automaticamente ao arquivo original.

O escopo desta migração é storage → prévia → bancada e preparação/análise
territorial. Outros recursos ainda têm contratos baseados em DataFrame, como
upload local, avaliador de expressões de atributos e algoritmos gerais de
extração. Por isso pandas/GeoPandas não foram removidos das dependências do
projeto. Esses recursos não são caminhos alternativos usados pelo leitor
comum do storage.

`tests/test_fluxo_camadas_ogr.py` bloqueia importações das bibliotecas antigas
durante o percurso integrado e verifica arquivos simples e ZIPs, FIDs esparsos,
inteiros grandes, nulos e integridade da fonte. Os testes de prévia, bancada,
raster e análise territorial verificam os contratos específicos. O teste de
navegador `bancada-storage-tiles.cjs` verifica a abertura de pacotes em tiles.
