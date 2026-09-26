# Validação da bancada de geoprocessamento

A rota `/restrict/geoespacial/bancada/` usa
`templates/componentes/_geoprocessamento.html`. A extração de atributos carrega
essa mesma interface em um iframe.

## Verificações automatizadas

- 43 ferramentas do catálogo: abertura do formulário, campos e envio HTTP no
  navegador; execução do motor, rota direta e fila de jobs com dados sintéticos.
- Pontos e polígonos vetoriais, reprojeção, sobreposição, buffers, estatísticas,
  rasterização e operações raster. As verificações numéricas incluem área,
  comprimento, amostragem, soma zonal, pontos nas bordas da grade, distância em
  metros, células sem dados e rejeição de grades incompatíveis.
- Funções e fluxos: criar, editar, consultar, validar, executar e excluir com
  repositório isolado. Resultados são incorporados ao mapa, inclusive saídas
  encadeadas; diagramas legados vazios são reconstruídos dos passos existentes.
- Filtro sobre fonte vetorial em tiles, restauração da fonte original, navegação
  pelas guias e abertura dos comandos da faixa de ferramentas.
- Arquivos: consulta com controle de revisão, identidade das feições, edição de
  atributos, desfazer/refazer, salvar nova versão e mistura de arquivo com camada
  do catálogo. Os originais dos testes permanecem intactos.
- Cancelamento no servidor durante preparação; recusa explícita depois do início
  do algoritmo, quando não existe interrupção segura. A interface aguarda o
  estado terminal do servidor.

## Correções principais

Campos opcionais vazios não são enviados; formatos em memória são enviados;
seletores separam vetor/raster; números decimais são aceitos; a classificação da
Fase 1 agora tem formulário. Ajustar às camadas usa as extensões reais. Resultados
não são excluídos quando a visualização falha. Diagnósticos, estatísticas e
exportações em memória podem ser consultados e baixados. Consultas a arquivos
passam pelo backend em vez de apenas abrirem a tabela.

## Reproduzir

```bash
/home/codespace/.venvs/sicard-app/bin/python -m pytest -q \
  tests/test_bancada_operacoes_isoladas.py \
  tests/test_bancada_arquivos.py tests/test_bancada_desempenho.py

# Requer Playwright/Chromium e bibliotecas do navegador disponíveis no ambiente.
node tests/browser/bancada-controles.cjs
```

Os testes de navegador interceptam a API; os testes Python executam serviços e
rotas reais substituindo a persistência por memória e arquivos temporários.
Não gravam no banco oficial. Essa cobertura não equivale a testar todas as
combinações de geometria/parâmetros, a persistência de produção, a homologação
real, ou a disponibilidade de provedores externos WFS, WMS, STAC e mapas-base.

## Tabela de atributos com Tabulator

A interface única usa Tabulator 6.3.1 (MIT, arquivos locais em `assets/vendor/tabulator`).
A estrutura e os controles ficam no template HTML; o adaptador conecta dados, seleção
no mapa e persistência. Inclui maximizar/restaurar (Escape), controles por ícones com dicas e nomes acessíveis,
ordenação, paginação, seleção por atributo, consulta restrita à seleção atual,
edição de células, remoção de registros/geometrias, desfazer/refazer e CSV.

- Arquivos: usa `/bancada-arquivos/salvar`, gerando nova versão e preservando a origem.
- Camadas em memória: altera o GeoJSON da sessão, sem afirmar persistência em disco.
- Catálogo: usa a API de atributos, respeita homologação/imutabilidade e compara
  a revisão recebida com o conteúdo antes de aplicar edições/exclusões.
- Alterações ficam pendentes até salvar; descartar restaura o conteúdo da abertura.
- A grade carrega a camada inteira para os filtros/consultas locais da biblioteca
  considerarem todas as páginas. A paginação e a virtualização reduzem o DOM, mas
  não reduzem o volume inicial transferido; camadas grandes demandam mais memória.
- A API existente de edição de arquivos requer ao menos uma feição na nova versão.

Testes isolados cobrem a grade real, seleção mapa/tabela, maximização, consulta na
seleção, edição/descarte, exclusão, salvamento em memória e arquivo (HTTP simulado),
CSV e desfazer/refazer. Testes Python/HTTP exercitam edição e exclusão reais do
GeoDataFrame, tipos inválidos, homologação e revisão desatualizada, substituindo a
persistência para não gravar no banco oficial.


A barra da tabela usa equivalentes Lucide dos símbolos de seleção, zoom, lápis,
lixeira e histórico das interfaces documentadas em:
- QGIS: https://docs.qgis.org/3.44/en/docs/user_manual/working_with_vector/attribute_table.html
- ArcGIS Pro: https://doc.esri.com/en/arcgis-pro/latest/help/data/tables/interact-with-a-table.html

Os filtros individuais sob os cabeçalhos foram removidos; a consulta por atributo
continua disponível, inclusive para refinar a seleção atual.
