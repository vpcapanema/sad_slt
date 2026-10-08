# Saídas geoespaciais no Sicard Storage

O destino oficial é `saidas-geoespaciais/execucoes/<uuid>/`. Cada execução contém
`camadas/`, `relatorios/` e `pacotes/`, conforme os arquivos que produziu.
Os nomes dos arquivos são legíveis e recebem um identificador para evitar colisões.
A pasta da execução preserva sua identidade mesmo quando seu nome é alterado.

O banco mantém execuções, parâmetros, procedência, catálogo, hashes e referências.
As geometrias de Plano, Programa e Projeto continuam em `demandas`, no mesmo
PostgreSQL/PostGIS. As entradas importadas foram preservadas nesta mudança.

## Gravação e leitura

- Vetores processados: GeoPackage, camada interna `resultado`, EPSG:4674.
- Rasters processados: GeoTIFF, mantendo bytes e georreferenciamento.
- Extrações: camadas no catálogo, ZIP e relatório completo no Storage.
- Gerador municipal: camada, pacote com dicionário/aliases e metadados no Storage.
- Exportações: todos os acompanhantes de Shapefile conservam o mesmo nome-base.
- Relatórios dos jobs: JSON na pasta da execução, com referências e hashes das saídas.

Arquivos são preparados temporariamente, reabertos pelo GDAL/rasterio, enviados
pela API do Storage e baixados novamente para conferir tamanho e SHA-256.
Só então sua referência é confirmada no banco. Uma falha inequívoca de registro
remove o novo arquivo; uma falha durante COMMIT conserva o arquivo para conciliação.

Os leitores recuperam arquivos pelo Storage. O visualizador organiza saídas por
ferramenta, execução e camada, incluindo exportações. Resultados de execuções
concluídas ou regularizadas aparecem no catálogo; registros ainda em execução
continuam no histórico. Pacotes e relatórios privados mantêm a verificação de
proprietário, com acesso de gestor/administrador.

## Transição e limpeza

`123_saidas_geoespaciais_storage.sql` adiciona referências e mantém a compatibilidade
necessária enquanto há servidores executando o código anterior.

O utilitário `scripts/migrar-saidas-para-storage.py` faz inventário por padrão.
Com `--executar`, migra arquivos legados e confere as referências já migradas.
`--raiz-exportacoes` permite usar uma cópia temporária fiel dos arquivos da VM,
preservando os caminhos relativos originais. Os componentes de exportações
precisam corresponder aos hashes registrados; nomes semelhantes não bastam.

`124_concluir_saidas_storage.sql` é deliberadamente uma etapa explícita, posterior
à atualização de todos os servidores que usam o banco. Ela não está na sequência
automática de compatibilidade. Quando a nova versão estiver publicada:

1. Interromper gravações da versão antiga e conferir novamente todas as referências.
2. Aplicar a migração 124, que exige arquivos validados e homologações vazias.
3. Conferir leitura, downloads, geração e visualizador na versão publicada.

A migração remove `camada_processada_feicao`, `camada_processada_raster` e as três
tabelas `camada_homologada*`, além de `camada_processada.envelope`,
`extracao_atributos.pacote` e `extracao_atributos.entrada_geojson`.
Usa bloqueios e `RESTRICT`; não usa `CASCADE` nem elimina homologações com dados.
O catálogo `camada_processada` permanece como metadados, sem conteúdo geoespacial.

## Verificação em 08/10/2026

- 15 camadas preservadas migradas: 271 feições com geometria e atributos conferidos.
- Duas exportações Shapefile migradas: dez componentes com hashes conferidos.
- 140 testes passaram, incluindo integração com a migração 124 aplicada somente
  dentro de transações revertidas. Os testes municipais adicionais passaram antes
  da verificação final do catálogo.
- A aplicação local foi atualizada e uma camada do Storage foi exibida no mapa.
- A VM ainda usa a versão anterior. A migração 124 não foi aplicada definitivamente.
- Os arquivos antigos da VM permanecem durante a transição. Arquivos físicos sem
  vínculo não foram removidos por esta padronização.

Evidências: `outputs/inventario-saidas-20261008/migracao-storage.json`,
`resultado-migracao-completa.json` e `versao-vm-storage.json`.
