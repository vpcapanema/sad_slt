# Cobertura e ponto de retomada

## Escopo de encerramento operacional — 16/10/2026

**Resultado final:** 1.671 aprovados, zero falhas, três ignorados por dados
ausentes e quatro subtestes aprovados. Os casos opt-in de banco e E2E foram
executados, não ignorados. O aceite operacional acordado está concluído.

Por decisão expressa, a matriz exaustiva e integrações externas não são condição
para este aceite. A bancada é um componente único, incorporado pela extração.
A ponte real de reabertura, visibilidade e remoção foi verificada no Edge.
Os fluxos de composição, IndexedDB, configuração, invalidação de resultado e
finalidades passaram no script de extração com serviços simulados.

Foram reproduzidas e corrigidas gravações concorrentes do original.
Testes com dois editores verificam preservação do primeiro conteúdo, recusa
da segunda gravação e ausência de temporários residuais. Quatro casos com
PostgreSQL e processos separados verificam recusa de bloqueio de edição e
destino e recuperação após liberação normal ou encerramento abrupto.
Esses casos não enviam arquivos nem confirmam mutações no catálogo.

Falhas injetadas de upload e catálogo verificam limpeza e execução seguinte
bem-sucedida. Não houve desligamento do banco/storage de produção.
Não se promete retomada automática de jobs interrompidos, nem proteção
contra escritores externos que não respeitem o bloqueio do SICARD.
Esses limites e login por senha permanecem fora da evidência deste fechamento,
sem converter os cenários históricos não executados em aprovações.

As seções seguintes registram o estado anterior a este complemento.

## Estado no fechamento da rodada — 16/10/2026

A matriz e as tabelas seguintes são evidências históricas de 15/10; não foram
recalculadas nem tiveram cenários não executados convertidos em aprovação.
A regressão posterior terminou com **1.664 testes aprovados, três ignorados e
quatro subtestes aprovados**, incluindo 14 integrações de banco com rollback
e um novo E2E de navegador/API/processamento/storage reais.

O novo E2E cobre OP-03 na bancada autônoma, entrada vetorial sintética,
explorador de destino, GeoPackage, recarga da página, reabertura e
reprocessamento com GeoJSON. Os valores de atributos e o CRS são conferidos
fora do navegador. A sessão é sintética e assinada; não cobre login por senha.
O Edge está disponível nesta retomada. O stack Docker isolado original não
está disponível; o E2E usa servidor de teste em loopback, pastas exclusivas no
storage existente e catálogo em transação revertida no banco configurado.

Falha de upload/registro, limpeza, conflito de revisão e disputa de destino
estão cobertos por regressões com falhas injetadas. Isso não comprova queda
real de infraestrutura, interrupção de processo ou concorrência distribuída.
As integrações de ciclo de vida incluem extração, mas não substituem o E2E
completo da interface da segunda bancada.

Permanecem sem homologação exaustiva: cada algoritmo em todos os parâmetros,
as duas interfaces completas, integrações externas, modelos particulares,
concorrência entre processos e recuperação após queda. Os três skips atuais
são dados externos ausentes, não integrações de banco desabilitadas.

## Registro histórico de cobertura

## Menu, painel e integração

| Área | Evidência obtida | Ainda falta |
|---|---|---|
| Mapa | 12 controles; comandos sem camada; importação aberta; explorador seleciona quatro entradas, carga falha | Zoom/pan/seleção/visibilidade/ordem com camada; todos os basemaps; remoção/exclusão UI |
| Editar | 12 controles inventariados | Geometria, desfazer/refazer, salvar/descartar, recarga e conflito na UI |
| Análise | 11 controles; quatro toolboxes; 43 formulários; cancelar sem job | Cada ferramenta por UI, inválidos, progresso, seleção e recuperação |
| Modelo | 11 controles; funções/fluxos abertos | Canvas, conexões, exclusão, duplicação, parâmetros, variáveis, iteradores e reabertura UI |
| Dados | 11 controles; comandos sem camada; falha de feedback; edição API | Tabela UI, filtros/ordenação/paginação, edição, persistência, valores ausentes |
| Exibir/docks | Menu observado; primeiras duas opções exercitadas | Demais docks: menu fecha em algumas transições; verificar cada restauração |
| Conteúdo/Catálogo | Basemaps listados; catálogo, raízes, seleção múltipla e carga | Favoritos, árvore, contextuais, arrastar, busca e controles condicionais |
| Propriedades/simbologia | Painel identificado | Escalas, rótulos, opacidade, categorias, classes e restauração |
| Mensagens/Histórico | Orientação escondida e mensagens de carga capturadas | Todos os erros/progressos, fechamento/reabertura e downloads |
| Extração de atributos | Iframe e scripts de salvar/restaurar identificados e examinados | Componente embutido real, comunicação host/iframe, entradas e saídas |
| Outras integrações | Rotas/dependências extraídas | WFS/STAC/OSM, banco externo, mapa/tiles e painéis consumidores |

## Toolboxes

| Toolbox | Inventariadas | Formulários abertos | API real | Execução UI + backend | Aprovadas integralmente |
|---|---:|---:|---:|---:|---:|
| SIRCADI Toolbox | 43 | 43 | 43 | 0 | 0 |
| Geospatial Toolbox | 28 | 28 | 28 | 0 | 0 |
| Numerical Analysis Toolbox | 13 | 13 | 13 | 0 | 0 |
| Surface Modeling Toolbox | 9 | 9 | 9 | 0 | 0 |
| Funções customizadas originais | 8 | 8 | 0 | 0 | 0 |
| Fluxos customizados originais | 5 | 5 | 0 | 0 | 0 |

As toolboxes nativas se sobrepõem; não somar as colunas como operações únicas. Os 43 algoritmos também recusaram submissões sem parâmetros obrigatórios. Isso não substitui valores inválidos de cada parâmetro. Dois seeds de função e dois de fluxo do banco novo foram testados separadamente; não representam os 13 modelos originais.

## Bloqueios atuais e limitações

- Autenticação resolvida; não pedir credenciais novamente.
- Edge desconectado: `cua.getState()` retornou `browsers: []` em duas verificações. Testes independentes prosseguiram pela API.
- Upload pela extensão recusado por ausência de acesso a URLs de arquivos; permissão não alterada. Preparação por HTTP real separada dos cliques.
- Banco novo parcialmente migrado: 32 erros registrados. AHP/hierarquização não têm ambiente equivalente validado. Erros de preparação não são automaticamente defeitos de produção.
- Fonte próprio ainda não integralmente lido; indexar 140 arquivos/54.786 linhas não equivale a leitura semântica. Inventário completo e deduplicado permanece pendente.
- Commit do backend publicado não comprovado; correspondência de 28 assets não prova equivalência de todo backend.

## Próximas ações

1. Retomar Edge quando disponível, mantendo localhost:18084 para escrita. Não executar mutações em 8083/produção.
2. Ler fontes pendentes, registrar controles condicionais, deduplicar inventário e rastrear cada handler/endpoint.
3. Testar UI com camada única: carregar, tabela, selecionar P305, editar P101, salvar/reabrir, descartar, ordenar/paginar e verificar identidade mapa/tabela. A cópia importada multicamada perdeu três camadas no teste de edição; a fixture original permanece intacta.
4. Executar cada formulário com backend real e referências conhecidas. A suíte HTTP não substitui os cliques.
5. Completar oráculos de distância, custo, densidade, interpolação, rasterização, bordas, filtros e reprojeção. Não comparar comprimento em EPSG:5880 cegamente aos 50 m cartesianos em EPSG:31983.
6. Copiar somente definições necessárias dos modelos originais para laboratório, mapear entradas sintéticas e testar entrada/saída, iteradores, falha parcial, cancelamento e reinício.
7. Testar integrações embutidas, estados responsivos, menus/docks/feedback e atualizar a matriz.

Checkpoint parcial conforme a regra de salvar progresso. Nenhum cenário não executado foi convertido em aprovação.
