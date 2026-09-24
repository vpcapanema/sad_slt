# Auditoria da extração de atributos

Data: 23/09/2026. Página: `/sicard/restrict/geoespacial/extracao-atributos/`.

## Entrega esperada e contrato existente

A página deve selecionar camadas vetoriais do catálogo oficial, configurar entrada,
bases, categorias e algoritmo, executar no servidor, apresentar as saídas persistidas
e baixar o pacote correspondente à execução. A visualização usa longitude/latitude;
a medição usa EPSG:5880 e os GeoPackages de saída usam EPSG:4674.

| Modo | Backend entrega | Interface deve apresentar |
|---|---|---|
| Interseção | Sobreposições, atributos de entrada/base, medidas e percentuais sem dupla contagem no total único | Síntese por categoria/camada, estatísticas e tabela efetiva de saída |
| Identity | Interseções e parcelas exteriores preservadas na saída | A mesma análise, distinguindo o resultado geométrico do total efetivamente atingido |
| Enriquecimento | Entradas configuráveis, regras por base, camadas separadas por tipo, conferência, dicionário e finalidades | Entradas e regras editáveis, síntese/conferência, tabela por camada e dicionário separado |
| Pacote de sobreposição | GeoPackage, CSV, XLSX, PDF de processamento e PDF analítico | ZIP completo e links dos dois relatórios |
| Pacote de enriquecimento | GeoPackage, CSV/XLSX, dicionário, configuração e conferência; recortes por finalidade quando pedidos | ZIP e descrição correta, sem prometer PDFs que esse modo não gera |

A execução já era assíncrona e persistida. Consultar, recuperar e baixar exige sessão;
consulta de uma execução respeita seu responsável ou perfil elevado. Uma falha de
rede no navegador não significa cancelamento do trabalho no servidor.

## Problemas encontrados e corrigidos

| Problema observado no código/contrato | Correção |
|---|---|
| Backend oferece banco e storage; seletor oferecia apenas o storage | Grupo explícito para camadas cadastradas no banco; preview pelo ID exato usado no processamento |
| `input_id` limitado a 100 caracteres | Limite alinhado a 1200; o catálogo real tinha dois IDs maiores que 100 |
| Preview por arquivo podia resolver outra versão registrada | Camadas do banco são carregadas pelo ID escolhido, sem depender do arquivo original |
| Salvar ficava indisponível depois de confirmar as bases | Salva bases confirmadas e pendentes, com suas regras |
| Configuração não guardava algoritmo, opções e nome da saída | Formato v4 preserva esses parâmetros e lê formatos anteriores |
| Carregar misturava a configuração salva com bases/regras atuais | Restauração integral, com confirmação de substituição da configuração em tela; não apaga dados do banco |
| Adicionar/editar entradas e finalidades não atualizava todo o estado | Atualização das listas, mapa, campos e resumo; entradas adicionais seguem no pedido |
| Campos eram inferidos somente da primeira feição | Seleção considera esquema completo e campos presentes nas feições |
| Alterar regras/opções/nome/entradas deixava resultado antigo exportável | Alterações invalidam o resultado exibido e exigem nova execução; resultado persistido continua recuperável |
| Remoção de entrada adicional no mapa não era refletida na execução | Reconciliação das entradas adicionais; falha de montagem não é confundida com remoção deliberada |
| Enriquecimento mostrava dicionário no lugar da tabela efetiva | Nova rota autenticada de tabela paginada das saídas da execução, com seletor de camada, navegação e tentativa novamente |
| Estatísticas e descrição de PDFs confundiam os modos | Abas e descrição específicas; PDFs disponíveis no modo de sobreposição |
| Resposta HTML de erro gerava erro de JSON; polling falhava na primeira interrupção | Mensagens para sessão/perfil/validação, tratamento de 204, timeout e repetição limitada de falhas transitórias |
| Atualização do catálogo reaproveitava geometrias antigas | Catálogo renovado não herda o cache anterior de geometrias |
| Controles/rótulos em telas estreitas podiam ficar cortados | Quebra das ações, ajuste de rótulos e editor de regras em uma coluna |

## Evidências de validação

- A URL pública respondeu e redirecionou o navegador sem sessão ao login, como esperado.
- Catálogo consultado na VM: 7 categorias e 140 camadas; 2 identificadores acima do limite antigo.
- Motor e pacotes: 31 testes passaram em `test_extracao_atributos.py` e
  `test_extracao_enriquecimento.py`, incluindo geometria, medidas, regras, GeoPackage,
  CSV/XLSX, PDFs, verificações dos arquivos do ZIP e proteção contra fórmulas em planilhas.
- Contratos/regras/configurações: 27 testes passaram em `test_extracao_contratos.py`,
  `test_extracao_regras.py` e `test_configuracao_bancada.py`. As configurações desses
  testes são gravadas em diretórios temporários. A leitura do catálogo usa o banco/storage reais.
- Nova leitura paginada conferida contra cinco extrações já persistidas: uma com
  84 registros e 305 campos, e quatro com 209 registros e 41 campos.
- Chromium: página e iframe real da bancada carregaram sem erros JavaScript.
  O teste `tests/browser/extracao-atributos.cjs` passou por seleção no banco, exclusão
  de camadas já escolhidas, confirmação de bases, entradas adicionais, salvar/carregar,
  payload, tabela com duas páginas, abas, download, invalidação, erro de sessão e
  reconexão após HTTP 503. Verificou ausência de transbordamento da página a 390 px.
- O teste de navegador intercepta as APIs com dados controlados. Ele verifica a integração
  da interface com o contrato, sem gravar uma extração no banco de produção. A geração
  dos arquivos é verificada separadamente nos testes do motor.

Execução do teste de navegador, com Playwright/Chromium instalados e aplicação local:

```sh
SICARD_TEST_URL=http://127.0.0.1:8081 node tests/browser/extracao-atributos.cjs
```

## Limites da verificação e homologação final

Não foi executada uma nova extração autenticada no ambiente público com um caso de
negócio indicado pelo usuário. Foi solicitado o conjunto de entrada/bases e resultado
esperado. Para fechar a homologação desse caso: executar pela página com sessão real,
conferir os campos/medidas com o resultado esperado, recuperar a execução e abrir seu ZIP.

Os resultados acima não certificam todos os arquivos, volumes, navegadores ou regras
possíveis. Arquivos sem CRS, campos inexistentes, geometrias inadequadas e falta de
permissão continuam sendo recusados. Camadas grandes continuam sendo carregadas
integralmente: esta correção não introduz simplificação nem amostragem silenciosa.

Configurações legadas não contêm algoritmo/opções que nunca foram gravados; é necessário
conferir esses parâmetros ao reutilizá-las. A tabela é paginada por registros; camadas
com muitos campos exigem rolagem horizontal dentro da tabela.

## Ajuste de navegação para o gerador municipal

O acesso ao plugin estava oculto até escolher uma categoria e usava apenas um
ícone de cidade. Agora **Gerar camada de municípios** permanece visível em
**1.2 · Camadas base**, com descrição e destaque. Sem categoria selecionada,
um diálogo permite escolher o destino antes de abrir o componente existente.
A camada produzida entra na lista pendente e segue o mesmo botão **Confirmar bases**
das outras camadas. O banco continua registrando a procedência; as feições municipais
são lidas do arquivo materializado também ao reabrir a camada pelo ID.

Selecionar e enviar camadas têm rótulos visíveis. Cadastrar categoria fica junto ao
seletor de categoria; salvar/carregar configuração ficam no início da configuração
geral; recuperar análise e consultar o histórico ficam em Resultados.

Verificação: teste Chromium passou a conferir a visibilidade do acesso antes de
escolher categoria, em 390 e 1440 px, e a abertura do componente React real com
o destino correto (API interceptada no teste). Sete testes de contratos passaram,
incluindo a leitura de uma camada municipal cujo registro não contém feições no banco.

## Ferramenta em página independente

A ferramenta agora possui a rota `/restrict/geoespacial/gerador-camadas-territoriais/`.
O card navega para essa página na mesma aba. A categoria é escolhida na própria
página, e o componente React é montado diretamente no conteúdo, sem modal ou iframe.
O título aprovado, a autenticação e as APIs do gerador foram preservados.

O link **Voltar à extração** restaura o rascunho da análise; **Usar na extração** também
acrescenta a camada gerada à lista para confirmação. Somente referências e opções
são guardadas no sessionStorage da aba, sem geometrias. A página permite baixar o
ZIP retornado pela geração. Os setores censitários permanecem uma funcionalidade futura.

Validação: builds da demonstração, biblioteca e adaptador SICARD concluídos; rota
independente retornou 200 com autenticação declarada. Chromium verificou navegação
real entre páginas, ausência de modal/iframe, layouts de 390 e 1440 px, preservação
do rascunho e retorno da camada gerada (respostas da API controladas no teste).
Não foi gerada uma nova camada no banco de produção para esta mudança de interface.


## Revisão conjunta da extração e da página territorial — 23/09/2026

Correções desta revisão:

- Links de ação principal com texto branco; campos de saída em linhas próprias e
  sem limite artificial de 230px; botões com altura flexível e exportações com quebra.
- Navegação do módulo sem recorte dos menus no celular; acesso à página territorial
  também no menu Geradores.
- Nomes completos dos indicadores e da seleção com quebra de linha, filtros com
  colunas que encolhem, ações e paginação adaptadas a 320px; listas pequenas deixam
  de reservar uma área vazia de altura fixa.
- Removidos o segundo `h1` e o `main` aninhado do componente integrado. As tabelas
  React não são mais reordenadas pelo manipulador global de DOM.
- Catálogo e prévia municipal oferecem tentativa novamente; metadados descritivos
  inválidos não derrubam a página; respostas de prévias canceladas são ignoradas.
- Categoria pode ser trocada preservando atributos, formato e nome; resultado
  identifica a categoria de sua geração. Retorno à extração fica desabilitado
  durante a geração.
- Campos condicionais dos diálogos respeitam `hidden` fora do elemento principal;
  checkboxes e textos extensos de regras não estouram a largura do diálogo.
- Erro de uma consulta antiga da tabela não apaga uma consulta mais recente. Filtros
  de categoria/base ficam ocultos onde não se aplicam (tabela de saída e enriquecimento).
- Bloqueio do sessionStorage deixa de interromper o acompanhamento de uma execução
  já iniciada; o histórico continua sendo o caminho de recuperação.
- Configurações passam a preservar também as referências municipais. Escrita
  temporária e substituição atômica protegem a configuração anterior contra falhas.

### Destinos confirmados na VM

| Objeto | Persistência |
|---|---|
| Camada municipal e auxiliares | `/opt/sicard/data/geoespacial/uploads/datastorage/vetor/municipios_sp_<id_curto>_<nome>/`, montado em `/app/data/geoespacial/uploads` |
| Cadastro municipal | `geoprocessamento.camada_importada`: caminho relativo, manifesto, componentes e hashes; sem duplicar feições |
| Saída da extração | Geometrias no PostgreSQL; ZIP, relatório, procedência e etapas em `geoprocessamento.extracao_atributos` |
| Configurações da extração | `/opt/sicard/data/geoespacial/configuracoes/extracao-atributos/*.json`, volume persistente do contêiner |
| Outras saídas de geoprocessos | `data/geoespacial/outputs`, conforme `geo_output_path`; leituras legadas preservadas |

Os dois contratos específicos acima já constavam na documentação dos módulos.
O comentário de `path_policy.py` foi esclarecido; não houve migração nem mudança
silenciosa de destino dos arquivos existentes. Download também grava uma cópia no
destino escolhido pelo navegador do usuário.

### Verificações reais e limites

- Catálogo oficial: 6.375 atributos municipais.
- Três exportações em temporários da VM, reabertas: FGB/GPKG/SHP, 645 municípios,
  EPSG:4674, PIB 2022, IPDM 2022 e IDHM 2010. Geometrias comparadas por código
  municipal e valores comparados com tolerância numérica, preservando nulos.
- Os dois pacotes de extração mais recentes tiveram SHA-256 e integridade ZIP
  conferidos contra o banco.
- Teste de navegador territorial passou com catálogo controlado e com os 6.375
  metadados reais em 320, 390, 768, 1024 e 1440px, sem erros JS ou assets faltantes.
  Prévia/escrita interceptadas: não é uma geração autenticada na UI pública.
- Teste de extração ampliado com contraste dos links, 320px e editor condicional
  de regras, mantendo seleção, mapa, geração, retorno, tabela, exportação e recuperação.

### Recuperação do acervo e fechamento dos testes

A conferência física encontrou duas referências cujas pastas não estavam na VM:
`municipios_sp_ba1598e7_censo_2022_pib` (6.161 atributos) e
`municipal_c7c4c2d1-7c8d-4094-a58d-27ca073288c9` (6.159 atributos).
Os dois FGB foram reconstruídos em temporários no Codespace consultando o banco
oficial, porque a proteção de memória da VM recusou a seleção integral naquele
momento (829 MB estimados, 413 MB disponíveis). Ambos tiveram SHA-256 idêntico ao
original antes de serem transferidos. CSV, QML e JSON foram reconstruídos usando
os manifestos originais; QML/JSON preservaram as quebras de linha Windows.
Todos os oito arquivos restaurados conferiram com os hashes já registrados.
Não houve alteração dos IDs, manifestos, hashes no banco, geometria ou valores.
Arquivos existentes não foram sobrescritos. Os limites de memória permanecem
ativos: uma seleção pode exigir menos atributos ou mais capacidade disponível.

Fechamento: 62 testes Python aprovados (31 motor/pacotes, 17 regras, 4 configurações,
10 contratos). A primeira execução dos testes dependentes do catálogo falhou por
falta do túnel; os 21 testes de regras/configurações passaram após restabelecê-lo.
Três builds do plugin concluídos. Sintaxe de 31 arquivos JS e 10 folhas CSS
verificada integralmente; testes Chromium não registraram erros JS. A bancada
embutida agora recolhe os painéis em telas pequenas e o mapa cabe na largura do
iframe; os controles permitem reabrir cada painel.

A página territorial consulta uma rota própria de categorias, evitando inventariar
todas as camadas do storage apenas para iniciar o gerador.

## 24/09/2026 — contratos de enriquecimento separados

Por orientação do usuário, mantido o algoritmo configurável que permite recorte
e duplicação. Adicionado o algoritmo `estatisticas` (enriquecimento sem recorte),
com classificação binária por interseção nas categorias Risco e Restrição e nove
medidas selecionáveis por base/campo nas demais categorias. Os dois editores
coexistem e a configuração identifica o algoritmo escolhido.

A validação cobre valores esperados das nove medidas, nulos/zeros, textos,
empates, feições multipartes, toque na borda, bases vazias, geometrias inválidas
ou vazias, preservação de WKB, reabertura de GeoPackage/XLSX, regras persistidas,
contratos de API e execução do serviço nos dois modos. O teste de navegador usa
HTML/JS reais e APIs interceptadas: alternância dos editores, nove opções,
medida personalizada por campo, salvar/carregar e payload de execução. Não
representa uma execução autenticada de usuário em produção.

Validação local final: **73 testes Python passaram**, incluindo regressões de
leitura de camadas e CRS, além do teste Playwright atualizado para os dois
fluxos e verificação sintática dos JavaScripts alterados. Os testes de leitura
exigiram restaurar o túnel autorizado ao banco; passaram após a restauração.
