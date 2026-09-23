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
