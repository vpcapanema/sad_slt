# Conciliação do catálogo geoespacial

Conciliação do catálogo e ciclo de vida dos resultados geoespaciais. A consulta
não modifica dados. As ações administrativas de regularização, publicação e
retenção são explícitas. Geometrias no banco e a política de homologação são preservadas.

## Interface administrativa

Menu Geoprocessamento → Conciliação do catálogo.
Página: `/api/geoespacial/catalogo/conciliacao/pagina`.
API: `GET /api/geoespacial/catalogo/conciliacao`.
Ambas exigem o perfil administrativo aceito por `require_admin`.

A consulta combina importadas, processadas e homologadas com os arquivos do
servidor que a executa. Consultar localmente um banco remoto não comprova a
existência ou ausência do arquivo no servidor remoto.

- `disponivel`: caminho de dataset registrado e arquivo existente; não certifica conteúdo.
- `arquivo_nao_localizado`: existe referência, mas não foi localizado um arquivo.
- `sem_vinculo_arquivo`: não há caminho de dataset; não implica ausência de dados no banco.
- `aguardando_registro`: arquivo candidato encontrado sem vínculo direto de dataset.

O arquivo original/pacote não substitui o caminho do dataset. Homologadas usam
o caminho do snapshot oficial calculado pela convenção atual, nunca o arquivo
da camada de origem. Um arquivo pode vincular várias camadas, sem escolher uma
arbitrariamente ao carregá-lo. Relatórios JSON e arquivos auxiliares não são
listados como camadas. Extensão ou existência não substitui validação por GDAL.

## Normalização conservadora

`POST /api/geoespacial/catalogo/conciliacao/{categoria}/{recurso_id}/normalizar`
alinha os campos principal e interno de `caminho_arquivo`, apenas quando há um
único arquivo existente entre os caminhos já registrados. Não procura por nome,
não usa semelhança como identidade e não permite alterar snapshots homologados.
Preserva identificadores e demais metadados; grava responsável da sessão,
data, valores anteriores e novo caminho no histórico de conciliação do registro.
A operação usa bloqueio de linha e transação. Não corrige automaticamente
`arquivo_original`, não reconstrói proveniência e não invalida arquivos.

## Catálogo comum

`camadas-diretorio` usa os três catálogos; a biblioteca reconhece o snapshot.
Arquivos não registrados deixam de ser inseridos automaticamente ao carregar
pela bancada: retornam 409 e exigem conciliação. O fluxo de upload continua
sendo o ponto de entrada para novos arquivos.

## Resultados e execuções

A migration `105_ciclo_vida_arquivos_geoespaciais.sql` cria os registros de execução,
arquivo de resultado, referências de uso, exportações e política de retenção.
O repositório grava cada novo resultado processado em GeoPackage ou GeoTIFF,
reabre com GDAL e só confirma o registro após validar a gravação. Vetores têm
CRS, campos, valores e geometrias conferidos; atributos JSON compostos são
codificados no GeoPackage e decodificados pelo carregador. Rasters preservam os
bytes do GeoTIFF e todos os blocos são lidos para conferir a abertura.

Destino: `data/geoespacial/outputs/<execucao_uuid>/<arquivo_uuid>.gpkg|tif`.
O arquivo tem SHA-256, tamanho, validação e vínculo único à camada. Nomes iguais
não sobrescrevem resultados. O PostGIS permanece disponível como conteúdo de
consulta; não há exclusão das feições nesta mudança. Resultados com arquivo
registrado não admitem edição direta: uma edição deve gerar uma nova camada.

Operações HTTP diretas e jobs registram operação, responsável autenticado,
parâmetros e entradas. Entradas já gerenciadas incluem ID do arquivo e hash;
as demais incluem os metadados e hash disponíveis no catálogo. Chamadas diretas
ao repositório sem contexto recebem execução própria; parâmetros e responsável
não informados pelo chamador não são inventados.

Estados: `temporario` durante a execução; `resultado` após conclusão definitiva;
`acervo` após publicação administrativa; `removido` após retenção. O destino
legado `memoria` passa a significar temporário registrado, recuperável. As saídas
de uma execução direta concluída são conservadas como resultados, inclusive
as intermediárias: não há inferência automática de quais podem ser descartadas.

Exportações em formatos solicitados pelo usuário ficam em
`outputs/exportacoes/<uuid>/`, com registro próprio dos componentes e hashes,
vinculadas à execução e à camada de origem. Não substituem o arquivo canônico.
Abertura por GDAL não certifica ausência de perdas inerentes a formatos como Shapefile.

Falha antes do registro remove apenas o arquivo novo. Falha de conexão no COMMIT
é ambígua: o arquivo permanece para conciliação, pois o banco pode ter confirmado.
Não há transação distribuída entre filesystem e PostgreSQL. Falhas abruptas de
processo podem deixar execução ativa ou arquivo sem registro, exigindo diagnóstico;
esses casos não são removidos automaticamente.

## Regularização e publicação

Na página administrativa, **Regularizar resultado** exporta o conteúdo existente
do banco preservando ID da camada. Geometrias vetoriais são lidas por EWKB, sem
arredondamento GeoJSON. A execução é identificada como `regularizacao_legado`:
ela documenta a exportação atual, não reconstrói a execução original desconhecida.
Repetir a operação confere o arquivo registrado, sem duplicá-lo.

**Publicar no acervo** verifica hash e altera o estado para `acervo`. O mesmo
arquivo passa ao grupo operacional do catálogo, sem mover pastas e sem nova camada.
Publicação e homologação permanecem operações diferentes.

APIs administrativas, prefixo `/api/geoespacial/catalogo/conciliacao`:

- `GET /ciclo-vida`: registros e política atual.
- `POST /resultados/{recurso_id}/regularizar`: materializar legado.
- `POST /resultados/{recurso_id}/publicar`: publicar resultado concluído.
- `PUT /retencao`: `{ "dias_temporarios": null }` desativa; inteiro de 1 a 3650 configura.
- `GET /retencao/previa`: listar elegíveis sem remover.
- `POST /retencao/executar`: conferir novamente as condições e remover elegíveis.

## Retenção

Desativada por padrão. Somente arquivos em `temporario`, de execuções encerradas,
mais antigos que o prazo e sem referência de entrada, relatório ou homologação
podem ser removidos. Arquivos divergentes do hash são preservados. Bloqueios de
linha coordenam publicação, referências e remoção. A retenção conserva os
registros de auditoria e as geometrias no banco. Camadas removidas deixam de ser
carregáveis pelo serviço; temporários não aparecem no seletor comum do acervo.

Não há agendamento instalado. A administração pode executar a retenção pela página
ou agendar o comando abaixo após definir o prazo. Jobs cujos resultados aparecem
em relatório são referenciados e, portanto, protegidos da retenção.

## Operação no servidor

Aplicar a migration 105 antes de iniciar o código atualizado. Executar a
regularização **no servidor que contém o storage utilizado pela aplicação**.
Consultar um banco remoto a partir de um checkout local não autoriza considerar
o filesystem local como o storage de produção.

```text
python scripts/regularizar-saidas-geoespaciais.py regularizar
python scripts/regularizar-saidas-geoespaciais.py regularizar --executar --responsavel <identificador>
python scripts/regularizar-saidas-geoespaciais.py reter
python scripts/regularizar-saidas-geoespaciais.py reter --executar --responsavel <identificador>
```

Sem `--executar`, ambos os comandos apenas consultam. `--recurso-id` limita a
regularização a uma camada. Cada camada é confirmada separadamente e erros
produzem saída diferente de zero; uma nova execução retoma os registros pendentes.

A conciliação assistida de arquivos antigos sem evidência de identidade continua
manual. A tabela de resultados não substitui o cadastro preexistente de uploads.
