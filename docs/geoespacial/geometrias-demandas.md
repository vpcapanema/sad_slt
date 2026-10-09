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
3. Após atualizar as instâncias, executar `scripts/migrar_geometrias_demandas_ogr.py` para simular com rollback;
   usar `--aplicar` para confirmar a transação. O script usa OGR para reprojeções e buffers,
   verifica o backup no Storage antes do commit e preserva versões históricas sem aplicar buffers nelas.

Migração aplicada em 09/10/2026 após confirmar o commit publicado `b0aad54feb1b1e0ee215c65dfcdb618eda0cf69c`.
Foram reprojetados 8 planos, 11 programas e 94 projetos para EPSG:4674;
93 projetos pontuais receberam buffer de 50 metros em EPSG:5880. Não havia linhas ou versões no histórico.
Backup anterior: `demandas/migracoes/20261009T121420Z-537d7598e1f447b3affb9237ee4607d9.json`.
SHA-256: `211cec54d19e0a5a1206db68d0bc921b653331f09c2c9dda918c8335a56f3486`.
