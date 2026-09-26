# Auditoria dos fluxos da bancada — 26/09/2026

Especialista reutilizável: `skills/auditar-bancada/SKILL.md` (`$auditar-bancada`). A auditoria compara comportamento com o ArcGIS Pro e conserva os contratos próprios do SICARD: edição no original do storage, revisão de arquivo e feedback independente da página hospedeira.

## Referência e critério

[Definition queries](https://doc.esri.com/en/arcgis-pro/latest/help/mapping/layer-properties/definition-query.html) orienta o escopo comum do mapa/tabela/ferramentas; [seleções e filtros no geoprocessamento](https://doc.esri.com/en/arcgis-pro/latest/tool-reference/appendices/filtered-inputs-for-geoprocessing.html) orienta a interseção de escopos. [Calculate Field](https://pro.arcgis.com/en/pro-app/latest/tool-reference/data-management/calculate-field.htm), [Pop-ups](https://pro.arcgis.com/en/pro-app/latest/help/mapping/navigation/pop-ups.htm) e [execução de modelos](https://doc.esri.com/en/arcgis-pro/latest/help/analysis/geoprocessing/modelbuilder/run-a-model.html) fundamentam os respectivos fluxos. Não se exige equivalência visual, sintaxe SQL nem suporte a todas as capacidades desktop.

## Defeitos corrigidos nesta rodada

| Fluxo | Defeito observado | Correção e evidência |
|---|---|---|
| Explorar / Selecionar | Identificar alterava seleção e abria tabela | Explorar preserva seleção; teste de clique, Shift e troca da ferramenta |
| Selecionar por atributo | Substituía seleção de outras camadas | Alteração restrita à camada ativa |
| Filtrar camada | Filtro alterava apenas desenho | Filtro compartilhado por tabela, seleção e parâmetros de processamento; backend limita entradas sem alterar originais |
| Tabela com filtro | Risco de confundir subconjunto visível com conteúdo integral | Grade mantém registros completos para salvar; operações de seleção respeitam filtro; teste preserva feição oculta |
| Consulta e tabela | Serializações produziam identificadores incompatíveis | Consulta preserva índice usado pela tabela |
| Calcular campo | Ignorava seleção; arquivo storage seguia rota de catálogo | Escopo explícito seleção ∩ filtro, confirmação, rota de arquivo e gravação original com revisão |
| Calcular com edição pendente | Cálculo podia coexistir com rascunho antigo | Guarda exige salvar ou descartar edição pendente |
| Salvar modelo | Primeira edição não habilitava Salvar | Dirty atualizado antes da ribbon |
| Validar modelo | Erro mantinha validação anterior | Validade revogada antes de nova validação |
| Operações do modelador | Edição/fechamento concorrente podia perder alterações | Guarda busy e confirmação sem duplo envio |
| Reabrir modelo | Destino/CRS/formato visuais divergiam dos salvos | Controles restauram parâmetros persistidos |
| Editar / Validar / Executar definição | Três botões abriam biblioteca indistinta | Biblioteca orienta seleção com ação correspondente |
| Excluir definição | DELETE imediato | Confirmação local; cancelar não envia requisição |
| Importar arquivo | Inspeção atrasada de A substituía token de B | Respostas antigas descartadas; confirmação antes do envio; arquivo bloqueado durante upload |
| Atualizar fonte | GeoPackage podia abrir outra camada; cache antigo | Recarga pelo ID storage, invalidação da tabela e reaplicação do filtro |
| Processar seleção de arquivo | Exigia salvar camada separada | Processa seleção ∩ filtro diretamente, preservando FIDs e original |
| Histórico de arquivos | Execuções não apareciam | Sucesso/erro registrados junto às demais ferramentas |
| Resultado vetorial por ID | Resultado não aparecia no mapa | Atualização das camadas e desenho do resultado |
| Ambientes | Sobrescrever saídas era opção sem efeito | Removida opção sem contrato implementado |
| Camada ativa | Ribbon dependia de elemento DOM eventualmente obsoleto | Usa estado canônico da camada |

Removido também handler legado de `saida` da toolbox. Os formulários atuais usam `nome_saida`; a remoção é limpeza de código morto, não correção comprovada de perda de nome.

## Inventário e cobertura

| Família / controles | Implementação | Cobertura nesta rodada |
|---|---|---|
| Ferramentas, buscar toolbox, abrir formulário, executar | `geoprocessamento.js`, toolbox, engine/jobs | 43 formulários reais no Chromium; algoritmos com fixtures vetoriais/raster, HTTP e jobs isolados |
| Importar arquivo / WFS / storage, navegar, confirmar carga | main, ribbon, `bancada-arquivos.js` | Navegação storage sintética e formulários; serviços WFS externos não ensaiados |
| Explorar, selecionar, Shift, limpar, zoom seleção | commands | Cliques reais simulados; seleção validada pelo estado |
| Filtrar, selecionar por expressão, limpar filtro | commands, atributos, engine | Subconjunto, vazio, inverter, preservar outra seleção, payload e resultado real do backend |
| Tabela: nulos/não nulos, inverter, somente selecionados, editar, excluir, salvar, descartar | atributos, arquivos | UI sintética; gravação GeoPackage temporário; repetição de salvamento e revisão obsoleta |
| Cálculo de campo | commands, arquivos, `calculo_campo.py` | Seleção ∩ filtro, campo novo, escopo vazio/obsoleto, revisão, original multicamada preservado |
| Modelo: criar, editar, salvar, validar, executar, fechar | modeler | Payload, saída, alterações concorrentes, falha de validação, recusa de confirmação |
| Biblioteca: editar, validar, executar, excluir função/fluxo | main/ribbon | Seis intenções e confirmação de exclusão |
| Importar/exportar/duplicar definição | commands | Roteamento lido; não comprovada compatibilidade com JSON externo arbitrário |
| Cancelar | main/jobs/arquivos | Backend aceita antes do algoritmo; após início informa que não há interrupção segura |
| Histórico / ambientes / atualizar fonte | main/commands/arquivos | Auditoria de contrato e regressões específicas nesta rodada |
| Catálogo: árvore, busca, grupos, favoritos, serviços | actions | Roteamento lido; catálogo externo completo não ensaiado |
| Conteúdo: visibilidade, grupos, remover, propriedades | actions/main | Roteamento identificado; nem toda combinação de CRS, geometria e estado foi executada |
| Basemap, simbologia, docks, CSV, exportações vetor/raster | módulos correspondentes | Testes existentes e revisão de contratos; renderização com provedores externos não certificada |
| Homologar/publicar | ribbon/backend | Fluxo próprio SICARD; não publicar dados reais para testar |

Inventário não significa cobertura integral. As evidências desta rodada são testes isolados; não foi feita edição de arquivos reais do usuário em produção. Cancelamento do algoritmo já iniciado, WFS externos, catálogo remoto completo e todas as combinações de formatos/geometrias continuam exigindo ensaios específicos.

## Executar regressões

Python: `tests/test_bancada_operacoes_isoladas.py`, `tests/test_bancada_arquivos.py`, `tests/test_edicao_storage.py`, `tests/test_calculo_campo_escopo.py`, com banco desabilitado e persistência substituída por fixtures.

Chromium: `tests/browser/bancada-controles.cjs`, `bancada-explorar-selecao.cjs`, `bancada-modelador-auditoria.cjs`, `bancada-filtro-camada-auditoria.cjs`, `bancada-importacao-refresh.cjs`. Os testes servem template e scripts reais com APIs interceptadas.
