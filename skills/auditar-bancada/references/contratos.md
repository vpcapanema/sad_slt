# Mapa e contratos SICARD

Leia as instruções locais vigentes antes de trabalhar. Pontos de entrada:

- `templates/componentes/_geoprocessamento.html`: controles estáticos e scripts.
- `geoespacial/geoprocessamento.js`: ferramentas, execução de jobs, camadas e biblioteca.
- `geoespacial/geoprocessamento-{ribbon,commands,actions,toolbox,modeler,atributos}.js`: comandos dinâmicos e editores.
- `geoespacial/bancada-arquivos.js`: sessões de arquivos, revisões e persistência.
- `geoespacial/bancada-feedback.js`: feedback exclusivo da bancada.
- `api/routers/geoespacial.py`, `api/services/{bancada_arquivos,geoprocessamento_engine,geoprocessamento_jobs,geoespacial_service,edicao_storage}.py`: contratos HTTP, algoritmos e gravação.
- `tests/browser/bancada-*.cjs`, `tests/test_bancada*.py`, `tests/test_edicao_storage.py`: regressões existentes.

## Invariantes do produto

Edição altera o arquivo original do storage. Não oferecer cópia ou backup como substituto de salvar. Depois de salvar, sincronizar sessão, tabela, mapa e revisão; testar dois salvamentos consecutivos da mesma camada e camadas diferentes do mesmo GeoPackage. Não remover a proteção contra revisões realmente desatualizadas.

Botões da bancada usam feedback próprio, baseado no fluxo do ArcGIS Pro: parâmetros e confirmação antes de operações relevantes, etapas reais, mensagens detalhadas, resultado e histórico. Não importar o modal geral da página hospedeira. Progresso desconhecido deve ser indeterminado; não inventar percentuais nem indicar cancelamento se o servidor continua gravando.

Filtro e seleção têm escopo explícito. Não confundir filtrar visualmente com remover registros. Ao salvar edição com filtro, preservar linhas fora dele. Explorar identifica sem alterar seleção. Cálculo de campo deve explicar quais registros serão alterados. Validar um modelo não equivale a executá-lo; qualquer edição invalida a validação anterior.

## Testes isolados

O `.env` deste Codespace pode apontar para o banco de produção. Nunca executar testes que escrevam nesse banco ou em arquivos reais do usuário. Nos testes Python isole `SLT_DATABASE_URL='' SLT_USE_SIGMA_POSTGRES=false`, substitua acesso a banco/storage por fixtures e use diretórios temporários. Testes browser devem servir a UI real com rotas de API interceptadas ou servidor isolado. Mocks verificam contrato da UI; fixtures de backend verificam efeito real.

Exemplos locais (verifique disponibilidade dos executáveis):

```bash
PYTHONDONTWRITEBYTECODE=1 SLT_DATABASE_URL='' SLT_USE_SIGMA_POSTGRES=false /home/codespace/.venvs/sicard-app/bin/python -m pytest tests/test_bancada_operacoes_isoladas.py tests/test_bancada_arquivos.py tests/test_edicao_storage.py -q -p no:cacheprovider
NODE_PATH=/tmp/sicard-browser-tests/node_modules node tests/browser/bancada-controles.cjs
```

## Referências oficiais para consulta

- [Definition queries](https://doc.esri.com/en/arcgis-pro/latest/help/mapping/layer-properties/definition-query.html)
- [Selections and filters in geoprocessing](https://doc.esri.com/en/arcgis-pro/latest/tool-reference/appendices/filtered-inputs-for-geoprocessing.html)
- [Calculate Field](https://pro.arcgis.com/en/pro-app/latest/tool-reference/data-management/calculate-field.htm)
- [Pop-ups](https://pro.arcgis.com/en/pro-app/latest/help/mapping/navigation/pop-ups.htm)
- [Run a model](https://doc.esri.com/en/arcgis-pro/latest/help/analysis/geoprocessing/modelbuilder/run-a-model.html)

Use a página específica do algoritmo para parâmetros, CRS, seleção e semântica; evite inferir equivalência apenas pelo nome do botão.
