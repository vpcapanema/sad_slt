# Defeitos e riscos reproduzidos — registro parcial

Versão de referência dos achados originais: main / 26b1b6c9211279225200c8f63f488dae7846603f.
O registro original abaixo é preservado; as correções da retomada constam ao final.

**Atualização após testes reais:** a autenticação foi resolvida com as credenciais existentes. Foi criado ambiente isolado, com cópia idêntica dos fontes, PostGIS e SFTPGo próprios. Os registros abaixo de NUM-001/002/004 continuam sendo falhas condicionais de métodos, não falhas reproduzidas no importador novo: nesse fluxo a máscara é convertida para NaN e os três resultados reais passaram. NUM-005 e CONTRATO-001 foram posteriormente reproduzidos pela API real. As notas antigas de integração pendente devem ser interpretadas à luz desta atualização. Todos os testes de escrita ocorreram apenas no ambiente AUDIT.

## DATA-MULTICAMADA-003 — editar uma camada elimina as demais do GeoPackage

**Severidade crítica: perda de dados. Estado FALHOU.** API real + arquivo real, localhost:18084, mesmo commit. Alcance por clique no editor não demonstrado porque o carregamento da UI já falha.

Pré-condição: importar `dados/AUDIT_multicamada.gpkg` pelo endpoint `/api/geoespacial/importar_camadas`, sem reprojetar. O arquivo contém pontos, linhas, polígonos e multipartes. Obter tabela e revisão da camada Pontos. Enviar `/camadas/{id}/atributos/salvar` com `edicoes=[{indice:0,campos:{valor:7}}]` e a revisão atual.

Esperado: P101.valor passa de 2 a 7; P305 continua 6; as quatro camadas e suas geometrias permanecem. Obtido: HTTP 200; valores editados corretamente em Pontos, mas `fiona.listlayers` passa de quatro camadas para apenas `pontos`. O arquivo fonte registrado perdeu as três outras camadas. Não foi inferido a partir de cache: o arquivo foi inspecionado depois da gravação.

Evidência: `evidencias/edicao-persistencia.json`, caso MULTICAMADA, e script `scripts/edicao_persistencia.py`. Fixture original de referência permanece intacta em `dados/`; apenas a cópia importada no sandbox foi afetada.

Causa confirmada: `GeoespacialService.salvar_edicoes_atributos` chama `_reescrever_arquivo_do_acervo`, que lê somente o primeiro nome de camada, grava um novo arquivo contendo apenas o GeoDataFrame editado e substitui o contêiner inteiro por `os.replace`. O banco é atualizado depois; não existe uma transação conjunta arquivo/banco nessa sequência.

Proposta: atualização da camada identificada dentro de cópia integral do contêiner, validação de todas as camadas e troca atômica coordenada com persistência. Regressão: editar cada camada de GPKG com 2+ camadas, comparar nomes, contagens, tipos, atributos e geometrias de todas as camadas; simular falha de banco/arquivo em ambiente isolado.

## DATA-MULTICAMADA-002 — reabertura devolve a primeira camada para outros identificadores

**Severidade alta: resultado geográfico errado. Estado FALHOU.** API real em processo novo, localhost:18085, mesmo banco AUDIT, antes da edição destrutiva acima.

Reprodução: importar o mesmo GPKG; iniciar instância nova sem cache; solicitar `/camadas/{id}/geojson` para cada um dos quatro identificadores. Esperado: Pontos=2 Point; Linhas=1 LineString; Polígonos=2 Polygon; Multipartes=1 MultiPoint. Obtido: HTTP 200 para todos, sempre os mesmos dois Point.

Evidência: `persistencia-fria.json`, quatro casos MULTICAMADA_FRIA. Script `persistencia_fria.py` cria processo separado e o encerra após as leituras. Causa confirmada: `_ler_do_acervo` em `geoespacial_service.py` usa `gpd.read_file(caminho)` sem `layer`, apesar de vários recursos compartilharem o arquivo. A leitura bem-sucedida da primeira camada impede o fallback para o banco.

Proposta: persistir e usar o nome interno da camada, sem escolher implicitamente a primeira. Regressão: cache quente/frio e reinício, comparando identidade, tipo e conteúdo para todos os IDs. Não basta conferir o nome exibido.

## UI-MULTICAMADA-001 — catálogo aceita quatro camadas que a bancada não consegue carregar

**Severidade alta: fluxo principal bloqueado. Estado FALHOU.** UI real autenticada + backend real isolado.

Passos: importar GPKG via API; Mapa → Carregar do sistema → Procurar camadas do sistema → Camadas cadastradas no banco → Marcar todas → Confirmar (4) → Carregar camada. Esperado: quatro camadas carregadas. Obtido: “0 de 4 camada(s) carregada(s)” e, para cada entrada, “O arquivo registrado deve conter uma única camada vetorial”.

Evidências: `UI-MULTICAMADA-001.txt` e `.png`; `integracao-importacoes.json`. Causa confirmada: `bancada_camada_original._fonte` usa `camada=None` para arquivo registrado local; `_abrir` rejeita `GetLayerCount()!=1`. O caminho de storage remoto aceita identificação da subcamada, mas o de arquivo registrado não.

Proposta: unificar o contrato de identificação de subcamadas. Regressão: GPKG único/múltiplo, seleção parcial/todas, carregamento após recarga, mapa e tabela.

## GEO-SELECAO-001 — selecionar por localização duplica feições

**Severidade alta: cardinalidade e atributos incorretos. Estado FALHOU.** OP-07 por API real.

Entradas: dois pontos P101/P305 e dois polígonos sobrepostos A/B. P101 intercepta A; P305 intercepta A e B. Esperado para seleção: dois pontos originais, cada um uma vez. Obtido: três registros; P305 aparece duas vezes; campos originais recebem sufixos left/right. O resultado se comporta como junção espacial, operação separada OP-34.

Evidências: `oraculos.json`, REF-OP-07-COUNT; `saidas/OP-07.gpkg`; `saidas-verificadas.json`. Causa: `selecionar_por_localizacao` retorna o resultado de `gpd.sjoin` sem deduplicar por identidade da origem. Proposta: obter conjunto de IDs selecionados e devolver subconjunto da fonte. Regressão: múltiplas correspondências, fronteiras, inversão, nenhuma correspondência e campos preservados.

## IMPORT-INTEIRO-001 — GeoTIFF inteiro com NoData não é importado

**Severidade alta: entrada raster comum bloqueada. Estado FALHOU.** API real.

Entrada: `AUDIT_inteiro_nodata.tif`, UInt16, EPSG:31983, 3×3, sentinela 65535 no centro, oito valores válidos 1…9. Inspeção retorna HTTP 500 genérico; importação retorna 422 com `Cannot convert fill_value nan to dtype uint16`.

Causa confirmada: `validate_raster` em `importar_camadas_service.py` chama `.filled(np.nan)` antes de `.astype('float32')`. A matriz mascarada ainda tem dtype inteiro quando recebe NaN. Evidência `integracao-adicionais.json` e fonte citado. Proposta: converter dtype antes de preencher a máscara. Regressão: UInt8/UInt16/Int16/Int32, Float32, sentinelas, máscara externa e raster sem pixels válidos.

## IMPORT-COORD-001 — campos lat/long recebem coordenadas UTM

**Severidade alta: atributos geográficos enganosos. Estado FALHOU.** Importação real em EPSG:31983 sem reprojeção.

Esperado: latitude e longitude em coordenadas geográficas, ou nomes explícitos para X/Y projetados. Obtido em P101: lat=7400000 e long=500000, preservados inclusive no GeoJSON exportado com geometria em -45, -23.5101947. Causa confirmada: `validate_vector` atribui diretamente `points.y`/`points.x`, sem transformação para CRS geográfico.

Evidência `integracao-operacoes.json`, OP-25, e `saidas-verificadas.json`. Proposta: calcular campos geográficos em CRS explicitamente definido ou renomeá-los para X/Y com unidade/CRS. Regressão: entrada 4326/4674/31983, pontos e multipartes, reprojeção marcada/desmarcada.

## SEED-FUNCAO-001 e SEED-FLUXO-001 — definições instaladas incompatíveis com o contrato atual

**Severidade média. Estado FALHOU no banco recém-migrado.** Não extrapolar para os 13 modelos particulares vistos na instância original.

`funcao_fase2_normalizar_exportar` falha em validar/executar porque OP-26 não declara crs_saida, destino e nome_saida. `fluxo_fase2_favorabilidade`, que a referencia, é aprovado por `/validar`, mas falha na execução pela mesma causa. Evidências: `isolado-funcoes.json`, `isolado-fluxos.json`, `integracao-adicionais.json` e `modelos-cancelamento.json`.

Causas: definição seed desatualizada; validação do fluxo verifica a existência da função, sem validar recursivamente seu contrato. Proposta: alinhar seeds e validação recursiva com detecção de ciclos. Regressão: função inválida aninhada em fluxo, parâmetro obrigatório ausente, saída inexistente e referência circular. Os 32 erros de montagem de migrações estão registrados separadamente; estes achados dizem respeito às definições efetivamente instaladas e lidas.

## UI-FEEDBACK-001 — orientação fica invisível

**Severidade:** média. **Resultado:** FALHOU. **Método:** clique real, ambiente local autenticado, nenhuma camada.

Reprodução: abrir bancada; guia Dados; clicar Tabela de atributos com o painel de mensagens fechado. Esperado: orientar visivelmente a selecionar uma camada ou manter controle desabilitado com explicação. Observado: nenhuma tabela ou orientação visível; mensagem existe em `#gp-log`, porém `display: none`, altura 0. Não é handler ausente: o handler executa e a mensagem é inserida.

Evidências: `evidencias/UI-FEEDBACK-001.json` e `.png`; os vinte comandos sem camada estão em `sem-camada-ui.json`, mas a verificação explícita de estilo foi realizada para Tabela de atributos. Causa confirmada: `bancada-feedback-local.js`, função `registrar`, abre o log apenas para error/warning; `geoprocessamento-ribbon.js`/`geoprocessamento-commands.js` enviam orientações como info. Correção proposta: feedback local visível sem reativar modais globais. Regressão: repetir cada comando sem pré-condição, log aberto/fechado, garantir mensagem visível uma vez.

## NUM-001 — limiar transforma NoData finito em classe válida

**Severidade:** alta, resultado raster incorreto. **Resultado:** FALHOU na sonda complementar, fluxo UI/backend completo pendente.

Pré-condição: raster 3×3 com centro -9999 e metadado nodata=-9999. Executar corpo original de `GeoprocessamentoEngine.threshold_raster` com limiar=5. Esperado: centro permanece ausente. Observado: centro=0. Causa confirmada no método: `np.isfinite(-9999)` é verdadeiro; apenas NaN/Inf são repostos como NaN. Leitura persistida em `GeoespacialService.obter_raster_dados` usa `dataset.read(1)` sem máscara, portanto existe caminho real que conserva a sentinela; sua integração ainda não foi executada.

Evidência: `sondas-numericas.json`, NUM-001. Correção proposta: normalizar máscaras/sentinelas no ingresso e manter máscara nas operações e serialização. Regressão: sentinela negativa, zero, NaN, máscara .msk, ausência total e valores válidos negativos.

## NUM-002 — inversão usa sentinela como mínimo e fabrica valor válido

**Severidade:** alta. **Resultado:** FALHOU na sonda complementar.

Mesmo raster. Esperado: mínimo válido=1, máximo=9, pixel 1 vira 9 e centro segue NoData. Observado: pixel 1 vira -9991 e centro vira 9. Causa confirmada: `invert_raster` calcula mínimo sobre valores finitos, incluindo -9999. Evidência NUM-002. Correção e validação: máscara coerente antes dos extremos; medir todos os pixels e reabrir GeoTIFF após persistência isolada.

## NUM-004 — soma perde a semântica de NoData

**Severidade:** alta. **Resultado:** FALHOU na sonda complementar.

Somar duas cópias da mesma grade. Esperado: centro continua NoData. Observado: -19998, enquanto o perfil mantém nodata=-9999. O centro passa a ser interpretável como valor válido. Causa confirmada em `GeoespacialService.combinar_rasters`: soma direta das matrizes sem máscara. O caso de grade desalinhada foi recusado corretamente em NUM-003; esse sucesso não aprova os demais cenários. Regressão: NoData em apenas uma entrada, pesos, soma, multiplicação, máscara de saída e reabertura.

## NUM-005 — fallback de seleção pode processar a camada inteira

**Severidade:** alta, escopo incorreto de processamento. **Resultado:** FALHOU na sonda complementar; alcance pela interface ainda não demonstrado.

Entrada: duas feições, sem coluna de identidade entre as reconhecidas pelo método. Seleção declara chave inexistente e atributos com apenas campo inexistente. Esperado: rejeição de correspondência inválida. Observado: duas feições selecionadas, isto é, camada inteira. Causa confirmada em `_apply_selection_scope`: comparação filtra chaves desconhecidas; `all([])` resulta verdadeiro. Evidência NUM-005. Correção proposta: exigir pelo menos uma chave de comparação válida e identidade inequívoca; recusar fallback ambíguo. Regressão: chaves fora da fonte, atributos iguais, nulos, seleções após ordenação e FID de tiles.

## CONTRATO-001 — interface oferece graus para operações que recusam graus

**Severidade:** média. **Situação:** divergência de contrato confirmada por UI e código, execução integrada NÃO TESTADA.

Formulários OP-04 e OP-10 apresentam unidade metros/graus. `criar_buffer` e `_distance_crs` recusam qualquer unidade diferente de metros, declarando EPSG:5880. Não alegar que o clique Executar foi testado: nem executar um job inválido no ambiente compartilhado é neutro, pois a criação registra a execução no banco. Proposta: alinhar opções oferecidas ao contrato ou implementar a unidade com semântica documentada. Regressão: cada opção visível deve ser válida ou explicada antes do envio.

## AMBIENTE-001 — “memoria” não isola escrita

**Severidade:** alta para a segurança dos testes; não classificado automaticamente como defeito de produto.

`GeoprocessamentoJobs.create` chama `ciclo.iniciar` antes de executar. `registrar_camada`/`registrar_raster` persistem no repositório; o destino memoria é rotulado posteriormente como temporário registrado. `saidas_storage` usa SFTPGo remoto. A configuração em disco aponta para o banco remoto e storage da VM. Portanto selecionar memoria não satisfaz o requisito de ambiente descartável. Não foram submetidos jobs nesse ambiente. Pendente: executar todos os fluxos de escrita em instância com banco/storage realmente isolados.

Não há evidência de perda de registros oficiais. A perda foi reproduzida exclusivamente na cópia sintética isolada. Nenhum achado de sonda complementar é apresentado como execução completa pela interface.

### Atualizações das sondas iniciais

- NUM-001/002/004: falha sob sentinela finita nos métodos isolados; no importador novo, os GeoTIFFs reais preservaram oito células válidas, NoData e valores esperados. `oraculos.json` e `saidas-verificadas.json` documentam o resultado favorável. Falta provar o percurso legado com sentinela finita; não classificar essas três sondas como defeito geral do fluxo novo.
- NUM-005: a API real OP-28 com chave e atributos inexistentes concluiu gerando duas feições; com índice válido de P305 gerou uma. Evidência `integracao-adicionais.json`. Alcance pelo caminho normal de seleção da UI continua pendente.
- CONTRATO-001: OP-04 com graus retornou job em erro, “Buffers usam metros em EPSG:5880.” Divergência agora também reproduzida na API real. OP-10 permanece verificado por UI/código.
- AMBIENTE-001: isolamento resolvido para os testes posteriores. Mesmo destino memoria gerou arquivos no SFTPGo AUDIT; não houve jobs de escrita no serviço original 8083 ou em produção.

## Retomada de correções — 16/10/2026

Esta atualização não altera as evidências nem os totais históricos. As verificações
abaixo usam arquivos sintéticos e repositórios simulados; não equivalem à repetição
da auditoria por interface contra banco e storage reais.

| Achado | Estado nesta retomada | Evidência e limites |
|---|---|---|
| DATA-MULTICAMADA-003 | Preservação já implementada; regressão ampliada e gravação coordenada com validação do repositório | Edição de pontos preserva linhas, polígonos, multipartes e tabela auxiliar. Falha de escrita mantém o arquivo e limpa temporários. Recusa do banco antes do callback de gravação mantém arquivo e cache. Falha de commit após trocar o arquivo e concorrência entre processos ainda não estão aprovadas. |
| DATA-MULTICAMADA-002 | Correção existente confirmada por teste focal | Leitura sem cache identifica a subcamada por metadados. Reinício com catálogo real continua pendente. |
| UI-MULTICAMADA-001 | Contrato de abertura corrigido no código atual e exercitado no leitor | O leitor original abre quatro subcamadas por nome, com contagens esperadas. O percurso completo pelo catálogo, mapa e tabela ainda precisa de execução real pela interface. |
| GEO-SELECAO-001 | Subconjunto da origem confirmado e identidade posicional endurecida | Múltiplas correspondências não duplicam feições nem acrescentam campos. Índices repetidos na origem não selecionam feições extras; inversão mantém o complemento correto. |
| IMPORT-INTEIRO-001 | Correção existente confirmada e cobertura ampliada | UInt8, UInt16, Int16, Int32 e Float32, com/sem recorte; máscara de arquivo e rejeição de raster sem células válidas. |
| IMPORT-COORD-001 | Correção existente confirmada parcialmente | Coordenadas UTM convertidas para latitude/longitude geográficas sem alterar o CRS da camada. Os demais CRS e multipartes do plano original não estão integralmente cobertos nesta rodada. |
| NUM-001/002/004 | Corrigida a causa no ingresso raster legado | Leituras frias respeitam máscara; cache e registro normalizam sentinelas e valores não finitos para NaN. Limiar, inversão e soma preservam valores e ausência após serializar e reabrir GeoTIFF. |
| NUM-005 | Regressão original aprovada; seleção ambígua/parcial passa a ser recusada | IDs ausentes, identidades repetidas e correspondência não inequívoca por atributos geram erro antes do processamento. Não significa aprovação de todos os percursos de seleção da interface. |
| SEED-FUNCAO-001 / SEED-FLUXO-001 | Contrato do seed corrigido e validação recursiva implementada | Campos de saída de OP-26 alinhados ao contrato; funções aninhadas inválidas, referências circulares entre funções e ciclos no diagrama são recusados. Migração 136 atualiza somente os parâmetros originais conhecidos, preservando personalizações; não foi aplicada em banco nesta rodada. |
| CONTRATO-001 | Correção já presente na interface | OP-04 e OP-10 oferecem somente metros. Jobs reais pelos formulários permanecem pendentes. |
| UI-FEEDBACK-001 | Visibilidade e feedback local confirmados em testes focados | Uma mensagem por chamada em quatro níveis; navegador verifica progresso, etapas, mensagens sequenciadas, estados finais, confirmação e cancelamento. Não cobre os vinte comandos reais da auditoria original. |
| Custo acumulado negativo | Proteção adicionada antes do cálculo | Custos negativos e origem NoData são recusados; barreiras e células inalcançáveis permanecem ausentes. Grade válida pode ser executada depois de uma falha. |

### Validação executada

- Integração VS Code Testing: primeira execução com 11 aprovações e 3 falhas
  relacionadas à configuração de storage nos testes. Após a ampliação, retornou
  zero testes executados; a descoberta aponta para `tests` e o interpretador
  selecionado é `.venv\Scripts\python.exe`.
- Alternativa: `.venv\Scripts\python.exe -m pytest
  tests\test_regressoes_auditoria_bancada.py tests\test_bancada_raster.py
  tests\test_edicao_arquivo_repository.py -q --tb=short -p no:cacheprovider`.
  Resultado: **43 aprovados**. A fixture da regressão simula a montagem de storage
  somente no teste e bloqueia conexões PostgreSQL; a política de produção não foi
  flexibilizada.
- `node tests\browser\bancada-feedback-auditoria-unit.cjs`: aprovado.
- `node tests\browser\bancada-camadas-feedback-local.cjs`: aprovado no Edge headless.
- Pylance: assinatura de `validate_steps` compatível com os quatro pontos de
  chamada resolvidos; checagem sintática sem erros nos arquivos Python alterados
  de roteamento e motor. Permanecem diagnósticos de tipos preexistentes fora das
  correções, portanto não se declara análise estática integral sem erros.

### Pendências que impedem fechar a auditoria

O comando `docker info --format '{{.ServerVersion}}'` falhou porque o endpoint
`dockerDesktopLinuxEngine` não estava disponível. O laboratório documentado em
[ARTEFATOS.md](ARTEFATOS.md) usa esse Docker; seus contêineres não foram iniciados
nem alterados nesta rodada. Não se usou o ambiente oficial como substituto.

1. Aplicar e verificar a migração em banco isolado e repetir os modelos por API.
2. Testar falha de commit após publicação de arquivo, edições simultâneas entre
   processos, falhas de storage, uploads interrompidos e limpeza de órfãos.
3. Completar os cenários de máscaras, operadores raster, CRS e seleção do plano
   original, incluindo reabertura em outro processo.
4. Validar as duas bancadas de ponta a ponta: autenticação, perfis, execução,
   cancelamento confirmado no servidor, edição, exportação e reabertura.
5. Executar a regressão completa com infraestrutura disponível e atualizar a
   matriz de cenários com evidências por caso. Os 43 testes focados não autorizam
   deploy nem aprovação do sistema inteiro.

Não houve commit, deploy, migração aplicada ou escrita em dados oficiais.
A correção do seed trata somente do contrato técnico de exportação; não altera
o método de hierarquização ou seus critérios.
Os relatórios desta pasta são ignorados pela configuração Git atual; as
atualizações existem no workspace, mas não entram automaticamente no próximo commit.

### Complemento — migração 136 aplicada ao banco oficial

Em 16/10/2026, após autorização expressa do usuário, foi confirmada a conexão
TLS verificada ao banco oficial `slt_db`. A consulta prévia encontrou o ID exato
`funcao_fase2_normalizar_exportar` com os parâmetros antigos previstos no filtro
da migração. Não foram executados jobs de teste no ambiente oficial.

O aplicador `scripts/apply-database.ps1` foi corrigido para reconhecer a migração
136 e utilizar `SLT_DATABASE_URL` quando configurada, sem depender de Docker
local. A execução direcionada de `-OnlyMigration
136_corrigir_contrato_exportacao_seed.sql` concluiu com sucesso.

Verificações posteriores, em nova conexão:

- Parâmetros persistidos: `raster_id=$raster_id`,
  `nome_saida=favorabilidade_normalizada`, `crs_saida=entrada`, `destino=storage`
  e `formato_saida=GeoTIFF`.
- O fluxo `fluxo_fase2_favorabilidade` continua referenciando a função corrigida.
- Reaplicação: `BEGIN`, `UPDATE 0`, `COMMIT`. Todas as definições e datas de
  atualização de modelos permaneceram iguais antes/depois da reaplicação.
- Sintaxe do aplicador validada pelo parser PowerShell; não houve deploy.

Este complemento substitui as indicações anteriores de migração não aplicada.
Persistem as pendências de execução ponta a ponta e de regressão integrada;
a correção do registro no banco, entretanto, está aplicada e verificada.
O resultado também consta no README principal, rastreado pelo Git.

### Tentativa de publicação — 16/10/2026

A suíte completa foi solicitada pela integração Testing, que retornou zero
testes. A alternativa `.venv\Scripts\python.exe -m pytest tests -q --tb=short
-p no:cacheprovider` foi interrompida com **39 erros de coleta** em 2,81 segundos:
as variáveis `SICARD_STORAGE_WRITE_DIR` e `SICARD_STORAGE_TEMP_DIR` não estão
configuradas para uma montagem real neste processo Windows.
O banco oficial respondeu à consulta de disponibilidade. Os discos Windows
verificados são locais, não montagens do storage. O Docker está indisponível;
a credencial GitHub atual não permite consultar Codespaces. O WSL possui FUSE,
mas não possui o runtime de testes com pytest, psycopg e GeoPandas instalado.

Não se substituiu storage por pasta local nem se flexibilizou a política para
aprovar a coleta. O commit e a sincronização não representam autorização técnica
de deploy: a publicação permanece bloqueada até a suíte completa passar.

### Inicialização Windows sem montagem — 16/10/2026

Retirada a exigência de montagem durante a importação/inicialização do servidor:
validação de caminhos administrativos e da rota legada `/data` ocorre apenas
quando usada; o motor não resolve caminhos de definições graváveis na importação
sem configuração. Acesso remoto existente permanece pela API do storage.
Não se adicionou montagem, cópia local ou fallback para temporários locais.
Configuração parcial de montagem continua sendo recusada para evitar erros
silenciosos na VM. Operações nativas de arquivo ainda exigem execução na VM.

- Descoberta completa: sem erros de coleta.
- Regressão focada de inicialização, política e auditoria: 62 aprovados.
- Suíte completa executada: **1398 aprovados, 205 falhas, 4 erros, 17 ignorados**,
  além de 4 subtestes aprovados, em 329,79 segundos.
- Entre as causas, 103 ocorrências da exigência de temporários em storage
  nas operações de arquivo e 35 de camada não encontrada; não se declara que
  todas as falhas têm a mesma causa nem que a suíte está aprovada.
- A inicialização sem montagem está verificada; a compatibilidade de todos os
  testes e operações nativas com o acesso exclusivamente por API não está
  concluída. Deploy não executado com esta suíte vermelha.

### Fechamento da regressão de publicação — 16/10/2026

Esta seção substitui o estado de bloqueio das tentativas anteriores:

- Suíte completa: **1.617 aprovados, zero falhas, zero erros, 17 ignorados**,
  quatro subtestes aprovados e 19 avisos, em 205,48 segundos.
- Comando: `.venv\Scripts\python.exe -m pytest tests -q --tb=short -rs
  -p no:cacheprovider`. A integração Testing executou apenas parte da seleção
  focada e retornou zero testes ao solicitar a suíte completa; por isso foi
  utilizada a alternativa pelo interpretador `.venv`.
- Os 17 casos condicionais preexistentes são: 14 integrações opt-in de ciclo de
  vida com rollback, um snapshot municipal autorizado não fornecido e dois
  cenários que dependem de arquivos específicos não presentes neste ambiente.
  Não foram adicionados skips nem desativadas as verificações de storage.
- Ambos os scripts de feedback passaram novamente, incluindo execução no
  Edge headless, progresso, mensagens sequenciadas, conclusão, erro e cancelamento.
- A causa dominante das falhas anteriores era o isolamento incompleto dos
  testes: arquivos sintéticos eram procurados no storage real ou no caminho
  lógico antigo. Os testes pertinentes agora solicitam uma fixture opt-in,
  com descarte dos dados sintéticos ao final. A política de produção continua
  rejeitando pastas locais como montagem.
- A documentação de favorabilidade lê JSONs e mapas no storage existente,
  inclusive pela API no Windows. As pastas oficiais foram verificadas por
  leitura. Nenhuma montagem Windows nem migração geral de arquivos foi feita.
- A transação de edição preserva o erro original de arquivo/validação após
  rollback; somente erros PostgreSQL são convertidos em erro de banco.
  Indisponibilidade do storage retorna HTTP 503, sem resposta de sucesso.

A regressão libera a publicação pelo script oficial, condicionada à confirmação
de build, reinício, saúde e acesso público na VM. Permanecem os cenários
exaustivos e de concorrência entre processos do plano original; não se declara
que toda a matriz de auditoria foi homologada.
