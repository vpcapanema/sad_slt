# Saídas geoespaciais no Sicard Storage

Os produtos permanentes usam nomes legíveis dos elementos, organizados por
contexto em `saidas-geoespaciais/hierarquizacoes`, `analises-avulsas` ou
`exportacoes`. UUIDs continuam como identificadores internos de execuções,
propriedade e rastreabilidade, não como nomes dos novos arquivos publicados.
Os caminhos legados continuam aceitos durante a migração.

O controle `geoprocessamento.nome_storage` associa cada nome físico à identidade
do elemento. Uma publicação do mesmo elemento reutiliza seu destino; elementos
distintos com títulos iguais recebem sufixos numéricos (`_2`, `_3`), sem
sobrescrita por mera coincidência nominal. Os acompanhantes de Shapefile
conservam o mesmo nome-base.

Exemplos de destinos:

```text
saidas-geoespaciais/analises-avulsas/gerador-camadas-territoriais/indices_sociais/indices_sociais.gpkg
saidas-geoespaciais/hierarquizacoes/HIER-001/fase-1/elegibilidade_territorial/Projetos_elegibilidade_territorial.gpkg
saidas-geoespaciais/exportacoes/diagnostico/Diagnóstico.json
```

PDFs, planilhas e pacotes usam nomes como `Relatório de Elegibilidade
Territorial.pdf`, `Resumo da Elegibilidade.xlsx` e `Relatório e Camadas.zip`.
Revisões privadas mantêm hashes internos na pasta `revisoes`, para vincular
usuário e resultado sem expor dados da conta nos nomes físicos.

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

Na republicação, o controle coordena bloqueios, transação SQL e arquivos
operacionais: atualiza os caminhos, hashes, jobs persistidos, configurações e
referências do resultado substituído. Pré-visualizações antigas são invalidadas.
Falhas confirmadas antes da efetivação restauram os bytes anteriores e revertem
as referências. Falha de limpeza posterior à confirmação é informada como tal;
não se apresenta uma publicação já confirmada como se tivesse sido desfeita.
Resultado indeterminado de COMMIT exige conciliação.

A substituição é bloqueada quando alcança homologações/publicações protegidas,
execuções ativas, agregações legadas opacas ou revisões posicionais incompatíveis.
Não há isolamento adicional por proprietário no registro de nomes: permanecem
as regras de acesso e a identidade do elemento do fluxo de origem.

Os leitores recuperam arquivos pelo Storage. O visualizador organiza saídas por
ferramenta, execução e camada, incluindo exportações. Resultados de execuções
concluídas ou regularizadas aparecem no catálogo; registros ainda em execução
continuam no histórico. Pacotes e relatórios privados mantêm a verificação de
proprietário, com acesso de gestor/administrador.

## Migração da nomenclatura por elemento

A mudança requer a migração
`database/161_nomes_elementos_storage.sql`, registrada no aplicador de banco.
A execução dos testes locais não aplica essa SQL nem altera o acervo de produção.

O utilitário específico exige o código atualizado, a SQL 161 aplicada e a
montagem oficial de escrita do Storage. Deve-se interromper os produtores antigos
antes da aplicação; a opção de manutenção é uma confirmação operacional, não
substitui a parada das gravações.

```powershell
# Somente planejamento; não altera arquivos do acervo.
.venv\Scripts\python.exe -m scripts.migrar_nomes_storage

# Executar apenas no ambiente autorizado e em manutenção.
.venv\Scripts\python.exe -m scripts.migrar_nomes_storage --aplicar --manutencao
```

O planejamento verifica nomes e identidades a partir dos metadados existentes.
Arquivos presentes sem associação verificável e com nomes UUID/hash bloqueiam a
aplicação, em vez de receberem nomes presumidos. Produtos sem vínculo que já
possuem caminhos legíveis permanecem intactos, sem receber identidade ou reserva;
seus caminhos, tamanhos e SHA-256 constam em `arquivos_sem_vinculo_preservados`
no pré-voo e no manifesto. Seus JSONs e ZIPs não são interpretados nem reescritos.
Revisões privadas históricas cujo resultado esteja ausente exigem validação
específica do formato e da propriedade; são preservadas, sem criar um resultado
substituto. Revisões de resultados presentes acompanham o remapeamento do caminho.
Pacotes municipais legados sem nome de saída exigem vínculo único de camada e
concordância entre as evidências da mesma execução. Registros de catálogo cujos arquivos já estavam
integralmente ausentes são inventariados como pendências preexistentes no
pré-voo e no campo `pendencias_preexistentes` do manifesto; não são removidos,
consolidados nem associados a substitutos por semelhança de nome. Conjuntos
parcialmente ausentes continuam bloqueados. Versões do mesmo elemento são consolidadas pela data, com
atualização das referências operacionais, caminhos e assinaturas; homônimos
distintos não são consolidados. O procedimento contempla JSONs operacionais e
referências em JSONs de pacotes ZIP, com manifesto e backups. Logs e registros
imutáveis de auditoria são preservados.

Conflitos de identidade e versões com datas empatadas e conteúdo divergente
também bloqueiam a aplicação. O manifesto e os backups permitem conciliação;
não existe comando automático de restauração depois do COMMIT.

Layouts anteriores à organização por contexto podem exigir primeiro o
planejamento com `scripts/migrar_destinos_storage.py`. Não se deve executar
os dois migradores indiscriminadamente nem iniciar exclusões por padrões de nome.
A migração deve usar a relação exata de origens e destinos conferida no plano.

Validação focada inicial: 334 testes aprovados e 16 integrações
bancárias opt-in não executadas, sem `SLT_TEST_CICLO_BANCO=1`. Inclui
republicação A→B, reabertura do GeoPackage pelo job antigo, isolamento de
homônimos, falhas de Storage/SQL/COMMIT e aplicação sintética da migração.
Não comprova a aplicação da SQL 161, a disponibilidade dos bancos oficiais
ou a migração do acervo real. Esses passos exigem conferência independente na VM.

## Transições anteriores e limpeza

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

## Insumos para os critérios da FAP do PLI

`scripts/preparar_insumos_pli.py` prepara fontes existentes segundo
`config/insumos-pli-fap.json`, sem calcular notas, valores da FAP ou modificar
a metodologia de hierarquização. Os 17 critérios são conferidos contra a tabela
do segundo slide de `documentacao/fundamentacao/PLI_Fig_Estrutura_Criterios_v6.pptx`.

Sem argumentos, o script confere a configuração e as fontes locais, sem escrita
remota. Com `--publicar --manifesto CAMINHO`, publica em diretório exclusivo
`aplicacao/insumos-pli-fap/<data>-<identificador>/`:

- Novas camadas GeoPackage, camada interna `resultado`, recortadas pelo limite
  de SP do acervo e reprojetadas para EPSG:4674, preservando atributos.
- `manifesto.json`, com associação critério–variável–insumo, procedência, hashes,
  campos, contagens, CRS, ocorrências de geometria inválida e limitações.
- `variaveis.csv`, com a disponibilidade de insumos para as 32 variáveis.

Bases que já existem no Storage são referenciadas, sem duplicação ou alteração.
Seu conteúdo é lido e conferido; novas camadas e os dois arquivos de inventário
são baixados novamente para conferir tamanho e SHA-256. A existência de insumos
de apoio não significa que a variável da FAP esteja calculada. Fontes sem CRS
identificado permanecem pendentes, sem atribuição por suposição.
