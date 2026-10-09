# Recepção de geometrias de demandas

Planos, programas e projetos passam a gravar polígonos válidos em SIRGAS 2000 (EPSG:4674).
Pontos recebem raio de 50 metros; linhas recebem 25 metros por lado, com extremidades arredondadas.
O buffer usa SIRGAS 2000 / Brazil Polyconic (EPSG:5880), em metros, por GDAL/OGR, e o resultado é reprojetado.
Polígonos não recebem buffer. Geometrias multipartes são aceitas e polígonos inválidos são reparados.

O original de cada novo upload fica intacto em `demandas/originais/<tipo>/<id>/<uuid>.<extensão>`.
O histórico registra nome original, tamanho, SHA-256, caminho e regras de processamento.
O envio é verificado por leitura e hash antes de registrar a referência. Downloads mantêm autorização de administrador.
Originais legados no banco continuam acessíveis e não são removidos nesta alteração.

Shapefile e GeoPackage precisam declarar CRS; GeoJSON sem declaração segue EPSG:4326,
conforme o formato, e CRS explícito válido é reprojetado. KML/KMZ usam EPSG:4326.
Coordenadas projetadas sem declaração de CRS são recusadas.
O mapa continua recebendo GeoJSON em EPSG:4326; isso não muda o CRS da geometria armazenada.

## Publicação

1. Migration 125, aditiva e compatível com a versão anterior, cria as referências ao Storage. Aplicada em 09/10/2026.
2. Publicar os escritores novos. Eles consultam `Find_SRID` e trabalham durante a transição.
3. Aplicar explicitamente `126_crs_demandas_sirgas2000.sql` depois de atualizar todas as instâncias.
   A migration 126 foi testada com rollback e não integra a lista automática, para não quebrar escritores antigos.

Registros anteriores têm somente o CRS reprojetado pela migration 126; pontos/linhas anteriores não recebem buffer retrospectivo.
